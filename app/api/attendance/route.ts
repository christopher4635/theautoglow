export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month'); // YYYY-MM
    const employeeId = searchParams.get('employee_id');

    const todayStr = new Date().toISOString().split('T')[0];
    const queryDate = date || todayStr;

    // Daily attendance view
    if (!month && !employeeId) {
      const records = db.prepare(`
        SELECT e.id as employee_id, e.name as employee_name, e.employee_code, e.designation, e.department,
               a.id as attendance_id, a.attendance_date, a.status, a.check_in, a.check_out,
               a.working_hours, a.late_minutes, a.overtime_hours, a.remarks
        FROM employees e
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.attendance_date = ?
        WHERE e.status = 'Active'
        ORDER BY e.name ASC
      `).all(queryDate);

      // Daily summary metrics
      const summary = {
        total: records.length,
        present: records.filter((r: any) => r.status === 'Present').length,
        absent: records.filter((r: any) => r.status === 'Absent').length,
        half_day: records.filter((r: any) => r.status === 'Half Day').length,
        leave: records.filter((r: any) => r.status?.includes('Leave')).length,
        not_marked: records.filter((r: any) => !r.status).length,
      };

      return NextResponse.json({ date: queryDate, records, summary });
    }

    // Monthly view or individual view
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

    const records = db.prepare(query).all(...params);

    // Calculate aggregated statistics
    const stats = {
      total_days: records.length,
      present_count: records.filter((r: any) => r.status === 'Present').length,
      absent_count: records.filter((r: any) => r.status === 'Absent').length,
      half_day_count: records.filter((r: any) => r.status === 'Half Day').length,
      paid_leave_count: records.filter((r: any) => r.status === 'Paid Leave').length,
      unpaid_leave_count: records.filter((r: any) => r.status === 'Unpaid Leave').length,
      weekly_off_count: records.filter((r: any) => r.status === 'Weekly Off').length,
      holiday_count: records.filter((r: any) => r.status === 'Holiday').length,
      total_working_hours: records.reduce((acc: number, r: any) => acc + (r.working_hours || 0), 0),
      total_overtime_hours: records.reduce((acc: number, r: any) => acc + (r.overtime_hours || 0), 0),
    };

    return NextResponse.json({ records, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employee_id,
      attendance_date,
      status, // 'Present', 'Absent', 'Half Day', 'Paid Leave', 'Unpaid Leave', 'Weekly Off', 'Holiday'
      check_in,
      check_out,
      working_hours,
      late_minutes,
      overtime_hours,
      remarks,
    } = body;

    if (!employee_id || !status) {
      return NextResponse.json({ error: 'Employee and Status are required.' }, { status: 400 });
    }

    const dateStr = attendance_date || new Date().toISOString().split('T')[0];
    const id = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let defaultHours = 0;
    if (status === 'Present') defaultHours = 8.0;
    else if (status === 'Half Day') defaultHours = 4.0;

    // Use INSERT OR REPLACE to prevent duplicate attendance records for the same employee and date
    db.prepare(`
      INSERT INTO attendance (
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
        remarks = excluded.remarks
    `).run(
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

    return NextResponse.json({ success: true, message: `Attendance marked for ${dateStr}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
