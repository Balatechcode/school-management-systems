/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { classesController } from './classes.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = Router();

router.get('/', authenticateToken, (req, res) => classesController.getAll(req, res));
router.get('/:id', authenticateToken, (req, res) => classesController.getById(req, res));

router.post('/', authenticateToken, requirePermission('classes.create'), (req, res) =>
  classesController.create(req, res)
);

router.put('/:id', authenticateToken, requirePermission('classes.update'), (req, res) =>
  classesController.update(req, res)
);

router.delete('/:id', authenticateToken, requirePermission('classes.delete'), (req, res) =>
  classesController.delete(req, res)
);

export default router;
