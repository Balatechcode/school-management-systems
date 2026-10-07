/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarCheck,
  Radio,
  Fingerprint,
  Check,
  Save,
  History,
} from 'lucide-react';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { Table, Column } from '../../components/common/Table.js';
import { useToast } from '../../components/common/Toast.js';
import { api } from '../../lib/api.js';
import {
  SchoolClass,
  Section,
  ClassAttendanceRosterItem,
  AttendanceStatus,
  AttendanceDailyStats,
  AttendanceRecord,
} from '../../types/index.js';

// Modular Subcomponents
import { AttendanceStatsStrip } from './components/AttendanceStatsStrip.js';
import { AttendanceToolbar } from './components/AttendanceToolbar.js';
import { AttendanceStatusPicker } from './components/AttendanceStatusPicker.js';
import { GateScannerModal } from './components/GateScannerModal.js';
import { StudentHistoryModal } from './components/StudentHistoryModal.js';

export const AttendanceManagement: React.FC = () => {
  const { success, error: toastError, info } = useToast();

  // Selection states
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Data states
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [roster, setRoster] = useState<ClassAttendanceRosterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [, setDailyStats] = useState<AttendanceDailyStats | null>(null);

  // Modals state
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scanCardInput, setScanCardInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedStudent, setLastScannedStudent] = useState<any>(null);

  const [historyModalStudent, setHistoryModalStudent] = useState<ClassAttendanceRosterItem | null>(null);
  const [studentHistoryData, setStudentHistoryData] = useState<{
    total_days: number;
    present_days: number;
    absent_days: number;
    late_days: number;
    half_days: number;
    leave_days: number;
    attendance_percentage: number;
    records: AttendanceRecord[];
  } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 1. Initial Load: Fetch Classes, Sections, and School-wide Stats
  useEffect(() => {
    async function loadMeta() {
      setIsLoadingClasses(true);
      try {
        const [clsRes, secRes, statsRes] = await Promise.all([
          api.get<SchoolClass[]>('/api/v1/classes'),
          api.get<Section[]>('/api/v1/sections'),
          api.get<AttendanceDailyStats>(`/api/v1/attendance/stats/today?date=${selectedDate}`),
        ]);

        if (clsRes.success && clsRes.data && clsRes.data.length > 0) {
          setClasses(clsRes.data);
          setSelectedClassId(clsRes.data[0].id);
        }
        if (secRes.success && secRes.data && secRes.data.length > 0) {
          setSections(secRes.data);
          setSelectedSectionId(secRes.data[0].id);
        }
        if (statsRes.success && statsRes.data) {
          setDailyStats(statsRes.data);
        }
      } catch {
        toastError('Failed to load classes and sections');
      } finally {
        setIsLoadingClasses(false);
      }
    }

    loadMeta();
  }, []);

  // 2. Fetch Class Attendance Register when Class, Section, or Date changes
  const loadRegister = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId) return;

    setIsLoadingRoster(true);
    try {
      const res = await api.get<{
        roster: ClassAttendanceRosterItem[];
        total_enrolled: number;
        marked_count: number;
      }>(
        `/api/v1/attendance/register?class_id=${selectedClassId}&section_id=${selectedSectionId}&date=${selectedDate}`
      );

      if (res.success && res.data) {
        setRoster(res.data.roster);
      } else {
        setRoster([]);
      }

      // Also refresh daily stats
      const statsRes = await api.get<AttendanceDailyStats>(
        `/api/v1/attendance/stats/today?date=${selectedDate}`
      );
      if (statsRes.success && statsRes.data) {
        setDailyStats(statsRes.data);
      }
    } catch {
      toastError('Failed to load class attendance register');
    } finally {
      setIsLoadingRoster(false);
    }
  }, [selectedClassId, selectedSectionId, selectedDate, toastError]);

  useEffect(() => {
    loadRegister();
  }, [loadRegister]);

  // 3. Mark Single Student Status
  const handleUpdateStudentStatus = (
    studentId: string,
    newStatus: AttendanceStatus
  ) => {
    setRoster((prev) =>
      prev.map((item) => {
        if (item.student_id === studentId) {
          return {
            ...item,
            status: newStatus,
            entry_mode: 'MANUAL',
            check_in_time:
              newStatus === 'PRESENT' || newStatus === 'LATE'
                ? item.check_in_time || new Date().toTimeString().split(' ')[0]
                : null,
          };
        }
        return item;
      })
    );
  };

  // 4. Update Remarks inline
  const handleUpdateRemarks = (studentId: string, remarks: string) => {
    setRoster((prev) =>
      prev.map((item) => (item.student_id === studentId ? { ...item, remarks } : item))
    );
  };

  // 5. One-Click: Mark All Present
  const handleMarkAllPresent = () => {
    setRoster((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'PRESENT',
        entry_mode: item.entry_mode || 'MANUAL',
        check_in_time: item.check_in_time || new Date().toTimeString().split(' ')[0],
      }))
    );
    info('All students marked Present. Remember to click Save.');
  };

  // 6. Save Attendance (Bulk Upsert)
  const handleSaveAttendance = async () => {
    if (roster.length === 0) return;

    setIsSaving(true);
    try {
      const payload = {
        academic_year_id: 'ay-2026-27',
        class_id: selectedClassId,
        section_id: selectedSectionId,
        attendance_date: selectedDate,
        records: roster.map((r) => ({
          student_id: r.student_id,
          enrollment_id: r.enrollment_id,
          status: r.status,
          entry_mode: r.entry_mode,
          check_in_time: r.check_in_time,
          check_out_time: r.check_out_time,
          remarks: r.remarks,
        })),
      };

      const res = await api.post<{ saved_count: number }>('/api/v1/attendance/mark-bulk', payload);

      if (res.success) {
        success(`Attendance saved successfully for ${roster.length} students`);
        await loadRegister();
      } else {
        toastError(res.message || 'Failed to save attendance');
      }
    } catch (err: any) {
      toastError(err.message || 'Error occurred while saving attendance');
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Simulate Hardware RFID / Biometric Gate Tap
  const handleSimulateDeviceTap = async () => {
    if (!scanCardInput.trim()) {
      toastError('Please enter an RFID card UID or select a sample card');
      return;
    }

    setIsScanning(true);
    setLastScannedStudent(null);
    try {
      const response = await fetch('/api/v1/attendance/device-tap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-api-key': 'educore-hw-key-2026',
        },
        body: JSON.stringify({
          card_number: scanCardInput.trim(),
          device_id: 'MAIN_GATE_IN_01',
          direction: 'IN',
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        setLastScannedStudent(data.data);
        success(`Gate Tap Verified: ${data.data.student.name} marked ${data.data.attendance.status}`);
        setScanCardInput('');
        await loadRegister();
      } else {
        toastError(data.message || 'Unrecognized RFID Card');
      }
    } catch {
      toastError('Failed to communicate with device tap API');
    } finally {
      setIsScanning(false);
    }
  };

  // 8. Open Student History Modal
  const handleOpenHistoryModal = async (studentItem: ClassAttendanceRosterItem) => {
    setHistoryModalStudent(studentItem);
    setIsLoadingHistory(true);
    setStudentHistoryData(null);
    try {
      const res = await api.get<any>(`/api/v1/attendance/student/${studentItem.student_id}`);
      if (res.success && res.data) {
        setStudentHistoryData(res.data);
      }
    } catch {
      toastError('Failed to load student attendance history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Date Shift Helper
  const handleDateShift = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Calculated Metrics
  const presentCount = useMemo(() => roster.filter((r) => r.status === 'PRESENT').length, [roster]);
  const absentCount = useMemo(() => roster.filter((r) => r.status === 'ABSENT').length, [roster]);
  const lateCount = useMemo(() => roster.filter((r) => r.status === 'LATE').length, [roster]);
  const halfDayCount = useMemo(() => roster.filter((r) => r.status === 'HALF_DAY').length, [roster]);
  const leaveCount = useMemo(() => roster.filter((r) => r.status === 'LEAVE').length, [roster]);
  const attendancePercentage = useMemo(() => {
    return roster.length > 0
      ? Math.round(((presentCount + lateCount + halfDayCount * 0.5) / roster.length) * 100)
      : 0;
  }, [roster.length, presentCount, lateCount, halfDayCount]);

  // Filtered Roster for View
  const filteredRoster = useMemo(() => {
    return roster.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        `${item.first_name} ${item.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.admission_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.roll_number.includes(searchQuery);

      const matchesStatus =
        statusFilter === 'ALL' ||
        item.status === statusFilter ||
        (statusFilter === 'RFID' && (item.entry_mode === 'RFID' || item.entry_mode === 'BIOMETRIC'));

      return matchesSearch && matchesStatus;
    });
  }, [roster, searchQuery, statusFilter]);

  // Reusable Table Columns
  const columns: Column<ClassAttendanceRosterItem>[] = [
    {
      key: 'roll_number',
      header: 'Roll',
      className: 'w-16 font-bold text-slate-900',
      render: (item) => (
        <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-800">
          {item.roll_number || '—'}
        </span>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      render: (student) => (
        <div className="flex items-center gap-3">
          <img
            src={
              student.photo_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                student.first_name + ' ' + student.last_name
              )}&background=e0e7ff&color=4338ca&size=64`
            }
            alt={student.first_name}
            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
          />
          <div>
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              {student.first_name} {student.last_name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {student.admission_number}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'tag',
      header: 'Hardware Tag',
      className: 'w-40',
      render: (student) =>
        student.rfid_card_number ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono">
            <Radio className="w-3 h-3 text-indigo-500" />
            {student.rfid_card_number}
          </span>
        ) : student.biometric_id ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-mono">
            <Fingerprint className="w-3 h-3 text-purple-500" />
            {student.biometric_id}
          </span>
        ) : (
          <span className="text-slate-400 text-[11px] italic">No Card Assigned</span>
        ),
    },
    {
      key: 'gate_arrival',
      header: 'Gate Arrival',
      className: 'w-44',
      render: (student) =>
        student.check_in_time ? (
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                student.entry_mode === 'RFID' || student.entry_mode === 'BIOMETRIC'
                  ? 'bg-emerald-500'
                  : 'bg-slate-400'
              }`}
            />
            <span className="font-mono text-slate-700 text-xs font-medium">
              {student.check_in_time}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              ({student.entry_mode})
            </span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Attendance Status',
      className: 'w-72',
      render: (student) => (
        <AttendanceStatusPicker
          currentStatus={student.status}
          onChange={(newStatus) => handleUpdateStudentStatus(student.student_id, newStatus)}
        />
      ),
    },
    {
      key: 'remarks',
      header: 'Remarks',
      className: 'w-44',
      render: (student) => (
        <input
          type="text"
          placeholder="Add note..."
          value={student.remarks || ''}
          onChange={(e) => handleUpdateRemarks(student.student_id, e.target.value)}
          className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-400 rounded-md px-2 py-1 text-slate-800 transition-colors"
        />
      ),
    },
    {
      key: 'history',
      header: 'History',
      className: 'w-20 text-center',
      render: (student) => (
        <button
          type="button"
          onClick={() => handleOpenHistoryModal(student)}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
          title="View Monthly History"
        >
          <History className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Student Attendance Register
              <Badge variant="primary" size="sm">
                Part 4
              </Badge>
            </h1>
            <p className="text-xs text-slate-500">
              Modern Hybrid Attendance — Classroom Roll Call, RFID Gate Taps &amp; Biometrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Radio className="w-3.5 h-3.5 text-indigo-600" />}
            onClick={() => setIsScannerModalOpen(true)}
          >
            RFID / Gate Simulator
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Check className="w-3.5 h-3.5 text-emerald-600" />}
            onClick={handleMarkAllPresent}
            disabled={roster.length === 0}
          >
            Mark All Present
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Save className="w-3.5 h-3.5" />}
            isLoading={isSaving}
            disabled={roster.length === 0}
            onClick={handleSaveAttendance}
          >
            Save Attendance
          </Button>
        </div>
      </div>

      {/* 2. Modular Statistics Strip */}
      <AttendanceStatsStrip
        rosterCount={roster.length}
        presentCount={presentCount}
        absentCount={absentCount}
        lateCount={lateCount}
        halfDayCount={halfDayCount}
        leaveCount={leaveCount}
        attendancePercentage={attendancePercentage}
      />

      {/* 3. Modular Controls Toolbar */}
      <AttendanceToolbar
        classes={classes}
        sections={sections}
        selectedClassId={selectedClassId}
        selectedSectionId={selectedSectionId}
        selectedDate={selectedDate}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onClassChange={setSelectedClassId}
        onSectionChange={setSelectedSectionId}
        onDateChange={setSelectedDate}
        onDateShift={handleDateShift}
        onSearchChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
      />

      {/* 4. Student Roster Reusable Table */}
      <Table<ClassAttendanceRosterItem>
        columns={columns}
        data={filteredRoster}
        keyExtractor={(item) => item.student_id}
        isLoading={isLoadingClasses || isLoadingRoster}
        emptyMessage="No students found in this roster. Ensure students are actively enrolled in this class and section."
        rowClassName={(item) =>
          item.status === 'ABSENT'
            ? 'bg-rose-50/20'
            : item.status === 'LATE'
            ? 'bg-amber-50/15'
            : ''
        }
      />

      {/* 5. RFID / Biometric Gate Simulator Modal */}
      <GateScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        scanCardInput={scanCardInput}
        onScanCardInputChange={setScanCardInput}
        isScanning={isScanning}
        onSimulateTap={handleSimulateDeviceTap}
        roster={roster}
        lastScannedStudent={lastScannedStudent}
      />

      {/* 6. Student Monthly Attendance History Modal */}
      <StudentHistoryModal
        student={historyModalStudent}
        isOpen={Boolean(historyModalStudent)}
        onClose={() => setHistoryModalStudent(null)}
        isLoading={isLoadingHistory}
        historyData={studentHistoryData}
      />
    </div>
  );
};
