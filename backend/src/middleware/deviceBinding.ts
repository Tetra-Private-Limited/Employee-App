import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

// Device binding is set at login (Employee.registeredDeviceId) but was never
// actually checked again afterwards — a leaked access/refresh token pair
// could clock in or upload locations from any device, not just the one it
// was issued to. This re-checks the bound device on the endpoints that
// accept a deviceId in the body.
//
// An employee with no registered device yet passes through unchecked —
// binding itself is login's responsibility, not this middleware's.
export async function verifyDeviceBinding(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
      select: { registeredDeviceId: true },
    });

    if (employee?.registeredDeviceId) {
      const deviceId = req.body?.deviceId;
      if (!deviceId || deviceId !== employee.registeredDeviceId) {
        return res.status(403).json({
          success: false,
          error: 'This account is bound to another device. Contact admin to reset.',
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}
