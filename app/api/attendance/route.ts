export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleAttendanceGet, handleAttendancePost } from '@/lib/api-handlers/attendance';

export async function GET(request: Request) {
  return handleAttendanceGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleAttendancePost(request, getNodeDb());
}
