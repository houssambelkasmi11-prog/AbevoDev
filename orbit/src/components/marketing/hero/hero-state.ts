/**
 * Mutable, non-React state shared between the GSAP scroll timeline and the
 * Three.js render loop. Writing here never triggers React renders.
 */
export interface HeroState {
  /** Raw scroll progress through the pinned narrative, 0–1. */
  progress: number;
  /** Smoothed pointer in normalised device coordinates (-1…1). */
  pointer: { x: number; y: number };
  /** DOM label elements projected from 3D anchors, keyed by id. */
  labels: Map<string, HTMLElement>;
}

export const heroState: HeroState = {
  progress: 0,
  pointer: { x: 0, y: 0 },
  labels: new Map(),
};

export const SYNAPSE_LABELS = ["IDEAS", "KNOWLEDGE", "MEMORY", "REASONING", "CREATION"] as const;
export const CLUSTERS = ["MATHEMATICS", "PHYSICS", "LITERATURE", "HISTORY", "BIOLOGY", "COMPUTER SCIENCE"] as const;

/** Narrative windows (fractions of total scroll). */
export const SCENES = [
  { id: "01", name: "DISCOVERY", from: 0, to: 0.2 },
  { id: "02", name: "APPROACH", from: 0.2, to: 0.4 },
  { id: "03", name: "SYNAPSE", from: 0.4, to: 0.6 },
  { id: "04", name: "UNIVERSE", from: 0.6, to: 0.85 },
  { id: "05", name: "ENTER ORBIT", from: 0.85, to: 1 },
] as const;

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** 0 → 1 → 0 window with soft edges. */
export function windowed(p: number, inStart: number, inEnd: number, outStart: number, outEnd: number): number {
  return smoothstep(inStart, inEnd, p) * (1 - smoothstep(outStart, outEnd, p));
}
