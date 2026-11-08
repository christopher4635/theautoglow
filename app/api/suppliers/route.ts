export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const suppliers = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = s.id) as total_purchase_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE supplier_id = s.id) as total_purchased_value,
        (SELECT COALESCE(SUM(balance_amount), 0) FROM purchase_orders WHERE supplier_id = s.id) as outstanding_payable
      FROM suppliers s
      ORDER BY s.name ASC
    `).all();

    return NextResponse.json(suppliers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, contact_person, mobile, email, address, gstin, products_supplied, payment_terms } = body;

    if (!name || !contact_person || !mobile) {
      return NextResponse.json({ error: 'Supplier Name, Contact Person, and Mobile are required.' }, { status: 400 });
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM suppliers').get() as { count: number };
    const supplier_code = `SUP-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `sup-${Date.now()}`;

    db.prepare(`
      INSERT INTO suppliers (
        id, supplier_code, name, contact_person, mobile, email,
        address, gstin, products_supplied, payment_terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      supplier_code,
      name.trim(),
      contact_person.trim(),
      mobile.trim(),
      email?.trim() || null,
      address?.trim() || null,
      gstin?.trim() || null,
      products_supplied?.trim() || null,
      payment_terms?.trim() || 'Net 30 Days'
    );

    const created = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
