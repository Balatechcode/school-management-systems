/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Menu,
  LogOut,
  User as UserIcon,
  Shield,
  Database,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenSetupGuide: () => void;
  onOpenUserProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onOpenSetupGuide,
  onOpenUserProfile,
}) => {
  const { user, logout, isSupabaseConfigured, loginWithDemo } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const primaryRole = user?.roles?.[0]?.code || 'USER';

  const handleQuickRoleSwitch = async (username: string) => {
    setIsSwitchingRole(true);
    await loginWithDemo(username);
    setIsSwitchingRole(false);
    setShowUserDropdown(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left section: Hamburger and School Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <span>Greenwood International Academy</span>
            <span className="hidden sm:inline-flex items-center text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              Session 2026-2027
            </span>
          </h1>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            School Code: <span className="font-mono text-slate-700">GIA-2026</span>
          </p>
        </div>
      </div>

      {/* Right section: Supabase Status, Role Switcher, and User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Supabase Connection Pill */}
        <button
          onClick={onOpenSetupGuide}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
            isSupabaseConfigured
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
          title="Click to view Supabase database setup & migration SQL"
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden md:inline">
            {isSupabaseConfigured ? 'Supabase Live' : 'Demo Mode (Click for Setup)'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
        </button>

        {/* Quick Role Tester (Available for immediate evaluation) */}
        <div className="hidden xl:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <span className="text-[10px] uppercase font-semibold text-slate-500 px-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" /> Test As:
          </span>
          <button
            onClick={() => handleQuickRoleSwitch('admin')}
            disabled={isSwitchingRole}
            className={`px-2 py-1 rounded font-medium text-[11px] transition-colors cursor-pointer ${
              user?.username === 'admin'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleQuickRoleSwitch('principal')}
            disabled={isSwitchingRole}
            className={`px-2 py-1 rounded font-medium text-[11px] transition-colors cursor-pointer ${
              user?.username === 'principal'
                ? 'bg-white text-purple-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Principal
          </button>
          <button
            onClick={() => handleQuickRoleSwitch('teacher')}
            disabled={isSwitchingRole}
            className={`px-2 py-1 rounded font-medium text-[11px] transition-colors cursor-pointer ${
              user?.username === 'teacher'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Teacher
          </button>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {user?.profile_image ? (
              <img
                src={user.profile_image}
                alt={user.first_name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center justify-center border border-indigo-200">
                {user?.first_name?.[0] || 'U'}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {user ? `${user.first_name} ${user.last_name}` : 'Signed In'}
              </div>
              <Badge size="sm" roleCode={primaryRole}>
                {primaryRole}
              </Badge>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[11px] text-slate-500 font-mono truncate">
                  @{user?.username} • {user?.email || 'school user'}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {user?.roles?.map((r) => (
                    <Badge key={r.id} size="sm" roleCode={r.code}>
                      {r.code}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenUserProfile();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>My Profile Details</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenSetupGuide();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Database className="w-4 h-4 text-slate-400" />
                  <span>Supabase & Migration Info</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={async () => {
                    setShowUserDropdown(false);
                    await logout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
