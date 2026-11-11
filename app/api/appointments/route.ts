export const dynamic = 'force-dynamic';
import { getNodeDb } from '@/lib/node-db';
import { handleAppointmentsGet, handleAppointmentsPost, handleAppointmentsPut } from '@/lib/api-handlers/appointments';

export async function GET(request: Request) {
  return handleAppointmentsGet(request, getNodeDb());
}

export async function POST(request: Request) {
  return handleAppointmentsPost(request, getNodeDb());
}

export async function PUT(request: Request) {
  return handleAppointmentsPut(request, getNodeDb());
}
