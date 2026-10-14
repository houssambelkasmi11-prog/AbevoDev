"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { createContext, memo, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { armAngle, EDGE_COLOR, frameDistance, GALAXY_SPIN, orbitPoint, positionAt, rng, tone, type Body, type System } from "./cosmos-layout";
import { ARC_FRAG, ARC_VERT, GALAXY_FRAG, GALAXY_VERT, hexToRgb, PLANET_FRAG, RING_FRAG, RING_VERT, SPHERE_VERT, STAR_FRAG, STAR_VERT, SUN_FRAG } from "./cosmos-shaders";
import { glowTexture, haloTexture, nebulaTexture, spikesTexture } from "./cosmos-textures";
import type { GEdge } from "./universe-types";

/* ───────────────────────────── Shared state ───────────────────────────── */

interface SimClock {
  t: number;
  scale: number;
  target: number;
}

const SimCtx = createContext<{ current: SimClock } | null>(null);
function useSim() {
  const s = useContext(SimCtx);
  if (!s) throw new Error("useSim outside scene");
  return s;
}

export interface Handlers {
  onSelect: (id: string | null) => void;
  onHover: (id: string, on: boolean) => void;
  onOpen: (id: string) => void;
}

export interface SceneProps extends Handlers {
  system: System;
  edges: GEdge[];
  selectedId: string | null;
  focusId: string;
  hoveredId: string | null;
  linkFromId: string | null;
  highlightEdgeId: string | null;
  paused: boolean;
  labels: boolean;
  quality: "full" | "lite";
  reduced: boolean;
}

function vec(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return new THREE.Vector3(r, g, b);
}

function useDispose(...items: { dispose: () => void }[]) {
  useEffect(() => () => items.forEach((i) => i.dispose()), items); // eslint-disable-line react-hooks/exhaustive-deps
}

function handlersFor(id: string, h: Handlers) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.delta > 6) return; // that was a drag, not a click
      h.onSelect(id);
    },
    onDoubleClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      h.onOpen(id);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      h.onHover(id, true);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      h.onHover(id, false);
      document.body.style.cursor = "";
    },
  };
}

const ease = (dt: number, speed: number) => 1 - Math.exp(-dt * speed);

const additive = (map: THREE.Texture, color: string, opacity: number) =>
  new THREE.SpriteMaterial({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

/* Shared unit geometries (scaled per body). */
let SPHERE: THREE.SphereGeometry | null = null;
let HIT: THREE.SphereGeometry | null = null;
let RING: THREE.RingGeometry | null = null;
const sphereGeo = () => (SPHERE ??= new THREE.SphereGeometry(1, 40, 28));
const hitGeo = () => (HIT ??= new THREE.SphereGeometry(1, 10, 8));
const ringGeo = () => (RING ??= new THREE.RingGeometry(1.45, 2.35, 96, 1));

/* ───────────────────────────── Sky ───────────────────────────── */

function ClockDriver({ target }: { target: number }) {
  const sim = useSim();
  useEffect(() => {
    sim.current.target = target;
  }, [sim, target]);
  useFrame((_, dt) => {
    const s = sim.current;
    s.scale += (s.target - s.scale) * ease(dt, 2.2);
    s.t += Math.min(dt, 0.1) * s.scale;
  });
  return null;
}

function Starfield({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const { geo, mat } = useMemo(() => {
    const r = rng(42);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const seed = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const band = new THREE.Vector3(0.25, 1, 0.35).normalize();
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
      if (r() < 0.45) v.addScaledVector(band, -v.dot(band) * 0.88).normalize();
      const R = 1100 + r() * 300;
      pos[i * 3] = v.x * R;
      pos[i * 3 + 1] = v.y * R;
      pos[i * 3 + 2] = v.z * R;
      size[i] = r() > 0.986 ? 3.4 + r() * 2 : 0.9 + r() * 1.5;
      seed[i] = r();
      const temp = r();
      const c = temp < 0.14 ? [1, 0.8, 0.6] : temp < 0.36 ? [0.72, 0.84, 1] : [1, 1, 1];
      const b = 0.45 + r() * 0.5;
      col[i * 3] = c[0] * b;
      col[i * 3 + 1] = c[1] * b;
      col[i * 3 + 2] = c[2] * b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo, mat };
  }, [count]);
  useDispose(geo, mat);
  useFrame(({ clock, camera }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uPixelRatio.value = dpr;
    ref.current?.position.copy(camera.position); // infinitely far away
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={-2} />;
}

function Nebula({ lite }: { lite: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => {
    const map = nebulaTexture(lite);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map, side: THREE.BackSide, depthWrite: false, fog: false });
  }, [lite]);
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} material={mat} renderOrder={-3} frustumCulled={false} rotation={[0.3, 0, 0.2]}>
      <sphereGeometry args={[2500, 48, 24]} />
    </mesh>
  );
}

