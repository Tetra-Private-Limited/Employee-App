import { Request, Response, NextFunction } from 'express';
import { success, error } from '../utils/apiResponse.js';
import * as reportService from '../services/report.service.js';
import { prisma } from '../config/prisma.js';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await reportService.getDashboardStats();
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
      department || undefined
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

    const csvData = await reportService.generateCsvData(start, end, department || undefined);

    // Convert to CSV string
    if (csvData.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-report.csv"`);
      return res.send('');
    }

    const escapeCsvField = (val: unknown): string => {
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = Object.keys(csvData[0]);
    const rows = csvData.map((row) =>
      headers.map((h) => escapeCsvField((row as any)[h])).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-report.csv"`);
    return res.send(csv);
  } catch (err) {
    next(err);
  }
}

export async function getRecentAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const alerts = await prisma.spoofingAlert.findMany({
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

    const summary = await reportService.getFieldMovementSummary(employeeId, new Date(date));
    return success(res, summary);
  } catch (err) {
    next(err);
  }
}
