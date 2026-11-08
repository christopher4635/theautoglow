export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get('payment_status');
    const customerId = searchParams.get('customer_id');
    const search = searchParams.get('search');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = `
      SELECT i.*,
             c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
             v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model,
             j.job_card_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN job_cards j ON i.job_card_id = j.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (paymentStatus) {
      query += ` AND i.payment_status = ?`;
      params.push(paymentStatus);
    }

    if (customerId) {
      query += ` AND i.customer_id = ?`;
      params.push(customerId);
    }

    if (startDate && endDate) {
      query += ` AND i.invoice_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    if (search) {
      query += ` AND (i.invoice_number LIKE ? OR c.name LIKE ? OR c.mobile LIKE ? OR v.reg_number LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY i.created_at DESC`;

    const invoices = db.prepare(query).all(...params);

    const itemsStmt = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`);
    const paymentsStmt = db.prepare(`SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC`);

    const result = invoices.map((inv: any) => ({
      ...inv,
      items: itemsStmt.all(inv.id),
      payments: paymentsStmt.all(inv.id),
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
      job_card_id,
      customer_id,
      vehicle_id,
      invoice_date,
      due_date,
      items, // Array of { description, quantity, unit_price, discount, item_type }
      overall_discount,
      notes,
    } = body;

    if (!customer_id || !vehicle_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Customer, Vehicle, and at least one item are required.' }, { status: 400 });
    }

    // Get configurable GST rates
    const gstSetting = db.prepare("SELECT value FROM business_settings WHERE key = 'default_gst_rate'").get() as any;
    const cgstSetting = db.prepare("SELECT value FROM business_settings WHERE key = 'cgst_rate'").get() as any;
    const sgstSetting = db.prepare("SELECT value FROM business_settings WHERE key = 'sgst_rate'").get() as any;

    const gstRate = gstSetting ? parseFloat(gstSetting.value) : 18;
    const cgstRate = cgstSetting ? parseFloat(cgstSetting.value) : 9;
    const sgstRate = sgstSetting ? parseFloat(sgstSetting.value) : 9;

    let subtotal = 0;
    const processedItems = items.map((it) => {
      const qty = parseFloat(it.quantity) || 1;
      const rate = parseFloat(it.unit_price) || 0;
      const disc = parseFloat(it.discount) || 0;
      const total = qty * rate - disc;
      subtotal += total;
      return {
        ...it,
        quantity: qty,
        unit_price: rate,
        discount: disc,
        total_price: total,
      };
    });

    const discountVal = parseFloat(overall_discount) || 0;
    const taxableValue = Math.max(0, subtotal - discountVal);
    const cgstAmount = Math.round(((taxableValue * cgstRate) / 100) * 100) / 100;
    const sgstAmount = Math.round(((taxableValue * sgstRate) / 100) * 100) / 100;
    const totalAmount = taxableValue + cgstAmount + sgstAmount;

    // Check existing advance payments if linked to job card
    let paidAmount = 0;
    if (job_card_id) {
      const existingPay = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        WHERE i.job_card_id = ?
      `).get(job_card_id) as any;
      if (existingPay) paidAmount = existingPay.total;
    }

    const balanceAmount = Math.max(0, totalAmount - paidAmount);
    let paymentStatus = 'Unpaid';
    if (balanceAmount === 0 && totalAmount > 0) {
      paymentStatus = 'Paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'Partially Paid';
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number };
    const invoice_number = `INV-AGS-${new Date().getFullYear()}-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `inv-${Date.now()}`;
    const invDate = invoice_date || new Date().toISOString().split('T')[0];
    const dueDate = due_date || invDate;

    // Transaction
    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, job_card_id, customer_id, vehicle_id, invoice_date, due_date,
          subtotal, discount, taxable_value, gst_rate, cgst_amount, sgst_amount,
          total_amount, paid_amount, balance_amount, payment_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        invoice_number,
        job_card_id || 'standalone',
        customer_id,
        vehicle_id,
        invDate,
        dueDate,
        subtotal,
        discountVal,
        taxableValue,
        gstRate,
        cgstAmount,
        sgstAmount,
        totalAmount,
        paidAmount,
        balanceAmount,
        paymentStatus,
        notes?.trim() || null
      );

      const insertItem = db.prepare(`
        INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, discount, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const it of processedItems) {
        insertItem.run(
          `ii-${Date.now()}-${Math.random()}`,
          id,
          it.item_type || 'service',
          it.description,
          it.quantity,
          it.unit_price,
          it.discount,
          it.total_price
        );
      }

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
        VALUES (?, 'Accountant', 'INVOICE_CREATE', 'invoice', ?, ?)
      `).run(`aud-${Date.now()}`, id, JSON.stringify({ invoice_number, totalAmount, customer_id }));
    });

    createTx();

    return NextResponse.json({ success: true, invoice_number, id, totalAmount, balanceAmount }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
