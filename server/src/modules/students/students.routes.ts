/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import multer from 'multer';
import { studentsController } from './students.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Student Core Endpoints
router.get('/', authenticateToken, requirePermission('students.read'), (req, res) =>
  studentsController.getStudents(req, res)
);

router.get('/:id', authenticateToken, requirePermission('students.read'), (req, res) =>
  studentsController.getStudentById(req, res)
);

router.post('/', authenticateToken, requirePermission('students.create'), (req, res) =>
  studentsController.createStudent(req, res)
);

router.put('/:id', authenticateToken, requirePermission('students.update'), (req, res) =>
  studentsController.updateStudent(req, res)
);

router.patch('/:id/status', authenticateToken, requirePermission('students.update'), (req, res) =>
  studentsController.updateStatus(req, res)
);

router.delete('/:id', authenticateToken, requirePermission('students.delete'), (req, res) =>
  studentsController.archiveStudent(req, res)
);

// Student Photo Upload
router.post(
  '/:id/photo',
  authenticateToken,
  requirePermission('students.update'),
  upload.single('photo'),
  (req, res) => studentsController.uploadPhoto(req, res)
);

// Student Documents
router.get('/:id/documents', authenticateToken, requirePermission('documents.read'), (req, res) =>
  studentsController.getDocuments(req, res)
);

router.post(
  '/:id/documents',
  authenticateToken,
  requirePermission('documents.create'),
  upload.single('document'),
  (req, res) => studentsController.uploadDocument(req, res)
);

router.delete(
  '/:id/documents/:documentId',
  authenticateToken,
  requirePermission('documents.delete'),
  (req, res) => studentsController.deleteDocument(req, res)
);

// Student ↔ Parent links
router.get('/:id/parents', authenticateToken, requirePermission('parents.read'), (req, res) =>
  studentsController.getStudentParents(req, res)
);

router.post('/:id/parents', authenticateToken, requirePermission('parents.create'), (req, res) =>
  studentsController.linkParent(req, res)
);

router.delete('/:id/parents/:parentId', authenticateToken, requirePermission('parents.delete'), (req, res) =>
  studentsController.unlinkParent(req, res)
);

// Student Enrollments
router.get('/:id/enrollments', authenticateToken, requirePermission('enrollment.read'), (req, res) =>
  studentsController.getStudentEnrollments(req, res)
);

router.post('/:id/enrollments', authenticateToken, requirePermission('enrollment.create'), (req, res) =>
  studentsController.createEnrollment(req, res)
);

export default router;
