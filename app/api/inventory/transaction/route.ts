export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product_id, transaction_type, quantity, unit_price, notes, recorded_by } = body;

    const qty = parseFloat(quantity);
    if (!product_id || !transaction_type || isNaN(qty) || qty === 0) {
      return NextResponse.json({ error: 'Valid Product, Transaction Type, and Quantity are required.' }, { status: 400 });
    }

    const product = db.prepare('SELECT * FROM inventory_products WHERE id = ?').get(product_id) as any;
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    let newStock = product.current_stock;
    if (transaction_type === 'Purchase' || transaction_type === 'Return') {
      newStock += qty;
    } else if (transaction_type === 'Issue' || transaction_type === 'Consumption' || transaction_type === 'Damaged') {
      if (product.current_stock < qty) {
        return NextResponse.json(
          {
            error: `Cannot reduce stock by ${qty}. Current stock is only ${product.current_stock} ${product.unit}. Never allow negative stock.`,
          },
          { status: 400 }
        );
      }
      newStock -= qty;
    } else if (transaction_type === 'Adjustment') {
      newStock = qty; // In adjustment, quantity is the new physical count
    }

    const txId = `st-${Date.now()}`;
    const price = unit_price !== undefined ? parseFloat(unit_price) : product.purchase_price;

    const stockTx = db.transaction(() => {
      // 1. Update product current stock
      db.prepare(`
        UPDATE inventory_products
        SET current_stock = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(newStock, product_id);

      // 2. Insert transaction history
      db.prepare(`
        INSERT INTO stock_transactions (
          id, product_id, transaction_type, quantity, unit_price, notes, recorded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        product_id,
        transaction_type,
        qty,
        price,
        notes?.trim() || null,
        recorded_by || 'Admin'
      );
    });

    stockTx();

    return NextResponse.json({
      success: true,
      new_stock: newStock,
      message: `Stock for ${product.name} updated to ${newStock} ${product.unit}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
