/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { sectionsController } from './sections.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = Router();

router.get('/', authenticateToken, (req, res) => sectionsController.getAll(req, res));
router.get('/:id', authenticateToken, (req, res) => sectionsController.getById(req, res));

router.post('/', authenticateToken, requirePermission('sections.create'), (req, res) =>
  sectionsController.create(req, res)
);

router.put('/:id', authenticateToken, requirePermission('sections.update'), (req, res) =>
  sectionsController.update(req, res)
);

router.delete('/:id', authenticateToken, requirePermission('sections.delete'), (req, res) =>
  sectionsController.delete(req, res)
);

export default router;
