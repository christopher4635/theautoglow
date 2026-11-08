'use client';

import React from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { AuthProvider } from '@/lib/auth-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-surface">
        <Sidebar />
        <TopNavbar />
        <main className="pl-64 pt-16 min-h-screen">
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}
