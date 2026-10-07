/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { usersService } from './users.service.js';
import { sendSuccess, sendPaginated, sendError } from '../../utils/response.js';

export class UsersController {
  async getMe(req: Request, res: Response) {
    if (!req.user) return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
    return sendSuccess(res, req.user);
  }

  async getMyRoles(req: Request, res: Response) {
    if (!req.user) return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
    return sendSuccess(res, req.user.roles);
  }

  async getMyPermissions(req: Request, res: Response) {
    if (!req.user) return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
    return sendSuccess(res, req.user.permissions);
  }

  async getAllUsers(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
      const search = req.query.search as string;
      const status = req.query.status as any;
      const roleCode = req.query.roleCode as string;

      const { users, total } = await usersService.getAllUsers({ page, limit, search, status, roleCode });
      return sendPaginated(res, users, { page, limit, total });
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const user = await usersService.getUserById(req.params.id);
      if (!user) return sendError(res, 'User not found', 'NOT_FOUND', 404);
      return sendSuccess(res, user);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async createUser(req: Request, res: Response) {
    try {
      const { username, first_name, last_name, email, phone, profile_image, role_ids } = req.body;
      if (!username || !first_name || !last_name) {
        return sendError(res, 'Username, first name, and last name are required', 'VALIDATION_ERROR', 400);
      }

      const newUser = await usersService.createUser(
        { username, first_name, last_name, email, phone, profile_image, role_ids: role_ids || [] },
        req
      );
      return sendSuccess(res, newUser, 'User created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 'CREATE_ERROR', 400);
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const updated = await usersService.updateUser(req.params.id, req.body, req);
      return sendSuccess(res, updated, 'User updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'UPDATE_ERROR', 400);
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const result = await usersService.softDeleteUser(req.params.id, req);
      return sendSuccess(res, result, 'User deactivated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'DELETE_ERROR', 400);
    }
  }

  async assignRoles(req: Request, res: Response) {
    try {
      const { role_ids } = req.body;
      if (!Array.isArray(role_ids)) {
        return sendError(res, 'role_ids must be an array of UUIDs', 'VALIDATION_ERROR', 400);
      }

      const updated = await usersService.assignRoles(req.params.id, role_ids, req);
      return sendSuccess(res, updated, 'User roles updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'ASSIGN_ROLES_ERROR', 400);
    }
  }
}

export const usersController = new UsersController();
