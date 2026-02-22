'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLoader, EmptyState } from '@/components/ui/loading';
import { AttendanceChart } from '@/components/charts/attendance-chart';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

// Placeholder chart data (will be replaced when backend provides attendance trend)
const mockChartData = [
  { date: 'Mon', present: 42, late: 5, absent: 3 },
  { date: 'Tue', present: 45, late: 3, absent: 2 },
  { date: 'Wed', present: 40, late: 6, absent: 4 },
  { date: 'Thu', present: 44, late: 4, absent: 2 },
  { date: 'Fri', present: 38, late: 7, absent: 5 },
  { date: 'Sat', present: 10, late: 1, absent: 39 },
  { date: 'Sun', present: 5, late: 0, absent: 45 },
];

export default function DashboardPage() {
  const { stats, alerts, loading, error } = useDashboard();

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div>
        <Header title="Dashboard" />
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Dashboard" description="Overview of employee tracking system" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Total Employees"
          value={stats?.totalEmployees ?? 0}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active Employees"
          value={stats?.activeEmployees ?? 0}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Present Today"
          value={stats?.presentToday ?? 0}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="In Field"
          value={stats?.inField ?? 0}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          }
        />
        <StatCard
          label="Alerts Today"
          value={stats?.alertsToday ?? 0}
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Weekly Attendance</h3>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={mockChartData} />
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
              <Link href="/reports" className="text-sm text-primary-600 hover:text-primary-700">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {alerts.length === 0 ? (
              <EmptyState message="No recent alerts" />
            ) : (
              <div className="divide-y divide-gray-100">
                {alerts.slice(0, 8).map((alert) => (
                  <div key={alert.id} className="px-6 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {alert.employee?.name || 'Unknown'}
                      </span>
                      <Badge variant={alert.severity}>{alert.severity}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {alert.alertType.replace(/_/g, ' ')} &middot; {formatDateTime(alert.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
