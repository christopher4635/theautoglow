import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleCustomersGet(request: Request, db: DbClient): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM vehicles WHERE customer_id = c.id) as vehicle_count,
        (SELECT GROUP_CONCAT(reg_number, ', ') FROM vehicles WHERE customer_id = c.id) as registered_vehicles
      FROM customers c
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (c.name LIKE ? OR c.mobile LIKE ? OR c.customer_code LIKE ? OR c.email LIKE ? OR c.id IN (SELECT customer_id FROM vehicles WHERE reg_number LIKE ?))`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (category) {
      query += ` AND c.category = ?`;
      params.push(category);
    }

    if (status) {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY c.created_at DESC`;

    const customers = await db.all(query, ...params);
    return jsonResponse(customers);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleCustomersPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { name, mobile, alt_mobile, email, address, city, category, remarks } = body;

    if (!name || !mobile) {
      return errorResponse('Name and primary mobile number are required.', 400);
    }

    const existing = await db.get<any>('SELECT id, name FROM customers WHERE mobile = ?', mobile);
    if (existing) {
      return errorResponse(
        `Customer with mobile ${mobile} already exists (${existing.name}). Duplicate prevented.`,
        409
      );
    }

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM customers');
    const customer_code = `CUST-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const id = `cust-${Date.now()}`;

    await db.run(
      `INSERT INTO customers (
        id, customer_code, name, mobile, alt_mobile, email, address, city,
        category, remarks, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      id,
      customer_code,
      String(name).trim(),
      String(mobile).trim(),
      alt_mobile?.trim() || null,
      email?.trim() || null,
      address?.trim() || null,
      city?.trim() || 'Gangtok',
      category || 'Regular',
      remarks?.trim() || null
    );

    const referralCode = `AGS-${String(name).split(' ')[0].toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
    await db.run(
      `INSERT INTO loyalty_accounts (id, customer_id, points_balance, tier, referral_code)
       VALUES (?, ?, 0, 'Silver', ?)`,
      `loy-${id}`,
      id,
      referralCode
    );

    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, 'Admin', 'CUSTOMER_REGISTER', 'customer', ?, ?)`,
      `aud-${Date.now()}`,
      id,
      JSON.stringify({ customer_code, name, mobile })
    );

    const created = await db.get('SELECT * FROM customers WHERE id = ?', id);
    return jsonResponse(created, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleCustomerByIdGet(id: string, db: DbClient): Promise<Response> {
  try {
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', id);
    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    const [vehicles, jobCards, invoices, payments, warranties, loyalty, reminders] = await Promise.all([
      db.all('SELECT * FROM vehicles WHERE customer_id = ? ORDER BY created_at DESC', id),
      db.all(
        `SELECT j.*, v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model
         FROM job_cards j
         JOIN vehicles v ON j.vehicle_id = v.id
         WHERE j.customer_id = ?
         ORDER BY j.created_at DESC`,
        id
      ),
      db.all(
        `SELECT i.*, v.reg_number as vehicle_reg
         FROM invoices i
         JOIN vehicles v ON i.vehicle_id = v.id
         WHERE i.customer_id = ?
         ORDER BY i.created_at DESC`,
        id
      ),
      db.all(
        `SELECT p.*, i.invoice_number
         FROM payments p
         JOIN invoices i ON p.invoice_id = i.id
         WHERE p.customer_id = ?
         ORDER BY p.payment_date DESC`,
        id
      ),
      db.all(
        `SELECT w.*, v.reg_number as vehicle_reg
         FROM warranties w
         JOIN vehicles v ON w.vehicle_id = v.id
         WHERE w.customer_id = ?
         ORDER BY w.end_date DESC`,
        id
      ),
      db.get('SELECT * FROM loyalty_accounts WHERE customer_id = ?', id),
      db.all(
        `SELECT r.*, v.reg_number as vehicle_reg
         FROM service_reminders r
         JOIN vehicles v ON r.vehicle_id = v.id
         WHERE r.customer_id = ?
         ORDER BY r.next_due_date ASC`,
        id
      ),
    ]);

    return jsonResponse({ customer, vehicles, jobCards, invoices, payments, warranties, loyalty, reminders });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleCustomerByIdPut(request: Request, id: string, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { name, mobile, alt_mobile, email, address, city, category, remarks, status } = body;

    if (mobile) {
      const collision = await db.get('SELECT id FROM customers WHERE mobile = ? AND id != ?', mobile, id);
      if (collision) {
        return errorResponse('Another customer is already registered with this mobile number.', 409);
      }
    }

    await db.run(
      `UPDATE customers
       SET name = COALESCE(?, name),
           mobile = COALESCE(?, mobile),
           alt_mobile = COALESCE(?, alt_mobile),
           email = COALESCE(?, email),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           category = COALESCE(?, category),
           remarks = COALESCE(?, remarks),
           status = COALESCE(?, status),
           updated_at = datetime('now', 'localtime')
       WHERE id = ?`,
      name ?? null,
      mobile ?? null,
      alt_mobile ?? null,
      email ?? null,
      address ?? null,
      city ?? null,
      category ?? null,
      remarks ?? null,
      status ?? null,
      id
    );

    const updated = await db.get('SELECT * FROM customers WHERE id = ?', id);
    return jsonResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleCustomerByIdDelete(id: string, db: DbClient): Promise<Response> {
  try {
    const unpaid = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM invoices WHERE customer_id = ? AND payment_status != 'Paid'",
      id
    );
    if ((unpaid?.count ?? 0) > 0) {
      return errorResponse(
        'Cannot delete customer with active or unpaid invoices. Archive customer status instead.',
        400
      );
    }

    await db.run('DELETE FROM customers WHERE id = ?', id);
    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
