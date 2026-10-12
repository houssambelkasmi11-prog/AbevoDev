"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CLUSTERS, heroState, smoothstep, SYNAPSE_LABELS, windowed } from "./hero-state";

/* ────────────────────────────────────────────────────────────────────────────
 * THE CONNECTION — procedural 3D composition.
 *  • Human intelligence: a sculpted, ceramic organic form with a single band.
 *  • Artificial intelligence: a wire lattice with luminous nodes and orbits.
 *  • Filaments, a synapse pulse, and a knowledge network that morphs from a
 *    synapse cloud → six subject clusters → the ORBIT emblem.
 * All animation is driven from `heroState` inside useFrame — no React state.
 * ──────────────────────────────────────────────────────────────────────────── */

export type Quality = "high" | "low";

const VOID = new THREE.Color("#070809");
const SILVER = new THREE.Color("#c9cdd1");
const ICE = new THREE.Color("#dbe8f2");

/* Deterministic PRNG so geometry is identical between renders. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Smooth pseudo-noise built from layered sines — cheap and organic. */
function field(x: number, y: number, z: number): number {
  return (
    Math.sin(1.7 * x + 1.3) * Math.sin(2.1 * y + 0.7) * Math.sin(1.9 * z + 2.1) * 0.55 +
    Math.sin(3.3 * x - 0.4 + y * 1.1) * Math.sin(2.7 * z + 1.9) * 0.25 +
    Math.sin(5.1 * y + z * 1.7 + 0.3) * 0.12
  );
}

/* ─────────────────────────── Camera choreography ─────────────────────────── */

interface CamKey {
  p: number;
  angle: number;
  radius: number;
  y: number;
}

const CAM_KEYS: CamKey[] = [
  { p: 0, angle: 0, radius: 9.6, y: 0.25 },
  { p: 0.2, angle: 0, radius: 7.8, y: 0.15 },
  { p: 0.4, angle: -0.5, radius: 6.9, y: 0.65 },
  { p: 0.6, angle: -0.18, radius: 6.1, y: 0.45 },
  { p: 0.85, angle: 0.38, radius: 16, y: 4.2 },
  { p: 0.94, angle: 0, radius: 10.5, y: 0 },
  { p: 1, angle: 0, radius: 1.6, y: 0 },
];

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function cameraAt(p: number, out: THREE.Vector3): THREE.Vector3 {
  let i = 0;
  while (i < CAM_KEYS.length - 2 && p > CAM_KEYS[i + 1].p) i++;
  const a = CAM_KEYS[i];
  const b = CAM_KEYS[i + 1];
  const t = easeInOut(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
  const angle = a.angle + (b.angle - a.angle) * t;
  const radius = a.radius + (b.radius - a.radius) * t;
  const y = a.y + (b.y - a.y) * t;
  return out.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
}

/* ─────────────────────────────── Human form ─────────────────────────────── */

function useHumanGeometry(quality: Quality) {
  return useMemo(() => {
    const detail = quality === "high" ? 56 : 26;
    let geo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
    geo.deleteAttribute("normal");
    geo.deleteAttribute("uv");
    geo = mergeVertices(geo);
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      // Organic displacement + a soft crease that reads as a sculpted fold.
      const n = field(v.x * 1.2, v.y * 1.2, v.z * 1.2);
      const crease = Math.exp(-Math.pow(v.x * 0.78 + v.y * 0.62 - 0.15, 2) / 0.018) * 0.11;
      const r = 1 + n * 0.16 - crease;
      v.multiplyScalar(r);
      v.y *= 1.24;
      v.z *= 0.9;
      v.x *= 0.98 + v.y * 0.04;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, [quality]);
}

function useRibbonGeometry() {
  return useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 160; i++) {
      const t = (i / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * 1.62, Math.sin(2 * t) * 0.32 + Math.sin(t) * 0.28, Math.sin(t) * 1.4));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
    return new THREE.TubeGeometry(curve, 360, 0.014, 8, true);
  }, []);
}

