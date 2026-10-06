/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { settingsController } from './settings.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = Router();

router.get('/', authenticateToken, (req, res) => settingsController.getSettings(req, res));
router.put('/', authenticateToken, requirePermission('settings.update'), (req, res) =>
  settingsController.updateSettings(req, res)
);

export default router;
