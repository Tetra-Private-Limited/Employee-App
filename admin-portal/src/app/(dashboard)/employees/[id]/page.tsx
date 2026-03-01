'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEmployee } from '@/hooks/useEmployees';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PageLoader } from '@/components/ui/loading';
import { EmployeeForm } from '@/components/employees/employee-form';
import { UpdateEmployeeForm } from '@/lib/types';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { employee, loading, error, refresh } = useEmployee(id);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleUpdate = async (data: unknown) => {
    try {
      await api.put(`/employees/${id}`, data);
      setShowEditModal(false);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update employee');
    }
  };

  const handleResetDevice = async () => {
    if (confirm('Reset device binding for this employee?')) {
      try {
        await api.post('/auth/reset-device', { employeeId: id });
        refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to reset device');
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this employee? This action cannot be undone.')) {
      try {
        await api.del(`/employees/${id}`);
        router.push('/employees');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete employee');
      }
    }
  };

  if (loading) return <PageLoader />;

  if (error || !employee) {
    return (
      <div>
        <Header title="Employee" />
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Employee not found'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={employee.name}
        description={`${employee.employeeCode} · ${employee.department || 'No department'}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(true)}>
              Edit
            </Button>
            <Link href={`/tracking/${id}`}>
              <Button variant="secondary">View Tracking</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Profile Information</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <InfoRow label="Full Name" value={employee.name} />
              <InfoRow label="Email" value={employee.email} />
              <InfoRow label="Employee Code" value={employee.employeeCode} />
              <InfoRow label="Phone" value={employee.phone || '-'} />
              <InfoRow label="Department" value={employee.department || '-'} />
              <InfoRow label="Designation" value={employee.designation || '-'} />
              <InfoRow label="Role" value={<Badge variant={employee.role}>{employee.role}</Badge>} />
              <InfoRow
                label="Status"
                value={
                  <span className={`flex items-center gap-1.5 text-sm ${employee.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${employee.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </span>
                }
              />
              <InfoRow label="Joined" value={formatDate(employee.createdAt)} />
              <InfoRow label="Device Model" value={employee.deviceModel || 'Not bound'} />
            </div>
          </CardContent>
        </Card>

        {/* Stats & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Statistics</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Attendance Records</span>
                <span className="font-medium">{employee._count?.attendance ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Location Records</span>
                <span className="font-medium">{employee._count?.locationRecords ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Spoofing Alerts</span>
                <span className="font-medium text-red-600">{employee._count?.spoofingAlerts ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Actions</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              {employee.registeredDeviceId && (
                <Button variant="outline" className="w-full justify-start" onClick={handleResetDevice}>
                  Reset Device Binding
                </Button>
              )}
              <Button variant="danger" className="w-full justify-start" onClick={handleDelete}>
                Delete Employee
              </Button>
            </CardContent>
          </Card>

          {/* Device Info */}
          {employee.registeredDeviceId && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Device</h3>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Device ID" value={
                  <span className="font-mono text-xs truncate block max-w-[180px]" title={employee.registeredDeviceId}>
                    {employee.registeredDeviceId}
                  </span>
                } />
                <InfoRow label="Model" value={employee.deviceModel || '-'} />
                <InfoRow label="Bound At" value={employee.deviceBoundAt ? formatDateTime(employee.deviceBoundAt) : '-'} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Employee" size="lg">
        <EmployeeForm
          employee={employee}
          onSubmit={handleUpdate}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}
