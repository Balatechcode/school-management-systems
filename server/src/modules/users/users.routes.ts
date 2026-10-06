/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { usersController } from './users.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = Router();

// Current user endpoints
router.get('/me', authenticateToken, (req, res) => usersController.getMe(req, res));
router.get('/me/roles', authenticateToken, (req, res) => usersController.getMyRoles(req, res));
router.get('/me/permissions', authenticateToken, (req, res) => usersController.getMyPermissions(req, res));

// User management endpoints protected by RBAC
router.get('/', authenticateToken, requirePermission('users.read'), (req, res) =>
  usersController.getAllUsers(req, res)
);

router.get('/:id', authenticateToken, requirePermission('users.read'), (req, res) =>
  usersController.getUserById(req, res)
);

router.post('/', authenticateToken, requirePermission('users.create'), (req, res) =>
  usersController.createUser(req, res)
);

router.put('/:id', authenticateToken, requirePermission('users.update'), (req, res) =>
  usersController.updateUser(req, res)
);

router.delete('/:id', authenticateToken, requirePermission('users.delete'), (req, res) =>
  usersController.deleteUser(req, res)
);

router.post('/:id/roles', authenticateToken, requirePermission('users.manage_roles'), (req, res) =>
  usersController.assignRoles(req, res)
);

export default router;
