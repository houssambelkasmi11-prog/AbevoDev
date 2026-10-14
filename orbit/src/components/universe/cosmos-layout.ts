import * as THREE from "three";
import type { EdgeKind, EntityType } from "@/lib/types";
import type { GEdge, GNode } from "./universe-types";

/**
 * Turns the knowledge graph into a galaxy:
 *   workspace → the galactic core at the centre
 *   subject   → a star on one of the spiral arms (size grows with its content)
 *   item      → a planet orbiting its subject's star (notes, lessons, homework, chats)
 *   concept   → a small, distant free star in the outer halo
 *   unfiled   → rogue planets drifting near the core
 * Every position is a pure function of time, so the camera, connection arcs
 * and labels can all ask "where is X right now?" without shared state.
 */

export type BodyKind = "core" | "star" | "planet" | "concept" | "rogue";

export interface Body {
  id: string;
  kind: BodyKind;
  node: GNode | null;
  /** the body this one orbits (a star for planets; null = the galactic core) */
  parent: string | null;
  orbit: number;
  speed: number;
  phase: number;
  incl: number;
  node0: number;
  radius: number;
  /** stars: [hot, mid, cool, glow] · planets: [light, dark, …] */
  colors: string[];
  /** planets: 0 gas giant · 1 rocky · 2 ice world */
  style: number;
  ring: boolean;
  seed: number;
  /** number of planets (stars) */
  count: number;
}

export interface System {
  bodies: Body[];
  byId: Map<string, Body>;
  stars: Body[];
  planetsOf: Map<string, Body[]>;
  extent: number;
  arms: number;
}

/** Stellar palette — each subject gets its own temperature. [hot core, surface, cool limb, corona] */
export const STAR_PALETTE: string[][] = [
  ["#fffbe8", "#ffd77a", "#ff9a3d", "#ffc46b"], // yellow dwarf
  ["#f2f7ff", "#a9c8ff", "#4d7dff", "#86b4ff"], // blue giant
  ["#effffd", "#8ff0e6", "#24a8a3", "#7fe8e0"], // cyan
  ["#fff1dc", "#ffae5c", "#ff6a2b", "#ff9a50"], // orange
  ["#fbf2ff", "#d6a6ff", "#8a4be0", "#c99bff"], // violet
  ["#ffffff", "#e8eeff", "#9fb6ff", "#d4e2ff"], // white
  ["#ffe6dc", "#ff8a6a", "#c73a2a", "#ff7a5a"], // red giant
  ["#fff0f6", "#ffb3d1", "#e0558f", "#ff9cc4"], // rose
  ["#f6ffe8", "#c9f28a", "#6fae2a", "#b9f27c"], // green (exotic)
  ["#fff7e0", "#ffe39a", "#e0a020", "#ffd56b"], // gold
];

/** Planet surfaces — [light, dark]. */
export const PLANET_PALETTE: [string, string][] = [
  ["#8fb8ff", "#22325f"],
  ["#ffbf7a", "#6a3318"],
  ["#9ee6c8", "#1a4d41"],
  ["#d6a6ff", "#3f2366"],
  ["#ff9c8f", "#5e2020"],
  ["#f3e3a0", "#5c4818"],
  ["#87e3ff", "#163f52"],
  ["#c9bfff", "#322d5e"],
  ["#e8d5c0", "#4a3a2c"],
  ["#b9f27c", "#2c4c15"],
];

export const EDGE_COLOR: Record<EdgeKind, string> = {
  belongs_to: "#9aa4b2",
  references: "#8fb8ff",
  builds_upon: "#9ee6c8",
  related: "#d6a6ff",
  prerequisite: "#ffbf7a",
};

/** Each item type is its own kind of world. */
const PLANET_LOOK: Partial<Record<EntityType, { size: number; style: number }>> = {
  note: { size: 0.42, style: 1 }, // rocky
  source: { size: 0.62, style: 0 }, // gas giant
  assignment: { size: 0.5, style: 2 }, // ice world
  conversation: { size: 0.34, style: 0 },
};

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The whole galaxy turns slowly as one (rad / sim-second ≈ one turn per ~10 min). */
export const GALAXY_SPIN = 0.0105;
export const CORE_RADIUS = 2.2;
const ARM_PITCH = 2.1;

