'use client';

import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Car,
  Clock,
  User,
  X,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { ServiceBay } from '@/lib/types';
import { getStatusBadgeClass, cn } from '@/lib/utils';

export default function ServiceBaysPage() {
  const [bays, setBays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Status Modal
  const [selectedBay, setSelectedBay] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('Available');

  const fetchBays = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/service-bays');
      if (res.ok) {
        const data = await res.json();
        setBays(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBays();
  }, []);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBay) return;
    try {
      const res = await fetch('/api/service-bays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedBay.id,
          current_status: newStatus,
          current_job_id: newStatus === 'Available' ? null : selectedBay.current_job_id,
          current_vehicle_reg: newStatus === 'Available' ? null : selectedBay.current_vehicle_reg,
        }),
      });
      if (res.ok) {
        setShowStatusModal(false);
        fetchBays();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Service Bay & Station Management</h1>
          <p className="text-xs text-muted mt-0.5">
            Real-time bay occupancy, conflict prevention, wash stations, and clean-room allocation
          </p>
        </div>
      </div>

      {/* Bay Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bays.map((bay) => {
          const isOccupied = bay.current_status === 'Occupied';
          const isMaintenance = bay.current_status === 'Under Maintenance';

          return (
            <div
              key={bay.id}
              className={cn(
                'bg-white border rounded p-5 flex flex-col justify-between space-y-4 transition-colors',
                isOccupied
                  ? 'border-amber-300 shadow-xs'
                  : isMaintenance
                  ? 'border-rose-300 shadow-xs'
                  : 'border-border'
              )}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-surface border border-border flex items-center justify-center">
                      <Warehouse className="w-4 h-4 text-charcoal" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-charcoal">{bay.name}</h3>
                      <span className="text-[10px] text-muted uppercase tracking-wider font-medium">
                        Type: {bay.bay_type}
                      </span>
                    </div>
                  </div>

                  <span className={cn('px-2.5 py-0.5 rounded text-[11px] font-semibold', getStatusBadgeClass(bay.current_status))}>
                    {bay.current_status}
                  </span>
                </div>

                {/* Occupancy Card Details */}
                {isOccupied ? (
                  <div className="mt-4 p-3 bg-amber-50/60 border border-amber-200 rounded text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-900 font-bold font-mono text-sm">
                        {bay.current_vehicle_reg || 'Vehicle In Bay'}
                      </span>
                      {bay.job_card_number && (
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-900 font-mono">
                          {bay.job_card_number}
                        </span>
                      )}
                    </div>
                    {bay.vehicle_make_model && (
                      <div className="text-amber-800 text-[11px]">
                        {bay.vehicle_make_model} • Customer: {bay.customer_name}
                      </div>
                    )}
                  </div>
                ) : isMaintenance ? (
                  <div className="mt-4 p-3 bg-rose-50/60 border border-rose-200 rounded text-xs text-rose-800">
                    Station currently closed for mechanical or filter maintenance.
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-emerald-50/50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Station free and ready for next vehicle intake.</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted text-[11px]">Station operational</span>
                <button
                  onClick={() => {
                    setSelectedBay(bay);
                    setNewStatus(bay.current_status);
                    setShowStatusModal(true);
                  }}
                  className="px-2.5 py-1 bg-surface border border-border rounded text-charcoal font-medium hover:bg-zinc-100"
                >
                  Change Status
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: CHANGE BAY STATUS */}
      {showStatusModal && selectedBay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-sm w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Update {selectedBay.name}</h3>
                <p className="text-[11px] text-muted">Toggle station operational availability</p>
              </div>
              <button onClick={() => setShowStatusModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Station Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                >
                  <option value="Available">Available (Ready for work)</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Under Maintenance">Under Maintenance / Closed</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                >
                  Update Bay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
