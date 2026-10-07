/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { appVersionService } from './app-version.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { MobilePlatform } from '../../types/index.js';
import { createAuditLog } from '../../utils/auditLog.js';

export class AppVersionController {
  /**
   * Public endpoint called by mobile app on launch / resume.
   * Query: ?platform=android&current_version=1.0.0&build_number=10
   */
  async checkUpdate(req: Request, res: Response) {
    try {
      const platform = (req.query.platform as string)?.toLowerCase() as MobilePlatform;
      const currentVersion = (req.query.current_version as string) || (req.query.version as string) || '1.0.0';
      const buildNumber = parseInt(req.query.build_number as string, 10) || 1;

      if (!platform || !['android', 'ios'].includes(platform)) {
        return sendError(
          res,
          "Invalid or missing 'platform' parameter. Must be 'android' or 'ios'.",
          'VALIDATION_ERROR',
          400
        );
      }

      const result = await appVersionService.checkUpdate(platform, currentVersion, buildNumber);
      return sendSuccess(res, result, 'App version status checked successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'APP_VERSION_CHECK_ERROR', 500);
    }
  }

  /**
   * Admin endpoint to inspect mobile configuration for both platforms
   */
  async getSettings(_req: Request, res: Response) {
    try {
      const settings = await appVersionService.getAllSettings();
      return sendSuccess(res, settings);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Admin endpoint to update mobile version requirements (triggers force updates for older apps)
   */
  async updateSettings(req: Request, res: Response) {
    try {
      const platform = req.params.platform?.toLowerCase() as MobilePlatform;

      if (!['android', 'ios'].includes(platform)) {
        return sendError(res, "Platform must be 'android' or 'ios'", 'VALIDATION_ERROR', 400);
      }

      const allowedFields = [
        'min_supported_version',
        'latest_version',
        'min_build_number',
        'latest_build_number',
        'force_update_title',
        'force_update_message',
        'optional_update_title',
        'optional_update_message',
        'store_url',
        'maintenance_mode',
        'maintenance_message',
      ];

      const payload: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          payload[field] = req.body[field];
        }
      }

      const updated = await appVersionService.updateSettings(platform, payload);

      if (req.user) {
        await createAuditLog({
          userId: req.user.id,
          username: req.user.username,
          action: 'UPDATE_MOBILE_APP_SETTINGS',
          entityType: 'MOBILE_CONFIG',
          entityId: platform,
          newValues: payload,
          req,
        });
      }

      return sendSuccess(res, updated, `Successfully updated ${platform.toUpperCase()} mobile configuration`);
    } catch (err: any) {
      return sendError(res, err.message, 'UPDATE_FAILED', 400);
    }
  }
}

export const appVersionController = new AppVersionController();
