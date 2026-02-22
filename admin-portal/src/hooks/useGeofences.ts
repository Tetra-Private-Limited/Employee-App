'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Geofence, ApiResponse, CreateGeofenceForm } from '@/lib/types';

export function useGeofences() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGeofences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ApiResponse<Geofence[]>>('/geofences');
      setGeofences(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load geofences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGeofences();
  }, [fetchGeofences]);

  const createGeofence = async (data: CreateGeofenceForm) => {
    await api.post('/geofences', data);
    await fetchGeofences();
  };

  const updateGeofence = async (id: string, data: Partial<CreateGeofenceForm> & { isActive?: boolean }) => {
    await api.put(`/geofences/${id}`, data);
    await fetchGeofences();
  };

  const deleteGeofence = async (id: string) => {
    await api.del(`/geofences/${id}`);
    await fetchGeofences();
  };

  const assignEmployees = async (geofenceId: string, employeeIds: string[]) => {
    await api.post(`/geofences/${geofenceId}/assign`, { employeeIds });
    await fetchGeofences();
  };

  return {
    geofences,
    loading,
    error,
    refresh: fetchGeofences,
    createGeofence,
    updateGeofence,
    deleteGeofence,
    assignEmployees,
  };
}
