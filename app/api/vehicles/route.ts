export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleVehiclesGet, handleVehiclesPost } from '@/lib/api-handlers/vehicles';

export async function GET(request: Request) {
  return handleVehiclesGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleVehiclesPost(request, getNodeDb());
}
