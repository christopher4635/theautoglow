export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reminder_id, channel, message_content } = body;

    const reminder = db.prepare(`
      SELECT r.*, c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
             v.reg_number as vehicle_reg
      FROM service_reminders r
      JOIN customers c ON r.customer_id = c.id
      JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.id = ?
    `).get(reminder_id) as any;

    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    const recipient = channel === 'email' ? reminder.customer_email || reminder.customer_mobile : reminder.customer_mobile;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Record customer communication
    const commId = `comm-${Date.now()}`;
    db.prepare(`
      INSERT INTO customer_communications (
        id, customer_id, template_type, channel, recipient, message_content, status, sent_at
      ) VALUES (?, ?, 'service_reminder', ?, ?, ?, 'Dispatched', ?)
    `).run(
      commId,
      reminder.customer_id,
      channel || 'whatsapp',
      recipient,
      message_content || `Dear ${reminder.customer_name}, your ${reminder.vehicle_reg} is due for ${reminder.service_name} on ${reminder.next_due_date}. Please contact The Autoglow Sikkim at +91 98320 12345 to reserve your bay.`,
      nowStr
    );

    // Update reminder's last_notified_at
    db.prepare('UPDATE service_reminders SET last_notified_at = ? WHERE id = ?').run(nowStr, reminder_id);

    return NextResponse.json({
      success: true,
      message: `Reminder recorded and queued for ${channel || 'WhatsApp'} dispatch to ${recipient}.`,
      last_notified_at: nowStr,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
