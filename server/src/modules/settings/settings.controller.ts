/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { settingsService } from './settings.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class SettingsController {
  async getSettings(_req: Request, res: Response) {
    try {
      const settings = await settingsService.getSettings();
      return sendSuccess(res, settings);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async updateSettings(req: Request, res: Response) {
    try {
      const updated = await settingsService.updateSettings(req.body, req);
      return sendSuccess(res, updated, 'School settings saved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'UPDATE_ERROR', 400);
    }
  }
}

export const settingsController = new SettingsController();
