'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from './types';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  availableUsers: User[];
  switchUser: (userId: string) => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  canAccessFinances: () => boolean;
  canManageSettings: () => boolean;
  canManageStaff: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PRESET_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Christopher Basumatary',
    email: 'owner@theautoglow.in',
    role: 'super_admin',
    phone: '+91 98320 12345',
    is_active: 1,
    created_at: '2023-01-10',
    updated_at: '2023-01-10',
  },
  {
    id: 'usr-2',
    name: 'Tashi Lepcha',
    email: 'manager@theautoglow.in',
    role: 'manager',
    phone: '+91 98321 22334',
    is_active: 1,
    created_at: '2023-03-01',
    updated_at: '2023-03-01',
  },
  {
    id: 'usr-3',
    name: 'Pema Bhutia',
    email: 'accounts@theautoglow.in',
    role: 'accountant',
    phone: '+91 98322 33445',
    is_active: 1,
    created_at: '2023-04-15',
    updated_at: '2023-04-15',
  },
  {
    id: 'usr-4',
    name: 'Karma Namgyal',
    email: 'detailer@theautoglow.in',
    role: 'staff',
    phone: '+91 98323 44556',
    is_active: 1,
    created_at: '2023-02-15',
    updated_at: '2023-02-15',
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(PRESET_USERS[0]);

  useEffect(() => {
    const saved = localStorage.getItem('autoglow_user_id');
    if (saved) {
      const found = PRESET_USERS.find((u) => u.id === saved);
      if (found) setCurrentUser(found);
    }
  }, []);

  const switchUser = (userId: string) => {
    const user = PRESET_USERS.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('autoglow_user_id', user.id);
    }
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    return allowedRoles.includes(currentUser.role);
  };

  const canAccessFinances = (): boolean => {
    return hasRole(['super_admin', 'accountant', 'manager']);
  };

  const canManageSettings = (): boolean => {
    return currentUser?.role === 'super_admin';
  };

  const canManageStaff = (): boolean => {
    return hasRole(['super_admin', 'manager']);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        availableUsers: PRESET_USERS,
        switchUser,
        hasRole,
        canAccessFinances,
        canManageSettings,
        canManageStaff,
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
