'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Search,
  Eye,
  Car,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      // Fetch via job cards
      const res = await fetch('/api/jobcards');
      if (res.ok) {
        const jcs = await res.json();
        const list: any[] = [];
        for (const j of jcs) {
          const detailRes = await fetch(`/api/jobcards/${j.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            (detail.inspections || []).forEach((insp: any) => {
              list.push({
                ...insp,
                job_card_number: j.job_card_number,
                vehicle_reg: j.vehicle_reg,
                vehicle_make_model: j.vehicle_make_model,
                customer_name: j.customer_name,
              });
            });
          }
        }
        setInspections(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const filtered = inspections.filter((insp) => {
    const matchesSearch =
      !search ||
      insp.vehicle_reg?.toLowerCase().includes(search.toLowerCase()) ||
      insp.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      insp.job_card_number?.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || insp.inspection_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Vehicle Inspections & Quality Control</h1>
          <p className="text-xs text-muted mt-0.5">
            Pre-service damage condition reports, paint depth notes, and post-service QC certifications
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-border rounded">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vehicle reg, customer name, or job card..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none focus:border-charcoal focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
          >
            <option value="">All Inspection Types</option>
            <option value="intake">Intake (Pre-Service)</option>
            <option value="post_service">Post-Service QC</option>
          </select>
        </div>
      </div>

      {/* Inspections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-muted text-xs">
            Loading inspection records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 py-8 text-center text-muted text-xs">
            No inspection reports found.
          </div>
        ) : (
          filtered.map((insp: any) => (
            <div key={insp.id} className="bg-white border border-border rounded p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-charcoal text-sm">{insp.vehicle_reg}</span>
                  <div className="text-[11px] text-muted">{insp.vehicle_make_model} • {insp.customer_name}</div>
                </div>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded font-medium uppercase font-mono',
                    insp.inspection_type === 'intake'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  )}
                >
                  {insp.inspection_type === 'intake' ? 'Intake' : 'QC Passed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-surface p-2.5 rounded border border-border/50 text-muted-dark">
                <div>Paint: <span className="font-medium text-charcoal">{insp.paint_condition}</span></div>
                <div>Interior: <span className="font-medium text-charcoal">{insp.interior_condition}</span></div>
                <div>Wheels: <span className="font-medium text-charcoal">{insp.wheel_condition}</span></div>
                <div>Glass: <span className="font-medium text-charcoal">{insp.glass_condition}</span></div>
              </div>

              {insp.scratches && insp.scratches.length > 0 && (
                <div className="text-[11px] text-amber-900 bg-amber-50/70 p-2 rounded border border-amber-200">
                  <strong>Existing Scratches:</strong> {insp.scratches.join(', ')}
                </div>
              )}

              {insp.notes && (
                <div className="text-[11px] text-muted-dark">
                  <strong>Notes:</strong> {insp.notes}
                </div>
              )}

              <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted">
                <span>Job: {insp.job_card_number}</span>
                <span>{formatDate(insp.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
