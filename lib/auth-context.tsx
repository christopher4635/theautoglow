'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from './types';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  availableUsers: User[];
  isAuthenticated: boolean;
  authLoaded: boolean;
  isPinModalOpen: boolean;
  pinModalRole: UserRole;
  openPinModal: (role?: UserRole) => void;
  closePinModal: () => void;
  loginWithPin: (role: UserRole, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  canAccessFinances: () => boolean;
  canAccessBilling: () => boolean;
  canAccessReports: () => boolean;
  canAccessAuditLogs: () => boolean;
  canManageSettings: () => boolean;
  canManageStaff: () => boolean;
  canAccessRecords: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Only 2 Users as requested: Super Admin (Abhinay) and Manager
export const SYSTEM_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Abhinay',
    email: 'abhinay@theautoglow.in',
    role: 'super_admin',
    phone: '+91 98320 12345',
    is_active: 1,
    created_at: '2023-01-10',
    updated_at: '2023-01-10',
  },
  {
    id: 'usr-2',
    name: 'Workshop Manager',
    email: 'manager@theautoglow.in',
    role: 'manager',
    phone: '+91 98321 22334',
    is_active: 1,
    created_at: '2023-03-01',
    updated_at: '2023-03-01',
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(SYSTEM_USERS[0]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalRole, setPinModalRole] = useState<UserRole>('super_admin');

  useEffect(() => {
    try {
      const authed = localStorage.getItem('autoglow_authenticated') === 'true';
      const savedUserId = localStorage.getItem('autoglow_user_id');
      const savedUserName = localStorage.getItem('autoglow_user_name');

      if (authed && savedUserId) {
        const found = SYSTEM_USERS.find((u) => u.id === savedUserId);
        if (found) {
          setCurrentUser(savedUserName ? { ...found, name: savedUserName } : found);
          setIsAuthenticated(true);
        }
      }
    } catch {
      // Ignore storage errors
    } finally {
      setAuthLoaded(true);
    }
  }, []);

  const openPinModal = (role?: UserRole) => {
    if (role) {
      setPinModalRole(role);
    }
    setIsPinModalOpen(true);
  };

  const closePinModal = () => {
    setIsPinModalOpen(false);
  };

  const loginWithPin = async (
    role: UserRole,
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanPin = String(pin).trim();
    if (!cleanPin) {
      return { success: false, error: 'Please enter your PIN or password.' };
    }

    const storedAdmin =
      typeof window !== 'undefined' ? localStorage.getItem('autoglow_super_admin_pin')?.trim() : '';
    const storedManager =
      typeof window !== 'undefined' ? localStorage.getItem('autoglow_manager_pin')?.trim() : '';

    const savedSuperAdminPin = storedAdmin && storedAdmin.length >= 4 ? storedAdmin : '4656';
    const savedManagerPin = storedManager && storedManager.length >= 4 ? storedManager : '1111';

    // 1. Verify against live backend API (D1 on Cloudflare Pages / SQLite locally)
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, pin: cleanPin }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const userObj: User = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          phone: data.user.phone || '',
          is_active: 1,
          created_at: '2023-01-10',
          updated_at: new Date().toISOString(),
        };

        setCurrentUser(userObj);
        setIsAuthenticated(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('autoglow_user_id', userObj.id);
          localStorage.setItem('autoglow_user_name', userObj.name);
          localStorage.setItem('autoglow_authenticated', 'true');
          localStorage.setItem(
            role === 'super_admin' ? 'autoglow_super_admin_pin' : 'autoglow_manager_pin',
            cleanPin
          );
        }
        return { success: true };
      } else if (!res.ok && contentType.includes('application/json')) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Incorrect PIN or password entered.' };
      }
    } catch {
      // Network or static offline fallback
    }

    // 2. Fallback client verification if API is unreachable offline
    const expectedPin = role === 'super_admin' ? savedSuperAdminPin : savedManagerPin;
    if (cleanPin === expectedPin) {
      const expectedUser = SYSTEM_USERS.find((u) => u.role === role) || SYSTEM_USERS[0];
      setCurrentUser(expectedUser);
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('autoglow_user_id', expectedUser.id);
        localStorage.setItem('autoglow_user_name', expectedUser.name);
        localStorage.setItem('autoglow_authenticated', 'true');
      }
      return { success: true };
    }

    return { success: false, error: 'Incorrect PIN or password. Access denied.' };
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('autoglow_user_id');
      localStorage.removeItem('autoglow_user_name');
      localStorage.removeItem('autoglow_authenticated');
    }
    setIsAuthenticated(false);
    setPinModalRole('super_admin');
    setIsPinModalOpen(true);
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    return allowedRoles.includes(currentUser.role);
  };

  const canAccessFinances = (): boolean => currentUser?.role === 'super_admin';
  const canAccessBilling = (): boolean => currentUser?.role === 'super_admin';
  const canAccessReports = (): boolean => currentUser?.role === 'super_admin';
  const canAccessAuditLogs = (): boolean => currentUser?.role === 'super_admin';
  const canManageSettings = (): boolean => currentUser?.role === 'super_admin';
  const canManageStaff = (): boolean => true;
  const canAccessRecords = (): boolean => true;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        availableUsers: SYSTEM_USERS,
        isAuthenticated,
        authLoaded,
        isPinModalOpen,
        pinModalRole,
        openPinModal,
        closePinModal,
        loginWithPin,
        logout,
        hasRole,
        canAccessFinances,
        canAccessBilling,
        canAccessReports,
        canAccessAuditLogs,
        canManageSettings,
        canManageStaff,
        canAccessRecords,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
