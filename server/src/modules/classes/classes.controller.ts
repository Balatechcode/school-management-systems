/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { classesService } from './classes.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { ClassSchema } from '../../utils/validation.js';

export class ClassesController {
  async getAll(_req: Request, res: Response) {
    try {
      const classes = await classesService.getAll();
      return sendSuccess(res, classes);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const cls = await classesService.getById(req.params.id);
      if (!cls) return sendError(res, 'Class not found', 'NOT_FOUND', 404);
      return sendSuccess(res, cls);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const parsed = ClassSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
      }
      const created = await classesService.create(parsed.data, req);
      return sendSuccess(res, created, 'Class created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 'CREATE_ERROR', 400);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const updated = await classesService.update(req.params.id, req.body, req);
      return sendSuccess(res, updated, 'Class updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'UPDATE_ERROR', 400);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const result = await classesService.delete(req.params.id, req);
      return sendSuccess(res, result, result.message);
    } catch (err: any) {
      return sendError(res, err.message, 'DELETE_ERROR', 400);
    }
  }
}

export const classesController = new ClassesController();
