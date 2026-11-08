'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Save,
  CheckCircle,
  Shield,
  Percent,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() {
  const { currentUser, canManageSettings } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSavedMessage('Business settings saved successfully.');
        setTimeout(() => setSavedMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Business Configuration & Settings</h1>
          <p className="text-xs text-muted mt-0.5">
            Branding, tax definitions, GSTIN, document prefixes, and role-based access rules
          </p>
        </div>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Studio Identity */}
        <div className="bg-white border border-border rounded p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Building className="w-4 h-4 text-charcoal" />
            <h2 className="font-semibold text-charcoal text-xs">Business Identity & Contact</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1">Business Legal Name</label>
              <input
                type="text"
                value={settings.business_name || ''}
                onChange={(e) => handleChange('business_name', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Tagline</label>
              <input
                type="text"
                value={settings.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-muted font-medium mb-1">Workshop Address</label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">City & State</label>
              <input
                type="text"
                value={`${settings.city || 'Gangtok'}, ${settings.state || 'Sikkim'}`}
                readOnly
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1">Phone Number</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Email Address</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">GSTIN Number</label>
              <input
                type="text"
                value={settings.gstin || ''}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono uppercase focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* GST & Tax Definitions */}
        <div className="bg-white border border-border rounded p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Percent className="w-4 h-4 text-charcoal" />
            <h2 className="font-semibold text-charcoal text-xs">GST & Taxation Rates</h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1">Total GST Rate (%)</label>
              <input
                type="number"
                value={settings.default_gst_rate || '18'}
                onChange={(e) => handleChange('default_gst_rate', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">CGST Share (%)</label>
              <input
                type="number"
                value={settings.cgst_rate || '9'}
                onChange={(e) => handleChange('cgst_rate', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">SGST Share (%)</label>
              <input
                type="number"
                value={settings.sgst_rate || '9'}
                onChange={(e) => handleChange('sgst_rate', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Serial Prefixes */}
        <div className="bg-white border border-border rounded p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Hash className="w-4 h-4 text-charcoal" />
            <h2 className="font-semibold text-charcoal text-xs">Document Prefixes</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={settings.invoice_prefix || 'INV-AGS-'}
                onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Job Card Prefix</label>
              <input
                type="text"
                value={settings.job_card_prefix || 'JC-AGS-'}
                onChange={(e) => handleChange('job_card_prefix', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Warranty Prefix</label>
              <input
                type="text"
                value={settings.warranty_prefix || 'WAR-AGS-'}
                onChange={(e) => handleChange('warranty_prefix', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Purchase Order Prefix</label>
              <input
                type="text"
                value={settings.po_prefix || 'PO-AGS-'}
                onChange={(e) => handleChange('po_prefix', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Roles & Permissions Matrix */}
        <div className="bg-white border border-border rounded p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Shield className="w-4 h-4 text-charcoal" />
            <h2 className="font-semibold text-charcoal text-xs">Role-Based Access Control Matrix</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-surface rounded border border-border/60 flex items-center justify-between">
              <div>
                <strong>Super Admin / Owner (Christopher Basumatary):</strong>
                <div className="text-[11px] text-muted">Full application authority, financial control, settings, audit trails.</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 font-mono text-[10px]">Unrestricted</span>
            </div>

            <div className="p-3 bg-surface rounded border border-border/60 flex items-center justify-between">
              <div>
                <strong>Workshop Manager (Tashi Lepcha):</strong>
                <div className="text-[11px] text-muted">Customers, vehicles, bookings, job cards, inventory, staff attendance & leave.</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px]">Operational Lead</span>
            </div>

            <div className="p-3 bg-surface rounded border border-border/60 flex items-center justify-between">
              <div>
                <strong>Accountant (Pema Bhutia):</strong>
                <div className="text-[11px] text-muted">Invoices, payments receipt, business expenses, supplier payments, P&L.</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px]">Financial Lead</span>
            </div>

            <div className="p-3 bg-surface rounded border border-border/60 flex items-center justify-between">
              <div>
                <strong>Staff Detailer (Karma Namgyal):</strong>
                <div className="text-[11px] text-muted">Assigned job cards, vehicle inspections, service progress, own attendance.</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px]">Floor Detailer</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-charcoal text-white rounded text-xs font-semibold hover:bg-zinc-800 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
