/* GLSL for the Universe view. Colours arrive as plain sRGB vec3s and are
   written out unchanged (the canvas runs with flat/no tone mapping). */

const NOISE = /* glsl */ `
float h3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float n3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(h3(i + vec3(0.0, 0.0, 0.0)), h3(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * n3(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return v;
}
`;

export const SPHERE_VERT = /* glsl */ `
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vN;
void main() {
  vObj = normalize(position);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const PLANET_FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uStyle;
uniform float uSeed;
uniform float uTime;
uniform float uHighlight;
uniform float uDim;
uniform vec3 uLight;
uniform vec3 uLightColor;
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vN;
${NOISE}
void main() {
  vec3 p = vObj;
  vec3 sp = p * 2.2 + uSeed;
  float warp = fbm3(sp * 1.3 + vec3(0.0, uTime * 0.015, 0.0));

  // Gas giant: turbulent latitude bands.
  float bands = sin((p.y * 6.0 + warp * 2.4) * 3.14159 + uSeed) * 0.5 + 0.5;
  bands = mix(bands, fbm3(vec3(p.y * 16.0, warp * 3.0, uSeed)), 0.35);
  // Rocky world: continents and highlands.
  float rock = smoothstep(0.38, 0.72, fbm3(sp * 2.6 + warp));
  // Ice world: wind-streaked plains.
  float ice = fbm3(vec3(p.x * 2.0, p.y * 10.0, p.z * 2.0) + uSeed + warp);

  float g = uStyle < 0.5 ? bands : (uStyle < 1.5 ? rock : ice);
  vec3 base = mix(uColorB, uColorA, g);
  if (uStyle > 1.5) base = mix(base, vec3(0.93, 0.97, 1.0), smoothstep(0.62, 0.92, abs(p.y)) * 0.85);
  if (uStyle > 0.5 && uStyle < 1.5) base = mix(base, uColorA * 1.15, smoothstep(0.75, 0.95, fbm3(sp * 7.0)) * 0.4);

  vec3 N = normalize(vN);
  vec3 L = normalize(uLight - vWorld);
  vec3 V = normalize(cameraPosition - vWorld);
  float diff = dot(N, L);
  float lit = smoothstep(-0.2, 0.65, diff);
  vec3 col = base * (0.13 + 1.02 * lit * mix(vec3(1.0), uLightColor, 0.35));

  // Specular glint on the day side.
  vec3 H = normalize(L + V);
  col += pow(max(dot(N, H), 0.0), 40.0) * 0.18 * lit;

  // Atmosphere: fresnel rim, brighter on the lit limb.
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
  vec3 atmo = mix(uColorA, vec3(1.0), 0.35);
  col += atmo * fres * (0.18 + 0.8 * smoothstep(-0.45, 0.6, diff));
  col += atmo * fres * uHighlight * 1.4;

  col = mix(col, col * 0.22, uDim);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const SUN_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uHighlight;
uniform vec3 uHot;
uniform vec3 uMid;
uniform vec3 uCool;
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vN;
${NOISE}
void main() {
  vec3 p = vObj;
  float t = uTime + uSeed * 10.0;
  // Boiling convection cells + slower granulation drifting across the surface.
  float n = fbm3(p * 3.2 + vec3(t * 0.05, t * 0.03, -t * 0.02) + uSeed);
  float n2 = fbm3(p * 8.5 - t * 0.07 + n * 2.2);
  float heat = n * 0.55 + n2 * 0.55;
  vec3 c = mix(uCool, uMid, smoothstep(0.26, 0.7, heat));
  c = mix(c, uHot, smoothstep(0.66, 0.98, heat));
  // Dark sunspots now and then.
  c *= 1.0 - smoothstep(0.62, 0.7, fbm3(p * 2.0 + uSeed * 3.0 + t * 0.01)) * 0.35;
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 1.6);
  c += uMid * fres * (0.7 + uHighlight * 0.8);
  gl_FragColor = vec4(c * (1.1 + uHighlight * 0.15), 1.0);
}
`;

export const RING_VERT = /* glsl */ `
uniform float uInner;
uniform float uOuter;
varying float vR;
void main() {
  vR = (length(position.xy) - uInner) / (uOuter - uInner);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const RING_FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uSeed;
uniform float uDim;
varying float vR;
${NOISE}
void main() {
  float bands = n3(vec3(vR * 40.0, uSeed, 0.0)) * 0.6 + n3(vec3(vR * 140.0, uSeed * 2.0, 1.0)) * 0.4;
  float edge = smoothstep(0.0, 0.08, vR) * smoothstep(1.0, 0.85, vR);
  float a = edge * (0.22 + 0.62 * bands);
  a *= 1.0 - smoothstep(0.025, 0.0, abs(vR - 0.58)) * 0.9; // a Cassini-style gap
  vec3 c = mix(uColorB, uColorA, bands) * 1.1;
  gl_FragColor = vec4(c, a * 0.7 * (1.0 - uDim * 0.75));
}
`;

export const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vTw;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vTw = 0.62 + 0.38 * sin(uTime * (0.5 + aSeed * 1.8) + aSeed * 40.0);
  gl_PointSize = aSize * uPixelRatio * (0.85 + 0.3 * vTw);
  vColor = aColor;
}
`;

export const STAR_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vTw;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = pow(smoothstep(0.5, 0.0, d), 1.7);
  gl_FragColor = vec4(vColor * vTw, a);
}
`;

export const GALAXY_VERT = /* glsl */ `
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
varying vec3 vColor;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.75 + 0.25 * sin(uTime * (0.4 + aSeed) + aSeed * 30.0);
  // Size-attenuated so the disk has real depth as you fly through it.
  gl_PointSize = clamp(aSize * uPixelRatio * uScale / -mv.z, 1.0, 48.0);
  vColor = aColor * tw;
  vA = smoothstep(0.0, 6.0, -mv.z); // fade dust right in front of the lens
}
`;

export const GALAXY_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = pow(smoothstep(0.5, 0.0, length(c)), 2.2) * vA;
  gl_FragColor = vec4(vColor, a);
}
`;

export const ARC_VERT = /* glsl */ `
attribute float aT;
varying float vT;
void main() {
  vT = aT;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ARC_FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uTime;
uniform float uOpacity;
uniform float uDashed;
uniform float uSeed;
varying float vT;
void main() {
  float flow = fract(vT * 2.0 - uTime * 0.35 + uSeed);
  float pulse = smoothstep(0.0, 0.05, flow) * smoothstep(0.32, 0.05, flow);
  float ends = smoothstep(0.0, 0.07, vT) * smoothstep(1.0, 0.93, vT);
  float a = uOpacity * (0.3 + 0.95 * pulse) * ends;
  if (uDashed > 0.5) a *= step(0.45, fract(vT * 28.0 - uTime * 0.6));
  vec3 c = mix(uColorA, uColorB, vT) + pulse * 0.35;
  gl_FragColor = vec4(c, a);
}
`;

/** Parses #rrggbb into a raw (non colour-managed) RGB triple. */
export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace("#", ""), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}
