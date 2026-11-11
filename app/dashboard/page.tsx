'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Car,
  Calendar,
  Wrench,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Package,
  ShieldAlert,
  Clock,
  ArrowRight,
  Filter,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { currentUser, canAccessFinances } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState('today');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard?range=${selectedRange}`);
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
    fetchDashboardData();
  }, [selectedRange]);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-24 bg-white border border-border rounded p-4"></div>
          ))}
        </div>
      </div>
    );
  }

  const { metrics, operations, bays, alerts, popularServices } = data;

  return (
    <div className="space-y-8">
      {/* Page Header with Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Business Overview</h1>
          <p className="text-xs text-muted mt-0.5">
            Operational status and live performance for The Autoglow Sikkim
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1 bg-white border border-border rounded p-1 text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'this_year', label: 'This Year' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRange(tab.id)}
              className={cn(
                'px-2.5 py-1 rounded font-medium transition-colors',
                selectedRange === tab.id
                  ? 'bg-charcoal text-white font-semibold'
                  : 'text-muted-dark hover:bg-surface hover:text-charcoal'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: KEY PERFORMANCE INDICATORS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Customers */}
        <Link href="/customers" className="bg-white border border-border rounded p-3.5 hover:border-zinc-400 transition-colors">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">Customers</span>
            <Users className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-charcoal mt-1.5">{metrics.totalCustomers}</div>
          <div className="text-[10px] text-muted mt-0.5">Total registered</div>
        </Link>

        {/* Vehicles */}
        <Link href="/vehicles" className="bg-white border border-border rounded p-3.5 hover:border-zinc-400 transition-colors">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">Vehicles</span>
            <Car className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-charcoal mt-1.5">{metrics.totalVehicles}</div>
          <div className="text-[10px] text-muted mt-0.5">Fleet database</div>
        </Link>

        {/* In Service Now */}
        <Link href="/jobcards" className="bg-white border border-border rounded p-3.5 hover:border-zinc-400 transition-colors">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">In Service</span>
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-blue-700 mt-1.5">{metrics.inServiceJobs}</div>
          <div className="text-[10px] text-muted mt-0.5">Vehicles on floor</div>
        </Link>

        {/* Completed Today */}
        <Link href="/jobcards" className="bg-white border border-border rounded p-3.5 hover:border-zinc-400 transition-colors">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 mt-1.5">{metrics.completedToday}</div>
          <div className="text-[10px] text-muted mt-0.5">Jobs finished today</div>
        </Link>

        {/* Today's Appointments */}
        <Link href="/appointments" className="bg-white border border-border rounded p-3.5 hover:border-zinc-400 transition-colors">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">Appointments</span>
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-charcoal mt-1.5">{metrics.todayAppointments}</div>
          <div className="text-[10px] text-muted mt-0.5">Booked for today</div>
        </Link>

        {/* Staff Present */}
        <Link href="/attendance" className="bg-white border border-border rounded p-3.5 hover:border-zinc-400 transition-colors">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">Staff On Site</span>
            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-charcoal mt-1.5">
            {metrics.staffPresent} <span className="text-xs text-muted font-normal">/ {metrics.staffPresent + metrics.staffAbsent + metrics.staffOnLeave}</span>
          </div>
          <div className="text-[10px] text-muted mt-0.5">
            {metrics.staffOnLeave > 0 ? `${metrics.staffOnLeave} on approved leave` : 'All present'}
          </div>
        </Link>
      </div>

      {/* SECTION 2: FINANCIAL POSITION (Restricted to authorized roles) */}
      {canAccessFinances() && (
        <div className="bg-white border border-border rounded p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-charcoal">Financial Performance</h2>
              <p className="text-[11px] text-muted">Daily and monthly cash collections, revenue, and operating profit</p>
            </div>
            <Link href="/billing" className="text-xs text-muted hover:text-charcoal flex items-center gap-1 font-medium">
              View Invoices <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
            <div className="p-3 bg-surface rounded border border-border/50">
              <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Today Collections</span>
              <div className="text-base font-bold text-charcoal mt-1">{formatCurrency(metrics.todayCollections)}</div>
              <span className="text-[10px] text-muted">Actual money received</span>
            </div>

            <div className="p-3 bg-surface rounded border border-border/50">
              <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Today Invoiced</span>
              <div className="text-base font-bold text-charcoal mt-1">{formatCurrency(metrics.todayInvoiced)}</div>
              <span className="text-[10px] text-muted">Billed today</span>
            </div>

            <div className="p-3 bg-surface rounded border border-border/50">
              <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Monthly Revenue</span>
              <div className="text-base font-bold text-charcoal mt-1">{formatCurrency(metrics.monthlyRevenue)}</div>
              <span className="text-[10px] text-muted">Month to date</span>
            </div>

            <div className="p-3 bg-surface rounded border border-border/50">
              <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Monthly Collections</span>
              <div className="text-base font-bold text-charcoal mt-1">{formatCurrency(metrics.monthlyCollections)}</div>
              <span className="text-[10px] text-muted">Cash & UPI collected</span>
            </div>

            <div className="p-3 bg-surface rounded border border-border/50">
              <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Outstanding Due</span>
              <div className="text-base font-bold text-rose-700 mt-1">{formatCurrency(metrics.totalOutstanding)}</div>
              <span className="text-[10px] text-muted">Customer receivables</span>
            </div>

            <div className="p-3 bg-surface rounded border border-border/50">
              <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Operating Profit</span>
              <div className="text-base font-bold text-emerald-700 mt-1">{formatCurrency(metrics.monthlyOperatingProfit)}</div>
              <span className="text-[10px] text-muted">Net after exp & stock</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: TODAY'S OPERATIONS PIPELINE & LIVE BAY OCCUPANCY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Operational Workflow (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-border rounded p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-charcoal">Today's Operations Pipeline</h2>
              <p className="text-[11px] text-muted">Live movement from appointment intake to vehicle handover</p>
            </div>
            <Link href="/jobcards" className="text-xs text-muted hover:text-charcoal flex items-center gap-1 font-medium">
              Manage Job Cards <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-4">
            {/* 1. Vehicles Received */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-charcoal mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Vehicles Received ({operations.receivedJobs.length})
                </span>
                <span className="text-[11px] text-muted">Awaiting detailing bay start</span>
              </div>
              {operations.receivedJobs.length === 0 ? (
                <div className="p-3 text-xs text-muted bg-surface/50 rounded border border-dashed border-border text-center">
                  No vehicles currently queued in reception.
                </div>
              ) : (
                <div className="space-y-2">
                  {operations.receivedJobs.map((j: any) => (
                    <div key={j.id} className="p-2.5 bg-surface border border-border rounded flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-charcoal">{j.vehicle_reg}</span>
                        <span className="text-muted ml-2">{j.vehicle_make_model}</span>
                        <span className="text-muted-dark text-[11px] block">{j.customer_name} • Job {j.job_card_number}</span>
                      </div>
                      <Link href={`/jobcards?id=${j.id}`} className="px-2.5 py-1 bg-white border border-border rounded text-charcoal font-medium hover:bg-zinc-50">
                        View Card
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Work in Progress */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-charcoal mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Jobs In Progress ({operations.inProgressJobs.length})
                </span>
                <span className="text-[11px] text-muted">Active floor operations</span>
              </div>
              {operations.inProgressJobs.length === 0 ? (
                <div className="p-3 text-xs text-muted bg-surface/50 rounded border border-dashed border-border text-center">
                  No active detailing jobs running currently.
                </div>
              ) : (
                <div className="space-y-2">
                  {operations.inProgressJobs.map((j: any) => (
                    <div key={j.id} className="p-2.5 bg-surface border border-border rounded flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-charcoal">{j.vehicle_reg}</span>
                          <span className="text-muted">{j.vehicle_make_model}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                            {j.bay_name || 'Floor'}
                          </span>
                        </div>
                        <span className="text-muted-dark text-[11px] block">
                          Assigned: {j.primary_staff_name || 'Staff'} • Est. finish: {j.estimated_completion?.split(' ')[1] || 'Today'}
                        </span>
                      </div>
                      <Link href={`/jobcards?id=${j.id}`} className="px-2.5 py-1 bg-white border border-border rounded text-charcoal font-medium hover:bg-zinc-50">
                        Update Status
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Ready for Delivery */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-charcoal mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Ready for Delivery ({operations.readyDeliveryJobs.length})
                </span>
                <span className="text-[11px] text-muted">Completed & QC cleared</span>
              </div>
              {operations.readyDeliveryJobs.length === 0 ? (
                <div className="p-3 text-xs text-muted bg-surface/50 rounded border border-dashed border-border text-center">
                  No vehicles awaiting customer delivery handover.
                </div>
              ) : (
                <div className="space-y-2">
                  {operations.readyDeliveryJobs.map((j: any) => (
                    <div key={j.id} className="p-2.5 bg-surface border border-border rounded flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-charcoal">{j.vehicle_reg}</span>
                          <span className="text-muted">{j.vehicle_make_model}</span>
                          <span className={cn('text-[10px] px-1.5 py-0.2 rounded font-medium', getStatusBadgeClass(j.payment_status || 'Unpaid'))}>
                            {j.payment_status || 'Unpaid'}
                          </span>
                        </div>
                        <span className="text-muted-dark text-[11px] block">
                          Customer: {j.customer_name} • Due: {formatCurrency(j.balance_amount || 0)}
                        </span>
                      </div>
                      <Link href={`/billing`} className="px-2.5 py-1 bg-charcoal text-white rounded font-medium hover:bg-zinc-800">
                        Handover & Invoice
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Service Bays Occupancy (1 Col) */}
        <div className="bg-white border border-border rounded p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-charcoal">Service Bays Status</h2>
              <p className="text-[11px] text-muted">Shop floor station availability</p>
            </div>
            <Link href="/service-bays" className="text-xs text-muted hover:text-charcoal font-medium">
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {bays.map((bay: any) => {
              const isOccupied = bay.current_status === 'Occupied';
              const isMaintenance = bay.current_status === 'Under Maintenance';

              return (
                <div
                  key={bay.id}
                  className={cn(
                    'p-3 rounded border text-xs transition-colors',
                    isOccupied
                      ? 'bg-amber-50/40 border-amber-200'
                      : isMaintenance
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-surface border-border'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-charcoal">{bay.name}</span>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-medium',
                        getStatusBadgeClass(bay.current_status)
                      )}
                    >
                      {bay.current_status}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-muted flex items-center justify-between">
                    <span>Type: {bay.bay_type}</span>
                    {bay.current_vehicle_reg && (
                      <span className="font-mono text-charcoal font-semibold">
                        {bay.current_vehicle_reg}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 4: ALERTS & MOST POPULAR SERVICES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operational Alerts */}
        <div className="bg-white border border-border rounded p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-charcoal">Actionable Alerts & Exceptions</h2>
              <p className="text-[11px] text-muted">Items requiring immediate management review</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-mono">
              Live Feeds
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Low Stock Alert */}
            {alerts.lowStock.length > 0 && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-amber-900">Low Stock Consumables ({alerts.lowStock.length})</div>
                  <div className="text-amber-800 text-[11px] mt-0.5">
                    {alerts.lowStock.map((p: any) => `${p.name} (${p.current_stock} ${p.unit})`).join(', ')}
                  </div>
                  <Link href="/inventory" className="text-[11px] font-medium text-amber-900 underline mt-1 inline-block">
                    Order restock from supplier →
                  </Link>
                </div>
              </div>
            )}

            {/* Pending Invoices */}
            {alerts.pendingInvoices.length > 0 && (
              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-700 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-rose-900">Outstanding Customer Invoices</div>
                  <div className="text-rose-800 text-[11px] mt-0.5">
                    {alerts.pendingInvoices.map((inv: any) => `${inv.invoice_number} (${inv.customer_name}: ${formatCurrency(inv.balance_amount)})`).join(' • ')}
                  </div>
                  <Link href="/billing" className="text-[11px] font-medium text-rose-900 underline mt-1 inline-block">
                    Collect payments →
                  </Link>
                </div>
              </div>
            )}

            {/* Urgent Reminders */}
            {alerts.urgentReminders.length > 0 && (
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-blue-900">Upcoming Service Due / Overdue</div>
                  <div className="text-blue-800 text-[11px] mt-0.5">
                    {alerts.urgentReminders.map((r: any) => `${r.vehicle_reg} (${r.service_name}) - ${r.status}`).join(' • ')}
                  </div>
                  <Link href="/reminders" className="text-[11px] font-medium text-blue-900 underline mt-1 inline-block">
                    Send WhatsApp reminder →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Most Popular Services */}
        <div className="bg-white border border-border rounded p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-charcoal">Top Detailing Services</h2>
              <p className="text-[11px] text-muted">Most requested packages and generated revenue</p>
            </div>
            <Link href="/services" className="text-xs text-muted hover:text-charcoal font-medium">
              View Catalogue
            </Link>
          </div>

          <div className="space-y-2">
            {popularServices.map((srv: any, idx: number) => (
              <div key={idx} className="p-2.5 bg-surface rounded border border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded bg-zinc-200 text-charcoal font-mono text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-medium text-charcoal">{srv.name}</div>
                    <div className="text-[10px] text-muted">{srv.jobs_count} job cards executed</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-charcoal">{formatCurrency(srv.total_revenue)}</div>
                  <div className="text-[10px] text-muted">Revenue</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
