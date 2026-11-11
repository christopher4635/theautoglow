export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleCommunicationsGet, handleCommunicationsPost } from '@/lib/api-handlers/communications';

export async function GET(request: Request) {
  return handleCommunicationsGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleCommunicationsPost(request, getNodeDb());
}
