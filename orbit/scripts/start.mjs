// Fast launcher: runs ORBIT as an optimised production server.
// Rebuilds only when source files, dependencies or env changed since the last build,
// so day-to-day starts take a couple of seconds instead of compiling every page on demand.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const DIST = ".next-prod";
const STAMP = join(root, DIST, "orbit-build-stamp");
const port = process.env.PORT ?? "3000";
const force = process.argv.includes("--rebuild");

const WATCH = ["src", "public", "package-lock.json", "package.json", "next.config.ts", "postcss.config.mjs", "tsconfig.json", ".env.local", ".env"];

function walk(p, out) {
  if (!existsSync(p)) return;
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const name of readdirSync(p)) walk(join(p, name), out);
  } else out.push(`${p}:${st.size}:${Math.round(st.mtimeMs)}`);
}

function fingerprint() {
  const files = [];
  for (const w of WATCH) walk(join(root, w), files);
  files.sort();
  return createHash("sha1").update(files.join("\n")).digest("hex");
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, ...env } });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`))));
  });
}

const env = { ORBIT_DIST: DIST, NEXT_TELEMETRY_DISABLED: "1" };
const fp = fingerprint();
const prev = existsSync(STAMP) ? readFileSync(STAMP, "utf8").trim() : "";

if (force || fp !== prev || !existsSync(join(root, DIST, "BUILD_ID"))) {
  console.log("[ORBIT] Changes detected — building an optimised version (only needed after updates)…");
  await run("npx", ["next", "build"], env);
  writeFileSync(STAMP, fingerprint());
} else {
  console.log("[ORBIT] Build is up to date — skipping compile.");
}

console.log(`[ORBIT] Starting on http://localhost:${port}`);
await run("npx", ["next", "start", "-p", port], env);
