export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleRemindersGet, handleRemindersPost, handleRemindersPut } from '@/lib/api-handlers/reminders';

export async function GET(request: Request) {
  return handleRemindersGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleRemindersPost(request, getNodeDb());
}

export async function PUT(request: Request) {
  return handleRemindersPut(request, getNodeDb());
}
