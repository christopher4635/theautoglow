'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle,
  X,
  User,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Asset, AssetMaintenance } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function AssetsPage() {
  const { currentUser } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ total_assets: 0, total_purchase_value: 0, total_maintenance_expenditure: 0, in_use_count: 0, under_maintenance_count: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Register Asset Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Pressure Washers',
    brand: '',
    model: '',
    serial_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: '',
    warranty_expiry: '',
    location: 'Bay 1 - Washing',
    condition: 'Excellent',
    status: 'In Use',
    supplier_id: '',
  });

  // Maintenance Log Modal
  const [showMntModal, setShowMntModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [mntDate, setMntDate] = useState(new Date().toISOString().split('T')[0]);
  const [mntType, setMntType] = useState('Routine Service & Oil Change');
  const [mntProvider, setMntProvider] = useState('Sikkim Hydraulic Works');
  const [mntCost, setMntCost] = useState('0');
  const [nextDue, setNextDue] = useState('');
  const [mntRemarks, setMntRemarks] = useState('');

  const fetchAssets = async () => {
    try {
      setLoading(true);
      let url = `/api/assets?search=${encodeURIComponent(search)}`;
      if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
        if (data.length > 0 && !formData.supplier_id) {
          setFormData((prev) => ({ ...prev, supplier_id: data[0].id }));
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchAssets();
  }, [search, categoryFilter]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchAssets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      const res = await fetch('/api/assets/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: selectedAsset.id,
          maintenance_date: mntDate,
          maintenance_type: mntType,
          service_provider: mntProvider,
          cost: parseFloat(mntCost),
          next_service_due: nextDue || null,
          remarks: mntRemarks,
          updated_condition: 'Good',
        }),
      });
      if (res.ok) {
        setShowMntModal(false);
        fetchAssets();
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
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Fixed Asset & Equipment Register</h1>
          <p className="text-xs text-muted mt-0.5">
            Heavy machinery, pressure washers, rotary polishers, air compressors, and preventive maintenance logs
          </p>
        </div>
        <button
          onClick={() => {
            fetchSuppliers();
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Equipment Asset</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-border rounded p-3">
          <span className="text-[10px] text-muted uppercase font-medium">Total Capital Value</span>
          <div className="text-lg font-bold text-charcoal mt-1">{formatCurrency(summary.total_purchase_value)}</div>
          <span className="text-[10px] text-muted">{summary.total_assets} Machinery assets</span>
        </div>
        <div className="bg-white border border-border rounded p-3">
          <span className="text-[10px] text-muted uppercase font-medium">Maintenance Spent</span>
          <div className="text-lg font-bold text-charcoal mt-1">{formatCurrency(summary.total_maintenance_expenditure)}</div>
          <span className="text-[10px] text-muted">Preventive & repairs</span>
        </div>
        <div className="bg-white border border-border rounded p-3">
          <span className="text-[10px] text-emerald-700 uppercase font-medium">In Active Operation</span>
          <div className="text-lg font-bold text-emerald-700 mt-1">{summary.in_use_count}</div>
          <span className="text-[10px] text-muted">Deployed on shop bays</span>
        </div>
        <div className="bg-white border border-border rounded p-3">
          <span className="text-[10px] text-rose-700 uppercase font-medium">Due for Service</span>
          <div className="text-lg font-bold text-rose-700 mt-1">{summary.under_maintenance_count}</div>
          <span className="text-[10px] text-muted">Calibration / Repair</span>
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
            placeholder="Search by asset code, machinery name, brand, or serial #..."
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
            <option value="Pressure Washers">Pressure Washers</option>
            <option value="Polishers">Polishers</option>
            <option value="Steam Extractors">Steam Extractors</option>
            <option value="Compressors">Compressors</option>
            <option value="Air Filtration">Air Filtration</option>
          </select>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-muted text-xs">
            Loading fixed asset registry...
          </div>
        ) : assets.length === 0 ? (
          <div className="col-span-3 py-8 text-center text-muted text-xs">
            No equipment assets found.
          </div>
        ) : (
          assets.map((a: any) => (
            <div key={a.id} className="bg-white border border-border rounded p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-muted uppercase font-medium">
                      {a.asset_code} • {a.category}
                    </span>
                    <h3 className="font-bold text-sm text-charcoal mt-0.5">{a.name}</h3>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(a.status))}>
                    {a.status}
                  </span>
                </div>

                <div className="text-xs text-muted-dark mt-2">
                  Brand: <strong className="text-charcoal">{a.brand}</strong> {a.model ? `• Model: ${a.model}` : ''}
                  {a.serial_number && <div className="text-[10px] font-mono text-muted">S/N: {a.serial_number}</div>}
                </div>

                <div className="mt-3 p-2.5 bg-surface rounded border border-border/50 text-[11px] space-y-1 text-muted-dark">
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <strong className="text-charcoal">{a.location}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Capital Cost:</span>
                    <span className="font-mono text-charcoal font-semibold">{formatCurrency(a.purchase_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Condition:</span>
                    <span className={cn('font-medium', a.condition === 'Excellent' || a.condition === 'Good' ? 'text-emerald-700' : 'text-amber-700')}>
                      {a.condition}
                    </span>
                  </div>
                  {a.next_maintenance_due && (
                    <div className="flex justify-between text-[10px] text-amber-800 pt-0.5">
                      <span>Next Mnt Due:</span>
                      <span className="font-mono font-medium">{formatDate(a.next_maintenance_due)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-[10px] text-muted font-mono">
                  Pur: {formatDate(a.purchase_date)}
                </span>
                <button
                  onClick={() => {
                    setSelectedAsset(a);
                    setMntDate(new Date().toISOString().split('T')[0]);
                    setMntCost('0');
                    setMntRemarks('');
                    setShowMntModal(true);
                  }}
                  className="px-2.5 py-1 bg-surface border border-border rounded text-charcoal font-medium hover:bg-zinc-100 flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3 text-muted" />
                  <span>Log Service</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL 1: REGISTER ASSET */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-lg w-full max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Register Equipment / Machinery Asset</h3>
                <p className="text-[11px] text-muted">Fixed capital asset tracking separate from consumables</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Equipment Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Kranzle K1152 TST High Pressure Washer"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="Pressure Washers">Pressure Washers</option>
                    <option value="Polishers">Polishers</option>
                    <option value="Steam Extractors">Steam Extractors</option>
                    <option value="Compressors">Compressors</option>
                    <option value="Air Filtration">Air Filtration</option>
                    <option value="Foam Cannons">Foam Cannons</option>
                    <option value="Other">Other Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Rupes / Kranzle / Karcher"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g. BigFoot LHR21 Mark III"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="e.g. RUP-992144"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    placeholder="45000"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Station / Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Bay 1 - Washing Bay"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Warranty Expiry Date</label>
                  <input
                    type="date"
                    value={formData.warranty_expiry}
                    onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
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
                  Register Machinery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG MAINTENANCE */}
      {showMntModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Log Equipment Maintenance</h3>
                <p className="text-[11px] text-muted">{selectedAsset.name} ({selectedAsset.asset_code})</p>
              </div>
              <button onClick={() => setShowMntModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordMaintenance} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Maintenance Type *</label>
                <input
                  type="text"
                  required
                  value={mntType}
                  onChange={(e) => setMntType(e.target.value)}
                  placeholder="e.g. Pump seal replacement & carbon brush renewal"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Service Date *</label>
                  <input
                    type="date"
                    required
                    value={mntDate}
                    onChange={(e) => setMntDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Maintenance Cost (₹)</label>
                  <input
                    type="number"
                    value={mntCost}
                    onChange={(e) => setMntCost(e.target.value)}
                    placeholder="3500"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Service Provider / Tech</label>
                  <input
                    type="text"
                    required
                    value={mntProvider}
                    onChange={(e) => setMntProvider(e.target.value)}
                    placeholder="e.g. Sikkim Hydraulic Works"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Next Service Due Date</label>
                  <input
                    type="date"
                    value={nextDue}
                    onChange={(e) => setNextDue(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Remarks & Work Executed</label>
                <textarea
                  rows={2}
                  value={mntRemarks}
                  onChange={(e) => setMntRemarks(e.target.value)}
                  placeholder="e.g. Tested pressure output at 150 bar, no oil leakage detected."
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowMntModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                >
                  Record Maintenance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
