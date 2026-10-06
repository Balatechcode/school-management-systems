/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { enrollmentsController } from './enrollments.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = Router();

router.put('/:id', authenticateToken, requirePermission('enrollment.update'), (req, res) =>
  enrollmentsController.updateEnrollment(req, res)
);

router.patch('/:id/status', authenticateToken, requirePermission('enrollment.update'), (req, res) =>
  enrollmentsController.updateStatus(req, res)
);

router.post('/promote', authenticateToken, requirePermission('enrollment.update'), (req, res) =>
  enrollmentsController.promoteStudent(req, res)
);

export default router;
