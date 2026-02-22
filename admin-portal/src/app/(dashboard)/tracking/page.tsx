'use client';

import { useRecentLocations } from '@/hooks/useTracking';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/loading';
import { MapView } from '@/components/map/map-container';
import { formatTime } from '@/lib/utils';
import Link from 'next/link';

export default function TrackingPage() {
  const { locations, loading, error, refresh } = useRecentLocations();

  const markers = locations.map((loc) => ({
    id: loc.employeeId,
    latitude: loc.latitude,
    longitude: loc.longitude,
    label: loc.employeeName,
    popup: `
      <strong>${loc.employeeName}</strong><br/>
      ${loc.employeeCode}<br/>
      Battery: ${loc.batteryLevel !== null ? `${loc.batteryLevel}%` : 'N/A'}<br/>
      Speed: ${loc.speed !== null ? `${loc.speed.toFixed(1)} m/s` : 'N/A'}<br/>
      Last update: ${formatTime(loc.recordedAt)}
    `,
  }));

  return (
    <div>
      <Header
        title="Live Tracking"
        description="Real-time employee locations"
        action={
          <Button variant="outline" onClick={refresh}>
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-xl">
              {loading ? (
                <PageLoader />
              ) : (
                <MapView markers={markers} className="h-[600px]" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Employee List */}
        <div>
          <Card>
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                Employees ({locations.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-50 max-h-[560px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
              ) : locations.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">No active employees</div>
              ) : (
                locations.map((loc) => (
                  <Link
                    key={loc.employeeId}
                    href={`/tracking/${loc.employeeId}`}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{loc.employeeName}</p>
                        <p className="text-xs text-gray-500">{loc.employeeCode}</p>
                      </div>
                      <div className="text-right">
                        {loc.batteryLevel !== null && (
                          <p className={`text-xs ${loc.batteryLevel < 20 ? 'text-red-500' : 'text-gray-500'}`}>
                            {loc.batteryLevel}%
                          </p>
                        )}
                        <p className="text-xs text-gray-400">{formatTime(loc.recordedAt)}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
