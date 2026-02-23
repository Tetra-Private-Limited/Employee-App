'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CreateEmployeeForm, UpdateEmployeeForm, Employee, Role } from '@/lib/types';

interface EmployeeFormProps {
  employee?: Employee | null;
  onSubmit: (data: CreateEmployeeForm | UpdateEmployeeForm) => Promise<void>;
  onCancel: () => void;
}

const roleOptions = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

export function EmployeeForm({ employee, onSubmit, onCancel }: EmployeeFormProps) {
  const isEdit = !!employee;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    password: '',
    phone: employee?.phone || '',
    department: employee?.department || '',
    designation: employee?.designation || '',
    employeeCode: employee?.employeeCode || '',
    role: (employee?.role || 'EMPLOYEE') as Role,
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEdit) {
        const updateData: UpdateEmployeeForm = {};
        if (formData.name !== employee!.name) updateData.name = formData.name;
        if (formData.email !== employee!.email) updateData.email = formData.email;
        if (formData.phone !== (employee!.phone || '')) updateData.phone = formData.phone || undefined;
        if (formData.department !== (employee!.department || '')) updateData.department = formData.department || undefined;
        if (formData.designation !== (employee!.designation || '')) updateData.designation = formData.designation || undefined;
        if (formData.role !== employee!.role) updateData.role = formData.role;
        await onSubmit(updateData);
      } else {
        await onSubmit({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          department: formData.department || undefined,
          designation: formData.designation || undefined,
          employeeCode: formData.employeeCode,
          role: formData.role,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Name"
          required
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
        />
      </div>

      {!isEdit && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Employee Code"
            required
            value={formData.employeeCode}
            onChange={(e) => handleChange('employeeCode', e.target.value)}
            placeholder="EMP001"
          />
          <Input
            label="Password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Phone"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
        />
        <Select
          label="Role"
          options={roleOptions}
          value={formData.role}
          onChange={(e) => handleChange('role', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Department"
          value={formData.department}
          onChange={(e) => handleChange('department', e.target.value)}
        />
        <Input
          label="Designation"
          value={formData.designation}
          onChange={(e) => handleChange('designation', e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
        </Button>
      </div>
    </form>
  );
}
