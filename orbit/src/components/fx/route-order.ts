/**
 * Spatial order of the workspace, used to decide which way a page arrives from.
 * The sidebar is vertical, so moving between sections travels up/down;
 * moving between sibling tabs (Settings) or deeper into a section travels sideways.
 */
const SECTIONS = ["/app", "/app/universe", "/app/notes", "/app/lessons", "/app/ai", "/app/homework", "/app/practice", "/app/focus", "/app/calendar", "/app/settings"];
const SIBLINGS: string[][] = [["/app/settings", "/app/settings/providers", "/app/settings/personalities"]];

export function sectionIndex(path: string): number {
  let best = 0;
  SECTIONS.forEach((s, i) => {
    if (s === "/app" ? path === "/app" : path === s || path.startsWith(s + "/")) best = i;
  });
  return best;
}

export type Travel = { axis: "x" | "y"; dir: number };

export function travel(from: string | null, to: string): Travel {
  if (!from || from === to) return { axis: "y", dir: 0 };
  const a = sectionIndex(from);
  const b = sectionIndex(to);
  if (a !== b) return { axis: "y", dir: b > a ? 1 : -1 };
  for (const group of SIBLINGS) {
    const i = group.indexOf(from);
    const j = group.indexOf(to);
    if (i >= 0 && j >= 0) return { axis: "x", dir: j > i ? 1 : -1 };
  }
  const da = from.split("/").length;
  const db = to.split("/").length;
  return { axis: "x", dir: db >= da ? 1 : -1 };
}
