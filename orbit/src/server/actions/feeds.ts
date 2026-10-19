"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/bootstrap";
import { decryptSecret, encryptionAvailable, encryptSecret } from "@/lib/crypto";
import { guessKind, parseIcs } from "@/lib/ical";
import { safeFetch } from "@/lib/net";
import type { CalendarFeedRow, Insert } from "@/lib/types";
import { run, type ActionResult } from "../result";

/** What the client sees: never the private link itself. */
export interface FeedInfo {
  id: string;
  name: string;
  host: string;
  color: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  event_count: number;
}

const STALE_MS = 3 * 60 * 60 * 1000; // re-sync timetables every 3 hours when the calendar is opened
const PAST_DAYS = 30;
const FUTURE_DAYS = 240;

function normaliseUrl(raw: string): string {
  let u = raw.trim();
  if (/^webcals?:\/\//i.test(u)) u = u.replace(/^webcals?:\/\//i, "https://");
  if (!/^https?:\/\//i.test(u)) throw new Error("Paste the full calendar link (it starts with https:// or webcal://).");
  return new URL(u).toString();
}

function seal(url: string, userId: string): string {
  return encryptionAvailable() ? encryptSecret(url, userId) : url;
}
function unseal(stored: string, userId: string): string {
  return stored.startsWith("v1.") ? decryptSecret(stored, userId) : stored;
}
function hostOf(feed: CalendarFeedRow, userId: string): string {
  try {
    return new URL(unseal(feed.url, userId)).host;
  } catch {
    return "";
  }
}
function info(f: CalendarFeedRow, userId: string): FeedInfo {
  return { id: f.id, name: f.name, host: hostOf(f, userId), color: f.color, last_synced_at: f.last_synced_at, last_error: f.last_error, event_count: f.event_count };
}

async function download(url: string): Promise<string> {
  const { res, body } = await safeFetch(url, { timeoutMs: 20000, maxBytes: 15 * 1024 * 1024, headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.5", "User-Agent": "ORBIT calendar sync" } });
  if (res.status === 401 || res.status === 403) throw new Error("The calendar server refused the link. Copy a fresh iCal link and add it again.");
  if (res.status === 404) throw new Error("This calendar link no longer exists. Copy a fresh iCal link.");
  if (!res.ok) throw new Error(`The calendar server answered with an error (${res.status}). Try again later.`);
  return new TextDecoder("utf-8").decode(body);
}

/** Downloads a feed and replaces its events. Returns the number of events stored. */
async function syncOne(feedId: string): Promise<number> {
  const { repo, workspace, user } = await getContext();
  const feed = await repo.get("calendar_feeds", feedId);
  if (!feed) throw new Error("Calendar not found");
  try {
    const text = await download(unseal(feed.url, user.id));
    const now = Date.now();
    const { events } = parseIcs(text, { from: new Date(now - PAST_DAYS * 864e5), to: new Date(now + FUTURE_DAYS * 864e5), max: 1500 });
    await repo.removeWhere("events", { feed_id: feed.id });
    const rows: Insert<"events">[] = events.map((e): Insert<"events"> => ({
      workspace_id: feed.workspace_id || workspace.id,
      title: e.title.slice(0, 160),
      kind: e.allDay && guessKind(e.title) === "class" ? "other" : guessKind(e.title),
      starts_at: e.start.toISOString(),
      ends_at: e.end ? e.end.toISOString() : null,
      subject_id: null,
      assignment_id: null,
      done: false,
      origin: "feed",
      feed_id: feed.id,
      location: e.location?.slice(0, 200) ?? null,
      external_uid: e.uid.slice(0, 300),
    }));
    for (let i = 0; i < rows.length; i += 500) await repo.insertMany("events", rows.slice(i, i + 500));
    await repo.update("calendar_feeds", feed.id, { last_synced_at: new Date().toISOString(), last_error: null, event_count: rows.length });
    return rows.length;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    await repo.update("calendar_feeds", feed.id, { last_error: msg.slice(0, 300), last_synced_at: new Date().toISOString() }).catch(() => undefined);
    throw e;
  }
}

export async function listFeeds(): Promise<ActionResult<FeedInfo[]>> {
  return run(async () => {
    const { repo, workspace, user } = await getContext();
    const feeds = await repo.list("calendar_feeds", { where: { workspace_id: workspace.id }, order: { column: "created_at" } });
    return feeds.map((f) => info(f, user.id));
  });
}

const addSchema = z.object({ url: z.string().min(8).max(2000), name: z.string().trim().max(80).optional() });

export async function addFeed(input: z.input<typeof addSchema>): Promise<ActionResult<FeedInfo>> {
  return run(async () => {
    const { repo, workspace, user } = await getContext();
    const d = addSchema.parse(input);
    const url = normaliseUrl(d.url);
    // validate before saving so a wrong link gives an error straight away
    const text = await download(url);
    const parsed = parseIcs(text, { from: new Date(Date.now() - PAST_DAYS * 864e5), to: new Date(Date.now() + FUTURE_DAYS * 864e5), max: 1 });
    const host = new URL(url).host;
    const name = d.name || parsed.name || (host.includes("mytimetable") ? "Timetable" : host.replace(/^www\./, ""));
    const existing = await repo.list("calendar_feeds", { where: { workspace_id: workspace.id } });
    if (existing.some((f) => { try { return unseal(f.url, user.id) === url; } catch { return false; } })) throw new Error("This calendar is already added.");
    const feed = await repo.insert("calendar_feeds", { workspace_id: workspace.id, name, url: seal(url, user.id), color: null, last_synced_at: null, last_error: null, event_count: 0 });
    await syncOne(feed.id);
    revalidatePath("/app/calendar");
    const fresh = await repo.get("calendar_feeds", feed.id);
    return info(fresh ?? feed, user.id);
  });
}

export async function syncFeed(id: string): Promise<ActionResult<number>> {
  return run(async () => {
    const n = await syncOne(z.string().min(1).parse(id));
    revalidatePath("/app/calendar");
    return n;
  });
}

/** Called when the calendar opens: refreshes feeds that are older than a few hours. */
export async function syncStaleFeeds(): Promise<ActionResult<number>> {
  return run(async () => {
    const { repo, workspace } = await getContext();
    const feeds = await repo.list("calendar_feeds", { where: { workspace_id: workspace.id } });
    const stale = feeds.filter((f) => !f.last_synced_at || Date.now() - Date.parse(f.last_synced_at) > STALE_MS);
    let synced = 0;
    for (const f of stale) {
      try {
        await syncOne(f.id);
        synced++;
      } catch {
        /* error is stored on the feed */
      }
    }
    if (synced) revalidatePath("/app/calendar");
    return synced;
  });
}

export async function renameFeed(id: string, name: string): Promise<ActionResult> {
  return run(async () => {
    const { repo } = await getContext();
    await repo.update("calendar_feeds", id, { name: z.string().trim().min(1).max(80).parse(name) });
    revalidatePath("/app/calendar");
    return null;
  });
}

export async function removeFeed(id: string): Promise<ActionResult> {
  return run(async () => {
    const { repo } = await getContext();
    await repo.removeWhere("events", { feed_id: id });
    await repo.remove("calendar_feeds", id);
    revalidatePath("/app/calendar");
    return null;
  });
}
