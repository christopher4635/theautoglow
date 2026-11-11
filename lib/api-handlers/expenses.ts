import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleExpensesGet(request: Request, db: DbClient): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const month = searchParams.get('month');

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

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.substring(0, 7);

    const [
      expenses,
      invoicedSalesRow,
      actualCollectionsRow,
      outstandingRow,
      totalExpensesRow,
      costOfConsumablesRow,
      supplierPaymentsRow,
    ] = await Promise.all([
      db.all(query, ...params),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE substr(invoice_date, 1, 7) = ?`,
        currentMonth
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE substr(payment_date, 1, 7) = ?`,
        currentMonth
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(balance_amount), 0) as total FROM invoices WHERE payment_status IN ('Unpaid', 'Partially Paid')`
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE substr(expense_date, 1, 7) = ?`,
        currentMonth
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(total_cost), 0) as total FROM stock_consumptions WHERE substr(recorded_at, 1, 7) = ?`,
        currentMonth
      ),
      db.get<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM supplier_payments WHERE substr(payment_date, 1, 7) = ?`,
        currentMonth
      ),
    ]);

    const invoicedSales = invoicedSalesRow?.total ?? 0;
    const actualCollections = actualCollectionsRow?.total ?? 0;
    const outstandingReceivables = outstandingRow?.total ?? 0;
    const totalExpenses = totalExpensesRow?.total ?? 0;
    const costOfConsumables = costOfConsumablesRow?.total ?? 0;
    const supplierPayments = supplierPaymentsRow?.total ?? 0;

    const grossProfit = invoicedSales - costOfConsumables;
    const operatingProfit = grossProfit - totalExpenses;
    const netCashFlow = actualCollections - (totalExpenses + supplierPayments);

    return jsonResponse({
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
    return errorResponse(error.message, 500);
  }
}

export async function handleExpensesPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { expense_date, category, description, amount, payment_method, vendor, invoice_ref, recorded_by } = body;

    const expAmount = parseFloat(amount);
    if (!category || !description || isNaN(expAmount) || expAmount <= 0) {
      return errorResponse('Category, Description, and a positive Amount are required.', 400);
    }

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM expenses');
    const expense_number = `EXP-${new Date().getFullYear()}-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const id = `exp-${Date.now()}`;
    const dateStr = expense_date || new Date().toISOString().split('T')[0];

    await db.run(
      `INSERT INTO expenses (
        id, expense_number, expense_date, category, description, amount,
        payment_method, vendor, invoice_ref, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      expense_number,
      dateStr,
      String(category).trim(),
      String(description).trim(),
      expAmount,
      payment_method || 'Bank Transfer',
      vendor?.trim() || null,
      invoice_ref?.trim() || null,
      recorded_by || 'Staff'
    );

    const created = await db.get('SELECT * FROM expenses WHERE id = ?', id);
    return jsonResponse(created, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
