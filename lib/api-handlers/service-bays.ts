import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleServiceBaysGet(db: DbClient): Promise<Response> {
  try {
    const bays = await db.all(`
      SELECT b.*,
        j.job_card_number,
        v.reg_number as vehicle_reg,
        v.make || ' ' || v.model as vehicle_make_model,
        c.name as customer_name
      FROM service_bays b
      LEFT JOIN job_cards j ON b.current_job_id = j.id
      LEFT JOIN vehicles v ON j.vehicle_id = v.id
      LEFT JOIN customers c ON j.customer_id = c.id
      ORDER BY b.name ASC
    `);
    return jsonResponse(bays);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleServiceBaysPut(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { id, current_status, current_job_id, current_vehicle_reg } = body;

    if (!id) {
      return errorResponse('Bay ID is required', 400);
    }

    await db.run(
      `UPDATE service_bays
       SET current_status = COALESCE(?, current_status),
           current_job_id = ?,
           current_vehicle_reg = ?
       WHERE id = ?`,
      current_status ?? null,
      current_job_id || null,
      current_vehicle_reg || null,
      id
    );

    const updated = await db.get('SELECT * FROM service_bays WHERE id = ?', id);
    return jsonResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
