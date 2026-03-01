import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import * as authService from '../services/auth.service.js';
import * as auditService from '../services/audit.service.js';
import { success, error, paginated } from '../utils/apiResponse.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 20, search, department, role, isActive } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { deletedAt: null };

    // Role-based visibility: managers see only their department
    if (req.user?.role === 'MANAGER') {
      const manager = await prisma.employee.findUnique({ where: { id: req.user.id } });
      if (manager?.department) {
        where.department = manager.department;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    // Only allow department filter override for non-managers (managers are restricted to their own department)
    if (department && req.user?.role !== 'MANAGER') where.department = department;
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          employeeCode: true,
          name: true,
          email: true,
          phone: true,
          department: true,
          designation: true,
          role: true,
          isActive: true,
          registeredDeviceId: true,
          deviceModel: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.employee.count({ where }),
    ]);

    return paginated(res, employees, total, Number(page), Number(limit));
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        designation: true,
        role: true,
        isActive: true,
        registeredDeviceId: true,
        deviceModel: true,
        deviceBoundAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            attendance: true,
            locationRecords: true,
            spoofingAlerts: true,
          },
        },
      },
    });

    if (!employee) {
      return error(res, 'Employee not found', 404);
    }

    return success(res, employee);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, phone, department, designation, employeeCode, role } = req.body;

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
        role: role || 'EMPLOYEE',
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
      role: employee.role,
    }, 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.employee.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) {
      return error(res, 'Employee not found', 404);
    }

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: req.body,
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
      },
    });

    await auditService.createAuditLog({
      userId: req.user?.id,
      action: 'EMPLOYEE_UPDATED',
      targetType: 'employee',
      targetId: employee.id,
      details: req.body,
      ipAddress: auditService.getClientIp(req),
    });

    return success(res, employee);
  } catch (err) {
    next(err);
  }
}

export async function softDelete(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.employee.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await auditService.createAuditLog({
      userId: req.user?.id,
      action: 'EMPLOYEE_DELETED',
      targetType: 'employee',
      targetId: req.params.id,
      ipAddress: auditService.getClientIp(req),
    });

    return success(res, { message: 'Employee deleted successfully' });
  } catch (err) {
    next(err);
  }
}
