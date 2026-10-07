/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Supabase Configuration
  SUPABASE_URL:
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '',
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '',
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '',
  
  JWT_SECRET: (() => {
    const secret = process.env.JWT_SECRET || '';
    if (process.env.NODE_ENV === 'production') {
      if (!secret || secret.length < 32 || secret.includes('change-in-prod')) {
        throw new Error(
          'FATAL SECURITY: In production, JWT_SECRET must be explicitly set to a random string of at least 32 characters in .env'
        );
      }
      return secret;
    }
    return secret || 'single-school-sys-secret-jwt-key-change-in-prod-32-chars';
  })(),

  // Cloudinary Storage Configuration
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  isCloudinaryConfigured(): boolean {
    return Boolean(this.CLOUDINARY_CLOUD_NAME && this.CLOUDINARY_API_KEY && this.CLOUDINARY_API_SECRET);
  },

  // Check whether real Supabase credentials have been configured
  isSupabaseConfigured(): boolean {
    const url = this.SUPABASE_URL;
    const anon = this.SUPABASE_ANON_KEY;
    if (!url || !anon) return false;
    if (url.includes('your-project') || anon.includes('your-supabase-anon-key')) return false;
    return true;
  }
};
