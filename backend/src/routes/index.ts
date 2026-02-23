import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate, validateQuery } from '../middleware/validate.js';

// Validators
import { loginSchema, registerSchema, changePasswordSchema, refreshTokenSchema } from '../validators/auth.validator.js';
import { createEmployeeSchema, updateEmployeeSchema, resetDeviceSchema, employeeQuerySchema } from '../validators/employee.validator.js';
import { timeInSchema, timeOutSchema, attendanceQuerySchema } from '../validators/attendance.validator.js';
import { locationBatchSchema, locationQuerySchema } from '../validators/location.validator.js';
import { createGeofenceSchema, updateGeofenceSchema, assignGeofenceSchema, checkGeofenceSchema } from '../validators/geofence.validator.js';

// Controllers
import * as authCtrl from '../controllers/auth.controller.js';
import * as employeeCtrl from '../controllers/employee.controller.js';
import * as attendanceCtrl from '../controllers/attendance.controller.js';
import * as locationCtrl from '../controllers/location.controller.js';
import * as geofenceCtrl from '../controllers/geofence.controller.js';
import * as reportCtrl from '../controllers/report.controller.js';

const router = Router();

// ─── Auth Routes ─────────────────────────────────────────
router.post('/auth/login', validate(loginSchema), authCtrl.login);
router.post('/auth/register', validate(registerSchema), authCtrl.register);
router.post('/auth/refresh', validate(refreshTokenSchema), authCtrl.refreshToken);
router.get('/auth/me', authenticate, authCtrl.me);
router.post('/auth/change-password', authenticate, validate(changePasswordSchema), authCtrl.changePassword);
router.post('/auth/reset-device', authenticate, authorize('ADMIN'), validate(resetDeviceSchema), authCtrl.resetDevice);

// ─── Employee Routes ─────────────────────────────────────
router.get('/employees', authenticate, authorize('ADMIN', 'MANAGER'), employeeCtrl.list);
router.get('/employees/:id', authenticate, employeeCtrl.getById);
router.post('/employees', authenticate, authorize('ADMIN'), validate(createEmployeeSchema), employeeCtrl.create);
router.put('/employees/:id', authenticate, authorize('ADMIN'), validate(updateEmployeeSchema), employeeCtrl.update);
router.delete('/employees/:id', authenticate, authorize('ADMIN'), employeeCtrl.softDelete);

// ─── Attendance Routes ───────────────────────────────────
router.post('/attendance/time-in', authenticate, validate(timeInSchema), attendanceCtrl.timeIn);
router.post('/attendance/time-out', authenticate, validate(timeOutSchema), attendanceCtrl.timeOut);
router.get('/attendance/today', authenticate, attendanceCtrl.getToday);
router.get('/attendance', authenticate, attendanceCtrl.listAttendance);

// ─── Location Routes ─────────────────────────────────────
router.post('/locations/batch', authenticate, validate(locationBatchSchema), locationCtrl.batchUpload);
router.get('/locations/recent', authenticate, authorize('ADMIN', 'MANAGER'), locationCtrl.getRecentLocations);
router.get('/locations/route', authenticate, authorize('ADMIN', 'MANAGER'), locationCtrl.getEmployeeRoute);

// ─── Geofence Routes ─────────────────────────────────────
router.get('/geofences', authenticate, authorize('ADMIN', 'MANAGER'), geofenceCtrl.list);
router.get('/geofences/:id', authenticate, authorize('ADMIN', 'MANAGER'), geofenceCtrl.getById);
router.post('/geofences', authenticate, authorize('ADMIN'), validate(createGeofenceSchema), geofenceCtrl.create);
router.put('/geofences/:id', authenticate, authorize('ADMIN'), validate(updateGeofenceSchema), geofenceCtrl.update);
router.delete('/geofences/:id', authenticate, authorize('ADMIN'), geofenceCtrl.softDelete);
router.post('/geofences/:id/assign', authenticate, authorize('ADMIN'), validate(assignGeofenceSchema), geofenceCtrl.assignEmployees);
router.get('/geofences/:id/check', authenticate, geofenceCtrl.checkLocation);

// ─── Report Routes ───────────────────────────────────────
router.get('/reports/dashboard', authenticate, authorize('ADMIN', 'MANAGER'), reportCtrl.getDashboardStats);
router.get('/reports/attendance', authenticate, authorize('ADMIN', 'MANAGER'), reportCtrl.getAttendanceReport);
router.get('/reports/attendance/export', authenticate, authorize('ADMIN', 'MANAGER'), reportCtrl.exportAttendanceCsv);
router.get('/reports/alerts/recent', authenticate, authorize('ADMIN', 'MANAGER'), reportCtrl.getRecentAlerts);
router.get('/reports/movement/:employeeId', authenticate, authorize('ADMIN', 'MANAGER'), reportCtrl.getFieldMovement);

export default router;
