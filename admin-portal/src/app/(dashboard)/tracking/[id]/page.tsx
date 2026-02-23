'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useEmployeeRoute } from '@/hooks/useTracking';
import { useEmployee } from '@/hooks/useEmployees';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { PageLoader } from '@/components/ui/loading';
import { MapView } from '@/components/map/map-container';
import { formatTime, formatDuration, toISODate } from '@/lib/utils';

export default function EmployeeTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [date, setDate] = useState(toISODate(new Date()));
  const { employee } = useEmployee(id);
  const { locations, summary, loading, error } = useEmployeeRoute(id, date);

  const polyline: Array<[number, number]> = locations.map((loc) => [
    Number(loc.latitude),
    Number(loc.longitude),
  ]);

  const markers = locations.length > 0
    ? [
        {
          id: 'start',
          latitude: Number(locations[0].latitude),
          longitude: Number(locations[0].longitude),
          label: 'Start',
          popup: `<strong>Start</strong><br/>${formatTime(locations[0].recordedAt)}`,
        },
        {
          id: 'end',
          latitude: Number(locations[locations.length - 1].latitude),
          longitude: Number(locations[locations.length - 1].longitude),
          label: 'End',
          popup: `<strong>End</strong><br/>${formatTime(locations[locations.length - 1].recordedAt)}`,
        },
      ]
    : [];

  return (
    <div>
      <Header
        title={employee?.name || 'Employee Tracking'}
        description={employee ? `${employee.employeeCode} · Route for ${date}` : undefined}
        action={
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Route Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Distance"
            value={`${summary.totalDistanceKm} km`}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            }
          />
          <StatCard
            label="Active Time"
            value={formatDuration(summary.activeMinutes)}
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Stops"
            value={summary.stops?.length ?? 0}
            color="yellow"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            }
          />
          <StatCard
            label="Location Points"
            value={summary.locationCount}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Map */}
      <Card className="mb-6">
        <CardContent className="p-0 overflow-hidden rounded-xl">
          {loading ? (
            <PageLoader />
          ) : locations.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-gray-400">
              No location data for this date
            </div>
          ) : (
            <MapView markers={markers} polyline={polyline} className="h-[400px]" />
          )}
        </CardContent>
      </Card>

      {/* Location Points Table */}
      {locations.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Location Points ({locations.length})</h3>
          </CardHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableHead>Time</TableHead>
                <TableHead>Lat/Lng</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Risk</TableHead>
              </TableHeader>
              <TableBody>
                {locations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell>{formatTime(loc.recordedAt)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
                    </TableCell>
                    <TableCell>{loc.accuracy ? `${loc.accuracy.toFixed(0)}m` : '-'}</TableCell>
                    <TableCell>{loc.speed !== null ? `${loc.speed.toFixed(1)} m/s` : '-'}</TableCell>
                    <TableCell>{loc.provider || '-'}</TableCell>
                    <TableCell>
                      {loc.riskScore > 0 ? (
                        <Badge variant={loc.riskScore >= 50 ? 'HIGH' : loc.riskScore >= 15 ? 'MEDIUM' : 'LOW'}>
                          {loc.riskScore}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