/** The spiral galaxy itself: thousands of dust motes and young stars on the same arms the subjects live on. */
function GalaxyDisk({ sys, count }: { sys: System; count: number }) {
  const sim = useSim();
  const ref = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const { geo, mat } = useMemo(() => {
    const r = rng(7);
    const gauss = () => {
      let u = 0;
      for (let i = 0; i < 4; i++) u += r();
      return (u - 2) / 1.15;
    };
    const outer = Math.max(40, sys.extent * 1.08);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const seed = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const warm = new THREE.Color("#ffd29a");
    const cool = new THREE.Color("#8fb4ff");
    const pink = new THREE.Color("#ff8fc0");
    const c = new THREE.Color();
    const fake = { orbit: 0, incl: 0, node0: 0 } as Body;
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const bulge = r() < 0.22;
      let rad: number;
      let ang: number;
      if (bulge) {
        rad = Math.abs(gauss()) * 9 + 1.5;
        ang = r() * Math.PI * 2;
      } else {
        rad = 6 + Math.pow(r(), 0.7) * (outer - 6);
        const arm = Math.floor(r() * sys.arms);
        ang = armAngle(arm, sys.arms, rad) + gauss() * (0.22 + 3 / rad);
      }
      fake.orbit = rad;
      orbitPoint(fake, ang, p);
      const thick = bulge ? 2.2 * Math.exp(-rad / 10) + 0.4 : 0.35 + rad * 0.012;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = gauss() * thick;
      pos[i * 3 + 2] = p.z;
      const k = Math.min(1, rad / (outer * 0.55));
      c.copy(warm).lerp(cool, k);
      if (!bulge && r() < 0.05) c.copy(pink); // glowing star-forming knots
      const bright = (bulge ? 0.6 : 0.55) * (0.5 + r() * 0.9);
      col[i * 3] = c.r * bright;
      col[i * 3 + 1] = c.g * bright;
      col[i * 3 + 2] = c.b * bright;
      size[i] = r() < 0.04 ? 3 + r() * 3.5 : 1 + r() * 1.9;
      seed[i] = r();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uScale: { value: 130 } },
      vertexShader: GALAXY_VERT,
      fragmentShader: GALAXY_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo, mat };
  }, [sys.extent, sys.arms, count]);
  useDispose(geo, mat);
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uPixelRatio.value = dpr;
    // Rotate with the stars so they always sit on their arms.
    if (ref.current) ref.current.rotation.y = -sim.current.t * GALAXY_SPIN;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={-1} />;
}

/* ───────────────────────────── Labels ───────────────────────────── */

