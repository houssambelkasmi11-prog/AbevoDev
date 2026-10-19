/**
 * Small, dependency-free iCalendar (RFC 5545) reader for timetable feeds such as
 * MyTimetable, Google Calendar, Outlook and Canvas. Handles line folding, escaping,
 * TZID / UTC / floating / all-day times, RRULE (DAILY, WEEKLY, MONTHLY with
 * COUNT/UNTIL/INTERVAL/BYDAY), EXDATE, RECURRENCE-ID overrides and cancelled events.
 */

export interface IcsEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
}

interface RawProp {
  name: string;
  params: Record<string, string>;
  value: string;
}

const WINDOWS_TZ: Record<string, string> = {
  "W. Europe Standard Time": "Europe/Amsterdam",
  "Romance Standard Time": "Europe/Paris",
  "Central Europe Standard Time": "Europe/Budapest",
  "GMT Standard Time": "Europe/London",
  "UTC": "UTC",
  "Eastern Standard Time": "America/New_York",
  "Pacific Standard Time": "America/Los_Angeles",
};

function unfold(text: string): string[] {
  return text.replace(/\r\n|\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function parseLine(line: string): RawProp | null {
  // NAME;PARAM=VAL;PARAM="VAL":value   (colons can appear inside quoted params)
  let i = 0;
  let inQuote = false;
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuote = !inQuote;
    else if (c === ":" && !inQuote) break;
  }
  if (i >= line.length) return null;
  const head = line.slice(0, i);
  const value = line.slice(i + 1);
  const parts = head.split(";");
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: parts[0].toUpperCase(), params, value };
}

function unescape(v: string): string {
  return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function validTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset (ms) of a time zone at a given UTC instant. */
function tzOffset(utcMs: number, tz: string): number {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(new Date(utcMs))) if (part.type !== "literal") p[part.type] = Number(part.value);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
  return asUtc - utcMs;
}

function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let utc = guess - tzOffset(guess, tz);
  utc = guess - tzOffset(utc, tz);
  return new Date(utc);
}

function parseDate(prop: RawProp, defaultTz: string): { date: Date; allDay: boolean } | null {
  const v = prop.value.trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
  if (!m) return null;
  const [, Y, M, D, hh, mm, ss, z] = m;
  if (!hh || prop.params.VALUE === "DATE") return { date: new Date(Number(Y), Number(M) - 1, Number(D)), allDay: true };
  if (z) return { date: new Date(Date.UTC(+Y, +M - 1, +D, +hh, +mm, +(ss ?? 0))), allDay: false };
  let tz = prop.params.TZID ?? defaultTz;
  tz = WINDOWS_TZ[tz] ?? tz.replace(/^\/.*?\//, "");
  if (!validTz(tz)) tz = defaultTz;
  return { date: zonedToUtc(+Y, +M, +D, +hh, +mm, +(ss ?? 0), tz), allDay: false };
}

interface RawEvent {
  props: RawProp[];
}

const DAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function expand(start: Date, rrule: string, windowEnd: Date, limit: number): Date[] {
  const r: Record<string, string> = {};
  for (const kv of rrule.split(";")) {
    const [k, v] = kv.split("=");
    if (k && v) r[k.toUpperCase()] = v.toUpperCase();
  }
  const freq = r.FREQ;
  const interval = Math.max(1, Number(r.INTERVAL ?? 1));
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  let until = windowEnd;
  if (r.UNTIL) {
    const u = parseDate({ name: "UNTIL", params: {}, value: r.UNTIL }, "UTC");
    if (u && u.date < until) until = u.date;
  }
  const out: Date[] = [];
  const push = (d: Date) => {
    if (d >= start && d <= until && out.length < Math.min(count, limit)) out.push(d);
  };
  const byday = r.BYDAY ? r.BYDAY.split(",").map((x) => DAY[x.slice(-2)]).filter((x) => x !== undefined) : null;
  // walk by local calendar days so DST changes keep the wall-clock time
  const base = new Date(start);
  if (freq === "DAILY") {
    for (let i = 0; out.length < Math.min(count, limit) && i < 3000; i += interval) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      if (d > until) break;
      if (!byday || byday.includes(d.getDay())) push(d);
    }
  } else if (freq === "WEEKLY") {
    const days = byday ?? [base.getDay()];
    const weekStart = new Date(base);
    weekStart.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    for (let w = 0; out.length < Math.min(count, limit) && w < 600; w += interval) {
      for (const dow of [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + w * 7 + ((dow + 6) % 7));
        d.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), 0);
        if (d > until) return out;
        push(d);
      }
    }
  } else if (freq === "MONTHLY") {
    for (let i = 0; out.length < Math.min(count, limit) && i < 240; i += interval) {
      const d = new Date(base);
      d.setMonth(base.getMonth() + i);
      if (d > until) break;
      if (d.getDate() === base.getDate()) push(d);
    }
  } else if (freq === "YEARLY") {
    for (let i = 0; out.length < Math.min(count, limit) && i < 20; i += interval) {
      const d = new Date(base);
      d.setFullYear(base.getFullYear() + i);
      if (d > until) break;
      push(d);
    }
  } else push(start);
  return out;
}

