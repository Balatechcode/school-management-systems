/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { School, Save, Building, Mail, Phone, Globe, User, Clock, DollarSign } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../lib/api.js';
import { SchoolSettings } from '../../types/index.js';
import { Input } from '../../components/common/Input.js';
import { Button } from '../../components/common/Button.js';
import { useToast } from '../../components/common/Toast.js';

export const SchoolSettingsView: React.FC = () => {
  const { hasPermission, isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [formData, setFormData] = useState<Partial<SchoolSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = isAdmin || hasPermission('settings.update');

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<SchoolSettings>('/api/settings');
      if (res.success && res.data) {
        setSettings(res.data);
        setFormData(res.data);
      }
    } catch (e: any) {
      toastError('Failed to fetch school settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSaving(true);
    try {
      const res = await api.put<SchoolSettings>('/api/settings', formData);
      if (res.success && res.data) {
        setSettings(res.data);
        setFormData(res.data);
        success('School settings saved successfully!');
      } else {
        toastError(res.message || 'Failed to update settings');
      }
    } catch (err: any) {
      toastError(err.message || 'Save error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Loading institutional settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            School Master Settings
          </h2>
          <p className="text-xs text-slate-500">
            Institutional master record for this school. All academic sessions and reports reference these settings.
          </p>
        </div>

        {canEdit && (
          <Button
            size="sm"
            onClick={handleSubmit}
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save All Settings
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core School Identification */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
            <School className="w-4 h-4 text-indigo-600" />
            School Identity & Branding
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Official School Name"
              disabled={!canEdit}
              value={formData.school_name || ''}
              onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
              required
            />
            <Input
              label="School Code (Institutional ID)"
              disabled={!canEdit}
              value={formData.school_code || ''}
              onChange={(e) => setFormData({ ...formData, school_code: e.target.value })}
              helperText="Unique registration code"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Principal / Head of Institution"
              disabled={!canEdit}
              value={formData.principal_name || ''}
              onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
              leftIcon={<User className="w-4 h-4" />}
            />
            <Input
              label="Logo URL"
              disabled={!canEdit}
              value={formData.logo_url || ''}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              helperText="Direct image URL or Cloudinary path"
            />
          </div>
        </div>

        {/* Academic Session & Localization */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            Academic Session & Localization
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Active Academic Session"
              disabled={!canEdit}
              value={formData.academic_session || ''}
              onChange={(e) => setFormData({ ...formData, academic_session: e.target.value })}
              helperText="E.g., 2026-2027"
              required
            />
            <Input
              label="Default Currency Code"
              disabled={!canEdit}
              value={formData.currency || ''}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              leftIcon={<DollarSign className="w-4 h-4" />}
              helperText="USD, EUR, INR, GBP, etc."
              required
            />
            <Input
              label="Timezone"
              disabled={!canEdit}
              value={formData.timezone || ''}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              helperText="E.g., America/Los_Angeles, UTC"
              required
            />
          </div>
        </div>

        {/* Contact & Location Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600" />
            Contact & Address Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Official Email"
              type="email"
              disabled={!canEdit}
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              leftIcon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Phone Number"
              disabled={!canEdit}
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              leftIcon={<Phone className="w-4 h-4" />}
            />
            <Input
              label="School Website"
              disabled={!canEdit}
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              leftIcon={<Globe className="w-4 h-4" />}
            />
          </div>

          <Input
            label="Street Address"
            disabled={!canEdit}
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="City"
              disabled={!canEdit}
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="State / Province"
              disabled={!canEdit}
              value={formData.state || ''}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="Postal / Zip Code"
              disabled={!canEdit}
              value={formData.pincode || ''}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            />
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button
              type="submit"
              size="md"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save School Settings
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
