export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleEmployeesGet, handleEmployeesPost } from '@/lib/api-handlers/employees';

export async function GET(request: Request) {
  return handleEmployeesGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleEmployeesPost(request, getNodeDb());
}
