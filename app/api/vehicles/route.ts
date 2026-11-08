export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
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

    const vehicles = db.prepare(query).all(...params);
    return NextResponse.json(vehicles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, reg_number, make, model, variant, category, color, fuel_type, year, remarks, odometer } = body;

    if (!customer_id || !reg_number || !make || !model || !color) {
      return NextResponse.json({ error: 'Customer, Registration number, Make, Model and Color are required.' }, { status: 400 });
    }

    const cleanReg = reg_number.trim().toUpperCase().replace(/\s+/g, '-');

    // Duplicate check
    const existing = db.prepare('SELECT id, make, model FROM vehicles WHERE reg_number = ?').get(cleanReg);
    if (existing) {
      return NextResponse.json({ error: `Vehicle with registration ${cleanReg} is already registered (${(existing as any).make} ${(existing as any).model}).` }, { status: 409 });
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM vehicles').get() as { count: number };
    const vehicle_code = `VEH-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `veh-${Date.now()}`;

    db.prepare(`
      INSERT INTO vehicles (
        id, vehicle_code, customer_id, reg_number, make, model, variant,
        category, color, fuel_type, year, remarks, odometer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      vehicle_code,
      customer_id,
      cleanReg,
      make.trim(),
      model.trim(),
      variant?.trim() || null,
      category || 'SUV',
      color.trim(),
      fuel_type || 'Petrol',
      year ? parseInt(year, 10) : new Date().getFullYear(),
      remarks?.trim() || null,
      odometer ? parseInt(odometer, 10) : 0
    );

    db.prepare(`
      INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
      VALUES (?, 'Admin', 'VEHICLE_REGISTER', 'vehicle', ?, ?)
    `).run(`aud-${Date.now()}`, id, JSON.stringify({ vehicle_code, reg_number: cleanReg, customer_id }));

    const created = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
