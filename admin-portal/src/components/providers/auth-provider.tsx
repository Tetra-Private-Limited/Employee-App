'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Employee } from '@/lib/types';

interface AuthContextType {
  user: Employee | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await api.get<{ success: boolean; data: Employee }>('/auth/me');
      const employee = response.data;

      // Only allow ADMIN and MANAGER roles
      if (employee.role !== 'ADMIN' && employee.role !== 'MANAGER') {
        api.clearTokens();
        setUser(null);
        setIsLoading(false);
        return;
      }

      setUser(employee);
    } catch {
      api.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    const employee = data.employee;

    if (employee.role !== 'ADMIN' && employee.role !== 'MANAGER') {
      api.clearTokens();
      throw new Error('Access denied. Admin or Manager role required.');
    }

    setUser(employee);
    router.push('/dashboard');
  };

  const logout = () => {
    api.clearTokens();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
