/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const msg = (typeof error === 'string' ? error : error.message || error.details || '').toLowerCase();
  return (
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('not found') ||
    error.code === '42P01' ||
    error.code === 'PGRST204'
  );
}
