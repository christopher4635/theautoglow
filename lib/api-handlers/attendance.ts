import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleAttendanceGet(request: Request, db: DbClient): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month');
    const employeeId = searchParams.get('employee_id');

    const todayStr = new Date().toISOString().split('T')[0];
    const queryDate = date || todayStr;

    if (!month && !employeeId) {
      const records = await db.all<any>(
        `SELECT e.id as employee_id, e.name as employee_name, e.employee_code, e.designation, e.department,
                a.id as attendance_id, a.attendance_date, a.status, a.check_in, a.check_out,
                a.working_hours, a.late_minutes, a.overtime_hours, a.remarks
         FROM employees e
         LEFT JOIN attendance a ON e.id = a.employee_id AND a.attendance_date = ?
         WHERE e.status = 'Active'
         ORDER BY e.name ASC`,
        queryDate
      );

      const summary = {
        total: records.length,
        present: records.filter((r) => r.status === 'Present').length,
        absent: records.filter((r) => r.status === 'Absent').length,
        half_day: records.filter((r) => r.status === 'Half Day').length,
        leave: records.filter((r) => r.status?.includes('Leave')).length,
        not_marked: records.filter((r) => !r.status).length,
      };

      return jsonResponse({ date: queryDate, records, summary });
    }

    let query = `
      SELECT a.*, e.name as employee_name, e.employee_code, e.designation, e.department
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (month) {
      query += ` AND substr(a.attendance_date, 1, 7) = ?`;
      params.push(month);
    }

    if (employeeId) {
      query += ` AND a.employee_id = ?`;
      params.push(employeeId);
    }

    query += ` ORDER BY a.attendance_date DESC, e.name ASC`;

    const records = await db.all<any>(query, ...params);

    const stats = {
      total_days: records.length,
      present_count: records.filter((r) => r.status === 'Present').length,
      absent_count: records.filter((r) => r.status === 'Absent').length,
      half_day_count: records.filter((r) => r.status === 'Half Day').length,
      paid_leave_count: records.filter((r) => r.status === 'Paid Leave').length,
      unpaid_leave_count: records.filter((r) => r.status === 'Unpaid Leave').length,
      weekly_off_count: records.filter((r) => r.status === 'Weekly Off').length,
      holiday_count: records.filter((r) => r.status === 'Holiday').length,
      total_working_hours: records.reduce((acc, r) => acc + (r.working_hours || 0), 0),
      total_overtime_hours: records.reduce((acc, r) => acc + (r.overtime_hours || 0), 0),
    };

    return jsonResponse({ records, stats });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleAttendancePost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const {
      employee_id,
      attendance_date,
      status,
      check_in,
      check_out,
      working_hours,
      late_minutes,
      overtime_hours,
      remarks,
    } = body;

    if (!employee_id || !status) {
      return errorResponse('Employee and Status are required.', 400);
    }

    const dateStr = attendance_date || new Date().toISOString().split('T')[0];
    const id = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let defaultHours = 0;
    if (status === 'Present') defaultHours = 8.0;
    else if (status === 'Half Day') defaultHours = 4.0;

    await db.run(
      `INSERT INTO attendance (
        id, employee_id, attendance_date, status, check_in, check_out,
        working_hours, late_minutes, overtime_hours, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(employee_id, attendance_date) DO UPDATE SET
        status = excluded.status,
        check_in = excluded.check_in,
        check_out = excluded.check_out,
        working_hours = excluded.working_hours,
        late_minutes = excluded.late_minutes,
        overtime_hours = excluded.overtime_hours,
        remarks = excluded.remarks`,
      id,
      employee_id,
      dateStr,
      status,
      check_in || (status === 'Present' ? '09:00' : null),
      check_out || null,
      working_hours !== undefined ? parseFloat(working_hours) : defaultHours,
      late_minutes ? parseInt(late_minutes, 10) : 0,
      overtime_hours ? parseFloat(overtime_hours) : 0,
      remarks?.trim() || null
    );

    return jsonResponse({ success: true, message: `Attendance marked for ${dateStr}` });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
