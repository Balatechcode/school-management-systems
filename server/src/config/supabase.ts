/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env.js';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdmin: SupabaseClient | null = null;

if (ENV.isSupabaseConfigured()) {
  try {
    supabaseClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const adminKey = ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY;
    supabaseAdmin = createClient(ENV.SUPABASE_URL, adminKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('✅ Supabase initialized with project URL:', ENV.SUPABASE_URL);
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err);
  }
} else {
  console.warn(
    '⚠️ Supabase credentials not found or placeholder values used in .env. Running with local development store for demonstration.'
  );
}

export { supabaseClient, supabaseAdmin };
