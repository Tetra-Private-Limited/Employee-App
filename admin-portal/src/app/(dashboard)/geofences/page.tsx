'use client';

import { useState } from 'react';
import { useGeofences } from '@/hooks/useGeofences';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { PageLoader, EmptyState } from '@/components/ui/loading';
import { MapView } from '@/components/map/map-container';
import { CreateGeofenceForm, GeofenceType } from '@/lib/types';

const typeOptions = [
  { value: 'OFFICE', label: 'Office' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function GeofencesPage() {
  const { geofences, loading, createGeofence, updateGeofence, deleteGeofence } = useGeofences();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateGeofenceForm>({
    name: '',
    latitude: 0,
    longitude: 0,
    radiusMeters: 100,
    type: 'OFFICE',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const circles = geofences
    .filter((g) => g.isActive)
    .map((g) => ({
      center: [Number(g.latitude), Number(g.longitude)] as [number, number],
      radius: g.radiusMeters,
      color: g.type === 'OFFICE' ? '#3b82f6' : g.type === 'CLIENT' ? '#22c55e' : g.type === 'WAREHOUSE' ? '#f59e0b' : '#6b7280',
      label: g.name,
    }));

  const handleMapClick = (lat: number, lng: number) => {
    if (showCreateModal) {
      setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      setFormError('Name is required');
      return;
    }
    if (formData.latitude === 0 && formData.longitude === 0) {
      setFormError('Click on the map to set location');
      return;
    }

    try {
      setSaving(true);
      setFormError('');
      await createGeofence(formData);
      setShowCreateModal(false);
      setFormData({ name: '', latitude: 0, longitude: 0, radiusMeters: 100, type: 'OFFICE' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create geofence');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await updateGeofence(id, { isActive: !isActive });
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete geofence "${name}"?`)) {
      await deleteGeofence(id);
    }
  };

  return (
    <div>
      <Header
        title="Geofences"
        description="Manage location boundaries"
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            + Add Geofence
          </Button>
        }
      />

      {/* Map */}
      <Card className="mb-6">
        <CardContent className="p-0 overflow-hidden rounded-xl">
          {loading ? (
            <PageLoader />
          ) : (
            <MapView
              circles={circles}
              className="h-[400px]"
              onMapClick={handleMapClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Geofence Table */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">Geofences ({geofences.length})</h3>
        </CardHeader>
        {loading ? (
          <PageLoader />
        ) : geofences.length === 0 ? (
          <EmptyState message="No geofences configured" />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Radius</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableHeader>
            <TableBody>
              {geofences.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium text-gray-900">{g.name}</TableCell>
                  <TableCell>
                    <Badge variant={g.type}>{g.type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {Number(g.latitude).toFixed(4)}, {Number(g.longitude).toFixed(4)}
                  </TableCell>
                  <TableCell>{g.radiusMeters}m</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${g.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                      {g.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(g.id, g.isActive)}
                      >
                        {g.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDelete(g.id, g.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Geofence"
        size="lg"
      >
        <div className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          <p className="text-sm text-gray-500">Click on the map below to set the geofence center point.</p>

          <MapView
            className="h-[250px] rounded-lg"
            onMapClick={(lat, lng) => setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
            markers={
              formData.latitude !== 0
                ? [{ id: 'new', latitude: formData.latitude, longitude: formData.longitude, label: formData.name || 'New Geofence' }]
                : []
            }
            circles={
              formData.latitude !== 0
                ? [{ center: [formData.latitude, formData.longitude], radius: formData.radiusMeters, label: formData.name }]
                : []
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              required
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Office HQ"
            />
            <Select
              label="Type"
              options={typeOptions}
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as GeofenceType }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={formData.latitude || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={formData.longitude || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Radius (meters)"
              type="number"
              min={50}
              max={10000}
              value={formData.radiusMeters}
              onChange={(e) => setFormData((prev) => ({ ...prev, radiusMeters: parseInt(e.target.value) || 100 }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating...' : 'Create Geofence'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
