/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { createAuditLog } from '../../utils/auditLog.js';
import {
  AttendanceRecord,
  ClassAttendanceRosterItem,
  AttendanceDailyStats,
  MarkBulkAttendancePayload,
  DeviceTapPayload,
} from '../../types/index.js';
import { Request } from 'express';

export class AttendanceService {
  /**
   * Get attendance register for a specific class, section, and date.
   * Merges active student enrollments with any existing attendance records (including RFID/biometric taps).
   */
  async getClassRegister(
    classId: string,
    sectionId: string,
    date: string
  ): Promise<{
    date: string;
    class_id: string;
    section_id: string;
    total_enrolled: number;
    marked_count: number;
    roster: ClassAttendanceRosterItem[];
  }> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      // 1. Fetch active enrollments for this class and section
      const { data: enrollments, error: enrError } = await supabaseAdmin
        .from('student_enrollments')
        .select(`
          id,
          roll_number,
          student_id,
          status,
          students:student_id (
            id,
            admission_number,
            first_name,
            last_name,
            photo_url,
            gender,
            rfid_card_number,
            biometric_id,
            status
          )
        `)
        .eq('class_id', classId)
        .eq('section_id', sectionId)
        .eq('status', 'ACTIVE')
        .order('roll_number', { ascending: true });

      if (enrError) {
        throw new Error(`Failed to load student enrollments: ${enrError.message}`);
      }

      const activeEnrollments = (enrollments || []).filter(
        (e: any) => e.students && e.students.status === 'ACTIVE'
      );

      const enrollmentIds = activeEnrollments.map((e: any) => e.id);

      // 2. Fetch existing attendance records for these enrollments on the specified date
      let existingAttendanceMap = new Map<string, any>();
      if (enrollmentIds.length > 0) {
        const { data: attendanceData, error: attError } = await supabaseAdmin
          .from('attendance')
          .select('*')
          .in('enrollment_id', enrollmentIds)
          .eq('attendance_date', date);

        if (!attError && attendanceData) {
          attendanceData.forEach((att: any) => {
            existingAttendanceMap.set(att.enrollment_id, att);
          });
        }
      }

      // 3. Assemble roster
      let markedCount = 0;
      const roster: ClassAttendanceRosterItem[] = activeEnrollments.map((e: any) => {
        const existing = existingAttendanceMap.get(e.id);
        if (existing) {
          markedCount++;
          return {
            student_id: e.student_id,
            enrollment_id: e.id,
            roll_number: e.roll_number,
            admission_number: e.students.admission_number,
            first_name: e.students.first_name,
            last_name: e.students.last_name,
            photo_url: e.students.photo_url,
            gender: e.students.gender,
            rfid_card_number: e.students.rfid_card_number,
            biometric_id: e.students.biometric_id,
            status: existing.status,
            entry_mode: existing.entry_mode,
            check_in_time: existing.check_in_time,
            check_out_time: existing.check_out_time,
            remarks: existing.remarks,
            attendance_id: existing.id,
          };
        }

        // Default to PRESENT for unmarked students
        return {
          student_id: e.student_id,
          enrollment_id: e.id,
          roll_number: e.roll_number,
          admission_number: e.students.admission_number,
          first_name: e.students.first_name,
          last_name: e.students.last_name,
          photo_url: e.students.photo_url,
          gender: e.students.gender,
          rfid_card_number: e.students.rfid_card_number,
          biometric_id: e.students.biometric_id,
          status: 'PRESENT',
          entry_mode: 'MANUAL',
          check_in_time: null,
          check_out_time: null,
          remarks: null,
          attendance_id: null,
        };
      });

