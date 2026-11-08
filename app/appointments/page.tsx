'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Warehouse,
  User,
  Car,
  X,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { Appointment, Service } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils';

function AppointmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');

  // New Booking Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [bays, setBays] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    bay_id: '',
    assigned_staff_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '10:00',
    expected_end_time: '14:00',
    service_ids: [] as string[],
    customer_instructions: '',
    remarks: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let url = `/api/appointments?`;
      if (viewMode === 'calendar') {
        url += `date=${selectedDate}`;
      }
      if (statusFilter) {
        url += `&status=${encodeURIComponent(statusFilter)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const [cRes, vRes, sRes, bRes, eRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/vehicles'),
        fetch('/api/services'),
        fetch('/api/service-bays'),
        fetch('/api/employees'),
      ]);

      const [cData, vData, sData, bData, eData] = await Promise.all([
        cRes.ok ? cRes.json() : [],
        vRes.ok ? vRes.json() : [],
        sRes.ok ? sRes.json() : { services: [] },
        bRes.ok ? bRes.json() : [],
        eRes.ok ? eRes.json() : [],
      ]);

      setCustomers(cData);
      setVehicles(vData);
      setServices(sData.services || []);
      setBays(bData);
      setEmployees(eData);

      if (cData.length > 0 && !formData.customer_id) {
        setFormData((prev) => ({
          ...prev,
          customer_id: cData[0].id,
        }));
        const matching = vData.filter((v: any) => v.customer_id === cData[0].id);
        setFilteredVehicles(matching);
        if (matching.length > 0) {
          setFormData((prev) => ({ ...prev, vehicle_id: matching[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [viewMode, selectedDate, statusFilter]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      loadDropdownData();
      setShowAddModal(true);
    }
  }, [searchParams]);

  const handleCustomerChange = (customerId: string) => {
    const matching = vehicles.filter((v) => v.customer_id === customerId);
    setFilteredVehicles(matching);
    setFormData((prev) => ({
      ...prev,
      customer_id: customerId,
      vehicle_id: matching.length > 0 ? matching[0].id : '',
    }));
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData((prev) => {
      const exists = prev.service_ids.includes(serviceId);
      return {
        ...prev,
        service_ids: exists
          ? prev.service_ids.filter((id) => id !== serviceId)
          : [...prev.service_ids, serviceId],
      };
    });
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Failed to book appointment');
        return;
      }
      setShowAddModal(false);
      fetchAppointments();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  // 1-Click Convert Appointment to Job Card
  const convertToJobCard = (apt: any) => {
    router.push(`/jobcards?action=from_appointment&appointment_id=${apt.id}&customer_id=${apt.customer_id}&vehicle_id=${apt.vehicle_id}&bay_id=${apt.bay_id || ''}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Appointments & Booking Schedule</h1>
          <p className="text-xs text-muted mt-0.5">
            Bay slot scheduling, conflict prevention, and digital job card intake conversion
          </p>
        </div>
        <button
          onClick={() => {
            loadDropdownData();
            setFormError('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* View Switcher and Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-border rounded">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-medium transition-colors',
              viewMode === 'list' ? 'bg-charcoal text-white' : 'text-muted-dark hover:bg-surface'
            )}
          >
            All Bookings List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-medium transition-colors',
              viewMode === 'calendar' ? 'bg-charcoal text-white' : 'text-muted-dark hover:bg-surface'
            )}
          >
            Daily Slot View
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'calendar' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
            />
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Requested">Requested</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Vehicle Received">Vehicle Received</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Appointment Cards / List */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Booking / Date</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Vehicle</th>
                <th className="py-2.5 px-4">Bay & Staff</th>
                <th className="py-2.5 px-4">Selected Services</th>
                <th className="py-2.5 px-4">Est. Amount</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    Loading appointments...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    No appointments scheduled for this filter.
                  </td>
                </tr>
              ) : (
                appointments.map((apt: any) => (
                  <tr key={apt.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-charcoal">{apt.booking_code}</div>
                      <div className="text-[10px] text-muted flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatDate(apt.appointment_date)} • {apt.appointment_time}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-charcoal">{apt.customer_name}</div>
                      <div className="text-[10px] text-muted">{apt.customer_mobile}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-charcoal">{apt.vehicle_reg}</div>
                      <div className="text-[10px] text-muted">{apt.vehicle_make_model} ({apt.vehicle_category})</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-charcoal font-medium">{apt.bay_name || 'Unassigned Bay'}</div>
                      <div className="text-[10px] text-muted">Tech: {apt.assigned_staff_name || 'Unassigned'}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {apt.services && apt.services.length > 0 ? (
                        <div className="space-y-0.5">
                          {apt.services.map((s: any) => (
                            <div key={s.id} className="text-[11px] text-charcoal truncate">
                              • {s.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted italic">General inspection</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-charcoal">
                      {formatCurrency(apt.estimated_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(apt.status))}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {apt.status === 'Confirmed' && (
                        <button
                          onClick={() => convertToJobCard(apt)}
                          className="px-2.5 py-1 bg-charcoal text-white rounded text-[11px] font-medium hover:bg-zinc-800 inline-flex items-center gap-1"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>Intake to JC</span>
                        </button>
                      )}
                      {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                        <button
                          onClick={() => updateStatus(apt.id, 'Cancelled')}
                          className="px-2 py-1 bg-surface border border-border text-rose-700 rounded text-[11px] hover:bg-rose-50"
                          title="Cancel Booking"
                        >
                          Cancel
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

      {/* MODAL: BOOK APPOINTMENT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Book Detailing Appointment</h3>
                <p className="text-[11px] text-muted">Assign service bay, technician, and selected treatments</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-4 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Customer and Vehicle Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Customer *</label>
                  <select
                    required
                    value={formData.customer_id}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Vehicle *</label>
                  <select
                    required
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    {filteredVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.reg_number} - {v.make} {v.model} ({v.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bay and Staff Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Service Bay (Optional / Slot Reservation)</label>
                  <select
                    value={formData.bay_id}
                    onChange={(e) => setFormData({ ...formData, bay_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="">No Bay Pre-allocation</option>
                    {bays.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.bay_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Assigned Lead Technician</label>
                  <select
                    value={formData.assigned_staff_id}
                    onChange={(e) => setFormData({ ...formData, assigned_staff_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="">Assign Later</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Time Slot *</label>
                  <input
                    type="time"
                    required
                    value={formData.appointment_time}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Expected Completion</label>
                  <input
                    type="time"
                    value={formData.expected_end_time}
                    onChange={(e) => setFormData({ ...formData, expected_end_time: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Service Selection Checklist */}
              <div>
                <label className="block text-muted font-medium mb-1.5">Select Detailing Services</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border rounded p-2 bg-surface">
                  {services.map((s) => {
                    const isChecked = formData.service_ids.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition-colors',
                          isChecked ? 'bg-white border-charcoal text-charcoal font-medium' : 'bg-white/60 border-border text-muted-dark hover:bg-white'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleServiceToggle(s.id)}
                          className="rounded text-charcoal focus:ring-0"
                        />
                        <div className="flex-1 truncate">
                          <div className="truncate">{s.name}</div>
                          <div className="text-[10px] text-muted">{formatCurrency(s.standard_price)}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Customer Special Instructions</label>
                <textarea
                  rows={2}
                  value={formData.customer_instructions}
                  onChange={(e) => setFormData({ ...formData, customer_instructions: e.target.value })}
                  placeholder="e.g. Focus on pet hair extraction, inspect front windshield chip..."
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
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting ? 'Checking Conflict & Booking...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading appointments...</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}
