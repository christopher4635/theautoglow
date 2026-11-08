export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const todayStr = new Date().toISOString().split('T')[0];

    let query = `
      SELECT e.*,
        (SELECT status FROM attendance WHERE employee_id = e.id AND attendance_date = ?) as today_attendance,
        (SELECT COUNT(*) FROM job_assignments WHERE employee_id = e.id) as total_jobs_assigned
      FROM employees e
      WHERE 1=1
    `;
    const params: any[] = [todayStr];

    if (department) {
      query += ` AND e.department = ?`;
      params.push(department);
    }

    if (status) {
      query += ` AND e.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (e.name LIKE ? OR e.employee_code LIKE ? OR e.mobile LIKE ? OR e.designation LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY e.name ASC`;

    const employees = db.prepare(query).all(...params);
    return NextResponse.json(employees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      mobile,
      email,
      designation,
      department,
      joining_date,
      monthly_salary,
      employment_type,
      emergency_contact,
      address,
    } = body;

    if (!name || !mobile || !email || !designation || !department) {
      return NextResponse.json(
        { error: 'Name, Mobile, Email, Designation and Department are required.' },
        { status: 400 }
      );
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number };
    const employee_code = `EMP-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `emp-${Date.now()}`;
    const joinDate = joining_date || new Date().toISOString().split('T')[0];

    const empTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO employees (
          id, employee_code, name, mobile, email, designation, department,
          joining_date, monthly_salary, employment_type, emergency_contact,
          address, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
      `).run(
        id,
        employee_code,
        name.trim(),
        mobile.trim(),
        email.trim(),
        designation.trim(),
        department.trim(),
        joinDate,
        monthly_salary ? parseFloat(monthly_salary) : 0,
        employment_type || 'Full-time',
        emergency_contact?.trim() || null,
        address?.trim() || null
      );

      // Initialize Leave Balances for current year
      const curYear = new Date().getFullYear();
      const insertBal = db.prepare(`
        INSERT INTO leave_balances (id, employee_id, year, leave_type, annual_entitlement, consumed_days, remaining_days)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `);
      insertBal.run(`lb-${id}-cl`, id, curYear, 'Casual Leave', 12, 12);
      insertBal.run(`lb-${id}-sl`, id, curYear, 'Sick Leave', 8, 8);
      insertBal.run(`lb-${id}-el`, id, curYear, 'Earned Leave', 15, 15);
    });

    empTx();

    const created = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
