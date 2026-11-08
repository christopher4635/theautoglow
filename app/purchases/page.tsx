'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Receipt,
  CheckCircle,
  Package,
  X,
  CreditCard,
  Building,
} from 'lucide-react';
import { Supplier, PurchaseOrder } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function PurchasesPage() {
  const { currentUser } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');

  // New Purchase Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    paid_amount: '0',
    notes: 'Direct delivery to workshop',
    items: [{ product_id: '', quantity: '5', unit_price: '2400' }],
  });

  // New Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supForm, setSupForm] = useState({
    name: '',
    contact_person: '',
    mobile: '',
    email: '',
    address: '',
    gstin: '',
    products_supplied: '',
    payment_terms: 'Net 30 Days',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [poRes, supRes, prodRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/suppliers'),
        fetch('/api/inventory'),
      ]);

      const [poData, supData, prodData] = await Promise.all([
        poRes.ok ? poRes.json() : [],
        supRes.ok ? supRes.json() : [],
        prodRes.ok ? prodRes.json() : { products: [] },
      ]);

      setPurchaseOrders(poData);
      setSuppliers(supData);
      setProducts(prodData.products || []);

      if (supData.length > 0 && !poForm.supplier_id) {
        setPoForm((prev) => ({ ...prev, supplier_id: supData[0].id }));
      }
      if (prodData.products?.length > 0 && !poForm.items[0].product_id) {
        setPoForm((prev) => ({
          ...prev,
          items: [{ ...prev.items[0], product_id: prodData.products[0].id }],
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poForm),
      });
      if (res.ok) {
        setShowPOModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supForm),
      });
      if (res.ok) {
        setShowSupplierModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addPOLine = () => {
    setPoForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { product_id: products[0]?.id || '', quantity: '1', unit_price: '1000' },
      ],
    }));
  };

  const removePOLine = (idx: number) => {
    setPoForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleLineChange = (idx: number, field: string, val: any) => {
    setPoForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: val };
      return { ...prev, items };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Suppliers & Purchase Management</h1>
          <p className="text-xs text-muted mt-0.5">
            Purchase orders, vendor accounts, automated stock inwarding, and supplier payment ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-3 py-1.5 bg-surface border border-border rounded text-xs font-medium text-charcoal hover:bg-zinc-100 flex items-center gap-1.5"
          >
            <Building className="w-3.5 h-3.5 text-muted" />
            <span>Add Supplier</span>
          </button>
          <button
            onClick={() => setShowPOModal(true)}
            className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border text-xs">
        <button
          onClick={() => setActiveTab('purchases')}
          className={cn(
            'px-3.5 py-2 font-medium border-b-2 transition-colors',
            activeTab === 'purchases' ? 'border-charcoal text-charcoal font-semibold' : 'border-transparent text-muted hover:text-charcoal'
          )}
        >
          Purchase Invoices & Receipts ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={cn(
            'px-3.5 py-2 font-medium border-b-2 transition-colors',
            activeTab === 'suppliers' ? 'border-charcoal text-charcoal font-semibold' : 'border-transparent text-muted hover:text-charcoal'
          )}
        >
          Approved Suppliers Directory ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'purchases' && (
        <div className="bg-white border border-border rounded overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">PO # / Date</th>
                <th className="py-2.5 px-4">Supplier</th>
                <th className="py-2.5 px-4">Items Received</th>
                <th className="py-2.5 px-4">Total Amount (18% GST)</th>
                <th className="py-2.5 px-4">Paid</th>
                <th className="py-2.5 px-4">Payable Balance</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po: any) => (
                  <tr key={po.id} className="hover:bg-surface/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-charcoal font-mono">{po.po_number}</div>
                      <div className="text-[10px] text-muted">{formatDate(po.purchase_date)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-charcoal">{po.supplier_name}</div>
                      <div className="text-[10px] text-muted">{po.supplier_mobile}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {po.items && po.items.length > 0 ? (
                        <div className="space-y-0.5">
                          {po.items.map((it: any) => (
                            <div key={it.id} className="text-[11px] text-charcoal truncate">
                              • {it.product_name} ({it.quantity} units @ ₹{it.unit_price})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted italic">Direct goods inward</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-charcoal">
                      {formatCurrency(po.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-medium">
                      {formatCurrency(po.paid_amount)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-rose-700">
                      {formatCurrency(po.balance_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(po.payment_status))}>
                        {po.payment_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suppliers.map((sup: any) => (
            <div key={sup.id} className="bg-white border border-border rounded p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted uppercase font-medium">{sup.supplier_code}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-700 font-mono">
                    {sup.payment_terms || 'Net 30'}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-charcoal mt-1">{sup.name}</h3>
                <div className="text-xs text-muted-dark mt-0.5">
                  Contact: {sup.contact_person} • {sup.mobile}
                </div>
              </div>

              <div className="p-2.5 bg-surface rounded border border-border/50 text-[11px] space-y-1">
                {sup.gstin && <div>GSTIN: <span className="font-mono text-charcoal">{sup.gstin}</span></div>}
                <div>Products: <span className="text-charcoal">{sup.products_supplied || 'Chemicals & accessories'}</span></div>
                <div className="flex justify-between pt-1 border-t border-border/50">
                  <span className="text-muted">Total Orders:</span>
                  <span className="font-medium text-charcoal">{sup.total_purchase_orders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Payable Balance:</span>
                  <span className="font-bold text-rose-700 font-mono">{formatCurrency(sup.outstanding_payable)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: NEW PURCHASE ORDER (Auto-inwards stock!) */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Record Purchase Order & Stock Inward</h3>
                <p className="text-[11px] text-muted">Automatically increases warehouse inventory upon receipt</p>
              </div>
              <button onClick={() => setShowPOModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Supplier *</label>
                  <select
                    required
                    value={poForm.supplier_id}
                    onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.contact_person})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={poForm.purchase_date}
                    onChange={(e) => setPoForm({ ...poForm, purchase_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Items Received */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-border/60 pb-1">
                  <span className="font-semibold text-charcoal text-xs">Products Received (Auto-adds to stock)</span>
                  <button type="button" onClick={addPOLine} className="text-[11px] text-charcoal hover:underline">
                    + Add Product
                  </button>
                </div>

                <div className="space-y-2">
                  {poForm.items.map((line, idx) => (
                    <div key={idx} className="p-2.5 bg-surface rounded border border-border grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <label className="block text-muted text-[10px] mb-0.5">Product</label>
                        <select
                          value={line.product_id}
                          onChange={(e) => handleLineChange(idx, 'product_id', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-border rounded text-xs"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-muted text-[10px] mb-0.5">Quantity</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-border rounded text-xs text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-muted text-[10px] mb-0.5">Rate (₹)</label>
                        <input
                          type="number"
                          required
                          value={line.unit_price}
                          onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-border rounded text-xs text-right"
                        />
                      </div>
                      <div className="col-span-1 text-center pt-3">
                        {poForm.items.length > 1 && (
                          <button type="button" onClick={() => removePOLine(idx)} className="text-rose-600">
                            <X className="w-4 h-4 inline" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Amount Paid Immediately (₹)</label>
                <input
                  type="number"
                  value={poForm.paid_amount}
                  onChange={(e) => setPoForm({ ...poForm, paid_amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                >
                  Receive PO & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD SUPPLIER */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Add Chemical / Equipment Supplier</h3>
                <p className="text-[11px] text-muted">Vendor registry and payment terms</p>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={supForm.name}
                  onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                  placeholder="e.g. Detailing Geek Hub India"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={supForm.contact_person}
                    onChange={(e) => setSupForm({ ...supForm, contact_person: e.target.value })}
                    placeholder="e.g. Amitabh Roy"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Mobile *</label>
                  <input
                    type="tel"
                    required
                    value={supForm.mobile}
                    onChange={(e) => setSupForm({ ...supForm, mobile: e.target.value })}
                    placeholder="+91 98000 12345"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={supForm.gstin}
                    onChange={(e) => setSupForm({ ...supForm, gstin: e.target.value.toUpperCase() })}
                    placeholder="19AABCA7766K1ZU"
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Payment Terms</label>
                  <select
                    value={supForm.payment_terms}
                    onChange={(e) => setSupForm({ ...supForm, payment_terms: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="Immediate / Cash">Immediate / Cash</option>
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Net 30 Days">Net 30 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Products Supplied</label>
                <input
                  type="text"
                  value={supForm.products_supplied}
                  onChange={(e) => setSupForm({ ...supForm, products_supplied: e.target.value })}
                  placeholder="e.g. CarPro coatings, Rupes polishers"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800"
                >
                  Add Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
