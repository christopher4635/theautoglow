export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleSuppliersGet, handleSuppliersPost } from '@/lib/api-handlers/suppliers';

export async function GET() {
  return handleSuppliersGet(getNodeDb());
}

export async function POST(request: Request) {
  return handleSuppliersPost(request, getNodeDb());
}
