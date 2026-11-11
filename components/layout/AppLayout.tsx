'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, ArrowLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import PinLoginModal from '@/components/auth/PinLoginModal';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, authLoaded, openPinModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const isPublicLanding = pathname === '/' || pathname === '/index.html';

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isPublicLanding && authLoaded && !isAuthenticated) {
      openPinModal();
    }
  }, [isPublicLanding, authLoaded, isAuthenticated]);

  if (isPublicLanding) {
    return (
      <>
        <PinLoginModal />
        <div className="min-h-screen bg-white">{children}</div>
      </>
    );
  }

  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-xs text-muted font-medium">Loading Workshop Portal...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <PinLoginModal />
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
          <div className="bg-white border border-border rounded-lg p-6 max-w-sm w-full text-center space-y-4 shadow-sm">
            <div className="w-10 h-10 rounded bg-charcoal text-white flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-charcoal">Workshop Portal Locked</h2>
              <p className="text-xs text-muted">
                Please sign in with your Super Admin or Manager security PIN / password to access The Autoglow Sikkim ERP.
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => openPinModal('super_admin')}
                className="w-full py-2 bg-charcoal text-white rounded text-xs font-semibold hover:bg-zinc-800 transition-colors"
              >
                Sign In to Portal
              </button>
              <Link
                href="/"
                className="w-full py-2 border border-border rounded text-xs font-medium text-muted hover:text-charcoal hover:bg-surface flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Public Website</span>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PinLoginModal />
      <div className="min-h-screen bg-surface overflow-x-hidden">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <TopNavbar onMenuToggle={() => setMobileMenuOpen((prev) => !prev)} />
        <main className="pl-0 lg:pl-64 pt-16 min-h-screen">
          <div className="p-3 sm:p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutShell>{children}</LayoutShell>
    </AuthProvider>
  );
}
