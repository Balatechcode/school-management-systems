/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  Edit2,
  Trash2,
  Lock,
  Phone,
  Mail,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../lib/api.js';
import { User, Role, RoleCode } from '../../types/index.js';
import { Table, Column } from '../../components/common/Table.js';
import { Button } from '../../components/common/Button.js';
import { Input } from '../../components/common/Input.js';
import { Select } from '../../components/common/Select.js';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { useToast } from '../../components/common/Toast.js';

export const UsersManagement: React.FC = () => {
  const { hasPermission, isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<(User & { roles?: Role[] })[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(User & { roles?: Role[] }) | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role_ids: [] as string[],
    status: 'ACTIVE',
  });
  const [isSaving, setIsSaving] = useState(false);

  const canCreate = isAdmin || hasPermission('users.create');
  const canUpdate = isAdmin || hasPermission('users.update');
  const canDelete = isAdmin || hasPermission('users.delete');
  const canManageRoles = isAdmin || hasPermission('users.manage_roles');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<(User & { roles?: Role[] })[]>('/api/users');
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (e: any) {
      toastError('Failed to fetch users list');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get<Role[]>('/api/roles');
      if (res.success && res.data) {
        setRoles(res.data);
      }
    } catch (e) {
      console.warn('Could not fetch roles:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role_ids: roles.length > 0 ? [roles.find((r) => r.code === 'TEACHER')?.id || roles[0].id] : [],
      status: 'ACTIVE',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (user: User & { roles?: Role[] }) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email || '',
      phone: user.phone || '',
      role_ids: (user.roles || []).map((r) => r.id),
      status: user.status,
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.post('/api/users', formData);
      if (res.success) {
        success(`User ${formData.username} created successfully!`);
        setIsCreateModalOpen(false);
        fetchUsers();
      } else {
        toastError(res.message || 'Failed to create user');
      }
    } catch (err: any) {
      toastError(err.message || 'Creation error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const res = await api.put(`/api/users/${selectedUser.id}`, formData);
      if (res.success) {
        success(`User ${formData.username} updated successfully!`);
        setIsEditModalOpen(false);
        fetchUsers();
      } else {
        toastError(res.message || 'Failed to update user');
      }
    } catch (err: any) {
      toastError(err.message || 'Update error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${name}?`)) return;
    try {
      const res = await api.delete(`/api/users/${id}`);
      if (res.success) {
        success('User deactivated successfully');
        fetchUsers();
      } else {
        toastError(res.message || 'Deactivation failed');
      }
    } catch (err: any) {
      toastError(err.message || 'Deletion error');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<User & { roles?: Role[] }>[] = [
    {
      key: 'name',
      header: 'User Profile',
      render: (u) => (
        <div className="flex items-center gap-3">
          {u.profile_image ? (
            <img
              src={u.profile_image}
              alt={u.first_name}
              className="w-9 h-9 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-200">
              {u.first_name[0]}
            </div>
          )}
          <div>
            <div className="font-semibold text-slate-900 leading-tight">
              {u.first_name} {u.last_name}
            </div>
            <div className="text-xs text-slate-500 font-mono">@{u.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Assigned Roles',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles && u.roles.length > 0 ? (
            u.roles.map((r) => (
              <Badge key={r.id} roleCode={r.code} size="sm">
                {r.name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">No roles</span>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (u) => (
        <div className="text-xs text-slate-600">
          <div>{u.email || '—'}</div>
          <div className="text-slate-400">{u.phone || '—'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
          {u.status}
        </Badge>
      ),
    },
    {
      key: 'last_login',
      header: 'Last Login',
      render: (u) => (
        <span className="text-xs text-slate-500">
          {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1.5">
          {canUpdate && (
            <button
              onClick={() => handleOpenEdit(u)}
              title="Edit User & Roles"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDeleteUser(u.id, `${u.first_name} ${u.last_name}`)}
              title="Deactivate Account"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {!canUpdate && !canDelete && (
            <span className="text-xs text-slate-400 italic">View only</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">User Management</h2>
          <p className="text-xs text-slate-500">
            Create, manage, and assign institutional roles to teachers, staff, parents, and students.
          </p>
        </div>

        {canCreate && (
          <Button
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Create New User
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by name, username, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <Table
        columns={columns}
        data={filteredUsers}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
        emptyMessage="No school users match your filter criteria."
      />

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create School User Profile"
        description="Add a new teacher, staff member, parent, or student account."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Username"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              helperText="Unique login identifier"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <Input
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Assign Institutional Roles
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {roles.map((role) => {
                const isSelected = formData.role_ids.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      const newRoles = isSelected
                        ? formData.role_ids.filter((id) => id !== role.id)
                        : [...formData.role_ids, role.id];
                      setFormData({ ...formData, role_ids: newRoles });
                    }}
                    className={`p-2 rounded-lg border text-left transition-all text-xs cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]">{role.name}</span>
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User Profile & Roles"
        description="Update personal information, account status, and role assignments."
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Username"
              disabled
              value={formData.username}
              helperText="Username cannot be altered"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
                { value: 'SUSPENDED', label: 'SUSPENDED' },
              ]}
            />
          </div>

          {canManageRoles && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Assigned Roles
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {roles.map((role) => {
                  const isSelected = formData.role_ids.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        const newRoles = isSelected
                          ? formData.role_ids.filter((id) => id !== role.id)
                          : [...formData.role_ids, role.id];
                        setFormData({ ...formData, role_ids: newRoles });
                      }}
                      className={`p-2 rounded-lg border text-left transition-all text-xs cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]">{role.name}</span>
                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
