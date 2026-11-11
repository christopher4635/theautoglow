export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleJobCardsGet, handleJobCardsPost } from '@/lib/api-handlers/jobcards';

export async function GET(request: Request) {
  return handleJobCardsGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleJobCardsPost(request, getNodeDb());
}
