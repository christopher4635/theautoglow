export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleSettingsGet, handleSettingsPost } from '@/lib/api-handlers/settings';

export async function GET() {
  return handleSettingsGet(getNodeDb());
}

export async function POST(request: Request) {
  return handleSettingsPost(request, getNodeDb());
}
