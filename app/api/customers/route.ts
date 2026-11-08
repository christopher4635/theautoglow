export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM vehicles WHERE customer_id = c.id) as vehicle_count,
        (SELECT GROUP_CONCAT(reg_number, ', ') FROM vehicles WHERE customer_id = c.id) as registered_vehicles
      FROM customers c
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (c.name LIKE ? OR c.mobile LIKE ? OR c.customer_code LIKE ? OR c.email LIKE ? OR c.id IN (SELECT customer_id FROM vehicles WHERE reg_number LIKE ?))`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (category) {
      query += ` AND c.category = ?`;
      params.push(category);
    }

    if (status) {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY c.created_at DESC`;

    const customers = db.prepare(query).all(...params);
    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, mobile, alt_mobile, email, address, city, category, remarks } = body;

    if (!name || !mobile) {
      return NextResponse.json({ error: 'Name and primary mobile number are required.' }, { status: 400 });
    }

    // Duplicate check
    const existing = db.prepare('SELECT id, name FROM customers WHERE mobile = ?').get(mobile);
    if (existing) {
      return NextResponse.json(
        { error: `Customer with mobile ${mobile} already exists (${(existing as any).name}). Duplicate prevented.` },
        { status: 409 }
      );
    }

    // Generate Customer Code
    const countRow = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
    const customer_code = `CUST-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `cust-${Date.now()}`;

    const stmt = db.prepare(`
      INSERT INTO customers (
        id, customer_code, name, mobile, alt_mobile, email, address, city,
        category, remarks, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
    `);

    stmt.run(
      id,
      customer_code,
      name.trim(),
      mobile.trim(),
      alt_mobile?.trim() || null,
      email?.trim() || null,
      address?.trim() || null,
      city?.trim() || 'Gangtok',
      category || 'Regular',
      remarks?.trim() || null
    );

    // Initialize loyalty account
    const referralCode = `AGS-${name.split(' ')[0].toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
    db.prepare(`
      INSERT INTO loyalty_accounts (id, customer_id, points_balance, tier, referral_code)
      VALUES (?, ?, 0, 'Silver', ?)
    `).run(`loy-${id}`, id, referralCode);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
      VALUES (?, 'Admin', 'CUSTOMER_REGISTER', 'customer', ?, ?)
    `).run(`aud-${Date.now()}`, id, JSON.stringify({ customer_code, name, mobile }));

    const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
