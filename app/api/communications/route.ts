export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
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

    const logs = db.prepare(query).all(...params);
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, template_type, channel, recipient, message_content } = body;

    if (!customer_id || !recipient || !message_content) {
      return NextResponse.json({ error: 'Customer, Recipient, and Message are required.' }, { status: 400 });
    }

    const id = `comm-${Date.now()}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      INSERT INTO customer_communications (
        id, customer_id, template_type, channel, recipient, message_content, status, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'Sent', ?)
    `).run(
      id,
      customer_id,
      template_type || 'custom',
      channel || 'whatsapp',
      recipient,
      message_content,
      nowStr
    );

    return NextResponse.json({ success: true, id, status: 'Sent' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
