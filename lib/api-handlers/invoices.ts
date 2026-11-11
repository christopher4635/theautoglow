import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleInvoicesGet(request: Request, db: DbClient): Promise<Response> {
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

    const invoices = await db.all<any>(query, ...params);

    const result = await Promise.all(
      invoices.map(async (inv) => ({
        ...inv,
        items: await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', inv.id),
        payments: await db.all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC', inv.id),
      }))
    );

    return jsonResponse(result);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleInvoicesPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { job_card_id, customer_id, vehicle_id, invoice_date, due_date, items, overall_discount, notes } = body;

    if (!customer_id || !vehicle_id || !Array.isArray(items) || items.length === 0) {
      return errorResponse('Customer, Vehicle, and at least one item are required.', 400);
    }

    const [gstSetting, cgstSetting, sgstSetting] = await Promise.all([
      db.get<any>("SELECT value FROM business_settings WHERE key = 'default_gst_rate'"),
      db.get<any>("SELECT value FROM business_settings WHERE key = 'cgst_rate'"),
      db.get<any>("SELECT value FROM business_settings WHERE key = 'sgst_rate'"),
    ]);

    const gstRate = gstSetting ? parseFloat(gstSetting.value) : 18;
    const cgstRate = cgstSetting ? parseFloat(cgstSetting.value) : 9;
    const sgstRate = sgstSetting ? parseFloat(sgstSetting.value) : 9;

    let subtotal = 0;
    const processedItems = items.map((it: any) => {
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

    let paidAmount = 0;
    if (job_card_id) {
      const existingPay = await db.get<any>(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM payments p
         JOIN invoices i ON p.invoice_id = i.id
         WHERE i.job_card_id = ?`,
        job_card_id
      );
      if (existingPay) paidAmount = existingPay.total;
    }

    const balanceAmount = Math.max(0, totalAmount - paidAmount);
    let paymentStatus = 'Unpaid';
    if (balanceAmount === 0 && totalAmount > 0) {
      paymentStatus = 'Paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'Partially Paid';
    }

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM invoices');
    const invoice_number = `INV-AGS-${new Date().getFullYear()}-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const id = `inv-${Date.now()}`;
    const invDate = invoice_date || new Date().toISOString().split('T')[0];
    const dueDate = due_date || invDate;

    await db.run(
      `INSERT INTO invoices (
        id, invoice_number, job_card_id, customer_id, vehicle_id, invoice_date, due_date,
        subtotal, discount, taxable_value, gst_rate, cgst_amount, sgst_amount,
        total_amount, paid_amount, balance_amount, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    for (const it of processedItems) {
      await db.run(
        `INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, discount, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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

    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, 'Accountant', 'INVOICE_CREATE', 'invoice', ?, ?)`,
      `aud-${Date.now()}`,
      id,
      JSON.stringify({ invoice_number, totalAmount, customer_id })
    );

    return jsonResponse({ success: true, invoice_number, id, totalAmount, balanceAmount }, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleInvoiceByIdGet(id: string, db: DbClient): Promise<Response> {
  try {
    const invoice = await db.get(
      `SELECT i.*,
              c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
              c.address as customer_address, c.city as customer_city, c.customer_code,
              v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model,
              v.category as vehicle_category, v.color as vehicle_color,
              j.job_card_number
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       JOIN vehicles v ON i.vehicle_id = v.id
       LEFT JOIN job_cards j ON i.job_card_id = j.id
       WHERE i.id = ?`,
      id
    );

    if (!invoice) {
      return errorResponse('Invoice not found', 404);
    }

    const [items, payments, settings] = await Promise.all([
      db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', id),
      db.all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC', id),
      db.all<any>('SELECT key, value FROM business_settings'),
    ]);

    const businessConfig: Record<string, string> = {};
    for (const s of settings) {
      businessConfig[s.key] = s.value;
    }

    return jsonResponse({ invoice, items, payments, businessConfig });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleInvoiceByIdDelete(id: string, db: DbClient): Promise<Response> {
  try {
    const invoice = await db.get<any>('SELECT * FROM invoices WHERE id = ?', id);
    if (!invoice) {
      return errorResponse('Invoice not found', 404);
    }

    if (invoice.paid_amount > 0) {
      return errorResponse(
        `Audit Security Rule: Invoice ${invoice.invoice_number} has ₹${invoice.paid_amount} in recorded payments. Invoices with payments cannot be deleted. Use adjustments or refunds instead.`,
        403
      );
    }

    await db.run('DELETE FROM invoices WHERE id = ?', id);
    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, 'Admin', 'INVOICE_DELETE', 'invoice', ?, ?)`,
      `aud-${Date.now()}`,
      id,
      JSON.stringify({ invoice_number: invoice.invoice_number })
    );

    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
