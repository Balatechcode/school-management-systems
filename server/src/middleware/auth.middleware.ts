/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../db/store.js';
import { sendError } from '../utils/response.js';
import { AuthUserProfile } from '../types/index.js';
import { ENV } from '../config/env.js';

// Extend Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserProfile;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token required', 'UNAUTHORIZED', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(res, 'Invalid authorization format', 'UNAUTHORIZED', 401);
    }

    const isDemoToken = token.startsWith('demo-');

    // SECURITY: demo / in-memory tokens are only valid in local demo mode.
    // They must never authenticate when live Supabase is configured or in production.
    const demoAuthAllowed = !isUsingLiveSupabase() && ENV.NODE_ENV !== 'production';
    if (isDemoToken && !demoAuthAllowed) {
      return sendError(res, 'Invalid or expired authentication session', 'UNAUTHORIZED', 401);
    }

    // Live Supabase Authentication Flow (for real Supabase JWT tokens)
    if (!isDemoToken && isUsingLiveSupabase() && supabaseAdmin) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData.user) {
        return sendError(res, 'Invalid or expired authentication session', 'UNAUTHORIZED', 401);
      }

      const authUserId = authData.user.id;

      // 1. Fetch user profile from public.users table
      const { data: dbUser, error: dbUserError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .is('deleted_at', null)
        .single();

      if (dbUserError || !dbUser) {
        return sendError(res, 'User record not found or profile deactivated', 'UNAUTHORIZED', 401);
      }

      if (dbUser.status !== 'ACTIVE') {
        return sendError(res, 'User account is not active', 'FORBIDDEN', 403);
      }

      // 2. Fetch assigned roles
      const { data: userRoleMappings, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('role_id, roles (*)')
        .eq('user_id', dbUser.id);

      if (rolesError) {
        return sendError(res, 'Error loading user security roles', 'INTERNAL_SERVER_ERROR', 500);
      }

      const roles = (userRoleMappings || [])
        .map((ur: any) => ur.roles)
        .filter(Boolean);

      const roleIds = roles.map((r: any) => r.id);

      // 3. Fetch permissions for all assigned roles
      let permissions: string[] = [];
      if (roleIds.length > 0) {
        const { data: rolePerms, error: permsError } = await supabaseAdmin
          .from('role_permissions')
          .select('permission_id, permissions (*)')
          .in('role_id', roleIds);

        if (!permsError && rolePerms) {
          const permSet = new Set<string>();
          rolePerms.forEach((rp: any) => {
            if (rp.permissions) {
              permSet.add(`${rp.permissions.module}.${rp.permissions.action}`);
            }
          });
          permissions = Array.from(permSet);
        }
      }

      req.user = {
        ...dbUser,
        email: authData.user.email,
        roles,
        permissions,
      };

      return next();
    }

    // Local / Demo Store Fallback Flow (local development only)
    if (!demoAuthAllowed) {
      return sendError(res, 'Invalid or expired authentication session', 'UNAUTHORIZED', 401);
    }

    // Supports demo token format (e.g. "demo-admin-token", "demo-principal-token") or exact user id
    let foundUser = memoryDb.users.find(
      (u) => u.id === token || `demo-${u.username}-token` === token
    );

    // Generic demo tokens map to fixed demo users
    if (!foundUser) {
      if (token === 'demo-token') {
        foundUser = memoryDb.users.find((u) => u.username === 'admin');
      }
    }

    if (!foundUser || foundUser.status !== 'ACTIVE' || foundUser.deleted_at) {
      return sendError(res, 'Invalid or expired session', 'UNAUTHORIZED', 401);
    }

    // Resolve roles and permissions from memoryDb
    const userRoles = memoryDb.roles.filter((r) => foundUser!.role_ids.includes(r.id));
    const roleIdSet = new Set(userRoles.map((r) => r.id));
    const permissionIds = memoryDb.rolePermissions
      .filter((rp) => roleIdSet.has(rp.role_id))
      .map((rp) => rp.permission_id);
    
    const permissionKeys = memoryDb.permissions
      .filter((p) => permissionIds.includes(p.id))
      .map((p) => `${p.module}.${p.action}`);

    req.user = {
      ...foundUser,
      roles: userRoles,
      permissions: permissionKeys,
    };

    return next();
  } catch (error: any) {
    console.error('authenticateToken error:', error);
    return sendError(res, 'Authentication verification failed', 'UNAUTHORIZED', 401);
  }
}