function Label({ y, title, meta, color, strong }: { y: number; title: string; meta?: string; color?: string; strong?: boolean }) {
  return (
    <Html position={[0, y, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
      <div className={strong ? "cosmos-label cosmos-label-strong" : "cosmos-label"}>
        {color ? <span className="cosmos-dot" style={{ background: color, color }} /> : null}
        <span className="cosmos-label-text">{title}</span>
        {meta ? <span className="cosmos-label-meta">{meta}</span> : null}
      </div>
    </Html>
  );
}

/* ───────────────────────────── Bodies ───────────────────────────── */

const Core = memo(function Core({ b, sys, selected, hovered, label, h }: { b: Body; sys: System; selected: boolean; hovered: boolean; label: boolean; h: Handlers }) {
  const heart = useRef<THREE.Sprite>(null);
  const mats = useMemo(
    () => ({
      haze: additive(glowTexture(), "#ffb877", 0.28),
      bulge: additive(glowTexture(), "#ffd9a8", 0.55),
      heart: additive(glowTexture(), "#fff6e6", 1),
      spikes: additive(spikesTexture(), "#fff1dc", 0.7),
    }),
    [],
  );
  useDispose(mats.haze, mats.bulge, mats.heart, mats.spikes);
  useFrame(({ clock }) => {
    const pulse = 1 + Math.sin(clock.elapsedTime * 0.8) * 0.05 + (selected || hovered ? 0.12 : 0);
    heart.current?.scale.setScalar(7 * pulse);
  });
  return (
    <group>
      <sprite material={mats.haze} scale={Math.max(60, sys.extent * 0.9)} />
      <sprite material={mats.bulge} scale={22} />
      <sprite ref={heart} material={mats.heart} scale={7} />
      <sprite material={mats.spikes} scale={26} />
      <mesh geometry={hitGeo()} visible={false} scale={3.2} {...handlersFor(b.id, h)} />
      {label ? <Label y={-5} title={b.node?.label ?? "Your universe"} meta="Core" strong /> : null}
    </group>
  );
});

const Star = memo(function Star({
  b,
  sys,
  selected,
  hovered,
  focused,
  label,
  h,
}: {
  b: Body;
  sys: System;
  selected: boolean;
  hovered: boolean;
  focused: boolean;
  label: boolean;
  h: Handlers;
}) {
  const sim = useSim();
  const group = useRef<THREE.Group>(null);
  const surface = useRef<THREE.Mesh>(null);
  const corona = useRef<THREE.Sprite>(null);
  const flare = useRef<THREE.Sprite>(null);
  const [hot, mid, cool, glowC] = b.colors;

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSeed: { value: b.seed }, uHighlight: { value: 0 }, uHot: { value: vec(hot) }, uMid: { value: vec(mid) }, uCool: { value: vec(cool) } },
        vertexShader: SPHERE_VERT,
        fragmentShader: SUN_FRAG,
      }),
    [b.seed, hot, mid, cool],
  );
  const sprites = useMemo(
    () => ({ corona: additive(glowTexture(), glowC, 0.85), halo: additive(glowTexture(), cool, 0.22), flare: additive(spikesTexture(), hot, 0.75) }),
    [glowC, cool, hot],
  );

  // Paths of this star's planets — they travel with the star.
  const paths = useMemo(() => {
    const g = new THREE.Group();
    const m = new THREE.LineBasicMaterial({ color: mid, transparent: true, opacity: 0, depthWrite: false });
    for (const pl of sys.planetsOf.get(b.id) ?? []) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 120; i++) pts.push(orbitPoint(pl, (i / 120) * Math.PI * 2, new THREE.Vector3()));
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m));
    }
    return { g, m };
  }, [b.id, sys, mid]);

  useDispose(mat, sprites.corona, sprites.halo, sprites.flare, paths.m);
  useEffect(() => () => paths.g.children.forEach((c) => (c as THREE.Line).geometry.dispose()), [paths]);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    positionAt(sys, b.id, sim.current.t, g.position);
    if (surface.current) surface.current.rotation.y += dt * 0.06;
    const t = clock.elapsedTime;
    const u = mat.uniforms;
    u.uTime.value = t;
    u.uHighlight.value += ((selected ? 1 : hovered ? 0.6 : 0) - u.uHighlight.value) * ease(dt, 6);
    const breathe = 1 + Math.sin(t * 0.9 + b.seed) * 0.04 + u.uHighlight.value * 0.15;
    corona.current?.scale.setScalar(b.radius * 5.6 * breathe);
    flare.current?.scale.setScalar(b.radius * (9 + Math.sin(t * 1.3 + b.seed) * 0.6) * (1 + u.uHighlight.value * 0.35));
    paths.m.opacity += ((focused || selected ? 0.16 : hovered ? 0.1 : 0) - paths.m.opacity) * ease(dt, 4);
    paths.g.visible = paths.m.opacity > 0.005;
  });

  const n = sys.planetsOf.get(b.id)?.length ?? 0;
  return (
    <group ref={group}>
      <primitive object={paths.g} />
      <mesh ref={surface} geometry={sphereGeo()} material={mat} scale={b.radius} {...handlersFor(b.id, h)} />
      <sprite ref={corona} material={sprites.corona} scale={b.radius * 5.6} />
      <sprite material={sprites.halo} scale={b.radius * 15} />
      <sprite ref={flare} material={sprites.flare} scale={b.radius * 9} />
      {label ? <Label y={-b.radius - 2} title={b.node?.label ?? ""} meta={`${n} planet${n === 1 ? "" : "s"}`} color={glowC} strong={selected || focused} /> : null}
    </group>
  );
});

