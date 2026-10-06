/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  GraduationCap,
  CalendarCheck,
  FileText,
  CreditCard,
  BookOpen,
  Bus,
  Package,
  BarChart3,
  History,
  School,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';

export type NavTab =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'settings'
  | 'audit'
  | 'students'
  | 'academics'
  | 'attendance'
  | 'homework'
  | 'examinations'
  | 'fees'
  | 'library'
  | 'transport'
  | 'inventory'
  | 'reports';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
}) => {
  const { hasPermission, isAdmin } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      activeInPart1: true,
      permission: 'dashboard.view',
    },
    {
      id: 'users' as NavTab,
      label: 'User Management',
      icon: Users,
      activeInPart1: true,
      permission: 'users.read',
    },
    {
      id: 'roles' as NavTab,
      label: 'Roles & RBAC',
      icon: ShieldCheck,
      activeInPart1: true,
      permission: 'users.read',
    },
    {
      id: 'settings' as NavTab,
      label: 'School Settings',
      icon: Settings,
      activeInPart1: true,
      permission: 'settings.read',
    },
    {
      id: 'audit' as NavTab,
      label: 'Audit Trail',
      icon: History,
      activeInPart1: true,
      permission: 'audit_logs.read',
    },
    // Part 2: Academic & Student Management
    {
      id: 'students' as NavTab,
      label: 'Students & Parents',
      icon: GraduationCap,
      activeInPart1: true,
      permission: 'students.read',
    },
    {
      id: 'academics' as NavTab,
      label: 'Academic Structure',
      icon: School,
      activeInPart1: true,
      permission: 'academics.read',
    },
    // Future modules marked "Coming Soon" for subsequent parts
    {
      id: 'attendance' as NavTab,
      label: 'Attendance',
      icon: CalendarCheck,
      activeInPart1: false,
      badge: 'Part 6',
    },
    {
      id: 'homework' as NavTab,
      label: 'Homework',
      icon: FileText,
      activeInPart1: false,
      badge: 'Part 8',
    },
    {
      id: 'fees' as NavTab,
      label: 'Fees & Finance',
      icon: CreditCard,
      activeInPart1: false,
      badge: 'Part 10',
    },
    {
      id: 'library' as NavTab,
      label: 'Library',
      icon: BookOpen,
      activeInPart1: false,
      badge: 'Part 11',
    },
    {
      id: 'transport' as NavTab,
      label: 'Transport',
      icon: Bus,
      activeInPart1: false,
      badge: 'Part 12',
    },
    {
      id: 'inventory' as NavTab,
      label: 'Inventory',
      icon: Package,
      activeInPart1: false,
      badge: 'Part 13',
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: BarChart3,
      activeInPart1: false,
      badge: 'Part 18',
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* School Logo / Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/60">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-white leading-tight">
              EduCore
            </div>
            <div className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">
              Single-School OS
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Active Modules (Parts 1 & 2) */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              School Management
            </div>
            <nav className="space-y-1">
              {navItems
                .filter((item) => item.activeInPart1)
                .map((item) => {
                  const allowed = isAdmin || !item.permission || hasPermission(item.permission);
                  const isCurrent = currentTab === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      disabled={!allowed}
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        !allowed
                          ? 'opacity-40 cursor-not-allowed text-slate-500'
                          : isCurrent
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            isCurrent ? 'text-white' : 'text-slate-400'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {!allowed && <Lock className="w-3 h-3 text-slate-500" />}
                    </button>
                  );
                })}
            </nav>
          </div>

          {/* Future Modules */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Future Modules</span>
              <span className="text-[9px] text-slate-600 lowercase font-normal">roadmap</span>
            </div>
            <nav className="space-y-1">
              {navItems
                .filter((item) => !item.activeInPart1)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-normal text-slate-400 hover:bg-slate-800/40 transition-colors select-none opacity-60"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {item.badge}
                      </span>
                    </div>
                  );
                })}
            </nav>
          </div>
        </div>

        {/* Footer info: Single School Info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="px-2 py-1 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold mr-1">●</span>
            Single-School Architecture
          </div>
          <div className="px-2 text-[10px] text-slate-400">
            Greenwood International Academy
          </div>
        </div>
      </aside>
    </>
  );
};
