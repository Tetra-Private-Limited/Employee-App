'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { DashboardStats, SpoofingAlert, ApiResponse } from '@/lib/types';

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<SpoofingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, alertsRes] = await Promise.all([
        api.get<ApiResponse<DashboardStats>>('/reports/dashboard'),
        api.get<ApiResponse<SpoofingAlert[]>>('/reports/alerts/recent'),
      ]);

      setStats(statsRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { stats, alerts, loading, error, refresh: fetchDashboard };
}
