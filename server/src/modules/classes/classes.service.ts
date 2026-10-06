/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { isMissingTableError } from '../../utils/supabaseFallback.js';
import { SchoolClass } from '../../types/index.js';
import { Request } from 'express';

export class ClassesService {
  async getAll(): Promise<SchoolClass[]> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('classes')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) {
        if (isMissingTableError(error)) {
          console.warn('Live Supabase table public.classes missing. Using in-memory store.');
        } else {
          throw new Error(error.message);
        }
      } else {
        return data || [];
      }
    }
    return [...memoryDb.classes].sort((a, b) => a.display_order - b.display_order);
  }

  async getById(id: string): Promise<SchoolClass | null> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        if (!isMissingTableError(error)) return null;
      } else {
        return data;
      }
    }
    return memoryDb.classes.find((c) => c.id === id) || null;
  }

  async create(payload: Omit<SchoolClass, 'id' | 'created_at' | 'updated_at'>, req: Request): Promise<SchoolClass> {
    const actor = req.user;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('classes')
        .insert([
          {
            name: payload.name.trim(),
            code: payload.code.trim().toUpperCase(),
            display_order: payload.display_order,
          },
        ])
        .select()
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          console.warn('Live Supabase table public.classes missing. Falling back to in-memory store.');
        } else {
          throw new Error(error.message);
        }
      } else {
        await createAuditLog({
          userId: actor?.id,
          username: actor?.username,
          action: 'CREATE_CLASS',
          entityType: 'CLASS',
          entityId: data.id,
          newValues: payload,
          req,
        });

        return data;
      }
    }

    // Memory Store
    const newClass: SchoolClass = {
      id: `cls-${Date.now()}`,
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      display_order: payload.display_order,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryDb.classes.push(newClass);

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'CREATE_CLASS',
      entityType: 'CLASS',
      entityId: newClass.id,
      newValues: payload,
      req,
    });

    return newClass;
  }

  async update(id: string, payload: Partial<SchoolClass>, req: Request): Promise<SchoolClass> {
    const actor = req.user;
    const existing = await this.getById(id);
    if (!existing) throw new Error('Class not found');

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('classes')
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
        action: 'UPDATE_CLASS',
        entityType: 'CLASS',
        entityId: id,
        oldValues: existing,
        newValues: payload,
        req,
      });

      return data;
    }

    const index = memoryDb.classes.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Class not found');

    memoryDb.classes[index] = {
      ...memoryDb.classes[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'UPDATE_CLASS',
      entityType: 'CLASS',
      entityId: id,
      oldValues: existing,
      newValues: payload,
      req,
    });

    return memoryDb.classes[index];
  }

  async delete(id: string, req: Request): Promise<{ deleted: boolean; message: string }> {
    const actor = req.user;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { count } = await supabaseAdmin
        .from('student_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', id);

      if (count && count > 0) {
        throw new Error('Cannot delete class: historical student enrollments exist for this class.');
      }

      const { error } = await supabaseAdmin.from('classes').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const hasEnrollments = memoryDb.studentEnrollments.some((e) => e.class_id === id);
      if (hasEnrollments) {
        throw new Error('Cannot delete class: historical student enrollments exist for this class.');
      }
      memoryDb.classes = memoryDb.classes.filter((c) => c.id !== id);
    }

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'DELETE_CLASS',
      entityType: 'CLASS',
      entityId: id,
      req,
    });

    return { deleted: true, message: 'Class deleted successfully' };
  }
}

export const classesService = new ClassesService();
