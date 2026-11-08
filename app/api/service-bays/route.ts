export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const bays = db.prepare(`
      SELECT b.*,
        j.job_card_number,
        v.reg_number as vehicle_reg,
        v.make || ' ' || v.model as vehicle_make_model,
        c.name as customer_name
      FROM service_bays b
      LEFT JOIN job_cards j ON b.current_job_id = j.id
      LEFT JOIN vehicles v ON j.vehicle_id = v.id
      LEFT JOIN customers c ON j.customer_id = c.id
      ORDER BY b.name ASC
    `).all();

    return NextResponse.json(bays);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, current_status, current_job_id, current_vehicle_reg } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bay ID is required' }, { status: 400 });
    }

    db.prepare(`
      UPDATE service_bays
      SET current_status = COALESCE(?, current_status),
          current_job_id = ?,
          current_vehicle_reg = ?
      WHERE id = ?
    `).run(current_status, current_job_id || null, current_vehicle_reg || null, id);

    const updated = db.prepare('SELECT * FROM service_bays WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
