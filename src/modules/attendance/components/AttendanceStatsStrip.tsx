/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Users, CheckCircle2, AlertCircle, Clock, HelpCircle } from 'lucide-react';

interface AttendanceStatsStripProps {
  rosterCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  leaveCount: number;
  attendancePercentage: number;
}

export const AttendanceStatsStrip: React.FC<AttendanceStatsStripProps> = ({
  rosterCount,
  presentCount,
  absentCount,
  lateCount,
  halfDayCount,
  leaveCount,
  attendancePercentage,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Enrolled */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          Enrolled
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold text-slate-900">{rosterCount}</span>
          <span className="text-[11px] text-slate-400">Class</span>
        </div>
      </div>

      {/* Present */}
      <div className="bg-white p-3.5 rounded-xl border border-emerald-200/60 bg-emerald-50/20 shadow-2xs">
        <div className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Present
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold text-emerald-700">{presentCount}</span>
          <span className="text-[11px] font-semibold text-emerald-600">{attendancePercentage}%</span>
        </div>
      </div>

      {/* Absent */}
      <div className="bg-white p-3.5 rounded-xl border border-rose-200/60 bg-rose-50/20 shadow-2xs">
        <div className="text-[11px] font-medium text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          Absent
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold text-rose-700">{absentCount}</span>
          <span className="text-[11px] text-rose-500">Unexcused</span>
        </div>
      </div>

      {/* Late */}
      <div className="bg-white p-3.5 rounded-xl border border-amber-200/60 bg-amber-50/20 shadow-2xs">
        <div className="text-[11px] font-medium text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Late
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold text-amber-700">{lateCount}</span>
          <span className="text-[11px] text-amber-600">&gt; 08:30 AM</span>
        </div>
      </div>

      {/* Half Day */}
      <div className="bg-white p-3.5 rounded-xl border border-sky-200/60 bg-sky-50/20 shadow-2xs">
        <div className="text-[11px] font-medium text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          Half Day
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold text-sky-700">{halfDayCount}</span>
          <span className="text-[11px] text-sky-600">0.5 credit</span>
        </div>
      </div>

      {/* Leave */}
      <div className="bg-white p-3.5 rounded-xl border border-purple-200/60 bg-purple-50/20 shadow-2xs">
        <div className="text-[11px] font-medium text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
          Approved Leave
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold text-purple-700">{leaveCount}</span>
          <span className="text-[11px] text-purple-500">Excused</span>
        </div>
      </div>
    </div>
  );
};
