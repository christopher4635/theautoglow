export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleWarrantyClaimPost } from '@/lib/api-handlers/warranties';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handleWarrantyClaimPost(request, params.id, getNodeDb());
}