/* ──────────────────────────────── AI form ──────────────────────────────── */

const glowVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uOrbit;
  varying float vSeed;
  void main() {
    vec3 p = position;
    if (uOrbit > 0.5) {
      float a = uTime * (0.12 + aSeed * 0.25);
      float c = cos(a); float s = sin(a);
      p.xz = mat2(c, -s, s, c) * p.xz;
      p.y += sin(uTime * 0.6 + aSeed * 12.0) * 0.05;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.75 + 0.25 * sin(uTime * 2.0 + aSeed * 40.0);
    gl_PointSize = uSize * uPixelRatio * twinkle * (1.0 / -mv.z);
    vSeed = aSeed;
  }
`;

const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.0, d);
    float a = pow(core, 2.2) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

function makeGlowMaterial(size: number, opacity: number, orbit: boolean, dpr: number) {
  return new THREE.ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: size },
      uPixelRatio: { value: dpr },
      uOrbit: { value: orbit ? 1 : 0 },
      uColor: { value: ICE.clone() },
      uOpacity: { value: opacity },
    },
  });
}

function AIForm({ quality, groupRef }: { quality: Quality; groupRef: React.RefObject<THREE.Group | null> }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const innerRef = useRef<THREE.Group>(null);

  const parts = useMemo(() => {
    const outer = new THREE.IcosahedronGeometry(1.15, 1);
    const outerEdges = new THREE.EdgesGeometry(outer);
    const inner = new THREE.OctahedronGeometry(0.62, 0);
    const innerEdges = new THREE.EdgesGeometry(inner);
    const lattice = new THREE.IcosahedronGeometry(0.88, 0);
    const latticeEdges = new THREE.EdgesGeometry(lattice);

    // Unique vertices of the outer shell become luminous nodes.
    const merged = mergeVertices(outer.clone().deleteAttribute("normal").deleteAttribute("uv"));
    const nodePos = (merged.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
    const nodes = new THREE.BufferGeometry();
    nodes.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nodePos), 3));
    const seeds = new Float32Array(nodePos.length / 3).map((_, i) => (i * 0.6180339) % 1);
    nodes.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    // Orbiting computational dust.
    const count = quality === "high" ? 420 : 160;
    const rnd = mulberry32(7);
    const dust = new Float32Array(count * 3);
    const dustSeed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 1.45 + rnd() * 0.75;
      const th = rnd() * Math.PI * 2;
      const y = (rnd() - 0.5) * 0.7;
      dust[i * 3] = Math.cos(th) * r;
      dust[i * 3 + 1] = y;
      dust[i * 3 + 2] = Math.sin(th) * r;
      dustSeed[i] = rnd();
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(dustSeed, 1));

    // Two precise orbital rings.
    const ring = (rx: number, rz: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const t = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * rx, 0, Math.sin(t) * rz));
      }
      return new THREE.BufferGeometry().setFromPoints(pts);
    };

    const lineMat = new THREE.LineBasicMaterial({ color: SILVER, transparent: true, opacity: 0.75 });
    const faintMat = new THREE.LineBasicMaterial({ color: SILVER, transparent: true, opacity: 0.28 });
    const nodeMat = makeGlowMaterial(70, 1, false, 1);
    const dustMat = makeGlowMaterial(18, 0.55, true, 1);

    outer.dispose();
    inner.dispose();
    lattice.dispose();
    merged.dispose();

    return {
      outerEdges,
      innerEdges,
      latticeEdges,
      nodes,
      dustGeo,
      ringA: ring(1.7, 1.7),
      ringB: ring(2.05, 1.9),
      lineMat,
      faintMat,
      nodeMat,
      dustMat,
    };
  }, [quality]);

  useEffect(() => {
    parts.nodeMat.uniforms.uPixelRatio.value = dpr;
    parts.dustMat.uniforms.uPixelRatio.value = dpr;
  }, [dpr, parts]);

  useEffect(
    () => () => {
      Object.values(parts).forEach((o) => (o as { dispose?: () => void }).dispose?.());
    },
    [parts],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    parts.nodeMat.uniforms.uTime.value = t;
    parts.dustMat.uniforms.uTime.value = t;
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 0.35;
      innerRef.current.rotation.x += delta * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={parts.outerEdges} material={parts.lineMat} />
      <group ref={innerRef}>
        <lineSegments geometry={parts.innerEdges} material={parts.lineMat} />
        <lineSegments geometry={parts.latticeEdges} material={parts.faintMat} rotation={[0.6, 0.2, 0]} />
      </group>
      <points geometry={parts.nodes} material={parts.nodeMat} />
      <points geometry={parts.dustGeo} material={parts.dustMat} />
      <lineLoop geometry={parts.ringA} material={parts.faintMat} rotation={[0.35, 0, 0.15]} />
      <lineLoop geometry={parts.ringB} material={parts.faintMat} rotation={[-0.25, 0.4, -0.3]} />
    </group>
  );
}

/* ─────────────────────────────── Filaments ─────────────────────────────── */

const FILAMENT_SEGMENTS = 72;

function Filaments({ count, groupRef, materialRef }: { count: number; groupRef: React.RefObject<THREE.Group | null>; materialRef: React.RefObject<THREE.LineBasicMaterial | null> }) {
  const geos = useMemo(() => {
    const rnd = mulberry32(21);
    return Array.from({ length: count }, () => {
      const lift = (rnd() - 0.5) * 1.6;
      const depth = (rnd() - 0.5) * 1.4;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.4),
        new THREE.Vector3(-0.45, lift * 0.7, depth * 0.6),
        new THREE.Vector3(0, lift, depth),
        new THREE.Vector3(0.45, lift * 0.7, depth * 0.6),
        new THREE.Vector3(1, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.4),
      ]);
      const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(FILAMENT_SEGMENTS));
      g.setDrawRange(0, 0);
      return g;
    });
  }, [count]);

  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );

  const lines = useMemo(() => geos.map((g) => new THREE.Line(g, material)), [geos, material]);

  useEffect(() => {
    materialRef.current = material;
    return () => {
      geos.forEach((g) => g.dispose());
      material.dispose();
    };
  }, [geos, material, materialRef]);

  useFrame(() => {
    const p = heroState.progress;
    const draw = smoothstep(0.22, 0.42, p);
    geos.forEach((g, i) => {
      const stagger = Math.min(1, Math.max(0, draw * 1.35 - (i / count) * 0.35));
      g.setDrawRange(0, Math.floor(stagger * (FILAMENT_SEGMENTS + 1)));
    });
  });

  return (
    <group ref={groupRef}>
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
    </group>
  );
}

/* ───────────────────────────── Synapse pulse ───────────────────────────── */

const pulseFragment = /* glsl */ `
  uniform float uT;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;
    float ring = smoothstep(0.08, 0.0, abs(d - uT)) * (1.0 - uT);
    float core = smoothstep(0.35, 0.0, d) * (1.0 - smoothstep(0.0, 0.5, uT)) * 0.9;
    float a = ring + core;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vec3(0.93, 0.96, 1.0), a);
  }
