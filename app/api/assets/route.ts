export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleAssetsGet, handleAssetsPost, handleAssetsPut } from '@/lib/api-handlers/assets';

export async function GET(request: Request) {
  return handleAssetsGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleAssetsPost(request, getNodeDb());
}

export async function PUT(request: Request) {
  return handleAssetsPut(request, getNodeDb());
}
