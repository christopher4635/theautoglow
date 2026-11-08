'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  FileSpreadsheet,
  Warehouse,
  ClipboardCheck,
  Users,
  Car,
  Award,
  Sparkles,
  Receipt,
  CreditCard,
  ShieldCheck,
  BellRing,
  UserCheck,
  Clock,
  CalendarDays,
  Package,
  Wrench,
  Truck,
  TrendingDown,
  BarChart3,
  History,
  Settings,
  ChevronDown,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: string | number;
  roles?: string[];
}

interface NavSection {
  title: string;
  collapsible?: boolean;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, hasRole } = useAuth();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'OPERATIONS',
      collapsible: true,
      items: [
        {
          title: 'Appointments',
          href: '/appointments',
          icon: Calendar,
        },
        {
          title: 'Digital Job Cards',
          href: '/jobcards',
          icon: FileSpreadsheet,
        },
        {
          title: 'Service Bays',
          href: '/service-bays',
          icon: Warehouse,
        },
        {
          title: 'Vehicle Inspections',
          href: '/inspections',
          icon: ClipboardCheck,
        },
      ],
    },
    {
      title: 'CRM & VEHICLES',
      collapsible: true,
      items: [
        {
          title: 'Customers',
          href: '/customers',
          icon: Users,
        },
        {
          title: 'Vehicles',
          href: '/vehicles',
          icon: Car,
        },
        {
          title: 'Loyalty & Retention',
          href: '/loyalty',
          icon: Award,
        },
      ],
    },
    {
      title: 'SERVICES & BILLING',
      collapsible: true,
      items: [
        {
          title: 'Service Catalogue',
          href: '/services',
          icon: Sparkles,
        },
        {
          title: 'Invoices & Billing',
          href: '/billing',
          icon: Receipt,
          roles: ['super_admin'],
        },
        {
          title: 'Payments Received',
          href: '/payments',
          icon: CreditCard,
          roles: ['super_admin'],
        },
        {
          title: 'Warranties',
          href: '/warranties',
          icon: ShieldCheck,
        },
        {
          title: 'Service Reminders',
          href: '/reminders',
          icon: BellRing,
        },
      ],
    },
    {
      title: 'STAFF & HR',
      collapsible: true,
      items: [
        {
          title: 'Employees',
          href: '/employees',
          icon: UserCheck,
          roles: ['super_admin', 'manager'],
        },
        {
          title: 'Staff Attendance',
          href: '/attendance',
          icon: Clock,
        },
        {
          title: 'Leave & Calendar',
          href: '/leave',
          icon: CalendarDays,
        },
      ],
    },
    {
      title: 'INVENTORY & ASSETS',
      collapsible: true,
      items: [
        {
          title: 'Consumable Stock',
          href: '/inventory',
          icon: Package,
        },
        {
          title: 'Fixed Assets',
          href: '/assets',
          icon: Wrench,
        },
        {
          title: 'Suppliers & Purchases',
          href: '/purchases',
          icon: Truck,
          roles: ['super_admin'],
        },
      ],
    },
    {
      title: 'FINANCE & ANALYTICS',
      collapsible: true,
      items: [
        {
          title: 'Expenses & P&L',
          href: '/expenses',
          icon: TrendingDown,
          roles: ['super_admin'],
        },
        {
          title: 'Reports & Analytics',
          href: '/reports',
          icon: BarChart3,
          roles: ['super_admin'],
        },
        {
          title: 'Audit Logs',
          href: '/audit-logs',
          icon: History,
          roles: ['super_admin'],
        },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        {
          title: 'Business Settings',
          href: '/settings',
          icon: Settings,
          roles: ['super_admin'],
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-border h-screen flex flex-col fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-charcoal text-white flex items-center justify-center font-bold text-sm tracking-wide">
            AG
          </div>
          <div>
            <h1 className="text-sm font-semibold text-charcoal tracking-tight leading-tight">
              The Autoglow
            </h1>
            <p className="text-[10px] text-muted uppercase tracking-wider font-medium">
              Sikkim Detailing Studio
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => {
          // Filter items based on user role
          const visibleItems = section.items.filter((item) => {
            if (!item.roles) return true;
            return item.roles.includes(currentUser?.role || 'staff') || currentUser?.role === 'super_admin';
          });

          if (visibleItems.length === 0) return null;

          const isCollapsed = collapsedSections[section.title];

          return (
            <div key={section.title} className="space-y-1">
              <div
                onClick={() => section.collapsible && toggleSection(section.title)}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-semibold tracking-wider text-muted flex items-center justify-between',
                  section.collapsible ? 'cursor-pointer hover:text-charcoal' : ''
                )}
              >
                <span>{section.title}</span>
                {section.collapsible && (
                  <span className="text-muted-light">
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
                          isActive
                            ? 'bg-surface text-charcoal font-semibold border-l-2 border-charcoal pl-2'
                            : 'text-muted-dark hover:bg-surface hover:text-charcoal'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={cn('w-4 h-4', isActive ? 'text-charcoal' : 'text-muted')} />
                          <span>{item.title}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Role Indicator Bottom Bar */}
      <div className="p-3 border-t border-border bg-surface text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted text-[11px]">System Online</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 bg-white border border-border rounded text-charcoal font-mono uppercase">
            {currentUser?.role?.replace('_', ' ')}
          </span>
        </div>
      </div>
    </aside>
  );
}
