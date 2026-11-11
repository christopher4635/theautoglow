export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleCustomersGet, handleCustomersPost } from '@/lib/api-handlers/customers';

export async function GET(request: Request) {
  return handleCustomersGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleCustomersPost(request, getNodeDb());
}
