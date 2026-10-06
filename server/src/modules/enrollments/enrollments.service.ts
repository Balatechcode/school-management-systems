/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { isMissingTableError } from '../../utils/supabaseFallback.js';
import { StudentEnrollment, EnrollmentStatus } from '../../types/index.js';
import { Request } from 'express';

export class EnrollmentsService {
  async getStudentEnrollments(studentId: string): Promise<StudentEnrollment[]> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('student_enrollments')
        .select(`
          *,
          academic_year:academic_year_id (*),
          school_class:class_id (*),
          section:section_id (*)
        `)
        .eq('student_id', studentId)
        .order('enrollment_date', { ascending: false });

      if (error) {
        if (isMissingTableError(error)) {
          console.warn('Live Supabase table public.student_enrollments missing. Using in-memory store.');
        } else {
          throw new Error(error.message);
        }
      } else {
        return data || [];
      }
    }

    return memoryDb.studentEnrollments
      .filter((e) => e.student_id === studentId)
      .map((e) => ({
        ...e,
        academic_year: memoryDb.academicYears.find((ay) => ay.id === e.academic_year_id),
        school_class: memoryDb.classes.find((c) => c.id === e.class_id),
        section: memoryDb.sections.find((s) => s.id === e.section_id),
      }))
      .sort((a, b) => b.enrollment_date.localeCompare(a.enrollment_date));
  }

  async getEnrollmentById(id: string): Promise<StudentEnrollment | null> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('student_enrollments')
        .select(`
          *,
          academic_year:academic_year_id (*),
          school_class:class_id (*),
          section:section_id (*)
        `)
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return data;
    }

    const e = memoryDb.studentEnrollments.find((enr) => enr.id === id);
    if (!e) return null;
    return {
      ...e,
      academic_year: memoryDb.academicYears.find((ay) => ay.id === e.academic_year_id),
      school_class: memoryDb.classes.find((c) => c.id === e.class_id),
      section: memoryDb.sections.find((s) => s.id === e.section_id),
    };
  }

  async createEnrollment(
    payload: {
      student_id: string;
      academic_year_id: string;
      class_id: string;
      section_id: string;
      roll_number: string;
      enrollment_date?: string;
      status?: EnrollmentStatus;
      promotion_status?: string;
    },
    req: Request
  ): Promise<StudentEnrollment> {
    const actor = req.user;

    // Check unique roll number within session + class + section
    await this.validateRollNumber(
      payload.academic_year_id,
      payload.class_id,
      payload.section_id,
      payload.roll_number
    );

    if (isUsingLiveSupabase() && supabaseAdmin) {
      // Check existing active enrollment for student in same year
      const { count } = await supabaseAdmin
        .from('student_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', payload.student_id)
        .eq('academic_year_id', payload.academic_year_id);

      if (count && count > 0) {
        throw new Error('A student already has an enrollment for this academic year.');
      }

      const { data, error } = await supabaseAdmin
        .from('student_enrollments')
        .insert([
          {
            student_id: payload.student_id,
            academic_year_id: payload.academic_year_id,
            class_id: payload.class_id,
            section_id: payload.section_id,
            roll_number: payload.roll_number.trim(),
            enrollment_date: payload.enrollment_date || new Date().toISOString().split('T')[0],
            status: payload.status || 'ACTIVE',
            promotion_status: payload.promotion_status || null,
          },
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);

      await createAuditLog({
        userId: actor?.id,
        username: actor?.username,
        action: 'CREATE_STUDENT_ENROLLMENT',
        entityType: 'ENROLLMENT',
        entityId: data.id,
        newValues: payload,
        req,
      });

      return (await this.getEnrollmentById(data.id))!;
    }

    // Memory DB
    const existing = memoryDb.studentEnrollments.find(
      (e) => e.student_id === payload.student_id && e.academic_year_id === payload.academic_year_id
    );
    if (existing) {
      throw new Error('A student already has an enrollment for this academic year.');
    }

    const newEnr: StudentEnrollment = {
      id: `enr-${Date.now()}`,
      student_id: payload.student_id,
      academic_year_id: payload.academic_year_id,
      class_id: payload.class_id,
      section_id: payload.section_id,
      roll_number: payload.roll_number.trim(),
      enrollment_date: payload.enrollment_date || new Date().toISOString().split('T')[0],
      status: payload.status || 'ACTIVE',
      promotion_status: payload.promotion_status || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryDb.studentEnrollments.push(newEnr);

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'CREATE_STUDENT_ENROLLMENT',
      entityType: 'ENROLLMENT',
      entityId: newEnr.id,
      newValues: payload,
      req,
    });

    return (await this.getEnrollmentById(newEnr.id))!;
  }

  async updateEnrollment(id: string, payload: Partial<StudentEnrollment>, req: Request): Promise<StudentEnrollment> {
    const actor = req.user;
    const existing = await this.getEnrollmentById(id);
    if (!existing) throw new Error('Enrollment record not found');

    if (payload.roll_number && payload.roll_number !== existing.roll_number) {
      await this.validateRollNumber(
        payload.academic_year_id || existing.academic_year_id,
        payload.class_id || existing.class_id,
        payload.section_id || existing.section_id,
        payload.roll_number,
        id
      );
    }

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('student_enrollments')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await createAuditLog({
        userId: actor?.id,
        username: actor?.username,
        action: 'UPDATE_STUDENT_ENROLLMENT',
        entityType: 'ENROLLMENT',
        entityId: id,
        oldValues: existing,
        newValues: payload,
        req,
      });

      return (await this.getEnrollmentById(id))!;
    }

    const idx = memoryDb.studentEnrollments.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Enrollment not found');

    memoryDb.studentEnrollments[idx] = {
      ...memoryDb.studentEnrollments[idx],
      ...payload,
      updated_at: new Date().toISOString(),
    };

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'UPDATE_STUDENT_ENROLLMENT',
      entityType: 'ENROLLMENT',
      entityId: id,
      oldValues: existing,
      newValues: payload,
      req,
    });

    return (await this.getEnrollmentById(id))!;
  }

  async updateStatus(id: string, status: EnrollmentStatus, promotionStatus?: string, req?: Request): Promise<StudentEnrollment> {
    const updates: Partial<StudentEnrollment> = { status };
    if (promotionStatus !== undefined) updates.promotion_status = promotionStatus;
    return this.updateEnrollment(id, updates, req!);
  }

  /**
   * Promotes a student from their previous academic year/class to a new academic year/class/section.
   * NEVER overwrites old enrollment record: marks old as PROMOTED and creates a new ACTIVE record.
   */
  async promoteStudent(
    studentId: string,
    currentEnrollmentId: string,
    newEnrollment: {
      academic_year_id: string;
      class_id: string;
      section_id: string;
      roll_number: string;
      promotion_status?: string;
    },
    req: Request
  ): Promise<{ oldEnrollment: StudentEnrollment; newEnrollment: StudentEnrollment }> {
    // 1. Mark existing enrollment as PROMOTED
    const old = await this.updateStatus(
      currentEnrollmentId,
      'PROMOTED',
      newEnrollment.promotion_status || 'Promoted to next class',
      req
    );

    // 2. Create brand-new enrollment record for the new session
    const created = await this.createEnrollment(
      {
        student_id: studentId,
        academic_year_id: newEnrollment.academic_year_id,
        class_id: newEnrollment.class_id,
        section_id: newEnrollment.section_id,
        roll_number: newEnrollment.roll_number,
        status: 'ACTIVE',
      },
      req
    );

    return { oldEnrollment: old, newEnrollment: created };
  }

  private async validateRollNumber(
    academicYearId: string,
    classId: string,
    sectionId: string,
    rollNumber: string,
    excludeEnrollmentId?: string
  ) {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      let query = supabaseAdmin
        .from('student_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('academic_year_id', academicYearId)
        .eq('class_id', classId)
        .eq('section_id', sectionId)
        .eq('roll_number', rollNumber.trim());

      if (excludeEnrollmentId) {
        query = query.neq('id', excludeEnrollmentId);
      }

      const { count } = await query;
      if (count && count > 0) {
        throw new Error(`Roll number ${rollNumber} is already assigned in this class and section.`);
      }
      return;
    }

    const duplicate = memoryDb.studentEnrollments.find(
      (e) =>
        e.academic_year_id === academicYearId &&
        e.class_id === classId &&
        e.section_id === sectionId &&
        e.roll_number === rollNumber.trim() &&
        e.id !== excludeEnrollmentId
    );

    if (duplicate) {
      throw new Error(`Roll number ${rollNumber} is already assigned in this class and section.`);
    }
  }
}

export const enrollmentsService = new EnrollmentsService();
