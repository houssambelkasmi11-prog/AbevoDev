import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULTS } from "./defaults";
import type { ListOptions, Repo, Where } from "./repo";
import { NotFoundError } from "./repo";
import type { Insert, Patch, Row, TableName } from "@/lib/types";

/**
 * Supabase/Postgres repository. Queries execute with the user's JWT so RLS
 * policies (see supabase/migrations) are the primary guard; the explicit
 * user_id filter is defence in depth.
 */
export class SupabaseRepo implements Repo {
  constructor(
    public readonly userId: string,
    private readonly db: SupabaseClient,
  ) {}

  /**
   * The client has no generated database types, and newer postgrest-js
   * typings reject dynamic table/column names. Queries therefore go through a
   * loosely typed handle; the Repo interface above keeps callers type-safe.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private from(table: TableName): any {
    return this.db.from(table);
  }

  private normalize<T extends TableName>(table: T, row: unknown): Row<T> {
    const r = row as Record<string, unknown>;
    if (table === "source_chunks" && typeof r.embedding === "string") {
      try {
        r.embedding = JSON.parse(r.embedding);
      } catch {
        r.embedding = null;
      }
    }
    return r as unknown as Row<T>;
  }

  async list<T extends TableName>(table: T, opts: ListOptions<T> = {}): Promise<Row<T>[]> {
    let q = this.from(table).select("*").eq("user_id", this.userId);
    if (opts.where) {
      for (const [k, v] of Object.entries(opts.where)) {
        if (v === undefined) continue;
        q = v === null ? q.is(k, null) : q.eq(k, v as string | number | boolean);
      }
    }
    if (opts.whereIn) {
      if (opts.whereIn.values.length === 0) return [];
      q = q.in(opts.whereIn.column, opts.whereIn.values);
    }
    if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? true });
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw new Error(`[db] ${table}.list: ${error.message}`);
    return (data ?? []).map((r: unknown) => this.normalize(table, r));
  }

  async get<T extends TableName>(table: T, id: string): Promise<Row<T> | null> {
    const { data, error } = await this.from(table).select("*").eq("id", id).eq("user_id", this.userId).maybeSingle();
    if (error) throw new Error(`[db] ${table}.get: ${error.message}`);
    return data ? this.normalize(table, data) : null;
  }

  async insert<T extends TableName>(table: T, values: Insert<T>): Promise<Row<T>> {
    const [row] = await this.insertMany(table, [values]);
    return row;
  }

  async insertMany<T extends TableName>(table: T, values: Insert<T>[]): Promise<Row<T>[]> {
    if (values.length === 0) return [];
    const payload = values.map((v) => ({ ...DEFAULTS[table](), ...v, user_id: this.userId }));
    const { data, error } = await this.from(table).insert(payload).select("*");
    if (error) throw new Error(`[db] ${table}.insert: ${error.message}`);
    return (data ?? []).map((r: unknown) => this.normalize(table, r));
  }

  async update<T extends TableName>(table: T, id: string, patch: Patch<T>): Promise<Row<T>> {
    const { data, error } = await this.db
      .from(table)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", this.userId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`[db] ${table}.update: ${error.message}`);
    if (!data) throw new NotFoundError(table);
    return this.normalize(table, data);
  }

  async remove(table: TableName, id: string): Promise<void> {
    const { error } = await this.from(table).delete().eq("id", id).eq("user_id", this.userId);
    if (error) throw new Error(`[db] ${table}.remove: ${error.message}`);
  }

  async removeWhere<T extends TableName>(table: T, where: Where<T>): Promise<number> {
    let q = this.from(table).delete({ count: "exact" }).eq("user_id", this.userId);
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;
      q = v === null ? q.is(k, null) : q.eq(k, v as string | number | boolean);
    }
    const { error, count } = await q;
    if (error) throw new Error(`[db] ${table}.removeWhere: ${error.message}`);
    return count ?? 0;
  }

  async count<T extends TableName>(table: T, where?: Where<T>): Promise<number> {
    let q = this.from(table).select("id", { count: "exact", head: true }).eq("user_id", this.userId);
    for (const [k, v] of Object.entries(where ?? {})) {
      if (v === undefined) continue;
      q = v === null ? q.is(k, null) : q.eq(k, v as string | number | boolean);
    }
    const { count, error } = await q;
    if (error) throw new Error(`[db] ${table}.count: ${error.message}`);
    return count ?? 0;
  }

  /** pgvector similarity search (see `match_source_chunks` in the migration). */
  async matchChunks(embedding: number[], sourceIds: string[] | null, limit: number): Promise<(Row<"source_chunks"> & { similarity: number })[]> {
    const { data, error } = await this.db.rpc("match_source_chunks", {
      query_embedding: embedding,
      match_count: limit,
      filter_source_ids: sourceIds,
    });
    if (error) throw new Error(`[db] match_source_chunks: ${error.message}`);
    return (data ?? []) as (Row<"source_chunks"> & { similarity: number })[];
  }
}
