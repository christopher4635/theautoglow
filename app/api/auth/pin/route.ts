export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleAuthPinPost, handleAuthPinPut } from '@/lib/api-handlers/auth';

export async function POST(request: Request) {
  return handleAuthPinPost(request, getNodeDb());
}

export async function PUT(request: Request) {
  return handleAuthPinPut(request, getNodeDb());
}
