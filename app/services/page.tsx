'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Clock,
  ShieldCheck,
  Edit2,
  Check,
  X,
  Package,
} from 'lucide-react';
import { Service, ServiceCategory } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function ServicesPage() {
  const { canManageSettings } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('');

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    standard_price: '',
    duration_mins: '120',
    warranty_duration_days: '0',
    maintenance_interval_days: '30',
    pricing_by_category: {
      Hatchback: 0,
      Sedan: 0,
      SUV: 0,
      Luxury: 0,
    },
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
      let url = '/api/services';
      if (selectedCat) url += `?category_id=${selectedCat}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [selectedCat]);

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category_id: categories[0]?.id || '',
      description: '',
      standard_price: '',
      duration_mins: '120',
      warranty_duration_days: '0',
      maintenance_interval_days: '30',
      pricing_by_category: { Hatchback: 0, Sedan: 0, SUV: 0, Luxury: 0 },
    });
    setShowModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingService ? 'PUT' : 'POST';
      const payload = editingService ? { ...formData, id: editingService.id } : formData;

      const res = await fetch('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        fetchServices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Service Catalogue & Pricing Matrix</h1>
          <p className="text-xs text-muted mt-0.5">
            Configurable detailing treatments, vehicle-category pricing, required consumables, and warranties
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedCat('')}
          className={cn(
            'px-3 py-1.5 rounded font-medium border transition-colors whitespace-nowrap',
            selectedCat === '' ? 'bg-charcoal text-white border-charcoal' : 'bg-white text-muted-dark border-border hover:bg-surface'
          )}
        >
          All Categories
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.id)}
            className={cn(
              'px-3 py-1.5 rounded font-medium border transition-colors whitespace-nowrap',
              selectedCat === c.id ? 'bg-charcoal text-white border-charcoal' : 'bg-white text-muted-dark border-border hover:bg-surface'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <div key={s.id} className="bg-white border border-border rounded p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-medium text-muted uppercase">
                    {s.service_code} • {s.category_name}
                  </span>
                  <h3 className="text-sm font-bold text-charcoal mt-0.5">{s.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-charcoal">{formatCurrency(s.standard_price)}</span>
                  <span className="text-[10px] text-muted block">Base Price</span>
                </div>
              </div>

              <p className="text-xs text-muted-dark mt-2 leading-relaxed">
                {s.description || 'Professional detailing treatment.'}
              </p>

              {/* Category Pricing Matrix */}
              {s.pricing_by_category && Object.keys(s.pricing_by_category).length > 0 && (
                <div className="mt-3 p-2.5 bg-surface rounded border border-border/60 text-[11px] space-y-1">
                  <div className="font-semibold text-charcoal text-[10px] uppercase tracking-wider text-muted">
                    Pricing by Vehicle Category:
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-charcoal">
                    {Object.entries(s.pricing_by_category).map(([cat, pr]: any) => (
                      <div key={cat} className="flex justify-between">
                        <span className="text-muted">{cat}:</span>
                        <span>{formatCurrency(pr)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {s.duration_mins} mins
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {s.warranty_duration_days > 0 ? `${Math.round(s.warranty_duration_days / 365)} Yr Warranty` : 'No Warranty'}
              </span>
              <span className="text-muted">
                {s.maintenance_interval_days}d cycle
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: ADD / EDIT SERVICE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-lg w-full max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Configure Detailing Service</h3>
                <p className="text-[11px] text-muted">Set standard pricing and vehicle category overrides</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. 10H Graphene Coating (5 Years Warranty)"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Standard Base Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.standard_price}
                    onChange={(e) => setFormData({ ...formData, standard_price: e.target.value })}
                    placeholder="25000"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Step by step technical application details..."
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={formData.duration_mins}
                    onChange={(e) => setFormData({ ...formData, duration_mins: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Warranty (Days)</label>
                  <input
                    type="number"
                    value={formData.warranty_duration_days}
                    onChange={(e) => setFormData({ ...formData, warranty_duration_days: e.target.value })}
                    placeholder="1095"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Reminder Cycle (Days)</label>
                  <input
                    type="number"
                    value={formData.maintenance_interval_days}
                    onChange={(e) => setFormData({ ...formData, maintenance_interval_days: e.target.value })}
                    placeholder="180"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
