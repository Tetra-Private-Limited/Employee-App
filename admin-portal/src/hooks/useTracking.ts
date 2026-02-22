'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { LocationRecord, ApiResponse, FieldMovementSummary } from '@/lib/types';
import { buildQueryString } from '@/lib/utils';

interface EmployeeLocation {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  batteryLevel: number | null;
  recordedAt: string;
}

export function useRecentLocations() {
  const [locations, setLocations] = useState<EmployeeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<ApiResponse<EmployeeLocation[]>>('/locations/recent');
      setLocations(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    // Poll every 30 seconds
    const interval = setInterval(fetchLocations, 30000);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  return { locations, loading, error, refresh: fetchLocations };
}

export function useEmployeeRoute(employeeId: string, date: string) {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [summary, setSummary] = useState<FieldMovementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async () => {
    if (!employeeId || !date) return;
    try {
      setLoading(true);
      setError(null);

      const startDate = `${date}T00:00:00.000Z`;
      const endDate = `${date}T23:59:59.999Z`;
      const qs = buildQueryString({ employeeId, startDate, endDate, limit: 500 });

      const [locRes, summaryRes] = await Promise.all([
        api.get<ApiResponse<LocationRecord[]>>(`/locations/route${qs}`),
        api.get<ApiResponse<FieldMovementSummary>>(`/reports/movement/${employeeId}?date=${date}`),
      ]);

      setLocations(locRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load route');
    } finally {
      setLoading(false);
    }
  }, [employeeId, date]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  return { locations, summary, loading, error, refresh: fetchRoute };
}
