/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  Building,
  Key,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  School,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../lib/api.js';
import { Badge } from '../../components/common/Badge.js';
import { Button } from '../../components/common/Button.js';
import { SchoolSettings } from '../../types/index.js';

interface DashboardViewProps {
  onNavigateTab: (tab: any) => void;
  onOpenSetupGuide: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenSetupGuide,
}) => {
  const { user, hasPermission, hasRole, isAdmin, isSupabaseConfigured } = useAuth();
  const [stats, setStats] = useState({
    userCount: 0,
    roleCount: 8,
    permissionCount: 23,
    studentCount: 0,
    classCount: 0,
  });
  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  useEffect(() => {
    async function loadData() {
      const [usersRes, rolesRes, settingsRes, studentsRes, classesRes] = await Promise.all([
        api.get<any[]>('/api/users'),
        api.get<any[]>('/api/roles'),
        api.get<SchoolSettings>('/api/settings'),
        api.get<any>('/api/students?limit=1'),
        api.get<any[]>('/api/classes'),
      ]);

      if (usersRes.success && usersRes.data) {
        setStats((prev) => ({ ...prev, userCount: usersRes.data?.length || 0 }));
      }
      if (rolesRes.success && rolesRes.data) {
        setStats((prev) => ({ ...prev, roleCount: rolesRes.data?.length || 8 }));
      }
      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
      if (studentsRes.success && studentsRes.data?.pagination) {
        setStats((prev) => ({ ...prev, studentCount: studentsRes.data.pagination.total || 0 }));
      }
      if (classesRes.success && classesRes.data) {
        setStats((prev) => ({ ...prev, classCount: classesRes.data?.length || 0 }));
      }
    }

    loadData();
  }, []);

  // Representative permission test items for visual RBAC testing
  const rbacTests = [
    { label: 'View Dashboard', key: 'dashboard.view' },
    { label: 'Create New Users', key: 'users.create' },
    { label: 'Edit User Accounts', key: 'users.update' },
    { label: 'Delete / Deactivate Users', key: 'users.delete' },
    { label: 'Manage Roles & RBAC', key: 'users.manage_roles' },
    { label: 'Student Directory & Admissions', key: 'students.read' },
    { label: 'Register & Enroll Students', key: 'students.create' },
    { label: 'Academic Structure & Classes', key: 'academics.read' },
    { label: 'Update School Settings', key: 'settings.update' },
    { label: 'Inspect Security Audit Logs', key: 'audit_logs.read' },
    { label: 'Take Class Attendance', key: 'attendance.create' },
    { label: 'Collect Fee Payments', key: 'fees.update' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Single School Welcome */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Single-School Architecture
            </span>
            <span className="text-xs text-slate-300">
              Session {settings?.academic_session || '2026-2027'}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Welcome, {user?.first_name} {user?.last_name}!
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Logged into{' '}
            <strong className="text-white">
              {settings?.school_name || 'Greenwood International Academy'}
            </strong>{' '}
            as <strong className="text-indigo-300">{user?.roles?.[0]?.name || 'User'}</strong>.
            Part 1 (Auth &amp; RBAC) and Part 2 (Students, Parents, Enrollment &amp; Academic Structure) are fully active.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button
              size="sm"
              variant="primary"
              onClick={() => onNavigateTab('students')}
              disabled={!hasPermission('students.read')}
            >
              Students &amp; Enrollment
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-800/80 text-white border-slate-700 hover:bg-slate-800"
              onClick={() => onNavigateTab('academics')}
              disabled={!hasPermission('academics.read')}
            >
              Academic Structure
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-800/80 text-white border-slate-700 hover:bg-slate-800"
              onClick={() => onNavigateTab('users')}
              disabled={!hasPermission('users.read')}
            >
              Manage Users
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-800/80 text-white border-slate-700 hover:bg-slate-800"
              onClick={() => onNavigateTab('roles')}
            >
              Inspect Roles &amp; RBAC
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-800/80 text-white border-slate-700 hover:bg-slate-800"
              onClick={onOpenSetupGuide}
            >
              Supabase Status &amp; SQL
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => onNavigateTab('students')}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Enrolled Students</span>
            <GraduationCap className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.studentCount} Students</div>
          <p className="text-[11px] text-slate-500 mt-1">Directory &amp; Parent details</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => onNavigateTab('academics')}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Classes &amp; Sections</span>
            <School className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.classCount || 15} Classes</div>
          <p className="text-[11px] text-slate-500 mt-1">Nursery through Class 12</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => onNavigateTab('users')}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">System Users</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.userCount || '—'} Accounts</div>
          <p className="text-[11px] text-slate-500 mt-1">8 Roles configured</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">School Code</span>
            <Building className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {settings?.school_code || 'GIA-2026'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Single-school primary identifier</p>
        </div>
      </div>

      {/* RBAC Capability Test Matrix for Current User */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Active User RBAC Capability Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live validation of <code className="text-indigo-600 font-mono">hasPermission()</code> and{' '}
              <code className="text-indigo-600 font-mono">hasRole()</code> for{' '}
              <strong className="text-slate-700">{user?.username}</strong> ({user?.roles?.[0]?.code})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Your Roles:</span>
            {user?.roles?.map((r) => (
              <Badge key={r.id} roleCode={r.code}>
                {r.code}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rbacTests.map((t) => {
            const allowed = isAdmin || hasPermission(t.key);
            return (
              <div
                key={t.key}
                className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                  allowed
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div>
                  <div className="font-semibold">{t.label}</div>
                  <div className="font-mono text-[10px] text-slate-500">{t.key}</div>
                </div>
                {allowed ? (
                  <div className="flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                    <CheckCircle2 className="w-4 h-4" /> Allowed
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-400 font-medium text-[11px]">
                    <XCircle className="w-4 h-4" /> Denied
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* School Configuration Preview */}
      {settings && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                School Master Information (Single School)
              </h3>
              <p className="text-xs text-slate-500">
                Fixed non-multi-tenant institutional record
              </p>
            </div>
            {hasPermission('settings.update') && (
              <Button size="sm" variant="outline" onClick={() => onNavigateTab('settings')}>
                Edit Settings
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block mb-0.5">School Name</span>
              <strong className="text-slate-900 text-sm">{settings.school_name}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block mb-0.5">Principal</span>
              <strong className="text-slate-900 text-sm">{settings.principal_name}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block mb-0.5">Contact Email</span>
              <strong className="text-slate-900 text-sm font-mono">{settings.email}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block mb-0.5">Address</span>
              <span className="text-slate-800">
                {settings.address}, {settings.city}, {settings.state} - {settings.pincode}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block mb-0.5">Currency / Timezone</span>
              <span className="text-slate-800 font-mono">
                {settings.currency} • {settings.timezone}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block mb-0.5">Website</span>
              <span className="text-indigo-600 font-mono truncate block">
                {settings.website}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
