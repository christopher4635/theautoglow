export interface DbClient {
  all<T = any>(sql: string, ...params: any[]): Promise<T[]>;
  get<T = any>(sql: string, ...params: any[]): Promise<T | null>;
  run(sql: string, ...params: any[]): Promise<{ changes: number }>;
}

export interface D1PreparedStatementLike {
  bind(...values: any[]): D1PreparedStatementLike;
  all<T = any>(): Promise<{ results?: T[]; success: boolean }>;
  first<T = any>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number }; success: boolean }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

function sanitizeParams(params: any[]): any[] {
  return params.map((p) => (p === undefined ? null : p));
}

export function wrapD1(d1: D1DatabaseLike): DbClient {
  return {
    async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
      const clean = sanitizeParams(params);
      const stmt = clean.length > 0 ? d1.prepare(sql).bind(...clean) : d1.prepare(sql);
      const res = await stmt.all<T>();
      return (res.results || []) as T[];
    },
    async get<T = any>(sql: string, ...params: any[]): Promise<T | null> {
      const clean = sanitizeParams(params);
      const stmt = clean.length > 0 ? d1.prepare(sql).bind(...clean) : d1.prepare(sql);
      const row = await stmt.first<T>();
      return row ?? null;
    },
    async run(sql: string, ...params: any[]): Promise<{ changes: number }> {
      const clean = sanitizeParams(params);
      const stmt = clean.length > 0 ? d1.prepare(sql).bind(...clean) : d1.prepare(sql);
      const res = await stmt.run();
      return { changes: res.meta?.changes ?? 0 };
    },
  };
}
