/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/status', (req, res) => authController.getStatus(req, res));
router.post('/initial-admin', (req, res) => authController.initialAdminSetup(req, res));
router.post('/demo-login', (req, res) => authController.demoLogin(req, res));

// Protected routes
router.get('/me', authenticateToken, (req, res) => authController.getMe(req, res));
router.post('/profile', authenticateToken, (req, res) => authController.syncProfile(req, res));
router.post('/logout', authenticateToken, (req, res) => authController.logout(req, res));

export default router;
