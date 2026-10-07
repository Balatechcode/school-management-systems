/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AttendanceStatus } from '../../../types/index.js';

interface AttendanceStatusPickerProps {
  currentStatus: AttendanceStatus;
  onChange: (newStatus: AttendanceStatus) => void;
}

export const AttendanceStatusPicker: React.FC<AttendanceStatusPickerProps> = ({
  currentStatus,
  onChange,
}) => {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
      <button
        type="button"
        onClick={() => onChange('PRESENT')}
        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
          currentStatus === 'PRESENT'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-slate-600 hover:text-emerald-700'
        }`}
        title="Present"
      >
        P
      </button>
      <button
        type="button"
        onClick={() => onChange('ABSENT')}
        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
          currentStatus === 'ABSENT'
            ? 'bg-rose-600 text-white shadow-xs'
            : 'text-slate-600 hover:text-rose-700'
        }`}
        title="Absent"
      >
        A
      </button>
      <button
        type="button"
        onClick={() => onChange('LATE')}
        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
          currentStatus === 'LATE'
            ? 'bg-amber-500 text-white shadow-xs'
            : 'text-slate-600 hover:text-amber-700'
        }`}
        title="Late Arrival"
      >
        L
      </button>
      <button
        type="button"
        onClick={() => onChange('HALF_DAY')}
        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
          currentStatus === 'HALF_DAY'
            ? 'bg-sky-600 text-white shadow-xs'
            : 'text-slate-600 hover:text-sky-700'
        }`}
        title="Half Day"
      >
        HD
      </button>
      <button
        type="button"
        onClick={() => onChange('LEAVE')}
        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
          currentStatus === 'LEAVE'
            ? 'bg-purple-600 text-white shadow-xs'
            : 'text-slate-600 hover:text-purple-700'
        }`}
        title="Approved Leave"
      >
        LV
      </button>
    </div>
  );
};
