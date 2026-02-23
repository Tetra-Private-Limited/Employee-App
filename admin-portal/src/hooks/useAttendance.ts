'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Attendance, PaginatedResponse } from '@/lib/types';
import { buildQueryString } from '@/lib/utils';

interface AttendanceFilters {
  page?: number;
  limit?: number;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  department?: string;
}

export function useAttendance(initialFilters: AttendanceFilters = {}) {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AttendanceFilters>(initialFilters);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = buildQueryString({
        page: filters.page || 1,
        limit: filters.limit || 20,
        employeeId: filters.employeeId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
        department: filters.department,
      });
      const res = await api.get<PaginatedResponse<Attendance>>(`/attendance${qs}`);
      setRecords(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const exportCsv = async () => {
    try {
      const qs = buildQueryString({
        startDate: filters.startDate,
        endDate: filters.endDate,
        department: filters.department,
      });
      const res = await api.get<{ success: boolean; data: string }>(`/reports/attendance/export${qs}`);
      // Trigger download
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${filters.startDate || 'all'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export CSV');
    }
  };

  return {
    records,
    pagination,
    loading,
    error,
    filters,
    setFilters,
    refresh: fetchAttendance,
    exportCsv,
  };
}
