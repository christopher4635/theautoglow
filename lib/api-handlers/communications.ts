import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleCommunicationsGet(request: Request, db: DbClient): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    let query = `
      SELECT comm.*, c.name as customer_name, c.mobile as customer_mobile
      FROM customer_communications comm
      JOIN customers c ON comm.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (customerId) {
      query += ` AND comm.customer_id = ?`;
      params.push(customerId);
    }

    query += ` ORDER BY comm.sent_at DESC LIMIT 50`;

    const logs = await db.all(query, ...params);
    return jsonResponse(logs);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleCommunicationsPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { customer_id, template_type, channel, recipient, message_content } = body;

    if (!customer_id || !recipient || !message_content) {
      return errorResponse('Customer, Recipient, and Message are required.', 400);
    }

    const id = `comm-${Date.now()}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.run(
      `INSERT INTO customer_communications (
        id, customer_id, template_type, channel, recipient, message_content, status, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'Sent', ?)`,
      id,
      customer_id,
      template_type || 'custom',
      channel || 'whatsapp',
      recipient,
      message_content,
      nowStr
    );

    return jsonResponse({ success: true, id, status: 'Sent' }, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
