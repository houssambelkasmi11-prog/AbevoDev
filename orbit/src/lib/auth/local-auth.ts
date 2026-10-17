import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { DATA_DIR } from "@/lib/db/local";
import { env } from "@/lib/env";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

interface LocalUser {
  id: string;
  email: string;
  name: string | null;
  password_hash: string; // base64
  salt: string; // base64
  recovery_hash: string;
  recovery_salt: string;
  created_at: string;
  /** Age band + Terms/Privacy acceptance recorded at sign-up. */
  consent?: Record<string, unknown>;
}

export interface LocalSession {
  id: string;
  user_id: string;
  created_at: string;
  last_seen_at: string;
  user_agent: string | null;
}

interface AuthFile {
  users: LocalUser[];
  sessions: LocalSession[];
}

const AUTH_FILE = path.join(DATA_DIR, "auth.json");
const SECRET_FILE = path.join(DATA_DIR, "session-secret");
export const SESSION_COOKIE = "orbit_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const g = globalThis as typeof globalThis & { __orbitAuth?: { data: AuthFile | null; lock: Promise<unknown>; secret: string | null } };
const state = g.__orbitAuth ?? (g.__orbitAuth = { data: null, lock: Promise.resolve(), secret: null });

async function load(): Promise<AuthFile> {
  if (state.data) return state.data;
  try {
    state.data = JSON.parse(await fs.readFile(AUTH_FILE, "utf8")) as AuthFile;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    state.data = { users: [], sessions: [] };
  }
  return state.data;
}

async function save(): Promise<void> {
  if (!state.data) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${AUTH_FILE}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state.data, null, 2), { encoding: "utf8", mode: 0o600 });
  try {
    await fs.rename(tmp, AUTH_FILE);
  } catch {
    await fs.writeFile(AUTH_FILE, JSON.stringify(state.data, null, 2), "utf8");
    await fs.rm(tmp, { force: true });
  }
}

/** Serialises mutations so concurrent requests never clobber the file. */
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = state.lock.then(fn, fn);
  state.lock = run.catch(() => undefined);
  return run;
}

async function sessionSecret(): Promise<string> {
  const fromEnv = env.sessionSecret;
  if (fromEnv) return fromEnv;
  if (state.secret) return state.secret;
  try {
    state.secret = (await fs.readFile(SECRET_FILE, "utf8")).trim();
  } catch {
    state.secret = randomBytes(48).toString("base64url");
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(SECRET_FILE, state.secret, { encoding: "utf8", mode: 0o600 });
  }
  return state.secret;
}

async function hash(secret: string, salt?: Buffer): Promise<{ hash: string; salt: string }> {
  const s = salt ?? randomBytes(16);
  const h = await scrypt(secret, s, 64);
  return { hash: h.toString("base64"), salt: s.toString("base64") };
}

