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
  KeyRound,
  Lock,
  Globe,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Clock,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() {
  const { currentUser, canManageSettings } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showManagerPin, setShowManagerPin] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          super_admin_name: 'Abhinay',
          super_admin_pin: '4656',
          manager_name: 'Workshop Manager',
          manager_pin: '1111',
          contact_phone: '+91 98320 12345',
          contact_whatsapp: '+91 98320 12345',
          contact_email: 'info@theautoglow.in',
          contact_address: 'National Highway 10, Near Deorali, Gangtok, Sikkim - 737101',
          working_hours: 'Monday – Saturday: 9:00 AM – 7:30 PM (Sunday Closed)',
          ...data,
        });
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
    setErrorMessage('');

    // Validate PIN lengths
    const cleanAdminPin = (settings.super_admin_pin || '').trim();
    const cleanManagerPin = (settings.manager_pin || '').trim();

    if (cleanAdminPin && cleanAdminPin.length < 4) {
      setErrorMessage('Super Admin PIN / password must be at least 4 characters.');
      return;
    }
    if (cleanManagerPin && cleanManagerPin.length < 4) {
      setErrorMessage('Manager PIN / password must be at least 4 characters.');
      return;
    }

    const payload = {
      ...settings,
      ...(cleanAdminPin ? { super_admin_pin: cleanAdminPin } : {}),
      ...(cleanManagerPin ? { manager_pin: cleanManagerPin } : {}),
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          if (cleanAdminPin) {
            localStorage.setItem('autoglow_super_admin_pin', cleanAdminPin);
          }
          if (cleanManagerPin) {
            localStorage.setItem('autoglow_manager_pin', cleanManagerPin);
          }
        }
        setSavedMessage('All business settings, PINs, and contact information updated successfully.');
        setTimeout(() => setSavedMessage(''), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || 'Failed to update settings.');
      }
    } catch (err) {
      setErrorMessage('Network error while saving settings.');
    }
  };

  if (!canManageSettings()) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-charcoal">Super Admin Restricted Area</h2>
        <p className="text-xs text-muted max-w-md mx-auto">
          System settings, PIN configuration, and financial administration are restricted to Super Admin (Abhinay).
          The Manager profile is configured with access to Attendance and Operational Records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">Business Configuration & Settings</h1>
          <p className="text-xs text-muted mt-0.5">
            Security PIN system, landing page contact details, GST rates, and document prefixes
          </p>
        </div>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* 1. Security & PIN System (Requested: Super Admin Abhinay 4656, Manager default 1111) */}
        <div className="bg-white border border-border rounded p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-charcoal" />
              <h2 className="font-semibold text-charcoal text-xs">Security & User PIN System (2 Users Only)</h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 font-mono text-zinc-700">
              Role-Based Security
            </span>
          </div>

          <p className="text-[11px] text-muted">
            The system operates with strictly two accounts. Super Admin has unrestricted access, while Manager has limited operational access for Attendance and Records.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            {/* Super Admin User */}
            <div className="p-4 bg-surface rounded border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-charcoal" />
                  <span className="font-semibold text-charcoal">Super Admin</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-200 text-zinc-800 rounded font-mono">
                  Full Authority
                </span>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Super Admin Name</label>
                <input
                  type="text"
                  required
                  value={settings.super_admin_name ?? 'Abhinay'}
                  onChange={(e) => handleChange('super_admin_name', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs text-charcoal focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Super Admin Security PIN / Password</label>
                <div className="relative">
                  <input
                    type={showAdminPin ? 'text' : 'password'}
                    maxLength={24}
                    required
                    value={settings.super_admin_pin ?? ''}
                    onChange={(e) => handleChange('super_admin_pin', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs text-charcoal font-mono tracking-widest font-bold focus:outline-none pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPin(!showAdminPin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-charcoal"
                    title={showAdminPin ? 'Hide PIN' : 'Reveal PIN'}
                  >
                    {showAdminPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Manager User */}
            <div className="p-4 bg-surface rounded border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-charcoal" />
                  <span className="font-semibold text-charcoal">Workshop Manager</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">
                  Attendance & Records
                </span>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Manager Designation</label>
                <input
                  type="text"
                  value={settings.manager_name ?? 'Workshop Manager'}
                  onChange={(e) => handleChange('manager_name', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs text-charcoal focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">
                  Manager PIN / Password (Set & Changeable by Super Admin)
                </label>
                <div className="relative">
                  <input
                    type={showManagerPin ? 'text' : 'password'}
                    maxLength={24}
                    required
                    value={settings.manager_pin ?? ''}
                    onChange={(e) => handleChange('manager_pin', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-border rounded text-xs text-charcoal font-mono tracking-widest font-bold focus:outline-none pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowManagerPin(!showManagerPin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-charcoal"
                    title={showManagerPin ? 'Hide PIN' : 'Reveal PIN'}
                  >
                    {showManagerPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Public Landing Page & Contact Information (Changeable by Admin) */}
        <div className="bg-white border border-border rounded p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-charcoal" />
              <h2 className="font-semibold text-charcoal text-xs">Public Landing Page & Contact Details</h2>
            </div>
            <span className="text-[10px] text-muted">Updates live customer website immediately</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted" />
                <span>Public Display Phone Number *</span>
              </label>
              <input
                type="text"
                required
                value={settings.contact_phone || ''}
                onChange={(e) => {
                  handleChange('contact_phone', e.target.value);
                  handleChange('phone', e.target.value);
                }}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-muted font-medium mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Contact Number *</span>
              </label>
              <input
                type="text"
                required
                value={settings.contact_whatsapp || ''}
                onChange={(e) => handleChange('contact_whatsapp', e.target.value)}
                placeholder="+91 98320 12345"
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted" />
                <span>Public Inquiry Email *</span>
              </label>
              <input
                type="email"
                required
                value={settings.contact_email || ''}
                onChange={(e) => {
                  handleChange('contact_email', e.target.value);
                  handleChange('email', e.target.value);
                }}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-muted font-medium mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted" />
                <span>Studio Operating Hours *</span>
              </label>
              <input
                type="text"
                required
                value={settings.working_hours || ''}
                onChange={(e) => handleChange('working_hours', e.target.value)}
                placeholder="Monday – Saturday: 9:00 AM – 7:30 PM"
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted font-medium mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted" />
              <span>Full Studio Physical Address (Gangtok) *</span>
            </label>
            <input
              type="text"
              required
              value={settings.contact_address || ''}
              onChange={(e) => {
                handleChange('contact_address', e.target.value);
                handleChange('address', e.target.value);
              }}
              placeholder="National Highway 10, Near Deorali, Gangtok, Sikkim - 737101"
              className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* 3. Business Identity & GST */}
        <div className="bg-white border border-border rounded p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Building className="w-4 h-4 text-charcoal" />
            <h2 className="font-semibold text-charcoal text-xs">Studio Legal Identity & Tax Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1">Business Legal Name</label>
              <input
                type="text"
                value={settings.business_name || 'The Autoglow Sikkim'}
                onChange={(e) => handleChange('business_name', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Studio Tagline</label>
              <input
                type="text"
                value={settings.tagline || 'Premium Detailing & Surface Protection Studio'}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1">GSTIN Number</label>
              <input
                type="text"
                value={settings.gstin || '11AAACT9876E1Z5'}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono uppercase focus:bg-white focus:outline-none"
              />
            </div>
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
              <label className="block text-muted font-medium mb-1">CGST / SGST Split (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.cgst_rate || '9'}
                  onChange={(e) => handleChange('cgst_rate', e.target.value)}
                  className="w-1/2 px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono"
                  placeholder="CGST 9%"
                />
                <input
                  type="number"
                  value={settings.sgst_rate || '9'}
                  onChange={(e) => handleChange('sgst_rate', e.target.value)}
                  className="w-1/2 px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono"
                  placeholder="SGST 9%"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Serial Prefixes */}
        <div className="bg-white border border-border rounded p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Hash className="w-4 h-4 text-charcoal" />
            <h2 className="font-semibold text-charcoal text-xs">Document Prefixes</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1">Invoice</label>
              <input
                type="text"
                value={settings.invoice_prefix || 'INV-AGS-'}
                onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Job Card</label>
              <input
                type="text"
                value={settings.job_card_prefix || 'JC-AGS-'}
                onChange={(e) => handleChange('job_card_prefix', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Warranty</label>
              <input
                type="text"
                value={settings.warranty_prefix || 'WAR-AGS-'}
                onChange={(e) => handleChange('warranty_prefix', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1">Purchase Order</label>
              <input
                type="text"
                value={settings.po_prefix || 'PO-AGS-'}
                onChange={(e) => handleChange('po_prefix', e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-charcoal font-mono focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 5. Role-Based Permissions Summary */}
        <div className="bg-white border border-border rounded p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Shield className="w-4 h-4 text-charcoal" />
            <h2 className="font-semibold text-charcoal text-xs">Configured Active User Permissions</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-surface rounded border border-border/60 flex items-center justify-between">
              <div>
                <strong>Super Admin (Abhinay):</strong>
                <div className="text-[11px] text-muted">
                  Full unrestricted access. Manages financials, P&L, PIN passwords, settings, and staff.
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 font-mono text-[10px]">
                Security: Active (Encrypted)
              </span>
            </div>

            <div className="p-3 bg-surface rounded border border-border/60 flex items-center justify-between">
              <div>
                <strong>Manager ({settings.manager_name || 'Workshop Manager'}):</strong>
                <div className="text-[11px] text-muted">
                  Limited access: Staff Attendance & Leave, plus Operational Records (Customers, Vehicles, Job Cards, Inspections, Bays, Reminders, Assets). Financials hidden.
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px]">
                Security: Active (Configured by Admin)
              </span>
            </div>
          </div>
        </div>

        {/* Save CTA */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-charcoal text-white rounded text-xs font-semibold hover:bg-zinc-800 flex items-center gap-2 shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration & PINs</span>
          </button>
        </div>
      </form>
    </div>
  );
}
