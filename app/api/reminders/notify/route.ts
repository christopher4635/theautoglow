export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleReminderNotifyPost } from '@/lib/api-handlers/reminders';

export async function POST(request: Request) {
  return handleReminderNotifyPost(request, getNodeDb());
}
