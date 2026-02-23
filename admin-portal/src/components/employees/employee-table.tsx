'use client';

import Link from 'next/link';
import { Employee } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';

interface EmployeeTableProps {
  employees: Employee[];
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
  onResetDevice?: (employee: Employee) => void;
}

export function EmployeeTable({ employees, onEdit, onDelete, onResetDevice }: EmployeeTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableHead>Employee</TableHead>
        <TableHead>Code</TableHead>
        <TableHead>Department</TableHead>
        <TableHead>Role</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Device</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableHeader>
      <TableBody>
        {employees.map((emp) => (
          <TableRow key={emp.id}>
            <TableCell>
              <Link href={`/employees/${emp.id}`} className="hover:text-primary-600">
                <div className="font-medium text-gray-900">{emp.name}</div>
                <div className="text-xs text-gray-500">{emp.email}</div>
              </Link>
            </TableCell>
            <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
            <TableCell>{emp.department || '-'}</TableCell>
            <TableCell>
              <Badge variant={emp.role}>{emp.role}</Badge>
            </TableCell>
            <TableCell>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${emp.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                {emp.isActive ? 'Active' : 'Inactive'}
              </span>
            </TableCell>
            <TableCell>
              {emp.registeredDeviceId ? (
                <span className="text-xs text-gray-500" title={emp.registeredDeviceId}>
                  {emp.deviceModel || 'Bound'}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Unbound</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Link href={`/employees/${emp.id}`}>
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
                {onEdit && (
                  <Button variant="ghost" size="sm" onClick={() => onEdit(emp)}>
                    Edit
                  </Button>
                )}
                {onResetDevice && emp.registeredDeviceId && (
                  <Button variant="ghost" size="sm" onClick={() => onResetDevice(emp)}>
                    Reset
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(emp)}>
                    Delete
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
