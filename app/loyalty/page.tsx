'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Search,
  Plus,
  Tag,
  Gift,
  Users,
  CheckCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { LoyaltyAccount } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils';

export default function LoyaltyPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Redeem modal
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState('100');
  const [redeemError, setRedeemError] = useState('');

  const fetchLoyalty = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/loyalty');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.loyaltyAccounts || []);
        setCoupons(data.coupons || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyalty();
  }, []);

  const handleRedeemPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setRedeemError('');
    try {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedAccount.customer_id,
          points_to_redeem: parseInt(pointsToRedeem, 10),
          discount_amount: parseInt(pointsToRedeem, 10),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRedeemError(json.error || 'Failed to redeem points');
        return;
      }
      setShowRedeemModal(false);
      fetchLoyalty();
    } catch (err: any) {
      setRedeemError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Customer Loyalty & Retention</h1>
          <p className="text-xs text-muted mt-0.5">
            Privilege membership tiers, point accrual per service invoice, and referral rewards
          </p>
        </div>
      </div>

      {/* Tier Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-charcoal">Silver Tier</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium">Standard</span>
          </div>
          <div className="text-[11px] text-muted-dark leading-relaxed">
            1 point earned per ₹100 spent. Applicable on all detailing maintenance washes.
          </div>
        </div>

        <div className="bg-white border border-amber-300 rounded p-4 space-y-2 bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Gold Tier</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">500+ Pts</span>
          </div>
          <div className="text-[11px] text-amber-900 leading-relaxed">
            Priority bay booking queue + complimentary interior ozone sanitization on coating visits.
          </div>
        </div>

        <div className="bg-white border border-zinc-800 rounded p-4 space-y-2 bg-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-charcoal">Platinum VIP</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-charcoal text-white font-medium">1000+ Pts</span>
          </div>
          <div className="text-[11px] text-charcoal leading-relaxed">
            10% privileged discount on all annual coating top-ups + free vehicle pick & drop in Gangtok.
          </div>
        </div>
      </div>

      {/* Loyalty Accounts Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-charcoal text-xs">Customer Loyalty Points Balance</span>
          <span className="text-[11px] text-muted">{accounts.length} Active Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Contact</th>
                <th className="py-2.5 px-4">Tier Status</th>
                <th className="py-2.5 px-4">Referral Code</th>
                <th className="py-2.5 px-4">Points Balance</th>
                <th className="py-2.5 px-4">Total Earned</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    Loading loyalty accounts...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No loyalty records yet.
                  </td>
                </tr>
              ) : (
                accounts.map((acc: any) => (
                  <tr key={acc.id} className="hover:bg-surface/50">
                    <td className="py-3 px-4 font-semibold text-charcoal">
                      {acc.customer_name}
                    </td>
                    <td className="py-3 px-4 text-muted-dark font-mono">
                      {acc.customer_mobile}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(acc.tier))}>
                        {acc.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-charcoal">
                      {acc.referral_code}
                    </td>
                    <td className="py-3 px-4 font-bold text-charcoal font-mono text-sm">
                      {acc.points_balance} pts
                    </td>
                    <td className="py-3 px-4 text-muted font-mono">
                      {acc.total_points_earned} pts
                    </td>
                    <td className="py-3 px-4 text-right">
                      {acc.points_balance > 0 && (
                        <button
                          onClick={() => {
                            setSelectedAccount(acc);
                            setPointsToRedeem(String(Math.min(acc.points_balance, 500)));
                            setRedeemError('');
                            setShowRedeemModal(true);
                          }}
                          className="px-2.5 py-1 bg-surface border border-border text-charcoal rounded text-[11px] font-medium hover:bg-zinc-100"
                        >
                          Redeem Points
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REDEEM POINTS */}
      {showRedeemModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-sm w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Redeem Loyalty Points</h3>
                <p className="text-[11px] text-muted">{selectedAccount.customer_name} (Balance: {selectedAccount.points_balance} pts)</p>
              </div>
              <button onClick={() => setShowRedeemModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRedeemPoints} className="p-4 space-y-3.5 text-xs">
              {redeemError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px]">
                  {redeemError}
                </div>
              )}

              <div>
                <label className="block text-muted font-medium mb-1">Points to Redeem *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedAccount.points_balance}
                  required
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-bold focus:bg-white focus:outline-none"
                />
                <span className="text-[10px] text-muted mt-1 block">
                  1 Point = ₹1 Discount on current service bill.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRedeemModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                >
                  Confirm Redemption
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
