/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { SchoolClass, Section } from '../../../types/index.js';

interface AttendanceToolbarProps {
  classes: SchoolClass[];
  sections: Section[];
  selectedClassId: string;
  selectedSectionId: string;
  selectedDate: string;
  searchQuery: string;
  statusFilter: string;
  onClassChange: (classId: string) => void;
  onSectionChange: (sectionId: string) => void;
  onDateChange: (date: string) => void;
  onDateShift: (days: number) => void;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (status: string) => void;
}

export const AttendanceToolbar: React.FC<AttendanceToolbarProps> = ({
  classes,
  sections,
  selectedClassId,
  selectedSectionId,
  selectedDate,
  searchQuery,
  statusFilter,
  onClassChange,
  onSectionChange,
  onDateChange,
  onDateShift,
  onSearchChange,
  onStatusFilterChange,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Selector */}
          <div className="w-44">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Class / Grade
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => onClassChange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div className="w-36">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => onSectionChange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Date Navigator */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Date
            </label>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onDateShift(-1)}
                className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="text-xs bg-transparent border-0 px-2 py-1 font-medium text-slate-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onDateShift(1)}
                className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDateChange(new Date().toISOString().split('T')[0])}
                className="text-[10px] font-semibold px-2 py-1 bg-white border border-slate-200 rounded-md text-indigo-600 hover:bg-indigo-50 cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Quick Search & Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search name, roll, ADM..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present Only</option>
            <option value="ABSENT">Absent Only</option>
            <option value="LATE">Late Only</option>
            <option value="RFID">Gate Taps Only</option>
          </select>
        </div>
      </div>
    </div>
  );
};
