export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleContactGet, handleContactPost } from '@/lib/api-handlers/contact';

export async function GET() {
  return handleContactGet(getNodeDb());
}

export async function POST(request: Request) {
  return handleContactPost(request, getNodeDb());
}
