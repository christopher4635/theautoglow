export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleExpensesGet, handleExpensesPost } from '@/lib/api-handlers/expenses';

export async function GET(request: Request) {
  return handleExpensesGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleExpensesPost(request, getNodeDb());
}
