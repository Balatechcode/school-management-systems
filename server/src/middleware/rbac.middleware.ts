/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { RoleCode } from '../types/index.js';
import { sendError } from '../utils/response.js';

/**
 * Enforce that the authenticated user possesses at least one of the specified roles
 */
export function requireRole(...allowedRoles: RoleCode[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const userRoles = req.user.roles.map((r: { code: RoleCode }) => r.code);
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return sendError(
        res,
        `Forbidden: Requires one of [${allowedRoles.join(', ')}] role`,
        'FORBIDDEN',
        403
      );
    }

    return next();
  };
}

/**
 * Enforce that the authenticated user possesses the specified module.action permission.
 * Users with the ADMIN role automatically bypass permission checks.
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
    }

    // Admins always have access to all endpoints
    const isAdmin = req.user.roles.some((r: { code: RoleCode }) => r.code === 'ADMIN');
    if (isAdmin) {
      return next();
    }

    const userPermissions = new Set(req.user.permissions);
    const hasAll = requiredPermissions.every((perm) => userPermissions.has(perm));

    if (!hasAll) {
      return sendError(
        res,
        `Forbidden: Missing required permission [${requiredPermissions.join(', ')}]`,
        'FORBIDDEN',
        403
      );
    }

    return next();
  };
}
