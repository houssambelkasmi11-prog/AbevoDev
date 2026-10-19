/**
 * BPMN-style process diagrams drawn as SVG from a small JSON spec. The AI writes
 * these in ```bpmn fenced blocks; the same renderer is used in the app and in
 * the hand-in PDF, so the diagram prints as crisp vector shapes.
 *
 * Spec:
 * {
 *   "title"?: string,
 *   "lanes"?: string[],                       // swimlanes, top to bottom (optional)
 *   "nodes": [{ "id", "type", "label", "lane"? }],
 *   "flows": [{ "from", "to", "label"?, "kind"?: "sequence" | "message" }]
 * }
 * Node types: start, end, intermediate, timer, message, task, user, service, manual,
 * subprocess, xor, and, or, event, data, store.
 */

type NodeType =
  | "start" | "end" | "intermediate" | "timer" | "message"
  | "task" | "user" | "service" | "manual" | "subprocess"
  | "xor" | "and" | "or" | "event" | "data" | "store";

interface SpecNode { id: string; type?: string; label?: string; lane?: string }
interface SpecFlow { from: string; to: string; label?: string; kind?: string }
export interface ProcessSpec { title?: string; lanes?: string[]; nodes: SpecNode[]; flows?: SpecFlow[] }

const INK = "#1b1c1f";
const MUTED = "#6f7378";
const LINE = "#c9c8c2";
const FILL = "#ffffff";
const LANE_FILL = "#faf9f6";

const COL_W = 176;
const ROW_H = 118;
const HEADER_W = 38;
const PAD = 22;

const isEvent = (t: NodeType) => t === "start" || t === "end" || t === "intermediate" || t === "timer" || t === "message";
const isGateway = (t: NodeType) => t === "xor" || t === "and" || t === "or" || t === "event";
const isData = (t: NodeType) => t === "data" || t === "store";

function normType(t?: string): NodeType {
  const s = (t ?? "task").toLowerCase().replace(/[^a-z]/g, "");
  const map: Record<string, NodeType> = {
    start: "start", startevent: "start", end: "end", endevent: "end", stop: "end",
    intermediate: "intermediate", intermediateevent: "intermediate", timer: "timer", message: "message",
    task: "task", activity: "task", user: "user", usertask: "user", service: "service", servicetask: "service", manual: "manual", manualtask: "manual",
    subprocess: "subprocess", xor: "xor", exclusive: "xor", decision: "xor", gateway: "xor", and: "and", parallel: "and", or: "or", inclusive: "or",
    event: "event", eventbased: "event", data: "data", dataobject: "data", document: "data", store: "store", datastore: "store", database: "store",
  };
  return map[s] ?? "task";
}

