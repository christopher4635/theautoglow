export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const vehicle = db.prepare(`
      SELECT v.*, c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email, c.customer_code
      FROM vehicles v
      JOIN customers c ON v.customer_id = c.id
      WHERE v.id = ?
    `).get(id);

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Full service history (Job Cards)
    const jobCards = db.prepare(`
      SELECT j.*, b.name as bay_name, e.name as primary_staff_name
      FROM job_cards j
      LEFT JOIN service_bays b ON j.bay_id = b.id
      LEFT JOIN employees e ON j.primary_staff_id = e.id
      WHERE j.vehicle_id = ?
      ORDER BY j.created_at DESC
    `).all(id);

    // Invoices on this vehicle
    const invoices = db.prepare(`
      SELECT i.*
      FROM invoices i
      WHERE i.vehicle_id = ?
      ORDER BY i.created_at DESC
    `).all(id);

    // Warranties on this vehicle
    const warranties = db.prepare(`
      SELECT w.*
      FROM warranties w
      WHERE w.vehicle_id = ?
      ORDER BY w.end_date DESC
    `).all(id);

    // Inspections
    const inspections = db.prepare(`
      SELECT insp.*, j.job_card_number
      FROM vehicle_inspections insp
      JOIN job_cards j ON insp.job_card_id = j.id
      WHERE j.vehicle_id = ?
      ORDER BY insp.created_at DESC
    `).all(id);

    // Reminders
    const reminders = db.prepare(`
      SELECT r.*
      FROM service_reminders r
      WHERE r.vehicle_id = ?
      ORDER BY r.next_due_date ASC
    `).all(id);

    return NextResponse.json({
      vehicle,
      jobCards,
      invoices,
      warranties,
      inspections,
      reminders,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { make, model, variant, category, color, fuel_type, year, remarks, odometer } = body;

    db.prepare(`
      UPDATE vehicles
      SET make = COALESCE(?, make),
          model = COALESCE(?, model),
          variant = COALESCE(?, variant),
          category = COALESCE(?, category),
          color = COALESCE(?, color),
          fuel_type = COALESCE(?, fuel_type),
          year = COALESCE(?, year),
          remarks = COALESCE(?, remarks),
          odometer = COALESCE(?, odometer),
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(make, model, variant, category, color, fuel_type, year, remarks, odometer, id);

    const updated = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const count = db.prepare('SELECT COUNT(*) as count FROM job_cards WHERE vehicle_id = ?').get(id) as { count: number };
    if (count.count > 0) {
      return NextResponse.json({ error: 'Cannot delete vehicle with historical service job cards.' }, { status: 400 });
    }

    db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
