import { prisma } from '../config/prisma.js';
import { calculateRouteDistance, detectStops } from './location.service.js';
import { startOfOrgDay, orgDayBoundsFromDateString } from '../utils/time.js';

export async function getDashboardStats(managerId?: string) {
  const today = startOfOrgDay();

  const employeeScope = managerId ? { managerId } : {};
  const employeeRelationScope = managerId ? { employee: { managerId } } : {};

  const [
    totalEmployees,
    activeEmployees,
    presentTodayEmployees,
    alertsToday,
    recentLocations,
  ] = await Promise.all([
    prisma.employee.count({ where: { deletedAt: null, ...employeeScope } }),
    prisma.employee.count({ where: { isActive: true, deletedAt: null, ...employeeScope } }),
    // An employee can have multiple attendance rows today (multiple
    // clock-in/out sessions), so this counts distinct employees, not rows —
    // otherwise someone with two sessions would be counted twice.
    prisma.attendance.findMany({
      where: {
        date: today,
        timeIn: { not: null },
        ...employeeRelationScope,
      },
      distinct: ['employeeId'],
      select: { employeeId: true },
    }),
    prisma.spoofingAlert.count({
      where: {
        createdAt: { gte: today },
        severity: { in: ['HIGH', 'CRITICAL'] },
        ...employeeRelationScope,
      },
    }),
    prisma.locationRecord.findMany({
      where: {
        recordedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        ...employeeRelationScope,
      },
      distinct: ['employeeId'],
      select: { employeeId: true },
    }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    presentToday: presentTodayEmployees.length,
    inField: recentLocations.length,
    alertsToday,
  };
}

export async function getAttendanceReport(
  startDate: Date,
  endDate: Date,
  department?: string,
  managerId?: string
) {
  const where: any = {
    date: { gte: startDate, lte: endDate },
    employee: { deletedAt: null },
  };
  if (department) {
    where.employee = { ...where.employee, department };
  }
  if (managerId) {
    where.employee = { ...where.employee, managerId };
  }

  const records = await prisma.attendance.findMany({
    where,
    include: {
      employee: {
        select: { id: true, name: true, employeeCode: true, department: true },
      },
    },
    orderBy: [{ date: 'desc' }, { employee: { name: 'asc' } }],
  });

  return records.map((r) => ({
    employeeName: r.employee.name,
    employeeCode: r.employee.employeeCode,
    department: r.employee.department,
    date: r.date,
    timeIn: r.timeIn,
    timeOut: r.timeOut,
    duration: r.timeIn && r.timeOut
      ? Math.round((r.timeOut.getTime() - r.timeIn.getTime()) / 60000)
      : null,
    status: r.status,
  }));
}

export async function getFieldMovementSummary(
  employeeId: string,
  dateString: string
) {
  // dateString is a plain "YYYY-MM-DD" calendar date (as sent by the admin
  // portal's date picker) representing an org-local day, not a UTC instant —
  // resolve its bounds in the org's timezone rather than the server host's.
  const { start, end } = orgDayBoundsFromDateString(dateString);

  const locations = await prisma.locationRecord.findMany({
    where: {
      employeeId,
      recordedAt: { gte: start, lt: end },
    },
    orderBy: { recordedAt: 'asc' },
  });

  if (locations.length === 0) {
    return { totalDistanceKm: 0, activeMinutes: 0, stops: [], locationCount: 0 };
  }

  const locData = locations.map((l) => ({
    latitude: Number(l.latitude),
    longitude: Number(l.longitude),
    recordedAt: l.recordedAt,
  }));

  const totalDistanceMeters = calculateRouteDistance(locData);
  const stops = detectStops(locData);

  const firstTime = locations[0].recordedAt;
  const lastTime = locations[locations.length - 1].recordedAt;
  const activeMinutes = Math.round((lastTime.getTime() - firstTime.getTime()) / 60000);

  return {
    totalDistanceKm: Math.round(totalDistanceMeters / 10) / 100,
    activeMinutes,
    stops,
    locationCount: locations.length,
    firstLocation: locData[0],
    lastLocation: locData[locData.length - 1],
  };
}

export async function generateCsvData(
  startDate: Date,
  endDate: Date,
  department?: string,
  managerId?: string
) {
  const report = await getAttendanceReport(startDate, endDate, department, managerId);
  return report.map((r) => ({
    'Employee Name': r.employeeName,
    'Employee Code': r.employeeCode,
    'Department': r.department || '',
    'Date': r.date.toISOString().split('T')[0],
    'Time In': r.timeIn ? r.timeIn.toISOString() : '',
    'Time Out': r.timeOut ? r.timeOut.toISOString() : '',
    'Duration (min)': r.duration ?? '',
    'Status': r.status,
  }));
}