`;

function Pulse() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: pulseFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uT: { value: 0 } },
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(({ camera }) => {
    const p = heroState.progress;
    const t = smoothstep(0.47, 0.6, p);
    mat.uniforms.uT.value = t;
    if (ref.current) {
      ref.current.visible = t > 0 && t < 1;
      ref.current.quaternion.copy(camera.quaternion);
      ref.current.scale.setScalar(1 + t * 9);
    }
  });
  return (
    <mesh ref={ref} material={mat} visible={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

/* ─────────────────────────── Knowledge network ─────────────────────────── */

const netVertex = /* glsl */ `
  attribute vec3 aPosB;
  attribute vec3 aPosC;
  attribute float aSeed;
  uniform float uTime;
  uniform float uAppear;
  uniform float uMorphB;
  uniform float uMorphC;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  varying float vAlpha;
  varying float vSeed;

  float stagger(float t, float seed) {
    return clamp(t * 1.6 - seed * 0.6, 0.0, 1.0);
  }

  void main() {
    float a = stagger(uAppear, aSeed);
    float b = stagger(uMorphB, aSeed);
    float c = stagger(uMorphC, fract(aSeed * 7.31));
    a = a * a * (3.0 - 2.0 * a);
    b = b * b * (3.0 - 2.0 * b);
    c = c * c * (3.0 - 2.0 * c);

    vec3 p = mix(position * 0.04, position, a);
    p = mix(p, aPosB, b);
    p = mix(p, aPosC, c);

    // Organic but bounded drift along controlled paths.
    float drift = (1.0 - c * 0.85);
    p += vec3(
      sin(uTime * 0.35 + aSeed * 31.0),
      cos(uTime * 0.29 + aSeed * 17.0),
      sin(uTime * 0.23 + aSeed * 11.0)
    ) * 0.045 * drift;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;

    // Cursor proximity: nodes lean gently away from the pointer.
    vec2 ndc = clip.xy / clip.w;
    vec2 d = ndc - uPointer;
    float l = length(d);
    float push = smoothstep(0.28, 0.0, l) * 0.22 * (1.0 - c);
    mv.xy += normalize(d + 1e-5) * push * (-mv.z) * 0.08;
    gl_Position = projectionMatrix * mv;

    gl_PointSize = uSize * uPixelRatio * (0.55 + aSeed * 0.9) * (1.0 / -mv.z);
    vAlpha = a;
    vSeed = aSeed;
  }
