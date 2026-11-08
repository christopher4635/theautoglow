'use client';

import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Search,
  Plus,
  Clock,
  Car,
  User,
  Share2,
  CheckCircle,
  X,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { ServiceReminder } from '@/lib/types';
import { formatDate, getStatusBadgeClass, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function RemindersPage() {
  const { currentUser } = useAuth();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Dispatch Modal
  const [selectedReminder, setSelectedReminder] = useState<any>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [customMsg, setCustomMsg] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState('');

  // New Reminder Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    service_id: '',
    service_name: '9H Matrix Ceramic Coating Maintenance Top-Up',
    last_service_date: new Date().toISOString().split('T')[0],
    next_due_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    recommended_odometer: '25000',
    notes: 'Scheduled 6-month ceramic coating maintenance inspection.',
  });

  const fetchReminders = async () => {
    try {
      setLoading(true);
      let url = '/api/reminders';
      if (statusFilter) url += `?status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [cRes, vRes, sRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/vehicles'),
        fetch('/api/services'),
      ]);
      const [cData, vData, sData] = await Promise.all([
        cRes.ok ? cRes.json() : [],
        vRes.ok ? vRes.json() : [],
        sRes.ok ? sRes.json() : { services: [] },
      ]);
      setCustomers(cData);
      setVehicles(vData);
      setServices(sData.services || []);

      if (cData.length > 0 && !formData.customer_id) {
        setFormData((prev) => ({ ...prev, customer_id: cData[0].id }));
        const match = vData.filter((v: any) => v.customer_id === cData[0].id);
        setFilteredVehicles(match);
        if (match.length > 0) setFormData((prev) => ({ ...prev, vehicle_id: match[0].id }));
      }
    } catch {}
  };

  useEffect(() => {
    fetchReminders();
  }, [statusFilter]);

  const openDispatch = (r: any) => {
    setSelectedReminder(r);
    setChannel('whatsapp');
    setCustomMsg(
      `Dear ${r.customer_name}, your ${r.vehicle_reg} (${r.vehicle_make_model}) is due for ${r.service_name} on ${formatDate(r.next_due_date)} at The Autoglow Sikkim.\n\nPlease contact us at +91 98320 12345 to reserve your detailing bay slot!`
    );
    setDispatchStatus('');
    setShowDispatchModal(true);
  };

  const handleSendReminder = async () => {
    if (!selectedReminder) return;
    try {
      const res = await fetch('/api/reminders/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder_id: selectedReminder.id,
          channel,
          message_content: customMsg,
        }),
      });
      if (res.ok) {
        setDispatchStatus('Dispatched & Logged successfully!');
        setTimeout(() => {
          setShowDispatchModal(false);
          fetchReminders();
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchReminders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markCompleted = async (id: string) => {
    try {
      await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Completed' }),
      });
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Service Due & Maintenance Reminders</h1>
          <p className="text-xs text-muted mt-0.5">
            Automated periodic maintenance triggers, time and kilometre intervals, and WhatsApp notifications
          </p>
        </div>
        <button
          onClick={() => {
            loadDropdowns();
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Service Reminder</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 border border-border rounded">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
          >
            <option value="">All Reminders</option>
            <option value="Upcoming">Upcoming Due</option>
            <option value="Due Today">Due Today</option>
            <option value="Overdue">Overdue Reminders</option>
            <option value="Completed">Completed Services</option>
          </select>
        </div>
      </div>

      {/* Reminders Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Vehicle / Customer</th>
                <th className="py-2.5 px-4">Recommended Service</th>
                <th className="py-2.5 px-4">Last Service Date</th>
                <th className="py-2.5 px-4">Next Due Date</th>
                <th className="py-2.5 px-4">Last Notification</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    Loading reminders...
                  </td>
                </tr>
              ) : reminders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No service reminders matching criteria.
                  </td>
                </tr>
              ) : (
                reminders.map((r: any) => (
                  <tr key={r.id} className="hover:bg-surface/50">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-charcoal">{r.vehicle_reg}</div>
                      <div className="text-[10px] text-muted">{r.customer_name} ({r.customer_mobile})</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-charcoal">
                      {r.service_name}
                      {r.recommended_odometer && (
                        <span className="text-[10px] text-muted block font-mono">
                          Target: {r.recommended_odometer} km
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-dark">
                      {formatDate(r.last_service_date)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-charcoal">
                      {formatDate(r.next_due_date)}
                    </td>
                    <td className="py-3 px-4 text-muted text-[11px]">
                      {r.last_notified_at ? formatDate(r.last_notified_at) : 'Not notified yet'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(r.dynamic_status || r.status))}>
                        {r.dynamic_status || r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => openDispatch(r)}
                        className="px-2 py-1 bg-surface border border-border text-emerald-800 rounded text-[11px] hover:bg-emerald-50 inline-flex items-center gap-1 font-medium"
                      >
                        <Share2 className="w-3 h-3 text-emerald-600" />
                        <span>Send Reminder</span>
                      </button>
                      {r.status !== 'Completed' && (
                        <button
                          onClick={() => markCompleted(r.id)}
                          className="px-2 py-1 bg-surface border border-border text-charcoal rounded text-[11px] hover:bg-zinc-100"
                        >
                          Mark Done
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

      {/* MODAL 1: SEND NOTIFICATION */}
      {showDispatchModal && selectedReminder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Send Service Reminder</h3>
                <p className="text-[11px] text-muted">{selectedReminder.vehicle_reg} • {selectedReminder.customer_name}</p>
              </div>
              <button onClick={() => setShowDispatchModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              {dispatchStatus && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-[11px] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{dispatchStatus}</span>
                </div>
              )}

              <div>
                <label className="block text-muted font-medium mb-1">Dispatch Channel</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setChannel('whatsapp')}
                    className={cn(
                      'flex-1 py-1.5 rounded font-medium border text-xs',
                      channel === 'whatsapp' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-surface text-charcoal border-border'
                    )}
                  >
                    WhatsApp Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('email')}
                    className={cn(
                      'flex-1 py-1.5 rounded font-medium border text-xs',
                      channel === 'email' ? 'bg-charcoal text-white border-charcoal' : 'bg-surface text-charcoal border-border'
                    )}
                  >
                    Email Notification
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Message Content</label>
                <textarea
                  rows={5}
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded text-xs text-charcoal font-sans"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                {channel === 'whatsapp' && (
                  <a
                    href={`https://wa.me/${selectedReminder.customer_mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(customMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleSendReminder}
                    className="px-3.5 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Open & Send on WhatsApp</span>
                  </a>
                )}
                {channel === 'email' && (
                  <button
                    type="button"
                    onClick={handleSendReminder}
                    className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                  >
                    Send Email Notification
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE REMINDER */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Schedule Service Reminder</h3>
                <p className="text-[11px] text-muted">Configurable next maintenance due date</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Customer *</label>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const match = vehicles.filter((v) => v.customer_id === cId);
                    setFilteredVehicles(match);
                    setFormData((prev) => ({
                      ...prev,
                      customer_id: cId,
                      vehicle_id: match.length > 0 ? match[0].id : '',
                    }));
                  }}
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
                      {v.reg_number} - {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Recommended Treatment</label>
                <input
                  type="text"
                  required
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Last Service Date</label>
                  <input
                    type="date"
                    required
                    value={formData.last_service_date}
                    onChange={(e) => setFormData({ ...formData, last_service_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Next Service Due *</label>
                  <input
                    type="date"
                    required
                    value={formData.next_due_date}
                    onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Target Odometer (km)</label>
                <input
                  type="number"
                  value={formData.recommended_odometer}
                  onChange={(e) => setFormData({ ...formData, recommended_odometer: e.target.value })}
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
                  Set Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