/** Spiral-arm angle at radius r for a given arm (shared by stars and the dust disk). */
export function armAngle(arm: number, arms: number, r: number): number {
  return (arm / arms) * Math.PI * 2 + Math.log(Math.max(r, 1) / 10) * ARM_PITCH;
}

export function buildSystem(nodes: GNode[], workspaceName: string): System {
  const subjects = nodes.filter((n) => n.type === "subject");
  const concepts = nodes.filter((n) => n.type === "concept");
  const items = nodes.filter((n) => n.type !== "subject" && n.type !== "concept");
  const subjectIds = new Set(subjects.map((s) => s.id));
  const arms = subjects.length >= 8 ? 3 : 2;

  const bodies: Body[] = [];
  const planetsOf = new Map<string, Body[]>();

  bodies.push({
    id: "__core",
    kind: "core",
    node: { id: "__core", type: "subject", label: workspaceName, subjectId: null, glyph: 0, x: 0, y: 0, snippet: "", href: null, createdAt: "", degree: 0 },
    parent: null,
    orbit: 0,
    speed: 0,
    phase: 0,
    incl: 0,
    node0: 0,
    radius: CORE_RADIUS,
    colors: ["#fff8ec", "#ffd9a0", "#ff9a50", "#ffcf8a"],
    style: 0,
    ring: false,
    seed: 1,
    count: items.length,
  });

  const itemsBySubject = new Map<string, GNode[]>();
  const rogues: GNode[] = [];
  for (const it of items) {
    if (it.subjectId && subjectIds.has(it.subjectId)) itemsBySubject.set(it.subjectId, [...(itemsBySubject.get(it.subjectId) ?? []), it]);
    else rogues.push(it);
  }

  // How much room each star system needs, so neighbours never overlap.
  const reachOf = (n: number, starR: number) => starR * 2.8 + Math.max(1, Math.ceil(n / 7)) * 1.5 + 1.5;
  const starRadius = (n: number) => 1.3 + Math.min(2, Math.sqrt(n) * 0.32);
  const maxReach = subjects.reduce((m, s) => {
    const n = itemsBySubject.get(s.id)?.length ?? 0;
    return Math.max(m, reachOf(n, starRadius(n)));
  }, 6);
  const spacing = maxReach * 2 + 5;

  const stars: Body[] = [];
  subjects.forEach((s, i) => {
    const r = rng(hashString(s.id));
    const kids = itemsBySubject.get(s.id) ?? [];
    const radius = starRadius(kids.length);
    const arm = i % arms;
    const k = Math.floor(i / arms);
    const orbit = 22 + maxReach + k * spacing + (r() - 0.5) * 3;
    const star: Body = {
      id: s.id,
      kind: "star",
      node: s,
      parent: null,
      orbit,
      speed: GALAXY_SPIN,
      phase: armAngle(arm, arms, orbit) + (r() - 0.5) * 0.12,
      incl: 0,
      node0: 0,
      radius,
      colors: STAR_PALETTE[i % STAR_PALETTE.length],
      style: 0,
      ring: false,
      seed: r() * 100,
      count: kids.length,
    };
    // Stars sit a little above/below the disk for depth.
    star.incl = (r() - 0.5) * 0.06;
    stars.push(star);
    bodies.push(star);

    const planets: Body[] = kids.map((kid, j) => {
      const pr = rng(hashString(kid.id));
      const shell = Math.floor(j / 7);
      const inShell = Math.min(7, kids.length - shell * 7);
      const look = PLANET_LOOK[kid.type] ?? { size: 0.4, style: 1 };
      const pal = PLANET_PALETTE[hashString(kid.id) % PLANET_PALETTE.length];
      return {
        id: kid.id,
        kind: "planet",
        node: kid,
        parent: s.id,
        orbit: radius * 2.8 + shell * 1.5 + pr() * 0.35,
        speed: (0.28 / (shell + 1)) * (0.8 + pr() * 0.3),
        phase: ((j % 7) / inShell) * Math.PI * 2 + shell * 0.7,
        incl: (pr() - 0.5) * 0.5,
        node0: pr() * Math.PI * 2,
        radius: look.size + Math.min(0.3, kid.degree * 0.05),
        colors: [pal[0], pal[1]],
        style: look.style,
        ring: kid.type === "source" && pr() > 0.45,
        seed: pr() * 100,
        count: 0,
      };
    });
    planetsOf.set(s.id, planets);
    bodies.push(...planets);
  });

  const outer = stars.length ? Math.max(...stars.map((s) => s.orbit)) + maxReach : 30;

  // Unfiled items: rogue worlds drifting in the bright inner region.
  rogues.forEach((d, i) => {
    const r = rng(hashString(d.id));
    const look = PLANET_LOOK[d.type] ?? { size: 0.4, style: 1 };
    bodies.push({
      id: d.id,
      kind: "rogue",
      node: d,
      parent: null,
      orbit: 9 + r() * Math.max(4, Math.min(12, maxReach)),
      speed: 0.05 + r() * 0.03,
      phase: (i / Math.max(1, rogues.length)) * Math.PI * 2 + r() * 0.4,
      incl: (r() - 0.5) * 0.35,
      node0: r() * Math.PI * 2,
      radius: look.size,
      colors: ["#c9cdd1", "#3a3d42"],
      style: 1,
      ring: false,
      seed: r() * 100,
      count: 0,
    });
  });

  // Concepts: small free stars in a tilted halo around the galaxy.
  concepts.forEach((c, i) => {
    const r = rng(hashString(c.id));
    bodies.push({
      id: c.id,
      kind: "concept",
      node: c,
      parent: null,
      orbit: outer + 10 + r() * 12,
      speed: GALAXY_SPIN * 0.5,
      phase: (i / Math.max(1, concepts.length)) * Math.PI * 2 + r(),
      incl: (r() - 0.5) * 1.2,
      node0: r() * Math.PI * 2,
      radius: 0.55,
      colors: ["#eaf4ff", "#9cc7ff"],
      style: 0,
      ring: false,
      seed: r() * 100,
      count: 0,
    });
  });

  const extent = outer + (concepts.length ? 24 : 4);
  return { bodies, byId: new Map(bodies.map((b) => [b.id, b])), stars, planetsOf, extent, arms };
}

