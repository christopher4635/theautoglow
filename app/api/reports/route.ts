export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleReportsGet } from '@/lib/api-handlers/reports';

export async function GET(request: Request) {
  return handleReportsGet(request, getNodeDb());
}
