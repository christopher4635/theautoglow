'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Plus,
  Printer,
  AlertTriangle,
  Clock,
  Car,
  User,
  X,
  FileCheck,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { Warranty, WarrantyClaim } from '@/lib/types';
import { formatDate, getStatusBadgeClass, formatCurrency, cn } from '@/lib/utils';

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Certificate for View/Print
  const [selectedWarranty, setSelectedWarranty] = useState<any>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Claim Modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimComplaint, setClaimComplaint] = useState('');
  const [claimFindings, setClaimFindings] = useState('');
  const [claimResolution, setClaimResolution] = useState('');
  const [claimCost, setClaimCost] = useState('0');
  const [claimStatus, setClaimStatus] = useState('Pending');

  // Issue New Warranty Modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const [issueForm, setIssueForm] = useState({
    customer_id: '',
    vehicle_id: '',
    service_id: '',
    service_name: '9H Matrix Ceramic Coating (3 Years Warranty)',
    start_date: new Date().toISOString().split('T')[0],
    duration_months: '36',
    coverage_details: 'Guaranteed protection against clear coat oxidation, UV paint fading, acid rain etching, and bird drop stain penetration.',
    terms_and_conditions: 'Requires annual maintenance wash at The Autoglow Sikkim. Washing with harsh alkali detergents voids warranty.',
  });

  const fetchWarranties = async () => {
    try {
      setLoading(true);
      let url = `/api/warranties?search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWarranties(data);
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

      if (cData.length > 0 && !issueForm.customer_id) {
        setIssueForm((prev) => ({ ...prev, customer_id: cData[0].id }));
        const match = vData.filter((v: any) => v.customer_id === cData[0].id);
        setFilteredVehicles(match);
        if (match.length > 0) setIssueForm((prev) => ({ ...prev, vehicle_id: match[0].id }));
      }
    } catch {}
  };

  useEffect(() => {
    fetchWarranties();
  }, [search, statusFilter]);

  const viewCertificate = (warranty: any) => {
    setSelectedWarranty(warranty);
    setShowCertificateModal(true);
  };

  const openClaimModal = (warranty: any) => {
    setSelectedWarranty(warranty);
    setClaimComplaint('');
    setClaimFindings('');
    setClaimResolution('');
    setClaimCost('0');
    setClaimStatus('Pending');
    setShowClaimModal(true);
  };

  const handleRecordClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;
    try {
      const res = await fetch(`/api/warranties/${selectedWarranty.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint: claimComplaint,
          inspection_findings: claimFindings,
          resolution: claimResolution,
          repair_cost: claimCost,
          status: claimStatus,
        }),
      });
      if (res.ok) {
        setShowClaimModal(false);
        fetchWarranties();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIssueWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/warranties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issueForm),
      });
      if (res.ok) {
        setShowIssueModal(false);
        fetchWarranties();
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
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Warranty Management & Certificates</h1>
          <p className="text-xs text-muted mt-0.5">
            Surface coating and PPF warranty ledger, expiration countdowns, and claims tracking
          </p>
        </div>
        <button
          onClick={() => {
            loadDropdowns();
            setShowIssueModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Issue Warranty Certificate</span>
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
            placeholder="Search by certificate #, vehicle reg, customer name..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none focus:border-charcoal focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
          >
            <option value="">All Warranties</option>
            <option value="Active">Active</option>
            <option value="Expiring Soon">Expiring Soon (&lt; 30 Days)</option>
            <option value="Expired">Expired</option>
            <option value="Claim Raised">Claim Raised</option>
            <option value="Claim Resolved">Claim Resolved</option>
          </select>
        </div>
      </div>

      {/* Warranties Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Certificate #</th>
                <th className="py-2.5 px-4">Vehicle / Customer</th>
                <th className="py-2.5 px-4">Service Covered</th>
                <th className="py-2.5 px-4">Start Date</th>
                <th className="py-2.5 px-4">Valid Until / Remaining</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    Loading warranties...
                  </td>
                </tr>
              ) : warranties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No warranty certificates found.
                  </td>
                </tr>
              ) : (
                warranties.map((w: any) => (
                  <tr key={w.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-charcoal font-mono">{w.certificate_number}</div>
                      <div className="text-[10px] text-muted">Duration: {w.duration_months} Months</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-charcoal">{w.vehicle_reg}</div>
                      <div className="text-[10px] text-muted">{w.customer_name} ({w.customer_mobile})</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-charcoal">{w.service_name}</div>
                      <div className="text-[10px] text-muted truncate max-w-xs">{w.coverage_details}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-dark">
                      {formatDate(w.start_date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-charcoal">{formatDate(w.end_date)}</div>
                      <div className="text-[10px] text-muted">
                        {w.days_remaining > 0 ? `${w.days_remaining} days left` : 'Expired'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(w.calculated_status || w.status))}>
                        {w.calculated_status || w.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => openClaimModal(w)}
                        className="px-2 py-1 bg-surface border border-border text-amber-700 rounded text-[11px] hover:bg-amber-50"
                      >
                        Claim
                      </button>
                      <button
                        onClick={() => viewCertificate(w)}
                        className="px-2.5 py-1 bg-surface border border-border rounded text-charcoal font-medium hover:bg-zinc-100 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-muted" />
                        <span>Certificate</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: LUXURY PRINTABLE WARRANTY CERTIFICATE */}
      {showCertificateModal && selectedWarranty && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-3xl w-full max-h-[94vh] overflow-y-auto">
            {/* Top Toolbar */}
            <div className="no-print p-4 border-b border-border flex items-center justify-between bg-surface-subtle sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-charcoal" />
                <span className="font-semibold text-charcoal text-xs">
                  Official Warranty Certificate: {selectedWarranty.certificate_number}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
                <button onClick={() => setShowCertificateModal(false)} className="text-muted hover:text-charcoal p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Certificate Page */}
            <div className="p-8 bg-white">
              <div className="border-4 border-double border-zinc-800 p-8 space-y-6 text-charcoal bg-radial from-white to-zinc-50/50">
                {/* Header */}
                <div className="text-center space-y-1">
                  <div className="text-xs uppercase font-mono tracking-widest text-muted">
                    Official Detailing & Surface Protection
                  </div>
                  <h1 className="text-2xl font-serif font-bold tracking-tight text-charcoal uppercase">
                    Certificate of Warranty
                  </h1>
                  <p className="text-xs text-muted font-medium">The Autoglow Sikkim • Gangtok, Sikkim</p>
                  <div className="w-16 h-0.5 bg-zinc-800 mx-auto mt-2"></div>
                </div>

                <div className="text-center text-xs text-muted-dark leading-relaxed max-w-lg mx-auto">
                  This certifies that the vehicle registered below has undergone professional surface preparation and precision application in our dust-free facility.
                </div>

                {/* Details Box */}
                <div className="grid grid-cols-2 gap-4 bg-surface/70 border border-border p-4 rounded text-xs">
                  <div>
                    <span className="text-[10px] text-muted uppercase font-medium">Certificate Number:</span>
                    <div className="font-mono font-bold text-charcoal text-sm">{selectedWarranty.certificate_number}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-medium">Issued To Customer:</span>
                    <div className="font-bold text-charcoal">{selectedWarranty.customer_name}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-medium">Vehicle Registration:</span>
                    <div className="font-mono font-bold text-charcoal text-sm">{selectedWarranty.vehicle_reg}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-medium">Service Applied:</span>
                    <div className="font-semibold text-charcoal">{selectedWarranty.service_name}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-medium">Warranty Effective Date:</span>
                    <div className="font-mono text-charcoal">{formatDate(selectedWarranty.start_date)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-medium">Warranty Expiration Date:</span>
                    <div className="font-mono font-bold text-emerald-800">{formatDate(selectedWarranty.end_date)}</div>
                  </div>
                </div>

                {/* Coverage & Terms */}
                <div className="space-y-3 text-[11px] text-muted-dark leading-relaxed border-t border-border pt-4">
                  <div>
                    <strong className="text-charcoal block mb-0.5">Coverage Guarantee:</strong>
                    {selectedWarranty.coverage_details}
                  </div>
                  <div>
                    <strong className="text-charcoal block mb-0.5">Mandatory Maintenance Requirements:</strong>
                    {selectedWarranty.terms_and_conditions}
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-8 flex justify-between items-end text-xs">
                  <div className="text-center">
                    <div className="w-36 border-b border-zinc-400 pb-1 font-mono text-[11px] text-charcoal">
                      The Autoglow Team
                    </div>
                    <div className="text-[10px] text-muted mt-1">Lead Ceramic/PPF Specialist</div>
                  </div>

                  <div className="w-16 h-16 rounded-full border-2 border-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-800 uppercase tracking-tighter text-center">
                    Certified<br />Quality
                  </div>

                  <div className="text-center">
                    <div className="w-36 border-b border-zinc-400 pb-1 font-mono text-[11px] text-charcoal">
                      Managing Director
                    </div>
                    <div className="text-[10px] text-muted mt-1">The Autoglow Sikkim</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FILE WARRANTY CLAIM */}
      {showClaimModal && selectedWarranty && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Record Warranty Claim</h3>
                <p className="text-[11px] text-muted">{selectedWarranty.certificate_number} • {selectedWarranty.vehicle_reg}</p>
              </div>
              <button onClick={() => setShowClaimModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordClaim} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Customer Complaint *</label>
                <textarea
                  rows={2}
                  required
                  value={claimComplaint}
                  onChange={(e) => setClaimComplaint(e.target.value)}
                  placeholder="e.g. Hydrophobicity reduced on bonnet, small edge peeling on driver mirror PPF..."
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Studio Inspection Findings</label>
                <textarea
                  rows={2}
                  value={claimFindings}
                  onChange={(e) => setClaimFindings(e.target.value)}
                  placeholder="e.g. Inspected under dual-spectrum light: heavy mineral deposit causing water sheet..."
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Claim Status</label>
                  <select
                    value={claimStatus}
                    onChange={(e) => setClaimStatus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="Pending">Pending Inspection</option>
                    <option value="Approved">Approved</option>
                    <option value="Resolved">Resolved & Cleared</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Resolution Cost (₹)</label>
                  <input
                    type="number"
                    value={claimCost}
                    onChange={(e) => setClaimCost(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Resolution Execution Notes</label>
                <input
                  type="text"
                  value={claimResolution}
                  onChange={(e) => setClaimResolution(e.target.value)}
                  placeholder="e.g. Free ceramic decon wash and topcoat re-applied under warranty."
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                >
                  Save Claim Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ISSUE WARRANTY */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-lg w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Issue New Warranty Certificate</h3>
                <p className="text-[11px] text-muted">Generate certified warranty document</p>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueWarranty} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Customer *</label>
                  <select
                    required
                    value={issueForm.customer_id}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const match = vehicles.filter((v) => v.customer_id === cId);
                      setFilteredVehicles(match);
                      setIssueForm((prev) => ({
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
                    value={issueForm.vehicle_id}
                    onChange={(e) => setIssueForm({ ...issueForm, vehicle_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    {filteredVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.reg_number} - {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Service Package *</label>
                <input
                  type="text"
                  required
                  value={issueForm.service_name}
                  onChange={(e) => setIssueForm({ ...issueForm, service_name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Effective Start Date</label>
                  <input
                    type="date"
                    required
                    value={issueForm.start_date}
                    onChange={(e) => setIssueForm({ ...issueForm, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Duration (Months) *</label>
                  <input
                    type="number"
                    required
                    value={issueForm.duration_months}
                    onChange={(e) => setIssueForm({ ...issueForm, duration_months: e.target.value })}
                    placeholder="36"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Coverage Scope</label>
                <textarea
                  rows={2}
                  value={issueForm.coverage_details}
                  onChange={(e) => setIssueForm({ ...issueForm, coverage_details: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                >
                  Issue Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
