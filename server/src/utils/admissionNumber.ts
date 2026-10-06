/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../db/store.js';

export async function generateAdmissionNumber(yearPrefix?: string): Promise<string> {
  const currentYear = yearPrefix || new Date().getFullYear().toString();
  const prefix = `ADM-${currentYear}`;

  if (isUsingLiveSupabase() && supabaseAdmin) {
    // Count existing students starting with this prefix
    const { count, error } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .ilike('admission_number', `${prefix}-%`);

    const nextSeq = !error && count !== null ? count + 1 : Math.floor(1000 + Math.random() * 9000);
    const seqPadded = String(nextSeq).padStart(4, '0');
    return `${prefix}-${seqPadded}`;
  }

  // Memory store fallback
  const matching = (memoryDb as any).students?.filter((s: any) =>
    s.admission_number?.startsWith(prefix)
  ) || [];
  const nextSeq = matching.length + 1;
  const seqPadded = String(nextSeq).padStart(4, '0');
  return `${prefix}-${seqPadded}`;
}
