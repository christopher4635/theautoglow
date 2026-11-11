export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleAssetMaintenancePost } from '@/lib/api-handlers/assets';

export async function POST(request: Request) {
  return handleAssetMaintenancePost(request, getNodeDb());
}