export function parseIcs(text: string, opts: { from: Date; to: Date; max?: number; defaultTz?: string }): { name: string | null; events: IcsEvent[] } {
  const lines = unfold(text);
  if (!lines.some((l) => l.trim().toUpperCase() === "BEGIN:VCALENDAR")) throw new Error("This link doesn't return a calendar (no iCal data found).");
  let calName: string | null = null;
  let defaultTz = opts.defaultTz ?? "Europe/Amsterdam";
  const raws: RawEvent[] = [];
  let cur: RawEvent | null = null;
  let depth = 0; // skip nested blocks (VALARM) inside events
  for (const line of lines) {
    if (!line.trim()) continue;
    const u = line.toUpperCase();
    if (u === "BEGIN:VEVENT") {
      cur = { props: [] };
      depth = 0;
      continue;
    }
    if (u === "END:VEVENT") {
      if (cur) raws.push(cur);
      cur = null;
      continue;
    }
    if (cur) {
      if (u.startsWith("BEGIN:")) depth++;
      else if (u.startsWith("END:")) depth--;
      else if (depth === 0) {
        const p = parseLine(line);
        if (p) cur.props.push(p);
      }
      continue;
    }
    const p = parseLine(line);
    if (!p) continue;
    if (p.name === "X-WR-CALNAME") calName = unescape(p.value);
    if (p.name === "X-WR-TIMEZONE" && validTz(p.value.trim())) defaultTz = p.value.trim();
  }

  const max = opts.max ?? 3000;
  const overrides = new Map<string, Map<number, IcsEvent | null>>();
  const masters: { ev: IcsEvent; rrule: string | null; exdates: Set<number> }[] = [];

  for (const r of raws) {
    const get = (n: string) => r.props.find((p) => p.name === n);
    const status = get("STATUS")?.value.toUpperCase();
    const dts = get("DTSTART");
    if (!dts) continue;
    const s = parseDate(dts, defaultTz);
    if (!s) continue;
    const dte = get("DTEND");
    let end = dte ? parseDate(dte, defaultTz)?.date ?? null : null;
    const dur = get("DURATION")?.value;
    if (!end && dur) {
      const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(dur);
      if (m) end = new Date(s.date.getTime() + ((+(m[1] ?? 0) * 24 + +(m[2] ?? 0)) * 60 + +(m[3] ?? 0)) * 60000);
    }
    const ev: IcsEvent = {
      uid: get("UID")?.value.trim() || `${s.date.getTime()}-${get("SUMMARY")?.value ?? ""}`,
      title: unescape(get("SUMMARY")?.value ?? "Untitled"),
      start: s.date,
      end,
      allDay: s.allDay,
      location: get("LOCATION") ? unescape(get("LOCATION")!.value) || null : null,
      description: get("DESCRIPTION") ? unescape(get("DESCRIPTION")!.value).slice(0, 2000) || null : null,
    };
    const rid = get("RECURRENCE-ID");
    if (rid) {
      const at = parseDate(rid, defaultTz)?.date.getTime();
      if (at !== undefined) {
        if (!overrides.has(ev.uid)) overrides.set(ev.uid, new Map());
        overrides.get(ev.uid)!.set(at, status === "CANCELLED" ? null : ev);
      }
      continue;
    }
    if (status === "CANCELLED") continue;
    const exdates = new Set<number>();
    for (const p of r.props.filter((x) => x.name === "EXDATE")) {
      for (const v of p.value.split(",")) {
        const d = parseDate({ ...p, value: v }, defaultTz);
        if (d) exdates.add(d.date.getTime());
      }
    }
    masters.push({ ev, rrule: get("RRULE")?.value ?? null, exdates });
  }

  const out: IcsEvent[] = [];
  for (const { ev, rrule, exdates } of masters) {
    const len = ev.end ? ev.end.getTime() - ev.start.getTime() : 0;
    const starts = rrule ? expand(ev.start, rrule, opts.to, max) : [ev.start];
    for (const st of starts) {
      const t = st.getTime();
      if (exdates.has(t)) continue;
      const ov = overrides.get(ev.uid)?.get(t);
      if (ov === null) continue;
      const inst: IcsEvent = ov ?? { ...ev, start: st, end: ev.end ? new Date(t + len) : null, uid: rrule ? `${ev.uid}#${t}` : ev.uid };
      const endT = (inst.end ?? inst.start).getTime();
      if (endT < opts.from.getTime() || inst.start.getTime() > opts.to.getTime()) continue;
      out.push(inst);
      if (out.length >= max) break;
    }
    if (out.length >= max) break;
  }
  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return { name: calName, events: out };
}

/** Rough event type from the title, in Dutch and English. */
export function guessKind(title: string): "class" | "exam" | "deadline" {
  if (/\b(tentamen|toets|exam|examen|herkansing|resit|assessment|quiz|test)\b/i.test(title)) return "exam";
  if (/\b(deadline|inleveren|inlevermoment|due|submission)\b/i.test(title)) return "deadline";
  return "class";
}
