export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const month = searchParams.get('month'); // YYYY-MM
    const status = searchParams.get('status');

    let query = `
      SELECT l.*,
             e.name as employee_name, e.employee_code, e.designation, e.department
      FROM leave_applications l
      JOIN employees e ON l.employee_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (employeeId) {
      query += ` AND l.employee_id = ?`;
      params.push(employeeId);
    }

    if (status) {
      query += ` AND l.status = ?`;
      params.push(status);
    }

    if (month) {
      query += ` AND (substr(l.start_date, 1, 7) = ? OR substr(l.end_date, 1, 7) = ?)`;
      params.push(month, month);
    }

    query += ` ORDER BY l.start_date DESC`;

    const applications = db.prepare(query).all(...params);

    // Fetch leave balances
    const balances = db.prepare(`
      SELECT lb.*, e.name as employee_name, e.employee_code
      FROM leave_balances lb
      JOIN employees e ON lb.employee_id = e.id
      ORDER BY e.name ASC, lb.leave_type ASC
    `).all();

    return NextResponse.json({ applications, balances });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employee_id, leave_type, start_date, end_date, total_days, reason } = body;

    if (!employee_id || !leave_type || !start_date || !end_date || !reason) {
      return NextResponse.json(
        { error: 'Employee, Leave Type, Dates, and Reason are required.' },
        { status: 400 }
      );
    }

    const d1 = new Date(start_date);
    const d2 = new Date(end_date);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const days = total_days ? parseInt(total_days, 10) : Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check balance for paid leave types
    if (leave_type !== 'Unpaid Leave') {
      const balance = db.prepare(`
        SELECT remaining_days FROM leave_balances
        WHERE employee_id = ? AND leave_type = ? AND year = ?
      `).get(employee_id, leave_type, d1.getFullYear()) as any;

      if (balance && balance.remaining_days < days) {
        return NextResponse.json(
          {
            error: `Insufficient ${leave_type} balance. Remaining: ${balance.remaining_days} days, Requested: ${days} days. Apply for Unpaid Leave or adjust duration.`,
          },
          { status: 400 }
        );
      }
    }

    const id = `leave-${Date.now()}`;
    db.prepare(`
      INSERT INTO leave_applications (
        id, employee_id, leave_type, start_date, end_date, total_days, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
    `).run(id, employee_id, leave_type, start_date, end_date, days, reason.trim());

    // Generate notification for manager
    const emp = db.prepare('SELECT name FROM employees WHERE id = ?').get(employee_id) as any;
    db.prepare(`
      INSERT INTO notifications (id, title, message, category, link_url, is_read)
      VALUES (?, 'New Leave Request', ?, 'staff', '/leave', 0)
    `).run(`notif-${Date.now()}`, `${emp?.name || 'An employee'} applied for ${days} days of ${leave_type} (${start_date} to ${end_date}).`);

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, approval_remarks, approved_by } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Leave Application ID and Status are required.' }, { status: 400 });
    }

    const app = db.prepare('SELECT * FROM leave_applications WHERE id = ?').get(id) as any;
    if (!app) {
      return NextResponse.json({ error: 'Leave application not found' }, { status: 404 });
    }

    const decDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const leaveTx = db.transaction(() => {
      // 1. Update application status
      db.prepare(`
        UPDATE leave_applications
        SET status = ?, approval_remarks = ?, approved_by = ?, decided_at = ?
        WHERE id = ?
      `).run(status, approval_remarks || null, approved_by || 'Manager', decDate, id);

      // 2. If APPROVED: Deduct leave balance and auto-reflect in attendance!
      if (status === 'Approved' && app.status !== 'Approved') {
        const year = new Date(app.start_date).getFullYear();

        if (app.leave_type !== 'Unpaid Leave') {
          db.prepare(`
            UPDATE leave_balances
            SET consumed_days = consumed_days + ?,
                remaining_days = remaining_days - ?
            WHERE employee_id = ? AND leave_type = ? AND year = ?
          `).run(app.total_days, app.total_days, app.employee_id, app.leave_type, year);
        }

        // Auto-mark attendance records for the leave dates
        const cur = new Date(app.start_date);
        const end = new Date(app.end_date);
        const attendanceStatus = app.leave_type === 'Unpaid Leave' ? 'Unpaid Leave' : 'Paid Leave';

        while (cur <= end) {
          const dateStr = cur.toISOString().split('T')[0];
          db.prepare(`
            INSERT INTO attendance (id, employee_id, attendance_date, status, working_hours, remarks)
            VALUES (?, ?, ?, ?, 0, ?)
            ON CONFLICT(employee_id, attendance_date) DO UPDATE SET
              status = excluded.status,
              working_hours = 0,
              remarks = excluded.remarks
          `).run(
            `att-auto-${Date.now()}-${Math.random()}`,
            app.employee_id,
            dateStr,
            attendanceStatus,
            `Approved ${app.leave_type}: ${app.reason}`
          );
          cur.setDate(cur.getDate() + 1);
        }
      }

      // 3. If REJECTED after previously approved: revert balance
      if (status === 'Rejected' && app.status === 'Approved') {
        const year = new Date(app.start_date).getFullYear();
        if (app.leave_type !== 'Unpaid Leave') {
          db.prepare(`
            UPDATE leave_balances
            SET consumed_days = MAX(0, consumed_days - ?),
                remaining_days = remaining_days + ?
            WHERE employee_id = ? AND leave_type = ? AND year = ?
          `).run(app.total_days, app.total_days, app.employee_id, app.leave_type, year);
        }
      }
    });

    leaveTx();

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
