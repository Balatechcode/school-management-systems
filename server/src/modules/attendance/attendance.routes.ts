/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { attendanceController } from './attendance.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = Router();

// 1. Hardware IoT Tap Endpoint (RFID card readers / Biometric machines)
// Authenticated via x-device-api-key header in controller
router.post('/device-tap', (req, res) => attendanceController.deviceTap(req, res));
router.post('/rfid-tap', (req, res) => attendanceController.deviceTap(req, res));

// 2. Class Register Roll Call
router.get(
  '/register',
  authenticateToken,
  requirePermission('attendance.read'),
  (req, res) => attendanceController.getRegister(req, res)
);

// 3. Save / Update Bulk Attendance for Classroom
router.post(
  '/mark-bulk',
  authenticateToken,
  requirePermission('attendance.create'),
  (req, res) => attendanceController.markBulk(req, res)
);

// 4. Daily Attendance Statistics for Dashboard
router.get(
  '/stats/today',
  authenticateToken,
  requirePermission('attendance.read'),
  (req, res) => attendanceController.getDailyStats(req, res)
);

// 5. Individual Student Attendance History
router.get(
  '/student/:studentId',
  authenticateToken,
  requirePermission('attendance.read'),
  (req, res) => attendanceController.getStudentHistory(req, res)
);

export default router;