function size(t: NodeType): [number, number] {
  if (isEvent(t)) return [40, 40];
  if (isGateway(t)) return [48, 48];
  if (isData(t)) return [40, 50];
  return [136, 66];
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

interface Placed { id: string; type: NodeType; label: string; lane: number; col: number; sub: number; x: number; y: number; w: number; h: number }

function layout(spec: ProcessSpec) {
  const nodes = spec.nodes.filter((n) => n && n.id).slice(0, 60);
  const ids = new Set(nodes.map((n) => n.id));
  const flows = (spec.flows ?? []).filter((f) => ids.has(f.from) && ids.has(f.to) && f.from !== f.to);
  const laneNames = spec.lanes?.length ? spec.lanes : [...new Set(nodes.map((n) => n.lane).filter(Boolean) as string[])];
  const laneOf = (n: SpecNode) => Math.max(0, laneNames.indexOf(n.lane ?? ""));

  // columns: longest path from sources, ignoring back edges found by DFS
  const out = new Map<string, string[]>();
  flows.forEach((f) => out.set(f.from, [...(out.get(f.from) ?? []), f.to]));
  const back = new Set<string>();
  const state = new Map<string, number>();
  const order: string[] = [];
  const visit = (id: string) => {
    state.set(id, 1);
    for (const to of out.get(id) ?? []) {
      if (state.get(to) === 1) back.add(`${id}>${to}`);
      else if (!state.get(to)) visit(to);
    }
    state.set(id, 2);
    order.push(id);
  };
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  flows.forEach((f) => indeg.set(f.to, (indeg.get(f.to) ?? 0) + 1));
  [...nodes].sort((a, b) => (normType(a.type) === "start" ? -1 : 0) - (normType(b.type) === "start" ? -1 : 0) || (indeg.get(a.id)! - indeg.get(b.id)!)).forEach((n) => !state.get(n.id) && visit(n.id));
  const col = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const id of order.reverse()) {
    for (const to of out.get(id) ?? []) if (!back.has(`${id}>${to}`)) col.set(to, Math.max(col.get(to)!, col.get(id)! + 1));
  }
  // data objects sit next to whatever they connect to, not in the main flow
  // stacking inside a lane when several nodes share a column
  const subs = new Map<string, number>();
  const laneRows = laneNames.length ? laneNames.map(() => 1) : [1];
  const placedRaw = nodes.map((n) => {
    const lane = laneNames.length ? laneOf(n) : 0;
    const c = col.get(n.id)!;
    const key = `${lane}:${c}`;
    const sub = subs.get(key) ?? 0;
    subs.set(key, sub + 1);
    laneRows[lane] = Math.max(laneRows[lane], sub + 1);
    return { n, lane, c, sub };
  });
  const laneTop: number[] = [];
  let acc = PAD + (spec.title ? 28 : 0) + (spec.lanes?.length || spec.nodes.some((n) => n.lane) ? 0 : 30);
  laneRows.forEach((r, i) => {
    laneTop[i] = acc;
    acc += r * ROW_H;
  });
  const totalH = acc + PAD;
  const left = PAD + (laneNames.length ? HEADER_W : 0);
  const maxCol = Math.max(0, ...placedRaw.map((p) => p.c));
  const totalW = left + (maxCol + 1) * COL_W + PAD;
  const placed = new Map<string, Placed>();
  for (const { n, lane, c, sub } of placedRaw) {
    const type = normType(n.type);
    const [w, h] = size(type);
    const cx = left + c * COL_W + COL_W / 2;
    const cy = laneTop[lane] + sub * ROW_H + ROW_H / 2;
    placed.set(n.id, { id: n.id, type, label: (n.label ?? "").trim(), lane, col: c, sub, x: cx - w / 2, y: cy - h / 2, w, h });
  }
  return { placed, flows, back, laneNames, laneTop, laneRows, totalW, totalH, left };
}

