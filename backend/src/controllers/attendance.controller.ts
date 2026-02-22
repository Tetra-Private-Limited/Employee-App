import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { success, error, paginated } from '../utils/apiResponse.js';
import { config } from '../config/index.js';

export async function timeIn(req: Request, res: Response, next: NextFunction) {
  try {
    const { latitude, longitude, deviceId } = req.body;
    const employeeId = req.user!.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existing?.timeIn) {
      return error(res, 'Already clocked in today', 400);
    }

    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();

    // Determine status based on office hours
    let status: 'PRESENT' | 'LATE' = 'PRESENT';
    const totalMinutes = hour * 60 + minutes;
    const lateThreshold = config.officeHours.start * 60 + config.officeHours.lateThresholdMinutes;
    if (totalMinutes > lateThreshold) {
      status = 'LATE';
    }

    const attendance = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      create: {
        employeeId,
        date: today,
        timeIn: now,
        timeInLatitude: latitude,
        timeInLongitude: longitude,
        status,
      },
      update: {
        timeIn: now,
        timeInLatitude: latitude,
        timeInLongitude: longitude,
        status,
      },
    });

    return success(res, attendance, 201);
  } catch (err) {
    next(err);
  }
}

export async function timeOut(req: Request, res: Response, next: NextFunction) {
  try {
    const { latitude, longitude } = req.body;
    const employeeId = req.user!.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (!existing || !existing.timeIn) {
      return error(res, 'No clock-in record found for today', 400);
    }

    if (existing.timeOut) {
      return error(res, 'Already clocked out today', 400);
    }

    const now = new Date();

    // Check for half day (less than 4 hours)
    const hoursWorked = (now.getTime() - existing.timeIn.getTime()) / (1000 * 60 * 60);
    let status = existing.status;
    if (hoursWorked < 4) {
      status = 'HALF_DAY';
    }

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        timeOut: now,
        timeOutLatitude: latitude,
        timeOutLongitude: longitude,
        status,
      },
    });

    return success(res, attendance);
  } catch (err) {
    next(err);
  }
}

export async function getToday(req: Request, res: Response, next: NextFunction) {
  try {
    const employeeId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    return success(res, attendance);
  } catch (err) {
    next(err);
  }
}

export async function listAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 20, employeeId, startDate, endDate, status, department } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    // Role-based visibility
    if (req.user?.role === 'MANAGER') {
      const manager = await prisma.employee.findUnique({ where: { id: req.user.id } });
      if (manager?.department) {
        where.employee = { department: manager.department, deletedAt: null };
      }
    } else if (req.user?.role === 'EMPLOYEE') {
      where.employeeId = req.user.id;
    }

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          employee: {
            select: { id: true, name: true, employeeCode: true, department: true },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.attendance.count({ where }),
    ]);

    return paginated(res, records, total, Number(page), Number(limit));
  } catch (err) {
    next(err);
  }
}
