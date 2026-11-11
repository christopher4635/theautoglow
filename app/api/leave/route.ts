export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleLeaveGet, handleLeavePost, handleLeavePut } from '@/lib/api-handlers/leave';

export async function GET(request: Request) {
  return handleLeaveGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleLeavePost(request, getNodeDb());
}

export async function PUT(request: Request) {
  return handleLeavePut(request, getNodeDb());
}