`;

const netFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float disc = smoothstep(0.5, 0.18, d);
    float a = disc * vAlpha * uOpacity * (0.55 + vSeed * 0.45);
    if (a < 0.01) discard;
    gl_FragColor = vec4(mix(vec3(0.79, 0.8, 0.82), vec3(0.95, 0.97, 1.0), vSeed), a);
  }
`;

const lineVertex = /* glsl */ `
  attribute vec3 aPosB;
  attribute vec3 aPosC;
  attribute float aSeed;
  uniform float uTime;
  uniform float uAppear;
  uniform float uMorphB;
  uniform float uMorphC;
  varying float vAlpha;
  float stagger(float t, float seed) { return clamp(t * 1.6 - seed * 0.6, 0.0, 1.0); }
  void main() {
    float a = stagger(uAppear, aSeed);
    float b = stagger(uMorphB, aSeed);
    float c = stagger(uMorphC, fract(aSeed * 7.31));
    vec3 p = mix(position * 0.04, position, a);
    p = mix(p, aPosB, b);
    p = mix(p, aPosC, c);
    p += vec3(sin(uTime * 0.35 + aSeed * 31.0), cos(uTime * 0.29 + aSeed * 17.0), sin(uTime * 0.23 + aSeed * 11.0)) * 0.045;
    vAlpha = a * (1.0 - c);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const lineFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float a = vAlpha * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(0.86, 0.9, 0.95, a);
  }
`;

interface NetworkData {
  pointGeo: THREE.BufferGeometry;
  lineGeo: THREE.BufferGeometry;
  clusterCenters: THREE.Vector3[];
  synapseAnchors: THREE.Vector3[];
}

