/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { User, UserStatus } from '../../types/index.js';
import { Request } from 'express';

export class UsersService {
  async getAllUsers(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: UserStatus;
      roleCode?: string;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 25));
    const offset = (page - 1) * limit;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      let query = supabaseAdmin
        .from('users')
        .select(
          `
          id, auth_user_id, username, first_name, last_name, phone, profile_image, status, last_login_at, created_at, updated_at, deleted_at,
          user_roles (
            role_id,
            roles (*)
          )
        `,
          { count: 'exact' }
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.search) {
        query = query.or(
          `first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,username.ilike.%${options.search}%`
        );
      }

      const { data, count, error } = await query.range(offset, offset + limit - 1);
      if (error) throw new Error(error.message);

      const users = (data || []).map((u: any) => ({
        ...u,
        roles: (u.user_roles || []).map((ur: any) => ur.roles).filter(Boolean),
      }));

      return {
        users,
        total: count ?? users.length,
      };
    }

    // Local Memory DB
    let result = memoryDb.users.filter((u) => !u.deleted_at);

    if (options.status) {
      result = result.filter((u) => u.status === options.status);
    }

    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.first_name.toLowerCase().includes(q) ||
          u.last_name.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q))
      );
    }

    const total = result.length;
    const paged = result.slice(offset, offset + limit);

    const users = paged.map((u) => {
      const roles = memoryDb.roles.filter((r) => u.role_ids.includes(r.id));
      return {
        ...u,
        roles,
      };
    });

    return {
      users,
      total,
    };
  }

  async getUserById(id: string) {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          user_roles (
            role_id,
            roles (*)
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !data) return null;

      return {
        ...data,
        roles: (data.user_roles || []).map((ur: any) => ur.roles).filter(Boolean),
      };
    }

    const user = memoryDb.users.find((u) => u.id === id && !u.deleted_at);
    if (!user) return null;

    const roles = memoryDb.roles.filter((r) => user.role_ids.includes(r.id));
    return { ...user, roles };
  }

  async createUser(payload: {
    username: string;
    email?: string;
    first_name: string;
    last_name: string;
    phone?: string;
    profile_image?: string;
    role_ids: string[];
  }, req: Request) {
    const actor = req.user;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      // 1. Insert user
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert([
          {
            username: payload.username.trim().toLowerCase(),
            first_name: payload.first_name.trim(),
            last_name: payload.last_name.trim(),
            phone: payload.phone?.trim() || null,
            profile_image: payload.profile_image || null,
            status: 'ACTIVE',
          },
        ])
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      // 2. Associate roles
      if (payload.role_ids && payload.role_ids.length > 0) {
        const roleMappings = payload.role_ids.map((rid) => ({
          user_id: newUser.id,
          role_id: rid,
        }));
        await supabaseAdmin.from('user_roles').insert(roleMappings);
      }

      await createAuditLog({
        userId: actor?.id,
        username: actor?.username,
        action: 'CREATE_USER',
        entityType: 'USER',
        entityId: newUser.id,
        newValues: payload,
        req,
      });

      return this.getUserById(newUser.id);
    }

    // Local DB
    const existing = memoryDb.users.find((u) => u.username.toLowerCase() === payload.username.trim().toLowerCase() && !u.deleted_at);
    if (existing) {
      throw new Error(`Username '${payload.username}' is already in use.`);
    }

    const newUser: User & { role_ids: string[] } = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      auth_user_id: `auth-${Date.now()}`,
      username: payload.username.trim().toLowerCase(),
      email: payload.email?.trim(),
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      phone: payload.phone?.trim() || null,
      profile_image: payload.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      role_ids: payload.role_ids || [],
    };

    memoryDb.users.push(newUser);

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: newUser.id,
      newValues: payload,
      req,
    });

    return this.getUserById(newUser.id);
  }

  async updateUser(id: string, payload: Partial<User> & { role_ids?: string[] }, req: Request) {
    const actor = req.user;
    const existing = await this.getUserById(id);
    if (!existing) throw new Error('User not found');

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { role_ids, ...updateFields } = payload;
      
      const { data: updated, error } = await supabaseAdmin
        .from('users')
        .update({
          ...updateFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Update roles if provided
      if (role_ids) {
        await supabaseAdmin.from('user_roles').delete().eq('user_id', id);
        if (role_ids.length > 0) {
          const roleRecords = role_ids.map((rid: string) => ({ user_id: id, role_id: rid }));
          await supabaseAdmin.from('user_roles').insert(roleRecords);
        }
      }

      await createAuditLog({
        userId: actor?.id,
        username: actor?.username,
        action: 'UPDATE_USER',
        entityType: 'USER',
        entityId: id,
        oldValues: existing,
        newValues: payload,
        req,
      });

      return this.getUserById(id);
    }

    // Local DB
    const uIndex = memoryDb.users.findIndex((u) => u.id === id);
    if (uIndex === -1) throw new Error('User not found');

    const currentUser = memoryDb.users[uIndex];
    const { role_ids, ...fields } = payload;

    memoryDb.users[uIndex] = {
      ...currentUser,
      ...fields,
      ...(role_ids ? { role_ids } : {}),
      updated_at: new Date().toISOString(),
    };

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: id,
      oldValues: existing,
      newValues: payload,
      req,
    });

    return this.getUserById(id);
  }

  async softDeleteUser(id: string, req: Request) {
    const actor = req.user;
    const existing = await this.getUserById(id);
    if (!existing) throw new Error('User not found');

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          deleted_at: new Date().toISOString(),
          status: 'INACTIVE',
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    } else {
      const uIndex = memoryDb.users.findIndex((u) => u.id === id);
      if (uIndex !== -1) {
        memoryDb.users[uIndex].deleted_at = new Date().toISOString();
        memoryDb.users[uIndex].status = 'INACTIVE';
      }
    }

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'SOFT_DELETE_USER',
      entityType: 'USER',
      entityId: id,
      oldValues: existing,
      newValues: { deleted_at: new Date().toISOString(), status: 'INACTIVE' },
      req,
    });

    return { deleted: true, id };
  }

  async assignRoles(id: string, roleIds: string[], req: Request) {
    return this.updateUser(id, { role_ids: roleIds }, req);
  }
}

export const usersService = new UsersService();
