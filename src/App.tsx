/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.js';
import { ToastProvider } from './components/common/Toast.js';
import { LoginPage } from './modules/auth/LoginPage.js';
import { DashboardShell } from './components/layout/DashboardShell.js';
import { Loading } from './components/common/FeedbackStates.js';
import { SupabaseSetupGuideModal } from './modules/setup/SupabaseSetupGuideModal.js';
import { InitialAdminSetup } from './modules/auth/InitialAdminSetup.js';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);
  const [isInitialAdminOpen, setIsInitialAdminOpen] = useState(false);

  if (isLoading) {
    return <Loading fullPage message="Authenticating session..." />;
  }

  if (!user) {
    return (
      <>
        <LoginPage
          onOpenSetupGuide={() => setIsSetupGuideOpen(true)}
          onOpenInitialAdminSetup={() => setIsInitialAdminOpen(true)}
        />
        <SupabaseSetupGuideModal
          isOpen={isSetupGuideOpen}
          onClose={() => setIsSetupGuideOpen(false)}
        />
        <InitialAdminSetup
          isOpen={isInitialAdminOpen}
          onClose={() => setIsInitialAdminOpen(false)}
        />
      </>
    );
  }

  return <DashboardShell />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