function buildNetwork(count: number): NetworkData {
  const rnd = mulberry32(42);
  const A = new Float32Array(count * 3);
  const B = new Float32Array(count * 3);
  const C = new Float32Array(count * 3);
  const S = new Float32Array(count);

  // Cluster centres on a tilted ring.
  const clusterCenters = CLUSTERS.map((_, i) => {
    const th = (i / CLUSTERS.length) * Math.PI * 2 + 0.3;
    return new THREE.Vector3(Math.cos(th) * 6.2, Math.sin(th * 2) * 1.1, Math.sin(th) * 6.2);
  });

  const golden = Math.PI * (3 - Math.sqrt(5));
  const clusterOf = new Int32Array(count);

  for (let i = 0; i < count; i++) {
    S[i] = rnd();
    // A — synapse cloud: layered golden-spiral shells around the contact point.
    const shell = 0.35 + Math.pow(rnd(), 0.7) * 1.75;
    const y = 1 - (i / (count - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    A[i * 3] = Math.cos(th) * rad * shell * 1.25;
    A[i * 3 + 1] = y * shell * 0.85;
    A[i * 3 + 2] = Math.sin(th) * rad * shell;

    // B — six subject clusters, each a soft spherical constellation.
    const k = i % CLUSTERS.length;
    clusterOf[i] = k;
    const c = clusterCenters[k];
    const u = rnd() * 2 - 1;
    const phi = rnd() * Math.PI * 2;
    const rr = Math.pow(rnd(), 0.55) * 1.25;
    const s = Math.sqrt(1 - u * u);
    B[i * 3] = c.x + Math.cos(phi) * s * rr;
    B[i * 3 + 1] = c.y + u * rr * 0.8;
    B[i * 3 + 2] = c.z + Math.sin(phi) * s * rr;

    // C — the ORBIT emblem: two ellipses at ±32° and a dense core.
    const pick = rnd();
    if (pick < 0.12) {
      const r = Math.sqrt(rnd()) * 0.32;
      const t = rnd() * Math.PI * 2;
      C[i * 3] = Math.cos(t) * r;
      C[i * 3 + 1] = Math.sin(t) * r;
      C[i * 3 + 2] = 0;
    } else {
      const sign = pick < 0.56 ? 1 : -1;
      const t = rnd() * Math.PI * 2;
      const ex = Math.cos(t) * 3.7;
      const ey = Math.sin(t) * 1.52;
      const rot = sign * (32 * Math.PI) / 180;
      const jitter = (rnd() - 0.5) * 0.05;
      C[i * 3] = ex * Math.cos(rot) - ey * Math.sin(rot) + jitter;
      C[i * 3 + 1] = ex * Math.sin(rot) + ey * Math.cos(rot) + jitter;
      C[i * 3 + 2] = (rnd() - 0.5) * 0.06;
    }
  }

  // Edges: nearest neighbours within each cluster + hub-to-hub bridges.
  const edges: [number, number][] = [];
  for (let k = 0; k < CLUSTERS.length; k++) {
    const members: number[] = [];
    for (let i = 0; i < count; i++) if (clusterOf[i] === k) members.push(i);
    for (const i of members) {
      const dists = members
        .filter((j) => j !== i)
        .map((j) => {
          const dx = B[i * 3] - B[j * 3];
          const dy = B[i * 3 + 1] - B[j * 3 + 1];
          const dz = B[i * 3 + 2] - B[j * 3 + 2];
          return { j, d: dx * dx + dy * dy + dz * dz };
        })
        .sort((a, b) => a.d - b.d);
      for (let n = 0; n < 2 && n < dists.length; n++) if (i < dists[n].j) edges.push([i, dists[n].j]);
    }
  }
  for (let k = 0; k < CLUSTERS.length; k++) {
    edges.push([k, ((k + 1) % CLUSTERS.length) + CLUSTERS.length]);
    edges.push([k, ((k + 2) % CLUSTERS.length) + CLUSTERS.length * 2]);
  }

  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute("position", new THREE.BufferAttribute(A, 3));
  pointGeo.setAttribute("aPosB", new THREE.BufferAttribute(B, 3));
  pointGeo.setAttribute("aPosC", new THREE.BufferAttribute(C, 3));
  pointGeo.setAttribute("aSeed", new THREE.BufferAttribute(S, 1));
  pointGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);

  const LA = new Float32Array(edges.length * 6);
  const LB = new Float32Array(edges.length * 6);
  const LC = new Float32Array(edges.length * 6);
  const LS = new Float32Array(edges.length * 2);
  edges.forEach(([i, j], e) => {
    for (let a = 0; a < 3; a++) {
      LA[e * 6 + a] = A[i * 3 + a];
      LA[e * 6 + 3 + a] = A[j * 3 + a];
      LB[e * 6 + a] = B[i * 3 + a];
      LB[e * 6 + 3 + a] = B[j * 3 + a];
      LC[e * 6 + a] = C[i * 3 + a];
      LC[e * 6 + 3 + a] = C[j * 3 + a];
    }
    LS[e * 2] = S[i];
    LS[e * 2 + 1] = S[j];
  });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(LA, 3));
  lineGeo.setAttribute("aPosB", new THREE.BufferAttribute(LB, 3));
  lineGeo.setAttribute("aPosC", new THREE.BufferAttribute(LC, 3));
  lineGeo.setAttribute("aSeed", new THREE.BufferAttribute(LS, 1));
  lineGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);

  const synapseAnchors = SYNAPSE_LABELS.map((_, i) => {
    const th = (i / SYNAPSE_LABELS.length) * Math.PI * 2 + 0.4;
    return new THREE.Vector3(Math.cos(th) * 2.3, Math.sin(th) * 1.35, Math.sin(th * 1.7) * 0.6);
  });

  return { pointGeo, lineGeo, clusterCenters, synapseAnchors };
}

