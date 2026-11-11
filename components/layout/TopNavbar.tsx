'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Plus,
  User,
  ChevronDown,
  Check,
  Calendar,
  FileSpreadsheet,
  Users,
  Receipt,
  TrendingDown,
  ExternalLink,
  Car,
  LogOut,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { formatDate, cn } from '@/lib/utils';
import { Notification } from '@/lib/types';

interface TopNavbarProps {
  onMenuToggle?: () => void;
}

export default function TopNavbar({ onMenuToggle }: TopNavbarProps) {
  const router = useRouter();
  const { currentUser, availableUsers, openPinModal, logout, canAccessFinances } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Quick Action menu
  const [showQuickAction, setShowQuickAction] = useState(false);

  // User switcher menu
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Current formatted date
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setCurrentDateTime(`${day}-${month}-${year} • ${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {}
  };

  // Global search handler
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [custRes, vehRes, jcRes, invRes] = await Promise.all([
          fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}`),
          fetch(`/api/vehicles?search=${encodeURIComponent(searchQuery)}`),
          fetch(`/api/jobcards?search=${encodeURIComponent(searchQuery)}`),
          fetch(`/api/invoices?search=${encodeURIComponent(searchQuery)}`),
        ]);

        const [customers, vehicles, jobCards, invoices] = await Promise.all([
          custRes.ok ? custRes.json() : [],
          vehRes.ok ? vehRes.json() : [],
          jcRes.ok ? jcRes.json() : [],
          invRes.ok ? invRes.json() : [],
        ]);

        const combined: any[] = [];
        customers.slice(0, 3).forEach((c: any) => combined.push({ type: 'Customer', label: c.name, sub: c.mobile, url: `/customers` }));
        vehicles.slice(0, 3).forEach((v: any) => combined.push({ type: 'Vehicle', label: v.reg_number, sub: `${v.make} ${v.model}`, url: `/vehicles` }));
        jobCards.slice(0, 3).forEach((j: any) => combined.push({ type: 'Job Card', label: j.job_card_number, sub: `${j.vehicle_reg} - ${j.status}`, url: `/jobcards` }));
        invoices.slice(0, 3).forEach((i: any) => combined.push({ type: 'Invoice', label: i.invoice_number, sub: `₹${i.total_amount} - ${i.payment_status}`, url: `/billing` }));

        setSearchResults(combined);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="h-16 bg-white border-b border-border fixed top-0 right-0 left-0 lg:left-64 z-20 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {/* Mobile Sidebar Toggle */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded border border-border text-charcoal hover:bg-surface shrink-0 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:w-96">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-muted absolute left-2.5 sm:left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
              placeholder="Search customers, vehicles, jobs..."
              className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 bg-surface border border-border rounded text-xs text-charcoal placeholder:text-muted focus:outline-none focus:border-charcoal focus:bg-white transition-colors"
            />
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="fixed sm:absolute left-3 right-3 sm:left-0 sm:right-0 top-16 sm:top-full mt-1 bg-white border border-border rounded shadow-card z-50 max-h-80 overflow-y-auto">
            {isSearching ? (
              <div className="p-3 text-xs text-muted text-center">Searching database...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-3 text-xs text-muted text-center">No matching records found.</div>
            ) : (
              <div className="py-1">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setShowSearchDropdown(false);
                      setSearchQuery('');
                      router.push(item.url);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-surface flex items-center justify-between border-b border-border/50 last:border-0"
                  >
                    <div>
                      <div className="font-medium text-charcoal">{item.label}</div>
                      <div className="text-[11px] text-muted">{item.sub}</div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono">
                      {item.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
        {/* Date Display */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted font-mono bg-surface px-2.5 py-1 border border-border rounded">
          <Calendar className="w-3.5 h-3.5 text-muted-dark" />
          <span>{currentDateTime}</span>
        </div>

        {/* Quick Add Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowQuickAction(!showQuickAction)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {showQuickAction && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-border rounded shadow-card py-1 z-50 text-xs">
              <Link
                href="/jobcards?action=new"
                onClick={() => setShowQuickAction(false)}
                className="flex items-center gap-2 px-3 py-2 text-charcoal hover:bg-surface"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-muted" />
                <span>New Job Card</span>
              </Link>
              <Link
                href="/appointments?action=new"
                onClick={() => setShowQuickAction(false)}
                className="flex items-center gap-2 px-3 py-2 text-charcoal hover:bg-surface"
              >
                <Calendar className="w-3.5 h-3.5 text-muted" />
                <span>Book Appointment</span>
              </Link>
              <Link
                href="/customers?action=new"
                onClick={() => setShowQuickAction(false)}
                className="flex items-center gap-2 px-3 py-2 text-charcoal hover:bg-surface"
              >
                <Users className="w-3.5 h-3.5 text-muted" />
                <span>Register Customer</span>
              </Link>
              {canAccessFinances() && (
                <>
                  <Link
                    href="/billing?action=new"
                    onClick={() => setShowQuickAction(false)}
                    className="flex items-center gap-2 px-3 py-2 text-charcoal hover:bg-surface"
                  >
                    <Receipt className="w-3.5 h-3.5 text-muted" />
                    <span>Generate Invoice</span>
                  </Link>
                  <Link
                    href="/expenses?action=new"
                    onClick={() => setShowQuickAction(false)}
                    className="flex items-center gap-2 px-3 py-2 text-charcoal hover:bg-surface"
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-muted" />
                    <span>Record Expense</span>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="w-8 h-8 rounded border border-border flex items-center justify-center hover:bg-surface text-charcoal relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-muted-dark" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full mt-1.5 sm:w-80 bg-white border border-border rounded shadow-card z-50 text-xs">
              <div className="px-3 py-2.5 border-b border-border flex items-center justify-between bg-surface-subtle">
                <span className="font-semibold text-charcoal">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-muted hover:text-charcoal underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted text-xs">No notifications.</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        'p-3 hover:bg-surface transition-colors',
                        notif.is_read ? 'opacity-70' : 'bg-surface/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-medium text-charcoal">{notif.title}</span>
                        <span className="text-[10px] text-muted font-mono">{formatDate(notif.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-muted-dark leading-relaxed">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Public Website Link */}
        <Link
          href="/"
          target="_blank"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted hover:text-charcoal border border-border rounded hover:bg-surface transition-colors"
          title="Open Public Customer Website"
        >
          <ExternalLink className="w-3.5 h-3.5 text-muted" />
          <span>Public Website</span>
        </Link>

        {/* User Switcher / Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 pl-2 pr-3 py-1 border border-border rounded hover:bg-surface transition-colors"
          >
            <div className="w-6 h-6 rounded bg-zinc-200 text-charcoal flex items-center justify-center font-bold text-xs">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-charcoal leading-none">
                {currentUser?.name.split(' ')[0]}
              </div>
              <div className="text-[10px] text-muted leading-tight capitalize">
                {currentUser?.role === 'super_admin' ? 'Super Admin' : 'Manager'}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-muted ml-1" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-border rounded shadow-card py-2 z-50 text-xs">
              <div className="px-3 pb-2 border-b border-border">
                <div className="font-semibold text-charcoal">{currentUser?.name}</div>
                <div className="text-[11px] text-muted">{currentUser?.email}</div>
                <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] font-mono font-medium text-muted-dark capitalize">
                  {currentUser?.role === 'super_admin' ? 'Super Admin (Full Access)' : 'Manager (Attendance & Records)'}
                </div>
              </div>

              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted uppercase tracking-wider">
                Switch User (Requires PIN):
              </div>

              {availableUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setShowUserDropdown(false);
                    openPinModal(user.role);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-surface transition-colors',
                    currentUser?.id === user.id ? 'bg-surface font-semibold text-charcoal' : 'text-muted-dark'
                  )}
                >
                  <div>
                    <div>{user.name}</div>
                    <div className="text-[10px] text-muted capitalize">
                      {user.role === 'super_admin'
                        ? 'Super Admin (Full Access)'
                        : 'Workshop Manager (Attendance & Records)'}
                    </div>
                  </div>
                  {currentUser?.id === user.id && <Check className="w-3.5 h-3.5 text-charcoal" />}
                </button>
              ))}

              <div className="pt-2 mt-1 border-t border-border px-3 space-y-1.5">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    openPinModal();
                  }}
                  className="w-full text-center py-1 text-[11px] text-muted hover:text-charcoal font-medium bg-surface rounded border border-border"
                >
                  Verify / Switch PIN
                </button>
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    logout();
                  }}
                  className="w-full text-center py-1 text-[11px] text-rose-600 hover:bg-rose-50 font-medium rounded border border-rose-200 flex items-center justify-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Lock / Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
