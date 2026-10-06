/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../db/store.js';
import { AuditLog } from '../types/index.js';

export interface CreateAuditLogParams {
  userId?: string | null;
  username?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  req?: Request;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Redact confidential secrets before saving to audit log
function sanitizeValues(obj?: any): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object') return null;
  const sensitiveKeys = [
    'password',
    'password_hash',
    'token',
    'access_token',
    'refresh_token',
    'secret',
    'service_role_key',
    'api_key',
  ];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeValues(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Valid UUID v4 / UUID format helper
function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const ipAddress =
      params.ipAddress ||
      (params.req
        ? (params.req.headers['x-forwarded-for'] as string) || params.req.socket.remoteAddress || null
        : null);
    const userAgent =
      params.userAgent ||
      (params.req ? params.req.headers['user-agent'] || null : null);

    // Only assign user_id if it's a valid UUID matching the public.users(id) schema
    const validUserId = isValidUuid(params.userId) ? params.userId : null;

    // Preserve actor username in new_values if user_id is null or not linked
    const newValuesMerged = {
      ...(params.newValues || {}),
      ...(params.username ? { _actor_username: params.username } : {}),
    };

    // Database payload conforming strictly to public.audit_logs columns:
    // (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
    // Note: 'username' is NOT a column in the database table.
    const dbPayload = {
      user_id: validUserId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ? String(params.entityId).substring(0, 100) : null,
      old_values: sanitizeValues(params.oldValues),
      new_values: sanitizeValues(newValuesMerged),
      ip_address: ipAddress ? String(ipAddress).substring(0, 50) : null,
      user_agent: userAgent ? String(userAgent).substring(0, 500) : null,
      created_at: new Date().toISOString(),
    };

    // Always keep in memory store as fallback / cache
    const memoryEntry: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      username: params.username || null,
      ...dbPayload,
    };
    memoryDb.auditLogs.unshift(memoryEntry);

    // If connected to live Supabase, persist to database
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { error } = await supabaseAdmin.from('audit_logs').insert([dbPayload]);

      if (error) {
        // If error is foreign key violation on user_id, retry with user_id = null
        if (
          error.message?.includes('foreign key') ||
          error.details?.includes('foreign key') ||
          error.code === '23503'
        ) {
          const retryPayload = { ...dbPayload, user_id: null };
          const { error: retryError } = await supabaseAdmin.from('audit_logs').insert([retryPayload]);
          if (retryError) {
            console.warn('Audit log retry without user_id failed:', retryError.message);
          }
        } else {
          console.warn('Supabase audit log notice:', error.message || error);
        }
      }
    }
  } catch (err) {
    console.error('Audit log processing error:', err);
  }
}