const Planet = memo(function Planet({
  b,
  sys,
  selected,
  hovered,
  dim,
  label,
  h,
}: {
  b: Body;
  sys: System;
  selected: boolean;
  hovered: boolean;
  dim: boolean;
  label: boolean;
  h: Handlers;
}) {
  const sim = useSim();
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const host = b.parent ? sys.byId.get(b.parent) : undefined;
  const lightColor = host ? host.colors[1] : "#ffd9a0";
  const [c1, c2] = b.colors;

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColorA: { value: vec(c1) },
          uColorB: { value: vec(c2) },
          uStyle: { value: b.style },
          uSeed: { value: b.seed },
          uTime: { value: 0 },
          uHighlight: { value: 0 },
          uDim: { value: 0 },
          uLight: { value: new THREE.Vector3() },
          uLightColor: { value: vec(lightColor) },
        },
        vertexShader: SPHERE_VERT,
        fragmentShader: PLANET_FRAG,
      }),
    [c1, c2, b.style, b.seed, lightColor],
  );
  const ringMat = useMemo(
    () =>
      b.ring
        ? new THREE.ShaderMaterial({
            uniforms: { uColorA: { value: vec(c1) }, uColorB: { value: vec(c2) }, uSeed: { value: b.seed }, uDim: { value: 0 }, uInner: { value: 1.45 }, uOuter: { value: 2.35 } },
            vertexShader: RING_VERT,
            fragmentShader: RING_FRAG,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        : null,
    [b.ring, c1, c2, b.seed],
  );
  const glow = useMemo(() => additive(glowTexture(), c1, 0), [c1]);
  useDispose(mat, glow);
  useEffect(() => () => ringMat?.dispose(), [ringMat]);

  useFrame((st, dt) => {
    const g = group.current;
    if (!g) return;
    const t = sim.current.t;
    positionAt(sys, b.id, t, g.position);
    const u = mat.uniforms;
    if (b.parent) positionAt(sys, b.parent, t, u.uLight.value);
    else u.uLight.value.set(0, 0, 0);
    if (spin.current) {
      spin.current.rotation.y += dt * 0.25;
      const s = b.radius * (selected ? 1.45 : hovered ? 1.25 : 1);
      spin.current.scale.setScalar(spin.current.scale.x + (s - spin.current.scale.x) * ease(dt, 9));
    }
    u.uTime.value = st.clock.elapsedTime;
    u.uHighlight.value += ((selected ? 1 : hovered ? 0.6 : 0) - u.uHighlight.value) * ease(dt, 6);
    u.uDim.value += ((dim ? 1 : 0) - u.uDim.value) * ease(dt, 4);
    if (ringMat) ringMat.uniforms.uDim.value = u.uDim.value;
    glow.opacity = u.uHighlight.value * 0.45 + (1 - u.uDim.value) * 0.12;
  });

  return (
    <group ref={group}>
      <mesh ref={spin} geometry={sphereGeo()} material={mat} scale={b.radius} rotation={[0, 0, (b.seed % 1) * 0.6 - 0.3]}>
        {ringMat ? <mesh geometry={ringGeo()} material={ringMat} rotation={[-Math.PI / 2 + 0.3, 0, 0]} /> : null}
      </mesh>
      <sprite material={glow} scale={b.radius * 4} />
      <mesh geometry={hitGeo()} visible={false} scale={Math.max(0.8, b.radius * 2.4)} {...handlersFor(b.id, h)} />
      {label ? <Label y={-b.radius - 0.8} title={b.node?.label ?? ""} meta={b.kind === "rogue" ? "unfiled" : b.node?.type} /> : null}
    </group>
  );
});

