import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import * as authService from '../services/auth.service.js';
import * as auditService from '../services/audit.service.js';
import { success, error } from '../utils/apiResponse.js';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, deviceId, deviceModel } = req.body;

    const employee = await prisma.employee.findUnique({ where: { email } });
    if (!employee || employee.deletedAt) {
      await auditService.createAuditLog({
        action: 'LOGIN_FAILED',
        details: { email, reason: 'user_not_found' },
        ipAddress: auditService.getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
      return error(res, 'Invalid credentials', 401);
    }

    const valid = await authService.comparePassword(password, employee.passwordHash);
    if (!valid) {
      await auditService.createAuditLog({
        userId: employee.id,
        action: 'LOGIN_FAILED',
        details: { reason: 'wrong_password' },
        ipAddress: auditService.getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
      return error(res, 'Invalid credentials', 401);
    }

    if (!employee.isActive) {
      return error(res, 'Account is deactivated. Contact admin.', 403);
    }

    // Device binding check
    if (deviceId && employee.registeredDeviceId) {
      if (employee.registeredDeviceId !== deviceId) {
        return error(
          res,
          'This account is bound to another device. Contact admin to reset.',
          403
        );
      }
    }

    // Bind device on first login with device info
    if (deviceId && !employee.registeredDeviceId) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          registeredDeviceId: deviceId,
          deviceBoundAt: new Date(),
          deviceModel: deviceModel || null,
        },
      });
    }

    const tokenPayload = { id: employee.id, email: employee.email, role: employee.role };
    const accessToken = authService.generateAccessToken(tokenPayload);
    const refreshToken = authService.generateRefreshToken(tokenPayload);

    // Store hashed refresh token
    await prisma.employee.update({
      where: { id: employee.id },
      data: { refreshTokenHash: authService.hashRefreshToken(refreshToken) },
    });

    await auditService.createAuditLog({
      userId: employee.id,
      action: 'LOGIN',
      details: { deviceId, deviceModel },
      ipAddress: auditService.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return success(res, {
      accessToken,
      refreshToken,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeCode: employee.employeeCode,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: token } = req.body;

    const decoded = authService.verifyRefreshToken(token);
    const employee = await prisma.employee.findUnique({ where: { id: decoded.id } });

    if (!employee || employee.deletedAt || !employee.refreshTokenHash) {
      return error(res, 'Invalid refresh token', 401);
    }

    // Verify the refresh token hash matches
    const tokenHash = authService.hashRefreshToken(token);
    if (tokenHash !== employee.refreshTokenHash) {
      // Token reuse detected - invalidate all tokens
      await prisma.employee.update({
        where: { id: employee.id },
        data: { refreshTokenHash: null },
      });
      return error(res, 'Token reuse detected. Please login again.', 401);
    }

    const tokenPayload = { id: employee.id, email: employee.email, role: employee.role };
    const newAccessToken = authService.generateAccessToken(tokenPayload);
    const newRefreshToken = authService.generateRefreshToken(tokenPayload);

    // Rotate refresh token
    await prisma.employee.update({
      where: { id: employee.id },
      data: { refreshTokenHash: authService.hashRefreshToken(newRefreshToken) },
    });

    return success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return error(res, 'Invalid or expired refresh token', 401);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, phone, department, designation, employeeCode } = req.body;

    const passwordHash = await authService.hashPassword(password);

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        department,
        designation,
        employeeCode,
      },
    });

    await auditService.createAuditLog({
      userId: req.user?.id,
      action: 'EMPLOYEE_CREATED',
      targetType: 'employee',
      targetId: employee.id,
      ipAddress: auditService.getClientIp(req),
    });

    return success(res, {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      employeeCode: employee.employeeCode,
    }, 201);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        phone: true,
        department: true,
        designation: true,
        role: true,
        isActive: true,
        registeredDeviceId: true,
        createdAt: true,
      },
    });

    if (!employee) {
      return error(res, 'User not found', 404);
    }

    return success(res, employee);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { oldPassword, newPassword } = req.body;

    const employee = await prisma.employee.findUnique({ where: { id: req.user!.id } });
    if (!employee) {
      return error(res, 'User not found', 404);
    }

    const valid = await authService.comparePassword(oldPassword, employee.passwordHash);
    if (!valid) {
      return error(res, 'Current password is incorrect', 400);
    }

    const newHash = await authService.hashPassword(newPassword);
    await prisma.employee.update({
      where: { id: employee.id },
      data: { passwordHash: newHash, refreshTokenHash: null },
    });

    return success(res, { message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function resetDevice(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId } = req.body;

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        registeredDeviceId: null,
        deviceBoundAt: null,
        deviceModel: null,
      },
    });

    await auditService.createAuditLog({
      userId: req.user?.id,
      action: 'DEVICE_RESET',
      targetType: 'employee',
      targetId: employeeId,
      ipAddress: auditService.getClientIp(req),
    });

    return success(res, { message: 'Device binding reset successfully' });
  } catch (err) {
    next(err);
  }
}
