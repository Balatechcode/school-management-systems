/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { Request } from 'express';

export class RolesService {
  async getRoles() {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('roles').select('*').order('name');
      if (error) throw new Error(error.message);
      return data;
    }
    return memoryDb.roles;
  }

  async getPermissions() {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('action', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    }
    return memoryDb.permissions;
  }

  async getRolePermissions(roleId: string) {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('role_permissions')
        .select('permission_id, permissions (*)')
        .eq('role_id', roleId);
      if (error) throw new Error(error.message);
      return (data || []).map((item: any) => item.permissions).filter(Boolean);
    }

    const permissionIds = memoryDb.rolePermissions
      .filter((rp) => rp.role_id === roleId)
      .map((rp) => rp.permission_id);

    return memoryDb.permissions.filter((p) => permissionIds.includes(p.id));
  }

  async updateRolePermissions(roleId: string, permissionIds: string[], req: Request) {
    const actor = req.user;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      await supabaseAdmin.from('role_permissions').delete().eq('role_id', roleId);
      if (permissionIds.length > 0) {
        const mappings = permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid }));
        const { error } = await supabaseAdmin.from('role_permissions').insert(mappings);
        if (error) throw new Error(error.message);
      }

      await createAuditLog({
        userId: actor?.id,
        username: actor?.username,
        action: 'UPDATE_ROLE_PERMISSIONS',
        entityType: 'ROLE',
        entityId: roleId,
        newValues: { permission_count: permissionIds.length },
        req,
      });

      return this.getRolePermissions(roleId);
    }

    // Local DB
    memoryDb.rolePermissions = memoryDb.rolePermissions.filter((rp) => rp.role_id !== roleId);
    permissionIds.forEach((pid) => {
      memoryDb.rolePermissions.push({ role_id: roleId, permission_id: pid });
    });

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'UPDATE_ROLE_PERMISSIONS',
      entityType: 'ROLE',
      entityId: roleId,
      newValues: { permission_count: permissionIds.length },
      req,
    });

    return this.getRolePermissions(roleId);
  }
}

export const rolesService = new RolesService();
