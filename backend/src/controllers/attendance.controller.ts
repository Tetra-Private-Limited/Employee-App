import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { success, error, paginated } from '../utils/apiResponse.js';
import { config } from '../config/index.js';
import { startOfOrgDay, orgNowParts } from '../utils/time.js';

export async function timeIn(req: Request, res: Response, next: NextFunction) {
  try {
    const { latitude, longitude, deviceId } = req.body;
    const employeeId = req.user!.id;

    const today = startOfOrgDay();

    // An employee can clock in more than once per day (e.g. called back for
    // emergency duty after already clocking out) — what's not allowed is a
    // second clock-in while one is already open.
    const openSession = await prisma.attendance.findFirst({
      where: { employeeId, date: today, timeOut: null },
    });

    if (openSession) {
      return error(res, 'Already clocked in today. Clock out first.', 400);
    }

    const now = new Date();
    const { hour, minute } = orgNowParts(now);

    // "Late" only makes sense for the day's first clock-in — a second
    // session after an emergency callback isn't a late arrival.
    const sessionsToday = await prisma.attendance.count({ where: { employeeId, date: today } });
    const isFirstSessionToday = sessionsToday === 0;

    let status: 'PRESENT' | 'LATE' = 'PRESENT';
    if (isFirstSessionToday) {
      const totalMinutes = hour * 60 + minute;
      const lateThreshold = config.officeHours.start * 60 + config.officeHours.lateThresholdMinutes;
      if (totalMinutes > lateThreshold) {
        status = 'LATE';
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: today,
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

    const today = startOfOrgDay();

    const openSession = await prisma.attendance.findFirst({
      where: { employeeId, date: today, timeOut: null },
      orderBy: { timeIn: 'desc' },
    });

    if (!openSession) {
      return error(res, 'No open clock-in session found for today', 400);
    }

    const now = new Date();

    // Half day reflects this particular session's length, not the whole
    // day — an employee back for a short emergency shift after already
    // completing a full session earlier shouldn't have that earlier
    // session's status overwritten.
    const hoursWorked = (now.getTime() - openSession.timeIn!.getTime()) / (1000 * 60 * 60);
    let status = openSession.status;
    if (hoursWorked < 4) {
      status = 'HALF_DAY';
    }

    const attendance = await prisma.attendance.update({
      where: { id: openSession.id },
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
    const today = startOfOrgDay();

    // The most recent session for today, open or closed — this is what the
    // app's dashboard uses to decide whether to show "Clock In" (no session
    // yet, or the latest one is already closed) or "Clock Out" (latest
    // session still open).
    const attendance = await prisma.attendance.findFirst({
      where: { employeeId, date: today },
      orderBy: { timeIn: 'desc' },
    });

    return success(res, attendance);
  } catch (err) {
    next(err);
  }
}

export async function listAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 20, employeeId, startDate, endDate, status } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    // Role-based visibility. An `employeeId` filter is only ever honored
    // after confirming it falls within what the caller is allowed to see —
    // it can narrow scope, never widen it.
    if (req.user?.role === 'EMPLOYEE') {
      where.employeeId = req.user.id;
    } else if (req.user?.role === 'MANAGER') {
      if (employeeId) {
        const isDirectReport = await prisma.employee.findFirst({
          where: { id: employeeId, managerId: req.user.id },
          select: { id: true },
        });
        if (!isDirectReport) {
          return error(res, 'Employee not found in your team', 403);
        }
        where.employeeId = employeeId;
      } else {
        where.employee = { managerId: req.user.id, deletedAt: null };
      }
    } else if (employeeId) {
      // ADMIN / HR have unrestricted visibility
      where.employeeId = employeeId;
    }

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
        orderBy: [{ date: 'desc' }, { timeIn: 'desc' }],
      }),
      prisma.attendance.count({ where }),
    ]);

    return paginated(res, records, total, Number(page), Number(limit));
  } catch (err) {
    next(err);
  }
}
