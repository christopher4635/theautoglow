export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import {
  handleCustomerByIdGet,
  handleCustomerByIdPut,
  handleCustomerByIdDelete,
} from '@/lib/api-handlers/customers';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return handleCustomerByIdGet(params.id, getNodeDb());
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return handleCustomerByIdPut(request, params.id, getNodeDb());
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return handleCustomerByIdDelete(params.id, getNodeDb());
}
