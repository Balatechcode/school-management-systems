/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { academicYearsService } from './academic-years.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { AcademicYearSchema } from '../../utils/validation.js';

export class AcademicYearsController {
  async getAll(_req: Request, res: Response) {
    try {
      const years = await academicYearsService.getAll();
      return sendSuccess(res, years);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const year = await academicYearsService.getById(req.params.id);
      if (!year) return sendError(res, 'Academic year not found', 'NOT_FOUND', 404);
      return sendSuccess(res, year);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const parsed = AcademicYearSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
      }
      const created = await academicYearsService.create(parsed.data as any, req);
      return sendSuccess(res, created, 'Academic year created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 'CREATE_ERROR', 400);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const updated = await academicYearsService.update(req.params.id, req.body, req);
      return sendSuccess(res, updated, 'Academic year updated');
    } catch (err: any) {
      return sendError(res, err.message, 'UPDATE_ERROR', 400);
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      if (!['ACTIVE', 'ARCHIVED', 'UPCOMING'].includes(status)) {
        return sendError(res, 'Invalid status', 'VALIDATION_ERROR', 400);
      }
      const updated = await academicYearsService.updateStatus(req.params.id, status, req);
      return sendSuccess(res, updated, `Status changed to ${status}`);
    } catch (err: any) {
      return sendError(res, err.message, 'STATUS_ERROR', 400);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const result = await academicYearsService.delete(req.params.id, req);
      return sendSuccess(res, result, result.message);
    } catch (err: any) {
      return sendError(res, err.message, 'DELETE_ERROR', 400);
    }
  }
}

export const academicYearsController = new AcademicYearsController();
