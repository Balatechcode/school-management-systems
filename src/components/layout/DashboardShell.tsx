/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar, NavTab } from './Sidebar.js';
import { Header } from './Header.js';
import { DashboardView } from '../../modules/dashboard/DashboardView.js';
import { UsersManagement } from '../../modules/users/UsersManagement.js';
import { RolesPermissionsView } from '../../modules/roles/RolesPermissionsView.js';
import { SchoolSettingsView } from '../../modules/settings/SchoolSettingsView.js';
import { AuditLogsView } from '../../modules/audit/AuditLogsView.js';
import { StudentsList } from '../../modules/students/StudentsList.js';
import { AcademicsManagement } from '../../modules/academics/AcademicsManagement.js';
import { SupabaseSetupGuideModal } from '../../modules/setup/SupabaseSetupGuideModal.js';
import { UserProfileModal } from '../../modules/users/UserProfileModal.js';
import { InitialAdminSetup } from '../../modules/auth/InitialAdminSetup.js';
import { useAuth } from '../../hooks/useAuth.js';
import { Construction, Sparkles } from 'lucide-react';
import { Button } from '../common/Button.js';

export const DashboardShell: React.FC = () => {
  const { user, isSupabaseConfigured } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isInitialAdminOpen, setIsInitialAdminOpen] = useState(false);

  const renderModuleContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onOpenSetupGuide={() => setIsSetupGuideOpen(true)}
          />
        );
      case 'users':
        return <UsersManagement />;
      case 'roles':
        return <RolesPermissionsView />;
      case 'settings':
        return <SchoolSettingsView />;
      case 'audit':
        return <AuditLogsView />;
      case 'students':
        return <StudentsList />;
      case 'academics':
        return <AcademicsManagement />;
      default:
        // Future Module Placeholder
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-center max-w-lg mx-auto mt-12 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Construction className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 capitalize">
              {currentTab} Module
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              This module is scheduled for future implementation in accordance with the single-school architectural roadmap. Part 1 focuses strictly on{' '}
              <strong>Authentication, User Management &amp; Role-Based Access Control (RBAC)</strong>.
            </p>
            <div className="mt-6 flex gap-2">
              <Button size="sm" onClick={() => setCurrentTab('dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenSetupGuide={() => setIsSetupGuideOpen(true)}
          onOpenUserProfile={() => setIsUserProfileOpen(true)}
        />

        {/* Demo Mode / Migration Notification Strip */}
        {!isSupabaseConfigured && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-medium flex items-center justify-between border-b border-amber-600">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                Running in <strong>In-Memory Evaluation Mode</strong>. Click to copy the Supabase PostgreSQL migration script and configure live DB credentials.
              </span>
            </div>
            <button
              onClick={() => setIsSetupGuideOpen(true)}
              className="px-2.5 py-0.5 rounded bg-slate-950 text-white text-[11px] font-semibold hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
            >
              Setup Supabase DB
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderModuleContent()}
        </main>
      </div>

      {/* Modals */}
      <SupabaseSetupGuideModal
        isOpen={isSetupGuideOpen}
        onClose={() => setIsSetupGuideOpen(false)}
      />

      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
      />

      <InitialAdminSetup
        isOpen={isInitialAdminOpen}
        onClose={() => setIsInitialAdminOpen(false)}
      />
    </div>
  );
};
