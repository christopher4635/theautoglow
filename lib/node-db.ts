import { db } from './db';
import { DbClient } from './async-db';

function sanitizeParams(params: any[]): any[] {
  return params.map((p) => (p === undefined ? null : p));
}

const nodeDbClient: DbClient = {
  async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    return db.prepare(sql).all(...sanitizeParams(params)) as T[];
  },
  async get<T = any>(sql: string, ...params: any[]): Promise<T | null> {
    const row = db.prepare(sql).get(...sanitizeParams(params)) as T | undefined;
    return row ?? null;
  },
  async run(sql: string, ...params: any[]): Promise<{ changes: number }> {
    const info = db.prepare(sql).run(...sanitizeParams(params));
    return { changes: info.changes };
  },
};

export function getNodeDb(): DbClient {
  return nodeDbClient;
}
