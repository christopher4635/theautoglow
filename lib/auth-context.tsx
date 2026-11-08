'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from './types';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  availableUsers: User[];
  isPinModalOpen: boolean;
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
    pin: '4656',
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
    pin: '1111',
    created_at: '2023-03-01',
    updated_at: '2023-03-01',
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(SYSTEM_USERS[0]);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  useEffect(() => {
    const savedUserId = localStorage.getItem('autoglow_user_id');
    if (savedUserId) {
      const found = SYSTEM_USERS.find((u) => u.id === savedUserId);
      if (found) setCurrentUser(found);
    }
  }, []);

  const openPinModal = (role?: UserRole) => {
    setIsPinModalOpen(true);
  };

  const closePinModal = () => {
    setIsPinModalOpen(false);
  };

  const loginWithPin = async (
    role: UserRole,
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, pin }),
      });

      if (res.ok) {
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
        localStorage.setItem('autoglow_user_id', userObj.id);
        return { success: true };
      } else {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Incorrect PIN entered.' };
      }
    } catch {
      // Local fallback check if network/server is offline
      const expectedUser = SYSTEM_USERS.find((u) => u.role === role);
      if (expectedUser) {
        const expectedPin = role === 'super_admin' ? '4656' : '1111';
        if (pin === expectedPin) {
          setCurrentUser(expectedUser);
          localStorage.setItem('autoglow_user_id', expectedUser.id);
          return { success: true };
        }
      }
      return { success: false, error: 'Incorrect PIN. Access denied.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('autoglow_user_id');
    setIsPinModalOpen(true);
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    return allowedRoles.includes(currentUser.role);
  };

  // Manager is limited to attendance and records: strictly NO financial access
  const canAccessFinances = (): boolean => {
    return currentUser?.role === 'super_admin';
  };

  const canAccessBilling = (): boolean => {
    return currentUser?.role === 'super_admin';
  };

  const canAccessReports = (): boolean => {
    return currentUser?.role === 'super_admin';
  };

  const canAccessAuditLogs = (): boolean => {
    return currentUser?.role === 'super_admin';
  };

  const canManageSettings = (): boolean => {
    return currentUser?.role === 'super_admin';
  };

  // Both Abhinay and Manager can manage staff attendance
  const canManageStaff = (): boolean => {
    return true;
  };

  // Both Abhinay and Manager can access operational records (CRM, Vehicles, Job Cards, Inspections, Bays, Reminders, Assets)
  const canAccessRecords = (): boolean => {
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        availableUsers: SYSTEM_USERS,
        isPinModalOpen,
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
