/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { SchoolSettings } from '../../types/index.js';
import { Request } from 'express';

export class SettingsService {
  async getSettings(): Promise<SchoolSettings> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('school_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        throw new Error(`Failed to load school settings: ${error.message}`);
      }
      return data;
    }

    return memoryDb.schoolSettings;
  }

  async updateSettings(payload: Partial<SchoolSettings>, req: Request): Promise<SchoolSettings> {
    const actor = req.user;
    const current = await this.getSettings();

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { id, created_at, ...updates } = payload;
      const { data, error } = await supabaseAdmin
        .from('school_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update school settings: ${error.message}`);
      }

      await createAuditLog({
        userId: actor?.id,
        username: actor?.username,
        action: 'UPDATE_SCHOOL_SETTINGS',
        entityType: 'SCHOOL_SETTINGS',
        entityId: current.id,
        oldValues: current as any,
        newValues: updates as any,
        req,
      });

      return data;
    }

    // Local DB
    memoryDb.schoolSettings = {
      ...memoryDb.schoolSettings,
      ...payload,
      updated_at: new Date().toISOString(),
    };

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'UPDATE_SCHOOL_SETTINGS',
      entityType: 'SCHOOL_SETTINGS',
      entityId: memoryDb.schoolSettings.id,
      oldValues: current as any,
      newValues: payload as any,
      req,
    });

    return memoryDb.schoolSettings;
  }
}

export const settingsService = new SettingsService();
