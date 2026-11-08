export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const invoice = db.prepare(`
      SELECT i.*,
             c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
             c.address as customer_address, c.city as customer_city, c.customer_code,
             v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model,
             v.category as vehicle_category, v.color as vehicle_color,
             j.job_card_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN job_cards j ON i.job_card_id = j.id
      WHERE i.id = ?
    `).get(id);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
    const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(id);
    const settings = db.prepare('SELECT key, value FROM business_settings').all() as any[];

    const businessConfig: Record<string, string> = {};
    for (const s of settings) {
      businessConfig[s.key] = s.value;
    }

    return NextResponse.json({
      invoice,
      items,
      payments,
      businessConfig,
    });
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
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Critical Requirement: Never delete financial transactions silently. Invoices with recorded payments cannot be deleted!
    if (invoice.paid_amount > 0) {
      return NextResponse.json(
        {
          error: `Audit Security Rule: Invoice ${invoice.invoice_number} has ₹${invoice.paid_amount} in recorded payments. Invoices with payments cannot be deleted. Use adjustments or refunds instead.`,
        },
        { status: 403 }
      );
    }

    db.prepare('DELETE FROM invoices WHERE id = ?').run(id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
      VALUES (?, 'Admin', 'INVOICE_DELETE', 'invoice', ?, ?)
    `).run(`aud-${Date.now()}`, id, JSON.stringify({ invoice_number: invoice.invoice_number }));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
