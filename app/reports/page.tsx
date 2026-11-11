'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  DollarSign,
  Users,
  Briefcase,
  Package,
  Car,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function ReportsPage() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'financial' | 'services' | 'customers' | 'staff' | 'consumables'>('financial');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports?start_date=${startDate}&end_date=${endDate}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const exportToCSV = (filename: string, rows: any[]) => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map((row) =>
          headers
            .map((field) => {
              const val = row[field];
              return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
            })
            .join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Management Reports & Business Analytics</h1>
          <p className="text-xs text-muted mt-0.5">
            Profitability statements, service volume, staff productivity, and customer lifetime metrics
          </p>
        </div>

        {/* Date Filter & Export Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-border rounded p-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-muted ml-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-1.5 py-0.5 bg-surface border border-border rounded text-xs font-mono"
            />
            <span className="text-muted text-[10px]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-1.5 py-0.5 bg-surface border border-border rounded text-xs font-mono"
            />
          </div>

          <button
            onClick={() => {
              if (!data) return;
              if (activeTab === 'services') exportToCSV('autoglow-services-report', data.servicePerformance);
              else if (activeTab === 'customers') exportToCSV('autoglow-customers-report', data.topCustomers);
              else if (activeTab === 'staff') exportToCSV('autoglow-staff-productivity', data.staffProductivity);
              else if (activeTab === 'consumables') exportToCSV('autoglow-consumables-usage', data.topConsumedProducts);
              else exportToCSV('autoglow-financial-pnl', data.pnl.expensesByCategory);
            }}
            className="px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border text-xs overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('financial')}
          className={cn(
            'px-3.5 py-2 font-medium border-b-2 transition-colors',
            activeTab === 'financial' ? 'border-charcoal text-charcoal font-semibold' : 'border-transparent text-muted hover:text-charcoal'
          )}
        >
          Financial P&L
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={cn(
            'px-3.5 py-2 font-medium border-b-2 transition-colors',
            activeTab === 'services' ? 'border-charcoal text-charcoal font-semibold' : 'border-transparent text-muted hover:text-charcoal'
          )}
        >
          Service Volumes & Revenue
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={cn(
            'px-3.5 py-2 font-medium border-b-2 transition-colors',
            activeTab === 'customers' ? 'border-charcoal text-charcoal font-semibold' : 'border-transparent text-muted hover:text-charcoal'
          )}
        >
          Customer Lifetime Value
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={cn(
            'px-3.5 py-2 font-medium border-b-2 transition-colors',
            activeTab === 'staff' ? 'border-charcoal text-charcoal font-semibold' : 'border-transparent text-muted hover:text-charcoal'
          )}
        >
          Staff Productivity
        </button>
        <button
          onClick={() => setActiveTab('consumables')}
          className={cn(
            'px-3.5 py-2 font-medium border-b-2 transition-colors',
            activeTab === 'consumables' ? 'border-charcoal text-charcoal font-semibold' : 'border-transparent text-muted hover:text-charcoal'
          )}
        >
          Consumables & Material Usage
        </button>
      </div>

      {loading || !data ? (
        <div className="p-8 text-center text-muted text-xs bg-white rounded border border-border">
          Compiling business analytical reports...
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: FINANCIAL P&L */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border border-border rounded p-4">
                  <span className="text-[10px] text-muted uppercase font-medium">Billed Revenue</span>
                  <div className="text-lg font-bold text-charcoal mt-1">{formatCurrency(data.pnl.invoicedSales)}</div>
                  <span className="text-[10px] text-muted">All invoiced services</span>
                </div>
                <div className="bg-white border border-border rounded p-4">
                  <span className="text-[10px] text-muted uppercase font-medium">Actual Collections</span>
                  <div className="text-lg font-bold text-charcoal mt-1">{formatCurrency(data.pnl.collections)}</div>
                  <span className="text-[10px] text-muted">Real money in bank/cash</span>
                </div>
                <div className="bg-white border border-border rounded p-4">
                  <span className="text-[10px] text-muted uppercase font-medium">Total Operating Costs</span>
                  <div className="text-lg font-bold text-rose-700 mt-1">
                    {formatCurrency(data.pnl.expensesTotal + data.pnl.consumablesCost)}
                  </div>
                  <span className="text-[10px] text-muted">Overheads + Material</span>
                </div>
                <div className="bg-white border border-border rounded p-4">
                  <span className="text-[10px] text-muted uppercase font-medium">Operating Profit</span>
                  <div className="text-lg font-bold text-emerald-700 mt-1">{formatCurrency(data.pnl.operatingProfit)}</div>
                  <span className="text-[10px] text-muted">Period net operating return</span>
                </div>
              </div>

              {/* Collections by Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-border rounded p-4 space-y-3">
                  <h3 className="font-semibold text-charcoal text-xs border-b border-border/60 pb-2">
                    Collections by Payment Channel
                  </h3>
                  <div className="space-y-2">
                    {data.pnl.collectionsByMethod.map((m: any) => (
                      <div key={m.payment_method} className="p-2.5 bg-surface rounded border border-border flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-charcoal">{m.payment_method}</span>
                          <span className="text-[10px] text-muted block">{m.count} transactions</span>
                        </div>
                        <span className="font-bold text-charcoal font-mono">{formatCurrency(m.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-border rounded p-4 space-y-3">
                  <h3 className="font-semibold text-charcoal text-xs border-b border-border/60 pb-2">
                    Operating Overhead Expenses by Category
                  </h3>
                  <div className="space-y-2">
                    {data.pnl.expensesByCategory.map((e: any) => (
                      <div key={e.category} className="p-2.5 bg-surface rounded border border-border flex items-center justify-between text-xs">
                        <span className="font-medium text-charcoal">{e.category}</span>
                        <span className="font-bold text-rose-700 font-mono">{formatCurrency(e.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SERVICE VOLUMES */}
          {activeTab === 'services' && (
            <div className="bg-white border border-border rounded overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-4">Service Package</th>
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-4 text-center">Jobs Executed</th>
                    <th className="py-2.5 px-4 text-right">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.servicePerformance.map((s: any) => (
                    <tr key={s.service_code} className="hover:bg-surface/50">
                      <td className="py-3 px-4 font-semibold text-charcoal">{s.name}</td>
                      <td className="py-3 px-4 font-mono text-muted">{s.service_code}</td>
                      <td className="py-3 px-4 text-center font-bold text-charcoal font-mono">{s.jobs_count}</td>
                      <td className="py-3 px-4 text-right font-bold text-charcoal font-mono">{formatCurrency(s.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMER LIFETIME VALUE */}
          {activeTab === 'customers' && (
            <div className="bg-white border border-border rounded overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-4">Customer Name</th>
                    <th className="py-2.5 px-4">Code / Mobile</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-center">Vehicles Owned</th>
                    <th className="py-2.5 px-4 text-right">Total Lifetime Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.topCustomers.map((c: any) => (
                    <tr key={c.customer_code} className="hover:bg-surface/50">
                      <td className="py-3 px-4 font-semibold text-charcoal">{c.name}</td>
                      <td className="py-3 px-4 text-muted font-mono">{c.customer_code} • {c.mobile}</td>
                      <td className="py-3 px-4 font-medium text-charcoal">{c.category}</td>
                      <td className="py-3 px-4 text-center font-mono">{c.vehicle_count}</td>
                      <td className="py-3 px-4 text-right font-bold text-charcoal font-mono">{formatCurrency(c.total_spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* TAB 4: STAFF PRODUCTIVITY */}
          {activeTab === 'staff' && (
            <div className="bg-white border border-border rounded overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-4">Staff Member</th>
                    <th className="py-2.5 px-4">Designation</th>
                    <th className="py-2.5 px-4 text-center">Days Present</th>
                    <th className="py-2.5 px-4 text-center">Detailing Jobs Executed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.staffProductivity.map((st: any) => (
                    <tr key={st.employee_code} className="hover:bg-surface/50">
                      <td className="py-3 px-4 font-semibold text-charcoal">{st.name} ({st.employee_code})</td>
                      <td className="py-3 px-4 text-muted">{st.designation}</td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{st.days_present}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-charcoal">{st.jobs_completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* TAB 5: CONSUMABLES USAGE */}
          {activeTab === 'consumables' && (
            <div className="bg-white border border-border rounded overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-4">Product Name</th>
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4 text-center">Total Quantity Consumed</th>
                    <th className="py-2.5 px-4 text-right">Total Material Expenditure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.topConsumedProducts.map((p: any) => (
                    <tr key={p.sku} className="hover:bg-surface/50">
                      <td className="py-3 px-4 font-semibold text-charcoal">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-muted">{p.sku}</td>
                      <td className="py-3 px-4 text-center font-bold text-charcoal font-mono">{p.total_quantity_used} {p.unit}</td>
                      <td className="py-3 px-4 text-right font-bold text-charcoal font-mono">{formatCurrency(p.total_material_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
