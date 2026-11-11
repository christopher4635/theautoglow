export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleInvoiceByIdGet, handleInvoiceByIdDelete } from '@/lib/api-handlers/invoices';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return handleInvoiceByIdGet(params.id, getNodeDb());
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return handleInvoiceByIdDelete(params.id, getNodeDb());
}
