/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal.js';
import { Button } from '../../components/common/Button.js';
import { Check, Copy, Database, KeyRound, Server, FileCode, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../components/common/Toast.js';

interface SupabaseSetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupGuideModal: React.FC<SupabaseSetupGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isSupabaseConfigured, refreshUser } = useAuth();
  const { success } = useToast();
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const sampleEnv = `# Required Supabase Configuration for Single-School System
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Vite Client Aliases
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`;

  const copySqlToClipboard = async () => {
    try {
      const response = await fetch('/database/schema.sql');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      success('Database SQL migration copied to clipboard!');
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      // Fallback
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  const copyEnvToClipboard = async () => {
    await navigator.clipboard.writeText(sampleEnv);
    setCopiedEnv(true);
    success('Environment template copied to clipboard!');
    setTimeout(() => setCopiedEnv(false), 3000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase Database & Authentication Configuration"
      description="Connect your Supabase PostgreSQL database to enable live authentication and data persistence."
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            Status: {isSupabaseConfigured ? 'Connected to live Supabase' : 'Running in local fallback mode'}
          </div>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-sm text-slate-700">
        {/* Connection status banner */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            isSupabaseConfigured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {isSupabaseConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wide">
              {isSupabaseConfigured
                ? 'Live Supabase Connection Active'
                : 'Development / Evaluation Fallback Store Active'}
            </h4>
            <p className="text-xs mt-1 leading-relaxed">
              {isSupabaseConfigured
                ? 'Your applet is actively querying your Supabase project for users, roles, permissions, settings, and audit logs.'
                : 'The system is running with an in-memory seed store with preloaded Admin, Principal, and Teacher roles. Follow the 3 steps below to attach your real Supabase instance.'}
            </p>
          </div>
        </div>

        {/* Step 1: Create Supabase project & Run SQL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                1
              </span>
              Run Database Migration in Supabase SQL Editor
            </h5>
            <Button
              size="sm"
              variant="outline"
              onClick={copySqlToClipboard}
              leftIcon={copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copiedSql ? 'Copied SQL!' : 'Copy Migration SQL'}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Open your Supabase project Dashboard &gt; <strong>SQL Editor</strong> &gt; New Query &gt; Paste &gt; Run.
            This creates tables: <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded font-mono">users</code>, <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded font-mono">roles</code>, <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded font-mono">permissions</code>, <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded font-mono">user_roles</code>, <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded font-mono">school_settings</code>, and <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded font-mono">audit_logs</code> with RLS policies.
          </p>
        </div>

        {/* Step 2: Environment Variables */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                2
              </span>
              Configure Environment Variables in .env
            </h5>
            <Button
              size="sm"
              variant="outline"
              onClick={copyEnvToClipboard}
              leftIcon={copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copiedEnv ? 'Copied .env!' : 'Copy .env Sample'}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Obtain your Project URL and Anon Key from Supabase Project Settings &gt; API.
            Obtain your Service Role key for backend operations.
          </p>
          <pre className="bg-slate-900 text-slate-200 text-xs p-3 rounded-lg overflow-x-auto font-mono">
            {sampleEnv}
          </pre>
        </div>

        {/* Step 3: Initial Admin Creation */}
        <div className="space-y-2">
          <h5 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
              3
            </span>
            Create First Admin Account
          </h5>
          <p className="text-xs text-slate-500 leading-relaxed">
            The system provides a secure Initial Admin Setup screen that safely creates the root Administrator account without hardcoded credentials. Once created, only admins can manage and provision further user accounts.
          </p>
        </div>
      </div>
    </Modal>
  );
};