const Concept = memo(function Concept({ b, sys, selected, hovered, dim, label, h }: { b: Body; sys: System; selected: boolean; hovered: boolean; dim: boolean; label: boolean; h: Handlers }) {
  const sim = useSim();
  const group = useRef<THREE.Group>(null);
  const flare = useRef<THREE.Sprite>(null);
  const mats = useMemo(() => ({ core: additive(glowTexture(), "#f4f9ff", 1), spikes: additive(spikesTexture(), "#cfe4ff", 0.7) }), []);
  useDispose(mats.core, mats.spikes);
  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    positionAt(sys, b.id, sim.current.t, g.position);
    const k = (1 + Math.sin(clock.elapsedTime * 1.6 + b.seed) * 0.12) * (selected ? 1.5 : hovered ? 1.3 : 1);
    flare.current?.scale.setScalar(4.2 * k);
    const target = dim ? 0.2 : 1;
    mats.core.opacity += (target - mats.core.opacity) * ease(dt, 5);
    mats.spikes.opacity = mats.core.opacity * 0.7;
  });
  return (
    <group ref={group}>
      <sprite material={mats.core} scale={2.2} />
      <sprite ref={flare} material={mats.spikes} scale={4.2} />
      <mesh geometry={hitGeo()} visible={false} scale={1.4} {...handlersFor(b.id, h)} />
      {label ? <Label y={-1.6} title={b.node?.label ?? "Concept"} meta="concept" /> : null}
    </group>
  );
});

/* ───────────────────────────── Connections ───────────────────────────── */

const ARC_POINTS = 64;
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _m = new THREE.Vector3();
const _o = new THREE.Vector3();

const Arc = memo(function Arc({ e, sys, dim, highlighted }: { e: GEdge; sys: System; dim: boolean; highlighted: boolean }) {
  const sim = useSim();
  const photon = useRef<THREE.Sprite>(null);
  const suggested = e.status === "suggested";
  const ca = tone(sys.byId.get(e.source));
  const cb = tone(sys.byId.get(e.target));
  const { line, mat, photonMat, seed } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const t = new Float32Array(ARC_POINTS);
    for (let i = 0; i < ARC_POINTS; i++) t[i] = i / (ARC_POINTS - 1);
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ARC_POINTS * 3), 3));
    geo.setAttribute("aT", new THREE.BufferAttribute(t, 1));
    const seed = rng(e.id.length * 7919 + e.id.charCodeAt(0))();
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColorA: { value: vec(ca) }, uColorB: { value: vec(cb) }, uTime: { value: 0 }, uOpacity: { value: 0 }, uDashed: { value: suggested ? 1 : 0 }, uSeed: { value: seed } },
      vertexShader: ARC_VERT,
      fragmentShader: ARC_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    const photonMat = additive(glowTexture(), EDGE_COLOR[e.kind], 0);
    return { line, mat, photonMat, seed };
  }, [e.id, e.kind, ca, cb, suggested]);
  useDispose(line.geometry, mat, photonMat);

  useFrame(({ clock }, dt) => {
    const t = sim.current.t;
    positionAt(sys, e.source, t, _a);
    positionAt(sys, e.target, t, _b);
    const dist = _a.distanceTo(_b);
    _m.addVectors(_a, _b).multiplyScalar(0.5);
    // Bow the arc up out of the galactic plane, and slightly outward.
    if (_m.lengthSq() > 1e-6) _m.add(_o.copy(_m).normalize().multiplyScalar(dist * 0.06));
    _m.y += dist * 0.26 + 0.8;
    const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < ARC_POINTS; i++) {
      const u = i / (ARC_POINTS - 1);
      const k0 = (1 - u) * (1 - u);
      const k1 = 2 * (1 - u) * u;
      const k2 = u * u;
      arr[i * 3] = k0 * _a.x + k1 * _m.x + k2 * _b.x;
      arr[i * 3 + 1] = k0 * _a.y + k1 * _m.y + k2 * _b.y;
      arr[i * 3 + 2] = k0 * _a.z + k1 * _m.z + k2 * _b.z;
    }
    attr.needsUpdate = true;
    const u = mat.uniforms;
    u.uTime.value = clock.elapsedTime;
    const target = dim ? 0.1 : highlighted ? 1.5 : suggested ? 0.6 : 0.9;
    u.uOpacity.value += (target - u.uOpacity.value) * ease(dt, 4);

    // A photon of light travelling source → target.
    const p = photon.current;
    if (p) {
      const s = (clock.elapsedTime * (suggested ? 0.08 : 0.13) + seed) % 1;
      const k0 = (1 - s) * (1 - s);
      const k1 = 2 * (1 - s) * s;
      const k2 = s * s;
      p.position.set(k0 * _a.x + k1 * _m.x + k2 * _b.x, k0 * _a.y + k1 * _m.y + k2 * _b.y, k0 * _a.z + k1 * _m.z + k2 * _b.z);
      p.scale.setScalar(highlighted ? 2 : 1.3);
      photonMat.opacity = Math.min(1, u.uOpacity.value) * Math.sin(s * Math.PI);
    }
  });

  return (
    <>
      <primitive object={line} />
      <sprite ref={photon} material={photonMat} />
    </>
  );
});

