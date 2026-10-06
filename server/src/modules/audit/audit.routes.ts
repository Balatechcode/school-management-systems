/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

router.get(
  '/',
  authenticateToken,
  requirePermission('audit_logs.read'),
  async (_req: Request, res: Response) => {
    try {
      if (isUsingLiveSupabase() && supabaseAdmin) {
        // First try selecting with joined user info
        const { data, error } = await supabaseAdmin
          .from('audit_logs')
          .select('*, users:user_id (username, first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          const formatted = data.map((log: any) => ({
            ...log,
            username: log.users?.username || log.new_values?._actor_username || log.username || null,
          }));
          return sendSuccess(res, formatted);
        }

        // Fallback: standard select without join
        const { data: simpleData, error: simpleError } = await supabaseAdmin
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!simpleError && simpleData) {
          const formatted = simpleData.map((log: any) => ({
            ...log,
            username: log.new_values?._actor_username || log.username || null,
          }));
          return sendSuccess(res, formatted);
        }

        // If database read encounters an issue, return cached memory logs
        return sendSuccess(res, memoryDb.auditLogs.slice(0, 100));
      }

      return sendSuccess(res, memoryDb.auditLogs.slice(0, 100));
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }
);

export default router;
