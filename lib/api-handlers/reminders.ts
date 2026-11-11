import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleRemindersGet(request: Request, db: DbClient): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');

    const todayStr = new Date().toISOString().split('T')[0];

    let query = `
      SELECT r.*,
             c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
             v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, v.odometer as current_odometer,
             CASE
               WHEN r.status = 'Completed' THEN 'Completed'
               WHEN r.status = 'Snoozed' THEN 'Snoozed'
               WHEN date(r.next_due_date) < date(?) THEN 'Overdue'
               WHEN date(r.next_due_date) = date(?) THEN 'Due Today'
               ELSE 'Upcoming'
             END as dynamic_status
      FROM service_reminders r
      JOIN customers c ON r.customer_id = c.id
      JOIN vehicles v ON r.vehicle_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [todayStr, todayStr];

    if (status) {
      if (status === 'Overdue') {
        query += ` AND date(r.next_due_date) < date(?) AND r.status NOT IN ('Completed', 'Snoozed')`;
        params.push(todayStr);
      } else if (status === 'Due Today') {
        query += ` AND date(r.next_due_date) = date(?) AND r.status NOT IN ('Completed', 'Snoozed')`;
        params.push(todayStr);
      } else if (status === 'Upcoming') {
        query += ` AND date(r.next_due_date) > date(?) AND r.status NOT IN ('Completed', 'Snoozed')`;
        params.push(todayStr);
      } else {
        query += ` AND r.status = ?`;
        params.push(status);
      }
    }

    if (customerId) {
      query += ` AND r.customer_id = ?`;
      params.push(customerId);
    }

    query += ` ORDER BY r.next_due_date ASC`;

    const reminders = await db.all(query, ...params);
    return jsonResponse(reminders);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleRemindersPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const {
      customer_id,
      vehicle_id,
      service_id,
      service_name,
      last_service_date,
      next_due_date,
      recommended_odometer,
      reminder_type,
      notes,
    } = body;

    if (!customer_id || !vehicle_id || !service_name || !next_due_date) {
      return errorResponse('Customer, Vehicle, Service Name, and Next Due Date are required.', 400);
    }

    const id = `rem-${Date.now()}`;
    const lastDate = last_service_date || new Date().toISOString().split('T')[0];

    await db.run(
      `INSERT INTO service_reminders (
        id, customer_id, vehicle_id, service_id, service_name,
        last_service_date, next_due_date, recommended_odometer,
        reminder_type, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Upcoming', ?)`,
      id,
      customer_id,
      vehicle_id,
      service_id || 'manual',
      service_name,
      lastDate,
      next_due_date,
      recommended_odometer ? parseInt(recommended_odometer, 10) : null,
      reminder_type || 'time_based',
      notes?.trim() || null
    );

    return jsonResponse({ success: true, id }, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleRemindersPut(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { id, status, next_due_date, notes } = body;

    if (!id) {
      return errorResponse('Reminder ID is required.', 400);
    }

    await db.run(
      `UPDATE service_reminders
       SET status = COALESCE(?, status),
           next_due_date = COALESCE(?, next_due_date),
           notes = COALESCE(?, notes)
       WHERE id = ?`,
      status ?? null,
      next_due_date ?? null,
      notes ?? null,
      id
    );

    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleReminderNotifyPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { reminder_id, channel, message_content } = body;

    const reminder = await db.get<any>(
      `SELECT r.*, c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
              v.reg_number as vehicle_reg
       FROM service_reminders r
       JOIN customers c ON r.customer_id = c.id
       JOIN vehicles v ON r.vehicle_id = v.id
       WHERE r.id = ?`,
      reminder_id
    );

    if (!reminder) {
      return errorResponse('Reminder not found', 404);
    }

    const recipient =
      channel === 'email' ? reminder.customer_email || reminder.customer_mobile : reminder.customer_mobile;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const commId = `comm-${Date.now()}`;
    await db.run(
      `INSERT INTO customer_communications (
        id, customer_id, template_type, channel, recipient, message_content, status, sent_at
      ) VALUES (?, ?, 'service_reminder', ?, ?, ?, 'Dispatched', ?)`,
      commId,
      reminder.customer_id,
      channel || 'whatsapp',
      recipient,
      message_content ||
        `Dear ${reminder.customer_name}, your ${reminder.vehicle_reg} is due for ${reminder.service_name} on ${reminder.next_due_date}. Please contact The Autoglow Sikkim to reserve your bay.`,
      nowStr
    );

    await db.run('UPDATE service_reminders SET last_notified_at = ? WHERE id = ?', nowStr, reminder_id);

    return jsonResponse({
      success: true,
      message: `Reminder recorded and queued for ${channel || 'WhatsApp'} dispatch to ${recipient}.`,
      last_notified_at: nowStr,
    });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
