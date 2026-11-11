import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleAuditLogsGet(db: DbClient): Promise<Response> {
  try {
    const logs = await db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    return jsonResponse(logs);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
