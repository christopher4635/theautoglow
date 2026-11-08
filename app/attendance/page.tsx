'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { AttendanceRecord } from '@/lib/types';
import { formatDate, getStatusBadgeClass, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function AttendancePage() {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ total: 0, present: 0, absent: 0, half_day: 0, leave: 0, not_marked: 0 });
  const [loading, setLoading] = useState(true);

  // Quick mark status
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchDailyAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyAttendance();
  }, [selectedDate]);

  const markAttendance = async (employeeId: string, status: string) => {
    try {
      setUpdatingId(employeeId);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          attendance_date: selectedDate,
          status,
          check_in: status === 'Present' ? '09:00' : null,
          working_hours: status === 'Present' ? 8.0 : status === 'Half Day' ? 4.0 : 0,
        }),
      });
      if (res.ok) {
        fetchDailyAttendance();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Staff Attendance & Time Clock</h1>
          <p className="text-xs text-muted mt-0.5">
            Daily check-in verification, working hours, approved leave synchronization, and overtime
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5 bg-white border border-border rounded p-1 text-xs">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1 hover:bg-surface rounded text-muted hover:text-charcoal"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2 py-0.5 bg-surface border border-border rounded text-xs font-mono text-charcoal focus:outline-none"
          />
          <button
            onClick={() => shiftDate(1)}
            className="p-1 hover:bg-surface rounded text-muted hover:text-charcoal"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-border rounded p-3 text-center">
          <span className="text-[10px] text-muted uppercase font-medium">Total Staff</span>
          <div className="text-lg font-bold text-charcoal mt-1">{summary.total}</div>
        </div>
        <div className="bg-white border border-border rounded p-3 text-center">
          <span className="text-[10px] text-emerald-700 uppercase font-medium">Present</span>
          <div className="text-lg font-bold text-emerald-700 mt-1">{summary.present}</div>
        </div>
        <div className="bg-white border border-border rounded p-3 text-center">
          <span className="text-[10px] text-rose-700 uppercase font-medium">Absent</span>
          <div className="text-lg font-bold text-rose-700 mt-1">{summary.absent}</div>
        </div>
        <div className="bg-white border border-border rounded p-3 text-center">
          <span className="text-[10px] text-blue-700 uppercase font-medium">On Leave</span>
          <div className="text-lg font-bold text-blue-700 mt-1">{summary.leave}</div>
        </div>
        <div className="bg-white border border-border rounded p-3 text-center">
          <span className="text-[10px] text-amber-700 uppercase font-medium">Unmarked</span>
          <div className="text-lg font-bold text-amber-700 mt-1">{summary.not_marked}</div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Department & Role</th>
                <th className="py-2.5 px-4">Check-In / Out</th>
                <th className="py-2.5 px-4">Working Hours</th>
                <th className="py-2.5 px-4">Status for {formatDate(selectedDate)}</th>
                <th className="py-2.5 px-4 text-right">Quick Mark Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    Loading attendance records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    No active staff found.
                  </td>
                </tr>
              ) : (
                records.map((r: any) => {
                  const isUpdating = updatingId === r.employee_id;
                  return (
                    <tr key={r.employee_id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-charcoal">{r.employee_name}</div>
                        <div className="text-[10px] text-muted font-mono">{r.employee_code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-charcoal font-medium">{r.designation}</div>
                        <div className="text-[10px] text-muted">{r.department}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-dark">
                        {r.check_in ? `${r.check_in} - ${r.check_out || 'Active'}` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-charcoal font-medium">
                          {r.working_hours ? `${r.working_hours} hrs` : '-'}
                        </span>
                        {r.overtime_hours > 0 && (
                          <span className="text-[10px] text-emerald-700 block">+{r.overtime_hours} hrs OT</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {r.status ? (
                          <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(r.status))}>
                            {r.status}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-500">
                            Not Marked
                          </span>
                        )}
                        {r.remarks && <div className="text-[10px] text-muted mt-0.5">{r.remarks}</div>}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          disabled={isUpdating}
                          onClick={() => markAttendance(r.employee_id, 'Present')}
                          className={cn(
                            'px-2 py-1 rounded text-[10px] font-medium border transition-colors',
                            r.status === 'Present'
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white text-zinc-700 border-border hover:bg-emerald-50 hover:text-emerald-800'
                          )}
                        >
                          Present
                        </button>
                        <button
                          disabled={isUpdating}
                          onClick={() => markAttendance(r.employee_id, 'Half Day')}
                          className={cn(
                            'px-2 py-1 rounded text-[10px] font-medium border transition-colors',
                            r.status === 'Half Day'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-zinc-700 border-border hover:bg-amber-50 hover:text-amber-800'
                          )}
                        >
                          Half Day
                        </button>
                        <button
                          disabled={isUpdating}
                          onClick={() => markAttendance(r.employee_id, 'Absent')}
                          className={cn(
                            'px-2 py-1 rounded text-[10px] font-medium border transition-colors',
                            r.status === 'Absent'
                              ? 'bg-rose-700 text-white border-rose-700'
                              : 'bg-white text-zinc-700 border-border hover:bg-rose-50 hover:text-rose-800'
                          )}
                        >
                          Absent
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
