export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Associated Vehicles
    const vehicles = db.prepare('SELECT * FROM vehicles WHERE customer_id = ? ORDER BY created_at DESC').all(id);

    // Associated Job Cards / Service History
    const jobCards = db.prepare(`
      SELECT j.*, v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model
      FROM job_cards j
      JOIN vehicles v ON j.vehicle_id = v.id
      WHERE j.customer_id = ?
      ORDER BY j.created_at DESC
    `).all(id);

    // Invoices
    const invoices = db.prepare(`
      SELECT i.*, v.reg_number as vehicle_reg
      FROM invoices i
      JOIN vehicles v ON i.vehicle_id = v.id
      WHERE i.customer_id = ?
      ORDER BY i.created_at DESC
    `).all(id);

    // Payments
    const payments = db.prepare(`
      SELECT p.*, i.invoice_number
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE p.customer_id = ?
      ORDER BY p.payment_date DESC
    `).all(id);

    // Warranties
    const warranties = db.prepare(`
      SELECT w.*, v.reg_number as vehicle_reg
      FROM warranties w
      JOIN vehicles v ON w.vehicle_id = v.id
      WHERE w.customer_id = ?
      ORDER BY w.end_date DESC
    `).all(id);

    // Loyalty Info
    const loyalty = db.prepare('SELECT * FROM loyalty_accounts WHERE customer_id = ?').get(id);

    // Service Reminders
    const reminders = db.prepare(`
      SELECT r.*, v.reg_number as vehicle_reg
      FROM service_reminders r
      JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.customer_id = ?
      ORDER BY r.next_due_date ASC
    `).all(id);

    return NextResponse.json({
      customer,
      vehicles,
      jobCards,
      invoices,
      payments,
      warranties,
      loyalty,
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
    const { name, mobile, alt_mobile, email, address, city, category, remarks, status } = body;

    // Check if updating mobile causes collision with another customer
    if (mobile) {
      const collision = db.prepare('SELECT id FROM customers WHERE mobile = ? AND id != ?').get(mobile, id);
      if (collision) {
        return NextResponse.json({ error: 'Another customer is already registered with this mobile number.' }, { status: 409 });
      }
    }

    db.prepare(`
      UPDATE customers
      SET name = COALESCE(?, name),
          mobile = COALESCE(?, mobile),
          alt_mobile = COALESCE(?, alt_mobile),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          category = COALESCE(?, category),
          remarks = COALESCE(?, remarks),
          status = COALESCE(?, status),
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(name, mobile, alt_mobile, email, address, city, category, remarks, status, id);

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
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
    // Check if customer has unpaid invoices
    const unpaid = db.prepare("SELECT COUNT(*) as count FROM invoices WHERE customer_id = ? AND payment_status != 'Paid'").get(id) as { count: number };
    if (unpaid.count > 0) {
      return NextResponse.json({ error: 'Cannot delete customer with active or unpaid invoices. Archive customer status instead.' }, { status: 400 });
    }

    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
