/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { parentsService } from './parents.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { ParentSchema } from '../../utils/validation.js';

export class ParentsController {
  async getAll(req: Request, res: Response) {
    try {
      const search = req.query.search as string;
      const parents = await parentsService.getAll(search);
      return sendSuccess(res, parents);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const parent = await parentsService.getById(req.params.id);
      if (!parent) return sendError(res, 'Parent not found', 'NOT_FOUND', 404);
      return sendSuccess(res, parent);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const parsed = ParentSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
      }
      const created = await parentsService.create(parsed.data as any, req);
      return sendSuccess(res, created, 'Parent registered successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 'CREATE_ERROR', 400);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const updated = await parentsService.update(req.params.id, req.body, req);
      return sendSuccess(res, updated, 'Parent updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'UPDATE_ERROR', 400);
    }
  }
}

export const parentsController = new ParentsController();
