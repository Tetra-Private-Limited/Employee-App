'use client';

import { useState } from 'react';
import { useEmployees } from '@/hooks/useEmployees';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/table';
import { PageLoader, EmptyState } from '@/components/ui/loading';
import { EmployeeTable } from '@/components/employees/employee-table';
import { EmployeeForm } from '@/components/employees/employee-form';
import { Employee, CreateEmployeeForm, UpdateEmployeeForm } from '@/lib/types';

const roleFilterOptions = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

const statusOptions = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export default function EmployeesPage() {
  const {
    employees,
    pagination,
    loading,
    filters,
    setFilters,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    resetDevice,
  } = useEmployees();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = () => {
    setFilters({ ...filters, search: searchInput, page: 1 });
  };

  const handleCreate = async (data: CreateEmployeeForm | UpdateEmployeeForm) => {
    await createEmployee(data as CreateEmployeeForm);
    setShowCreateModal(false);
  };

  const handleUpdate = async (data: CreateEmployeeForm | UpdateEmployeeForm) => {
    if (editEmployee) {
      await updateEmployee(editEmployee.id, data as UpdateEmployeeForm);
      setEditEmployee(null);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (confirm(`Delete ${emp.name}? This action cannot be undone.`)) {
      await deleteEmployee(emp.id);
    }
  };

  const handleResetDevice = async (emp: Employee) => {
    if (confirm(`Reset device binding for ${emp.name}?`)) {
      await resetDevice(emp.id);
    }
  };

  return (
    <div>
      <Header
        title="Employees"
        description="Manage employee accounts and devices"
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            + Add Employee
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search name, email, or code..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="w-40">
            <Select
              options={roleFilterOptions}
              placeholder="All Roles"
              value={filters.role || ''}
              onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
            />
          </div>
          <div className="w-40">
            <Select
              options={statusOptions}
              placeholder="All Status"
              value={filters.isActive || ''}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value, page: 1 })}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </Card>

      {/* Employee Table */}
      <Card>
        {loading ? (
          <PageLoader />
        ) : employees.length === 0 ? (
          <EmptyState message="No employees found" />
        ) : (
          <>
            <EmployeeTable
              employees={employees}
              onEdit={setEditEmployee}
              onDelete={handleDelete}
              onResetDevice={handleResetDevice}
            />
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Employee"
        size="lg"
      >
        <EmployeeForm onSubmit={handleCreate} onCancel={() => setShowCreateModal(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editEmployee}
        onClose={() => setEditEmployee(null)}
        title="Edit Employee"
        size="lg"
      >
        <EmployeeForm
          employee={editEmployee}
          onSubmit={handleUpdate}
          onCancel={() => setEditEmployee(null)}
        />
      </Modal>
    </div>
  );
}
