'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Shield, X, AlertCircle, CheckCircle2, UserCheck, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function PinLoginModal() {
  const router = useRouter();
  const { isPinModalOpen, closePinModal, loginWithPin } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>('super_admin');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens or role changes
  useEffect(() => {
    if (isPinModalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isPinModalOpen, selectedRole]);

  if (!isPinModalOpen) return null;

  const handleKeyPress = (num: string) => {
    if (loading) return;
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        // Auto submit if 4 digits
        executeLogin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setPin('');
    setError('');
    inputRef.current?.focus();
  };

  const executeLogin = async (pinToVerify?: string) => {
    if (loading) return;
    const value = (pinToVerify !== undefined ? pinToVerify : pin).trim();
    if (!value || value.length < 4) {
      setError('Please enter your 4-digit security PIN');
      return;
    }

    setLoading(true);
    setError('');

    const res = await loginWithPin(selectedRole, value);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setPin('');
        closePinModal();
        router.push('/dashboard');
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/dashboard')) {
          window.location.href = '/dashboard';
        }
      }, 400);
    } else {
      setError(res.error || 'Incorrect security PIN. Access denied.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeLogin();
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
              <h3 className="text-sm font-bold text-charcoal">Security PIN Login</h3>
              <p className="text-[11px] text-muted">The Autoglow Sikkim Workshop Portal</p>
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
                inputRef.current?.focus();
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
                inputRef.current?.focus();
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
              <span className="text-[10px] opacity-80">Attendance & Records</span>
            </button>
          </div>

          {/* Form for physical keyboard typing / password manager */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <label className="block text-[11px] font-medium text-muted uppercase tracking-wider text-center mb-1.5">
                Enter {selectedRole === 'super_admin' ? 'Abhinay' : 'Manager'} Security PIN
              </label>

              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setPin(clean);
                    setError('');
                    if (clean.length === 4) {
                      executeLogin(clean);
                    }
                  }}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.5em] text-2xl font-bold font-mono py-2.5 bg-surface border border-border rounded text-charcoal focus:bg-white focus:outline-none focus:border-charcoal transition-all"
                />

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-charcoal p-1"
                  title={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-600 flex items-center justify-center gap-1.5 text-center">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="text-xs text-emerald-600 flex items-center justify-center gap-1.5 font-medium text-center">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>PIN Verified! Entering Portal...</span>
              </div>
            )}
          </form>

          {/* On-Screen Keypad */}
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
              <span>{loading ? 'Verifying...' : 'Unlock & Open Portal'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
