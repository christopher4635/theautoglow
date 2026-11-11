export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleJobCardInspectionPost } from '@/lib/api-handlers/jobcards';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handleJobCardInspectionPost(request, params.id, getNodeDb());
}
