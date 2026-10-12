import type { Insert, Patch, Row, TableName } from "@/lib/types";

export type Where<T extends TableName> = Partial<{ [K in keyof Row<T>]: Row<T>[K] }>;

export interface ListOptions<T extends TableName> {
  where?: Where<T>;
  /** Restrict a column to a set of values (SQL `IN`). */
  whereIn?: { column: keyof Row<T> & string; values: string[] };
  order?: { column: keyof Row<T> & string; ascending?: boolean };
  limit?: number;
}

/**
 * Type-safe, user-scoped data access. Every implementation MUST constrain
 * reads and writes to the owning user — callers never pass user ids.
 */
export interface Repo {
  readonly userId: string;
  list<T extends TableName>(table: T, opts?: ListOptions<T>): Promise<Row<T>[]>;
  get<T extends TableName>(table: T, id: string): Promise<Row<T> | null>;
  insert<T extends TableName>(table: T, values: Insert<T>): Promise<Row<T>>;
  insertMany<T extends TableName>(table: T, values: Insert<T>[]): Promise<Row<T>[]>;
  update<T extends TableName>(table: T, id: string, patch: Patch<T>): Promise<Row<T>>;
  remove(table: TableName, id: string): Promise<void>;
  removeWhere<T extends TableName>(table: T, where: Where<T>): Promise<number>;
  count<T extends TableName>(table: T, where?: Where<T>): Promise<number>;
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}
