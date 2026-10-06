/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { rolesService } from './roles.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class RolesController {
  async getRoles(_req: Request, res: Response) {
    try {
      const roles = await rolesService.getRoles();
      return sendSuccess(res, roles);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async getPermissions(_req: Request, res: Response) {
    try {
      const perms = await rolesService.getPermissions();
      return sendSuccess(res, perms);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async getRolePermissions(req: Request, res: Response) {
    try {
      const perms = await rolesService.getRolePermissions(req.params.id);
      return sendSuccess(res, perms);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async updateRolePermissions(req: Request, res: Response) {
    try {
      const { permission_ids } = req.body;
      if (!Array.isArray(permission_ids)) {
        return sendError(res, 'permission_ids must be an array', 'VALIDATION_ERROR', 400);
      }
      const updated = await rolesService.updateRolePermissions(req.params.id, permission_ids, req);
      return sendSuccess(res, updated, 'Role permissions updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'UPDATE_ERROR', 400);
    }
  }
}

export const rolesController = new RolesController();
