/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { enrollmentsService } from './enrollments.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class EnrollmentsController {
  async updateEnrollment(req: Request, res: Response) {
    try {
      const updated = await enrollmentsService.updateEnrollment(req.params.id, req.body, req);
      return sendSuccess(res, updated, 'Enrollment updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'UPDATE_ERROR', 400);
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { status, promotion_status } = req.body;
      if (!['ACTIVE', 'PROMOTED', 'TRANSFERRED', 'COMPLETED', 'CANCELLED'].includes(status)) {
        return sendError(res, 'Invalid enrollment status', 'VALIDATION_ERROR', 400);
      }
      const updated = await enrollmentsService.updateStatus(req.params.id, status, promotion_status, req);
      return sendSuccess(res, updated, `Enrollment status updated to ${status}`);
    } catch (err: any) {
      return sendError(res, err.message, 'STATUS_ERROR', 400);
    }
  }

  async promoteStudent(req: Request, res: Response) {
    try {
      const { student_id, current_enrollment_id, academic_year_id, class_id, section_id, roll_number, promotion_status } = req.body;

      if (!student_id || !current_enrollment_id || !academic_year_id || !class_id || !section_id || !roll_number) {
        return sendError(res, 'All promotion parameters are required', 'VALIDATION_ERROR', 400);
      }

      const result = await enrollmentsService.promoteStudent(
        student_id,
        current_enrollment_id,
        {
          academic_year_id,
          class_id,
          section_id,
          roll_number,
          promotion_status,
        },
        req
      );

      return sendSuccess(res, result, 'Student promoted to new academic year successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'PROMOTION_ERROR', 400);
    }
  }
}

export const enrollmentsController = new EnrollmentsController();
