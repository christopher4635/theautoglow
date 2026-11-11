export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleInventoryGet, handleInventoryPost, handleInventoryPut } from '@/lib/api-handlers/inventory';

export async function GET(request: Request) {
  return handleInventoryGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleInventoryPost(request, getNodeDb());
}

export async function PUT(request: Request) {
  return handleInventoryPut(request, getNodeDb());
}