/* ───────────────────────────── Reticles ───────────────────────────── */

function Reticle({ sys, id, color, spin = 0.4 }: { sys: System; id: string; color: string; spin?: number }) {
  const sim = useSim();
  const ref = useRef<THREE.Sprite>(null);
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: haloTexture(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), [color]);
  useDispose(mat);
  const b = sys.byId.get(id);
  const size = !b ? 2 : b.kind === "core" ? 9 : b.kind === "star" ? b.radius * 3.4 : b.kind === "concept" ? 3 : Math.max(1.8, b.radius * 4.2);
  useFrame(({ clock }, dt) => {
    const s = ref.current;
    if (!s) return;
    positionAt(sys, id, sim.current.t, s.position);
    mat.rotation += dt * spin;
    mat.opacity += (0.9 - mat.opacity) * ease(dt, 5);
    s.scale.setScalar(size * (1 + Math.sin(clock.elapsedTime * 2.2) * 0.04));
  });
  return <sprite ref={ref} material={mat} renderOrder={5} />;
}

/* ───────────────────────────── Camera ───────────────────────────── */

type Controls = {
  target: THREE.Vector3;
  update: () => void;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
};

const _desired = new THREE.Vector3();
const _prev = new THREE.Vector3();
const _off = new THREE.Vector3();

function CameraRig({ sys, focusId, reduced }: { sys: System; focusId: string; reduced: boolean }) {
  const sim = useSim();
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const flying = useRef(true);
  const goal = useRef(frameDistance(sys, sys.byId.get("__core")!));

  // Cinematic arrival: start far out in the dark and glide in.
  useEffect(() => {
    camera.position.set(sys.extent * 0.6, sys.extent * 2.4, sys.extent * 4.6);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const b = sys.byId.get(focusId) ?? sys.byId.get("__core")!;
    goal.current = frameDistance(sys, b);
    flying.current = true;
  }, [focusId, sys]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      flying.current = false;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, dt) => {
    if (!controls) return;
    positionAt(sys, sys.byId.has(focusId) ? focusId : "__core", sim.current.t, _desired);
    _prev.copy(controls.target);
    controls.target.lerp(_desired, flying.current && !reduced ? ease(dt, 4.5) : 1);
    // Carry the camera along with whatever it is following.
    camera.position.add(_off.copy(controls.target).sub(_prev));
    if (flying.current) {
      _off.copy(camera.position).sub(controls.target);
      const d = _off.length();
      const nd = Math.max(0.5, reduced ? goal.current : THREE.MathUtils.lerp(d, goal.current, ease(dt, 2.6)));
      // Ease toward a flattering three-quarter elevation while travelling.
      if (_off.y / Math.max(d, 1e-6) < 0.3) _off.y += (d * 0.38 - _off.y) * ease(dt, 1.5);
      _off.setLength(nd);
      camera.position.copy(controls.target).add(_off);
      if (Math.abs(nd - goal.current) < goal.current * 0.004 && controls.target.distanceTo(_desired) < 0.02) flying.current = false;
    }
    controls.update();
  });
  return null;
}

/* ───────────────────────────── Scene ───────────────────────────── */

