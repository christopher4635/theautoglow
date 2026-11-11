export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleWarrantiesGet, handleWarrantiesPost } from '@/lib/api-handlers/warranties';

export async function GET(request: Request) {
  return handleWarrantiesGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleWarrantiesPost(request, getNodeDb());
}
