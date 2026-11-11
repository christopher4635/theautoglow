export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handlePurchasesGet, handlePurchasesPost } from '@/lib/api-handlers/purchases';

export async function GET(request: Request) {
  return handlePurchasesGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handlePurchasesPost(request, getNodeDb());
}
