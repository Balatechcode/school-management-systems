/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { isMissingTableError } from '../../utils/supabaseFallback.js';
import { Parent, StudentParentRelationship } from '../../types/index.js';
import { Request } from 'express';

export class ParentsService {
  async getAll(search?: string): Promise<Parent[]> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      let query = supabaseAdmin.from('parents').select('*').order('first_name');
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) {
        if (isMissingTableError(error)) {
          console.warn('Live Supabase table public.parents missing. Using in-memory store.');
        } else {
          throw new Error(error.message);
        }
      } else {
        return data || [];
      }
    }

    let list = memoryDb.parents;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q) ||
          p.phone.includes(q)
      );
    }
    return list;
  }

  async getById(id: string): Promise<Parent | null> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('parents').select('*').eq('id', id).single();
      if (error || !data) return null;
      return data;
    }
    return memoryDb.parents.find((p) => p.id === id) || null;
  }

  async create(payload: Omit<Parent, 'id' | 'created_at' | 'updated_at'>, req: Request): Promise<Parent> {
    const actor = req.user;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('parents')
        .insert([
          {
            first_name: payload.first_name.trim(),
            last_name: payload.last_name.trim(),
            phone: payload.phone.trim(),
            alternate_phone: payload.alternate_phone || null,
            email: payload.email || null,
            occupation: payload.occupation || null,
            address: payload.address || null,
            city: payload.city || null,
            state: payload.state || null,
            pincode: payload.pincode || null,
          },
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);

      await createAuditLog({
        userId: actor?.id,
        username: actor?.username,
        action: 'CREATE_PARENT',
        entityType: 'PARENT',
        entityId: data.id,
        newValues: payload,
        req,
      });

      return data;
    }

    const newParent: Parent = {
      id: `par-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryDb.parents.push(newParent);

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'CREATE_PARENT',
      entityType: 'PARENT',
      entityId: newParent.id,
      newValues: payload,
      req,
    });

    return newParent;
  }

  async update(id: string, payload: Partial<Parent>, req: Request): Promise<Parent> {
    const actor = req.user;
    const existing = await this.getById(id);
    if (!existing) throw new Error('Parent not found');

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('parents')
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
        action: 'UPDATE_PARENT',
        entityType: 'PARENT',
        entityId: id,
        oldValues: existing,
        newValues: payload,
        req,
      });

      return data;
    }

    const index = memoryDb.parents.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Parent not found');

    memoryDb.parents[index] = {
      ...memoryDb.parents[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'UPDATE_PARENT',
      entityType: 'PARENT',
      entityId: id,
      oldValues: existing,
      newValues: payload,
      req,
    });

    return memoryDb.parents[index];
  }

  // Student ↔ Parent Relationship Management
  async getStudentParents(studentId: string): Promise<(StudentParentRelationship & { parent: Parent })[]> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('student_parents')
        .select('*, parent:parent_id (*)')
        .eq('student_id', studentId);
      if (error) throw new Error(error.message);
      return data || [];
    }

    return memoryDb.studentParents
      .filter((sp) => sp.student_id === studentId)
      .map((sp) => ({
        ...sp,
        parent: memoryDb.parents.find((p) => p.id === sp.parent_id)!,
      }))
      .filter((sp) => Boolean(sp.parent));
  }

  async linkStudentParent(
    studentId: string,
    parentId: string,
    details: {
      relationship: string;
      is_primary?: boolean;
      is_emergency?: boolean;
      can_pickup?: boolean;
    },
    req: Request
  ): Promise<StudentParentRelationship> {
    const actor = req.user;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('student_parents')
        .upsert([
          {
            student_id: studentId,
            parent_id: parentId,
            relationship: details.relationship,
            is_primary: details.is_primary ?? false,
            is_emergency: details.is_emergency ?? false,
            can_pickup: details.can_pickup ?? true,
          },
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);

      await createAuditLog({
        userId: actor?.id,
        username: actor?.username,
        action: 'LINK_STUDENT_PARENT',
        entityType: 'STUDENT_PARENT',
        entityId: `${studentId}:${parentId}`,
        newValues: { student_id: studentId, parent_id: parentId, ...details },
        req,
      });

      return data;
    }

    const existingIdx = memoryDb.studentParents.findIndex(
      (sp) => sp.student_id === studentId && sp.parent_id === parentId
    );
    const rel: StudentParentRelationship = {
      student_id: studentId,
      parent_id: parentId,
      relationship: details.relationship,
      is_primary: details.is_primary ?? false,
      is_emergency: details.is_emergency ?? false,
      can_pickup: details.can_pickup ?? true,
      created_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      memoryDb.studentParents[existingIdx] = rel;
    } else {
      memoryDb.studentParents.push(rel);
    }

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'LINK_STUDENT_PARENT',
      entityType: 'STUDENT_PARENT',
      entityId: `${studentId}:${parentId}`,
      newValues: { student_id: studentId, parent_id: parentId, ...details },
      req,
    });

    return rel;
  }

  async unlinkStudentParent(studentId: string, parentId: string, req: Request): Promise<{ unlinked: boolean }> {
    const actor = req.user;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('student_parents')
        .delete()
        .eq('student_id', studentId)
        .eq('parent_id', parentId);

      if (error) throw new Error(error.message);
    } else {
      memoryDb.studentParents = memoryDb.studentParents.filter(
        (sp) => !(sp.student_id === studentId && sp.parent_id === parentId)
      );
    }

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'UNLINK_STUDENT_PARENT',
      entityType: 'STUDENT_PARENT',
      entityId: `${studentId}:${parentId}`,
      req,
    });

    return { unlinked: true };
  }
}

export const parentsService = new ParentsService();