/* ───────────────────────────── Kinematics ───────────────────────────── */

/** Position on a body's own (inclined) orbit, relative to what it circles. */
export function orbitPoint(b: Body, angle: number, out: THREE.Vector3): THREE.Vector3 {
  const x = Math.cos(angle) * b.orbit;
  const z0 = Math.sin(angle) * b.orbit;
  const y = z0 * Math.sin(b.incl);
  const z = z0 * Math.cos(b.incl);
  const c = Math.cos(b.node0);
  const s = Math.sin(b.node0);
  return out.set(x * c - z * s, y, x * s + z * c);
}

const _parent = new THREE.Vector3();

/** Where a body is at simulation time `t` (world space). */
export function positionAt(sys: System, id: string, t: number, out: THREE.Vector3): THREE.Vector3 {
  const b = sys.byId.get(id);
  if (!b || b.kind === "core") return out.set(0, 0, 0);
  orbitPoint(b, b.phase + t * b.speed, out);
  if (b.parent) {
    const p = sys.byId.get(b.parent);
    if (p && p.kind === "star") {
      orbitPoint(p, p.phase + t * p.speed, _parent);
      out.add(_parent);
    }
  }
  return out;
}

/** How far the camera should sit to frame a body nicely. */
export function frameDistance(sys: System, b: Body): number {
  if (b.kind === "core") return sys.extent * 1.7;
  if (b.kind === "star") {
    const planets = sys.planetsOf.get(b.id) ?? [];
    const reach = planets.reduce((m, x) => Math.max(m, x.orbit), b.radius * 2.5);
    return Math.max(12, reach * 3);
  }
  return Math.max(4.5, b.radius * 12);
}

export function connectionsFor(edges: GEdge[], id: string): GEdge[] {
  return edges.filter((e) => e.origin !== "implicit" && e.status === "approved" && (e.source === id || e.target === id));
}

/** A representative colour for HUD dots, arcs and reticles. */
export function tone(b: Body | undefined): string {
  if (!b) return "#ffffff";
  if (b.kind === "star" || b.kind === "core") return b.colors[3] ?? b.colors[1];
  if (b.kind === "concept") return "#9cc7ff";
  if (b.kind === "rogue") return "#9aa0a6";
  return b.colors[0];
}
