'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Plus,
  Search,
  Receipt,
  DollarSign,
  Calendar,
  X,
  CreditCard,
  Building,
  TrendingUp,
} from 'lucide-react';
import { Expense } from '@/lib/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function ExpensesPage() {
  const { currentUser, canAccessFinances } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Add Expense Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Rent',
    description: '',
    amount: '',
    payment_method: 'Bank Transfer',
    vendor: '',
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let url = '/api/expenses';
      if (categoryFilter) url += `?category=${encodeURIComponent(categoryFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setFinancials(data.financials || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          recorded_by: currentUser?.name || 'Staff',
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({
          expense_date: new Date().toISOString().split('T')[0],
          category: 'Rent',
          description: '',
          amount: '',
          payment_method: 'Bank Transfer',
          vendor: '',
        });
        fetchExpenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Expenses & Financial Statement</h1>
          <p className="text-xs text-muted mt-0.5">
            Operating overheads, consumables cost allocation, gross profit, and cash flow reconciliation
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Financial Position P&L Cards */}
      <div className="bg-white border border-border rounded p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">
            Profit & Loss Summary ({financials.currentMonth || 'Current Month'})
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-mono">
            Accrual & Cash Position
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-surface rounded border border-border/50">
            <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Invoiced Sales</span>
            <div className="text-base font-bold text-charcoal mt-1">{formatCurrency(financials.invoicedSales)}</div>
            <span className="text-[10px] text-muted">Billed revenue</span>
          </div>

          <div className="p-3 bg-surface rounded border border-border/50">
            <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Actual Collections</span>
            <div className="text-base font-bold text-charcoal mt-1">{formatCurrency(financials.actualCollections)}</div>
            <span className="text-[10px] text-muted">Real cash received</span>
          </div>

          <div className="p-3 bg-surface rounded border border-border/50">
            <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Material Cost</span>
            <div className="text-base font-bold text-charcoal mt-1">{formatCurrency(financials.costOfConsumables)}</div>
            <span className="text-[10px] text-muted">Stock consumed on jobs</span>
          </div>

          <div className="p-3 bg-surface rounded border border-border/50">
            <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Gross Profit</span>
            <div className="text-base font-bold text-charcoal mt-1">{formatCurrency(financials.grossProfit)}</div>
            <span className="text-[10px] text-muted">Sales - Consumables</span>
          </div>

          <div className="p-3 bg-surface rounded border border-border/50">
            <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Operating Expenses</span>
            <div className="text-base font-bold text-rose-700 mt-1">{formatCurrency(financials.totalExpenses)}</div>
            <span className="text-[10px] text-muted">Rent, power & wages</span>
          </div>

          <div className="p-3 bg-surface rounded border border-border/50">
            <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Operating Profit</span>
            <div className="text-base font-bold text-emerald-700 mt-1">{formatCurrency(financials.operatingProfit)}</div>
            <span className="text-[10px] text-muted">Net studio profit</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-border rounded">
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
          >
            <option value="">All Expense Categories</option>
            <option value="Rent">Rent & Bay Lease</option>
            <option value="Electricity">Electricity & Power</option>
            <option value="Salaries">Staff Salaries</option>
            <option value="Consumables">Consumables & Sundries</option>
            <option value="Equipment Maintenance">Equipment Maintenance</option>
            <option value="Marketing">Marketing & Advertising</option>
            <option value="Repairs">Facility Repairs</option>
            <option value="Miscellaneous">Miscellaneous</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Expense # / Date</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Vendor / Payee</th>
                <th className="py-2.5 px-4">Payment Method</th>
                <th className="py-2.5 px-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                expenses.map((e: any) => (
                  <tr key={e.id} className="hover:bg-surface/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-charcoal font-mono">{e.expense_number}</div>
                      <div className="text-[10px] text-muted">{formatDate(e.expense_date)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-charcoal max-w-sm">
                      {e.description}
                    </td>
                    <td className="py-3 px-4 text-muted-dark">
                      {e.vendor || 'Direct Store Payee'}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted">
                      {e.payment_method}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-charcoal font-mono">
                      {formatCurrency(e.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: RECORD EXPENSE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Record Business Expense</h3>
                <p className="text-[11px] text-muted">Track operating overheads and supplier payouts</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="Rent">Rent & Bay Lease</option>
                    <option value="Electricity">Electricity & Power</option>
                    <option value="Salaries">Staff Salaries</option>
                    <option value="Consumables">Consumables & Sundries</option>
                    <option value="Equipment Maintenance">Equipment Maintenance</option>
                    <option value="Marketing">Marketing & Advertising</option>
                    <option value="Repairs">Facility Repairs</option>
                    <option value="Transportation">Transportation & Fuel</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Description / Memo *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. 3-phase high tension power bill for October"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="12500"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-bold focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Payment Method *</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cash">Cash</option>
                    <option value="Debit/Credit Card">Debit/Credit Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Vendor / Payee Name</label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="e.g. Sikkim Power Dept / Landlord"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
