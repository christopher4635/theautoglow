'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Car,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Package,
  Receipt,
  ShieldCheck,
  ClipboardCheck,
  X,
  Eye,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { JobCard, Service, Employee } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime, getStatusBadgeClass, cn } from '@/lib/utils';

function JobCardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobCards, setJobCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Detail Modal
  const [selectedJobDetail, setSelectedJobDetail] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Consumables Allocation Modal
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [consumeQuantity, setConsumeQuantity] = useState(1);
  const [consumeError, setConsumeError] = useState('');

  // QC Checklist Modal
  const [showQCModal, setShowQCModal] = useState(false);
  const [qcNotes, setQCNotes] = useState('');

  // Create Job Card Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [bays, setBays] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // New JC Form
  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    bay_id: '',
    primary_staff_id: '',
    odometer_in: '',
    fuel_level: '1/2',
    remarks: '',
    estimated_completion: '',
    service_ids: [] as string[],
    scratches: '',
    dents: '',
    paint_condition: 'Good',
    interior_condition: 'Clean',
    wheel_condition: 'Good',
    glass_condition: 'Good',
    accessories: 'Original mats, Spare key, Dashcam',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      let url = `/api/jobcards?search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setJobCards(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [cRes, vRes, sRes, bRes, eRes, pRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/vehicles'),
        fetch('/api/services'),
        fetch('/api/service-bays'),
        fetch('/api/employees'),
        fetch('/api/inventory'),
      ]);

      const [cData, vData, sData, bData, eData, pData] = await Promise.all([
        cRes.ok ? cRes.json() : [],
        vRes.ok ? vRes.json() : [],
        sRes.ok ? sRes.json() : { services: [] },
        bRes.ok ? bRes.json() : [],
        eRes.ok ? eRes.json() : [],
        pRes.ok ? pRes.json() : { products: [] },
      ]);

      setCustomers(cData);
      setVehicles(vData);
      setServices(sData.services || []);
      setBays(bData);
      setEmployees(eData);
      setInventoryProducts(pData.products || []);

      if (cData.length > 0 && !formData.customer_id) {
        setFormData((prev) => ({ ...prev, customer_id: cData[0].id }));
        const match = vData.filter((v: any) => v.customer_id === cData[0].id);
        setFilteredVehicles(match);
        if (match.length > 0) {
          setFormData((prev) => ({ ...prev, vehicle_id: match[0].id }));
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchJobCards();
  }, [search, statusFilter]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'from_appointment') {
      loadDropdowns();
      setShowCreateModal(true);
      if (action === 'from_appointment') {
        const cId = searchParams.get('customer_id');
        const vId = searchParams.get('vehicle_id');
        const bId = searchParams.get('bay_id');
        if (cId) setFormData((prev) => ({ ...prev, customer_id: cId, vehicle_id: vId || '', bay_id: bId || '' }));
      }
    }
  }, [searchParams]);

  const viewJobDetails = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobcards/${jobId}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedJobDetail(detail);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const match = vehicles.filter((v) => v.customer_id === customerId);
    setFilteredVehicles(match);
    setFormData((prev) => ({
      ...prev,
      customer_id: customerId,
      vehicle_id: match.length > 0 ? match[0].id : '',
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

  const handleCreateJobCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const selectedServicesList = services
        .filter((s) => formData.service_ids.includes(s.id))
        .map((s) => ({
          service_id: s.id,
          service_name: s.name,
          price: s.standard_price,
        }));

      const payload = {
        customer_id: formData.customer_id,
        vehicle_id: formData.vehicle_id,
        bay_id: formData.bay_id || null,
        primary_staff_id: formData.primary_staff_id || null,
        odometer_in: formData.odometer_in,
        fuel_level: formData.fuel_level,
        remarks: formData.remarks,
        estimated_completion: formData.estimated_completion,
        service_items: selectedServicesList,
        assigned_employee_ids: formData.primary_staff_id
          ? [{ employee_id: formData.primary_staff_id, role: 'Lead Detailer' }]
          : [],
        intake_inspection: {
          scratches: formData.scratches ? formData.scratches.split(',').map((s) => s.trim()) : [],
          dents: formData.dents ? formData.dents.split(',').map((d) => d.trim()) : [],
          paint_condition: formData.paint_condition,
          interior_condition: formData.interior_condition,
          wheel_condition: formData.wheel_condition,
          glass_condition: formData.glass_condition,
          accessories_checked: formData.accessories ? formData.accessories.split(',').map((a) => a.trim()) : [],
          photos: ['/sample-intake.jpg'],
          customer_signature: 'Digitally Acknowledged on Intake',
        },
      };

      const res = await fetch('/api/jobcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Failed to generate job card');
        return;
      }

      setShowCreateModal(false);
      fetchJobCards();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/jobcards/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (selectedJobDetail) {
          viewJobDetails(jobId);
        }
        fetchJobCards();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Consume stock against job card
  const handleAllocateConsumable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobDetail || !selectedProduct) return;
    setConsumeError('');
    try {
      const res = await fetch(`/api/jobcards/${selectedJobDetail.jobCard.id}/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct,
          quantity: consumeQuantity,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setConsumeError(json.error || 'Failed to allocate stock');
        return;
      }
      setShowConsumeModal(false);
      viewJobDetails(selectedJobDetail.jobCard.id);
    } catch (err: any) {
      setConsumeError(err.message);
    }
  };

  // Submit Quality Check
  const handleSubmitQC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobDetail) return;
    try {
      const res = await fetch(`/api/jobcards/${selectedJobDetail.jobCard.id}/inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_type: 'post_service',
          notes: qcNotes,
          paint_condition: 'Showroom Flawless',
          customer_signature: 'Handover Quality Passed',
        }),
      });
      if (res.ok) {
        setShowQCModal(false);
        viewJobDetails(selectedJobDetail.jobCard.id);
        fetchJobCards();
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
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Digital Job Cards & Operations</h1>
          <p className="text-xs text-muted mt-0.5">
            Intake checklists, bay assignment, consumable tracking, and quality control workflow
          </p>
        </div>
        <button
          onClick={() => {
            loadDropdowns();
            setFormError('');
            setShowCreateModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Digital Job Card</span>
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
            placeholder="Search by job card #, vehicle reg, customer name..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none focus:border-charcoal focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Vehicle Received">Vehicle Received</option>
            <option value="Work in Progress">Work in Progress</option>
            <option value="Quality Check">Quality Check</option>
            <option value="Completed">Completed</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Job Cards Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Job Card #</th>
                <th className="py-2.5 px-4">Vehicle / Customer</th>
                <th className="py-2.5 px-4">Bay & Lead Tech</th>
                <th className="py-2.5 px-4">Services Configured</th>
                <th className="py-2.5 px-4">Status Workflow</th>
                <th className="py-2.5 px-4">Invoice / Due</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    Loading job cards...
                  </td>
                </tr>
              ) : jobCards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No active job cards found.
                  </td>
                </tr>
              ) : (
                jobCards.map((jc: any) => (
                  <tr key={jc.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-charcoal">{jc.job_card_number}</div>
                      <div className="text-[10px] text-muted font-mono">{formatDate(jc.created_at)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-charcoal">{jc.vehicle_reg}</div>
                      <div className="text-[10px] text-muted">{jc.vehicle_make_model} • {jc.customer_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-charcoal">{jc.bay_name || 'No Bay Assigned'}</div>
                      <div className="text-[10px] text-muted">{jc.primary_staff_name || 'Staff Unassigned'}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {jc.services && jc.services.length > 0 ? (
                        <div className="space-y-0.5">
                          {jc.services.map((s: any) => (
                            <div key={s.id} className="text-[11px] text-charcoal truncate">
                              • {s.service_name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted italic">Inspection & detail</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(jc.status))}>
                        {jc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {jc.invoice_number ? (
                        <div>
                          <span className="font-medium text-charcoal">{jc.invoice_number}</span>
                          <div className="text-[10px] text-muted">
                            Total: {formatCurrency(jc.invoice_total)} • Bal: {formatCurrency(jc.invoice_balance)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted italic">Invoice not generated</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => viewJobDetails(jc.id)}
                        className="px-2.5 py-1 bg-surface border border-border rounded text-charcoal font-medium hover:bg-zinc-100 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-muted" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: FULL JOB CARD WORKFLOW DETAILS */}
      {showDetailModal && selectedJobDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-4xl w-full max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-charcoal text-white flex items-center justify-center font-bold text-sm">
                  JC
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-charcoal font-mono">
                      {selectedJobDetail.jobCard.job_card_number}
                    </h2>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', getStatusBadgeClass(selectedJobDetail.jobCard.status))}>
                      {selectedJobDetail.jobCard.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-semibold">{selectedJobDetail.jobCard.vehicle_reg}</span>
                    <span>({selectedJobDetail.jobCard.vehicle_make_model})</span>
                    <span>• Customer: {selectedJobDetail.jobCard.customer_name} ({selectedJobDetail.jobCard.customer_mobile})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Workflow Transitions */}
                {selectedJobDetail.jobCard.status === 'Vehicle Received' && (
                  <button
                    onClick={() => updateJobStatus(selectedJobDetail.jobCard.id, 'Work in Progress')}
                    className="px-2.5 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700"
                  >
                    Start Work
                  </button>
                )}
                {selectedJobDetail.jobCard.status === 'Work in Progress' && (
                  <button
                    onClick={() => {
                      setQCNotes('');
                      setShowQCModal(true);
                    }}
                    className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                  >
                    Conduct Quality Check
                  </button>
                )}
                {selectedJobDetail.jobCard.status === 'Quality Check' && (
                  <button
                    onClick={() => updateJobStatus(selectedJobDetail.jobCard.id, 'Completed')}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
                  >
                    Mark Service Completed
                  </button>
                )}
                {selectedJobDetail.jobCard.status === 'Completed' && (
                  <button
                    onClick={() => updateJobStatus(selectedJobDetail.jobCard.id, 'Delivered')}
                    className="px-2.5 py-1 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                  >
                    Deliver to Customer
                  </button>
                )}

                <button onClick={() => setShowDetailModal(false)} className="text-muted hover:text-charcoal p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6 text-xs">
              {/* Job Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface p-3 rounded border border-border">
                <div>
                  <span className="text-[10px] text-muted uppercase font-medium">Service Bay</span>
                  <div className="text-xs font-bold text-charcoal mt-0.5">
                    {selectedJobDetail.jobCard.bay_name || 'Floor'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-medium">Lead Technician</span>
                  <div className="text-xs font-bold text-charcoal mt-0.5">
                    {selectedJobDetail.jobCard.primary_staff_name || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-medium">Fuel Level / Odometer</span>
                  <div className="text-xs font-bold text-charcoal mt-0.5">
                    {selectedJobDetail.jobCard.fuel_level} • {selectedJobDetail.jobCard.odometer_in} km
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-medium">Consumables Cost</span>
                  <div className="text-xs font-bold text-charcoal mt-0.5">
                    {formatCurrency(selectedJobDetail.totalConsumableCost)}
                  </div>
                </div>
              </div>

              {/* Services in this Job Card */}
              <div className="space-y-2">
                <h3 className="font-semibold text-charcoal text-xs border-b border-border/60 pb-1.5 flex items-center justify-between">
                  <span>Selected Detailing Treatments ({selectedJobDetail.services.length})</span>
                  <span>
                    Total: {formatCurrency(selectedJobDetail.services.reduce((acc: number, s: any) => acc + s.price, 0))}
                  </span>
                </h3>
                <div className="divide-y divide-border bg-surface rounded border border-border">
                  {selectedJobDetail.services.map((s: any) => (
                    <div key={s.id} className="p-2.5 flex items-center justify-between">
                      <span className="font-medium text-charcoal">{s.service_name}</span>
                      <span className="font-semibold text-charcoal">{formatCurrency(s.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consumables Used on Job */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                  <h3 className="font-semibold text-charcoal text-xs flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    Consumables Consumed & Job Material Cost
                  </h3>
                  <button
                    onClick={() => {
                      loadDropdowns();
                      setConsumeError('');
                      setShowConsumeModal(true);
                    }}
                    className="text-[11px] font-medium text-charcoal hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Allocate Consumable
                  </button>
                </div>

                {selectedJobDetail.consumables.length === 0 ? (
                  <div className="p-3 text-center text-muted bg-surface rounded border border-dashed border-border">
                    No consumables allocated yet. Click 'Allocate Consumable' to deduct stock & calculate job cost.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedJobDetail.consumables.map((c: any) => (
                      <div key={c.id} className="p-2 bg-surface border border-border rounded flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-charcoal">{c.product_name}</span>
                          <span className="text-[10px] text-muted ml-2">({c.sku})</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-charcoal">{c.quantity} {c.unit}</span>
                          <span className="text-muted ml-2">({formatCurrency(c.total_cost)})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle Inspection Checklists (Intake & Post-Service) */}
              <div className="space-y-2">
                <h3 className="font-semibold text-charcoal text-xs border-b border-border/60 pb-1.5 flex items-center gap-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Vehicle Inspection Reports & Acknowledgements
                </h3>

                {selectedJobDetail.inspections.length === 0 ? (
                  <div className="p-3 text-center text-muted bg-surface rounded border border-dashed border-border">
                    No inspection checklists attached.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedJobDetail.inspections.map((insp: any) => (
                      <div key={insp.id} className="p-3 bg-surface border border-border rounded space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-charcoal uppercase text-[11px]">
                            {insp.inspection_type === 'intake' ? 'Vehicle Intake Condition' : 'Post-Service Quality Check'}
                          </span>
                          <span className="text-[10px] text-muted font-mono">{formatDate(insp.created_at)}</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-dark">
                          <div>Paint: <span className="font-medium text-charcoal">{insp.paint_condition}</span></div>
                          <div>Interior: <span className="font-medium text-charcoal">{insp.interior_condition}</span></div>
                          <div>Wheels: <span className="font-medium text-charcoal">{insp.wheel_condition}</span></div>
                          <div>Glass: <span className="font-medium text-charcoal">{insp.glass_condition}</span></div>
                        </div>

                        {insp.scratches && insp.scratches.length > 0 && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                            <strong>Existing Scratches noted:</strong> {insp.scratches.join(', ')}
                          </div>
                        )}

                        {insp.notes && (
                          <div className="text-[11px] text-muted-dark">
                            <strong>Inspector Notes:</strong> {insp.notes}
                          </div>
                        )}

                        <div className="text-[10px] text-muted flex items-center justify-between pt-1 border-t border-border/40">
                          <span>Ack: {insp.customer_signature || 'Digital Sign'}</span>
                          <span className="text-emerald-700 font-medium">✓ Condition Certified</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Billing / Invoice Integration */}
              <div className="p-3 bg-surface border border-border rounded flex items-center justify-between">
                <div>
                  <span className="font-semibold text-charcoal">Billing & Invoicing</span>
                  {selectedJobDetail.invoice ? (
                    <div className="text-[11px] text-muted mt-0.5">
                      Invoice: {selectedJobDetail.invoice.invoice_number} • Total: {formatCurrency(selectedJobDetail.invoice.total_amount)} ({selectedJobDetail.invoice.payment_status})
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted mt-0.5">
                      No invoice generated yet for this job card.
                    </div>
                  )}
                </div>

                {selectedJobDetail.invoice ? (
                  <Link
                    href={`/billing`}
                    className="px-3 py-1 bg-white border border-border rounded text-charcoal font-medium hover:bg-zinc-50"
                  >
                    View Invoice
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      router.push(`/billing?action=new&job_card_id=${selectedJobDetail.jobCard.id}&customer_id=${selectedJobDetail.jobCard.customer_id}&vehicle_id=${selectedJobDetail.jobCard.vehicle_id}`);
                    }}
                    className="px-3 py-1.5 bg-charcoal text-white rounded font-medium hover:bg-zinc-800"
                  >
                    Generate Invoice
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE DIGITAL JOB CARD */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Create Digital Job Card & Intake Checklist</h3>
                <p className="text-[11px] text-muted">Complete pre-service vehicle inspection and bay allocation</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJobCard} className="p-4 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px]">
                  {formError}
                </div>
              )}

              {/* Customer & Vehicle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Customer *</label>
                  <select
                    required
                    value={formData.customer_id}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
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
                        {v.reg_number} ({v.make} {v.model})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bay, Staff & Odometer */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Service Bay</label>
                  <select
                    value={formData.bay_id}
                    onChange={(e) => setFormData({ ...formData, bay_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="">Floor / Unassigned</option>
                    {bays.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Lead Detailer</label>
                  <select
                    value={formData.primary_staff_id}
                    onChange={(e) => setFormData({ ...formData, primary_staff_id: e.target.value })}
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
                <div>
                  <label className="block text-muted font-medium mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    value={formData.odometer_in}
                    onChange={(e) => setFormData({ ...formData, odometer_in: e.target.value })}
                    placeholder="18400"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Fuel Level & Completion */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Fuel Level Indicator</label>
                  <select
                    value={formData.fuel_level}
                    onChange={(e) => setFormData({ ...formData, fuel_level: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="1/4">1/4 Tank</option>
                    <option value="1/2">1/2 Tank</option>
                    <option value="3/4">3/4 Tank</option>
                    <option value="Full">Full Tank</option>
                    <option value="Reserve">Reserve</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Estimated Handover Time</label>
                  <input
                    type="datetime-local"
                    value={formData.estimated_completion}
                    onChange={(e) => setFormData({ ...formData, estimated_completion: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Select Treatments */}
              <div>
                <label className="block text-muted font-medium mb-1">Detailing Services Configured</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border rounded p-2 bg-surface">
                  {services.map((s) => (
                    <label
                      key={s.id}
                      className={cn(
                        'flex items-center gap-2 p-1.5 rounded border text-xs cursor-pointer',
                        formData.service_ids.includes(s.id) ? 'bg-white border-charcoal text-charcoal font-medium' : 'bg-white/60 border-border text-muted-dark'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={formData.service_ids.includes(s.id)}
                        onChange={() => handleServiceToggle(s.id)}
                        className="rounded text-charcoal focus:ring-0"
                      />
                      <span className="truncate">{s.name} ({formatCurrency(s.standard_price)})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vehicle Intake Checklist Section */}
              <div className="p-3 bg-surface rounded border border-border space-y-3">
                <div className="font-semibold text-charcoal text-xs border-b border-border/60 pb-1">
                  Vehicle Intake Inspection & Condition Record
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted font-medium mb-1">Existing Scratches (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.scratches}
                      onChange={(e) => setFormData({ ...formData, scratches: e.target.value })}
                      placeholder="e.g. Scratches on front bumper, swirl marks on hood"
                      className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs text-charcoal focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-muted font-medium mb-1">Existing Dents</label>
                    <input
                      type="text"
                      value={formData.dents}
                      onChange={(e) => setFormData({ ...formData, dents: e.target.value })}
                      placeholder="e.g. Small ding on left rear door"
                      className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs text-charcoal focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-muted text-[10px] font-medium mb-0.5">Paint Condition</label>
                    <select
                      value={formData.paint_condition}
                      onChange={(e) => setFormData({ ...formData, paint_condition: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-border rounded text-xs text-charcoal"
                    >
                      <option value="Good">Good</option>
                      <option value="Fair (Swirls)">Fair (Swirls)</option>
                      <option value="Heavy Oxidation">Heavy Oxidation</option>
                      <option value="Clear Coat Failure">Clear Coat Failure</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted text-[10px] font-medium mb-0.5">Interior</label>
                    <select
                      value={formData.interior_condition}
                      onChange={(e) => setFormData({ ...formData, interior_condition: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-border rounded text-xs text-charcoal"
                    >
                      <option value="Clean">Clean</option>
                      <option value="Moderate Dust">Moderate Dust</option>
                      <option value="Heavy Mud / Stains">Heavy Mud / Stains</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted text-[10px] font-medium mb-0.5">Wheels</label>
                    <select
                      value={formData.wheel_condition}
                      onChange={(e) => setFormData({ ...formData, wheel_condition: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-border rounded text-xs text-charcoal"
                    >
                      <option value="Good">Good</option>
                      <option value="Heavy Brake Dust">Heavy Brake Dust</option>
                      <option value="Curb Rash Present">Curb Rash Present</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted text-[10px] font-medium mb-0.5">Glass</label>
                    <select
                      value={formData.glass_condition}
                      onChange={(e) => setFormData({ ...formData, glass_condition: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-border rounded text-xs text-charcoal"
                    >
                      <option value="Good">Good</option>
                      <option value="Water Spots">Water Spots</option>
                      <option value="Windshield Chip">Windshield Chip</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Accessories Verified Inside Vehicle</label>
                  <input
                    type="text"
                    value={formData.accessories}
                    onChange={(e) => setFormData({ ...formData, accessories: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs text-charcoal focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Technician Work Instructions</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Extra clay bar decontamination on side lower skirts, apply heat gun to bumper PPF tuck..."
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : 'Generate Digital Job Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ALLOCATE CONSUMABLES */}
      {showConsumeModal && selectedJobDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Allocate Consumable Stock</h3>
                <p className="text-[11px] text-muted">Deducts stock automatically and tracks material cost</p>
              </div>
              <button onClick={() => setShowConsumeModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAllocateConsumable} className="p-4 space-y-3.5 text-xs">
              {consumeError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px]">
                  {consumeError}
                </div>
              )}

              <div>
                <label className="block text-muted font-medium mb-1">Select Consumable Product *</label>
                <select
                  required
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                >
                  <option value="">Choose product...</option>
                  {inventoryProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.current_stock} {p.unit} • ₹{p.purchase_price}/{p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Quantity Used *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={consumeQuantity}
                  onChange={(e) => setConsumeQuantity(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowConsumeModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                >
                  Confirm & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: POST-SERVICE QUALITY CHECK SIGN-OFF */}
      {showQCModal && selectedJobDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Post-Service Quality Control Sign-Off</h3>
                <p className="text-[11px] text-muted">Quality inspection before vehicle delivery</p>
              </div>
              <button onClick={() => setShowQCModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitQC} className="p-4 space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] space-y-1">
                <div className="font-semibold">Quality Inspection Standards:</div>
                <div>✓ Paint finish free of buffer trails and compounding residue</div>
                <div>✓ Door jambs, badges, and crevices completely dried</div>
                <div>✓ Glass streak-free inside & outside under inspection light</div>
                <div>✓ Tire dressed and wheel barrels clean</div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Inspector Verification Remarks</label>
                <textarea
                  rows={3}
                  required
                  value={qcNotes}
                  onChange={(e) => setQCNotes(e.target.value)}
                  placeholder="e.g. Paint depth verified, hydrophobic water beading tested, showroom finish certified."
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowQCModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-700 text-white rounded text-xs font-medium hover:bg-emerald-800"
                >
                  Pass QC & Complete Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobCardsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading job cards...</div>}>
      <JobCardsContent />
    </Suspense>
  );
}
