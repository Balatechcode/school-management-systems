/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { isMissingTableError } from '../../utils/supabaseFallback.js';
import { Section } from '../../types/index.js';
import { Request } from 'express';

export class SectionsService {
  async getAll(): Promise<Section[]> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('sections')
        .select('*')
        .order('code', { ascending: true });
      if (error) {
        if (isMissingTableError(error)) {
          console.warn('Live Supabase table public.sections missing. Using in-memory store.');
        } else {
          throw new Error(error.message);
        }
      } else {
        return data || [];
      }
    }
    return [...memoryDb.sections].sort((a, b) => a.code.localeCompare(b.code));
  }

  async getById(id: string): Promise<Section | null> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('sections')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        if (!isMissingTableError(error)) return null;
      } else {
        return data;
      }
    }
    return memoryDb.sections.find((s) => s.id === id) || null;
  }

  async create(payload: Omit<Section, 'id' | 'created_at' | 'updated_at'>, req: Request): Promise<Section> {
    const actor = req.user;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('sections')
        .insert([
          {
            name: payload.name.trim(),
            code: payload.code.trim().toUpperCase(),
            capacity: payload.capacity,
          },
        ])
        .select()
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          console.warn('Live Supabase table public.sections missing. Falling back to in-memory store.');
        } else {
          throw new Error(error.message);
        }
      } else {
        await createAuditLog({
          userId: actor?.id,
          username: actor?.username,
          action: 'CREATE_SECTION',
          entityType: 'SECTION',
          entityId: data.id,
          newValues: payload,
          req,
        });

        return data;
      }
    }

    const newSec: Section = {
      id: `sec-${Date.now()}`,
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      capacity: payload.capacity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryDb.sections.push(newSec);

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'CREATE_SECTION',
      entityType: 'SECTION',
      entityId: newSec.id,
      newValues: payload,
      req,
    });

    return newSec;
  }

  async update(id: string, payload: Partial<Section>, req: Request): Promise<Section> {
    const actor = req.user;
    const existing = await this.getById(id);
    if (!existing) throw new Error('Section not found');

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('sections')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await createAuditLog({
        userId: actor?.id,
        username: actor?.username,
        action: 'UPDATE_SECTION',
        entityType: 'SECTION',
        entityId: id,
        oldValues: existing,
        newValues: payload,
        req,
      });

      return data;
    }

    const index = memoryDb.sections.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Section not found');

    memoryDb.sections[index] = {
      ...memoryDb.sections[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'UPDATE_SECTION',
      entityType: 'SECTION',
      entityId: id,
      oldValues: existing,
      newValues: payload,
      req,
    });

    return memoryDb.sections[index];
  }

  async delete(id: string, req: Request): Promise<{ deleted: boolean; message: string }> {
    const actor = req.user;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { count } = await supabaseAdmin
        .from('student_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', id);

      if (count && count > 0) {
        throw new Error('Cannot delete section: active enrollments exist for this section.');
      }

      const { error } = await supabaseAdmin.from('sections').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const hasEnrollments = memoryDb.studentEnrollments.some((e) => e.section_id === id);
      if (hasEnrollments) {
        throw new Error('Cannot delete section: active enrollments exist for this section.');
      }
      memoryDb.sections = memoryDb.sections.filter((s) => s.id !== id);
    }

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'DELETE_SECTION',
      entityType: 'SECTION',
      entityId: id,
      req,
    });

    return { deleted: true, message: 'Section deleted successfully' };
  }
}

export const sectionsService = new SectionsService();
