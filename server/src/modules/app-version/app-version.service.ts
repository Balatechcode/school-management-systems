/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { MobileAppVersion, MobilePlatform, CheckUpdateResponse } from '../../types/index.js';

export class AppVersionService {
  /**
   * Compare two semantic version strings (e.g., "1.2.3" vs "1.2.0")
   * Returns:
   *  - positive number if v1 > v2
   *  - negative number if v1 < v2
   *  - 0 if v1 === v2
   */
  compareVersions(v1: string, v2: string): number {
    const parts1 = (v1 || '0.0.0').split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = (v2 || '0.0.0').split('.').map((p) => parseInt(p, 10) || 0);
    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  /**
   * Check if the client's mobile app version needs a force or optional update.
   */
  async checkUpdate(
    platform: MobilePlatform,
    clientVersion = '1.0.0',
    clientBuildNumber = 1
  ): Promise<CheckUpdateResponse> {
    let config: MobileAppVersion | null = null;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('mobile_app_versions')
        .select('*')
        .eq('platform', platform)
        .single();

      if (!error && data) {
        config = data as MobileAppVersion;
      }
    } else {
      config = memoryDb.mobileAppVersions.find((m) => m.platform === platform) || null;
    }

    // Fallback default if not configured
    if (!config) {
      return {
        platform,
        current_version: clientVersion,
        current_build_number: clientBuildNumber,
        latest_version: clientVersion,
        min_supported_version: clientVersion,
        force_update: false,
        optional_update: false,
        title: null,
        message: null,
        store_url: '',
        maintenance_mode: false,
        maintenance_message: null,
      };
    }

    // 1. Maintenance Mode Check
    if (config.maintenance_mode) {
      return {
        platform,
        current_version: clientVersion,
        current_build_number: clientBuildNumber,
        latest_version: config.latest_version,
        min_supported_version: config.min_supported_version,
        force_update: true,
        optional_update: false,
        title: 'System Maintenance',
        message: config.maintenance_message || 'The school system is undergoing scheduled maintenance.',
        store_url: config.store_url,
        maintenance_mode: true,
        maintenance_message: config.maintenance_message,
      };
    }

    // 2. Force Update Check (Client is below minimum supported version or build)
    const isBelowMinVersion = this.compareVersions(clientVersion, config.min_supported_version) < 0;
    const isBelowMinBuild = clientBuildNumber < config.min_build_number;

    if (isBelowMinVersion || isBelowMinBuild) {
      return {
        platform,
        current_version: clientVersion,
        current_build_number: clientBuildNumber,
        latest_version: config.latest_version,
        min_supported_version: config.min_supported_version,
        force_update: true,
        optional_update: false,
        title: config.force_update_title,
        message: config.force_update_message,
        store_url: config.store_url,
        maintenance_mode: false,
        maintenance_message: null,
      };
    }

    // 3. Optional Update Check (Client is below latest version, but above minimum)
    const isBelowLatestVersion = this.compareVersions(clientVersion, config.latest_version) < 0;
    const isBelowLatestBuild = clientBuildNumber < config.latest_build_number;

    if (isBelowLatestVersion || isBelowLatestBuild) {
      return {
        platform,
        current_version: clientVersion,
        current_build_number: clientBuildNumber,
        latest_version: config.latest_version,
        min_supported_version: config.min_supported_version,
        force_update: false,
        optional_update: true,
        title: config.optional_update_title,
        message: config.optional_update_message,
        store_url: config.store_url,
        maintenance_mode: false,
        maintenance_message: null,
      };
    }

    // 4. Up-to-date
    return {
      platform,
      current_version: clientVersion,
      current_build_number: clientBuildNumber,
      latest_version: config.latest_version,
      min_supported_version: config.min_supported_version,
      force_update: false,
      optional_update: false,
      title: null,
      message: null,
      store_url: config.store_url,
      maintenance_mode: false,
      maintenance_message: null,
    };
  }

  /**
   * Get all mobile platform configurations (for administration)
   */
  async getAllSettings(): Promise<MobileAppVersion[]> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('mobile_app_versions')
        .select('*')
        .order('platform');

      if (error) throw new Error(`Failed to load app versions: ${error.message}`);
      return (data || []) as MobileAppVersion[];
    }

    return memoryDb.mobileAppVersions;
  }

  /**
   * Update mobile configuration for a specific platform (admin only)
   */
  async updateSettings(platform: MobilePlatform, payload: Partial<MobileAppVersion>): Promise<MobileAppVersion> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('mobile_app_versions')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('platform', platform)
        .select()
        .single();

      if (error) throw new Error(`Failed to update app version config: ${error.message}`);
      return data as MobileAppVersion;
    }

    const index = memoryDb.mobileAppVersions.findIndex((m) => m.platform === platform);
    if (index === -1) {
      throw new Error(`Mobile platform config '${platform}' not found`);
    }

    const updated: MobileAppVersion = {
      ...memoryDb.mobileAppVersions[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    memoryDb.mobileAppVersions[index] = updated;
    return updated;
  }
}

export const appVersionService = new AppVersionService();
