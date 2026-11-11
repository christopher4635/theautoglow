export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleJobCardByIdGet, handleJobCardByIdPut } from '@/lib/api-handlers/jobcards';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return handleJobCardByIdGet(params.id, getNodeDb());
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return handleJobCardByIdPut(request, params.id, getNodeDb());
}
