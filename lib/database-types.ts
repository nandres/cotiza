export type DatabaseValue = string | number | boolean | null;

export type DatabaseResult<T = Record<string, unknown>> = {
  success: true;
  results: T[];
  meta: { changes: number };
};

export interface PreparedStatement {
  readonly query: string;
  readonly values: readonly DatabaseValue[];
  bind(...values: DatabaseValue[]): PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<DatabaseResult<T>>;
  run<T = Record<string, unknown>>(): Promise<DatabaseResult<T>>;
}

/** A request-scoped database, used only inside withDatabaseTransaction(). */
export interface Database {
  prepare(query: string): PreparedStatement;
  batch<T = Record<string, unknown>>(statements: PreparedStatement[]): Promise<DatabaseResult<T>[]>;
}
