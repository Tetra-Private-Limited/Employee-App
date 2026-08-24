import { Request, Response, NextFunction } from 'express';
import { success, error } from '../utils/apiResponse.js';
import * as reportService from '../services/report.service.js';
import { prisma } from '../config/prisma.js';

function managerScopeId(req: Request): string | undefined {
  return req.user?.role === 'MANAGER' ? req.user.id : undefined;
}

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await reportService.getDashboardStats(managerScopeId(req));
    return success(res, stats);
  } catch (err) {
    next(err);
  }
}

export async function getAttendanceReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, department } = req.query as any;

    if (!startDate || !endDate) {
      return error(res, 'startDate and endDate are required', 400);
    }

    const report = await reportService.getAttendanceReport(
      new Date(startDate),
      new Date(endDate),
      department || undefined,
      managerScopeId(req)
    );

    return success(res, report);
  } catch (err) {
    next(err);
  }
}

export async function exportAttendanceCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, department } = req.query as any;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const csvData = await reportService.generateCsvData(start, end, department || undefined, managerScopeId(req));

    // Convert to CSV string
    if (csvData.length === 0) {
      return success(res, '');
    }

    const headers = Object.keys(csvData[0]);
    const rows = csvData.map((row) =>
      headers.map((h) => {
        const val = (row as any)[h];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val);
      }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    return success(res, csv);
  } catch (err) {
    next(err);
  }
}

export async function getRecentAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const where: any = {};
    const managerId = managerScopeId(req);
    if (managerId) {
      where.employee = { managerId };
    }

    const alerts = await prisma.spoofingAlert.findMany({
      where,
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { id: true, name: true, employeeCode: true },
        },
      },
    });

    return success(res, alerts);
  } catch (err) {
    next(err);
  }
}

export async function getFieldMovement(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId } = req.params;
    const { date } = req.query as any;

    if (!date) {
      return error(res, 'date query parameter is required', 400);
    }

    const managerId = managerScopeId(req);
    if (managerId) {
      const isDirectReport = await prisma.employee.findFirst({
        where: { id: employeeId, managerId },
        select: { id: true },
      });
      if (!isDirectReport) {
        return error(res, 'Employee not found in your team', 403);
      }
    }

    const summary = await reportService.getFieldMovementSummary(employeeId, date);
    return success(res, summary);
  } catch (err) {
    next(err);
  }
}
