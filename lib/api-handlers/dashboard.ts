import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleDashboardGet(request: Request, db: DbClient): Promise<Response> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.substring(0, 7);

    const [
      totalCustomersRow,
      totalVehiclesRow,
      todayAppointmentsRow,
      inServiceJobsRow,
      completedTodayRow,
      todayInvoicedRow,
      todayCollectionsRow,
      totalOutstandingRow,
      monthlyRevenueRow,
      monthlyCollectionsRow,
      monthlyExpensesRow,
      monthlyConsumablesRow,
      staffPresentRow,
      staffAbsentRow,
      staffOnLeaveRow,
      lowStockRow,
      assetsDueRow,
      upcomingWarrantyRow,
      pendingRemindersRow,
    ] = await Promise.all([
      db.get<{ count: number }>('SELECT COUNT(*) as count FROM customers'),
      db.get<{ count: number }>('SELECT COUNT(*) as count FROM vehicles'),
      db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status != 'Cancelled'`,
        todayStr
      ),
      db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM job_cards WHERE status IN ('Vehicle Received', 'Work in Progress', 'Quality Check')`
      ),
      db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM job_cards WHERE status IN ('Completed', 'Delivered') AND substr(created_at, 1, 10) = ?`,
        todayStr
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE invoice_date = ?`,
        todayStr
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date = ?`,
        todayStr
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(balance_amount), 0) as total FROM invoices WHERE payment_status IN ('Unpaid', 'Partially Paid')`
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE substr(invoice_date, 1, 7) = ?`,
        currentMonth
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE substr(payment_date, 1, 7) = ?`,
        currentMonth
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE substr(expense_date, 1, 7) = ?`,
        currentMonth
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(total_cost), 0) as total FROM stock_consumptions WHERE substr(recorded_at, 1, 7) = ?`,
        currentMonth
      ),
      db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM attendance WHERE attendance_date = ? AND status = 'Present'`,
        todayStr
      ),
      db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM attendance WHERE attendance_date = ? AND status = 'Absent'`,
        todayStr
      ),
      db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM attendance WHERE attendance_date = ? AND status LIKE '%Leave%'`,
        todayStr
      ),
      db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM inventory_products WHERE current_stock <= min_stock_level`
      ),
      db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM assets WHERE status = 'Under Maintenance' OR condition IN ('Maintenance Required', 'Damaged')`
      ),
      db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM warranties WHERE status = 'Active' AND date(end_date) BETWEEN date(?) AND date(?, '+30 days')`,
        todayStr,
        todayStr
      ),
      db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM service_reminders WHERE status IN ('Upcoming', 'Due Today', 'Overdue')`
      ),
    ]);

    const monthlyRevenue = monthlyRevenueRow?.total ?? 0;
    const monthlyExpenses = monthlyExpensesRow?.total ?? 0;
    const monthlyConsumablesCost = monthlyConsumablesRow?.total ?? 0;
    const monthlyOperatingProfit = monthlyRevenue - monthlyExpenses - monthlyConsumablesCost;

    const [
      appointments,
      receivedJobs,
      inProgressJobs,
      qualityCheckJobs,
      readyDeliveryJobs,
      bays,
      lowStock,
      pendingInvoices,
      urgentReminders,
      popularServices,
    ] = await Promise.all([
      db.all(
        `SELECT a.*, c.name as customer_name, c.mobile as customer_mobile,
                v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model,
                b.name as bay_name, e.name as staff_name
         FROM appointments a
         JOIN customers c ON a.customer_id = c.id
         JOIN vehicles v ON a.vehicle_id = v.id
         LEFT JOIN service_bays b ON a.bay_id = b.id
         LEFT JOIN employees e ON a.assigned_staff_id = e.id
         WHERE a.appointment_date = ?
         ORDER BY a.appointment_time ASC`,
        todayStr
      ),
      db.all(
        `SELECT j.*, c.name as customer_name, v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, b.name as bay_name
         FROM job_cards j
         JOIN customers c ON j.customer_id = c.id
         JOIN vehicles v ON j.vehicle_id = v.id
         LEFT JOIN service_bays b ON j.bay_id = b.id
         WHERE j.status = 'Vehicle Received'`
      ),
      db.all(
        `SELECT j.*, c.name as customer_name, v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, b.name as bay_name, e.name as primary_staff_name
         FROM job_cards j
         JOIN customers c ON j.customer_id = c.id
         JOIN vehicles v ON j.vehicle_id = v.id
         LEFT JOIN service_bays b ON j.bay_id = b.id
         LEFT JOIN employees e ON j.primary_staff_id = e.id
         WHERE j.status = 'Work in Progress'`
      ),
      db.all(
        `SELECT j.*, c.name as customer_name, v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, b.name as bay_name
         FROM job_cards j
         JOIN customers c ON j.customer_id = c.id
         JOIN vehicles v ON j.vehicle_id = v.id
         LEFT JOIN service_bays b ON j.bay_id = b.id
         WHERE j.status = 'Quality Check'`
      ),
      db.all(
        `SELECT j.*, c.name as customer_name, v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model,
                i.invoice_number, i.total_amount, i.balance_amount, i.payment_status
         FROM job_cards j
         JOIN customers c ON j.customer_id = c.id
         JOIN vehicles v ON j.vehicle_id = v.id
         LEFT JOIN invoices i ON i.job_card_id = j.id
         WHERE j.status = 'Completed'`
      ),
      db.all(`SELECT * FROM service_bays ORDER BY name ASC`),
      db.all(
        `SELECT id, sku, name, current_stock, min_stock_level, unit FROM inventory_products WHERE current_stock <= min_stock_level`
      ),
      db.all(
        `SELECT i.id, i.invoice_number, i.total_amount, i.balance_amount, c.name as customer_name, c.mobile as customer_mobile
         FROM invoices i
         JOIN customers c ON i.customer_id = c.id
         WHERE i.payment_status IN ('Unpaid', 'Partially Paid')
         ORDER BY i.balance_amount DESC LIMIT 5`
      ),
      db.all(
        `SELECT r.*, c.name as customer_name, c.mobile as customer_mobile, v.reg_number as vehicle_reg
         FROM service_reminders r
         JOIN customers c ON r.customer_id = c.id
         JOIN vehicles v ON r.vehicle_id = v.id
         WHERE r.status IN ('Due Today', 'Overdue')
         LIMIT 5`
      ),
      db.all(
        `SELECT s.name, COUNT(jcs.id) as jobs_count, SUM(jcs.price) as total_revenue
         FROM job_card_services jcs
         JOIN services s ON jcs.service_id = s.id
         GROUP BY s.id
         ORDER BY jobs_count DESC
         LIMIT 5`
      ),
    ]);

    return jsonResponse({
      metrics: {
        totalCustomers: totalCustomersRow?.count ?? 0,
        totalVehicles: totalVehiclesRow?.count ?? 0,
        todayAppointments: todayAppointmentsRow?.count ?? 0,
        inServiceJobs: inServiceJobsRow?.count ?? 0,
        completedToday: completedTodayRow?.count ?? 0,
        todayInvoiced: todayInvoicedRow?.total ?? 0,
        todayCollections: todayCollectionsRow?.total ?? 0,
        totalOutstanding: totalOutstandingRow?.total ?? 0,
        monthlyRevenue,
        monthlyCollections: monthlyCollectionsRow?.total ?? 0,
        monthlyExpenses,
        monthlyConsumablesCost,
        monthlyOperatingProfit,
        staffPresent: staffPresentRow?.count ?? 0,
        staffAbsent: staffAbsentRow?.count ?? 0,
        staffOnLeave: staffOnLeaveRow?.count ?? 0,
        lowStockCount: lowStockRow?.count ?? 0,
        assetsDueMaintenance: assetsDueRow?.count ?? 0,
        upcomingWarrantyExp: upcomingWarrantyRow?.count ?? 0,
        pendingReminders: pendingRemindersRow?.count ?? 0,
      },
      operations: {
        appointments,
        receivedJobs,
        inProgressJobs,
        qualityCheckJobs,
        readyDeliveryJobs,
      },
      bays,
      alerts: {
        lowStock,
        pendingInvoices,
        urgentReminders,
      },
      popularServices,
    });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
