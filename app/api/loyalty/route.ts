export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleLoyaltyGet, handleLoyaltyPost } from '@/lib/api-handlers/loyalty';

export async function GET() {
  return handleLoyaltyGet(getNodeDb());
}

export async function POST(request: Request) {
  return handleLoyaltyPost(request, getNodeDb());
}
