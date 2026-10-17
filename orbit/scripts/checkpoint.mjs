#!/usr/bin/env node
/**
 * ORBIT checkpoint / recovery points.
 *
 *   node scripts/checkpoint.mjs save [label]     snapshot the project
 *   node scripts/checkpoint.mjs list             show saved checkpoints
 *   node scripts/checkpoint.mjs restore [name]   roll back (latest if no name)
 *   node scripts/checkpoint.mjs diff [name]      files changed since a checkpoint
 *
 * Snapshots live in .checkpoints/<timestamp>__<label>/ and contain every
 * project file except node_modules, build output and .checkpoints itself.
 * `restore` first auto-saves the current state (label "pre-restore"), so a
 * restore can always be undone, then copies the checkpoint back and removes
 * files that did not exist when the checkpoint was taken.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORE = path.join(ROOT, ".checkpoints");
const IGNORE = new Set([
  "node_modules", ".next", ".next-prod", ".checkpoints", ".git", ".vercel",
  ".turbo", "Claude outputs", ".DS_Store", ".orbit-data",
]);
const IGNORE_FILES = [/^\.env(\.local)?$/, /\.tsbuildinfo$/];

function walk(dir, rel = "") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(abs, r));
    else if (e.isFile() && !IGNORE_FILES.some((re) => re.test(e.name))) out.push(r);
  }
  return out;
}
const hash = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");
const list = () =>
  fs.existsSync(STORE)
    ? fs.readdirSync(STORE).filter((d) => fs.existsSync(path.join(STORE, d, "manifest.json"))).sort()
    : [];

function save(label = "manual") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const name = `${stamp}__${label.replace(/[^\w-]+/g, "-").slice(0, 40)}`;
  const dest = path.join(STORE, name, "files");
  const files = walk(ROOT);
  const manifest = {};
  for (const f of files) {
    const to = path.join(dest, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), to);
    manifest[f] = hash(path.join(ROOT, f));
  }
  fs.writeFileSync(
    path.join(STORE, name, "manifest.json"),
    JSON.stringify({ name, label, created: new Date().toISOString(), files: manifest }, null, 2),
  );
  console.log(`✔ checkpoint saved: ${name}  (${files.length} files)`);
  return name;
}

function pick(name) {
  const all = list();
  if (!all.length) throw new Error("No checkpoints yet. Run: node scripts/checkpoint.mjs save");
  if (!name) return all.filter((n) => !n.endsWith("__pre-restore")).at(-1) ?? all.at(-1);
  const hit = all.find((n) => n === name) ?? all.find((n) => n.includes(name));
  if (!hit) throw new Error(`No checkpoint matching "${name}". Try: node scripts/checkpoint.mjs list`);
  return hit;
}
const read = (name) => JSON.parse(fs.readFileSync(path.join(STORE, name, "manifest.json"), "utf8"));

function diff(name) {
  const cp = read(pick(name));
  const now = walk(ROOT);
  const changed = [], added = [], removed = [];
  for (const f of now) {
    if (!(f in cp.files)) added.push(f);
    else if (hash(path.join(ROOT, f)) !== cp.files[f]) changed.push(f);
  }
  for (const f of Object.keys(cp.files)) if (!now.includes(f)) removed.push(f);
  console.log(`Since ${cp.name}:`);
  for (const f of changed) console.log(`  M ${f}`);
  for (const f of added) console.log(`  A ${f}`);
  for (const f of removed) console.log(`  D ${f}`);
  if (!changed.length && !added.length && !removed.length) console.log("  (no changes)");
}

function restore(name) {
  const target = pick(name);
  const cp = read(target);
  save("pre-restore");
  const src = path.join(STORE, target, "files");
  for (const f of Object.keys(cp.files)) {
    if (f === "scripts/checkpoint.mjs") continue; // never roll back the recovery tool itself
    const to = path.join(ROOT, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(src, f), to);
  }
  let removed = 0;
  for (const f of walk(ROOT)) {
    if (!(f in cp.files) && f !== "scripts/checkpoint.mjs") {
      fs.rmSync(path.join(ROOT, f));
      removed++;
    }
  }
  console.log(`✔ restored ${target} (${Object.keys(cp.files).length} files, ${removed} newer files removed)`);
  console.log("  Your previous state was saved as a 'pre-restore' checkpoint.");
  console.log("  If the app is running, restart it (start-orbit.bat rebuilds automatically).");
}

const [cmd = "list", arg] = process.argv.slice(2);
try {
  if (cmd === "save") save(arg);
  else if (cmd === "restore") restore(arg);
  else if (cmd === "diff") diff(arg);
  else if (cmd === "list") {
    const all = list();
    if (!all.length) console.log("No checkpoints yet.");
    for (const n of all) {
      const m = read(n);
      console.log(`  ${n}   ${Object.keys(m.files).length} files`);
    }
  } else console.log("Usage: node scripts/checkpoint.mjs save|list|restore|diff [name]");
} catch (e) {
  console.error("✖", e.message);
  process.exit(1);
}