function World(props: SceneProps) {
  const { system: sys, edges, selectedId, focusId, hoveredId, linkFromId, highlightEdgeId, labels } = props;
  const h: Handlers = useMemo(() => ({ onSelect: props.onSelect, onHover: props.onHover, onOpen: props.onOpen }), [props.onSelect, props.onHover, props.onOpen]);

  const selected = selectedId ? sys.byId.get(selectedId) ?? null : null;
  const focusBody = sys.byId.get(focusId);
  const focusStar = focusBody?.kind === "star" ? focusBody.id : focusBody?.kind === "planet" ? focusBody.parent : null;

  // Everything related to the selection stays lit; the rest recedes.
  const related = useMemo(() => {
    if (!selected || selected.kind === "core") return null;
    const set = new Set<string>([selected.id]);
    for (const e of edges) {
      if (e.status !== "approved") continue;
      if (e.source === selected.id) set.add(e.target);
      if (e.target === selected.id) set.add(e.source);
    }
    if (selected.parent) set.add(selected.parent);
    if (selected.kind === "star") for (const p of sys.planetsOf.get(selected.id) ?? []) set.add(p.id);
    return set;
  }, [selected, edges, sys]);

  const planetLabelBudget = (focusStar ? sys.planetsOf.get(focusStar)?.length ?? 0 : 0) <= 40;
  const lite = props.quality === "lite";

  return (
    <>
      <ClockDriver target={props.paused ? 0 : focusStar || (selected && selected.kind !== "core") ? 0.22 : 1} />
      <Nebula lite={lite} />
      <Starfield count={lite ? 2600 : 6500} />
      <GalaxyDisk sys={sys} count={lite ? 5000 : 14000} />

      {sys.bodies.map((b) => {
        const isSel = b.id === selectedId;
        const isHov = b.id === hoveredId;
        const dim = !!related && !related.has(b.id);
        if (b.kind === "core") return <Core key={b.id} b={b} sys={sys} selected={isSel} hovered={isHov} label={labels} h={h} />;
        if (b.kind === "star") return <Star key={b.id} b={b} sys={sys} selected={isSel} hovered={isHov} focused={focusStar === b.id} label={labels} h={h} />;
        if (b.kind === "concept") return <Concept key={b.id} b={b} sys={sys} selected={isSel} hovered={isHov} dim={dim} label={labels || isSel || isHov} h={h} />;
        const showLabel = isSel || isHov || (labels && planetLabelBudget && b.parent !== null && b.parent === focusStar);
        return <Planet key={b.id} b={b} sys={sys} selected={isSel} hovered={isHov} dim={dim} label={showLabel} h={h} />;
      })}

      {edges.map((e) =>
        sys.byId.has(e.source) && sys.byId.has(e.target) ? (
          <Arc
            key={e.id}
            e={e}
            sys={sys}
            highlighted={e.id === highlightEdgeId || (!!selectedId && (e.source === selectedId || e.target === selectedId))}
            dim={(!!related && !(related.has(e.source) && related.has(e.target))) || (!!highlightEdgeId && e.id !== highlightEdgeId)}
          />
        ) : null,
      )}

      {selectedId && sys.byId.has(selectedId) ? <Reticle key={`sel-${selectedId}`} sys={sys} id={selectedId} color="#ffffff" /> : null}
      {linkFromId && sys.byId.has(linkFromId) ? <Reticle key={`link-${linkFromId}`} sys={sys} id={linkFromId} color="#ffbf7a" spin={-1.2} /> : null}

      <CameraRig sys={sys} focusId={focusId} reduced={props.reduced} />
    </>
  );
}

export default function CosmosScene(props: SceneProps) {
  const sim = useRef<SimClock>({ t: 0, scale: props.paused ? 0 : 1, target: 1 });
  const down = useRef<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  const full = props.quality === "full";
  return (
    <div
      className="absolute inset-0"
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY };
      }}
    >
      <SimCtx.Provider value={sim}>
        <Canvas
          flat
          dpr={full ? [1, 1.75] : [1, 1.25]}
          frameloop={visible ? "always" : "never"}
          gl={{ antialias: full, powerPreference: "high-performance", alpha: false, stencil: false }}
          camera={{ fov: 45, near: 0.1, far: 8000, position: [0, 120, 260] }}
          onPointerMissed={(e) => {
            const d = down.current;
            if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return; // finished a drag
            props.onSelect(null);
          }}
        >
          <color attach="background" args={["#020306"]} />
          <World {...props} />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.075}
            rotateSpeed={0.55}
            zoomSpeed={0.9}
            minDistance={1.2}
            maxDistance={props.system.extent * 7}
          />
        </Canvas>
      </SimCtx.Provider>
    </div>
  );
}
