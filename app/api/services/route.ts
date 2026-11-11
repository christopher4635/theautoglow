export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleServicesGet, handleServicesPost, handleServicesPut } from '@/lib/api-handlers/services';

export async function GET(request: Request) {
  return handleServicesGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleServicesPost(request, getNodeDb());
}

export async function PUT(request: Request) {
  return handleServicesPut(request, getNodeDb());
}
