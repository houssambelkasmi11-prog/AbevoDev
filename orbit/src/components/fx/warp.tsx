"use client";

import { useLayoutEffect } from "react";
import { readFx } from "./fx-prefs";

/**
 * "Warp" — the jump from the public site into the workspace.
 *
 *   1. PORTAL   a dark disc opens from the point you clicked
 *   2. CHARGE   stars stretch into light-streaks, an orbit gate spins up
 *   3. CRUISE   holds at speed while the next route loads (never blocks it)
 *   4. ARRIVE   drops out of warp: streaks decelerate, a hole opens from the
 *               centre and the workspace lands (scale + de-blur)
 *
 * The overlay lives on <body>, outside React, so it survives route changes.
 * A sessionStorage flag lets a page that loaded via a server redirect (e.g.
 * sign-in → /app) play just the arrival.
 */

type Phase = "charge" | "cruise" | "arrive";
interface Star { x: number; y: number; z: number; pz: number; hue: number }
interface Warp {
  root: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  gate: HTMLDivElement;
  caption: HTMLDivElement;
  stars: Star[];
  phase: Phase;
  start: number;
  phaseAt: number;
  speed: number;
  wantArrive: boolean;
  origin: { x: number; y: number };
  startPath: string;
  light: boolean;
  raf: number;
  timers: number[];
}

const PENDING_KEY = "orbit-warp-pending";
const CHARGE_MS = 950;
const ARRIVE_MS = 1150;
const MAX_CRUISE_MS = 7000;
let warp: Warp | null = null;

const easeInCubic = (t: number) => t * t * t;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function enabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return readFx() !== "off";
}

function makeStars(n: number): Star[] {
  return Array.from({ length: n }, () => {
    const z = Math.random();
    return { x: (Math.random() * 2 - 1) * 1.6, y: (Math.random() * 2 - 1) * 1.6, z, pz: z, hue: Math.random() };
  });
}

