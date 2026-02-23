// Enums
export type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
export type GeofenceType = 'OFFICE' | 'CLIENT' | 'WAREHOUSE' | 'CUSTOM';
export type AlertType = 'MOCK_LOCATION' | 'IMPOSSIBLE_TRAVEL' | 'SPOOFING_APP' | 'GNSS_ANOMALY' | 'INTEGRITY_FAILURE' | 'SENSOR_MISMATCH';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Models
export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  role: Role;
  isActive: boolean;
  registeredDeviceId: string | null;
  deviceModel: string | null;
  deviceBoundAt: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    attendance: number;
    locationRecords: number;
    spoofingAlerts: number;
  };
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  timeInLatitude: number | null;
  timeInLongitude: number | null;
  timeOutLatitude: number | null;
  timeOutLongitude: number | null;
  status: AttendanceStatus;
  notes: string | null;
  createdAt: string;
  employee?: {
    id: string;
    name: string;
    employeeCode: string;
    department: string | null;
  };
}

export interface LocationRecord {
  id: string;
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  bearing: number | null;
  provider: string | null;
  isMock: boolean;
  batteryLevel: number | null;
  deviceId: string | null;
  riskScore: number;
  recordedAt: string;
  syncedAt: string | null;
  createdAt: string;
  employee?: {
    id: string;
    name: string;
    employeeCode: string;
  };
}

export interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  type: GeofenceType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    employeeGeofences: number;
  };
}

export interface SpoofingAlert {
  id: string;
  employeeId: string;
  alertType: AlertType;
  details: Record<string, unknown> | null;
  locationRecordId: string | null;
  severity: AlertSeverity;
  riskScore: number;
  createdAt: string;
  employee?: {
    id: string;
    name: string;
    employeeCode: string;
  };
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface DailyRouteSummary {
  id: string;
  employeeId: string;
  date: string;
  totalDistanceKm: number;
  activeMinutes: number;
  stopsCount: number;
  firstLatitude: number | null;
  firstLongitude: number | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  inField: number;
  alertsToday: number;
}

export interface AttendanceReport {
  employeeName: string;
  employeeCode: string;
  department: string | null;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  duration: number | null;
  status: AttendanceStatus;
}

export interface FieldMovementSummary {
  totalDistanceKm: number;
  activeMinutes: number;
  stops: Array<{ latitude: number; longitude: number; durationMinutes: number }>;
  locationCount: number;
  firstLocation?: { latitude: number; longitude: number; recordedAt: string };
  lastLocation?: { latitude: number; longitude: number; recordedAt: string };
}

// Form types
export interface CreateEmployeeForm {
  name: string;
  email: string;
  password: string;
  phone?: string;
  department?: string;
  designation?: string;
  employeeCode: string;
  role?: Role;
}

export interface UpdateEmployeeForm {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  role?: Role;
  isActive?: boolean;
}

export interface CreateGeofenceForm {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  type: GeofenceType;
}