function KnowledgeNetwork({ count, data }: { count: number; data: NetworkData }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAppear: { value: 0 },
      uMorphB: { value: 0 },
      uMorphC: { value: 0 },
      uSize: { value: count > 600 ? 54 : 64 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: 1 },
      uPointer: { value: new THREE.Vector2(9, 9) },
    }),
    [count],
  );
  const pointMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: netVertex,
        fragmentShader: netFragment,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [uniforms],
  );
  const lineUniforms = useMemo(
    () => ({ uTime: uniforms.uTime, uAppear: uniforms.uAppear, uMorphB: uniforms.uMorphB, uMorphC: uniforms.uMorphC, uOpacity: { value: 0.22 } }),
    [uniforms],
  );
  const lineMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: lineVertex,
        fragmentShader: lineFragment,
        uniforms: lineUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [lineUniforms],
  );

  useEffect(() => {
    uniforms.uPixelRatio.value = dpr;
  }, [dpr, uniforms]);

  useEffect(
    () => () => {
      pointMat.dispose();
      lineMat.dispose();
    },
    [pointMat, lineMat],
  );

  useFrame((state) => {
    const p = heroState.progress;
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uAppear.value = smoothstep(0.44, 0.6, p);
    uniforms.uMorphB.value = smoothstep(0.6, 0.8, p);
    uniforms.uMorphC.value = smoothstep(0.85, 0.95, p);
    uniforms.uOpacity.value = 1 - smoothstep(0.965, 1, p);
    lineUniforms.uOpacity.value = 0.2 + 0.1 * smoothstep(0.6, 0.8, p);
    uniforms.uPointer.value.set(heroState.pointer.x, heroState.pointer.y);
  });

  return (
    <group>
      <lineSegments geometry={data.lineGeo} material={lineMat} frustumCulled={false} />
      <points geometry={data.pointGeo} material={pointMat} frustumCulled={false} />
    </group>
  );
}

/* ───────────────────────── Projected DOM labels ───────────────────────── */

