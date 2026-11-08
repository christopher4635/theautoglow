export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: job_card_id } = params;
    const body = await request.json();
    const { product_id, quantity } = body;

    if (!product_id || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Valid Product and Quantity are required.' }, { status: 400 });
    }

    const product = db.prepare('SELECT * FROM inventory_products WHERE id = ?').get(product_id) as any;
    if (!product) {
      return NextResponse.json({ error: 'Product not found in inventory.' }, { status: 404 });
    }

    if (product.current_stock < quantity) {
      return NextResponse.json(
        {
          error: `Insufficient stock for ${product.name}. Current stock: ${product.current_stock} ${product.unit}, requested: ${quantity} ${product.unit}. Never allow negative stock.`,
        },
        { status: 400 }
      );
    }

    const job = db.prepare('SELECT job_card_number FROM job_cards WHERE id = ?').get(job_card_id) as any;
    if (!job) {
      return NextResponse.json({ error: 'Job Card not found.' }, { status: 404 });
    }

    const unit_cost = product.purchase_price;
    const total_cost = unit_cost * quantity;
    const newStock = product.current_stock - quantity;

    // Run transaction
    const runInTransaction = db.transaction(() => {
      // 1. Record stock consumption on job card
      db.prepare(`
        INSERT INTO stock_consumptions (id, job_card_id, product_id, quantity, unit_cost, total_cost)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(`sc-${Date.now()}`, job_card_id, product_id, quantity, unit_cost, total_cost);

      // 2. Deduct inventory stock
      db.prepare(`
        UPDATE inventory_products
        SET current_stock = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(newStock, product_id);

      // 3. Record stock transaction history
      db.prepare(`
        INSERT INTO stock_transactions (
          id, product_id, transaction_type, quantity, unit_price,
          reference_type, reference_id, notes, recorded_by
        ) VALUES (?, ?, 'Consumption', ?, ?, 'job_card', ?, ?, 'Floor Detailer')
      `).run(
        `st-${Date.now()}`,
        product_id,
        quantity,
        unit_cost,
        job_card_id,
        `Consumed for ${job.job_card_number} (${quantity} ${product.unit})`
      );

      // 4. Check if low stock threshold reached, generate notification
      if (newStock <= product.min_stock_level) {
        db.prepare(`
          INSERT INTO notifications (id, title, message, category, link_url, is_read)
          VALUES (?, 'Low Stock Alert', ?, 'inventory', '/inventory', 0)
        `).run(
          `notif-${Date.now()}`,
          `Stock for ${product.name} is down to ${newStock} ${product.unit} (Min limit: ${product.min_stock_level}). Restock required.`
        );
      }
    });

    runInTransaction();

    return NextResponse.json({
      success: true,
      message: `Allocated ${quantity} ${product.unit} of ${product.name} to Job ${job.job_card_number}. Stock updated to ${newStock}.`,
      total_cost,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
