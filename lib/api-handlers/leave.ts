import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleLeaveGet(request: Request, db: DbClient): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const month = searchParams.get('month');
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

    const [applications, balances] = await Promise.all([
      db.all(query, ...params),
      db.all(
        `SELECT lb.*, e.name as employee_name, e.employee_code
         FROM leave_balances lb
         JOIN employees e ON lb.employee_id = e.id
         ORDER BY e.name ASC, lb.leave_type ASC`
      ),
    ]);

    return jsonResponse({ applications, balances });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleLeavePost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { employee_id, leave_type, start_date, end_date, total_days, reason } = body;

    if (!employee_id || !leave_type || !start_date || !end_date || !reason) {
      return errorResponse('Employee, Leave Type, Dates, and Reason are required.', 400);
    }

    const d1 = new Date(start_date);
    const d2 = new Date(end_date);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const days = total_days ? parseInt(total_days, 10) : Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (leave_type !== 'Unpaid Leave') {
      const balance = await db.get<any>(
        `SELECT remaining_days FROM leave_balances
         WHERE employee_id = ? AND leave_type = ? AND year = ?`,
        employee_id,
        leave_type,
        d1.getFullYear()
      );

      if (balance && balance.remaining_days < days) {
        return errorResponse(
          `Insufficient ${leave_type} balance. Remaining: ${balance.remaining_days} days, Requested: ${days} days. Apply for Unpaid Leave or adjust duration.`,
          400
        );
      }
    }

    const id = `leave-${Date.now()}`;
    await db.run(
      `INSERT INTO leave_applications (
        id, employee_id, leave_type, start_date, end_date, total_days, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      id,
      employee_id,
      leave_type,
      start_date,
      end_date,
      days,
      String(reason).trim()
    );

    const emp = await db.get<any>('SELECT name FROM employees WHERE id = ?', employee_id);
    await db.run(
      `INSERT INTO notifications (id, title, message, category, link_url, is_read)
       VALUES (?, 'New Leave Request', ?, 'staff', '/leave', 0)`,
      `notif-${Date.now()}`,
      `${emp?.name || 'An employee'} applied for ${days} days of ${leave_type} (${start_date} to ${end_date}).`
    );

    return jsonResponse({ success: true, id }, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleLeavePut(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { id, status, approval_remarks, approved_by } = body;

    if (!id || !status) {
      return errorResponse('Leave Application ID and Status are required.', 400);
    }

    const app = await db.get<any>('SELECT * FROM leave_applications WHERE id = ?', id);
    if (!app) {
      return errorResponse('Leave application not found', 404);
    }

    const decDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.run(
      `UPDATE leave_applications
       SET status = ?, approval_remarks = ?, approved_by = ?, decided_at = ?
       WHERE id = ?`,
      status,
      approval_remarks || null,
      approved_by || 'Manager',
      decDate,
      id
    );

    if (status === 'Approved' && app.status !== 'Approved') {
      const year = new Date(app.start_date).getFullYear();

      if (app.leave_type !== 'Unpaid Leave') {
        await db.run(
          `UPDATE leave_balances
           SET consumed_days = consumed_days + ?, remaining_days = remaining_days - ?
           WHERE employee_id = ? AND leave_type = ? AND year = ?`,
          app.total_days,
          app.total_days,
          app.employee_id,
          app.leave_type,
          year
        );
      }

      const cur = new Date(app.start_date);
      const end = new Date(app.end_date);
      const attendanceStatus = app.leave_type === 'Unpaid Leave' ? 'Unpaid Leave' : 'Paid Leave';

      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0];
        await db.run(
          `INSERT INTO attendance (id, employee_id, attendance_date, status, working_hours, remarks)
           VALUES (?, ?, ?, ?, 0, ?)
           ON CONFLICT(employee_id, attendance_date) DO UPDATE SET
             status = excluded.status,
             working_hours = 0,
             remarks = excluded.remarks`,
          `att-auto-${Date.now()}-${Math.random()}`,
          app.employee_id,
          dateStr,
          attendanceStatus,
          `Approved ${app.leave_type}: ${app.reason}`
        );
        cur.setDate(cur.getDate() + 1);
      }
    }

    if (status === 'Rejected' && app.status === 'Approved') {
      const year = new Date(app.start_date).getFullYear();
      if (app.leave_type !== 'Unpaid Leave') {
        await db.run(
          `UPDATE leave_balances
           SET consumed_days = MAX(0, consumed_days - ?), remaining_days = remaining_days + ?
           WHERE employee_id = ? AND leave_type = ? AND year = ?`,
          app.total_days,
          app.total_days,
          app.employee_id,
          app.leave_type,
          year
        );
      }
    }

    return jsonResponse({ success: true, status });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
