/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { sendPaginated, sendError } from '../../utils/response.js';

const router = Router();

router.get(
  '/',
  authenticateToken,
  requirePermission('audit_logs.read'),
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
      const search = ((req.query.search as string) || '').trim();
      const offset = (page - 1) * limit;

      if (isUsingLiveSupabase() && supabaseAdmin) {
        // Query with joined user info and exact total count
        let query = supabaseAdmin
          .from('audit_logs')
          .select('*, users:user_id (username, first_name, last_name)', { count: 'exact' });

        if (search) {
          query = query.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%,ip_address.ilike.%${search}%`);
        }

        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (!error && data) {
          const formatted = data.map((log: any) => ({
            ...log,
            username: log.users?.username || log.new_values?._actor_username || log.username || null,
          }));
          return sendPaginated(res, formatted, { page, limit, total: count ?? data.length });
        }

        // Fallback: standard select without join
        let simpleQuery = supabaseAdmin
          .from('audit_logs')
          .select('*', { count: 'exact' });

        if (search) {
          simpleQuery = simpleQuery.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%,ip_address.ilike.%${search}%`);
        }

        const { data: simpleData, count: simpleCount, error: simpleError } = await simpleQuery
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (!simpleError && simpleData) {
          const formatted = simpleData.map((log: any) => ({
            ...log,
            username: log.new_values?._actor_username || log.username || null,
          }));
          return sendPaginated(res, formatted, { page, limit, total: simpleCount ?? simpleData.length });
        }
      }

      // Local In-Memory Fallback
      let filtered = [...memoryDb.auditLogs];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (l) =>
            l.action.toLowerCase().includes(q) ||
            l.entity_type.toLowerCase().includes(q) ||
            (l.username && l.username.toLowerCase().includes(q)) ||
            (l.ip_address && l.ip_address.includes(q))
        );
      }

      const total = filtered.length;
      const paged = filtered.slice(offset, offset + limit);
      return sendPaginated(res, paged, { page, limit, total });
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }
);

export default router;
