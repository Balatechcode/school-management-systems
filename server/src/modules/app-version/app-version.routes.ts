/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { appVersionController } from './app-version.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = Router();

// Public: Mobile app checks version on startup/resume
router.get('/check-update', (req, res) => appVersionController.checkUpdate(req, res));
router.get('/version', (req, res) => appVersionController.checkUpdate(req, res));

// Admin: Configure versioning rules & force update trigger
router.get('/settings', authenticateToken, requirePermission('settings.read'), (req, res) =>
  appVersionController.getSettings(req, res)
);
router.put('/settings/:platform', authenticateToken, requirePermission('settings.update'), (req, res) =>
  appVersionController.updateSettings(req, res)
);

export default router;
