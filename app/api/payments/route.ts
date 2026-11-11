export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handlePaymentsGet, handlePaymentsPost } from '@/lib/api-handlers/payments';

export async function GET(request: Request) {
  return handlePaymentsGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handlePaymentsPost(request, getNodeDb());
}