      return {
        date,
        class_id: classId,
        section_id: sectionId,
        total_enrolled: roster.length,
        marked_count: markedCount,
        roster,
      };
    }

    // In-Memory Fallback
    const activeEnrollments = memoryDb.studentEnrollments.filter(
      (e) => e.class_id === classId && e.section_id === sectionId && e.status === 'ACTIVE'
    );

    let markedCount = 0;
    const roster: ClassAttendanceRosterItem[] = activeEnrollments.map((e) => {
      const student = memoryDb.students.find((s) => s.id === e.student_id);
      const existing = memoryDb.attendance.find(
        (a) => a.enrollment_id === e.id && a.attendance_date === date
      );

      if (existing) {
        markedCount++;
        return {
          student_id: e.student_id,
          enrollment_id: e.id,
          roll_number: e.roll_number,
          admission_number: student?.admission_number || '',
          first_name: student?.first_name || '',
          last_name: student?.last_name || '',
          photo_url: student?.photo_url,
          gender: student?.gender,
          rfid_card_number: student?.rfid_card_number,
          biometric_id: student?.biometric_id,
          status: existing.status,
          entry_mode: existing.entry_mode,
          check_in_time: existing.check_in_time,
          check_out_time: existing.check_out_time,
          remarks: existing.remarks,
          attendance_id: existing.id,
        };
      }

      return {
        student_id: e.student_id,
        enrollment_id: e.id,
        roll_number: e.roll_number,
        admission_number: student?.admission_number || '',
        first_name: student?.first_name || '',
        last_name: student?.last_name || '',
        photo_url: student?.photo_url,
        gender: student?.gender,
        rfid_card_number: student?.rfid_card_number,
        biometric_id: student?.biometric_id,
        status: 'PRESENT',
        entry_mode: 'MANUAL',
        check_in_time: null,
        check_out_time: null,
        remarks: null,
        attendance_id: null,
      };
    });

    return {
      date,
      class_id: classId,
      section_id: sectionId,
      total_enrolled: roster.length,
      marked_count: markedCount,
      roster,
    };
  }

  /**
   * Save or update bulk attendance for a class
   */
  async markBulkAttendance(
    payload: MarkBulkAttendancePayload,
    req: Request
  ): Promise<{
    saved_count: number;
    summary: { present: number; absent: number; late: number; half_day: number; leave: number };
  }> {
    const actor = req.user;
    const { attendance_date, records } = payload;

    const summary = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 };

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const upsertRows = records.map((r) => {
        if (r.status === 'PRESENT') summary.present++;
        else if (r.status === 'ABSENT') summary.absent++;
        else if (r.status === 'LATE') summary.late++;
        else if (r.status === 'HALF_DAY') summary.half_day++;
        else if (r.status === 'LEAVE') summary.leave++;

        return {
          student_id: r.student_id,
          enrollment_id: r.enrollment_id,
          attendance_date,
          status: r.status,
          entry_mode: r.entry_mode || 'MANUAL',
          check_in_time: r.check_in_time || null,
          check_out_time: r.check_out_time || null,
          remarks: r.remarks || null,
          marked_by: actor?.id || null,
        };
      });

      const { data, error } = await supabaseAdmin
        .from('attendance')
        .upsert(upsertRows, { onConflict: 'student_id,attendance_date' })
        .select();

      if (error) {
        throw new Error(`Failed to save attendance: ${error.message}`);
      }

      await createAuditLog({
        userId: actor?.id,
        username: actor?.username,
        action: 'MARK_ATTENDANCE_BULK',
        entityType: 'ATTENDANCE',
        entityId: `${payload.class_id}_${payload.section_id}_${attendance_date}`,
        newValues: {
          attendance_date,
          class_id: payload.class_id,
          section_id: payload.section_id,
          total_records: records.length,
          summary,
        },
        req,
      });

      return {
        saved_count: data?.length || records.length,
        summary,
      };
    }

    // In-Memory Mode
    records.forEach((r) => {
      if (r.status === 'PRESENT') summary.present++;
      else if (r.status === 'ABSENT') summary.absent++;
      else if (r.status === 'LATE') summary.late++;
      else if (r.status === 'HALF_DAY') summary.half_day++;
      else if (r.status === 'LEAVE') summary.leave++;

      const existingIndex = memoryDb.attendance.findIndex(
        (a) => a.student_id === r.student_id && a.attendance_date === attendance_date
      );

      const record: AttendanceRecord = {
        id: existingIndex !== -1 ? memoryDb.attendance[existingIndex].id : `att-${Date.now()}-${r.student_id}`,
        student_id: r.student_id,
        enrollment_id: r.enrollment_id,
        attendance_date,
        status: r.status,
        entry_mode: r.entry_mode || 'MANUAL',
        check_in_time: r.check_in_time || null,
        check_out_time: r.check_out_time || null,
        remarks: r.remarks || null,
        marked_by: actor?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingIndex !== -1) {
        memoryDb.attendance[existingIndex] = record;
      } else {
        memoryDb.attendance.push(record);
      }
    });

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'MARK_ATTENDANCE_BULK',
      entityType: 'ATTENDANCE',
      entityId: `${payload.class_id}_${payload.section_id}_${attendance_date}`,
      newValues: {
        attendance_date,
        class_id: payload.class_id,
        section_id: payload.section_id,
        total_records: records.length,
        summary,
      },
      req,
    });

    return {
      saved_count: records.length,
      summary,
    };
  }

  /**
   * Process an automated RFID / Biometric tap from a gate scanner or turnstile
   */
  async processDeviceTap(payload: DeviceTapPayload): Promise<{
    success: boolean;
    student: {
      id: string;
      admission_number: string;
      name: string;
      photo_url: string | null;
      class_name: string;
      section_name: string;
      roll_number: string;
    };
    attendance: {
      status: string;
      entry_mode: string;
      check_in_time: string;
      attendance_date: string;
      device_id: string;
    };
  }> {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

    if (isUsingLiveSupabase() && supabaseAdmin) {
      // 1. Locate student by RFID card number or biometric ID
      let studentQuery = supabaseAdmin
        .from('students')
        .select(`
          id,
          admission_number,
          first_name,
          last_name,
          photo_url,
          status,
          student_enrollments (
            id,
            roll_number,
            status,
            school_class:class_id (name),
            section:section_id (name)
          )
        `)
        .eq('status', 'ACTIVE');

      if (payload.card_number) {
        studentQuery = studentQuery.eq('rfid_card_number', payload.card_number.trim());
      } else if (payload.biometric_id) {
        studentQuery = studentQuery.eq('biometric_id', payload.biometric_id.trim());
      }

      const { data: studentList, error: stError } = await studentQuery;
      if (stError || !studentList || studentList.length === 0) {
        throw new Error('Student card or biometric identifier not recognized');
      }

      const student = studentList[0];
      const activeEnrollment = (student.student_enrollments || []).find(
        (e: any) => e.status === 'ACTIVE'
      );

      if (!activeEnrollment) {
        throw new Error('Student has no active class enrollment');
      }

      // 2. Fetch school timings to determine if student is on-time, late, or half-day
      const { data: settings } = await supabaseAdmin
        .from('school_settings')
        .select('late_cutoff_time, half_day_cutoff_time')
        .limit(1)
        .single();

      const cutoff = settings?.late_cutoff_time || '08:30:00';
      const halfDayCutoff = settings?.half_day_cutoff_time || '11:30:00';
      const isLate = nowTime > cutoff;
      const isHalfDay = nowTime > halfDayCutoff;
      const status = isHalfDay ? 'HALF_DAY' : isLate ? 'LATE' : 'PRESENT';
      const entryMode = payload.card_number ? 'RFID' : 'BIOMETRIC';

      // 3. Upsert attendance record for today
      const { data: attRecord, error: attErr } = await supabaseAdmin
        .from('attendance')
        .upsert(
          [
            {
              student_id: student.id,
              enrollment_id: activeEnrollment.id,
              attendance_date: today,
              status,
              entry_mode: entryMode,
              check_in_time: nowTime,
              device_id: payload.device_id || 'GATE_SCANNER',
              remarks: isLate ? `Late arrival at gate (${nowTime})` : `Gate tap recorded at ${nowTime}`,
            },
          ],
          { onConflict: 'student_id,attendance_date' }
        )
        .select()
        .single();

      if (attErr) {
        throw new Error(`Failed to record device attendance: ${attErr.message}`);
      }

      return {
        success: true,
        student: {
          id: student.id,
          admission_number: student.admission_number,
          name: `${student.first_name} ${student.last_name}`,
          photo_url: student.photo_url,
          class_name: (activeEnrollment as any).school_class?.name || '',
          section_name: (activeEnrollment as any).section?.name || '',
          roll_number: activeEnrollment.roll_number,
        },
        attendance: {
          status: attRecord.status,
          entry_mode: attRecord.entry_mode,
          check_in_time: attRecord.check_in_time,
          attendance_date: attRecord.attendance_date,
          device_id: attRecord.device_id,
        },
      };
    }

    // In-memory demo simulation
    const student = memoryDb.students.find(
      (s) =>
        (payload.card_number && s.rfid_card_number === payload.card_number) ||
        (payload.biometric_id && s.biometric_id === payload.biometric_id)
    );

    if (!student) {
      throw new Error('Student card or biometric identifier not recognized');
    }

    const enrollment = memoryDb.studentEnrollments.find(
      (e) => e.student_id === student.id && e.status === 'ACTIVE'
    );

    if (!enrollment) {
      throw new Error('Student has no active class enrollment');
    }

    const schoolClass = memoryDb.classes.find((c) => c.id === enrollment.class_id);
    const section = memoryDb.sections.find((s) => s.id === enrollment.section_id);

    const cutoff = memoryDb.schoolSettings.late_cutoff_time || '08:30:00';
    const halfDayCutoff = memoryDb.schoolSettings.half_day_cutoff_time || '11:30:00';
    const isLate = nowTime > cutoff;
    const isHalfDay = nowTime > halfDayCutoff;
    const status = isHalfDay ? 'HALF_DAY' : isLate ? 'LATE' : 'PRESENT';
    const entryMode = payload.card_number ? 'RFID' : 'BIOMETRIC';

    const existingIndex = memoryDb.attendance.findIndex(
      (a) => a.student_id === student.id && a.attendance_date === today
    );

    const attRecord: AttendanceRecord = {
      id: existingIndex !== -1 ? memoryDb.attendance[existingIndex].id : `att-${Date.now()}`,
      student_id: student.id,
      enrollment_id: enrollment.id,
      attendance_date: today,
      status,
      entry_mode: entryMode,
      check_in_time: nowTime,
      device_id: payload.device_id || 'GATE_SCANNER',
      remarks: `Gate tap recorded at ${nowTime}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      memoryDb.attendance[existingIndex] = attRecord;
    } else {
      memoryDb.attendance.push(attRecord);
    }

    return {
      success: true,
      student: {
        id: student.id,
        admission_number: student.admission_number,
        name: `${student.first_name} ${student.last_name}`,
        photo_url: student.photo_url || null,
        class_name: schoolClass?.name || '',
        section_name: section?.name || '',
        roll_number: enrollment.roll_number,
      },
      attendance: {
        status: attRecord.status,
        entry_mode: attRecord.entry_mode,
        check_in_time: attRecord.check_in_time!,
        attendance_date: attRecord.attendance_date,
        device_id: attRecord.device_id || 'GATE_SCANNER',
      },
    };
  }

  /**
   * Get attendance calendar history for an individual student (for parent/student view)
   */
  async getStudentHistory(
    studentId: string,
    month?: number,
    year?: number
  ): Promise<{
    student_id: string;
    total_days: number;
    present_days: number;
    absent_days: number;
    late_days: number;
    half_days: number;
    leave_days: number;
    attendance_percentage: number;
    records: AttendanceRecord[];
  }> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      let query = supabaseAdmin
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('attendance_date', { ascending: false });

      if (month && year) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        query = query.gte('attendance_date', startDate).lte('attendance_date', endDate);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Failed to load student attendance history: ${error.message}`);
      }

      const records = data || [];
      const presentDays = records.filter((r: any) => r.status === 'PRESENT').length;
      const lateDays = records.filter((r: any) => r.status === 'LATE').length;
      const halfDays = records.filter((r: any) => r.status === 'HALF_DAY').length;
      const absentDays = records.filter((r: any) => r.status === 'ABSENT').length;
      const leaveDays = records.filter((r: any) => r.status === 'LEAVE').length;

      const effectivePresent = presentDays + lateDays + halfDays * 0.5;
      const percentage = records.length > 0 ? Math.round((effectivePresent / records.length) * 100) : 100;

      return {
        student_id: studentId,
        total_days: records.length,
        present_days: presentDays,
        absent_days: absentDays,
        late_days: lateDays,
        half_days: halfDays,
        leave_days: leaveDays,
        attendance_percentage: percentage,
        records,
      };
    }

    // In-memory mode
    const records = memoryDb.attendance.filter((a) => a.student_id === studentId);
    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const lateDays = records.filter((r) => r.status === 'LATE').length;
    const halfDays = records.filter((r) => r.status === 'HALF_DAY').length;
    const absentDays = records.filter((r) => r.status === 'ABSENT').length;
    const leaveDays = records.filter((r) => r.status === 'LEAVE').length;

    const effectivePresent = presentDays + lateDays + halfDays * 0.5;
    const percentage = records.length > 0 ? Math.round((effectivePresent / records.length) * 100) : 100;

    return {
      student_id: studentId,
      total_days: records.length,
      present_days: presentDays,
      absent_days: absentDays,
      late_days: lateDays,
      half_days: halfDays,
      leave_days: leaveDays,
      attendance_percentage: percentage,
      records,
    };
  }

  /**
   * Get high-level attendance statistics for a given date across the whole school
   */
  async getDailyStats(date: string): Promise<AttendanceDailyStats> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      // Count total active enrolled students
      const { count: totalEnrolled } = await supabaseAdmin
        .from('student_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      const { data: records } = await supabaseAdmin
        .from('attendance')
        .select('status')
        .eq('attendance_date', date);

      const list = records || [];
      const present = list.filter((r: any) => r.status === 'PRESENT').length;
      const absent = list.filter((r: any) => r.status === 'ABSENT').length;
      const late = list.filter((r: any) => r.status === 'LATE').length;
      const halfDay = list.filter((r: any) => r.status === 'HALF_DAY').length;
      const leave = list.filter((r: any) => r.status === 'LEAVE').length;

      const totalStudents = totalEnrolled || list.length || 0;
      const effectivePresent = present + late + halfDay * 0.5;
      const percentage = totalStudents > 0 ? Math.round((effectivePresent / totalStudents) * 100) : 0;

      return {
        date,
        total_students: totalStudents,
        present,
        absent,
        late,
        half_day: halfDay,
        leave,
        percentage,
      };
    }

    // In-memory mode
    const totalStudents = memoryDb.studentEnrollments.filter((e) => e.status === 'ACTIVE').length;
    const list = memoryDb.attendance.filter((a) => a.attendance_date === date);
    const present = list.filter((r) => r.status === 'PRESENT').length;
    const absent = list.filter((r) => r.status === 'ABSENT').length;
    const late = list.filter((r) => r.status === 'LATE').length;
    const halfDay = list.filter((r) => r.status === 'HALF_DAY').length;
    const leave = list.filter((r) => r.status === 'LEAVE').length;

    const effectivePresent = present + late + halfDay * 0.5;
    const percentage = totalStudents > 0 ? Math.round((effectivePresent / totalStudents) * 100) : 0;

    return {
      date,
      total_students: totalStudents,
      present,
      absent,
      late,
      half_day: halfDay,
      leave,
      percentage,
    };
  }
}

export const attendanceService = new AttendanceService();
