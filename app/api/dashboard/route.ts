export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today';

    const todayStr = new Date().toISOString().split('T')[0];

    // Customer & Vehicle totals
    const totalCustomers = (db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }).count;
    const totalVehicles = (db.prepare('SELECT COUNT(*) as count FROM vehicles').get() as { count: number }).count;

    // Today's appointments
    const todayAppointments = (
      db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status != 'Cancelled'`).get(todayStr) as { count: number }
    ).count;

    // Vehicles in service right now (status in 'Vehicle Received', 'Work in Progress', 'Quality Check')
    const inServiceJobs = (
      db.prepare(`SELECT COUNT(*) as count FROM job_cards WHERE status IN ('Vehicle Received', 'Work in Progress', 'Quality Check')`).get() as { count: number }
    ).count;

    // Completed jobs today
    const completedToday = (
      db.prepare(`SELECT COUNT(*) as count FROM job_cards WHERE status IN ('Completed', 'Delivered') AND substr(created_at, 1, 10) = ?`).get(todayStr) as { count: number }
    ).count;

    // Financial Metrics
    // Invoiced revenue today
    const todayInvoiced = (
      db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE invoice_date = ?`).get(todayStr) as { total: number }
    ).total;

    // Collections today (actual cash/UPI collected)
    const todayCollections = (
      db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date = ?`).get(todayStr) as { total: number }
    ).total;

    // Total outstanding receivables across all unpaid/partially paid invoices
    const totalOutstanding = (
      db.prepare(`SELECT COALESCE(SUM(balance_amount), 0) as total FROM invoices WHERE payment_status IN ('Unpaid', 'Partially Paid')`).get() as { total: number }
    ).total;

    // Current month revenue
    const currentMonth = todayStr.substring(0, 7); // YYYY-MM
    const monthlyRevenue = (
      db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE substr(invoice_date, 1, 7) = ?`).get(currentMonth) as { total: number }
    ).total;

    const monthlyCollections = (
      db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE substr(payment_date, 1, 7) = ?`).get(currentMonth) as { total: number }
    ).total;

    const monthlyExpenses = (
      db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE substr(expense_date, 1, 7) = ?`).get(currentMonth) as { total: number }
    ).total;

    // Material cost of consumables used this month
    const monthlyConsumablesCost = (
      db.prepare(`SELECT COALESCE(SUM(total_cost), 0) as total FROM stock_consumptions WHERE substr(recorded_at, 1, 7) = ?`).get(currentMonth) as { total: number }
    ).total;

    const monthlyOperatingProfit = monthlyRevenue - monthlyExpenses - monthlyConsumablesCost;

    // Staff present today
    const staffPresent = (
      db.prepare(`SELECT COUNT(*) as count FROM attendance WHERE attendance_date = ? AND status = 'Present'`).get(todayStr) as { count: number }
    ).count;

    const staffAbsent = (
      db.prepare(`SELECT COUNT(*) as count FROM attendance WHERE attendance_date = ? AND status = 'Absent'`).get(todayStr) as { count: number }
    ).count;

    const staffOnLeave = (
      db.prepare(`SELECT COUNT(*) as count FROM attendance WHERE attendance_date = ? AND status LIKE '%Leave%'`).get(todayStr) as { count: number }
    ).count;

    // Low stock items count
    const lowStockCount = (
      db.prepare(`SELECT COUNT(*) as count FROM inventory_products WHERE current_stock <= min_stock_level`).get() as { count: number }
    ).count;

    // Assets due for maintenance
    const assetsDueMaintenance = (
      db.prepare(`SELECT COUNT(*) as count FROM assets WHERE status = 'Under Maintenance' OR condition IN ('Maintenance Required', 'Damaged')`).get() as { count: number }
    ).count;

    // Upcoming warranty expirations (next 30 days)
    const upcomingWarrantyExp = (
      db.prepare(`SELECT COUNT(*) as count FROM warranties WHERE status = 'Active' AND date(end_date) BETWEEN date(?) AND date(?, '+30 days')`).get(todayStr, todayStr) as { count: number }
    ).count;

    // Upcoming service reminders
    const pendingReminders = (
      db.prepare(`SELECT COUNT(*) as count FROM service_reminders WHERE status IN ('Upcoming', 'Due Today', 'Overdue')`).get() as { count: number }
    ).count;

    // Operations Pipeline items
    const todayOperations = {
      appointments: db.prepare(`
        SELECT a.*, c.name as customer_name, c.mobile as customer_mobile,
               v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model,
               b.name as bay_name, e.name as staff_name
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN vehicles v ON a.vehicle_id = v.id
        LEFT JOIN service_bays b ON a.bay_id = b.id
        LEFT JOIN employees e ON a.assigned_staff_id = e.id
        WHERE a.appointment_date = ?
        ORDER BY a.appointment_time ASC
      `).all(todayStr),

      receivedJobs: db.prepare(`
        SELECT j.*, c.name as customer_name, v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, b.name as bay_name
        FROM job_cards j
        JOIN customers c ON j.customer_id = c.id
        JOIN vehicles v ON j.vehicle_id = v.id
        LEFT JOIN service_bays b ON j.bay_id = b.id
        WHERE j.status = 'Vehicle Received'
      `).all(),

      inProgressJobs: db.prepare(`
        SELECT j.*, c.name as customer_name, v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, b.name as bay_name, e.name as primary_staff_name
        FROM job_cards j
        JOIN customers c ON j.customer_id = c.id
        JOIN vehicles v ON j.vehicle_id = v.id
        LEFT JOIN service_bays b ON j.bay_id = b.id
        LEFT JOIN employees e ON j.primary_staff_id = e.id
        WHERE j.status = 'Work in Progress'
      `).all(),

      qualityCheckJobs: db.prepare(`
        SELECT j.*, c.name as customer_name, v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, b.name as bay_name
        FROM job_cards j
        JOIN customers c ON j.customer_id = c.id
        JOIN vehicles v ON j.vehicle_id = v.id
        LEFT JOIN service_bays b ON j.bay_id = b.id
        WHERE j.status = 'Quality Check'
      `).all(),

      readyDeliveryJobs: db.prepare(`
        SELECT j.*, c.name as customer_name, v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model,
               i.invoice_number, i.total_amount, i.balance_amount, i.payment_status
        FROM job_cards j
        JOIN customers c ON j.customer_id = c.id
        JOIN vehicles v ON j.vehicle_id = v.id
        LEFT JOIN invoices i ON i.job_card_id = j.id
        WHERE j.status = 'Completed'
      `).all(),
    };

    // Service Bays Live Status
    const bays = db.prepare(`SELECT * FROM service_bays ORDER BY name ASC`).all();

    // Alerts
    const alerts = {
      lowStock: db.prepare(`SELECT id, sku, name, current_stock, min_stock_level, unit FROM inventory_products WHERE current_stock <= min_stock_level`).all(),
      pendingInvoices: db.prepare(`
        SELECT i.id, i.invoice_number, i.total_amount, i.balance_amount, c.name as customer_name, c.mobile as customer_mobile
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.payment_status IN ('Unpaid', 'Partially Paid')
        ORDER BY i.balance_amount DESC LIMIT 5
      `).all(),
      urgentReminders: db.prepare(`
        SELECT r.*, c.name as customer_name, c.mobile as customer_mobile, v.reg_number as vehicle_reg
        FROM service_reminders r
        JOIN customers c ON r.customer_id = c.id
        JOIN vehicles v ON r.vehicle_id = v.id
        WHERE r.status IN ('Due Today', 'Overdue')
        LIMIT 5
      `).all()
    };

    // Popular Services
    const popularServices = db.prepare(`
      SELECT s.name, COUNT(jcs.id) as jobs_count, SUM(jcs.price) as total_revenue
      FROM job_card_services jcs
      JOIN services s ON jcs.service_id = s.id
      GROUP BY s.id
      ORDER BY jobs_count DESC
      LIMIT 5
    `).all();

    return NextResponse.json({
      metrics: {
        totalCustomers,
        totalVehicles,
        todayAppointments,
        inServiceJobs,
        completedToday,
        todayInvoiced,
        todayCollections,
        totalOutstanding,
        monthlyRevenue,
        monthlyCollections,
        monthlyExpenses,
        monthlyConsumablesCost,
        monthlyOperatingProfit,
        staffPresent,
        staffAbsent,
        staffOnLeave,
        lowStockCount,
        assetsDueMaintenance,
        upcomingWarrantyExp,
        pendingReminders,
      },
      operations: todayOperations,
      bays,
      alerts,
      popularServices,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
