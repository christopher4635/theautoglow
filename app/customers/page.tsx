'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Car,
  Receipt,
  ShieldCheck,
  Clock,
  ArrowRight,
  X,
  Check,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Customer, Vehicle } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

function CustomersContent() {
  const { currentUser, canAccessFinances } = useAuth();
  const searchParams = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // Form State for new Customer
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    alt_mobile: '',
    email: '',
    address: '',
    city: 'Gangtok',
    category: 'Regular',
    remarks: '',
  });

  // Form State for new Vehicle
  const [vehicleFormData, setVehicleFormData] = useState({
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

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      let url = `/api/customers?search=${encodeURIComponent(search)}`;
      if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, selectedCategory]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowAddModal(true);
    }
  }, [searchParams]);

  const viewCustomerProfile = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedCustomerDetail(detail);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Failed to register customer');
        return;
      }
      setShowAddModal(false);
      setFormData({
        name: '',
        mobile: '',
        alt_mobile: '',
        email: '',
        address: '',
        city: 'Gangtok',
        category: 'Regular',
        remarks: '',
      });
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVehicleForCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerDetail) return;
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...vehicleFormData,
          customer_id: selectedCustomerDetail.customer.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Failed to add vehicle');
        return;
      }
      setShowAddVehicleModal(false);
      setVehicleFormData({
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
      // Refresh customer details
      viewCustomerProfile(selectedCustomerDetail.customer.id);
      fetchCustomers();
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
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Customer Relationship Management</h1>
          <p className="text-xs text-muted mt-0.5">
            Centralized customer registry, vehicle profiles, lifetime spend, and service history
          </p>
        </div>
        <button
          onClick={() => {
            setFormError('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Customer</span>
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
            placeholder="Search by customer name, mobile, code, or vehicle reg..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none focus:border-charcoal focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="Regular">Regular</option>
            <option value="VIP">VIP</option>
            <option value="Fleet">Fleet</option>
            <option value="Premium">Premium</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Code / Customer</th>
                <th className="py-2.5 px-4">Contact</th>
                <th className="py-2.5 px-4">Registered Vehicles</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Lifetime Spend</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c: any) => (
                  <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-charcoal">{c.name}</div>
                      <div className="text-[10px] text-muted font-mono">{c.customer_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-charcoal font-medium">{c.mobile}</div>
                      {c.email && <div className="text-[10px] text-muted">{c.email}</div>}
                    </td>
                    <td className="py-3 px-4">
                      {c.registered_vehicles ? (
                        <div className="font-mono text-charcoal font-medium">
                          {c.registered_vehicles}
                        </div>
                      ) : (
                        <span className="text-muted italic">No vehicle linked</span>
                      )}
                      <div className="text-[10px] text-muted">{c.vehicle_count} vehicle(s)</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(c.category))}>
                        {c.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-charcoal">
                      {formatCurrency(c.total_spent)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(c.status))}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => viewCustomerProfile(c.id)}
                        className="px-2.5 py-1 bg-surface border border-border rounded text-charcoal font-medium hover:bg-zinc-100 flex items-center gap-1 inline-flex"
                      >
                        <Eye className="w-3 h-3 text-muted" />
                        <span>Profile</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: REGISTER NEW CUSTOMER */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Register New Customer</h3>
                <p className="text-[11px] text-muted">Customer ID will be auto-generated with duplicate validation</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-4 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-muted font-medium mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Tshering Norbu Lepcha"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Primary Mobile *</label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+91 98000 12345"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Alternate Mobile</label>
                  <input
                    type="tel"
                    value={formData.alt_mobile}
                    onChange={(e) => setFormData({ ...formData, alt_mobile: e.target.value })}
                    placeholder="+91 98000 54321"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="customer@domain.com"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="Regular">Regular</option>
                    <option value="VIP">VIP</option>
                    <option value="Fleet">Fleet</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-muted font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. Development Area, Upper Sichey"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Customer Remarks / Preferences</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Prefers Saturday mornings, allergic to strong cabin fragrances..."
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
                  {submitting ? 'Registering...' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DEDICATED CUSTOMER PROFILE MODAL */}
      {showDetailModal && selectedCustomerDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-4xl w-full max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-charcoal text-white flex items-center justify-center font-bold text-sm">
                  {selectedCustomerDetail.customer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-charcoal">{selectedCustomerDetail.customer.name}</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 font-mono">
                      {selectedCustomerDetail.customer.customer_code}
                    </span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', getStatusBadgeClass(selectedCustomerDetail.customer.category))}>
                      {selectedCustomerDetail.customer.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-3 mt-0.5">
                    <span>{selectedCustomerDetail.customer.mobile}</span>
                    {selectedCustomerDetail.customer.email && <span>• {selectedCustomerDetail.customer.email}</span>}
                    <span>• {selectedCustomerDetail.customer.address}, {selectedCustomerDetail.customer.city}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-muted hover:text-charcoal p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6 text-xs">
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface p-3 rounded border border-border">
                <div>
                  <span className="text-[10px] text-muted uppercase font-medium">Total Lifetime Spend</span>
                  <div className="text-sm font-bold text-charcoal mt-0.5">
                    {formatCurrency(selectedCustomerDetail.customer.total_spent)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-medium">Registered Vehicles</span>
                  <div className="text-sm font-bold text-charcoal mt-0.5">
                    {selectedCustomerDetail.vehicles.length}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-medium">Service Visits</span>
                  <div className="text-sm font-bold text-charcoal mt-0.5">
                    {selectedCustomerDetail.jobCards.length}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-medium">Loyalty Points</span>
                  <div className="text-sm font-bold text-charcoal mt-0.5">
                    {selectedCustomerDetail.loyalty?.points_balance || 0} pts ({selectedCustomerDetail.loyalty?.tier || 'Silver'})
                  </div>
                </div>
              </div>

              {/* Section 1: Registered Vehicles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="font-semibold text-charcoal text-xs flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5" />
                    Registered Vehicles ({selectedCustomerDetail.vehicles.length})
                  </h3>
                  <button
                    onClick={() => {
                      setFormError('');
                      setShowAddVehicleModal(true);
                    }}
                    className="text-[11px] font-medium text-charcoal hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Vehicle
                  </button>
                </div>

                {selectedCustomerDetail.vehicles.length === 0 ? (
                  <div className="p-3 text-center text-muted bg-surface rounded border border-dashed border-border">
                    No vehicles registered for this customer yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedCustomerDetail.vehicles.map((v: Vehicle) => (
                      <div key={v.id} className="p-3 bg-white border border-border rounded space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-charcoal font-mono">{v.reg_number}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-700">
                            {v.category}
                          </span>
                        </div>
                        <div className="text-muted-dark">
                          {v.make} {v.model} {v.variant ? `(${v.variant})` : ''} • {v.color}
                        </div>
                        <div className="text-[10px] text-muted flex items-center justify-between pt-1">
                          <span>Odometer: {v.odometer || 0} km</span>
                          <span>Year: {v.year} • {v.fuel_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Service History (Job Cards) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="font-semibold text-charcoal text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Service History ({selectedCustomerDetail.jobCards.length})
                  </h3>
                </div>

                {selectedCustomerDetail.jobCards.length === 0 ? (
                  <div className="p-3 text-center text-muted bg-surface rounded border border-dashed border-border">
                    No service visits on record.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomerDetail.jobCards.map((j: any) => (
                      <div key={j.id} className="p-2.5 bg-surface border border-border rounded flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-charcoal">{j.job_card_number}</span>
                            <span className="font-mono text-muted">{j.vehicle_reg}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', getStatusBadgeClass(j.status))}>
                              {j.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted mt-0.5">
                            Created: {formatDate(j.created_at)} • Fuel: {j.fuel_level} • In: {j.odometer_in} km
                          </div>
                        </div>
                        <span className="text-xs text-muted-dark">{j.remarks || 'Standard detailing visit'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: Invoices & Warranties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Invoices */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-charcoal text-xs flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                    <Receipt className="w-3.5 h-3.5" /> Invoices
                  </h4>
                  {selectedCustomerDetail.invoices.length === 0 ? (
                    <div className="p-2 text-muted text-center bg-surface rounded">No invoices.</div>
                  ) : (
                    selectedCustomerDetail.invoices.map((i: any) => (
                      <div key={i.id} className="p-2 bg-surface border border-border rounded flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-charcoal">{i.invoice_number}</span>
                          <span className="text-[10px] text-muted block">{formatDate(i.invoice_date)}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-charcoal">{formatCurrency(i.total_amount)}</div>
                          <span className={cn('text-[9px] px-1.5 py-0.2 rounded font-medium', getStatusBadgeClass(i.payment_status))}>
                            {i.payment_status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Warranties */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-charcoal text-xs flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Active Warranties
                  </h4>
                  {selectedCustomerDetail.warranties.length === 0 ? (
                    <div className="p-2 text-muted text-center bg-surface rounded">No warranties issued.</div>
                  ) : (
                    selectedCustomerDetail.warranties.map((w: any) => (
                      <div key={w.id} className="p-2 bg-surface border border-border rounded flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-charcoal">{w.certificate_number}</span>
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD VEHICLE TO SELECTED CUSTOMER */}
      {showAddVehicleModal && selectedCustomerDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Add Vehicle to {selectedCustomerDetail.customer.name}</h3>
                <p className="text-[11px] text-muted">Vehicle code will be generated automatically</p>
              </div>
              <button onClick={() => setShowAddVehicleModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVehicleForCustomer} className="p-4 space-y-3 text-xs">
              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px]">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-muted font-medium mb-1">Registration Number *</label>
                <input
                  type="text"
                  required
                  value={vehicleFormData.reg_number}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, reg_number: e.target.value.toUpperCase() })}
                  placeholder="e.g. SK-01-PA-0001"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded font-mono uppercase text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Manufacturer / Make *</label>
                  <input
                    type="text"
                    required
                    value={vehicleFormData.make}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, make: e.target.value })}
                    placeholder="e.g. Toyota"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Model *</label>
                  <input
                    type="text"
                    required
                    value={vehicleFormData.model}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, model: e.target.value })}
                    placeholder="e.g. Fortuner"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Category *</label>
                  <select
                    value={vehicleFormData.category}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, category: e.target.value })}
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
                    value={vehicleFormData.color}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, color: e.target.value })}
                    placeholder="e.g. Attitude Black"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Fuel Type</label>
                  <select
                    value={vehicleFormData.fuel_type}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, fuel_type: e.target.value })}
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
                    value={vehicleFormData.year}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, year: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    value={vehicleFormData.odometer}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, odometer: e.target.value })}
                    placeholder="15000"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading customer CRM...</div>}>
      <CustomersContent />
    </Suspense>
  );
}
