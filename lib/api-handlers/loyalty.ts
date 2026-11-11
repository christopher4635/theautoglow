import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleLoyaltyGet(db: DbClient): Promise<Response> {
  try {
    const [loyaltyAccounts, coupons] = await Promise.all([
      db.all(`
        SELECT l.*, c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
               c.total_spent, c.visit_count
        FROM loyalty_accounts l
        JOIN customers c ON l.customer_id = c.id
        ORDER BY l.points_balance DESC
      `),
      db.all('SELECT * FROM coupons WHERE is_active = 1'),
    ]);

    return jsonResponse({ loyaltyAccounts, coupons });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleLoyaltyPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { customer_id, points_to_redeem, discount_amount, description } = body;

    const points = parseInt(points_to_redeem, 10);
    if (!customer_id || isNaN(points) || points <= 0) {
      return errorResponse('Valid Customer and Points amount are required.', 400);
    }

    const account = await db.get<any>('SELECT * FROM loyalty_accounts WHERE customer_id = ?', customer_id);
    if (!account) {
      return errorResponse('Loyalty account not found', 404);
    }

    if (account.points_balance < points) {
      return errorResponse(
        `Insufficient loyalty points. Balance: ${account.points_balance}, requested: ${points}`,
        400
      );
    }

    const newBalance = account.points_balance - points;
    const newRedeemed = account.total_points_redeemed + points;

    await db.run(
      `UPDATE loyalty_accounts
       SET points_balance = ?, total_points_redeemed = ?, updated_at = datetime('now', 'localtime')
       WHERE customer_id = ?`,
      newBalance,
      newRedeemed,
      customer_id
    );

    await db.run(
      `INSERT INTO loyalty_transactions (id, customer_id, type, points, description)
       VALUES (?, ?, 'Redemption', ?, ?)`,
      `ltx-${Date.now()}`,
      customer_id,
      points,
      description || `Redeemed ${points} points for ₹${discount_amount || points} discount`
    );

    return jsonResponse({ success: true, new_balance: newBalance });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