function NodeShape({ p }: { p: Placed }) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const labelBelow = (lines: string[], top: number) =>
    lines.map((l, i) => (
      <text key={i} x={cx} y={top + 14 + i * 14} textAnchor="middle" fontSize="11.5" fill={INK}>
        {l}
      </text>
    ));
  if (isEvent(p.type)) {
    const r = p.w / 2;
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill={FILL} stroke={INK} strokeWidth={p.type === "end" ? 3.6 : 1.6} />
        {p.type === "intermediate" || p.type === "timer" || p.type === "message" ? <circle cx={cx} cy={cy} r={r - 4} fill="none" stroke={INK} strokeWidth={1.2} /> : null}
        {p.type === "timer" ? (
          <g stroke={INK} strokeWidth={1.3} fill="none">
            <circle cx={cx} cy={cy} r={r - 9} />
            <path d={`M${cx} ${cy - 7}V${cy}l5 3`} />
          </g>
        ) : null}
        {p.type === "message" ? <path d={`M${cx - 8} ${cy - 5}h16v11h-16zM${cx - 8} ${cy - 5}l8 6 8-6`} fill="none" stroke={INK} strokeWidth={1.2} /> : null}
        {labelBelow(wrap(p.label, 20), p.y + p.h + 2)}
      </g>
    );
  }
  if (isGateway(p.type)) {
    const h = p.w / 2;
    return (
      <g>
        <path d={`M${cx} ${cy - h}L${cx + h} ${cy}L${cx} ${cy + h}L${cx - h} ${cy}Z`} fill={FILL} stroke={INK} strokeWidth={1.6} />
        {p.type === "xor" ? <path d={`M${cx - 8} ${cy - 8}l16 16M${cx + 8} ${cy - 8}l-16 16`} stroke={INK} strokeWidth={3} strokeLinecap="round" /> : null}
        {p.type === "and" ? <path d={`M${cx} ${cy - 11}v22M${cx - 11} ${cy}h22`} stroke={INK} strokeWidth={3} strokeLinecap="round" /> : null}
        {p.type === "or" ? <circle cx={cx} cy={cy} r={10} fill="none" stroke={INK} strokeWidth={2.6} /> : null}
        {p.type === "event" ? (
          <g fill="none" stroke={INK} strokeWidth={1.2}>
            <circle cx={cx} cy={cy} r={12} />
            <circle cx={cx} cy={cy} r={9} />
            <path d={`M${cx} ${cy - 6}l6 4-2 7h-8l-2-7z`} />
          </g>
        ) : null}
        {wrap(p.label, 18).map((l, i, arr) => (
          <text key={i} x={p.x - 2} y={p.y - 4 - (arr.length - 1 - i) * 13} textAnchor="end" fontSize="11.5" fill={INK}>
            {l}
          </text>
        ))}
      </g>
    );
  }
  if (isData(p.type)) {
    return (
      <g>
        {p.type === "data" ? (
          <path d={`M${p.x} ${p.y}h${p.w - 12}l12 12v${p.h - 12}h-${p.w}z M${p.x + p.w - 12} ${p.y}v12h12`} fill={FILL} stroke={INK} strokeWidth={1.3} />
        ) : (
          <g fill={FILL} stroke={INK} strokeWidth={1.3}>
            <path d={`M${p.x} ${p.y + 8}v${p.h - 16}a${p.w / 2} 8 0 0 0 ${p.w} 0v-${p.h - 16}`} />
            <ellipse cx={cx} cy={p.y + 8} rx={p.w / 2} ry={8} />
          </g>
        )}
        {labelBelow(wrap(p.label, 18), p.y + p.h + 2)}
      </g>
    );
  }
  const lines = wrap(p.label, 19);
  const marker =
    p.type === "user" ? (
      <g transform={`translate(${p.x + 8} ${p.y + 7})`} fill="none" stroke={INK} strokeWidth={1.1}>
        <circle cx="6" cy="4" r="3.2" />
        <path d="M0 13c0-4 2.6-6 6-6s6 2 6 6z" />
      </g>
    ) : p.type === "service" ? (
      <g transform={`translate(${p.x + 14} ${p.y + 13})`} fill="none" stroke={INK} strokeWidth={1.1}>
        <circle r="5" />
        <path d="M0-8v3M0 5v3M-8 0h3M5 0h3M-5.7-5.7l2.1 2.1M3.6 3.6l2.1 2.1M-5.7 5.7l2.1-2.1M3.6-3.6l2.1-2.1" />
      </g>
    ) : p.type === "manual" ? (
      <path transform={`translate(${p.x + 8} ${p.y + 8})`} d="M0 6h9l3-3 2 1-2 3h2v6H0z" fill="none" stroke={INK} strokeWidth={1.1} />
    ) : null;
  return (
    <g>
      <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={10} fill={FILL} stroke={INK} strokeWidth={1.5} />
      {marker}
      {p.type === "subprocess" ? (
        <g stroke={INK} strokeWidth={1.2} fill="none">
          <rect x={cx - 6} y={p.y + p.h - 15} width={12} height={12} />
          <path d={`M${cx} ${p.y + p.h - 12}v6M${cx - 3} ${p.y + p.h - 9}h6`} />
        </g>
      ) : null}
      {lines.map((l, i) => (
        <text key={i} x={cx} y={cy + (i - (lines.length - 1) / 2) * 14 + 4} textAnchor="middle" fontSize="12" fill={INK}>
          {l}
        </text>
      ))}
    </g>
  );
}

function route(a: Placed, b: Placed, backEdge: boolean, channelY: number): { d: string; lx: number; ly: number } {
  const ay = a.y + a.h / 2;
  const by = b.y + b.h / 2;
  if (backEdge || b.col <= a.col) {
    // loop back over the top of the row
    const sx = a.x + a.w / 2;
    const ex = b.x + b.w / 2;
    const y = Math.min(channelY, a.y - 12, b.y - 12);
    return { d: `M${sx} ${a.y}V${y}H${ex}V${b.y - 1}`, lx: (sx + ex) / 2, ly: y - 4 };
  }
  const sx = a.x + a.w;
  const ex = b.x;
  if (Math.abs(ay - by) < 1) return { d: `M${sx} ${ay}H${ex}`, lx: (sx + ex) / 2, ly: ay - 7 };
  const mx = sx + Math.min(isGateway(a.type) ? 20 : 36, (ex - sx) / 2);
  return { d: `M${sx} ${ay}H${mx}V${by}H${ex}`, lx: mx + 6, ly: (ay + by) / 2 };
}

