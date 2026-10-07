/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal } from '../../../components/common/Modal.js';
import { Loading } from '../../../components/common/FeedbackStates.js';
import { ClassAttendanceRosterItem, AttendanceRecord } from '../../../types/index.js';

interface StudentHistoryData {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_days: number;
  leave_days: number;
  attendance_percentage: number;
  records: AttendanceRecord[];
}

interface StudentHistoryModalProps {
  student: ClassAttendanceRosterItem | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  historyData: StudentHistoryData | null;
}

export const StudentHistoryModal: React.FC<StudentHistoryModalProps> = ({
  student,
  isOpen,
  onClose,
  isLoading,
  historyData,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={student ? `${student.first_name} ${student.last_name}'s Attendance` : ''}
      description={`Admission No: ${student?.admission_number} • Roll No: ${student?.roll_number}`}
      maxWidth="lg"
    >
      {isLoading ? (
        <div className="py-12">
          <Loading message="Loading attendance history..." />
        </div>
      ) : historyData ? (
        <div className="space-y-4 text-xs text-slate-700">
          {/* Percentage Overview */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Overall Attendance</span>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">
                {historyData.attendance_percentage}%
              </div>
            </div>
            <div className="flex gap-3 text-right">
              <div>
                <span className="text-[10px] text-emerald-700 font-medium">Present</span>
                <div className="font-bold text-emerald-700">{historyData.present_days}d</div>
              </div>
              <div>
                <span className="text-[10px] text-rose-700 font-medium">Absent</span>
                <div className="font-bold text-rose-700">{historyData.absent_days}d</div>
              </div>
              <div>
                <span className="text-[10px] text-amber-700 font-medium">Late</span>
                <div className="font-bold text-amber-700">{historyData.late_days}d</div>
              </div>
              <div>
                <span className="text-[10px] text-purple-700 font-medium">Leave</span>
                <div className="font-bold text-purple-700">{historyData.leave_days}d</div>
              </div>
            </div>
          </div>

          {/* Attendance Log List */}
          <div>
            <h5 className="font-semibold text-slate-900 mb-2">Recorded Attendance Entries:</h5>
            {historyData.records.length === 0 ? (
              <p className="text-slate-400 italic py-4 text-center">No attendance records logged yet.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {historyData.records.map((rec) => (
                  <div key={rec.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{rec.attendance_date}</span>
                      {rec.check_in_time && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rec.check_in_time} ({rec.entry_mode})
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'ABSENT'
                          ? 'bg-rose-100 text-rose-800'
                          : rec.status === 'LATE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
