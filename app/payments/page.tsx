'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Receipt,
  User,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { Payment } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function PaymentsPage() {
  const { currentUser, canAccessFinances } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments');
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filtered = payments.filter((p) => {
    const matchesSearch =
      !search ||
      p.payment_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.transaction_ref?.toLowerCase().includes(search.toLowerCase());
    const matchesMethod = !methodFilter || p.payment_method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const totalCollected = filtered.reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Payments Received & Cash Ledger</h1>
          <p className="text-xs text-muted mt-0.5">
            Audit-safe payment receipts, payment methods breakdown, and customer settlement logs
          </p>
        </div>

        <div className="bg-white border border-border rounded px-4 py-2 text-right">
          <span className="text-[10px] text-muted uppercase font-medium">Total Collections in View</span>
          <div className="text-base font-bold text-emerald-700">{formatCurrency(totalCollected)}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-border rounded">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by payment #, invoice #, customer name, or UTR..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none focus:border-charcoal focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
          >
            <option value="">All Payment Methods</option>
            <option value="UPI">UPI / QR Code</option>
            <option value="Cash">Cash</option>
            <option value="Debit/Credit Card">Debit/Credit Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Receipt # / Date</th>
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Payment Method</th>
                <th className="py-2.5 px-4">Transaction UTR / Ref</th>
                <th className="py-2.5 px-4">Received By</th>
                <th className="py-2.5 px-4 text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    Loading payments...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-surface/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-charcoal font-mono">{p.payment_number}</div>
                      <div className="text-[10px] text-muted">{formatDate(p.payment_date)}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-charcoal">
                      {p.invoice_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-charcoal">{p.customer_name}</div>
                      <div className="text-[10px] text-muted">{p.customer_mobile}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted max-w-xs truncate">
                      {p.transaction_ref || '-'}
                    </td>
                    <td className="py-3 px-4 text-muted-dark">
                      {p.recorded_by}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-800 font-mono text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
