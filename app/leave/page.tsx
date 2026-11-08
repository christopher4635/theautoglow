'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { LeaveApplication, LeaveBalance } from '@/lib/types';
import { formatDate, getStatusBadgeClass, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function LeaveManagementPage() {
  const { currentUser, canManageStaff } = useAuth();

  const [applications, setApplications] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar View
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [activeTab, setActiveTab] = useState<'calendar' | 'applications' | 'balances'>('calendar');

  // Application Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [applyForm, setApplyForm] = useState({
    employee_id: '',
    leave_type: 'Casual Leave',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [applyError, setApplyError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Approval Modal
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState('');

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leave?month=${currentMonth}`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
        setBalances(data.balances || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        if (data.length > 0 && !applyForm.employee_id) {
          setApplyForm((prev) => ({ ...prev, employee_id: data[0].id }));
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchLeaveData();
  }, [currentMonth]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applyForm),
      });
      const json = await res.json();
      if (!res.ok) {
        setApplyError(json.error || 'Failed to submit application');
        return;
      }
      setShowApplyModal(false);
      fetchLeaveData();
    } catch (err: any) {
      setApplyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecideLeave = async (status: 'Approved' | 'Rejected') => {
    if (!selectedApp) return;
    try {
      const res = await fetch('/api/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedApp.id,
          status,
          approval_remarks: approvalRemarks,
          approved_by: currentUser?.name || 'Manager',
        }),
      });
      if (res.ok) {
        setShowApprovalModal(false);
        fetchLeaveData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate Interactive Calendar Grid Days for currentMonth
  const getDaysInMonth = () => {
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const firstDay = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
    const daysInCurrent = new Date(year, month, 0).getDate();

    const days: Array<{ day: number; dateStr: string; leaves: any[] }> = [];

    for (let i = 1; i <= daysInCurrent; i++) {
      const dayStr = String(i).padStart(2, '0');
      const dateStr = `${currentMonth}-${dayStr}`;

      // Check which approved or pending leaves cover this day
      const leavesOnThisDay = applications.filter((app) => {
        return dateStr >= app.start_date && dateStr <= app.end_date;
      });

      days.push({
        day: i,
        dateStr,
        leaves: leavesOnThisDay,
      });
    }

    return { firstDay, days };
  };

  const { firstDay, days } = getDaysInMonth();

  const changeMonth = (delta: number) => {
    const [yearStr, monthStr] = currentMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + delta;
    if (month > 12) {
      month = 1;
      year += 1;
    } else if (month < 1) {
      month = 12;
      year -= 1;
    }
    setCurrentMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Staff Leave Management & Calendar</h1>
          <p className="text-xs text-muted mt-0.5">
            Interactive monthly roster, leave entitlements, approval workflows, and automated attendance sync
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Stepper */}
          <div className="flex items-center gap-1 bg-white border border-border rounded p-1 text-xs font-mono">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-surface rounded text-muted hover:text-charcoal">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-medium text-charcoal">{currentMonth}</span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-surface rounded text-muted hover:text-charcoal">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              fetchEmployees();
              setApplyError('');
              setShowApplyModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border text-xs">
        <button
          onClick={() => setActiveTab('calendar')}
          className={cn(
            'px-3.5 py-2 font-medium border-b-2 transition-colors',
            activeTab === 'calendar' ? 'border-charcoal text-charcoal font-semibold' : 'border-transparent text-muted hover:text-charcoal'
          )}
        >
          Interactive Leave Calendar
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={cn(
            'px-3.5 py-2 font-medium border-b-2 transition-colors',
            activeTab === 'applications' ? 'border-charcoal text-charcoal font-semibold' : 'border-transparent text-muted hover:text-charcoal'
          )}
        >
          Leave Applications ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          className={cn(
            'px-3.5 py-2 font-medium border-b-2 transition-colors',
            activeTab === 'balances' ? 'border-charcoal text-charcoal font-semibold' : 'border-transparent text-muted hover:text-charcoal'
          )}
        >
          Annual Leave Balances
        </button>
      </div>

      {/* TAB 1: INTERACTIVE MONTHLY LEAVE CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="bg-white border border-border rounded p-4 space-y-4">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-border/60">
            <span className="font-semibold text-charcoal">
              Staff Leave Schedule for {currentMonth}
            </span>
            <div className="flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" /> Approved Leave
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Pending Approval
              </span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden border border-border text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="bg-surface py-2 px-3 font-semibold text-center text-muted uppercase text-[10px]">
                {d}
              </div>
            ))}

            {/* Empty slots before first day */}
            {Array.from({ length: firstDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="bg-white/40 min-h-[90px] p-2" />
            ))}

            {/* Days of Month */}
            {days.map((item) => (
              <div key={item.day} className="bg-white min-h-[90px] p-2 space-y-1 relative group hover:bg-surface/30">
                <div className="text-[11px] font-mono font-medium text-muted-dark">{item.day}</div>

                <div className="space-y-1">
                  {item.leaves.map((leave: any) => (
                    <button
                      key={leave.id}
                      onClick={() => {
                        setSelectedApp(leave);
                        setApprovalRemarks(leave.approval_remarks || '');
                        setShowApprovalModal(true);
                      }}
                      className={cn(
                        'w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate block',
                        leave.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      )}
                    >
                      {leave.employee_name.split(' ')[0]} ({leave.leave_type.split(' ')[0]})
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: APPLICATIONS LIST & APPROVAL */}
      {activeTab === 'applications' && (
        <div className="bg-white border border-border rounded overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Leave Type</th>
                <th className="py-2.5 px-4">Duration / Dates</th>
                <th className="py-2.5 px-4">Reason</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    No leave applications recorded for this month.
                  </td>
                </tr>
              ) : (
                applications.map((app: any) => (
                  <tr key={app.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-charcoal">
                      {app.employee_name}
                      <span className="text-[10px] text-muted block font-mono font-normal">{app.employee_code}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-charcoal">{app.leave_type}</td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-charcoal">{formatDate(app.start_date)} to {formatDate(app.end_date)}</div>
                      <span className="text-[10px] text-muted">{app.total_days} Day(s)</span>
                    </td>
                    <td className="py-3 px-4 text-muted-dark max-w-xs">{app.reason}</td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(app.status))}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setApprovalRemarks(app.approval_remarks || '');
                          setShowApprovalModal(true);
                        }}
                        className="px-2.5 py-1 bg-surface border border-border rounded text-charcoal font-medium hover:bg-zinc-100"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: LEAVE BALANCES */}
      {activeTab === 'balances' && (
        <div className="bg-white border border-border rounded overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Leave Type</th>
                <th className="py-2.5 px-4">Annual Entitlement</th>
                <th className="py-2.5 px-4">Consumed Days</th>
                <th className="py-2.5 px-4">Remaining Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {balances.map((b: any) => (
                <tr key={b.id} className="hover:bg-surface/50">
                  <td className="py-3 px-4 font-semibold text-charcoal">
                    {b.employee_name} ({b.employee_code})
                  </td>
                  <td className="py-3 px-4 font-medium text-charcoal">{b.leave_type}</td>
                  <td className="py-3 px-4 font-mono">{b.annual_entitlement} Days</td>
                  <td className="py-3 px-4 font-mono text-amber-700">{b.consumed_days} Days</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-800">{b.remaining_days} Days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: APPLY LEAVE */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Apply for Staff Leave</h3>
                <p className="text-[11px] text-muted">Checks remaining balance and updates schedule</p>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-4 space-y-3.5 text-xs">
              {applyError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px]">
                  {applyError}
                </div>
              )}

              <div>
                <label className="block text-muted font-medium mb-1">Employee *</label>
                <select
                  required
                  value={applyForm.employee_id}
                  onChange={(e) => setApplyForm({ ...applyForm, employee_id: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Leave Type *</label>
                <select
                  value={applyForm.leave_type}
                  onChange={(e) => setApplyForm({ ...applyForm, leave_type: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Earned Leave">Earned Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={applyForm.start_date}
                    onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={applyForm.end_date}
                    onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Reason for Leave *</label>
                <textarea
                  rows={2}
                  required
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="e.g. Family function in Kalimpong, medical checkup..."
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: APPROVE / REJECT LEAVE (MANAGER / ADMIN) */}
      {showApprovalModal && selectedApp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Review Leave Application</h3>
                <p className="text-[11px] text-muted">
                  {selectedApp.employee_name} • {selectedApp.leave_type} ({selectedApp.total_days} days)
                </p>
              </div>
              <button onClick={() => setShowApprovalModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="p-3 bg-surface rounded border border-border space-y-1">
                <div><strong>Duration:</strong> {formatDate(selectedApp.start_date)} to {formatDate(selectedApp.end_date)}</div>
                <div><strong>Reason:</strong> {selectedApp.reason}</div>
                <div><strong>Current Status:</strong> {selectedApp.status}</div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Manager Remarks</label>
                <input
                  type="text"
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="e.g. Approved. Shift covered by Sonam."
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleDecideLeave('Rejected')}
                  className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs font-medium hover:bg-rose-100"
                >
                  Reject Application
                </button>
                <button
                  type="button"
                  onClick={() => handleDecideLeave('Approved')}
                  className="px-3.5 py-1.5 bg-emerald-700 text-white rounded text-xs font-medium hover:bg-emerald-800"
                >
                  Approve & Sync Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
