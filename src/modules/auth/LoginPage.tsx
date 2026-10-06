/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { School, Lock, Mail, ArrowRight, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { Input } from '../../components/common/Input.js';
import { Button } from '../../components/common/Button.js';
import { useToast } from '../../components/common/Toast.js';

interface LoginPageProps {
  onOpenSetupGuide: () => void;
  onOpenInitialAdminSetup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onOpenSetupGuide,
  onOpenInitialAdminSetup,
}) => {
  const { loginWithSupabase, loginWithDemo, isSupabaseConfigured, needsAdminSetup } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or username');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSupabaseConfigured) {
        const res = await loginWithSupabase(identifier, password);
        if (!res.success) {
          setErrorMessage(res.message || 'Invalid email or password');
          toastError(res.message || 'Authentication failed');
        } else {
          toastSuccess('Signed in successfully');
        }
      } else {
        // Fallback login: match demo user
        const res = await loginWithDemo(identifier.toLowerCase());
        if (!res.success) {
          setErrorMessage(`Demo account "${identifier}" not found. Try 'admin', 'principal', or 'teacher'.`);
        } else {
          toastSuccess(`Welcome back, ${identifier}!`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected login error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoFill = async (username: string) => {
    setIdentifier(username);
    setPassword('DemoPassword2026!');
    setIsSubmitting(true);
    const res = await loginWithDemo(username);
    setIsSubmitting(false);
    if (res.success) {
      toastSuccess(`Signed in as ${username}`);
    } else {
      toastError(res.message || 'Failed demo login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Header / Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 mb-4">
          <School className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          EduCore School Management
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Greenwood International Academy • Single-School Administrative Portal
        </p>
      </div>

      {/* Main card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {/* Initial Admin Setup Prompt (If no admin created yet) */}
          {needsAdminSetup && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-800 mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Initial Setup Required</span>
              </div>
              <p className="mb-3 leading-relaxed">
                No System Administrator exists yet in the school database. Run the secure initial admin setup wizard to create your first administrative credentials.
              </p>
              <Button
                size="sm"
                variant="primary"
                className="w-full"
                onClick={onOpenInitialAdminSetup}
              >
                Create Initial Administrator
              </Button>
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Input
              label={isSupabaseConfigured ? 'Email Address' : 'Email or Username'}
              type={isSupabaseConfigured ? 'email' : 'text'}
              placeholder={
                isSupabaseConfigured
                  ? 'admin@greenwoodacademy.edu'
                  : 'admin or principal'
              }
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="username"
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              className="w-full py-3"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to EduCore
            </Button>
          </form>

          {/* Quick Demo Accounts for Immediate Review */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> One-Click Role Testing
              </span>
              <span className="text-[10px] text-slate-400">demo profiles</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoFill('admin')}
                className="p-2 text-center rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-xs cursor-pointer group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-indigo-600">Admin</div>
                <div className="text-[10px] text-slate-400">Full RBAC</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('principal')}
                className="p-2 text-center rounded-lg border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-xs cursor-pointer group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-purple-600">Principal</div>
                <div className="text-[10px] text-slate-400">Academic Lead</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('teacher')}
                className="p-2 text-center rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs cursor-pointer group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-blue-600">Teacher</div>
                <div className="text-[10px] text-slate-400">Class Staff</div>
              </button>
            </div>
          </div>

          {/* Database Setup Link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onOpenSetupGuide}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              Supabase Setup & Migration Guide →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
