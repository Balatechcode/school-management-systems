/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { isUsingLiveSupabase, memoryDb } from '../../db/store.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { cloudinaryService } from '../../utils/cloudinary.service.js';
import { generateAdmissionNumber } from '../../utils/admissionNumber.js';
import { isMissingTableError } from '../../utils/supabaseFallback.js';
import {
  Student,
  Parent,
  StudentWithDetails,
  StudentStatus,
  StudentEnrollment,
  StudentParentRelationship,
  StudentDocument,
  PaginatedResponse,
} from '../../types/index.js';
import { Request } from 'express';

export interface StudentQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: StudentStatus;
  classId?: string;
  sectionId?: string;
  academicYearId?: string;
  sortBy?: 'name' | 'admission_number' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export class StudentsService {
  async getStudents(options: StudentQueryOptions): Promise<PaginatedResponse<StudentWithDetails>> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      // Step 1: Base query for students (ignoring soft-deleted)
      let query = supabaseAdmin
        .from('students')
        .select(`
          *,
          student_enrollments (
            id, roll_number, status, promotion_status, enrollment_date,
            academic_year:academic_year_id (*),
            school_class:class_id (*),
            section:section_id (*)
          ),
          student_parents (
            relationship, is_primary, is_emergency, can_pickup,
            parent:parent_id (*)
          )
        `, { count: 'exact' })
        .is('deleted_at', null);

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.search) {
        const s = options.search.trim();
        query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,admission_number.ilike.%${s}%,phone.ilike.%${s}%`);
      }

      // Order
      const sortCol = options.sortBy === 'name' ? 'first_name' : options.sortBy === 'admission_number' ? 'admission_number' : 'created_at';
      query = query.order(sortCol, { ascending: options.sortOrder === 'asc' });

      // Range for pagination
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) {
        if (isMissingTableError(error)) {
          console.warn('Supabase table public.students not detected. Falling back to in-memory store.');
        } else {
          throw new Error(error.message);
        }
      } else {
        let studentsFormatted = (data || []).map((s: any) => {
          const enrollments: StudentEnrollment[] = (s.student_enrollments || []).map((e: any) => ({
            ...e,
            academic_year: e.academic_year,
            school_class: e.school_class,
            section: e.section,
          }));

          // Current active enrollment
          const currentEnrollment = enrollments.find((e) => e.status === 'ACTIVE') || enrollments[0] || null;

          return {
            ...s,
            current_enrollment: currentEnrollment,
            enrollments,
            parents: s.student_parents || [],
          };
        });

        // Filter by classId/sectionId/academicYearId in memory if joined criteria provided
        if (options.classId || options.sectionId || options.academicYearId) {
          studentsFormatted = studentsFormatted.filter((s) => {
            const ce = s.current_enrollment;
            if (!ce) return false;
            if (options.classId && ce.class_id !== options.classId) return false;
            if (options.sectionId && ce.section_id !== options.sectionId) return false;
            if (options.academicYearId && ce.academic_year_id !== options.academicYearId) return false;
            return true;
          });
        }

        const total = count || studentsFormatted.length;
        const total_pages = Math.ceil(total / limit) || 1;

        return {
          data: studentsFormatted,
          pagination: {
            page,
            limit,
            total,
            total_pages,
            totalPages: total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
          },
        };
      }
    }

    // Local Memory Store implementation
    let list = memoryDb.students.filter((s) => !s.deleted_at);

    if (options.status) {
      list = list.filter((s) => s.status === options.status);
    }

    if (options.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          s.admission_number.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q))
      );
    }

    let enriched = list.map((s) => {
      const enrollments = memoryDb.studentEnrollments
        .filter((e) => e.student_id === s.id)
        .map((e) => ({
          ...e,
          academic_year: memoryDb.academicYears.find((ay) => ay.id === e.academic_year_id),
          school_class: memoryDb.classes.find((c) => c.id === e.class_id),
          section: memoryDb.sections.find((sec) => sec.id === e.section_id),
        }));

      const currentEnrollment = enrollments.find((e) => e.status === 'ACTIVE') || enrollments[0] || null;

      const studentParents = memoryDb.studentParents
        .filter((sp) => sp.student_id === s.id)
        .map((sp) => ({
          ...sp,
          parent: memoryDb.parents.find((p) => p.id === sp.parent_id)!,
        }))
        .filter((sp) => Boolean(sp.parent));

      return {
        ...s,
        current_enrollment: currentEnrollment,
        enrollments,
        parents: studentParents,
      };
    });

    if (options.classId || options.sectionId || options.academicYearId) {
      enriched = enriched.filter((s) => {
        const ce = s.current_enrollment;
        if (!ce) return false;
        if (options.classId && ce.class_id !== options.classId) return false;
        if (options.sectionId && ce.section_id !== options.sectionId) return false;
        if (options.academicYearId && ce.academic_year_id !== options.academicYearId) return false;
        return true;
      });
    }

    const total = enriched.length;
    const paginated = enriched.slice(offset, offset + limit);
    const total_pages = Math.ceil(total / limit) || 1;

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        total_pages,
        totalPages: total_pages,
        has_next: page < total_pages,
        has_prev: page > 1,
      },
    };
  }

  async getStudentById(id: string): Promise<StudentWithDetails | null> {
    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data: student, error } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !student) return null;

      // Enrollments
      const { data: enrollments } = await supabaseAdmin
        .from('student_enrollments')
        .select(`
          *,
          academic_year:academic_year_id (*),
          school_class:class_id (*),
          section:section_id (*)
        `)
        .eq('student_id', id)
        .order('enrollment_date', { ascending: false });

      // Parents
      const { data: studentParents } = await supabaseAdmin
        .from('student_parents')
        .select(`
          *,
          parent:parent_id (*)
        `)
        .eq('student_id', id);

      // Documents
      const { data: documents } = await supabaseAdmin
        .from('student_documents')
        .select('*')
        .eq('student_id', id)
        .order('uploaded_at', { ascending: false });

      const currentEnrollment = (enrollments || []).find((e: any) => e.status === 'ACTIVE') || (enrollments || [])[0] || null;

      return {
        ...student,
        current_enrollment: currentEnrollment,
        enrollments: enrollments || [],
        parents: studentParents || [],
        documents: documents || [],
      };
    }

    const student = memoryDb.students.find((s) => s.id === id && !s.deleted_at);
    if (!student) return null;

    const enrollments = memoryDb.studentEnrollments
      .filter((e) => e.student_id === id)
      .map((e) => ({
        ...e,
        academic_year: memoryDb.academicYears.find((ay) => ay.id === e.academic_year_id),
        school_class: memoryDb.classes.find((c) => c.id === e.class_id),
        section: memoryDb.sections.find((sec) => sec.id === e.section_id),
      }));

    const currentEnrollment = enrollments.find((e) => e.status === 'ACTIVE') || enrollments[0] || null;

    const parents = memoryDb.studentParents
      .filter((sp) => sp.student_id === id)
      .map((sp) => ({
        ...sp,
        parent: memoryDb.parents.find((p) => p.id === sp.parent_id)!,
      }))
      .filter((sp) => Boolean(sp.parent));

    const documents = memoryDb.studentDocuments.filter((d) => d.student_id === id);

    return {
      ...student,
      current_enrollment: currentEnrollment,
      enrollments,
      parents,
      documents,
    };
  }

  async createStudent(
    payload: {
      student: Omit<Student, 'id' | 'created_at' | 'updated_at' | 'admission_number'> & {
        admission_number?: string;
      };
      enrollment?: {
        academic_year_id: string;
        class_id: string;
        section_id: string;
        roll_number: string;
      };
      parent?: {
        first_name: string;
        last_name: string;
        phone: string;
        email?: string;
        occupation?: string;
        relationship: string;
      };
    },
    req: Request
  ): Promise<StudentWithDetails> {
    const actor = req.user;

    // Generate unique admission number server-side if not supplied
    const admissionNumber = payload.student.admission_number?.trim() || (await generateAdmissionNumber());

    if (isUsingLiveSupabase() && supabaseAdmin) {
      // 1. Insert Student
      const { data: newStudent, error: sError } = await supabaseAdmin
        .from('students')
        .insert([
          {
            ...payload.student,
            admission_number: admissionNumber,
            status: payload.student.status || 'ACTIVE',
          },
        ])
        .select()
        .single();

      if (sError) {
        if (isMissingTableError(sError)) {
          console.warn('Live Supabase table public.students missing. Falling back to in-memory store.');
        } else {
          throw new Error(`Failed to create student: ${sError.message}`);
        }
      } else {
        // 2. Insert Enrollment if provided
        if (payload.enrollment) {
          await supabaseAdmin.from('student_enrollments').insert([
            {
              student_id: newStudent.id,
              academic_year_id: payload.enrollment.academic_year_id,
              class_id: payload.enrollment.class_id,
              section_id: payload.enrollment.section_id,
              roll_number: payload.enrollment.roll_number.trim(),
              status: 'ACTIVE',
            },
          ]);
        }

        // 3. Insert and Link Parent if provided
        if (payload.parent) {
          const { data: newParent } = await supabaseAdmin
            .from('parents')
            .insert([
              {
                first_name: payload.parent.first_name.trim(),
                last_name: payload.parent.last_name.trim(),
                phone: payload.parent.phone.trim(),
                email: payload.parent.email?.trim() || null,
                occupation: payload.parent.occupation?.trim() || null,
              },
            ])
            .select()
            .single();

          if (newParent) {
            await supabaseAdmin.from('student_parents').insert([
              {
                student_id: newStudent.id,
                parent_id: newParent.id,
                relationship: payload.parent.relationship || 'Guardian',
                is_primary: true,
                is_emergency: true,
                can_pickup: true,
              },
            ]);
          }
        }

        await createAuditLog({
          userId: actor?.id,
          username: actor?.username,
          action: 'CREATE_STUDENT',
          entityType: 'STUDENT',
          entityId: newStudent.id,
          newValues: {
            admission_number: admissionNumber,
            name: `${payload.student.first_name} ${payload.student.last_name}`,
          },
          req,
        });

        return (await this.getStudentById(newStudent.id))!;
      }
    }

    // Memory Store implementation
    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      ...payload.student,
      admission_number: admissionNumber,
      status: payload.student.status || 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryDb.students.unshift(newStudent);

    if (payload.enrollment) {
      memoryDb.studentEnrollments.push({
        id: `enr-${Date.now()}`,
        student_id: newStudent.id,
        academic_year_id: payload.enrollment.academic_year_id,
        class_id: payload.enrollment.class_id,
        section_id: payload.enrollment.section_id,
        roll_number: payload.enrollment.roll_number.trim(),
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    if (payload.parent) {
      const newParent: Parent = {
        id: `par-${Date.now()}`,
        first_name: payload.parent.first_name.trim(),
        last_name: payload.parent.last_name.trim(),
        phone: payload.parent.phone.trim(),
        email: payload.parent.email?.trim() || null,
        occupation: payload.parent.occupation?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryDb.parents.push(newParent);

      memoryDb.studentParents.push({
        student_id: newStudent.id,
        parent_id: newParent.id,
        relationship: payload.parent.relationship || 'Guardian',
        is_primary: true,
        is_emergency: true,
        can_pickup: true,
        created_at: new Date().toISOString(),
      });
    }

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'CREATE_STUDENT',
      entityType: 'STUDENT',
      entityId: newStudent.id,
      newValues: {
        admission_number: admissionNumber,
        name: `${payload.student.first_name} ${payload.student.last_name}`,
      },
      req,
    });

    return (await this.getStudentById(newStudent.id))!;
  }

  async updateStudent(id: string, payload: Partial<Student>, req: Request): Promise<StudentWithDetails> {
    const actor = req.user;
    const existing = await this.getStudentById(id);
    if (!existing) throw new Error('Student not found');

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('students')
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
        action: 'UPDATE_STUDENT',
        entityType: 'STUDENT',
        entityId: id,
        oldValues: existing,
        newValues: payload,
        req,
      });

      return (await this.getStudentById(id))!;
    }

    const index = memoryDb.students.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Student not found');

    memoryDb.students[index] = {
      ...memoryDb.students[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'UPDATE_STUDENT',
      entityType: 'STUDENT',
      entityId: id,
      oldValues: existing,
      newValues: payload,
      req,
    });

    return (await this.getStudentById(id))!;
  }

  async updateStatus(id: string, status: StudentStatus, req: Request): Promise<StudentWithDetails> {
    return this.updateStudent(id, { status }, req);
  }

  async archiveStudent(id: string, req: Request): Promise<{ archived: boolean }> {
    const actor = req.user;
    const existing = await this.getStudentById(id);
    if (!existing) throw new Error('Student not found');

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('students')
        .update({
          status: 'INACTIVE',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    } else {
      const index = memoryDb.students.findIndex((s) => s.id === id);
      if (index !== -1) {
        memoryDb.students[index].status = 'INACTIVE';
        memoryDb.students[index].deleted_at = new Date().toISOString();
      }
    }

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'ARCHIVE_STUDENT',
      entityType: 'STUDENT',
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: 'INACTIVE', deleted_at: new Date().toISOString() },
      req,
    });

    return { archived: true };
  }

  async uploadPhoto(id: string, fileBuffer: Buffer, req: Request): Promise<StudentWithDetails> {
    const actor = req.user;
    const existing = await this.getStudentById(id);
    if (!existing) throw new Error('Student not found');

    // Delete previous Cloudinary image if it exists
    if (existing.photo_public_id) {
      await cloudinaryService.deleteAsset(existing.photo_public_id, 'image');
    }

    const { url, public_id } = await cloudinaryService.uploadImage(fileBuffer, 'school-management/students');

    return this.updateStudent(id, { photo_url: url, photo_public_id: public_id }, req);
  }

  async uploadDocument(
    studentId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    documentType: string,
    req: Request
  ): Promise<StudentDocument> {
    const actor = req.user;
    const student = await this.getStudentById(studentId);
    if (!student) throw new Error('Student not found');

    const { url, public_id } = await cloudinaryService.uploadDocument(
      fileBuffer,
      originalFilename,
      'school-management/student-documents'
    );

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('student_documents')
        .insert([
          {
            student_id: studentId,
            document_type: documentType.trim(),
            document_name: originalFilename,
            file_url: url,
            file_public_id: public_id,
            uploaded_by: actor?.id || null,
          },
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);

      await createAuditLog({
        userId: actor?.id,
        username: actor?.username,
        action: 'UPLOAD_STUDENT_DOCUMENT',
        entityType: 'STUDENT_DOCUMENT',
        entityId: data.id,
        newValues: { student_id: studentId, document_type: documentType, document_name: originalFilename },
        req,
      });

      return data;
    }

    const newDoc: StudentDocument = {
      id: `doc-${Date.now()}`,
      student_id: studentId,
      document_type: documentType.trim(),
      document_name: originalFilename,
      file_url: url,
      file_public_id: public_id,
      uploaded_by: actor?.id || null,
      uploaded_at: new Date().toISOString(),
    };
    memoryDb.studentDocuments.push(newDoc);

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'UPLOAD_STUDENT_DOCUMENT',
      entityType: 'STUDENT_DOCUMENT',
      entityId: newDoc.id,
      newValues: { student_id: studentId, document_type: documentType, document_name: originalFilename },
      req,
    });

    return newDoc;
  }

  async deleteDocument(studentId: string, documentId: string, req: Request): Promise<{ deleted: boolean }> {
    const actor = req.user;

    if (isUsingLiveSupabase() && supabaseAdmin) {
      const { data: doc } = await supabaseAdmin
        .from('student_documents')
        .select('*')
        .eq('id', documentId)
        .eq('student_id', studentId)
        .single();

      if (doc?.file_public_id) {
        await cloudinaryService.deleteAsset(doc.file_public_id, 'raw');
      }

      const { error } = await supabaseAdmin
        .from('student_documents')
        .delete()
        .eq('id', documentId)
        .eq('student_id', studentId);

      if (error) throw new Error(error.message);
    } else {
      const doc = memoryDb.studentDocuments.find((d) => d.id === documentId && d.student_id === studentId);
      if (doc?.file_public_id) {
        await cloudinaryService.deleteAsset(doc.file_public_id, 'raw');
      }
      memoryDb.studentDocuments = memoryDb.studentDocuments.filter((d) => d.id !== documentId);
    }

    await createAuditLog({
      userId: actor?.id,
      username: actor?.username,
      action: 'DELETE_STUDENT_DOCUMENT',
      entityType: 'STUDENT_DOCUMENT',
      entityId: documentId,
      newValues: { student_id: studentId },
      req,
    });

    return { deleted: true };
  }
}

export const studentsService = new StudentsService();
