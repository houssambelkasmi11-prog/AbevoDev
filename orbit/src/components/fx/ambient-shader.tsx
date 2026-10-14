"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useFxLevel } from "./fx-prefs";

/**
 * Ambient Field — a living, monochrome nebula drawn by a single fragment
 * shader behind the workspace. Raw WebGL (no three.js), rendered at a
 * fraction of screen resolution and capped at 30 fps, paused when the tab is
 * hidden, frozen to a single frame for reduced-motion users, and re-tinted
 * automatically when the theme changes.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uBase;
uniform vec3 uTint;
uniform float uAmount;
uniform float uOctaves;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    if (float(i) >= uOctaves) break;
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float ring(vec2 p, float r, float tilt, float squash, float w) {
  vec2 q = rot(tilt) * p;
  q.y *= squash;
  float d = abs(length(q) - r);
  return smoothstep(w, 0.0, d);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 m = (uMouse - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float t = uTime * 0.03;

  // Domain-warped fbm: slow drifting nebula that leans gently toward the cursor.
  vec2 pp = p + m * 0.06;
  vec2 q = vec2(fbm(pp * 1.3 + t), fbm(pp * 1.3 - t + 3.1));
  vec2 r = vec2(fbm(pp * 1.7 + 2.0 * q + vec2(1.7, 9.2) + t * 1.4),
                fbm(pp * 1.7 + 2.0 * q + vec2(8.3, 2.8) - t));
  float n = fbm(pp * 1.1 + 2.2 * r);
  float cloud = smoothstep(0.32, 0.88, n);
  cloud *= cloud * (1.6 - 0.6 * cloud);

  // Faint orbital paths, slowly precessing around an off-centre nucleus.
  vec2 c = p - vec2(0.55, 0.32);
  float orbits = ring(c, 0.62, 0.55 + t * 0.6, 2.4, 0.0035) * 0.55
               + ring(c, 0.95, -0.5 - t * 0.4, 2.1, 0.003) * 0.35
               + ring(c, 1.35, 0.25 + t * 0.25, 2.6, 0.0028) * 0.22;
  orbits *= 0.6 + 0.4 * n;

  // Soft light that follows the pointer.
  float glow = exp(-6.0 * dot(p - m, p - m)) * 0.35;

  // Gentle vignette keeps edges calm and centred content readable.
  float vig = smoothstep(1.35, 0.25, length(p * vec2(0.85, 1.0)));

  float amount = uAmount * (cloud * 0.9 + orbits + glow) * (0.55 + 0.45 * vig);
  vec3 col = mix(uBase, uTint, clamp(amount, 0.0, 1.0));
  // Blue-noise-ish dither removes 8-bit banding in the soft gradients.
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0 * 1.5;
  gl_FragColor = vec4(col, 1.0);
}
`;

function parseColor(input: string, fallback: [number, number, number]): [number, number, number] {
  const s = input.trim();
  const hex = s.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const v = parseInt(hex[1], 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }
  const rgb = s.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(/[ ,/]+/).map(Number);
    if ([r, g, b].every(Number.isFinite)) return [r / 255, g / 255, b / 255];
  }
  return fallback;
}

function palette(): { base: [number, number, number]; tint: [number, number, number]; amount: number } {
  const root = document.documentElement;
  const dark = root.classList.contains("dark");
  const base = parseColor(getComputedStyle(root).getPropertyValue("--canvas"), dark ? [0.043, 0.047, 0.051] : [0.965, 0.961, 0.949]);
  // Dark: icy light rising out of the void. Light: cool graphite haze on paper.
  return dark
    ? { base, tint: [0.78, 0.87, 0.95], amount: 0.26 }
    : { base, tint: [0.52, 0.6, 0.68], amount: 0.17 };
}

export function AmbientShader({ className, forceDark }: { className?: string; forceDark?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const level = useFxLevel();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !level || level === "off") return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power", preserveDrawingBuffer: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      mouse: gl.getUniformLocation(prog, "uMouse"),
      base: gl.getUniformLocation(prog, "uBase"),
      tint: gl.getUniformLocation(prog, "uTint"),
      amount: gl.getUniformLocation(prog, "uAmount"),
      octaves: gl.getUniformLocation(prog, "uOctaves"),
    };

    const lite = level === "lite";
    const scale = lite ? 0.28 : 0.45;
    const frameMs = lite ? 1000 / 20 : 1000 / 30;
    gl.uniform1f(u.octaves, lite ? 3 : 5);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const applyPalette = () => {
      const pal = palette();
      const p = forceDark ? { base: [0.027, 0.031, 0.035] as [number, number, number], tint: [0.78, 0.87, 0.95] as [number, number, number], amount: 0.3 } : pal;
      gl.uniform3fv(u.base, p.base);
      gl.uniform3fv(u.tint, p.tint);
      gl.uniform1f(u.amount, p.amount);
    };
    applyPalette();

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(u.res, w, h);
    };
    resize();

    let mx = 0.7;
    let my = 0.6;
    let tx = mx;
    let ty = my;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth;
      ty = 1 - e.clientY / window.innerHeight;
    };

    const start = performance.now() - Math.random() * 60_000;
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;
      gl.uniform1f(u.time, (now - start) / 1000);
      gl.uniform2f(u.mouse, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < frameMs) return;
      last = now;
      draw(now);
    };
    let onScreen = true;
    const play = () => {
      cancelAnimationFrame(raf);
      if (!onScreen || document.hidden) return;
      if (reduced) {
        draw(performance.now());
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    // Off-screen (e.g. a section scrolled away) → no GPU work at all.
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      play();
    });
    io.observe(canvas);

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(performance.now());
    });
    ro.observe(canvas);
    const mo = new MutationObserver(() => {
      applyPalette();
      if (reduced) draw(performance.now());
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    document.addEventListener("visibilitychange", play);
    if (!lite && !reduced) window.addEventListener("pointermove", onMove, { passive: true });

    canvas.dataset.ready = "true";
    play();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", play);
      window.removeEventListener("pointermove", onMove);
      delete canvas.dataset.ready;
    };
  }, [level, forceDark]);

  if (level === "off") return null;
  return <canvas key={level ?? "pending"} ref={ref} aria-hidden className={cn("fx-ambient pointer-events-none", className)} />;
}
