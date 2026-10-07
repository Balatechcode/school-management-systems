/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { memoryDb, isUsingLiveSupabase } from '../../db/store.js';
import { ENV } from '../../config/env.js';

export class AuthController {
  async getStatus(_req: Request, res: Response) {
    try {
      const adminStatus = await authService.checkAdminStatus();
      return sendSuccess(res, {
        isSupabaseConfigured: ENV.isSupabaseConfigured(),
        supabaseUrl: ENV.SUPABASE_URL ? `${ENV.SUPABASE_URL.substring(0, 15)}...` : null,
        adminStatus,
      });
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'User not authenticated', 'UNAUTHORIZED', 401);
      }
      return sendSuccess(res, req.user);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async syncProfile(req: Request, res: Response) {
    try {
      // SECURITY: identity comes from the verified token, never from the request body.
      // Body-supplied authUserId / role would let a user act as someone else or self-assign roles.
      if (!req.user) {
        return sendError(res, 'User not authenticated', 'UNAUTHORIZED', 401);
      }

      const authUserId = req.user.auth_user_id;
      const email = req.user.email;
      if (!authUserId || !email) {
        // Demo/in-memory users have no Supabase auth identity; nothing to sync.
        return sendSuccess(res, req.user, 'User profile synchronized');
      }

      // Strip any client-supplied role so it can never grant privileges.
      const { role: _ignoredRole, ...safeMetadata } = (req.body?.metadata ?? {}) as Record<string, any>;

      const user = await authService.syncUserProfile(authUserId, email, safeMetadata);
      return sendSuccess(res, user, 'User profile synchronized');
    } catch (err: any) {
      return sendError(res, err.message, 'SYNC_ERROR', 400);
    }
  }

  async initialAdminSetup(req: Request, res: Response) {
    try {
      const { username, email, password, first_name, last_name, phone } = req.body;

      if (!username || !email || !password || !first_name || !last_name) {
        return sendError(res, 'All required fields must be filled', 'VALIDATION_ERROR', 400);
      }

      if (password.length < 8) {
        return sendError(res, 'Password must be at least 8 characters long', 'VALIDATION_ERROR', 400);
      }

      const result = await authService.setupInitialAdmin(
        { username, email, password, first_name, last_name, phone },
        req
      );

      return sendSuccess(res, result, 'Administrator successfully created', 201);
    } catch (err: any) {
      return sendError(res, err.message, 'SETUP_FAILED', 400);
    }
  }

  async logout(req: Request, res: Response) {
    try {
      if (req.user) {
        await createAuditLog({
          userId: req.user.id,
          username: req.user.username,
          action: 'LOGOUT',
          entityType: 'SESSION',
          entityId: req.user.id,
          req,
        });
      }
      return sendSuccess(res, { loggedOut: true }, 'Successfully logged out');
    } catch (err: any) {
      return sendError(res, err.message, 'LOGOUT_ERROR', 500);
    }
  }

  async demoLogin(req: Request, res: Response) {
    try {
      // SECURITY: demo login only exists for local in-memory demo mode.
      if (isUsingLiveSupabase() || ENV.NODE_ENV === 'production') {
        return sendError(res, 'Demo login is disabled', 'FORBIDDEN', 403);
      }

      const { username } = req.body;
      const targetUser = memoryDb.users.find((u) => u.username === username);

      if (!targetUser) {
        return sendError(res, `Demo user '${username}' not found`, 'NOT_FOUND', 404);
      }

      const token = `demo-${targetUser.username}-token`;
      return sendSuccess(res, {
        token,
        user: targetUser,
      }, `Logged in as ${targetUser.first_name} (${targetUser.username})`);
    } catch (err: any) {
      return sendError(res, err.message, 'LOGIN_ERROR', 500);
    }
  }
}

export const authController = new AuthController();
