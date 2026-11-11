export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleDashboardGet } from '@/lib/api-handlers/dashboard';

export async function GET(request: Request) {
  return handleDashboardGet(request, getNodeDb());
}
