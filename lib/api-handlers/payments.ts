import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handlePaymentsGet(request: Request, db: DbClient): Promise<Response> {
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

    const payments = await db.all(query, ...params);
    return jsonResponse(payments);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handlePaymentsPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { invoice_id, amount, payment_method, transaction_ref, payment_date, notes, recorded_by } = body;

    const payAmount = parseFloat(amount);
    if (!invoice_id || isNaN(payAmount) || payAmount <= 0) {
      return errorResponse('Valid Invoice ID and positive Amount are required.', 400);
    }

    const invoice = await db.get<any>('SELECT * FROM invoices WHERE id = ?', invoice_id);
    if (!invoice) {
      return errorResponse('Invoice not found.', 404);
    }

    if (payAmount > invoice.balance_amount) {
      return errorResponse(
        `Payment amount (₹${payAmount}) exceeds invoice outstanding balance (₹${invoice.balance_amount}).`,
        400
      );
    }

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM payments');
    const payment_number = `PAY-AGS-${new Date().getFullYear()}-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const id = `pay-${Date.now()}`;
    const dateStr = payment_date || new Date().toISOString().split('T')[0];

    const newPaid = invoice.paid_amount + payAmount;
    const newBalance = Math.max(0, invoice.total_amount - newPaid);
    const newStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';

    await db.run(
      `INSERT INTO payments (
        id, payment_number, invoice_id, customer_id, amount,
        payment_method, transaction_ref, payment_date, notes, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    await db.run(
      `UPDATE invoices
       SET paid_amount = ?, balance_amount = ?, payment_status = ?, updated_at = datetime('now', 'localtime')
       WHERE id = ?`,
      newPaid,
      newBalance,
      newStatus,
      invoice_id
    );

    await db.run(
      `UPDATE customers SET total_spent = total_spent + ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
      payAmount,
      invoice.customer_id
    );

    const pointsEarned = Math.floor(payAmount / 100);
    if (pointsEarned > 0) {
      await db.run(
        `UPDATE loyalty_accounts
         SET points_balance = points_balance + ?,
             total_points_earned = total_points_earned + ?,
             updated_at = datetime('now', 'localtime')
         WHERE customer_id = ?`,
        pointsEarned,
        pointsEarned,
        invoice.customer_id
      );
    }

    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, ?, 'PAYMENT_RECORD', 'payment', ?, ?)`,
      `aud-${Date.now()}`,
      recorded_by || 'Accountant',
      id,
      JSON.stringify({ payment_number, amount: payAmount, invoice_id, payment_method })
    );

    return jsonResponse(
      {
        success: true,
        payment_number,
        id,
        paid_amount: newPaid,
        balance_amount: newBalance,
        payment_status: newStatus,
      },
      201
    );
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
