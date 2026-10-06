/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { rolesController } from './roles.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = Router();

router.get('/', authenticateToken, (req, res) => rolesController.getRoles(req, res));
router.get('/permissions', authenticateToken, (req, res) => rolesController.getPermissions(req, res));
router.get('/:id/permissions', authenticateToken, (req, res) => rolesController.getRolePermissions(req, res));
router.put('/:id/permissions', authenticateToken, requirePermission('users.manage_roles'), (req, res) =>
  rolesController.updateRolePermissions(req, res)
);

export default router;
