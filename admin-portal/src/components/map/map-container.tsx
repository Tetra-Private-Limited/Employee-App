'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Only import leaflet on client side
let L: typeof import('leaflet') | null = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  // Fix default marker icons
  delete (L!.Icon.Default.prototype as any)._getIconUrl;
  L!.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  popup?: string;
  color?: string;
}

interface MapContainerProps {
  markers?: Marker[];
  polyline?: Array<[number, number]>;
  circles?: Array<{
    center: [number, number];
    radius: number;
    color?: string;
    label?: string;
  }>;
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

function MapInner({
  markers = [],
  polyline,
  circles = [],
  center = [20.5937, 78.9629], // India center
  zoom = 5,
  className = 'h-[500px]',
  onMapClick,
}: MapContainerProps) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  useEffect(() => {
    if (!containerRef.current || !L) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      mapRef.current.on('click', (e: any) => {
        onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !L) return;

    // Clear existing markers
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L!.Marker) {
        mapRef.current.removeLayer(layer);
      }
    });

    // Add markers
    const bounds: Array<[number, number]> = [];
    markers.forEach((m) => {
      const marker = L!.marker([m.latitude, m.longitude]).addTo(mapRef.current);
      if (m.popup) {
        marker.bindPopup(m.popup);
      }
      marker.bindTooltip(m.label, { permanent: false });
      bounds.push([m.latitude, m.longitude]);
    });

    // Fit bounds if we have markers
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [markers]);

  // Update polyline
  useEffect(() => {
    if (!mapRef.current || !L) return;

    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L!.Polyline && !(layer instanceof L!.Circle)) {
        mapRef.current.removeLayer(layer);
      }
    });

    if (polyline && polyline.length > 1) {
      L.polyline(polyline, { color: '#3b82f6', weight: 3, opacity: 0.8 }).addTo(mapRef.current);
      mapRef.current.fitBounds(polyline, { padding: [50, 50] });
    }
  }, [polyline]);

  // Update circles (geofences)
  useEffect(() => {
    if (!mapRef.current || !L) return;

    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L!.Circle) {
        mapRef.current.removeLayer(layer);
      }
    });

    circles.forEach((c) => {
      const circle = L!.circle(c.center, {
        radius: c.radius,
        color: c.color || '#3b82f6',
        fillOpacity: 0.1,
        weight: 2,
      }).addTo(mapRef.current);
      if (c.label) {
        circle.bindTooltip(c.label, { permanent: true, direction: 'center' });
      }
    });
  }, [circles]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div ref={containerRef} className={className} />
    </>
  );
}

// Dynamic import to avoid SSR issues
export const MapView = dynamic(() => Promise.resolve(MapInner), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
      Loading map...
    </div>
  ),
});
