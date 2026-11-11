export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleNotificationsGet, handleNotificationsPut } from '@/lib/api-handlers/notifications';

export async function GET() {
  return handleNotificationsGet(getNodeDb());
}

export async function PUT(request: Request) {
  return handleNotificationsPut(request, getNodeDb());
}
