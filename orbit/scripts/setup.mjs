// Generates .env.local with fresh secrets for local development.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const target = join(root, ".env.local");
const template = readFileSync(join(root, ".env.example"), "utf8");

if (existsSync(target)) {
  const current = readFileSync(target, "utf8");
  let next = current;
  if (!/^ORBIT_ENCRYPTION_KEY=.+$/m.test(next)) {
    next = next.replace(/^ORBIT_ENCRYPTION_KEY=.*$/m, "") + `\nORBIT_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}\n`;
  }
  if (!/^ORBIT_SESSION_SECRET=.+$/m.test(next)) {
    next = next.replace(/^ORBIT_SESSION_SECRET=.*$/m, "") + `\nORBIT_SESSION_SECRET=${randomBytes(48).toString("base64url")}\n`;
  }
  if (next !== current) {
    writeFileSync(target, next.replace(/\n{3,}/g, "\n\n"));
    console.log("✓ Added missing secrets to existing .env.local");
  } else {
    console.log("✓ .env.local already configured — nothing to do.");
  }
  process.exit(0);
}

const out = template
  .replace(/^ORBIT_ENCRYPTION_KEY=.*$/m, `ORBIT_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`)
  .replace(/^ORBIT_SESSION_SECRET=.*$/m, `ORBIT_SESSION_SECRET=${randomBytes(48).toString("base64url")}`);

writeFileSync(target, out);
console.log("✓ Created .env.local with generated secrets (local backend).");
console.log("  Next: npm run dev  →  http://localhost:3000");
