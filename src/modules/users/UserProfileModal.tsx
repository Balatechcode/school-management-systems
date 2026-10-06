/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal } from '../../components/common/Modal.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { useAuth } from '../../hooks/useAuth.js';
import { ShieldCheck, Mail, Phone, Calendar, User, Key } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile & Security Roles"
      description="Account information, assigned roles, and RBAC permissions."
      maxWidth="lg"
      footer={
        <Button size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        {/* User Card */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          {user.profile_image ? (
            <img
              src={user.profile_image}
              alt={user.first_name}
              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-bold text-xl flex items-center justify-center">
              {user.first_name[0]}
            </div>
          )}
          <div>
            <h4 className="text-base font-semibold text-slate-900">
              {user.first_name} {user.last_name}
            </h4>
            <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.roles?.map((role) => (
                <Badge key={role.id} roleCode={role.code}>
                  {role.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Contact & Status Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Mail className="w-3.5 h-3.5" />
              <span>Email Address</span>
            </div>
            <p className="font-medium text-slate-800">{user.email || 'None'}</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Phone className="w-3.5 h-3.5" />
              <span>Phone Number</span>
            </div>
            <p className="font-medium text-slate-800">{user.phone || 'Not recorded'}</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <User className="w-3.5 h-3.5" />
              <span>Account Status</span>
            </div>
            <Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>
              {user.status}
            </Badge>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Last Login</span>
            </div>
            <p className="font-medium text-slate-800">
              {user.last_login_at
                ? new Date(user.last_login_at).toLocaleString()
                : 'First session'}
            </p>
          </div>
        </div>

        {/* Granular Active Permissions */}
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-indigo-600" />
            Active Permissions ({user.permissions?.length || 0})
          </h5>
          <div className="max-h-40 overflow-y-auto p-3 bg-slate-900 rounded-xl text-slate-300 font-mono text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-1.5 border border-slate-800">
            {user.permissions && user.permissions.length > 0 ? (
              user.permissions.map((p) => (
                <div key={p} className="flex items-center gap-1.5 text-emerald-400">
                  <span className="text-slate-600">✓</span> {p}
                </div>
              ))
            ) : (
              <span className="text-slate-500 italic">No permissions assigned</span>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
