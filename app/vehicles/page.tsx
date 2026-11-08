'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  Search,
  Plus,
  Eye,
  Clock,
  ShieldCheck,
  ClipboardCheck,
  User,
  X,
  AlertCircle,
} from 'lucide-react';
import { Vehicle } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Vehicle Detail Modal
  const [selectedVehicleDetail, setSelectedVehicleDetail] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Add Vehicle Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    reg_number: '',
    make: '',
    model: '',
    variant: '',
    category: 'SUV',
    color: '',
    fuel_type: 'Petrol',
    year: '2024',
    odometer: '',
    remarks: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      let url = `/api/vehicles?search=${encodeURIComponent(search)}`;
      if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomersForDropdown = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomersList(data);
        if (data.length > 0 && !formData.customer_id) {
          setFormData((prev) => ({ ...prev, customer_id: data[0].id }));
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, categoryFilter]);

  const viewVehicleProfile = async (vehicleId: string) => {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedVehicleDetail(detail);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Failed to register vehicle');
        return;
      }
      setShowAddModal(false);
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Vehicle Management & History</h1>
          <p className="text-xs text-muted mt-0.5">
            Individual vehicle records, complete service tracking, warranties, and maintenance logs
          </p>
        </div>
        <button
          onClick={() => {
            fetchCustomersForDropdown();
            setFormError('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Vehicle</span>
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
            placeholder="Search by registration number, make, model, or owner..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none focus:border-charcoal focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="Hatchback">Hatchback</option>
            <option value="Sedan">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="Luxury">Luxury</option>
            <option value="Premium">Premium</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Registration / Code</th>
                <th className="py-2.5 px-4">Make & Model</th>
                <th className="py-2.5 px-4">Owner</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Service Visits</th>
                <th className="py-2.5 px-4">Total Spent</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    Loading vehicle fleet...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No vehicles found.
                  </td>
                </tr>
              ) : (
                vehicles.map((v: any) => (
                  <tr key={v.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-charcoal font-mono text-xs">{v.reg_number}</div>
                      <div className="text-[10px] text-muted font-mono">{v.vehicle_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-charcoal">{v.make} {v.model}</div>
                      <div className="text-[10px] text-muted">{v.color} • {v.fuel_type} • {v.year}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-charcoal">{v.customer_name}</div>
                      <div className="text-[10px] text-muted">{v.customer_mobile}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700">
                        {v.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-charcoal">{v.service_visits_count}</span>
                      <span className="text-[10px] text-muted block">visits logged</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-charcoal">
                      {formatCurrency(v.total_spent_on_vehicle)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => viewVehicleProfile(v.id)}
                        className="px-2.5 py-1 bg-surface border border-border rounded text-charcoal font-medium hover:bg-zinc-100 flex items-center gap-1 inline-flex"
                      >
                        <Eye className="w-3 h-3 text-muted" />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: VEHICLE PROFILE & LIFETIME HISTORY */}
      {showDetailModal && selectedVehicleDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-4xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-charcoal text-white flex items-center justify-center font-bold text-sm">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-charcoal font-mono">
                      {selectedVehicleDetail.vehicle.reg_number}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 font-mono">
                      {selectedVehicleDetail.vehicle.vehicle_code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-zinc-100 text-zinc-700">
                      {selectedVehicleDetail.vehicle.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                    <span>{selectedVehicleDetail.vehicle.make} {selectedVehicleDetail.vehicle.model}</span>
                    <span>• {selectedVehicleDetail.vehicle.color}</span>
                    <span>• Year {selectedVehicleDetail.vehicle.year}</span>
                    <span>• Owner: {selectedVehicleDetail.vehicle.customer_name} ({selectedVehicleDetail.vehicle.customer_mobile})</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-muted hover:text-charcoal p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6 text-xs">
              {/* Service Cards / Visits History */}
              <div className="space-y-3">
                <h3 className="font-semibold text-charcoal text-xs flex items-center gap-1.5 border-b border-border/60 pb-2">
                  <Clock className="w-3.5 h-3.5" />
                  Service Visits ({selectedVehicleDetail.jobCards.length})
                </h3>
                {selectedVehicleDetail.jobCards.length === 0 ? (
                  <div className="p-3 text-center text-muted bg-surface rounded border border-dashed border-border">
                    No service visits yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedVehicleDetail.jobCards.map((j: any) => (
                      <div key={j.id} className="p-3 bg-surface border border-border rounded flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-charcoal">{j.job_card_number}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', getStatusBadgeClass(j.status))}>
                              {j.status}
                            </span>
                            <span className="text-muted text-[10px]">Odometer In: {j.odometer_in} km</span>
                          </div>
                          <div className="text-[11px] text-muted mt-1">
                            {j.work_notes || j.remarks || 'General Detailing Package'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-muted">{formatDate(j.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Warranties & Inspections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Warranties */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-charcoal text-xs flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Warranties
                  </h4>
                  {selectedVehicleDetail.warranties.length === 0 ? (
                    <div className="p-2 text-muted text-center bg-surface rounded">No warranties on this vehicle.</div>
                  ) : (
                    selectedVehicleDetail.warranties.map((w: any) => (
                      <div key={w.id} className="p-2.5 bg-surface border border-border rounded flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-charcoal">{w.certificate_number}</div>
                          <div className="text-[10px] text-muted-dark">{w.service_name}</div>
                          <div className="text-[10px] text-muted">Expires: {formatDate(w.end_date)}</div>
                        </div>
                        <span className={cn('text-[9px] px-1.5 py-0.2 rounded font-medium', getStatusBadgeClass(w.status))}>
                          {w.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Inspections */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-charcoal text-xs flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5" /> Inspection Records
                  </h4>
                  {selectedVehicleDetail.inspections.length === 0 ? (
                    <div className="p-2 text-muted text-center bg-surface rounded">No inspection checklists recorded.</div>
                  ) : (
                    selectedVehicleDetail.inspections.map((insp: any) => (
                      <div key={insp.id} className="p-2.5 bg-surface border border-border rounded space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-charcoal uppercase text-[10px]">
                            {insp.inspection_type} ({insp.job_card_number})
                          </span>
                          <span className="text-[10px] text-muted">{formatDate(insp.created_at)}</span>
                        </div>
                        <div className="text-[11px] text-muted-dark">
                          Paint: {insp.paint_condition} • Interior: {insp.interior_condition}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER VEHICLE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-lg w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Register Vehicle</h3>
                <p className="text-[11px] text-muted">Link vehicle to customer profile</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="p-4 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px]">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-muted font-medium mb-1">Vehicle Owner (Customer) *</label>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                >
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobile}) - {c.customer_code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Registration Number *</label>
                <input
                  type="text"
                  required
                  value={formData.reg_number}
                  onChange={(e) => setFormData({ ...formData, reg_number: e.target.value.toUpperCase() })}
                  placeholder="e.g. SK-01-AB-1234"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded font-mono uppercase text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Make / Brand *</label>
                  <input
                    type="text"
                    required
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="e.g. Mahindra"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Model *</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g. Scorpio-N"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="Hatchback">Hatchback</option>
                    <option value="Sedan">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="Luxury">Luxury</option>
                    <option value="Premium">Premium</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Color *</label>
                  <input
                    type="text"
                    required
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="e.g. Deep Forest"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Fuel Type</label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    value={formData.odometer}
                    onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                    placeholder="25000"
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
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
