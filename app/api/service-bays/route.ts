export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleServiceBaysGet, handleServiceBaysPut } from '@/lib/api-handlers/service-bays';

export async function GET() {
  return handleServiceBaysGet(getNodeDb());
}

export async function PUT(request: Request) {
  return handleServiceBaysPut(request, getNodeDb());
}
