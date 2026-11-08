export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const customerId = searchParams.get('customer_id');
    const vehicleId = searchParams.get('vehicle_id');

    let query = `
      SELECT j.*,
             c.name as customer_name, c.mobile as customer_mobile,
             v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, v.color as vehicle_color,
             b.name as bay_name,
             e.name as primary_staff_name,
             i.id as invoice_id, i.invoice_number, i.total_amount as invoice_total, i.balance_amount as invoice_balance, i.payment_status as invoice_payment_status
      FROM job_cards j
      JOIN customers c ON j.customer_id = c.id
      JOIN vehicles v ON j.vehicle_id = v.id
      LEFT JOIN service_bays b ON j.bay_id = b.id
      LEFT JOIN employees e ON j.primary_staff_id = e.id
      LEFT JOIN invoices i ON i.job_card_id = j.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND j.status = ?`;
      params.push(status);
    }

    if (customerId) {
      query += ` AND j.customer_id = ?`;
      params.push(customerId);
    }

    if (vehicleId) {
      query += ` AND j.vehicle_id = ?`;
      params.push(vehicleId);
    }

    if (search) {
      query += ` AND (j.job_card_number LIKE ? OR v.reg_number LIKE ? OR c.name LIKE ? OR c.mobile LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY j.created_at DESC`;

    const jobCards = db.prepare(query).all(...params);

    // Fetch services for each job card
    const srvStmt = db.prepare(`SELECT * FROM job_card_services WHERE job_card_id = ?`);
    const result = jobCards.map((jc: any) => ({
      ...jc,
      services: srvStmt.all(jc.id),
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customer_id,
      vehicle_id,
      appointment_id,
      bay_id,
      primary_staff_id,
      odometer_in,
      fuel_level,
      remarks,
      estimated_completion,
      service_items, // Array of { service_id, service_name, price }
      assigned_employee_ids, // Array of { employee_id, role }
      intake_inspection, // { scratches, dents, paint_condition, interior_condition, wheel_condition, glass_condition, accessories_checked, customer_signature }
    } = body;

    if (!customer_id || !vehicle_id) {
      return NextResponse.json({ error: 'Customer and Vehicle are required.' }, { status: 400 });
    }

    // Auto-generate Job Card Number
    const countRow = db.prepare('SELECT COUNT(*) as count FROM job_cards').get() as { count: number };
    const job_card_number = `JC-AGS-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `jc-${Date.now()}`;

    // Insert Job Card
    db.prepare(`
      INSERT INTO job_cards (
        id, job_card_number, customer_id, vehicle_id, appointment_id, bay_id,
        primary_staff_id, status, odometer_in, fuel_level, remarks,
        estimated_completion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Vehicle Received', ?, ?, ?, ?)
    `).run(
      id,
      job_card_number,
      customer_id,
      vehicle_id,
      appointment_id || null,
      bay_id || null,
      primary_staff_id || null,
      odometer_in ? parseInt(odometer_in, 10) : 0,
      fuel_level || '1/2',
      remarks?.trim() || null,
      estimated_completion || null
    );

    // Update vehicle odometer if provided
    if (odometer_in) {
      db.prepare('UPDATE vehicles SET odometer = ? WHERE id = ?').run(parseInt(odometer_in, 10), vehicle_id);
    }

    // Insert Services
    if (Array.isArray(service_items) && service_items.length > 0) {
      const insertSrv = db.prepare(`
        INSERT INTO job_card_services (id, job_card_id, service_id, service_name, price, status)
        VALUES (?, ?, ?, ?, ?, 'Pending')
      `);
      for (const item of service_items) {
        insertSrv.run(`jcs-${Date.now()}-${Math.random()}`, id, item.service_id, item.service_name, item.price || 0);
      }
    }

    // Insert Staff Assignments
    if (Array.isArray(assigned_employee_ids)) {
      const insertAssign = db.prepare(`
        INSERT INTO job_assignments (id, job_card_id, employee_id, role_in_job)
        VALUES (?, ?, ?, ?)
      `);
      for (const assign of assigned_employee_ids) {
        insertAssign.run(`ja-${Date.now()}-${Math.random()}`, id, assign.employee_id, assign.role || 'Detailer');
      }
    }

    // Insert Intake Inspection Checklist
    if (intake_inspection) {
      db.prepare(`
        INSERT INTO vehicle_inspections (
          id, job_card_id, inspection_type, scratches_json, dents_json,
          paint_condition, interior_condition, wheel_condition, glass_condition,
          accessories_checked_json, photos_json, customer_acknowledged, customer_signature, notes
        ) VALUES (?, ?, 'intake', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        `insp-${Date.now()}`,
        id,
        JSON.stringify(intake_inspection.scratches || []),
        JSON.stringify(intake_inspection.dents || []),
        intake_inspection.paint_condition || 'Fair',
        intake_inspection.interior_condition || 'Clean',
        intake_inspection.wheel_condition || 'Good',
        intake_inspection.glass_condition || 'Good',
        JSON.stringify(intake_inspection.accessories_checked || []),
        JSON.stringify(intake_inspection.photos || []),
        intake_inspection.customer_signature || 'Acknowledged on Intake',
        intake_inspection.notes || null
      );
    }

    // If an appointment was linked, update appointment status to 'Vehicle Received'
    if (appointment_id) {
      db.prepare("UPDATE appointments SET status = 'Vehicle Received' WHERE id = ?").run(appointment_id);
    }

    // Update Bay status to 'Occupied'
    if (bay_id) {
      const veh = db.prepare('SELECT reg_number FROM vehicles WHERE id = ?').get(vehicle_id) as any;
      db.prepare("UPDATE service_bays SET current_status = 'Occupied', current_job_id = ?, current_vehicle_reg = ? WHERE id = ?").run(
        id,
        veh?.reg_number || 'Vehicle In Bay',
        bay_id
      );
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
      VALUES (?, 'Admin', 'JOB_CARD_CREATE', 'job_card', ?, ?)
    `).run(`aud-${Date.now()}`, id, JSON.stringify({ job_card_number, customer_id, vehicle_id }));

    return NextResponse.json({ success: true, job_card_number, id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
