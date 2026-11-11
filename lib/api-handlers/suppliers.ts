import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleSuppliersGet(db: DbClient): Promise<Response> {
  try {
    const suppliers = await db.all(`
      SELECT s.*,
        (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = s.id) as total_purchase_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE supplier_id = s.id) as total_purchased_value,
        (SELECT COALESCE(SUM(balance_amount), 0) FROM purchase_orders WHERE supplier_id = s.id) as outstanding_payable
      FROM suppliers s
      ORDER BY s.name ASC
    `);
    return jsonResponse(suppliers);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleSuppliersPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { name, contact_person, mobile, email, address, gstin, products_supplied, payment_terms } = body;

    if (!name || !contact_person || !mobile) {
      return errorResponse('Supplier Name, Contact Person, and Mobile are required.', 400);
    }

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM suppliers');
    const supplier_code = `SUP-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const id = `sup-${Date.now()}`;

    await db.run(
      `INSERT INTO suppliers (
        id, supplier_code, name, contact_person, mobile, email,
        address, gstin, products_supplied, payment_terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      supplier_code,
      String(name).trim(),
      String(contact_person).trim(),
      String(mobile).trim(),
      email?.trim() || null,
      address?.trim() || null,
      gstin?.trim() || null,
      products_supplied?.trim() || null,
      payment_terms?.trim() || 'Net 30 Days'
    );

    const created = await db.get('SELECT * FROM suppliers WHERE id = ?', id);
    return jsonResponse(created, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
