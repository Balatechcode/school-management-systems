/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin, supabaseClient } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb, INITIAL_ROLES } from '../../db/store.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { User, Role, InitialAdminSetupPayload } from '../../types/index.js';
import { Request } from 'express';

export class AuthService {
  /**
   * Check if the school system has at least one active administrator
   */
  async checkAdminStatus() {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      // Find admin role ID
      const { data: adminRole } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('code', 'ADMIN')
        .single();

      if (!adminRole) return { initialized: false, count: 0 };

      const { count, error } = await supabaseAdmin
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', adminRole.id);

      return {
        initialized: !error && (count || 0) > 0,
        count: count || 0,
        liveSupabase: true,
      };
    }

    const adminRole = memoryDb.roles.find((r) => r.code === 'ADMIN');
    const adminCount = memoryDb.users.filter(
      (u) => adminRole && u.role_ids.includes(adminRole.id) && u.status === 'ACTIVE'
    ).length;

    return {
      initialized: adminCount > 0,
      count: adminCount,
      liveSupabase: false,
    };
  }

  /**
   * Safely create the initial System Administrator.
   * Only permitted when no admin exists or explicit setup requested.
   */
  async setupInitialAdmin(payload: InitialAdminSetupPayload, req: Request) {
    const adminStatus = await this.checkAdminStatus();
    if (adminStatus.initialized && adminStatus.count > 0 && isUsingLiveSupabase()) {
      throw new Error('System is already initialized with an active administrator. Use standard user creation.');
    }

    let authUserId: string | null = null;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      // 1. Create user in Supabase Auth via Admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          username: payload.username,
          first_name: payload.first_name,
          last_name: payload.last_name,
        },
      });

      if (authError || !authData.user) {
        throw new Error(`Failed to create Supabase Auth credentials: ${authError?.message}`);
      }

      authUserId = authData.user.id;

      // 2. Insert into public.users table
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .insert([
          {
            auth_user_id: authUserId,
            username: payload.username.trim().toLowerCase(),
            first_name: payload.first_name.trim(),
            last_name: payload.last_name.trim(),
            phone: payload.phone?.trim() || null,
            status: 'ACTIVE',
            last_login_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (profileError || !userProfile) {
        throw new Error(`Failed to create public user record: ${profileError?.message}`);
      }

      // 3. Find ADMIN role
      const { data: adminRole } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('code', 'ADMIN')
        .single();

      if (adminRole) {
        await supabaseAdmin.from('user_roles').insert([
          {
            user_id: userProfile.id,
            role_id: adminRole.id,
          },
        ]);
      }

      await createAuditLog({
        userId: userProfile.id,
        username: userProfile.username,
        action: 'INITIAL_ADMIN_CREATED',
        entityType: 'USER',
        entityId: userProfile.id,
        newValues: { username: payload.username, email: payload.email, role: 'ADMIN' },
        req,
      });

      return {
        user: userProfile,
        email: payload.email,
        authUserId,
      };
    }

    // Local Memory DB path
    const adminRole = memoryDb.roles.find((r) => r.code === 'ADMIN') || INITIAL_ROLES[0];
    const newAdminUser: User & { password_hash?: string; role_ids: string[] } = {
      id: `usr-${Date.now()}`,
      auth_user_id: `auth-${Date.now()}`,
      username: payload.username.trim().toLowerCase(),
      email: payload.email.trim(),
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      phone: payload.phone?.trim() || null,
      profile_image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      role_ids: [adminRole.id],
    };

    memoryDb.users.unshift(newAdminUser);

    await createAuditLog({
      userId: newAdminUser.id,
      username: newAdminUser.username,
      action: 'INITIAL_ADMIN_CREATED',
      entityType: 'USER',
      entityId: newAdminUser.id,
      newValues: { username: payload.username, email: payload.email, role: 'ADMIN' },
      req,
    });

    return {
      user: newAdminUser,
      email: payload.email,
      token: `demo-${newAdminUser.username}-token`,
    };
  }

  /**
   * Sync or create profile in public.users when user authenticates via Supabase Auth
   */
  async syncUserProfile(authUserId: string, email: string, meta: Record<string, any> = {}) {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (existingUser) {
        // Update last_login_at
        await supabaseAdmin
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', existingUser.id);
        return existingUser;
      }

      // Generate username fallback from email
      const username = meta.username || email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      const firstName = meta.first_name || 'School';
      const lastName = meta.last_name || 'Member';

      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert([
          {
            auth_user_id: authUserId,
            username,
            first_name: firstName,
            last_name: lastName,
            status: 'ACTIVE',
            last_login_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to sync user profile: ${insertError.message}`);
      }

      // Assign default STUDENT or TEACHER role if not assigned
      const defaultRoleCode = meta.role || 'TEACHER';
      const { data: role } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('code', defaultRoleCode)
        .single();

      if (role && newUser) {
        await supabaseAdmin.from('user_roles').insert([
          {
            user_id: newUser.id,
            role_id: role.id,
          },
        ]);
      }

      return newUser;
    }

    return null;
  }
}

export const authService = new AuthService();
