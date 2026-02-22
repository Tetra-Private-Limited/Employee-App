'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Employee, PaginatedResponse, ApiResponse, CreateEmployeeForm, UpdateEmployeeForm } from '@/lib/types';
import { buildQueryString } from '@/lib/utils';

interface EmployeeFilters {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  role?: string;
  isActive?: string;
}

export function useEmployees(initialFilters: EmployeeFilters = {}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EmployeeFilters>(initialFilters);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = buildQueryString({
        page: filters.page || 1,
        limit: filters.limit || 20,
        search: filters.search,
        department: filters.department,
        role: filters.role,
        isActive: filters.isActive,
      });
      const res = await api.get<PaginatedResponse<Employee>>(`/employees${qs}`);
      setEmployees(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const createEmployee = async (data: CreateEmployeeForm) => {
    await api.post('/employees', data);
    await fetchEmployees();
  };

  const updateEmployee = async (id: string, data: UpdateEmployeeForm) => {
    await api.put(`/employees/${id}`, data);
    await fetchEmployees();
  };

  const deleteEmployee = async (id: string) => {
    await api.del(`/employees/${id}`);
    await fetchEmployees();
  };

  const resetDevice = async (employeeId: string) => {
    await api.post('/auth/reset-device', { employeeId });
    await fetchEmployees();
  };

  return {
    employees,
    pagination,
    loading,
    error,
    filters,
    setFilters,
    refresh: fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    resetDevice,
  };
}

export function useEmployee(id: string) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ApiResponse<Employee>>(`/employees/${id}`);
      setEmployee(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  return { employee, loading, error, refresh: fetchEmployee };
}
