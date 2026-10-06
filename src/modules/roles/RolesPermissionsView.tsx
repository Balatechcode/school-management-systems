/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, Check, Info, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../lib/api.js';
import { Role, Permission, RoleCode } from '../../types/index.js';
import { Badge } from '../../components/common/Badge.js';
import { Button } from '../../components/common/Button.js';
import { useToast } from '../../components/common/Toast.js';

export const RolesPermissionsView: React.FC = () => {
  const { hasPermission, isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canManageRoles = isAdmin || hasPermission('users.manage_roles');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [rolesRes, permsRes] = await Promise.all([
          api.get<Role[]>('/api/roles'),
          api.get<Permission[]>('/api/roles/permissions'),
        ]);

        if (rolesRes.success && rolesRes.data) {
          setRoles(rolesRes.data);
          if (rolesRes.data.length > 0) {
            setSelectedRoleId(rolesRes.data[0].id);
          }
        }

        if (permsRes.success && permsRes.data) {
          setPermissions(permsRes.data);
        }
      } catch (e: any) {
        toastError('Failed to load roles & permissions');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Fetch permissions for selected role
  useEffect(() => {
    if (!selectedRoleId) return;
    async function loadRolePerms() {
      try {
        const res = await api.get<Permission[]>(`/api/roles/${selectedRoleId}/permissions`);
        if (res.success && res.data) {
          setRolePermissions(res.data);
        }
      } catch (e) {
        console.warn('Error loading role permissions:', e);
      }
    }
    loadRolePerms();
  }, [selectedRoleId]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isSelectedRoleAdmin = selectedRole?.code === 'ADMIN';

  // Toggle permission mapping
  const handleTogglePermission = (permissionId: string) => {
    if (!canManageRoles || isSelectedRoleAdmin) return;

    setRolePermissions((prev) => {
      const exists = prev.some((p) => p.id === permissionId);
      if (exists) {
        return prev.filter((p) => p.id !== permissionId);
      } else {
        const pObj = permissions.find((p) => p.id === permissionId);
        return pObj ? [...prev, pObj] : prev;
      }
    });
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleId) return;
    setIsSaving(true);
    try {
      const permissionIds = rolePermissions.map((p) => p.id);
      const res = await api.put(`/api/roles/${selectedRoleId}/permissions`, {
        permission_ids: permissionIds,
      });

      if (res.success) {
        success(`Permissions updated for role ${selectedRole?.name}`);
      } else {
        toastError(res.message || 'Failed to update permissions');
      }
    } catch (e: any) {
      toastError(e.message || 'Save error');
    } finally {
      setIsSaving(false);
    }
  };

  // Group permissions by module
  const modules = Array.from(new Set(permissions.map((p) => p.module)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Roles & Role-Based Access Control (RBAC)
        </h2>
        <p className="text-xs text-slate-500">
          The 8 predefined single-school institutional roles with granular module-action authorization policies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Roles List (Left 4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Institutional Roles (8)
          </div>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {roles.map((role) => {
              const isSelected = role.id === selectedRoleId;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full text-left p-3.5 transition-colors cursor-pointer flex items-center justify-between ${
                    isSelected ? 'bg-indigo-50/90 text-indigo-950 font-semibold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{role.name}</span>
                      <Badge size="sm" roleCode={role.code}>
                        {role.code}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {role.description}
                    </p>
                  </div>
                  {isSelected && <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions Configuration for Selected Role (Right 8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
          {selectedRole ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedRole.name}</h3>
                    <Badge roleCode={selectedRole.code}>{selectedRole.code}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedRole.description}</p>
                </div>

                {canManageRoles && !isSelectedRoleAdmin && (
                  <Button
                    size="sm"
                    onClick={handleSaveRolePermissions}
                    isLoading={isSaving}
                    leftIcon={<ShieldCheck className="w-4 h-4" />}
                  >
                    Save Permissions
                  </Button>
                )}
              </div>

              {isSelectedRoleAdmin && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    The <strong>ADMIN</strong> role inherently possesses superuser authority and bypasses all granular permission checks across all modules.
                  </span>
                </div>
              )}

              {/* Module permission toggles */}
              <div className="space-y-4">
                {modules.map((mod) => {
                  const modulePerms = permissions.filter((p) => p.module === mod);

                  return (
                    <div key={mod} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center justify-between">
                        <span className="capitalize">{mod} Module</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {modulePerms.length} actions
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {modulePerms.map((perm) => {
                          const isAssigned =
                            isSelectedRoleAdmin ||
                            rolePermissions.some((rp) => rp.id === perm.id);

                          return (
                            <div
                              key={perm.id}
                              onClick={() => handleTogglePermission(perm.id)}
                              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                                isAssigned
                                  ? 'bg-white border-indigo-200 text-slate-900 shadow-xs'
                                  : 'bg-white/60 border-slate-200 text-slate-400 opacity-60'
                              } ${
                                !isSelectedRoleAdmin && canManageRoles
                                  ? 'cursor-pointer hover:border-indigo-400'
                                  : 'cursor-default'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 ${
                                  isAssigned
                                    ? 'bg-indigo-600 text-white'
                                    : 'border border-slate-300'
                                }`}
                              >
                                {isAssigned && <Check className="w-3 h-3" />}
                              </div>
                              <div>
                                <div className="font-semibold leading-tight">
                                  {perm.module}.{perm.action}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {perm.description}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Select a role from the left panel to inspect its permissions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
