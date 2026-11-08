export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const month = searchParams.get('month'); // YYYY-MM

    let query = `SELECT * FROM expenses WHERE 1=1`;
    const params: any[] = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (month) {
      query += ` AND substr(expense_date, 1, 7) = ?`;
      params.push(month);
    } else if (startDate && endDate) {
      query += ` AND expense_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY expense_date DESC, created_at DESC`;

    const expenses = db.prepare(query).all(...params);

    // Financial calculations
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.substring(0, 7);

    // Invoiced Sales (Total value of services billed)
    const invoicedSales = (
      db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE substr(invoice_date, 1, 7) = ?`).get(currentMonth) as { total: number }
    ).total;

    // Actual Collections (Real money collected)
    const actualCollections = (
      db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE substr(payment_date, 1, 7) = ?`).get(currentMonth) as { total: number }
    ).total;

    // Outstanding Receivables
    const outstandingReceivables = (
      db.prepare(`SELECT COALESCE(SUM(balance_amount), 0) as total FROM invoices WHERE payment_status IN ('Unpaid', 'Partially Paid')`).get() as { total: number }
    ).total;

    // Total Operating Expenses (rent, power, marketing, etc.)
    const totalExpenses = (
      db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE substr(expense_date, 1, 7) = ?`).get(currentMonth) as { total: number }
    ).total;

    // Cost of Consumables used on jobs
    const costOfConsumables = (
      db.prepare(`SELECT COALESCE(SUM(total_cost), 0) as total FROM stock_consumptions WHERE substr(recorded_at, 1, 7) = ?`).get(currentMonth) as { total: number }
    ).total;

    // Gross Profit = Invoiced Revenue - Cost of Consumables
    const grossProfit = invoicedSales - costOfConsumables;

    // Operating Profit = Gross Profit - Operating Expenses
    const operatingProfit = grossProfit - totalExpenses;

    // Net Cash Flow = Actual Collections - (Operating Expenses + Supplier Payments)
    const supplierPayments = (
      db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM supplier_payments WHERE substr(payment_date, 1, 7) = ?`).get(currentMonth) as { total: number }
    ).total;

    const netCashFlow = actualCollections - (totalExpenses + supplierPayments);

    return NextResponse.json({
      expenses,
      financials: {
        currentMonth,
        invoicedSales,
        actualCollections,
        outstandingReceivables,
        totalExpenses,
        costOfConsumables,
        grossProfit,
        operatingProfit,
        supplierPayments,
        netCashFlow,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { expense_date, category, description, amount, payment_method, vendor, invoice_ref, recorded_by } = body;

    const expAmount = parseFloat(amount);
    if (!category || !description || isNaN(expAmount) || expAmount <= 0) {
      return NextResponse.json(
        { error: 'Category, Description, and a positive Amount are required.' },
        { status: 400 }
      );
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM expenses').get() as { count: number };
    const expense_number = `EXP-${new Date().getFullYear()}-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `exp-${Date.now()}`;
    const dateStr = expense_date || new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO expenses (
        id, expense_number, expense_date, category, description, amount,
        payment_method, vendor, invoice_ref, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      expense_number,
      dateStr,
      category.trim(),
      description.trim(),
      expAmount,
      payment_method || 'Bank Transfer',
      vendor?.trim() || null,
      invoice_ref?.trim() || null,
      recorded_by || 'Staff'
    );

    const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
