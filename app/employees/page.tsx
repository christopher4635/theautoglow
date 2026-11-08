'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  X,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { Employee } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function EmployeesPage() {
  const { currentUser, canAccessFinances } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    designation: 'Master Detailer',
    department: 'Detailing Floor',
    joining_date: new Date().toISOString().split('T')[0],
    monthly_salary: '35000',
    employment_type: 'Full-time',
    emergency_contact: '',
    address: 'Gangtok, Sikkim',
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      let url = `/api/employees?search=${encodeURIComponent(search)}`;
      if (deptFilter) url += `&department=${encodeURIComponent(deptFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, deptFilter]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchEmployees();
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
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Staff & Employee Database</h1>
          <p className="text-xs text-muted mt-0.5">
            Technicians, floor managers, billing officers, and operational assignments
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Employee</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-border rounded">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, employee code, mobile, designation..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none focus:border-charcoal focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
          >
            <option value="">All Departments</option>
            <option value="Detailing Floor">Detailing Floor</option>
            <option value="Operations">Operations</option>
            <option value="Finance">Finance</option>
            <option value="Management">Management</option>
          </select>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-muted text-xs">
            Loading employee registry...
          </div>
        ) : employees.length === 0 ? (
          <div className="col-span-3 py-8 text-center text-muted text-xs">
            No employees found.
          </div>
        ) : (
          employees.map((emp) => (
            <div key={emp.id} className="bg-white border border-border rounded p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded bg-zinc-200 text-charcoal font-bold flex items-center justify-center text-sm">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-charcoal">{emp.name}</h3>
                      <div className="text-[10px] text-muted font-mono">{emp.employee_code} • {emp.department}</div>
                    </div>
                  </div>

                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(emp.status))}>
                    {emp.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-muted-dark">
                  <div className="font-medium text-charcoal flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-muted" />
                    <span>{emp.designation} ({emp.employment_type})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted" />
                    <span>{emp.mobile}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted" />
                    <span>{emp.email}</span>
                  </div>
                </div>

                {/* Performance & Status Indicators */}
                <div className="mt-3 p-2 bg-surface rounded border border-border/50 text-[11px] grid grid-cols-2 gap-2 text-muted-dark">
                  <div>
                    <span className="text-[10px] text-muted block">Jobs Assigned:</span>
                    <strong className="text-charcoal font-mono">{emp.total_jobs_assigned || 0}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted block">Today Attendance:</span>
                    <span className={cn('font-medium', emp.today_attendance === 'Present' ? 'text-emerald-700' : 'text-amber-700')}>
                      {emp.today_attendance || 'Not Marked'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                {canAccessFinances() ? (
                  <span className="font-mono text-charcoal font-semibold text-[11px]">
                    Salary: {formatCurrency(emp.monthly_salary)}/mo
                  </span>
                ) : (
                  <span className="text-muted text-[10px]">Joined: {formatDate(emp.joining_date)}</span>
                )}
                <span className="text-[10px] text-muted font-mono">
                  {emp.employment_type}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: ADD EMPLOYEE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-lg w-full max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Register Team Member</h3>
                <p className="text-[11px] text-muted">Auto-allocates employee code and leave entitlements</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mingma Sherpa"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Mobile *</label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+91 98320 00000"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@theautoglow.in"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Lead PPF Specialist"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="Detailing Floor">Detailing Floor</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={formData.monthly_salary}
                    onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
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
                  Register Team Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
