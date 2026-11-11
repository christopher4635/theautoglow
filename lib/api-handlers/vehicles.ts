import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleVehiclesGet(request: Request, db: DbClient): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const customerId = searchParams.get('customer_id');

    let query = `
      SELECT v.*, c.name as customer_name, c.mobile as customer_mobile, c.customer_code,
        (SELECT COUNT(*) FROM job_cards WHERE vehicle_id = v.id) as service_visits_count,
        (SELECT MAX(created_at) FROM job_cards WHERE vehicle_id = v.id) as last_service_date,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE vehicle_id = v.id) as total_spent_on_vehicle
      FROM vehicles v
      JOIN customers c ON v.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (v.reg_number LIKE ? OR v.make LIKE ? OR v.model LIKE ? OR c.name LIKE ? OR c.mobile LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (category) {
      query += ` AND v.category = ?`;
      params.push(category);
    }

    if (customerId) {
      query += ` AND v.customer_id = ?`;
      params.push(customerId);
    }

    query += ` ORDER BY v.created_at DESC`;

    const vehicles = await db.all(query, ...params);
    return jsonResponse(vehicles);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleVehiclesPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { customer_id, reg_number, make, model, variant, category, color, fuel_type, year, remarks, odometer } = body;

    if (!customer_id || !reg_number || !make || !model || !color) {
      return errorResponse('Customer, Registration number, Make, Model and Color are required.', 400);
    }

    const cleanReg = String(reg_number).trim().toUpperCase().replace(/\s+/g, '-');

    const existing = await db.get<any>('SELECT id, make, model FROM vehicles WHERE reg_number = ?', cleanReg);
    if (existing) {
      return errorResponse(
        `Vehicle with registration ${cleanReg} is already registered (${existing.make} ${existing.model}).`,
        409
      );
    }

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM vehicles');
    const vehicle_code = `VEH-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const id = `veh-${Date.now()}`;

    await db.run(
      `INSERT INTO vehicles (
        id, vehicle_code, customer_id, reg_number, make, model, variant,
        category, color, fuel_type, year, remarks, odometer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      vehicle_code,
      customer_id,
      cleanReg,
      String(make).trim(),
      String(model).trim(),
      variant?.trim() || null,
      category || 'SUV',
      String(color).trim(),
      fuel_type || 'Petrol',
      year ? parseInt(year, 10) : new Date().getFullYear(),
      remarks?.trim() || null,
      odometer ? parseInt(odometer, 10) : 0
    );

    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, 'Admin', 'VEHICLE_REGISTER', 'vehicle', ?, ?)`,
      `aud-${Date.now()}`,
      id,
      JSON.stringify({ vehicle_code, reg_number: cleanReg, customer_id })
    );

    const created = await db.get('SELECT * FROM vehicles WHERE id = ?', id);
    return jsonResponse(created, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleVehicleByIdGet(id: string, db: DbClient): Promise<Response> {
  try {
    const vehicle = await db.get(
      `SELECT v.*, c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email, c.customer_code
       FROM vehicles v
       JOIN customers c ON v.customer_id = c.id
       WHERE v.id = ?`,
      id
    );

    if (!vehicle) {
      return errorResponse('Vehicle not found', 404);
    }

    const [jobCards, invoices, warranties, inspections, reminders] = await Promise.all([
      db.all(
        `SELECT j.*, b.name as bay_name, e.name as primary_staff_name
         FROM job_cards j
         LEFT JOIN service_bays b ON j.bay_id = b.id
         LEFT JOIN employees e ON j.primary_staff_id = e.id
         WHERE j.vehicle_id = ?
         ORDER BY j.created_at DESC`,
        id
      ),
      db.all('SELECT i.* FROM invoices i WHERE i.vehicle_id = ? ORDER BY i.created_at DESC', id),
      db.all('SELECT w.* FROM warranties w WHERE w.vehicle_id = ? ORDER BY w.end_date DESC', id),
      db.all(
        `SELECT insp.*, j.job_card_number
         FROM vehicle_inspections insp
         JOIN job_cards j ON insp.job_card_id = j.id
         WHERE j.vehicle_id = ?
         ORDER BY insp.created_at DESC`,
        id
      ),
      db.all('SELECT r.* FROM service_reminders r WHERE r.vehicle_id = ? ORDER BY r.next_due_date ASC', id),
    ]);

    return jsonResponse({ vehicle, jobCards, invoices, warranties, inspections, reminders });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleVehicleByIdPut(request: Request, id: string, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { make, model, variant, category, color, fuel_type, year, remarks, odometer } = body;

    await db.run(
      `UPDATE vehicles
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
       WHERE id = ?`,
      make ?? null,
      model ?? null,
      variant ?? null,
      category ?? null,
      color ?? null,
      fuel_type ?? null,
      year ?? null,
      remarks ?? null,
      odometer ?? null,
      id
    );

    const updated = await db.get('SELECT * FROM vehicles WHERE id = ?', id);
    return jsonResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleVehicleByIdDelete(id: string, db: DbClient): Promise<Response> {
  try {
    const count = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM job_cards WHERE vehicle_id = ?', id);
    if ((count?.count ?? 0) > 0) {
      return errorResponse('Cannot delete vehicle with historical service job cards.', 400);
    }

    await db.run('DELETE FROM vehicles WHERE id = ?', id);
    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
