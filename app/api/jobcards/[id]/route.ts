export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const jobCard = db.prepare(`
      SELECT j.*,
             c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email, c.customer_code, c.address as customer_address,
             v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, v.color as vehicle_color,
             v.category as vehicle_category, v.year as vehicle_year, v.fuel_type as vehicle_fuel,
             b.name as bay_name,
             e.name as primary_staff_name
      FROM job_cards j
      JOIN customers c ON j.customer_id = c.id
      JOIN vehicles v ON j.vehicle_id = v.id
      LEFT JOIN service_bays b ON j.bay_id = b.id
      LEFT JOIN employees e ON j.primary_staff_id = e.id
      WHERE j.id = ?
    `).get(id);

    if (!jobCard) {
      return NextResponse.json({ error: 'Job Card not found' }, { status: 404 });
    }

    // Services
    const services = db.prepare(`SELECT * FROM job_card_services WHERE job_card_id = ?`).all(id);

    // Assigned Technicians
    const assignments = db.prepare(`
      SELECT ja.*, e.name as employee_name, e.designation as employee_designation
      FROM job_assignments ja
      JOIN employees e ON ja.employee_id = e.id
      WHERE ja.job_card_id = ?
    `).all(id);

    // Inspections
    const inspections = db.prepare(`SELECT * FROM vehicle_inspections WHERE job_card_id = ? ORDER BY created_at ASC`).all(id).map((insp: any) => ({
      ...insp,
      scratches: insp.scratches_json ? JSON.parse(insp.scratches_json) : [],
      dents: insp.dents_json ? JSON.parse(insp.dents_json) : [],
      accessories_checked: insp.accessories_checked_json ? JSON.parse(insp.accessories_checked_json) : [],
      photos: insp.photos_json ? JSON.parse(insp.photos_json) : [],
    }));

    // Stock Consumptions & Material Cost
    const consumables = db.prepare(`
      SELECT sc.*, p.name as product_name, p.sku, p.unit
      FROM stock_consumptions sc
      JOIN inventory_products p ON sc.product_id = p.id
      WHERE sc.job_card_id = ?
    `).all(id);

    const totalConsumableCost = (
      db.prepare(`SELECT COALESCE(SUM(total_cost), 0) as total FROM stock_consumptions WHERE job_card_id = ?`).get(id) as { total: number }
    ).total;

    // Invoice
    const invoice = db.prepare(`SELECT * FROM invoices WHERE job_card_id = ?`).get(id);

    return NextResponse.json({
      jobCard,
      services,
      assignments,
      inspections,
      consumables,
      totalConsumableCost,
      invoice,
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
    const { status, work_notes, remarks, primary_staff_id, bay_id, actual_completion } = body;

    const existing = db.prepare('SELECT * FROM job_cards WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Job Card not found' }, { status: 404 });
    }

    let actualCompletionVal = existing.actual_completion;
    if (status === 'Completed' || status === 'Delivered') {
      actualCompletionVal = actual_completion || new Date().toISOString().replace('T', ' ').substring(0, 16);
    }

    db.prepare(`
      UPDATE job_cards
      SET status = COALESCE(?, status),
          work_notes = COALESCE(?, work_notes),
          remarks = COALESCE(?, remarks),
          primary_staff_id = COALESCE(?, primary_staff_id),
          bay_id = COALESCE(?, bay_id),
          actual_completion = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(status, work_notes, remarks, primary_staff_id, bay_id, actualCompletionVal, id);

    // If delivered or cancelled, free the service bay
    if ((status === 'Delivered' || status === 'Cancelled') && existing.bay_id) {
      db.prepare(`
        UPDATE service_bays
        SET current_status = 'Available', current_job_id = NULL, current_vehicle_reg = NULL
        WHERE id = ?
      `).run(existing.bay_id);
    }

    // If bay changed, free old bay and assign new
    if (bay_id && bay_id !== existing.bay_id) {
      if (existing.bay_id) {
        db.prepare(`
          UPDATE service_bays
          SET current_status = 'Available', current_job_id = NULL, current_vehicle_reg = NULL
          WHERE id = ?
        `).run(existing.bay_id);
      }
      const veh = db.prepare('SELECT reg_number FROM vehicles WHERE id = ?').get(existing.vehicle_id) as any;
      db.prepare(`
        UPDATE service_bays
        SET current_status = 'Occupied', current_job_id = ?, current_vehicle_reg = ?
        WHERE id = ?
      `).run(id, veh?.reg_number || 'Vehicle', bay_id);
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
      VALUES (?, 'Admin', 'JOB_CARD_STATUS_UPDATE', 'job_card', ?, ?)
    `).run(`aud-${Date.now()}`, id, JSON.stringify({ old_status: existing.status, new_status: status }));

    const updated = db.prepare('SELECT * FROM job_cards WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
