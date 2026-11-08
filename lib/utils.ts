import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day}-${month}-${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } catch {
    return dateString;
  }
}

export function getStatusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (
    s === 'completed' ||
    s === 'paid' ||
    s === 'active' ||
    s === 'present' ||
    s === 'approved' ||
    s === 'available' ||
    s === 'delivered' ||
    s === 'resolved'
  ) {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }
  if (
    s === 'in progress' ||
    s === 'work in progress' ||
    s === 'partially paid' ||
    s === 'in use' ||
    s === 'half day' ||
    s === 'expiring soon' ||
    s === 'due today'
  ) {
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  }
  if (
    s === 'cancelled' ||
    s === 'unpaid' ||
    s === 'absent' ||
    s === 'rejected' ||
    s === 'damaged' ||
    s === 'expired' ||
    s === 'overdue' ||
    s === 'blacklisted'
  ) {
    return 'bg-rose-50 text-rose-700 border border-rose-200';
  }
  if (
    s === 'confirmed' ||
    s === 'vehicle received' ||
    s === 'quality check' ||
    s === 'upcoming'
  ) {
    return 'bg-blue-50 text-blue-700 border border-blue-200';
  }
  // Neutral fallback
  return 'bg-zinc-100 text-zinc-700 border border-zinc-200';
}
