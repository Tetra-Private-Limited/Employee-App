'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { PageLoader, EmptyState } from '@/components/ui/loading';
import { StatusPieChart, DepartmentBarChart } from '@/components/charts/report-charts';
import { api } from '@/lib/api';
import { AttendanceReport, ApiResponse } from '@/lib/types';
import { formatDate, formatTime, formatDuration, toISODate, buildQueryString } from '@/lib/utils';

export default function ReportsPage() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [startDate, setStartDate] = useState(toISODate(weekAgo));
  const [endDate, setEndDate] = useState(toISODate(today));
  const [department, setDepartment] = useState('');
  const [report, setReport] = useState<AttendanceReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = buildQueryString({ startDate, endDate, department: department || undefined });
      const res = await api.get<ApiResponse<AttendanceReport[]>>(`/reports/attendance${qs}`);
      setReport(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, department]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Compute stats from report
  const statusBreakdown = report.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const pieData = Object.entries(statusBreakdown).map(([status, count]) => ({
    status: status.replace('_', ' '),
    count,
  }));

  // Department breakdown
  const deptMap = report.reduce(
    (acc, r) => {
      const dept = r.department || 'Unassigned';
      if (!acc[dept]) acc[dept] = { present: 0, late: 0, absent: 0 };
      if (r.status === 'PRESENT') acc[dept].present++;
      else if (r.status === 'LATE') acc[dept].late++;
      else if (r.status === 'ABSENT') acc[dept].absent++;
      return acc;
    },
    {} as Record<string, { present: number; late: number; absent: number }>
  );

  const deptData = Object.entries(deptMap).map(([department, counts]) => ({
    department,
    ...counts,
  }));

  const exportCsv = async () => {
    try {
      const qs = buildQueryString({ startDate, endDate, department: department || undefined });
      const res = await api.get<ApiResponse<string>>(`/reports/attendance/export${qs}`);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${startDate}-to-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div>
      <Header
        title="Reports"
        description="Attendance analytics and exports"
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
          <div className="w-44">
            <Input
              label="Department"
              placeholder="All departments"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <Button onClick={fetchReport}>Generate Report</Button>
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Charts */}
          {report.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Status Breakdown</h3>
                </CardHeader>
                <CardContent>
                  <StatusPieChart data={pieData} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">By Department</h3>
                </CardHeader>
                <CardContent>
                  <DepartmentBarChart data={deptData} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Report Table */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">
                Attendance Report ({report.length} records)
              </h3>
            </CardHeader>
            {report.length === 0 ? (
              <EmptyState message="No records for the selected period" />
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableHead>Employee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableHeader>
                  <TableBody>
                    {report.map((rec, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{rec.employeeName}</TableCell>
                        <TableCell className="font-mono text-xs">{rec.employeeCode}</TableCell>
                        <TableCell>{rec.department || '-'}</TableCell>
                        <TableCell>{formatDate(rec.date)}</TableCell>
                        <TableCell>{formatTime(rec.timeIn)}</TableCell>
                        <TableCell>{formatTime(rec.timeOut)}</TableCell>
                        <TableCell>{formatDuration(rec.duration)}</TableCell>
                        <TableCell>
                          <Badge variant={rec.status}>{rec.status.replace('_', ' ')}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
