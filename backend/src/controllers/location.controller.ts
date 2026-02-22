import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { success, error, paginated } from '../utils/apiResponse.js';
import * as spoofingService from '../services/spoofing.service.js';

export async function batchUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const { locations, deviceId, integrityToken } = req.body;
    const employeeId = req.user!.id;

    const records = [];
    for (const loc of locations) {
      // Get previous record for impossible travel detection
      const previousRecord = await prisma.locationRecord.findFirst({
        where: { employeeId },
        orderBy: { recordedAt: 'desc' },
      });

      const prevData = previousRecord
        ? {
            latitude: Number(previousRecord.latitude),
            longitude: Number(previousRecord.longitude),
            accuracy: previousRecord.accuracy,
            speed: previousRecord.speed,
            provider: previousRecord.provider,
            isMock: previousRecord.isMock,
            satelliteCount: previousRecord.satelliteCount,
            snrAverage: previousRecord.snrAverage,
            accelerometerX: previousRecord.accelerometerX,
            accelerometerY: previousRecord.accelerometerY,
            accelerometerZ: previousRecord.accelerometerZ,
            recordedAt: previousRecord.recordedAt,
          }
        : null;

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
          recordedAt: new Date(loc.recordedAt),
        },
        prevData
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
          recordedAt: new Date(loc.recordedAt),
          syncedAt: new Date(),
        },
      });

      // Create alerts if risk detected
      if (riskResult.alerts.length > 0) {
        await spoofingService.analyzeAndSaveAlerts(employeeId, record.id, riskResult);
      }

      records.push(record);
    }

    return success(res, { synced: records.length }, 201);
  } catch (err) {
    next(err);
  }
}

export async function getRecentLocations(req: Request, res: Response, next: NextFunction) {
  try {
    // Get the most recent location for each employee (last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const locations = await prisma.locationRecord.findMany({
      where: {
        recordedAt: { gte: tenMinutesAgo },
      },
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
