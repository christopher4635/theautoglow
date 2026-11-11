export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleInventoryTransactionPost } from '@/lib/api-handlers/inventory';

export async function POST(request: Request) {
  return handleInventoryTransactionPost(request, getNodeDb());
}