function LabelProjector({ data, humanRef, aiRef }: { data: NetworkData; humanRef: React.RefObject<THREE.Group | null>; aiRef: React.RefObject<THREE.Group | null> }) {
  const size = useThree((s) => s.size);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const world = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    const p = heroState.progress;
    const place = (key: string, pos: THREE.Vector3, opacity: number) => {
      const el = heroState.labels.get(key);
      if (!el) return;
      tmp.copy(pos).project(camera);
      const behind = tmp.z > 1;
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = behind ? "0" : opacity.toFixed(3);
    };

    if (humanRef.current) {
      world.set(0, 1.75, 0);
      humanRef.current.localToWorld(world);
      place("human", world, windowed(p, -1, 0, 0.12, 0.2));
    }
    if (aiRef.current) {
      world.set(0, 1.75, 0);
      aiRef.current.localToWorld(world);
      place("ai", world, windowed(p, -1, 0, 0.12, 0.2));
    }
    data.synapseAnchors.forEach((a, i) => place(`syn-${i}`, a, windowed(p, 0.47 + i * 0.012, 0.53 + i * 0.012, 0.6, 0.64)));
    data.clusterCenters.forEach((c, i) => {
      world.copy(c);
      world.y += 1.55;
      place(`cl-${i}`, world, windowed(p, 0.68 + i * 0.01, 0.74 + i * 0.01, 0.84, 0.88));
    });
  });
  return null;
}

/* ─────────────────────────────── Composition ─────────────────────────────── */

function Composition({ quality }: { quality: Quality }) {
  const humanGeo = useHumanGeometry(quality);
  const ribbonGeo = useRibbonGeometry();
  const humanMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#e9e6e0",
        roughness: 0.34,
        metalness: 0.04,
        clearcoat: 0.65,
        clearcoatRoughness: 0.22,
        sheen: 0.6,
        sheenColor: new THREE.Color("#ffffff"),
        sheenRoughness: 0.5,
        envMapIntensity: 0.9,
      }),
    [],
  );
  const ribbonMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d5d9dd", roughness: 0.18, metalness: 1, envMapIntensity: 1.2 }),
    [],
  );

  const humanRef = useRef<THREE.Group>(null);
  const humanBody = useRef<THREE.Mesh>(null);
  const ribbonRef = useRef<THREE.Mesh>(null);
  const aiRef = useRef<THREE.Group>(null);
  const filamentRef = useRef<THREE.Group>(null);
  const filamentMat = useRef<THREE.LineBasicMaterial | null>(null);

  const netCount = quality === "high" ? 900 : 420;
  const network = useMemo(() => buildNetwork(netCount), [netCount]);

  useEffect(
    () => () => {
      humanGeo.dispose();
      ribbonGeo.dispose();
      humanMat.dispose();
      ribbonMat.dispose();
      network.pointGeo.dispose();
      network.lineGeo.dispose();
    },
    [humanGeo, ribbonGeo, humanMat, ribbonMat, network],
  );

  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const smoothPointer = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const p = heroState.progress;
    const t = state.clock.elapsedTime;

    // Pointer smoothing (shared with the network shader).
    const sp = smoothPointer.current;
    sp.x += (state.pointer.x - sp.x) * (1 - Math.exp(-dt * 3));
    sp.y += (state.pointer.y - sp.y) * (1 - Math.exp(-dt * 3));
    heroState.pointer.x = state.pointer.x;
    heroState.pointer.y = state.pointer.y;

    // Camera — scripted path + restrained parallax.
    cameraAt(p, camTarget);
    const parallax = 1 - smoothstep(0.9, 1, p);
    camTarget.x += sp.x * 0.45 * parallax;
    camTarget.y += sp.y * 0.28 * parallax;
    state.camera.position.lerp(camTarget, 1 - Math.exp(-dt * 4.5));
    lookAt.set(0, 0, 0);
    state.camera.lookAt(lookAt);

    // Forms: approach → contact → recede into the universe.
    const approach = smoothstep(0.2, 0.4, p);
    const contact = smoothstep(0.4, 0.52, p);
    const recede = smoothstep(0.6, 0.8, p);
    const sep = 2.65 - approach * 1.05 - contact * 0.62;
    const scale = (1 - recede * 0.9) * (1 + Math.sin(t * 0.8) * 0.012);
    const breathe = Math.sin(t * 0.6) * 0.05;

    if (humanRef.current) {
      humanRef.current.position.set(-sep * (1 - recede), breathe, 0);
      humanRef.current.scale.setScalar(Math.max(scale, 0.0001));
      humanRef.current.visible = scale > 0.02 && p < 0.9;
      humanRef.current.rotation.y = 0.55 - approach * 0.7 + sp.x * 0.15;
      humanRef.current.rotation.x = sp.y * -0.08;
    }
    if (humanBody.current) humanBody.current.rotation.y = t * 0.06;
    if (ribbonRef.current) {
      ribbonRef.current.rotation.y = t * 0.18;
      ribbonRef.current.rotation.z = 0.22 + Math.sin(t * 0.3) * 0.05;
    }
    if (aiRef.current) {
      aiRef.current.position.set(sep * (1 - recede), -breathe, 0);
      aiRef.current.scale.setScalar(Math.max(scale, 0.0001));
      aiRef.current.visible = scale > 0.02 && p < 0.9;
      aiRef.current.rotation.y += dt * (0.12 + approach * 0.2);
      aiRef.current.rotation.x = sp.y * 0.1 - 0.1;
    }
    if (filamentRef.current) {
      filamentRef.current.scale.set(sep * (1 - recede), 1 - recede * 0.6, 1);
      filamentRef.current.visible = p > 0.2 && p < 0.86;
    }
    if (filamentMat.current) filamentMat.current.opacity = 0.38 * smoothstep(0.22, 0.3, p) * (1 - smoothstep(0.62, 0.8, p));
  });

  return (
    <>
      <group ref={humanRef}>
        <mesh ref={humanBody} geometry={humanGeo} material={humanMat} />
        {quality === "high" ? <mesh ref={ribbonRef} geometry={ribbonGeo} material={ribbonMat} /> : null}
      </group>
      <AIForm quality={quality} groupRef={aiRef} />
      <Filaments count={quality === "high" ? 18 : 10} groupRef={filamentRef} materialRef={filamentMat} />
      <Pulse />
      <KnowledgeNetwork count={netCount} data={network} />
      <LabelProjector data={network} humanRef={humanRef} aiRef={aiRef} />
    </>
  );
}

