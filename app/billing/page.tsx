'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  CreditCard,
  Share2,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  X,
  FileText,
  DollarSign,
  Car,
  User,
} from 'lucide-react';
import { Invoice, Payment } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime, getStatusBadgeClass, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

function BillingContent() {
  const { currentUser, canAccessFinances } = useAuth();
  const searchParams = useSearchParams();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // View / Print Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentError, setPaymentError] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // WhatsApp Share Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppText, setWhatsAppText] = useState('');

  // Create Invoice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [jobCardsList, setJobCardsList] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    job_card_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    overall_discount: '0',
    notes: 'Thank you for choosing The Autoglow Sikkim. High gloss surface care guarantee.',
    items: [
      { description: '9H Matrix Ceramic Coating Package', quantity: 1, unit_price: 26000, discount: 0, item_type: 'service' },
    ],
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let url = `/api/invoices?search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&payment_status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [cRes, vRes, sRes, jRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/vehicles'),
        fetch('/api/services'),
        fetch('/api/jobcards'),
      ]);

      const [cData, vData, sData, jData] = await Promise.all([
        cRes.ok ? cRes.json() : [],
        vRes.ok ? vRes.json() : [],
        sRes.ok ? sRes.json() : { services: [] },
        jRes.ok ? jRes.json() : [],
      ]);

      setCustomers(cData);
      setVehicles(vData);
      setServices(sData.services || []);
      setJobCardsList(jData);

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
    fetchInvoices();
  }, [search, statusFilter]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      loadDropdowns();
      setShowCreateModal(true);

      const jId = searchParams.get('job_card_id');
      const cId = searchParams.get('customer_id');
      const vId = searchParams.get('vehicle_id');
      if (cId) setFormData((prev) => ({ ...prev, customer_id: cId, vehicle_id: vId || '', job_card_id: jId || '' }));
    }
  }, [searchParams]);

  const viewInvoiceDetail = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedInvoice(data);
        setShowInvoiceModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openPaymentModal = (inv: any) => {
    setSelectedInvoice({ invoice: inv });
    setPaymentAmount(String(inv.balance_amount));
    setPaymentMethod('UPI');
    setTransactionRef('');
    setPaymentNotes('');
    setPaymentError('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setPaymentError('');
    setRecordingPayment(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: selectedInvoice.invoice.id,
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          transaction_ref: transactionRef,
          notes: paymentNotes,
          recorded_by: currentUser?.name || 'Staff',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPaymentError(json.error || 'Failed to record payment');
        return;
      }
      setShowPaymentModal(false);
      fetchInvoices();
      if (showInvoiceModal) {
        viewInvoiceDetail(selectedInvoice.invoice.id);
      }
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setRecordingPayment(false);
    }
  };

  const openWhatsAppModal = (inv: any) => {
    const text = `Dear ${inv.customer_name}, here is your detailing invoice from The Autoglow Sikkim.\n\nInvoice: ${inv.invoice_number}\nVehicle: ${inv.vehicle_reg}\nTotal: ₹${inv.total_amount}\nPaid: ₹${inv.paid_amount}\nBalance Due: ₹${inv.balance_amount}\nStatus: ${inv.payment_status}\n\nThank you for trusting The Autoglow Sikkim with your vehicle care!`;
    setWhatsAppText(text);
    setSelectedInvoice({ invoice: inv });
    setShowWhatsAppModal(true);
  };

  const triggerPrint = () => {
    window.print();
  };

  // Add Item in New Invoice Form
  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { description: 'Additional Detailing Service', quantity: 1, unit_price: 1500, discount: 0, item_type: 'service' },
      ],
    }));
  };

  const removeItemRow = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Failed to create invoice');
        return;
      }
      setShowCreateModal(false);
      fetchInvoices();
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
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Billing, Invoices & Collections</h1>
          <p className="text-xs text-muted mt-0.5">
            GST compliant invoicing, multi-split payment reconciliation, receivables, and receipts
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
          <span>Generate Invoice</span>
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
            placeholder="Search by invoice #, customer name, vehicle reg..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none focus:border-charcoal focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:outline-none"
          >
            <option value="">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Invoice # / Date</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Vehicle / Job Card</th>
                <th className="py-2.5 px-4">Total Amount (18% GST)</th>
                <th className="py-2.5 px-4">Paid Amount</th>
                <th className="py-2.5 px-4">Balance Due</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    No invoices matching filter.
                  </td>
                </tr>
              ) : (
                invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-charcoal">{inv.invoice_number}</div>
                      <div className="text-[10px] text-muted font-mono">{formatDate(inv.invoice_date)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-charcoal">{inv.customer_name}</div>
                      <div className="text-[10px] text-muted">{inv.customer_mobile}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-charcoal">{inv.vehicle_reg}</div>
                      <div className="text-[10px] text-muted">{inv.job_card_number || 'Direct Bill'}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-charcoal">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-medium">
                      {formatCurrency(inv.paid_amount)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-rose-700">
                      {formatCurrency(inv.balance_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusBadgeClass(inv.payment_status))}>
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {inv.balance_amount > 0 && (
                        <button
                          onClick={() => openPaymentModal(inv)}
                          className="px-2 py-1 bg-emerald-700 text-white rounded text-[11px] font-medium hover:bg-emerald-800"
                        >
                          Collect
                        </button>
                      )}
                      <button
                        onClick={() => openWhatsAppModal(inv)}
                        className="px-2 py-1 bg-surface border border-border text-charcoal rounded text-[11px] hover:bg-zinc-100"
                        title="Share Invoice on WhatsApp"
                      >
                        <Share2 className="w-3 h-3 text-emerald-600 inline" />
                      </button>
                      <button
                        onClick={() => viewInvoiceDetail(inv.id)}
                        className="px-2.5 py-1 bg-surface border border-border rounded text-charcoal font-medium hover:bg-zinc-100 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-muted" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: PROFESSIONAL PRINTABLE INVOICE VIEW */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-3xl w-full max-h-[94vh] overflow-y-auto">
            {/* Top Toolbar (Hidden on print) */}
            <div className="no-print p-4 border-b border-border flex items-center justify-between bg-surface-subtle sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-charcoal" />
                <span className="font-semibold text-charcoal text-xs">
                  Tax Invoice: {selectedInvoice.invoice.invoice_number}
                </span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', getStatusBadgeClass(selectedInvoice.invoice.payment_status))}>
                  {selectedInvoice.invoice.payment_status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerPrint}
                  className="px-3 py-1 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button onClick={() => setShowInvoiceModal(false)} className="text-muted hover:text-charcoal p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Document */}
            <div ref={printRef} className="p-8 text-xs text-charcoal space-y-6 bg-white">
              {/* Studio Header */}
              <div className="flex items-start justify-between border-b border-border pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-charcoal text-white font-bold flex items-center justify-center text-sm">
                      AG
                    </div>
                    <div>
                      <h1 className="text-lg font-bold tracking-tight text-charcoal">
                        THE AUTOGLOW SIKKIM
                      </h1>
                      <div className="text-[10px] text-muted uppercase tracking-wider font-medium">
                        Premium Detailing & Surface Protection Studio
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-dark mt-2 leading-relaxed">
                    National Highway 10, Near Deorali<br />
                    Gangtok, Sikkim - 737101<br />
                    Phone: +91 98320 12345 • Email: operations@theautoglow.in
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold font-mono uppercase tracking-wider bg-surface px-2.5 py-1 rounded border border-border inline-block">
                    TAX INVOICE
                  </div>
                  <div className="mt-2 text-[11px] space-y-0.5">
                    <div><strong>Invoice No:</strong> {selectedInvoice.invoice.invoice_number}</div>
                    <div><strong>Date:</strong> {formatDate(selectedInvoice.invoice.invoice_date)}</div>
                    <div><strong>GSTIN:</strong> 11AAACT9876E1Z5</div>
                    <div><strong>Place of Supply:</strong> Sikkim (Code 11)</div>
                  </div>
                </div>
              </div>

              {/* Bill To & Vehicle Grid */}
              <div className="grid grid-cols-2 gap-6 bg-surface p-4 rounded border border-border text-xs">
                <div>
                  <div className="font-semibold text-charcoal text-[11px] uppercase tracking-wider text-muted mb-1">
                    Billed To:
                  </div>
                  <div className="font-bold text-sm text-charcoal">{selectedInvoice.invoice.customer_name}</div>
                  <div className="text-muted-dark mt-0.5">{selectedInvoice.invoice.customer_mobile}</div>
                  {selectedInvoice.invoice.customer_email && (
                    <div className="text-muted-dark">{selectedInvoice.invoice.customer_email}</div>
                  )}
                  <div className="text-muted-dark mt-0.5">
                    {selectedInvoice.invoice.customer_address}, {selectedInvoice.invoice.customer_city}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-charcoal text-[11px] uppercase tracking-wider text-muted mb-1">
                    Vehicle Serviced:
                  </div>
                  <div className="font-mono font-bold text-sm text-charcoal">
                    {selectedInvoice.invoice.vehicle_reg}
                  </div>
                  <div className="text-muted-dark mt-0.5">
                    {selectedInvoice.invoice.vehicle_make_model} • {selectedInvoice.invoice.vehicle_color}
                  </div>
                  <div className="text-muted-dark mt-0.5">
                    Category: {selectedInvoice.invoice.vehicle_category} • Job Card: {selectedInvoice.invoice.job_card_number || 'Direct Billing'}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse border border-border">
                <thead>
                  <tr className="bg-surface border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted">
                    <th className="p-2.5 border-r border-border">#</th>
                    <th className="p-2.5 border-r border-border">Service / Product Description</th>
                    <th className="p-2.5 border-r border-border text-center">Qty</th>
                    <th className="p-2.5 border-r border-border text-right">Unit Rate (₹)</th>
                    <th className="p-2.5 border-r border-border text-right">Discount (₹)</th>
                    <th className="p-2.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedInvoice.items.map((item: any, idx: number) => (
                    <tr key={item.id} className="text-xs">
                      <td className="p-2.5 border-r border-border font-mono text-center">{idx + 1}</td>
                      <td className="p-2.5 border-r border-border font-medium text-charcoal">
                        {item.description}
                      </td>
                      <td className="p-2.5 border-r border-border text-center">{item.quantity}</td>
                      <td className="p-2.5 border-r border-border text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="p-2.5 border-r border-border text-right">{formatCurrency(item.discount)}</td>
                      <td className="p-2.5 text-right font-medium">{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Tax Calculation Breakdown */}
              <div className="flex justify-end pt-2">
                <div className="w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-dark">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedInvoice.invoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.invoice.discount > 0 && (
                    <div className="flex justify-between text-muted-dark">
                      <span>Privilege Discount:</span>
                      <span>- {formatCurrency(selectedInvoice.invoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium text-charcoal border-t border-border/50 pt-1">
                    <span>Taxable Value:</span>
                    <span>{formatCurrency(selectedInvoice.invoice.taxable_value)}</span>
                  </div>
                  <div className="flex justify-between text-muted-dark text-[11px]">
                    <span>CGST (9.0%):</span>
                    <span>{formatCurrency(selectedInvoice.invoice.cgst_amount)}</span>
                  </div>
                  <div className="flex justify-between text-muted-dark text-[11px]">
                    <span>SGST (9.0%):</span>
                    <span>{formatCurrency(selectedInvoice.invoice.sgst_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-charcoal border-t border-border pt-2">
                    <span>Final Payable Amount:</span>
                    <span>{formatCurrency(selectedInvoice.invoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-border/50">
                    <span>Amount Paid:</span>
                    <span>{formatCurrency(selectedInvoice.invoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold text-xs">
                    <span>Outstanding Balance:</span>
                    <span>{formatCurrency(selectedInvoice.invoice.balance_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Receipts History */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="p-3 bg-surface rounded border border-border space-y-1.5">
                  <div className="font-semibold text-charcoal text-[11px] uppercase tracking-wider text-muted">
                    Payment Receipts Acknowledged:
                  </div>
                  {selectedInvoice.payments.map((p: Payment) => (
                    <div key={p.id} className="flex justify-between text-xs text-muted-dark">
                      <span>
                        {p.payment_number} • {formatDate(p.payment_date)} via {p.payment_method} {p.transaction_ref ? `(${p.transaction_ref})` : ''}
                      </span>
                      <span className="font-semibold text-charcoal">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Terms and Sign-off */}
              <div className="pt-6 border-t border-border flex justify-between items-end text-[10px] text-muted">
                <div>
                  <strong>Terms & Conditions:</strong>
                  <div>1. Surface warranties valid only with periodic inspection records.</div>
                  <div>2. Please clean exclusively with pH neutral car shampoo.</div>
                  <div>3. All disputes subject to Gangtok, Sikkim jurisdiction.</div>
                </div>
                <div className="text-right">
                  <div className="h-10"></div>
                  <div className="font-semibold text-charcoal text-xs">For The Autoglow Sikkim</div>
                  <div>Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD PAYMENT */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">
                  Record Payment for {selectedInvoice.invoice.invoice_number}
                </h3>
                <p className="text-[11px] text-muted">
                  Balance due: {formatCurrency(selectedInvoice.invoice.balance_amount)}
                </p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-4 space-y-3.5 text-xs">
              {paymentError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px]">
                  {paymentError}
                </div>
              )}

              <div>
                <label className="block text-muted font-medium mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-bold focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Cash">Cash</option>
                  <option value="Debit/Credit Card">Debit/Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Transaction Reference / UTR Number</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UPI/HDFC/20261108..."
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Payment Remarks</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Settle balance on handover"
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-3.5 py-1.5 bg-emerald-700 text-white rounded text-xs font-medium hover:bg-emerald-800 disabled:opacity-50"
                >
                  {recordingPayment ? 'Recording...' : 'Acknowledge Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: WHATSAPP SHARING */}
      {showWhatsAppModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Share Invoice via WhatsApp</h3>
                <p className="text-[11px] text-muted">Direct pre-formatted customer communication</p>
              </div>
              <button onClick={() => setShowWhatsAppModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Customer Mobile</label>
                <input
                  type="text"
                  readOnly
                  value={selectedInvoice.invoice.customer_mobile}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Message Preview</label>
                <textarea
                  rows={8}
                  value={whatsAppText}
                  onChange={(e) => setWhatsAppText(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded text-xs text-charcoal font-sans"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal hover:bg-zinc-100"
                >
                  Close
                </button>
                <a
                  href={`https://wa.me/${selectedInvoice.invoice.customer_mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsAppText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Open WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE INVOICE */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-border shadow-card max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Generate Tax Invoice</h3>
                <p className="text-[11px] text-muted">Auto-computes 18% GST (CGST 9% + SGST 9%) and discounts</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-4 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px]">
                  {formError}
                </div>
              )}

              {/* Customer and Vehicle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Customer *</label>
                  <select
                    required
                    value={formData.customer_id}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const match = vehicles.filter((v) => v.customer_id === cId);
                      setFilteredVehicles(match);
                      setFormData((prev) => ({
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

              {/* Job Card Link & Dates */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Link Job Card</label>
                  <select
                    value={formData.job_card_id}
                    onChange={(e) => setFormData({ ...formData, job_card_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  >
                    <option value="">Direct Invoice (No Job Card)</option>
                    {jobCardsList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.job_card_number} ({j.vehicle_reg})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-border/60 pb-1">
                  <span className="font-semibold text-charcoal text-xs">Invoice Line Items</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-[11px] font-medium text-charcoal hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-surface rounded border border-border grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <label className="block text-muted text-[10px] mb-0.5">Description</label>
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-border rounded text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-muted text-[10px] mb-0.5">Qty</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-border rounded text-xs text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-muted text-[10px] mb-0.5">Unit Price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-border rounded text-xs text-right"
                        />
                      </div>
                      <div className="col-span-1 text-center pt-3">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-rose-600 hover:text-rose-800"
                          >
                            <X className="w-4 h-4 inline" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Privilege Discount (₹)</label>
                  <input
                    type="number"
                    value={formData.overall_discount}
                    onChange={(e) => setFormData({ ...formData, overall_discount: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Invoice Notes / Guarantee</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                  />
                </div>
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
                  {submitting ? 'Generating...' : 'Generate & Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading billing & invoices...</div>}>
      <BillingContent />
    </Suspense>
  );
}
