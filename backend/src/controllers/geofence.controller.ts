import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { success, error } from '../utils/apiResponse.js';
import * as auditService from '../services/audit.service.js';
import { haversineDistance, isInsideGeofence } from '../services/location.service.js';
import { config } from '../config/index.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const geofences = await prisma.geofence.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { employeeGeofences: true } },
      },
    });

    return success(res, geofences);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const geofence = await prisma.geofence.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        employeeGeofences: {
          include: {
            employee: {
              select: { id: true, name: true, employeeCode: true },
            },
          },
        },
      },
    });

    if (!geofence) {
      return error(res, 'Geofence not found', 404);
    }

    return success(res, geofence);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, latitude, longitude, radiusMeters, type } = req.body;

    const geofence = await prisma.geofence.create({
      data: { name, latitude, longitude, radiusMeters, type },
    });

    await auditService.createAuditLog({
      userId: req.user?.id,
      action: 'GEOFENCE_CREATED',
      targetType: 'geofence',
      targetId: geofence.id,
      details: { name, type },
      ipAddress: auditService.getClientIp(req),
    });

    return success(res, geofence, 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const geofence = await prisma.geofence.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await auditService.createAuditLog({
      userId: req.user?.id,
      action: 'GEOFENCE_UPDATED',
      targetType: 'geofence',
      targetId: geofence.id,
      details: req.body,
      ipAddress: auditService.getClientIp(req),
    });

    return success(res, geofence);
  } catch (err) {
    next(err);
  }
}

export async function softDelete(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.geofence.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await auditService.createAuditLog({
      userId: req.user?.id,
      action: 'GEOFENCE_DELETED',
      targetType: 'geofence',
      targetId: req.params.id,
      ipAddress: auditService.getClientIp(req),
    });

    return success(res, { message: 'Geofence deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function assignEmployees(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeIds } = req.body;
    const geofenceId = req.params.id;

    // Verify geofence exists
    const geofence = await prisma.geofence.findFirst({
      where: { id: geofenceId, deletedAt: null },
    });
    if (!geofence) {
      return error(res, 'Geofence not found', 404);
    }

    // Upsert assignments
    for (const employeeId of employeeIds) {
      await prisma.employeeGeofence.upsert({
        where: {
          employeeId_geofenceId: { employeeId, geofenceId },
        },
        create: { employeeId, geofenceId },
        update: {},
      });
    }

    return success(res, { message: `Assigned ${employeeIds.length} employees to geofence` });
  } catch (err) {
    next(err);
  }
}

export async function checkLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const geofence = await prisma.geofence.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });

    if (!geofence) {
      return error(res, 'Geofence not found', 404);
    }

    const { latitude, longitude } = req.query as any;
    const inside = isInsideGeofence(
      Number(latitude),
      Number(longitude),
      Number(geofence.latitude),
      Number(geofence.longitude),
      geofence.radiusMeters
    );

    return success(res, { inside });
  } catch (err) {
    next(err);
  }
}

export async function checkMyGeofences(req: Request, res: Response, next: NextFunction) {
  try {
    const employeeId = req.user?.id;
    const { latitude, longitude } = req.query as any;
    const lat = Number(latitude);
    const lon = Number(longitude);

    const assignments = await prisma.employeeGeofence.findMany({
      where: {
        employeeId,
        geofence: {
          deletedAt: null,
          isActive: true,
        },
      },
      include: {
        geofence: true,
      },
    });

    const geofences = assignments.map(({ geofence }) => {
      const distanceMeters = Math.round(
        haversineDistance(lat, lon, Number(geofence.latitude), Number(geofence.longitude))
      );
      const inside = distanceMeters <= geofence.radiusMeters;

      return {
        id: geofence.id,
        name: geofence.name,
        type: geofence.type,
        latitude: Number(geofence.latitude),
        longitude: Number(geofence.longitude),
        radiusMeters: geofence.radiusMeters,
        distanceMeters,
        inside,
      };
    });

    const insideAnyGeofence = geofences.some((item) => item.inside);

    return success(res, {
      policy: config.geofence.enforcementPolicy,
      hasAssignedGeofences: geofences.length > 0,
      insideAnyGeofence,
      geofences,
    });
  } catch (err) {
    next(err);
  }
}
