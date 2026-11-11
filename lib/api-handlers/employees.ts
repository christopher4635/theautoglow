import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleEmployeesGet(request: Request, db: DbClient): Promise<Response> {
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

    const employees = await db.all(query, ...params);
    return jsonResponse(employees);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleEmployeesPost(request: Request, db: DbClient): Promise<Response> {
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
      return errorResponse('Name, Mobile, Email, Designation and Department are required.', 400);
    }

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM employees');
    const employee_code = `EMP-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const id = `emp-${Date.now()}`;
    const joinDate = joining_date || new Date().toISOString().split('T')[0];

    await db.run(
      `INSERT INTO employees (
        id, employee_code, name, mobile, email, designation, department,
        joining_date, monthly_salary, employment_type, emergency_contact,
        address, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      id,
      employee_code,
      String(name).trim(),
      String(mobile).trim(),
      String(email).trim(),
      String(designation).trim(),
      String(department).trim(),
      joinDate,
      monthly_salary ? parseFloat(monthly_salary) : 0,
      employment_type || 'Full-time',
      emergency_contact?.trim() || null,
      address?.trim() || null
    );

    const curYear = new Date().getFullYear();
    await db.run(
      `INSERT INTO leave_balances (id, employee_id, year, leave_type, annual_entitlement, consumed_days, remaining_days)
       VALUES (?, ?, ?, 'Casual Leave', 12, 0, 12)`,
      `lb-${id}-cl`,
      id,
      curYear
    );
    await db.run(
      `INSERT INTO leave_balances (id, employee_id, year, leave_type, annual_entitlement, consumed_days, remaining_days)
       VALUES (?, ?, ?, 'Sick Leave', 8, 0, 8)`,
      `lb-${id}-sl`,
      id,
      curYear
    );
    await db.run(
      `INSERT INTO leave_balances (id, employee_id, year, leave_type, annual_entitlement, consumed_days, remaining_days)
       VALUES (?, ?, ?, 'Earned Leave', 15, 0, 15)`,
      `lb-${id}-el`,
      id,
      curYear
    );

    const created = await db.get('SELECT * FROM employees WHERE id = ?', id);
    return jsonResponse(created, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