export default function ConnectionScene({ quality, active }: { quality: Quality; active: boolean }) {
  return (
    <Canvas
      dpr={quality === "high" ? [1, 1.75] : [1, 1.4]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: quality === "high", powerPreference: "high-performance", alpha: false, stencil: false }}
      camera={{ position: [0, 0.25, 9.6], fov: 35, near: 0.1, far: 120 }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(VOID, 1);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        scene.fog = new THREE.FogExp2(VOID.getHex(), 0.038);
      }}
      aria-hidden
    >
      <ambientLight intensity={0.12} />
      <directionalLight position={[-4, 6, 5]} intensity={1.6} color="#ffffff" />
      <directionalLight position={[5, -2, -6]} intensity={1.1} color="#cfe2f2" />
      <pointLight position={[0, 0, 2.5]} intensity={6} distance={6} color="#e8f2fa" />
      <Environment resolution={quality === "high" ? 256 : 64} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, -6]} scale={[12, 2.5, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-6, 1, 2]} rotation={[0, Math.PI / 2, 0]} scale={[8, 1.2, 1]} />
        <Lightformer form="ring" intensity={1.6} position={[5, 2, 4]} scale={2.5} />
        <Lightformer form="rect" intensity={0.5} position={[0, -5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]} color="#9fb2c2" />
      </Environment>
      <Composition quality={quality} />
    </Canvas>
  );
}
