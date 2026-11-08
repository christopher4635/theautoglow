export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status');
    const bayId = searchParams.get('bay_id');

    let query = `
      SELECT a.*,
             c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
             v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, v.category as vehicle_category,
             b.name as bay_name,
             e.name as assigned_staff_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN service_bays b ON a.bay_id = b.id
      LEFT JOIN employees e ON a.assigned_staff_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      query += ` AND a.appointment_date = ?`;
      params.push(date);
    } else if (startDate && endDate) {
      query += ` AND a.appointment_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (bayId) {
      query += ` AND a.bay_id = ?`;
      params.push(bayId);
    }

    query += ` ORDER BY a.appointment_date DESC, a.appointment_time ASC`;

    const appointments = db.prepare(query).all(...params);

    // Attach services for each appointment
    const getServicesStmt = db.prepare(`
      SELECT s.*, aps.price as booked_price
      FROM appointment_services aps
      JOIN services s ON aps.service_id = s.id
      WHERE aps.appointment_id = ?
    `);

    const result = appointments.map((apt: any) => ({
      ...apt,
      services: getServicesStmt.all(apt.id),
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
      bay_id,
      assigned_staff_id,
      appointment_date,
      appointment_time,
      expected_end_time,
      service_ids,
      customer_instructions,
      remarks,
    } = body;

    if (!customer_id || !vehicle_id || !appointment_date || !appointment_time) {
      return NextResponse.json(
        { error: 'Customer, Vehicle, Date and Time are required for an appointment.' },
        { status: 400 }
      );
    }

    // Bay conflict prevention: Check if bay is already booked at that date and overlapping time
    if (bay_id) {
      const conflict = db.prepare(`
        SELECT booking_code, appointment_time, expected_end_time
        FROM appointments
        WHERE bay_id = ?
          AND appointment_date = ?
          AND status IN ('Requested', 'Confirmed', 'Vehicle Received', 'In Progress')
          AND (
            (appointment_time <= ? AND expected_end_time > ?) OR
            (? <= appointment_time AND ? > appointment_time)
          )
      `).get(bay_id, appointment_date, appointment_time, appointment_time, appointment_time, expected_end_time || '23:59');

      if (conflict) {
        return NextResponse.json(
          {
            error: `Bay double-booking conflict: This bay is already reserved by booking ${(conflict as any).booking_code} between ${(conflict as any).appointment_time} and ${(conflict as any).expected_end_time || 'end of slot'}. Please select another bay or time.`,
          },
          { status: 409 }
        );
      }
    }

    // Calculate total estimated amount from selected services
    let estimatedAmount = 0;
    const servicesToBook: Array<{ id: string; price: number }> = [];

    if (Array.isArray(service_ids) && service_ids.length > 0) {
      const placeholders = service_ids.map(() => '?').join(',');
      const services = db.prepare(`SELECT * FROM services WHERE id IN (${placeholders})`).all(...service_ids) as any[];

      // Check vehicle category for exact price
      const vehicle = db.prepare('SELECT category FROM vehicles WHERE id = ?').get(vehicle_id) as any;
      const vehCat = vehicle?.category || 'SUV';

      for (const s of services) {
        let price = s.standard_price;
        if (s.pricing_by_category_json) {
          try {
            const pricing = JSON.parse(s.pricing_by_category_json);
            if (pricing[vehCat]) price = pricing[vehCat];
          } catch {}
        }
        estimatedAmount += price;
        servicesToBook.push({ id: s.id, price });
      }
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM appointments').get() as { count: number };
    const booking_code = `BK-${new Date().getFullYear()}-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `apt-${Date.now()}`;

    const insertApt = db.prepare(`
      INSERT INTO appointments (
        id, booking_code, customer_id, vehicle_id, bay_id, assigned_staff_id,
        appointment_date, appointment_time, expected_end_time, estimated_amount,
        status, customer_instructions, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?)
    `);

    insertApt.run(
      id,
      booking_code,
      customer_id,
      vehicle_id,
      bay_id || null,
      assigned_staff_id || null,
      appointment_date,
      appointment_time,
      expected_end_time || null,
      estimatedAmount,
      customer_instructions?.trim() || null,
      remarks?.trim() || null
    );

    // Insert services
    const insertAptSrv = db.prepare('INSERT INTO appointment_services (id, appointment_id, service_id, price) VALUES (?, ?, ?, ?)');
    for (const item of servicesToBook) {
      insertAptSrv.run(`aps-${Date.now()}-${Math.random()}`, id, item.id, item.price);
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
      VALUES (?, 'Admin', 'APPOINTMENT_CREATE', 'appointment', ?, ?)
    `).run(`aud-${Date.now()}`, id, JSON.stringify({ booking_code, appointment_date, appointment_time }));

    return NextResponse.json({ success: true, booking_code, id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, appointment_date, appointment_time, expected_end_time, bay_id, assigned_staff_id, remarks } = body;

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    db.prepare(`
      UPDATE appointments
      SET status = COALESCE(?, status),
          appointment_date = COALESCE(?, appointment_date),
          appointment_time = COALESCE(?, appointment_time),
          expected_end_time = COALESCE(?, expected_end_time),
          bay_id = COALESCE(?, bay_id),
          assigned_staff_id = COALESCE(?, assigned_staff_id),
          remarks = COALESCE(?, remarks),
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(status, appointment_date, appointment_time, expected_end_time, bay_id, assigned_staff_id, remarks, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
