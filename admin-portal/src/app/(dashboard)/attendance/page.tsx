'use client';

import { useState } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination } from '@/components/ui/table';
import { PageLoader, EmptyState } from '@/components/ui/loading';
import { formatDate, formatTime, formatDuration } from '@/lib/utils';

const statusOptions = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'HALF_DAY', label: 'Half Day' },
];

export default function AttendancePage() {
  const { records, pagination, loading, filters, setFilters, exportCsv } = useAttendance();
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');

  const applyDateFilter = () => {
    setFilters({ ...filters, startDate: startDate || undefined, endDate: endDate || undefined, page: 1 });
  };

  return (
    <div>
      <Header
        title="Attendance"
        description="View and manage employee attendance records"
        action={
          <Button variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 flex flex-wrap items-end gap-4">
          <div className="w-44">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              label="Status"
              options={statusOptions}
              placeholder="All Statuses"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
            />
          </div>
          <div className="w-44">
            <Input
              label="Department"
              placeholder="Filter department"
              value={filters.department || ''}
              onChange={(e) => setFilters({ ...filters, department: e.target.value || undefined, page: 1 })}
            />
          </div>
          <Button variant="secondary" onClick={applyDateFilter}>
            Apply
          </Button>
        </div>
      </Card>

      {/* Attendance Table */}
      <Card>
        {loading ? (
          <PageLoader />
        ) : records.length === 0 ? (
          <EmptyState message="No attendance records found" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableHeader>
              <TableBody>
                {records.map((rec) => {
                  const duration =
                    rec.timeIn && rec.timeOut
                      ? Math.round((new Date(rec.timeOut).getTime() - new Date(rec.timeIn).getTime()) / 60000)
                      : null;

                  return (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <div className="font-medium text-gray-900">{rec.employee?.name}</div>
                        <div className="text-xs text-gray-500">{rec.employee?.employeeCode}</div>
                      </TableCell>
                      <TableCell>{formatDate(rec.date)}</TableCell>
                      <TableCell>{formatTime(rec.timeIn)}</TableCell>
                      <TableCell>{formatTime(rec.timeOut)}</TableCell>
                      <TableCell>{formatDuration(duration)}</TableCell>
                      <TableCell>
                        <Badge variant={rec.status}>{rec.status.replace('_', ' ')}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </Card>
    </div>
  );
}
