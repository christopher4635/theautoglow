export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const todayStr = new Date().toISOString().split('T')[0];
    const sDate = startDate || `${todayStr.substring(0, 7)}-01`;
    const eDate = endDate || todayStr;

    // 1. Financial P&L Breakdown
    const invoicedSales = (
      db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE invoice_date BETWEEN ? AND ?`).get(sDate, eDate) as { total: number }
    ).total;

    const collections = (
      db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date BETWEEN ? AND ?`).get(sDate, eDate) as { total: number }
    ).total;

    const collectionsByMethod = db.prepare(`
      SELECT payment_method, COUNT(*) as count, SUM(amount) as total
      FROM payments
      WHERE payment_date BETWEEN ? AND ?
      GROUP BY payment_method
    `).all(sDate, eDate);

    const expensesTotal = (
      db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date BETWEEN ? AND ?`).get(sDate, eDate) as { total: number }
    ).total;

    const expensesByCategory = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(amount) as total
      FROM expenses
      WHERE expense_date BETWEEN ? AND ?
      GROUP BY category
      ORDER BY total DESC
    `).all(sDate, eDate);

    const consumablesCost = (
      db.prepare(`SELECT COALESCE(SUM(total_cost), 0) as total FROM stock_consumptions WHERE substr(recorded_at, 1, 10) BETWEEN ? AND ?`).get(sDate, eDate) as { total: number }
    ).total;

    const supplierPurchases = (
      db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM purchase_orders WHERE purchase_date BETWEEN ? AND ?`).get(sDate, eDate) as { total: number }
    ).total;

    const grossProfit = invoicedSales - consumablesCost;
    const operatingProfit = grossProfit - expensesTotal;

    // 2. Service-wise Performance
    const servicePerformance = db.prepare(`
      SELECT s.name, s.service_code,
             COUNT(jcs.id) as jobs_count,
             COALESCE(SUM(jcs.price), 0) as total_revenue
      FROM services s
      LEFT JOIN job_card_services jcs ON s.id = jcs.service_id
      LEFT JOIN job_cards j ON jcs.job_card_id = j.id AND substr(j.created_at, 1, 10) BETWEEN ? AND ?
      GROUP BY s.id
      ORDER BY total_revenue DESC
    `).all(sDate, eDate);

    // 3. Customer & Vehicle Insights
    const topCustomers = db.prepare(`
      SELECT c.name, c.customer_code, c.mobile, c.category,
             c.total_spent, c.visit_count,
             (SELECT COUNT(*) FROM vehicles WHERE customer_id = c.id) as vehicle_count
      FROM customers c
      ORDER BY c.total_spent DESC
      LIMIT 10
    `).all();

    // 4. Staff Productivity
    const staffProductivity = db.prepare(`
      SELECT e.name, e.employee_code, e.designation,
             (SELECT COUNT(*) FROM job_assignments WHERE employee_id = e.id) as jobs_completed,
             (SELECT COUNT(*) FROM attendance WHERE employee_id = e.id AND status = 'Present' AND attendance_date BETWEEN ? AND ?) as days_present
      FROM employees e
      WHERE e.status = 'Active'
      ORDER BY jobs_completed DESC
    `).all(sDate, eDate);

    // 5. Consumables Usage
    const topConsumedProducts = db.prepare(`
      SELECT p.name, p.sku, p.unit,
             SUM(sc.quantity) as total_quantity_used,
             SUM(sc.total_cost) as total_material_cost
      FROM stock_consumptions sc
      JOIN inventory_products p ON sc.product_id = p.id
      WHERE substr(sc.recorded_at, 1, 10) BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY total_material_cost DESC
    `).all(sDate, eDate);

    return NextResponse.json({
      period: { start_date: sDate, end_date: eDate },
      pnl: {
        invoicedSales,
        collections,
        expensesTotal,
        consumablesCost,
        supplierPurchases,
        grossProfit,
        operatingProfit,
        collectionsByMethod,
        expensesByCategory,
      },
      servicePerformance,
      topCustomers,
      staffProductivity,
      topConsumedProducts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
