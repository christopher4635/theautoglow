export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const loyaltyAccounts = db.prepare(`
      SELECT l.*, c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
             c.total_spent, c.visit_count
      FROM loyalty_accounts l
      JOIN customers c ON l.customer_id = c.id
      ORDER BY l.points_balance DESC
    `).all();

    const coupons = db.prepare(`SELECT * FROM coupons WHERE is_active = 1`).all();

    return NextResponse.json({ loyaltyAccounts, coupons });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, points_to_redeem, discount_amount, description } = body;

    const points = parseInt(points_to_redeem, 10);
    if (!customer_id || isNaN(points) || points <= 0) {
      return NextResponse.json({ error: 'Valid Customer and Points amount are required.' }, { status: 400 });
    }

    const account = db.prepare('SELECT * FROM loyalty_accounts WHERE customer_id = ?').get(customer_id) as any;
    if (!account) {
      return NextResponse.json({ error: 'Loyalty account not found' }, { status: 404 });
    }

    if (account.points_balance < points) {
      return NextResponse.json(
        { error: `Insufficient loyalty points. Balance: ${account.points_balance}, requested: ${points}` },
        { status: 400 }
      );
    }

    const newBalance = account.points_balance - points;
    const newRedeemed = account.total_points_redeemed + points;

    db.prepare(`
      UPDATE loyalty_accounts
      SET points_balance = ?, total_points_redeemed = ?, updated_at = datetime('now', 'localtime')
      WHERE customer_id = ?
    `).run(newBalance, newRedeemed, customer_id);

    // Record transaction
    db.prepare(`
      INSERT INTO loyalty_transactions (id, customer_id, type, points, description)
      VALUES (?, ?, 'Redemption', ?, ?)
    `).run(`ltx-${Date.now()}`, customer_id, points, description || `Redeemed ${points} points for ₹${discount_amount || points} discount`);

    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
