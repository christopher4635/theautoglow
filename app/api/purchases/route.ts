export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
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

    const purchaseOrders = db.prepare(query).all(...params);

    const itemsStmt = db.prepare(`
      SELECT pi.*, p.name as product_name, p.sku, p.unit
      FROM purchase_items pi
      JOIN inventory_products p ON pi.product_id = p.id
      WHERE pi.purchase_order_id = ?
    `);

    const result = purchaseOrders.map((po: any) => ({
      ...po,
      items: itemsStmt.all(po.id),
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
      supplier_id,
      purchase_date,
      items, // Array of { product_id, quantity, unit_price }
      paid_amount,
      notes,
    } = body;

    if (!supplier_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Supplier and at least one purchase item are required.' },
        { status: 400 }
      );
    }

    let subtotal = 0;
    for (const it of items) {
      subtotal += (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
    }

    const taxAmount = Math.round((subtotal * 0.18) * 100) / 100; // 18% GST on purchase
    const totalAmount = subtotal + taxAmount;
    const paid = paid_amount ? parseFloat(paid_amount) : 0;
    const balance = Math.max(0, totalAmount - paid);
    const paymentStatus = balance === 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid';

    const countRow = db.prepare('SELECT COUNT(*) as count FROM purchase_orders').get() as { count: number };
    const po_number = `PO-AGS-${new Date().getFullYear()}-${String(countRow.count + 1).padStart(3, '0')}`;
    const poId = `po-${Date.now()}`;
    const purDate = purchase_date || new Date().toISOString().split('T')[0];

    const poTx = db.transaction(() => {
      // 1. Insert Purchase Order
      db.prepare(`
        INSERT INTO purchase_orders (
          id, po_number, supplier_id, purchase_date, subtotal, tax_amount,
          total_amount, paid_amount, balance_amount, payment_status, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Received', ?)
      `).run(
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

      // 2. Insert items AND automatically update inventory stock!
      const insertItem = db.prepare(`
        INSERT INTO purchase_items (id, purchase_order_id, product_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE inventory_products
        SET current_stock = current_stock + ?,
            purchase_price = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `);

      const insertTx = db.prepare(`
        INSERT INTO stock_transactions (
          id, product_id, transaction_type, quantity, unit_price,
          reference_type, reference_id, notes, recorded_by
        ) VALUES (?, ?, 'Purchase', ?, ?, 'purchase_order', ?, ?, 'Inventory Manager')
      `);

      for (const it of items) {
        const qty = parseFloat(it.quantity);
        const price = parseFloat(it.unit_price);
        const lineTotal = qty * price;

        insertItem.run(`pi-${Date.now()}-${Math.random()}`, poId, it.product_id, qty, price, lineTotal);
        updateStock.run(qty, price, it.product_id);
        insertTx.run(`st-${Date.now()}-${Math.random()}`, it.product_id, qty, price, poId, `Stock received via ${po_number}`);
      }

      // 3. If paid > 0, record supplier payment
      if (paid > 0) {
        db.prepare(`
          INSERT INTO supplier_payments (
            id, purchase_order_id, supplier_id, amount, payment_method, payment_date, recorded_by
          ) VALUES (?, ?, ?, ?, 'Bank Transfer', ?, 'Accountant')
        `).run(`spay-${Date.now()}`, poId, supplier_id, paid, purDate);
      }

      // 4. Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
        VALUES (?, 'Inventory Manager', 'PURCHASE_RECEIPT', 'purchase_order', ?, ?)
      `).run(`aud-${Date.now()}`, poId, JSON.stringify({ po_number, totalAmount, supplier_id }));
    });

    poTx();

    return NextResponse.json({ success: true, po_number, id: poId, totalAmount, balance }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
