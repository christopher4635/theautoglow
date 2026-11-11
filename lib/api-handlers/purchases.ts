import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handlePurchasesGet(request: Request, db: DbClient): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');
    const paymentStatus = searchParams.get('payment_status');

    let query = `
      SELECT po.*, s.name as supplier_name, s.mobile as supplier_mobile, s.gstin as supplier_gstin
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (supplierId) {
      query += ` AND po.supplier_id = ?`;
      params.push(supplierId);
    }

    if (paymentStatus) {
      query += ` AND po.payment_status = ?`;
      params.push(paymentStatus);
    }

    query += ` ORDER BY po.purchase_date DESC, po.created_at DESC`;

    const purchaseOrders = await db.all<any>(query, ...params);

    const result = await Promise.all(
      purchaseOrders.map(async (po) => ({
        ...po,
        items: await db.all(
          `SELECT pi.*, p.name as product_name, p.sku, p.unit
           FROM purchase_items pi
           JOIN inventory_products p ON pi.product_id = p.id
           WHERE pi.purchase_order_id = ?`,
          po.id
        ),
      }))
    );

    return jsonResponse(result);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handlePurchasesPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { supplier_id, purchase_date, items, paid_amount, notes } = body;

    if (!supplier_id || !Array.isArray(items) || items.length === 0) {
      return errorResponse('Supplier and at least one purchase item are required.', 400);
    }

    let subtotal = 0;
    for (const it of items) {
      subtotal += (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
    }

    const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const totalAmount = subtotal + taxAmount;
    const paid = paid_amount ? parseFloat(paid_amount) : 0;
    const balance = Math.max(0, totalAmount - paid);
    const paymentStatus = balance === 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid';

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM purchase_orders');
    const po_number = `PO-AGS-${new Date().getFullYear()}-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const poId = `po-${Date.now()}`;
    const purDate = purchase_date || new Date().toISOString().split('T')[0];

    await db.run(
      `INSERT INTO purchase_orders (
        id, po_number, supplier_id, purchase_date, subtotal, tax_amount,
        total_amount, paid_amount, balance_amount, payment_status, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Received', ?)`,
      poId,
      po_number,
      supplier_id,
      purDate,
      subtotal,
      taxAmount,
      totalAmount,
      paid,
      balance,
      paymentStatus,
      notes?.trim() || null
    );

    for (const it of items) {
      const qty = parseFloat(it.quantity);
      const price = parseFloat(it.unit_price);
      const lineTotal = qty * price;

      await db.run(
        `INSERT INTO purchase_items (id, purchase_order_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        `pi-${Date.now()}-${Math.random()}`,
        poId,
        it.product_id,
        qty,
        price,
        lineTotal
      );

      await db.run(
        `UPDATE inventory_products
         SET current_stock = current_stock + ?, purchase_price = ?, updated_at = datetime('now', 'localtime')
         WHERE id = ?`,
        qty,
        price,
        it.product_id
      );

      await db.run(
        `INSERT INTO stock_transactions (
          id, product_id, transaction_type, quantity, unit_price,
          reference_type, reference_id, notes, recorded_by
        ) VALUES (?, ?, 'Purchase', ?, ?, 'purchase_order', ?, ?, 'Inventory Manager')`,
        `st-${Date.now()}-${Math.random()}`,
        it.product_id,
        qty,
        price,
        poId,
        `Stock received via ${po_number}`
      );
    }

    if (paid > 0) {
      await db.run(
        `INSERT INTO supplier_payments (
          id, purchase_order_id, supplier_id, amount, payment_method, payment_date, recorded_by
        ) VALUES (?, ?, ?, ?, 'Bank Transfer', ?, 'Accountant')`,
        `spay-${Date.now()}`,
        poId,
        supplier_id,
        paid,
        purDate
      );
    }

    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, 'Inventory Manager', 'PURCHASE_RECEIPT', 'purchase_order', ?, ?)`,
      `aud-${Date.now()}`,
      poId,
      JSON.stringify({ po_number, totalAmount, supplier_id })
    );

    return jsonResponse({ success: true, po_number, id: poId, totalAmount, balance }, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
