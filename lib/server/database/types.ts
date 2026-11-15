import type { SQL } from "drizzle-orm";
export type Row = Record<string, unknown>;
export type QueryResult = { rows: Row[]; rowCount: number | null };
export interface Connection {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
  execScript(source: string): Promise<void>;
  release(): void;
}
export interface DataPool {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
  connect(): Promise<Connection>;
  end(): Promise<void>;
}
export interface Transaction {
  execute(query: SQL): Promise<QueryResult>;
}
export interface DataStore extends Transaction {
  transaction<T>(action: (tx: Transaction) => Promise<T>): Promise<T>;
}
