/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { attendanceService } from './attendance.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { MarkBulkAttendanceSchema, DeviceTapSchema } from '../../utils/validation.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';

export class AttendanceController {
  /**
   * GET /api/v1/attendance/register
   * Fetches active student roster for Class & Section on a specific date
   */
  async getRegister(req: Request, res: Response) {
    try {
      const classId = (req.query.class_id || req.query.classId) as string;
      const sectionId = (req.query.section_id || req.query.sectionId) as string;
      const date = ((req.query.date as string) || new Date().toISOString().split('T')[0]).trim();

      if (!classId || !sectionId) {
        return sendError(
          res,
          'Both class_id and section_id are required to load attendance register',
          'VALIDATION_ERROR',
          400
        );
      }

      const register = await attendanceService.getClassRegister(classId, sectionId, date);
      return sendSuccess(res, register);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * POST /api/v1/attendance/mark-bulk
   * Saves or updates entire class attendance in a single batch
   */
  async markBulk(req: Request, res: Response) {
    try {
      const parsed = MarkBulkAttendanceSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
      }

      const result = await attendanceService.markBulkAttendance(parsed.data as any, req);
      return sendSuccess(res, result, `Attendance saved for ${result.saved_count} students`, 200);
    } catch (err: any) {
      return sendError(res, err.message, 'MARK_ATTENDANCE_ERROR', 400);
    }
  }

  /**
   * POST /api/v1/attendance/device-tap
   * Hardware IoT endpoint for RFID turnstiles and biometric scanners
   */
  async deviceTap(req: Request, res: Response) {
    try {
      // 1. Verify Device API Key in Header or Body
      const deviceKey =
        (req.headers['x-device-api-key'] as string) ||
        (req.headers['x-api-key'] as string) ||
        (req.body.device_key as string);

      let expectedKey = 'educore-hw-key-2026';
      if (isUsingLiveSupabase() && supabaseAdmin) {
        const { data: settings } = await supabaseAdmin
          .from('school_settings')
          .select('device_api_key')
          .limit(1)
          .single();
        if (settings?.device_api_key) {
          expectedKey = settings.device_api_key;
        }
      }

      if (!deviceKey || deviceKey !== expectedKey) {
        return sendError(res, 'Unauthorized device: Invalid x-device-api-key header', 'UNAUTHORIZED_DEVICE', 401);
      }

      // 2. Validate Payload
      const parsed = DeviceTapSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
      }

      const result = await attendanceService.processDeviceTap(parsed.data as any);
      return sendSuccess(res, result, `Attendance recorded for ${result.student.name}`, 200);
    } catch (err: any) {
      return sendError(res, err.message, 'DEVICE_TAP_ERROR', 400);
    }
  }

  /**
   * GET /api/v1/attendance/student/:studentId
   * Returns individual student attendance history & percentages
   */
  async getStudentHistory(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

      const history = await attendanceService.getStudentHistory(studentId, month, year);
      return sendSuccess(res, history);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * GET /api/v1/attendance/stats/today
   * Returns high-level daily attendance stats across the whole school
   */
  async getDailyStats(req: Request, res: Response) {
    try {
      const date = ((req.query.date as string) || new Date().toISOString().split('T')[0]).trim();
      const stats = await attendanceService.getDailyStats(date);
      return sendSuccess(res, stats);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }
}

export const attendanceController = new AttendanceController();
