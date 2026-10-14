import * as THREE from "three";

/* Procedural textures, generated once per page load on a 2D canvas. */

let glow: THREE.Texture | null = null;
let halo: THREE.Texture | null = null;
let nebula: THREE.Texture | null = null;

/** Soft radial falloff used for every glow / corona / photon sprite. */
export function glowTexture(): THREE.Texture {
  if (glow) return glow;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.18, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.14)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glow = new THREE.CanvasTexture(c);
  return glow;
}

/** Thin dashed ring used as the selection reticle. */
export function haloTexture(): THREE.Texture {
  if (halo) return halo;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.strokeStyle = "rgba(255,255,255,0.95)";
  g.lineWidth = 3;
  g.setLineDash([10, 9]);
  g.beginPath();
  g.arc(128, 128, 112, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  g.lineWidth = 1.5;
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.beginPath();
  g.arc(128, 128, 124, 0, Math.PI * 2);
  g.stroke();
  halo = new THREE.CanvasTexture(c);
  return halo;
}

/** Four-point diffraction flare that makes a star read as a star. */
let spikes: THREE.Texture | null = null;
export function spikesTexture(): THREE.Texture {
  if (spikes) return spikes;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.translate(S / 2, S / 2);
  const ray = (angle: number, len: number, width: number, alpha: number) => {
    g.save();
    g.rotate(angle);
    const grd = g.createLinearGradient(-len, 0, len, 0);
    grd.addColorStop(0, "rgba(255,255,255,0)");
    grd.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(-len, 0);
    g.lineTo(0, -width);
    g.lineTo(len, 0);
    g.lineTo(0, width);
    g.closePath();
    g.fill();
    g.restore();
  };
  ray(0, S / 2, 2.2, 0.95);
  ray(Math.PI / 2, S / 2, 2.2, 0.95);
  ray(Math.PI / 4, S / 3.2, 1.2, 0.4);
  ray(-Math.PI / 4, S / 3.2, 1.2, 0.4);
  spikes = new THREE.CanvasTexture(c);
  return spikes;
}

/* ── Nebula sky: seamless (sampled on the sphere), computed once in JS ── */

function hash(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  let xf = x - xi;
  let yf = y - yi;
  let zf = z - zi;
  xf = xf * xf * (3 - 2 * xf);
  yf = yf * yf * (3 - 2 * yf);
  zf = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf),
    zf,
  );
}

function fbm(x: number, y: number, z: number, oct: number): number {
  let v = 0;
  let a = 0.5;
  for (let i = 0; i < oct; i++) {
    v += a * noise(x, y, z);
    x = x * 2.03 + 1.7;
    y = y * 2.03 + 9.2;
    z = z * 2.03 + 3.1;
    a *= 0.5;
  }
  return v;
}

export function nebulaTexture(lite: boolean): THREE.Texture {
  if (nebula) return nebula;
  const W = lite ? 384 : 768;
  const H = W / 2;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const img = g.createImageData(W, H);
  // Galactic band tilted across the sky.
  const bandN = new THREE.Vector3(0.25, 1, 0.35).normalize();
  for (let j = 0; j < H; j++) {
    const lat = (j / H - 0.5) * Math.PI;
    for (let i = 0; i < W; i++) {
      const lon = (i / W) * Math.PI * 2;
      const x = Math.cos(lat) * Math.cos(lon);
      const y = Math.sin(lat);
      const z = Math.cos(lat) * Math.sin(lon);
      const n = fbm(x * 2.2 + 11, y * 2.2, z * 2.2, 5);
      const m = fbm(x * 4 + 3, y * 4 + 5, z * 4, 4);
      const band = Math.exp(-Math.pow((x * bandN.x + y * bandN.y + z * bandN.z) * 3.2, 2));
      const cloud = Math.max(0, n - 0.42) * 2.2;
      const dust = Math.max(0, m - 0.5) * 1.6;
      // Deep indigo base → teal and violet clouds → warm dusty band.
      let r = 2 + cloud * 18 + band * (12 + dust * 22);
      let gg = 4 + cloud * 22 + band * (11 + dust * 15) + dust * 5;
      let b = 9 + cloud * 42 + band * (16 + dust * 12);
      const violet = Math.max(0, fbm(x * 1.6 + 40, y * 1.6, z * 1.6, 3) - 0.5) * 2;
      r += violet * 22;
      b += violet * 16;
      const k = (j * W + i) * 4;
      img.data[k] = Math.min(255, r);
      img.data[k + 1] = Math.min(255, gg);
      img.data[k + 2] = Math.min(255, b);
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  nebula = new THREE.CanvasTexture(c);
  return nebula;
}
