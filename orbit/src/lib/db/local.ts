import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULTS } from "./defaults";
import type { ListOptions, Repo, Where } from "./repo";
import { NotFoundError } from "./repo";
import type { BaseRow, Insert, Patch, Row, TableName } from "@/lib/types";

/**
 * Local backend: one JSON file per table under ./.orbit-data/tables.
 * Designed for single-machine development and personal use. Writes are
 * debounced and atomic (write to temp file, then rename).
 */

export const DATA_DIR = path.join(process.cwd(), ".orbit-data");
const TABLE_DIR = path.join(DATA_DIR, "tables");

interface LocalState {
  cache: Map<string, BaseRow[]>;
  loading: Map<string, Promise<BaseRow[]>>;
  dirty: Set<string>;
  timer: ReturnType<typeof setTimeout> | null;
  flushing: Promise<void>;
}

const g = globalThis as typeof globalThis & { __orbitLocal?: LocalState };
const state: LocalState =
  g.__orbitLocal ??
  (g.__orbitLocal = {
    cache: new Map(),
    loading: new Map(),
    dirty: new Set(),
    timer: null,
    flushing: Promise.resolve(),
  });

async function loadTable(table: string): Promise<BaseRow[]> {
  const cached = state.cache.get(table);
  if (cached) return cached;
  const pending = state.loading.get(table);
  if (pending) return pending;
  const p = (async () => {
    try {
      const raw = await fs.readFile(path.join(TABLE_DIR, `${table}.json`), "utf8");
      const rows = JSON.parse(raw) as BaseRow[];
      state.cache.set(table, rows);
      return rows;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      const rows: BaseRow[] = [];
      state.cache.set(table, rows);
      return rows;
    } finally {
      state.loading.delete(table);
    }
  })();
  state.loading.set(table, p);
  return p;
}

async function writeAtomic(file: string, data: string): Promise<void> {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, data, "utf8");
  try {
    await fs.rename(tmp, file);
  } catch {
    // Windows can briefly lock the target (antivirus / indexer). Fall back.
    await fs.writeFile(file, data, "utf8");
    await fs.rm(tmp, { force: true });
  }
}

function scheduleFlush(table: string): void {
  state.dirty.add(table);
  if (state.timer) return;
  state.timer = setTimeout(() => {
    state.timer = null;
    const tables = [...state.dirty];
    state.dirty.clear();
    state.flushing = state.flushing.then(async () => {
      await fs.mkdir(TABLE_DIR, { recursive: true });
      for (const t of tables) {
        const rows = state.cache.get(t) ?? [];
        await writeAtomic(path.join(TABLE_DIR, `${t}.json`), JSON.stringify(rows));
      }
    });
  }, 120);
}

function matches<T extends TableName>(row: Row<T>, where?: Where<T>): boolean {
  if (!where) return true;
  for (const key of Object.keys(where) as (keyof Row<T>)[]) {
    const expected = where[key];
    if (expected === undefined) continue;
    const actual = row[key];
    if ((actual ?? null) !== (expected ?? null)) return false;
  }
  return true;
}

export class LocalRepo implements Repo {
  constructor(public readonly userId: string) {}

  private async rows<T extends TableName>(table: T): Promise<Row<T>[]> {
    return (await loadTable(table)) as Row<T>[];
  }

  async list<T extends TableName>(table: T, opts: ListOptions<T> = {}): Promise<Row<T>[]> {
    const all = await this.rows(table);
    let out = all.filter((r) => r.user_id === this.userId && matches(r, opts.where));
    if (opts.whereIn) {
      const set = new Set(opts.whereIn.values);
      const col = opts.whereIn.column;
      out = out.filter((r) => set.has(String(r[col])));
    }
    if (opts.order) {
      const { column, ascending = true } = opts.order;
      out = [...out].sort((a, b) => {
        const av = a[column] as unknown as string | number | null;
        const bv = b[column] as unknown as string | number | null;
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
      });
    }
    if (opts.limit) out = out.slice(0, opts.limit);
    return out.map((r) => structuredClone(r));
  }

  async get<T extends TableName>(table: T, id: string): Promise<Row<T> | null> {
    const all = await this.rows(table);
    const row = all.find((r) => r.id === id && r.user_id === this.userId);
    return row ? structuredClone(row) : null;
  }

  async insert<T extends TableName>(table: T, values: Insert<T>): Promise<Row<T>> {
    const [row] = await this.insertMany(table, [values]);
    return row;
  }

  async insertMany<T extends TableName>(table: T, values: Insert<T>[]): Promise<Row<T>[]> {
    const all = await this.rows(table);
    const ts = new Date().toISOString();
    const created = values.map((v) => {
      const base = DEFAULTS[table]() as Omit<Row<T>, "id" | "user_id" | "created_at" | "updated_at">;
      const row = {
        ...base,
        ...stripUndefined(v),
        id: v.id ?? crypto.randomUUID(),
        user_id: this.userId,
        created_at: ts,
        updated_at: ts,
      } as unknown as Row<T>;
      return row;
    });
    all.push(...created);
    scheduleFlush(table);
    return created.map((r) => structuredClone(r));
  }

  async update<T extends TableName>(table: T, id: string, patch: Patch<T>): Promise<Row<T>> {
    const all = await this.rows(table);
    const idx = all.findIndex((r) => r.id === id && r.user_id === this.userId);
    if (idx === -1) throw new NotFoundError(table);
    const next = {
      ...all[idx],
      ...stripUndefined(patch),
      id: all[idx].id,
      user_id: this.userId,
      updated_at: new Date().toISOString(),
    } as unknown as Row<T>;
    all[idx] = next;
    scheduleFlush(table);
    return structuredClone(next);
  }

  async remove(table: TableName, id: string): Promise<void> {
    const all = await loadTable(table);
    const idx = all.findIndex((r) => r.id === id && r.user_id === this.userId);
    if (idx !== -1) {
      all.splice(idx, 1);
      scheduleFlush(table);
    }
  }

  async removeWhere<T extends TableName>(table: T, where: Where<T>): Promise<number> {
    const all = await this.rows(table);
    let removed = 0;
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i].user_id === this.userId && matches(all[i], where)) {
        all.splice(i, 1);
        removed++;
      }
    }
    if (removed) scheduleFlush(table);
    return removed;
  }

  async count<T extends TableName>(table: T, where?: Where<T>): Promise<number> {
    const all = await this.rows(table);
    return all.filter((r) => r.user_id === this.userId && matches(r, where)).length;
  }
}

function stripUndefined<O extends object>(o: O): Partial<O> {
  const out: Partial<O> = {};
  for (const k of Object.keys(o) as (keyof O)[]) {
    if (o[k] !== undefined) out[k] = o[k];
  }
  return out;
}

/** Removes every row owned by a user across all tables (account deletion). */
export async function purgeLocalUser(userId: string, tables: TableName[]): Promise<void> {
  for (const t of tables) {
    const all = await loadTable(t);
    const before = all.length;
    for (let i = all.length - 1; i >= 0; i--) if (all[i].user_id === userId) all.splice(i, 1);
    if (all.length !== before) scheduleFlush(t);
  }
}
