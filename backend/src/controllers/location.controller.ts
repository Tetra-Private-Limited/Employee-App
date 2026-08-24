import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { success, error, paginated } from '../utils/apiResponse.js';
import * as spoofingService from '../services/spoofing.service.js';
import { RECENT_LOCATION_WINDOW_HOURS } from '../utils/constants.js';

interface PrevLocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  provider: string | null;
  isMock: boolean;
  satelliteCount: number | null;
  snrAverage: number | null;
  accelerometerX: number | null;
  accelerometerY: number | null;
  accelerometerZ: number | null;
  recordedAt: Date;
}

export async function batchUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const { locations, deviceId, integrityToken } = req.body;
    const employeeId = req.user!.id;

    // A device that's been offline syncs a backlog of old points in one
    // batch. Processing them in chronological order — and comparing each
    // one only to the point immediately before it in time — is what makes
    // "impossible travel" detection meaningful. The previous version always
    // compared against whatever row was newest in the table, which for a
    // backlogged batch is often hours away from the point being scored and
    // produced false IMPOSSIBLE_TRAVEL alerts. This also replaces a
    // per-location DB query with a single lookup before the loop.
    const orderedLocations = [...locations].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    const lastSyncedRecord = await prisma.locationRecord.findFirst({
      where: { employeeId },
      orderBy: { recordedAt: 'desc' },
    });

    let prevData: PrevLocationData | null = lastSyncedRecord
      ? {
          latitude: Number(lastSyncedRecord.latitude),
          longitude: Number(lastSyncedRecord.longitude),
          accuracy: lastSyncedRecord.accuracy,
          speed: lastSyncedRecord.speed,
          provider: lastSyncedRecord.provider,
          isMock: lastSyncedRecord.isMock,
          satelliteCount: lastSyncedRecord.satelliteCount,
          snrAverage: lastSyncedRecord.snrAverage,
          accelerometerX: lastSyncedRecord.accelerometerX,
          accelerometerY: lastSyncedRecord.accelerometerY,
          accelerometerZ: lastSyncedRecord.accelerometerZ,
          recordedAt: lastSyncedRecord.recordedAt,
        }
      : null;

    const records = [];
    for (const loc of orderedLocations) {
      const recordedAt = new Date(loc.recordedAt);

      // Only trust prevData as a genuine "previous point" if it actually
      // precedes this one — guards against a stray out-of-order record
      // (e.g. two overlapping sync calls) poisoning the comparison.
      const effectivePrev = prevData && prevData.recordedAt.getTime() < recordedAt.getTime() ? prevData : null;

      const riskResult = spoofingService.computeRiskScore(
        {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          speed: loc.speed,
          provider: loc.provider,
          isMock: loc.isMock || false,
          satelliteCount: loc.satelliteCount,
          snrAverage: loc.snrAverage,
          accelerometerX: loc.accelerometerX,
          accelerometerY: loc.accelerometerY,
          accelerometerZ: loc.accelerometerZ,
          recordedAt,
        },
        effectivePrev
      );

      const record = await prisma.locationRecord.create({
        data: {
          employeeId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          altitude: loc.altitude,
          speed: loc.speed,
          bearing: loc.bearing,
          provider: loc.provider,
          isMock: loc.isMock || false,
          batteryLevel: loc.batteryLevel,
          deviceId: deviceId || loc.deviceId,
          satelliteCount: loc.satelliteCount,
          snrAverage: loc.snrAverage,
          accelerometerX: loc.accelerometerX,
          accelerometerY: loc.accelerometerY,
          accelerometerZ: loc.accelerometerZ,
          riskScore: riskResult.riskScore,
          recordedAt,
          syncedAt: new Date(),
        },
      });

      // Create alerts if risk detected
      if (riskResult.alerts.length > 0) {
        await spoofingService.analyzeAndSaveAlerts(employeeId, record.id, riskResult);
      }

      records.push(record);

      // This location becomes "previous" for the next one in the batch.
      prevData = {
        latitude: Number(record.latitude),
        longitude: Number(record.longitude),
        accuracy: record.accuracy,
        speed: record.speed,
        provider: record.provider,
        isMock: record.isMock,
        satelliteCount: record.satelliteCount,
        snrAverage: record.snrAverage,
        accelerometerX: record.accelerometerX,
        accelerometerY: record.accelerometerY,
        accelerometerZ: record.accelerometerZ,
        recordedAt: record.recordedAt,
      };
    }

    return success(res, { synced: records.length }, 201);
  } catch (err) {
    next(err);
  }
}

export async function getRecentLocations(req: Request, res: Response, next: NextFunction) {
  try {
    // Most recent location per employee, looking back RECENT_LOCATION_WINDOW_HOURS.
    // Deliberately not tied to clock-in/out status: the device keeps reporting
    // in the background after clock-out, and a clocked-out employee should
    // stay visible on this list rather than disappear as soon as they clock out.
    const windowStart = new Date(Date.now() - RECENT_LOCATION_WINDOW_HOURS * 60 * 60 * 1000);

    const where: any = { recordedAt: { gte: windowStart } };
    if (req.user?.role === 'MANAGER') {
      where.employee = { managerId: req.user.id };
    }

    const locations = await prisma.locationRecord.findMany({
      where,
      distinct: ['employeeId'],
      orderBy: { recordedAt: 'desc' },
      include: {
        employee: {
          select: { id: true, name: true, employeeCode: true },
        },
      },
    });

    const result = locations.map((loc) => ({
      employeeId: loc.employeeId,
      employeeName: loc.employee.name,
      employeeCode: loc.employee.employeeCode,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      accuracy: loc.accuracy,
      speed: loc.speed,
      batteryLevel: loc.batteryLevel,
      recordedAt: loc.recordedAt.toISOString(),
    }));

    return success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getEmployeeRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId, startDate, endDate, limit = 500 } = req.query as any;

    if (!employeeId || !startDate || !endDate) {
      return error(res, 'employeeId, startDate, and endDate are required', 400);
    }

    if (req.user?.role === 'MANAGER') {
      const isDirectReport = await prisma.employee.findFirst({
        where: { id: employeeId, managerId: req.user.id },
        select: { id: true },
      });
      if (!isDirectReport) {
        return error(res, 'Employee not found in your team', 403);
      }
    }

    const locations = await prisma.locationRecord.findMany({
      where: {
        employeeId,
        recordedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      take: Number(limit),
      orderBy: { recordedAt: 'asc' },
    });

    const result = locations.map((loc) => ({
      ...loc,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
    }));

    return success(res, result);
  } catch (err) {
    next(err);
  }
}
