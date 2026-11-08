export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
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

    const reminders = db.prepare(query).all(...params);
    return NextResponse.json(reminders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
      return NextResponse.json(
        { error: 'Customer, Vehicle, Service Name, and Next Due Date are required.' },
        { status: 400 }
      );
    }

    const id = `rem-${Date.now()}`;
    const lastDate = last_service_date || new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO service_reminders (
        id, customer_id, vehicle_id, service_id, service_name,
        last_service_date, next_due_date, recommended_odometer,
        reminder_type, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Upcoming', ?)
    `).run(
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

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, next_due_date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required.' }, { status: 400 });
    }

    db.prepare(`
      UPDATE service_reminders
      SET status = COALESCE(?, status),
          next_due_date = COALESCE(?, next_due_date),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(status, next_due_date, notes, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
