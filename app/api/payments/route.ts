export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoice_id');
    const customerId = searchParams.get('customer_id');

    let query = `
      SELECT p.*,
             i.invoice_number, i.total_amount as invoice_total,
             c.name as customer_name, c.mobile as customer_mobile
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customers c ON p.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (invoiceId) {
      query += ` AND p.invoice_id = ?`;
      params.push(invoiceId);
    }

    if (customerId) {
      query += ` AND p.customer_id = ?`;
      params.push(customerId);
    }

    query += ` ORDER BY p.payment_date DESC, p.created_at DESC`;

    const payments = db.prepare(query).all(...params);
    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoice_id, amount, payment_method, transaction_ref, payment_date, notes, recorded_by } = body;

    const payAmount = parseFloat(amount);
    if (!invoice_id || isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ error: 'Valid Invoice ID and positive Amount are required.' }, { status: 400 });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice_id) as any;
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    if (payAmount > invoice.balance_amount) {
      return NextResponse.json(
        {
          error: `Payment amount (₹${payAmount}) exceeds invoice outstanding balance (₹${invoice.balance_amount}).`,
        },
        { status: 400 }
      );
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM payments').get() as { count: number };
    const payment_number = `PAY-AGS-${new Date().getFullYear()}-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `pay-${Date.now()}`;
    const dateStr = payment_date || new Date().toISOString().split('T')[0];

    const newPaid = invoice.paid_amount + payAmount;
    const newBalance = Math.max(0, invoice.total_amount - newPaid);
    const newStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';

    const payTx = db.transaction(() => {
      // 1. Insert payment record
      db.prepare(`
        INSERT INTO payments (
          id, payment_number, invoice_id, customer_id, amount,
          payment_method, transaction_ref, payment_date, notes, recorded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        payment_number,
        invoice_id,
        invoice.customer_id,
        payAmount,
        payment_method || 'UPI',
        transaction_ref?.trim() || null,
        dateStr,
        notes?.trim() || null,
        recorded_by || 'Staff'
      );

      // 2. Update invoice balances
      db.prepare(`
        UPDATE invoices
        SET paid_amount = ?, balance_amount = ?, payment_status = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(newPaid, newBalance, newStatus, invoice_id);

      // 3. Update customer total spent
      db.prepare(`
        UPDATE customers
        SET total_spent = total_spent + ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(payAmount, invoice.customer_id);

      // 4. Update loyalty points: 1 point for every ₹100 spent
      const pointsEarned = Math.floor(payAmount / 100);
      if (pointsEarned > 0) {
        db.prepare(`
          UPDATE loyalty_accounts
          SET points_balance = points_balance + ?,
              total_points_earned = total_points_earned + ?,
              updated_at = datetime('now', 'localtime')
          WHERE customer_id = ?
        `).run(pointsEarned, pointsEarned, invoice.customer_id);
      }

      // 5. Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
        VALUES (?, ?, 'PAYMENT_RECORD', 'payment', ?, ?)
      `).run(
        `aud-${Date.now()}`,
        recorded_by || 'Accountant',
        id,
        JSON.stringify({ payment_number, amount: payAmount, invoice_id, payment_method })
      );
    });

    payTx();

    return NextResponse.json({
      success: true,
      payment_number,
      id,
      paid_amount: newPaid,
      balance_amount: newBalance,
      payment_status: newStatus,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
