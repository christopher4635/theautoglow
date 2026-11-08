'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Warehouse,
  X,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { InventoryProduct } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function InventoryPage() {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({ total_products: 0, low_stock_count: 0, out_of_stock_count: 0, total_stock_value: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Coatings',
    brand: '',
    unit: 'bottle',
    purchase_price: '',
    selling_price: '',
    current_stock: '10',
    min_stock_level: '5',
    supplier_id: '',
    storage_location: 'Main Cabinet',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustType, setAdjustType] = useState('Adjustment');
  const [adjustQuantity, setAdjustQuantity] = useState('1');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustError, setAdjustError] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      let url = `/api/inventory?search=${encodeURIComponent(search)}`;
      if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;
      if (lowStockFilter) url += `&low_stock=true`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
        setMetrics(data.metrics || {});
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
    fetchInventory();
  }, [search, categoryFilter, lowStockFilter]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Failed to add product');
        return;
      }
      setShowAddModal(false);
      fetchInventory();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setAdjustError('');
    try {
      const res = await fetch('/api/inventory/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          transaction_type: adjustType,
          quantity: parseFloat(adjustQuantity),
          notes: adjustNotes,
          recorded_by: currentUser?.name || 'Staff',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAdjustError(json.error || 'Failed to update stock');
        return;
      }
      setShowAdjustModal(false);
      fetchInventory();
    } catch (err: any) {
      setAdjustError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Consumable Inventory & Stock</h1>
          <p className="text-xs text-muted mt-0.5">
            Real-time chemical stocks, job card consumption logging, purchase receipts, and minimum thresholds
          </p>
        </div>
        <button
          onClick={() => {
            fetchSuppliers();
            setFormError('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Consumable Product</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-border rounded p-3">
          <span className="text-[10px] text-muted uppercase font-medium">Total Products</span>
          <div className="text-lg font-bold text-charcoal mt-1">{metrics.total_products}</div>
          <span className="text-[10px] text-muted">SKUs tracked</span>
        </div>
        <div className="bg-white border border-border rounded p-3">
          <span className="text-[10px] text-muted uppercase font-medium">Total Inventory Value</span>
          <div className="text-lg font-bold text-charcoal mt-1">{formatCurrency(metrics.total_stock_value)}</div>
          <span className="text-[10px] text-muted">Current valuation</span>
        </div>
        <div
          onClick={() => setLowStockFilter(!lowStockFilter)}
          className={cn(
            'bg-white border rounded p-3 cursor-pointer transition-colors',
            lowStockFilter ? 'border-amber-500 bg-amber-50/30' : 'border-border'
          )}
        >
          <span className="text-[10px] text-amber-700 uppercase font-medium">Low Stock Items</span>
          <div className="text-lg font-bold text-amber-700 mt-1">{metrics.low_stock_count}</div>
          <span className="text-[10px] text-muted">Click to toggle filter</span>
        </div>
        <div className="bg-white border border-border rounded p-3">
          <span className="text-[10px] text-rose-700 uppercase font-medium">Out of Stock</span>
          <div className="text-lg font-bold text-rose-700 mt-1">{metrics.out_of_stock_count}</div>
          <span className="text-[10px] text-muted">Immediate PO needed</span>
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
            placeholder="Search by product name, SKU, brand, or category..."
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
            {categories.map((c: any) => (
              <option key={c.category} value={c.category}>
                {c.category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">SKU / Product Name</th>
                <th className="py-2.5 px-4">Category & Brand</th>
                <th className="py-2.5 px-4">Current Stock</th>
                <th className="py-2.5 px-4">Min Limit</th>
                <th className="py-2.5 px-4">Purchase Rate</th>
                <th className="py-2.5 px-4">Stock Value</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    Loading inventory...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    No products matching search criteria.
                  </td>
                </tr>
              ) : (
                products.map((p: any) => (
                  <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-charcoal">{p.name}</div>
                      <div className="text-[10px] text-muted font-mono">{p.sku}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-charcoal">{p.category}</div>
                      <div className="text-[10px] text-muted">{p.brand}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-charcoal font-mono">
                      {p.current_stock} {p.unit}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted">
                      {p.min_stock_level} {p.unit}
                    </td>
                    <td className="py-3 px-4 text-charcoal font-medium">
                      {formatCurrency(p.purchase_price)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-charcoal">
                      {formatCurrency(p.total_inventory_value)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(p.stock_status))}>
                        {p.stock_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setAdjustType('Adjustment');
                          setAdjustQuantity(String(p.current_stock));
                          setAdjustNotes('');
                          setAdjustError('');
                          setShowAdjustModal(true);
                        }}
                        className="px-2.5 py-1 bg-surface border border-border rounded text-charcoal font-medium hover:bg-zinc-100"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD PRODUCT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-lg w-full max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Register Consumable Chemical / Product</h3>
                <p className="text-[11px] text-muted">Chemicals, polishes, compounds, and microfiber supplies</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-4 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px]">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">SKU / Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. KC-H9-1L"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded font-mono uppercase text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Koch Chemie"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Product Description / Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Koch Chemie H9.01 Heavy Cut Compound 1L"
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
                    <option value="Coatings">Coatings</option>
                    <option value="PPF Film">PPF Film</option>
                    <option value="Compounds">Compounds</option>
                    <option value="Polishes">Polishes</option>
                    <option value="Chemicals">Chemicals</option>
                    <option value="Soaps">Soaps</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Unit of Measurement *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="bottle">bottle</option>
                    <option value="can">can</option>
                    <option value="roll">roll</option>
                    <option value="pcs">pcs</option>
                    <option value="litres">litres</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Purchase Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    placeholder="2400"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Initial Stock Level</label>
                  <input
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Minimum Alert Threshold</label>
                  <input
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={formData.storage_location}
                    onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
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
                  {submitting ? 'Adding...' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST STOCK */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Stock Operation: {selectedProduct.name}</h3>
                <p className="text-[11px] text-muted">Current: {selectedProduct.current_stock} {selectedProduct.unit}</p>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-4 space-y-3.5 text-xs">
              {adjustError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px]">
                  {adjustError}
                </div>
              )}

              <div>
                <label className="block text-muted font-medium mb-1">Operation Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                >
                  <option value="Adjustment">Physical Count Reconciliation (Set exact count)</option>
                  <option value="Purchase">Stock Receipt / Inward</option>
                  <option value="Issue">Manual Issue to Bay</option>
                  <option value="Damaged">Spillage / Damaged Bottle (Deduct)</option>
                  <option value="Return">Supplier Return</option>
                </select>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">
                  {adjustType === 'Adjustment' ? `New Physical Stock (${selectedProduct.unit})` : `Quantity to Move (${selectedProduct.unit})`}
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-bold focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Reason / Reference Remarks</label>
                <input
                  type="text"
                  required
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Monthly physical stock audit count"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
