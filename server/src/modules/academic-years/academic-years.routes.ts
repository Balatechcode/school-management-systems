/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { academicYearsController } from './academic-years.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = Router();

router.get('/', authenticateToken, (req, res) => academicYearsController.getAll(req, res));
router.get('/:id', authenticateToken, (req, res) => academicYearsController.getById(req, res));

router.post('/', authenticateToken, requirePermission('academic_years.create'), (req, res) =>
  academicYearsController.create(req, res)
);

router.put('/:id', authenticateToken, requirePermission('academic_years.update'), (req, res) =>
  academicYearsController.update(req, res)
);

router.patch('/:id/status', authenticateToken, requirePermission('academic_years.update'), (req, res) =>
  academicYearsController.updateStatus(req, res)
);

router.delete('/:id', authenticateToken, requirePermission('academic_years.delete'), (req, res) =>
  academicYearsController.delete(req, res)
);

export default router;
