export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleAuditLogsGet } from '@/lib/api-handlers/audit-logs';

export async function GET() {
  return handleAuditLogsGet(getNodeDb());
}
