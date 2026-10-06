/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { sectionsService } from './sections.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { SectionSchema } from '../../utils/validation.js';

export class SectionsController {
  async getAll(_req: Request, res: Response) {
    try {
      const sections = await sectionsService.getAll();
      return sendSuccess(res, sections);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const sec = await sectionsService.getById(req.params.id);
      if (!sec) return sendError(res, 'Section not found', 'NOT_FOUND', 404);
      return sendSuccess(res, sec);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const parsed = SectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
      }
      const created = await sectionsService.create(parsed.data, req);
      return sendSuccess(res, created, 'Section created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 'CREATE_ERROR', 400);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const updated = await sectionsService.update(req.params.id, req.body, req);
      return sendSuccess(res, updated, 'Section updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'UPDATE_ERROR', 400);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const result = await sectionsService.delete(req.params.id, req);
      return sendSuccess(res, result, result.message);
    } catch (err: any) {
      return sendError(res, err.message, 'DELETE_ERROR', 400);
    }
  }
}

export const sectionsController = new SectionsController();
