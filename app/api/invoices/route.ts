export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleInvoicesGet, handleInvoicesPost } from '@/lib/api-handlers/invoices';

export async function GET(request: Request) {
  return handleInvoicesGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleInvoicesPost(request, getNodeDb());
}
