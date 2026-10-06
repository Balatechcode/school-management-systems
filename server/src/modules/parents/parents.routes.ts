/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { parentsController } from './parents.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = Router();

router.get('/', authenticateToken, requirePermission('parents.read'), (req, res) =>
  parentsController.getAll(req, res)
);

router.get('/:id', authenticateToken, requirePermission('parents.read'), (req, res) =>
  parentsController.getById(req, res)
);

router.post('/', authenticateToken, requirePermission('parents.create'), (req, res) =>
  parentsController.create(req, res)
);

router.put('/:id', authenticateToken, requirePermission('parents.update'), (req, res) =>
  parentsController.update(req, res)
);

export default router;