export function ProcessDiagram({ spec }: { spec: ProcessSpec }) {
  const L = layout(spec);
  const ps = L.placed;
  let backN = 0;
  return (
    <figure className="orbit-diagram" style={{ margin: "14px 0 18px", breakInside: "avoid" }}>
      <svg viewBox={`0 0 ${L.totalW} ${L.totalH}`} width="100%" style={{ maxWidth: L.totalW, display: "block", margin: "0 auto", fontFamily: "Inter, Helvetica, Arial, sans-serif" }} role="img" aria-label={spec.title ?? "Process diagram"}>
        <defs>
          <marker id="pd-arrow" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={INK} />
          </marker>
          <marker id="pd-open" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#fff" stroke={INK} />
          </marker>
          <marker id="pd-dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7">
            <circle cx="5" cy="5" r="4" fill="#fff" stroke={INK} />
          </marker>
        </defs>
        <rect x="0" y="0" width={L.totalW} height={L.totalH} fill="#fff" />
        {spec.title ? (
          <text x={PAD} y={PAD + 10} fontSize="13" fontWeight="600" fill={INK}>
            {spec.title}
          </text>
        ) : null}
        {L.laneNames.length ? (
          <g>
            {L.laneNames.map((name, i) => {
              const top = L.laneTop[i];
              const h = L.laneRows[i] * ROW_H;
              return (
                <g key={name + i}>
                  <rect x={PAD} y={top} width={L.totalW - PAD * 2} height={h} fill={i % 2 ? "#fff" : LANE_FILL} stroke={LINE} />
                  <rect x={PAD} y={top} width={HEADER_W} height={h} fill="#f1efea" stroke={LINE} />
                  <text transform={`translate(${PAD + HEADER_W / 2 + 4} ${top + h / 2}) rotate(-90)`} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={INK}>
                    {name}
                  </text>
                </g>
              );
            })}
          </g>
        ) : null}
        <g fill="none">
          {L.flows.map((f, i) => {
            const a = ps.get(f.from)!;
            const b = ps.get(f.to)!;
            const isBack = L.back.has(`${f.from}>${f.to}`) || b.col <= a.col;
            const channel = (L.laneNames.length ? L.laneTop[Math.min(a.lane, b.lane)] + 10 : Math.min(a.y, b.y) - 26) + (backN % 3) * 6;
            if (isBack) backN++;
            const r = route(a, b, isBack, channel);
            const assoc = isData(a.type) || isData(b.type);
            const msg = !assoc && (f.kind ?? "").toLowerCase().startsWith("mess");
            return (
              <g key={i}>
                <path d={r.d} stroke={INK} strokeWidth={1.3} strokeDasharray={assoc ? "2 3" : msg ? "6 4" : undefined} markerEnd={assoc || msg ? "url(#pd-open)" : "url(#pd-arrow)"} markerStart={msg ? "url(#pd-dot)" : undefined} />
                {f.label ? (
                  <text x={r.lx} y={r.ly} fontSize="10.5" fill={MUTED} stroke="#fff" strokeWidth={3} paintOrder="stroke" textAnchor={isGateway(a.type) && !isBack ? "start" : "middle"}>
                    {f.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
        {[...ps.values()].map((p) => (
          <NodeShape key={p.id} p={p} />
        ))}
      </svg>
    </figure>
  );
}

/** Renders a ```bpmn block. While the AI is still streaming the JSON, shows a placeholder. */
export function ProcessBlock({ source }: { source: string }) {
  let spec: ProcessSpec | null = null;
  try {
    const parsed = JSON.parse(source) as ProcessSpec;
    if (parsed && Array.isArray(parsed.nodes) && parsed.nodes.length) spec = parsed;
  } catch {
    spec = null;
  }
  if (!spec) {
    return (
      <div style={{ margin: "14px 0", padding: "18px", border: "1px dashed #c9c8c2", borderRadius: 10, textAlign: "center", color: "#6f7378", fontSize: 12.5 }}>
        Drawing diagram…
      </div>
    );
  }
  return <ProcessDiagram spec={spec} />;
}

export const DIAGRAM_LANGS = ["bpmn", "process", "flow"];
