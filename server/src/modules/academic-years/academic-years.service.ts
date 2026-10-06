/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { isMissingTableError } from '../../utils/supabaseFallback.js';
import { AcademicYear, AcademicYearStatus } from '../../types/index.js';
import { Request } from 'express';

export class AcademicYearsService {
  async getAll(): Promise<AcademicYear[]> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) {
        if (isMissingTableError(error)) {
          console.warn('Live Supabase table public.academic_years missing. Using in-memory store.');
        } else {
          throw new Error(error.message);
        }
      } else {
        return data || [];
      }
    }
    return [...memoryDb.academicYears].sort((a, b) => b.start_date.localeCompare(a.start_date));
  }

  async getById(id: string): Promise<AcademicYear | null> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('academic_years')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        if (!isMissingTableError(error)) return null;
      } else {
        return data;
      }
    }
    return memoryDb.academicYears.find((ay) => ay.id === id) || null;
  }

  async getCurrent(): Promise<AcademicYear | null> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('academic_years')
        .select('*')
        .eq('is_current', true)
        .single();
      if (error || !data) {
        if (!isMissingTableError(error)) return null;
      } else {
        return data;
      }
    }
    return memoryDb.academicYears.find((ay) => ay.is_current) || null;
  }

  async create(payload: Omit<AcademicYear, 'id' | 'created_at' | 'updated_at'>, req: Request): Promise<AcademicYear> {
    const actor = req.user;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      // If setting as current, reset existing current
      if (payload.is_current) {
        await supabaseAdmin
          .from('academic_years')
          .update({ is_current: false })
          .eq('is_current', true);
      }

      const { data, error } = await supabaseAdmin
        .from('academic_years')
        .insert([
          {
            name: payload.name.trim(),
            start_date: payload.start_date,
            end_date: payload.end_date,
            is_current: payload.is_current ?? false,
            status: payload.status ?? 'ACTIVE',
          },
        ])
        .select()
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          console.warn('Live Supabase table public.academic_years missing. Falling back to in-memory store.');
        } else {
          throw new Error(error.message);
        }
      } else {
        await createAuditLog({
          userId: actor?.id,
          username: actor?.username,
          action: 'CREATE_ACADEMIC_YEAR',
          entityType: 'ACADEMIC_YEAR',
          entityId: data.id,
          newValues: payload,
          req,
        });

        return data;
      }
    }

    // Memory Store
    if (payload.is_current) {
      memoryDb.academicYears.forEach((ay) => {
        ay.is_current = false;
      });
    }

    const newAy: AcademicYear = {
      id: `ay-${Date.now()}`,
      name: payload.name.trim(),
      start_date: payload.start_date,
      end_date: payload.end_date,
      is_current: payload.is_current ?? false,
      status: payload.status ?? 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryDb.academicYears.unshift(newAy);

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'CREATE_ACADEMIC_YEAR',
      entityType: 'ACADEMIC_YEAR',
      entityId: newAy.id,
      newValues: payload,
      req,
    });

    return newAy;
  }

  async update(id: string, payload: Partial<AcademicYear>, req: Request): Promise<AcademicYear> {
    const actor = req.user;
    const existing = await this.getById(id);
    if (!existing) throw new Error('Academic year not found');

    if (isUsingLiveSupabase() && supabaseAdmin) {
      if (payload.is_current) {
        await supabaseAdmin
          .from('academic_years')
          .update({ is_current: false })
          .eq('is_current', true);
      }

      const { data, error } = await supabaseAdmin
        .from('academic_years')
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
        action: 'UPDATE_ACADEMIC_YEAR',
        entityType: 'ACADEMIC_YEAR',
        entityId: id,
        oldValues: existing,
        newValues: payload,
        req,
      });

      return data;
    }

    // Memory Store
    const index = memoryDb.academicYears.findIndex((ay) => ay.id === id);
    if (index === -1) throw new Error('Academic year not found');

    if (payload.is_current) {
      memoryDb.academicYears.forEach((ay) => {
        ay.is_current = false;
      });
    }

    memoryDb.academicYears[index] = {
      ...memoryDb.academicYears[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'UPDATE_ACADEMIC_YEAR',
      entityType: 'ACADEMIC_YEAR',
      entityId: id,
      oldValues: existing,
      newValues: payload,
      req,
    });

    return memoryDb.academicYears[index];
  }

  async updateStatus(id: string, status: AcademicYearStatus, req: Request): Promise<AcademicYear> {
    return this.update(id, { status }, req);
  }

  async delete(id: string, req: Request): Promise<{ deleted: boolean; message: string }> {
    const actor = req.user;
    // Check if enrollments exist
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { count } = await supabaseAdmin
        .from('student_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('academic_year_id', id);

      if (count && count > 0) {
        throw new Error('Cannot delete academic year: active enrollments exist. Please archive it instead.');
      }

      const { error } = await supabaseAdmin.from('academic_years').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const hasEnrollments = memoryDb.studentEnrollments.some((e) => e.academic_year_id === id);
      if (hasEnrollments) {
        throw new Error('Cannot delete academic year: active enrollments exist. Please archive it instead.');
      }
      memoryDb.academicYears = memoryDb.academicYears.filter((ay) => ay.id !== id);
    }

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'DELETE_ACADEMIC_YEAR',
      entityType: 'ACADEMIC_YEAR',
      entityId: id,
      req,
    });

    return { deleted: true, message: 'Academic year removed' };
  }
}

export const academicYearsService = new AcademicYearsService();
