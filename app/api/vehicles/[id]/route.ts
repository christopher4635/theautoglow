export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleVehicleByIdGet, handleVehicleByIdPut, handleVehicleByIdDelete } from '@/lib/api-handlers/vehicles';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return handleVehicleByIdGet(params.id, getNodeDb());
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return handleVehicleByIdPut(request, params.id, getNodeDb());
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return handleVehicleByIdDelete(params.id, getNodeDb());
}
