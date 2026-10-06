/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { studentsService } from './students.service.js';
import { parentsService } from '../parents/parents.service.js';
import { enrollmentsService } from '../enrollments/enrollments.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { StudentSchema } from '../../utils/validation.js';

export class StudentsController {
  async getStudents(req: Request, res: Response) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string;
      const status = req.query.status as any;
      const classId = req.query.classId as string;
      const sectionId = req.query.sectionId as string;
      const academicYearId = req.query.academicYearId as string;
      const sortBy = req.query.sortBy as any;
      const sortOrder = req.query.sortOrder as any;

      const result = await studentsService.getStudents({
        page,
        limit,
        search,
        status,
        classId,
        sectionId,
        academicYearId,
        sortBy,
        sortOrder,
      });

      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async getStudentById(req: Request, res: Response) {
    try {
      const student = await studentsService.getStudentById(req.params.id);
      if (!student) return sendError(res, 'Student not found', 'NOT_FOUND', 404);
      return sendSuccess(res, student);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async createStudent(req: Request, res: Response) {
    try {
      const { student, enrollment, parent } = req.body;
      const studentData = student || req.body;

      const parsed = StudentSchema.safeParse(studentData);
      if (!parsed.success) {
        return sendError(res, parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
      }

      const created = await studentsService.createStudent(
        {
          student: parsed.data as any,
          enrollment,
          parent,
        },
        req
      );

      return sendSuccess(res, created, 'Student created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 'CREATE_ERROR', 400);
    }
  }

  async updateStudent(req: Request, res: Response) {
    try {
      const updated = await studentsService.updateStudent(req.params.id, req.body, req);
      return sendSuccess(res, updated, 'Student updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'UPDATE_ERROR', 400);
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      if (!['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'PASSED_OUT', 'LEFT'].includes(status)) {
        return sendError(res, 'Invalid student status', 'VALIDATION_ERROR', 400);
      }
      const updated = await studentsService.updateStatus(req.params.id, status, req);
      return sendSuccess(res, updated, `Student status updated to ${status}`);
    } catch (err: any) {
      return sendError(res, err.message, 'STATUS_ERROR', 400);
    }
  }

  async archiveStudent(req: Request, res: Response) {
    try {
      const result = await studentsService.archiveStudent(req.params.id, req);
      return sendSuccess(res, result, 'Student record archived');
    } catch (err: any) {
      return sendError(res, err.message, 'ARCHIVE_ERROR', 400);
    }
  }

  async uploadPhoto(req: Request, res: Response) {
    try {
      if (!req.file) {
        return sendError(res, 'Image file is required', 'VALIDATION_ERROR', 400);
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        return sendError(res, 'Only JPEG, PNG, or WEBP images are allowed', 'INVALID_FILE_TYPE', 400);
      }

      // Max 5MB
      if (req.file.size > 5 * 1024 * 1024) {
        return sendError(res, 'Photo size must not exceed 5MB', 'FILE_TOO_LARGE', 400);
      }

      const updated = await studentsService.uploadPhoto(req.params.id, req.file.buffer, req);
      return sendSuccess(res, updated, 'Student photo uploaded successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'PHOTO_UPLOAD_ERROR', 400);
    }
  }

  // Documents
  async getDocuments(req: Request, res: Response) {
    try {
      const student = await studentsService.getStudentById(req.params.id);
      if (!student) return sendError(res, 'Student not found', 'NOT_FOUND', 404);
      return sendSuccess(res, student.documents || []);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async uploadDocument(req: Request, res: Response) {
    try {
      if (!req.file) {
        return sendError(res, 'Document file is required', 'VALIDATION_ERROR', 400);
      }

      const documentType = req.body.document_type || 'General Document';
      const originalName = req.file.originalname || 'document.pdf';

      const doc = await studentsService.uploadDocument(
        req.params.id,
        req.file.buffer,
        originalName,
        documentType,
        req
      );

      return sendSuccess(res, doc, 'Document uploaded successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 'DOCUMENT_UPLOAD_ERROR', 400);
    }
  }

  async deleteDocument(req: Request, res: Response) {
    try {
      const result = await studentsService.deleteDocument(req.params.id, req.params.documentId, req);
      return sendSuccess(res, result, 'Document deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'DOCUMENT_DELETE_ERROR', 400);
    }
  }

  // Parents linked to student
  async getStudentParents(req: Request, res: Response) {
    try {
      const parents = await parentsService.getStudentParents(req.params.id);
      return sendSuccess(res, parents);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async linkParent(req: Request, res: Response) {
    try {
      const { parent_id, relationship, is_primary, is_emergency, can_pickup } = req.body;
      if (!parent_id || !relationship) {
        return sendError(res, 'parent_id and relationship are required', 'VALIDATION_ERROR', 400);
      }
      const linked = await parentsService.linkStudentParent(
        req.params.id,
        parent_id,
        { relationship, is_primary, is_emergency, can_pickup },
        req
      );
      return sendSuccess(res, linked, 'Parent linked to student successfully');
    } catch (err: any) {
      return sendError(res, err.message, 'LINK_PARENT_ERROR', 400);
    }
  }

  async unlinkParent(req: Request, res: Response) {
    try {
      const result = await parentsService.unlinkStudentParent(req.params.id, req.params.parentId, req);
      return sendSuccess(res, result, 'Parent unlinked from student');
    } catch (err: any) {
      return sendError(res, err.message, 'UNLINK_PARENT_ERROR', 400);
    }
  }

  // Enrollments for student
  async getStudentEnrollments(req: Request, res: Response) {
    try {
      const enrollments = await enrollmentsService.getStudentEnrollments(req.params.id);
      return sendSuccess(res, enrollments);
    } catch (err: any) {
      return sendError(res, err.message, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  async createEnrollment(req: Request, res: Response) {
    try {
      const { academic_year_id, class_id, section_id, roll_number, enrollment_date, status } = req.body;
      if (!academic_year_id || !class_id || !section_id || !roll_number) {
        return sendError(res, 'academic_year_id, class_id, section_id, and roll_number are required', 'VALIDATION_ERROR', 400);
      }

      const created = await enrollmentsService.createEnrollment(
        {
          student_id: req.params.id,
          academic_year_id,
          class_id,
          section_id,
          roll_number,
          enrollment_date,
          status,
        },
        req
      );

      return sendSuccess(res, created, 'Student enrolled successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 'ENROLLMENT_ERROR', 400);
    }
  }
}

export const studentsController = new StudentsController();