function build(origin: { x: number; y: number }, label: string, light: boolean): Warp {
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.className = "orbit-warp";
  root.style.cssText = [
    "position:fixed", "inset:0", "z-index:2147483000", "pointer-events:auto", "overflow:hidden",
    "background:#050607", "contain:strict",
    `clip-path:circle(0px at ${origin.x}px ${origin.y}px)`,
  ].join(";");

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  root.appendChild(canvas);

  const vignette = document.createElement("div");
  vignette.style.cssText = "position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 35%,rgba(5,6,7,.85) 100%);pointer-events:none";
  root.appendChild(vignette);

  const gate = document.createElement("div");
  gate.style.cssText = "position:absolute;left:50%;top:50%;width:min(52vmin,420px);aspect-ratio:1;transform:translate(-50%,-50%) scale(.6);opacity:0;pointer-events:none";
  gate.innerHTML = `
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="#f5f3ef">
      <circle cx="100" cy="100" r="92" stroke-opacity=".12"/>
      <circle cx="100" cy="100" r="70" stroke-opacity=".22" stroke-dasharray="1.5 5" class="orbit-warp-spin-rev"/>
      <g class="orbit-warp-spin"><ellipse cx="100" cy="100" rx="88" ry="34" transform="rotate(28 100 100)" stroke-opacity=".55"/><circle cx="176" cy="132" r="2.6" fill="#f5f3ef" stroke="none"/></g>
      <g class="orbit-warp-spin-rev"><ellipse cx="100" cy="100" rx="88" ry="34" transform="rotate(-28 100 100)" stroke-opacity=".3"/></g>
      <circle cx="100" cy="100" r="3.2" fill="#f5f3ef" stroke="none"/>
    </svg>`;
  root.appendChild(gate);

  const caption = document.createElement("div");
  caption.style.cssText =
    "position:absolute;left:0;right:0;bottom:12vh;text-align:center;font:500 10.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.32em;text-transform:uppercase;color:#c9cdd1;opacity:0;transform:translateY(8px)";
  caption.innerHTML = `<div>${escapeHtml(label)}</div><div style="margin:12px auto 0;width:120px;height:1px;background:rgba(255,255,255,.12);overflow:hidden"><div class="orbit-warp-bar" style="height:100%;width:40%;background:#f5f3ef"></div></div>`;
  root.appendChild(caption);

  document.body.appendChild(root);
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const area = window.innerWidth * window.innerHeight;
  return {
    root, canvas, ctx, gate, caption,
    stars: makeStars(Math.round(Math.min(900, Math.max(260, area / 2600)))),
    phase: "charge", start: performance.now(), phaseAt: performance.now(), speed: 0.1,
    wantArrive: false, origin, startPath: location.pathname, light, raf: 0, timers: [],
  };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function resize(w: Warp) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const { innerWidth: W, innerHeight: H } = window;
  if (w.canvas.width !== Math.round(W * dpr)) {
    w.canvas.width = Math.round(W * dpr);
    w.canvas.height = Math.round(H * dpr);
  }
  w.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function frame(now: number) {
  const w = warp;
  if (!w) return;
  resize(w);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cx = W / 2;
  const cy = H / 2;
  const f = Math.max(W, H) * 0.5;
  const tPhase = now - w.phaseAt;

  // ── phase logic ────────────────────────────────────────────────
  let portal = 1; // 0..1 how open the entry disc is
  let reveal = 0; // 0..1 how open the exit hole is
  if (w.phase === "charge") {
    const t = clamp01(tPhase / CHARGE_MS);
    portal = easeOutQuart(clamp01(tPhase / 620));
    w.speed = 0.08 + easeInCubic(t) * 2.6;
    if (t >= 1) {
      w.phase = "cruise";
      w.phaseAt = now;
    }
  } else if (w.phase === "cruise") {
    w.speed = 2.6 + Math.sin(tPhase / 260) * 0.15;
    if (w.wantArrive || tPhase > MAX_CRUISE_MS) {
      w.phase = "arrive";
      w.phaseAt = now;
      document.documentElement.classList.add("orbit-landing");
      w.root.style.pointerEvents = "none";
    }
  } else {
    const t = clamp01(tPhase / ARRIVE_MS);
    w.speed = 2.6 * Math.pow(1 - t, 2.2) + 0.02;
    reveal = easeOutQuart(clamp01((t - 0.12) / 0.88));
    if (t >= 1) return teardown();
  }

  // ── entry portal / exit hole ───────────────────────────────────
  const maxR = Math.hypot(Math.max(w.origin.x, W - w.origin.x), Math.max(w.origin.y, H - w.origin.y)) + 4;
  if (w.phase === "charge") w.root.style.clipPath = `circle(${(portal * maxR).toFixed(1)}px at ${w.origin.x}px ${w.origin.y}px)`;
  else if (w.root.style.clipPath) w.root.style.clipPath = "";
  if (reveal > 0) {
    const r = reveal * 78; // % of the larger side
    const m = `radial-gradient(circle at 50% 50%, transparent ${r.toFixed(2)}%, #000 ${(r + 14).toFixed(2)}%)`;
    w.root.style.setProperty("mask-image", m);
    w.root.style.setProperty("-webkit-mask-image", m);
  }

  // ── gate + caption ─────────────────────────────────────────────
  const gateIn = w.phase === "charge" ? easeOutQuart(clamp01((tPhase - 120) / 700)) : 1;
  const gateOut = w.phase === "arrive" ? clamp01(tPhase / 420) : 0;
  w.gate.style.opacity = String(gateIn * (1 - gateOut));
  w.gate.style.transform = `translate(-50%,-50%) scale(${(0.6 + gateIn * 0.4 + gateOut * 1.4).toFixed(3)})`;
  w.caption.style.opacity = String(gateIn * (1 - gateOut));
  w.caption.style.transform = `translateY(${((1 - gateIn) * 8 - gateOut * 6).toFixed(1)}px)`;

  // ── starfield ──────────────────────────────────────────────────
  const ctx = w.ctx;
  ctx.fillStyle = `rgba(5,6,7,${(0.55 - Math.min(0.35, w.speed * 0.12)).toFixed(3)})`; // trails grow with speed
  ctx.fillRect(0, 0, W, H);
  const dz = w.speed * 0.016;
  ctx.lineCap = "round";
  for (const s of w.stars) {
    s.pz = s.z;
    s.z -= dz;
    if (s.z <= 0.02) {
      s.x = (Math.random() * 2 - 1) * 1.6;
      s.y = (Math.random() * 2 - 1) * 1.6;
      s.z = s.pz = 1;
      continue;
    }
    const x = cx + (s.x / s.z) * f;
    const y = cy + (s.y / s.z) * f;
    if (x < -50 || x > W + 50 || y < -50 || y > H + 50) {
      s.z = 0;
      continue;
    }
    const tail = Math.min(s.pz + dz * (1 + w.speed * 2.2), 1);
    const px = cx + (s.x / tail) * f;
    const py = cy + (s.y / tail) * f;
    const near = 1 - s.z;
    const a = Math.min(1, near * 1.35);
    // cool white core with a faint ice/violet tint on some streaks
    const tint = s.hue < 0.18 ? "182,208,255" : s.hue > 0.9 ? "214,196,255" : "245,243,239";
    ctx.strokeStyle = `rgba(${tint},${a.toFixed(3)})`;
    ctx.lineWidth = 0.4 + near * 1.8;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  // central bloom while at speed
  const bloom = Math.min(1, w.speed / 2.6) * (1 - reveal);
  if (bloom > 0.01) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.35);
    g.addColorStop(0, `rgba(245,243,239,${(0.11 * bloom).toFixed(3)})`);
    g.addColorStop(1, "rgba(245,243,239,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  w.raf = requestAnimationFrame(frame);
}

function teardown() {
  const w = warp;
  if (!w) return;
  cancelAnimationFrame(w.raf);
  w.timers.forEach((t) => window.clearTimeout(t));
  w.root.remove();
  warp = null;
  window.setTimeout(() => document.documentElement.classList.remove("orbit-landing"), 120);
}

function ensureStyles() {
  if (document.getElementById("orbit-warp-css")) return;
  const s = document.createElement("style");
  s.id = "orbit-warp-css";
  s.textContent = `
    @keyframes orbit-warp-spin{to{transform:rotate(360deg)}}
    @keyframes orbit-warp-bar{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}
    .orbit-warp .orbit-warp-spin{transform-origin:100px 100px;animation:orbit-warp-spin 2.4s linear infinite}
    .orbit-warp .orbit-warp-spin-rev{transform-origin:100px 100px;animation:orbit-warp-spin 3.6s linear infinite reverse}
    .orbit-warp .orbit-warp-bar{animation:orbit-warp-bar 1.1s cubic-bezier(.6,0,.4,1) infinite}
  `;
  document.head.appendChild(s);
}

let lastPointer = { x: 0, y: 0, at: 0 };
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", (e) => (lastPointer = { x: e.clientX, y: e.clientY, at: Date.now() }), { capture: true, passive: true });
}

/**
 * Start the jump. Finishes on its own once the URL changes (or via
 * `finishWarp()` / the `WarpArrival` mount), with a safety timeout.
 */
export function playWarp(opts: { label?: string; mode?: "enter" | "switch"; origin?: { x: number; y: number } } = {}) {
  if (!enabled()) return;
  if (warp) return;
  ensureStyles();
  const origin =
    opts.origin ?? (Date.now() - lastPointer.at < 1500 ? { x: lastPointer.x, y: lastPointer.y } : { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const label = opts.label ?? "Entering your universe";
  warp = build(origin, opts.mode === "switch" ? `Travelling to ${label}` : label, false);
  try {
    sessionStorage.setItem(PENDING_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  const w = warp;
  // Arrive when the route changes (soft navigation) — after the charge completes.
  const watch = window.setInterval(() => {
    if (warp !== w) return window.clearInterval(watch);
    if (location.pathname !== w.startPath) {
      window.clearInterval(watch);
      w.timers.push(window.setTimeout(() => finishWarp(), 260));
    }
  }, 80);
  w.timers.push(watch as unknown as number);
  if (opts.mode === "switch") w.timers.push(window.setTimeout(() => finishWarp(), CHARGE_MS + 350));
  w.raf = requestAnimationFrame(frame);
}

export function finishWarp() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
  if (warp) warp.wantArrive = true;
}

/** Marks that the next page load should arrive out of warp (server redirects). */
export function armWarpArrival() {
  try {
    sessionStorage.setItem(PENDING_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Mount inside the workspace shell: lands an in-flight warp, or plays the arrival after a redirect / reload. */
export function WarpArrival() {
  useLayoutEffect(() => {
    if (warp) {
      warp.timers.push(window.setTimeout(() => finishWarp(), 200));
      return;
    }
    let pendingAt = 0;
    try {
      pendingAt = Number(sessionStorage.getItem(PENDING_KEY) ?? 0);
    } catch {
      /* ignore */
    }
    if (!pendingAt || Date.now() - pendingAt > 20000 || !enabled()) return;
    ensureStyles();
    warp = build({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, "Entering your universe", false);
    warp.root.style.clipPath = "";
    warp.phase = "cruise";
    warp.phaseAt = performance.now();
    warp.speed = 2.6;
    warp.gate.style.opacity = "1";
    warp.timers.push(window.setTimeout(() => finishWarp(), 420));
    warp.raf = requestAnimationFrame(frame);
  }, []);
  return null;
}

/** Marketing / auth helper: any click on a link into the app or auth starts the warp. */
export function WarpLinks() {
  useLayoutEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      const p = url.pathname;
      if (p === "/app" || p.startsWith("/app/")) playWarp({ label: "Entering your universe" });
      else if (p === "/sign-up") playWarp({ label: "Preparing your universe" });
      else if (p === "/sign-in") playWarp({ label: "Approaching ORBIT" });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