async function verify(secret: string, hashB64: string, saltB64: string): Promise<boolean> {
  const { hash: candidate } = await hash(secret, Buffer.from(saltB64, "base64"));
  const a = Buffer.from(candidate, "base64");
  const b = Buffer.from(hashB64, "base64");
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function recoveryCode(): string {
  const raw = randomBytes(10).toString("hex").toUpperCase();
  return raw.match(/.{1,5}/g)?.join("-") ?? raw;
}

export async function localSignUp(email: string, password: string, name: string | null, consent?: Record<string, unknown>): Promise<{ userId: string; recovery: string }> {
  return withLock(async () => {
    const data = await load();
    const e = normalizeEmail(email);
    if (data.users.some((u) => u.email === e)) throw new Error("An account with this email already exists.");
    const pw = await hash(password);
    const recovery = recoveryCode();
    const rc = await hash(recovery);
    const user: LocalUser = {
      id: crypto.randomUUID(),
      email: e,
      name,
      password_hash: pw.hash,
      salt: pw.salt,
      recovery_hash: rc.hash,
      recovery_salt: rc.salt,
      created_at: new Date().toISOString(),
      consent,
    };
    data.users.push(user);
    await save();
    return { userId: user.id, recovery };
  });
}

export async function localSignIn(email: string, password: string): Promise<string> {
  const data = await load();
  const user = data.users.find((u) => u.email === normalizeEmail(email));
  // Always run a hash to keep timing uniform.
  const ok = user ? await verify(password, user.password_hash, user.salt) : (await hash(password), false);
  if (!user || !ok) throw new Error("Email or password is incorrect.");
  return user.id;
}

export async function localResetWithRecovery(email: string, code: string, newPassword: string): Promise<string> {
  return withLock(async () => {
    const data = await load();
    const user = data.users.find((u) => u.email === normalizeEmail(email));
    const ok = user ? await verify(code.trim().toUpperCase(), user.recovery_hash, user.recovery_salt) : false;
    if (!user || !ok) throw new Error("That recovery code doesn't match this account.");
    const pw = await hash(newPassword);
    user.password_hash = pw.hash;
    user.salt = pw.salt;
    const recovery = recoveryCode();
    const rc = await hash(recovery);
    user.recovery_hash = rc.hash;
    user.recovery_salt = rc.salt;
    data.sessions = data.sessions.filter((s) => s.user_id !== user.id);
    await save();
    return recovery;
  });
}

export async function localChangePassword(userId: string, current: string, next: string): Promise<void> {
  return withLock(async () => {
    const data = await load();
    const user = data.users.find((u) => u.id === userId);
    if (!user || !(await verify(current, user.password_hash, user.salt))) throw new Error("Current password is incorrect.");
    const pw = await hash(next);
    user.password_hash = pw.hash;
    user.salt = pw.salt;
    await save();
  });
}

export async function createSession(userId: string, userAgent: string | null): Promise<string> {
  return withLock(async () => {
    const data = await load();
    const id = randomBytes(24).toString("base64url");
    const ts = new Date().toISOString();
    data.sessions.push({ id, user_id: userId, created_at: ts, last_seen_at: ts, user_agent: userAgent?.slice(0, 200) ?? null });
    await save();
    const sig = createHmac("sha256", await sessionSecret()).update(id).digest("base64url");
    return `${id}.${sig}`;
  });
}

export async function resolveSession(token: string | undefined): Promise<{ user: { id: string; email: string; name: string | null }; session: LocalSession } | null> {
  if (!token) return null;
  const [id, sig] = token.split(".");
  if (!id || !sig) return null;
  const expected = createHmac("sha256", await sessionSecret()).update(id).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const data = await load();
  const session = data.sessions.find((s) => s.id === id);
  if (!session) return null;
  if (Date.now() - new Date(session.created_at).getTime() > SESSION_MAX_AGE * 1000) return null;
  const user = data.users.find((u) => u.id === session.user_id);
  if (!user) return null;
  return { user: { id: user.id, email: user.email, name: user.name }, session };
}

export async function listSessions(userId: string): Promise<LocalSession[]> {
  const data = await load();
  return data.sessions.filter((s) => s.user_id === userId).map((s) => ({ ...s }));
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  await withLock(async () => {
    const data = await load();
    data.sessions = data.sessions.filter((s) => !(s.user_id === userId && s.id === sessionId));
    await save();
  });
}

export async function revokeOtherSessions(userId: string, keepId: string): Promise<void> {
  await withLock(async () => {
    const data = await load();
    data.sessions = data.sessions.filter((s) => s.user_id !== userId || s.id === keepId);
    await save();
  });
}

export async function updateLocalProfile(userId: string, name: string | null): Promise<void> {
  await withLock(async () => {
    const data = await load();
    const u = data.users.find((x) => x.id === userId);
    if (u) u.name = name;
    await save();
  });
}

export async function deleteLocalUser(userId: string): Promise<void> {
  await withLock(async () => {
    const data = await load();
    data.users = data.users.filter((u) => u.id !== userId);
    data.sessions = data.sessions.filter((s) => s.user_id !== userId);
    await save();
  });
}
