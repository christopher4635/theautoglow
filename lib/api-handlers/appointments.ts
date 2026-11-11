import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleAppointmentsGet(request: Request, db: DbClient): Promise<Response> {
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

    const appointments = await db.all<any>(query, ...params);

    const result = await Promise.all(
      appointments.map(async (apt) => ({
        ...apt,
        services: await db.all(
          `SELECT s.*, aps.price as booked_price
           FROM appointment_services aps
           JOIN services s ON aps.service_id = s.id
           WHERE aps.appointment_id = ?`,
          apt.id
        ),
      }))
    );

    return jsonResponse(result);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleAppointmentsPost(request: Request, db: DbClient): Promise<Response> {
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
      return errorResponse('Customer, Vehicle, Date and Time are required for an appointment.', 400);
    }

    if (bay_id) {
      const conflict = await db.get<any>(
        `SELECT booking_code, appointment_time, expected_end_time
         FROM appointments
         WHERE bay_id = ?
           AND appointment_date = ?
           AND status IN ('Requested', 'Confirmed', 'Vehicle Received', 'In Progress')
           AND (
             (appointment_time <= ? AND expected_end_time > ?) OR
             (? <= appointment_time AND ? > appointment_time)
           )`,
        bay_id,
        appointment_date,
        appointment_time,
        appointment_time,
        appointment_time,
        expected_end_time || '23:59'
      );

      if (conflict) {
        return errorResponse(
          `Bay double-booking conflict: This bay is already reserved by booking ${conflict.booking_code} between ${conflict.appointment_time} and ${conflict.expected_end_time || 'end of slot'}. Please select another bay or time.`,
          409
        );
      }
    }

    let estimatedAmount = 0;
    const servicesToBook: Array<{ id: string; price: number }> = [];

    if (Array.isArray(service_ids) && service_ids.length > 0) {
      const placeholders = service_ids.map(() => '?').join(',');
      const services = await db.all<any>(`SELECT * FROM services WHERE id IN (${placeholders})`, ...service_ids);

      const vehicle = await db.get<any>('SELECT category FROM vehicles WHERE id = ?', vehicle_id);
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

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM appointments');
    const booking_code = `BK-${new Date().getFullYear()}-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const id = `apt-${Date.now()}`;

    await db.run(
      `INSERT INTO appointments (
        id, booking_code, customer_id, vehicle_id, bay_id, assigned_staff_id,
        appointment_date, appointment_time, expected_end_time, estimated_amount,
        status, customer_instructions, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?)`,
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

    for (const item of servicesToBook) {
      await db.run(
        'INSERT INTO appointment_services (id, appointment_id, service_id, price) VALUES (?, ?, ?, ?)',
        `aps-${Date.now()}-${Math.random()}`,
        id,
        item.id,
        item.price
      );
    }

    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, 'Admin', 'APPOINTMENT_CREATE', 'appointment', ?, ?)`,
      `aud-${Date.now()}`,
      id,
      JSON.stringify({ booking_code, appointment_date, appointment_time })
    );

    return jsonResponse({ success: true, booking_code, id }, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleAppointmentsPut(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { id, status, appointment_date, appointment_time, expected_end_time, bay_id, assigned_staff_id, remarks } = body;

    if (!id) {
      return errorResponse('Appointment ID is required', 400);
    }

    await db.run(
      `UPDATE appointments
       SET status = COALESCE(?, status),
           appointment_date = COALESCE(?, appointment_date),
           appointment_time = COALESCE(?, appointment_time),
           expected_end_time = COALESCE(?, expected_end_time),
           bay_id = COALESCE(?, bay_id),
           assigned_staff_id = COALESCE(?, assigned_staff_id),
           remarks = COALESCE(?, remarks),
           updated_at = datetime('now', 'localtime')
       WHERE id = ?`,
      status ?? null,
      appointment_date ?? null,
      appointment_time ?? null,
      expected_end_time ?? null,
      bay_id ?? null,
      assigned_staff_id ?? null,
      remarks ?? null,
      id
    );

    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
