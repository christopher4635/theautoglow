export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleJobCardConsumePost } from '@/lib/api-handlers/jobcards';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handleJobCardConsumePost(request, params.id, getNodeDb());
}
