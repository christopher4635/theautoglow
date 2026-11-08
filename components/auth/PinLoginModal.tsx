'use client';

import React, { useState } from 'react';
import { Lock, Shield, X, AlertCircle, CheckCircle2, UserCheck, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function PinLoginModal() {
  const { isPinModalOpen, closePinModal, loginWithPin, availableUsers, currentUser } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>('super_admin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isPinModalOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    const res = await loginWithPin(selectedRole, pin);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setPin('');
        closePinModal();
      }, 600);
    } else {
      setError(res.error || 'Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-border shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-charcoal text-white flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-charcoal">Security PIN Verification</h3>
              <p className="text-[11px] text-muted">The Autoglow Sikkim Management Portal</p>
            </div>
          </div>
          <button
            onClick={closePinModal}
            className="p-1 text-muted hover:text-charcoal rounded hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* User Role Selector (Only 2 Users) */}
          <div className="grid grid-cols-2 gap-2 bg-surface p-1 rounded border border-border">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('super_admin');
                setPin('');
                setError('');
              }}
              className={cn(
                'py-2 px-3 rounded text-xs font-medium flex flex-col items-center gap-1 transition-all',
                selectedRole === 'super_admin'
                  ? 'bg-charcoal text-white shadow-sm'
                  : 'text-muted-dark hover:text-charcoal'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </div>
              <span className="text-[10px] opacity-80">Abhinay</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole('manager');
                setPin('');
                setError('');
              }}
              className={cn(
                'py-2 px-3 rounded text-xs font-medium flex flex-col items-center gap-1 transition-all',
                selectedRole === 'manager'
                  ? 'bg-charcoal text-white shadow-sm'
                  : 'text-muted-dark hover:text-charcoal'
              )}
            >
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Manager</span>
              </div>
              <span className="text-[10px] opacity-80">Records & Attendance</span>
            </button>
          </div>

          {/* PIN Display Dots */}
          <div className="py-2 text-center">
            <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-2">
              Enter {selectedRole === 'super_admin' ? 'Abhinay' : 'Manager'} PIN
            </label>
            <div className="flex items-center justify-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={cn(
                    'w-3.5 h-3.5 rounded-full border transition-all duration-150',
                    pin.length > idx
                      ? 'bg-charcoal border-charcoal scale-110'
                      : 'border-zinc-300 bg-surface'
                  )}
                />
              ))}
            </div>

            {error && (
              <div className="mt-2.5 text-xs text-rose-600 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-2.5 text-xs text-emerald-600 flex items-center justify-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PIN Verified! Access Granted.</span>
              </div>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1 max-w-[240px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-11 rounded border border-border bg-white text-base font-semibold text-charcoal hover:bg-surface active:scale-95 transition-all shadow-xs"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-11 rounded border border-border bg-surface text-xs font-medium text-muted hover:text-charcoal hover:bg-zinc-100 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-11 rounded border border-border bg-white text-base font-semibold text-charcoal hover:bg-surface active:scale-95 transition-all shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-11 rounded border border-border bg-surface text-xs font-medium text-muted hover:text-charcoal hover:bg-zinc-100 transition-colors"
            >
              ⌫
            </button>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={closePinModal}
              className="w-1/3 py-2 border border-border rounded text-xs font-medium text-muted hover:text-charcoal hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || pin.length < 4}
              onClick={() => handleSubmit()}
              className="w-2/3 py-2 bg-charcoal text-white rounded text-xs font-semibold hover:bg-zinc-800 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{loading ? 'Verifying...' : 'Unlock Portal'}</span>
            </button>
          </div>

          {/* Default PIN reminder for initial onboarding */}
          <div className="text-center pt-1 border-t border-border/60">
            <p className="text-[10px] text-muted">
              {selectedRole === 'super_admin'
                ? 'Super Admin PIN: 4656'
                : 'Manager Default PIN: 1111 (or as set by Super Admin)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
