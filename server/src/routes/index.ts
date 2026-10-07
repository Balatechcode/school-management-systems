/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import rolesRoutes from '../modules/roles/roles.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';
import auditRoutes from '../modules/audit/audit.routes.js';
import academicYearsRoutes from '../modules/academic-years/academic-years.routes.js';
import classesRoutes from '../modules/classes/classes.routes.js';
import sectionsRoutes from '../modules/sections/sections.routes.js';
import studentsRoutes from '../modules/students/students.routes.js';
import parentsRoutes from '../modules/parents/parents.routes.js';
import enrollmentsRoutes from '../modules/enrollments/enrollments.routes.js';
import appVersionRoutes from '../modules/app-version/app-version.routes.js';
import attendanceRoutes from '../modules/attendance/attendance.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/roles', rolesRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/audit-logs', auditRoutes);

// Part 2 Endpoints
apiRouter.use('/academic-years', academicYearsRoutes);
apiRouter.use('/classes', classesRoutes);
apiRouter.use('/sections', sectionsRoutes);
apiRouter.use('/students', studentsRoutes);
apiRouter.use('/parents', parentsRoutes);
apiRouter.use('/enrollments', enrollmentsRoutes);

// Part 4 Attendance Module
apiRouter.use('/attendance', attendanceRoutes);

// Mobile App Management & Force-Update Endpoint
apiRouter.use('/app', appVersionRoutes);

// Health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'EduCore Single-School Management System API',
    version: '1.0.0',
  });
});

export default apiRouter;
