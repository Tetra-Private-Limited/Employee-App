export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PRESENT: 'bg-green-100 text-green-800',
    LATE: 'bg-yellow-100 text-yellow-800',
    ABSENT: 'bg-red-100 text-red-800',
    HALF_DAY: 'bg-orange-100 text-orange-800',
    EMPLOYEE: 'bg-blue-100 text-blue-800',
    MANAGER: 'bg-purple-100 text-purple-800',
    ADMIN: 'bg-red-100 text-red-800',
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
    OFFICE: 'bg-blue-100 text-blue-800',
    CLIENT: 'bg-green-100 text-green-800',
    WAREHOUSE: 'bg-amber-100 text-amber-800',
    CUSTOM: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}
