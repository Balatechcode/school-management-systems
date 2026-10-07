/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  Role,
  Permission,
  SchoolSettings,
  AuditLog,
  AcademicYear,
  SchoolClass,
  Section,
  Student,
  Parent,
  StudentParentRelationship,
  StudentEnrollment,
  StudentDocument,
  MobileAppVersion,
  AttendanceRecord,
} from '../types/index.js';
import { supabaseAdmin } from '../config/supabase.js';
import { ENV } from '../config/env.js';

// Pre-defined system roles as specified
export const INITIAL_ROLES: Role[] = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    name: 'System Administrator',
    code: 'ADMIN',
    description: 'Full administrative authority and system configuration access',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    name: 'School Principal',
    code: 'PRINCIPAL',
    description: 'Executive academic oversight, staff supervision, and school approvals',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    name: 'Teacher / Educator',
    code: 'TEACHER',
    description: 'Classroom instruction, attendance taking, homework, and grading',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-a444-444444444444',
    name: 'Accountant',
    code: 'ACCOUNTANT',
    description: 'Fee invoicing, payment collection, financial accounting, and receipts',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '55555555-5555-4555-a555-555555555555',
    name: 'Librarian',
    code: 'LIBRARIAN',
    description: 'Library catalog, issue/returns, inventory, and book fine tracking',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-4666-a666-666666666666',
    name: 'Front Desk Receptionist',
    code: 'RECEPTIONIST',
    description: 'Visitor reception, student gate passes, inquiries, and attendance assist',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '77777777-7777-4777-a777-777777777777',
    name: 'Parent / Guardian',
    code: 'PARENT',
    description: 'Ward progress, attendance view, fee payments, and notices',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '88888888-8888-4888-a888-888888888888',
    name: 'Student',
    code: 'STUDENT',
    description: 'Personal schedule, homework access, report cards, and notices',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Pre-defined initial permissions
export const INITIAL_PERMISSIONS: Permission[] = [
  { id: 'p-1', module: 'dashboard', action: 'view', description: 'View dashboard overview and analytics widgets', created_at: new Date().toISOString() },
  { id: 'p-2', module: 'users', action: 'create', description: 'Register new user profiles in the system', created_at: new Date().toISOString() },
  { id: 'p-3', module: 'users', action: 'read', description: 'View user profiles, contact info, and status', created_at: new Date().toISOString() },
  { id: 'p-4', module: 'users', action: 'update', description: 'Edit user profiles and contact information', created_at: new Date().toISOString() },
  { id: 'p-5', module: 'users', action: 'delete', description: 'Deactivate or soft-delete user profiles', created_at: new Date().toISOString() },
  { id: 'p-6', module: 'users', action: 'manage_roles', description: 'Assign and revoke user roles', created_at: new Date().toISOString() },
  { id: 'p-7', module: 'students', action: 'create', description: 'Enroll and register student profiles', created_at: new Date().toISOString() },
  { id: 'p-8', module: 'students', action: 'read', description: 'View student directories and records', created_at: new Date().toISOString() },
  { id: 'p-9', module: 'students', action: 'update', description: 'Edit student academic and personal profiles', created_at: new Date().toISOString() },
  { id: 'p-10', module: 'students', action: 'delete', description: 'Archive or delete student records', created_at: new Date().toISOString() },
  { id: 'p-11', module: 'academics', action: 'read', description: 'View classes, sections, and subjects', created_at: new Date().toISOString() },
  { id: 'p-12', module: 'academics', action: 'manage', description: 'Create and configure classes, sections, subjects', created_at: new Date().toISOString() },
  { id: 'p-13', module: 'attendance', action: 'create', description: 'Record daily attendance entries', created_at: new Date().toISOString() },
  { id: 'p-14', module: 'attendance', action: 'read', description: 'View attendance registers and reports', created_at: new Date().toISOString() },
  { id: 'p-15', module: 'attendance', action: 'update', description: 'Modify existing attendance records', created_at: new Date().toISOString() },
  { id: 'p-16', module: 'fees', action: 'create', description: 'Generate fee structures and fee invoices', created_at: new Date().toISOString() },
  { id: 'p-17', module: 'fees', action: 'read', description: 'View fee dues, transaction ledgers, and receipts', created_at: new Date().toISOString() },
  { id: 'p-18', module: 'fees', action: 'update', description: 'Collect fee payments and issue receipts', created_at: new Date().toISOString() },
  { id: 'p-19', module: 'staff', action: 'read', description: 'View teacher and staff directories', created_at: new Date().toISOString() },
  { id: 'p-20', module: 'staff', action: 'manage', description: 'Hire, assign, and manage staff members', created_at: new Date().toISOString() },
  { id: 'p-21', module: 'settings', action: 'read', description: 'View school configurations and preferences', created_at: new Date().toISOString() },
  { id: 'p-22', module: 'settings', action: 'update', description: 'Modify school settings, currency, and logo', created_at: new Date().toISOString() },
  { id: 'p-23', module: 'audit_logs', action: 'read', description: 'Inspect security audit logs and change histories', created_at: new Date().toISOString() },
];

export const INITIAL_SCHOOL_SETTINGS: SchoolSettings = {
  id: '00000000-0000-4000-a000-000000000001',
  school_name: 'Greenwood International Academy',
  school_code: 'GIA-2026',
  logo_url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&auto=format&fit=crop&q=80',
  email: 'contact@greenwoodacademy.edu',
  phone: '+1 (555) 345-6789',
  address: '742 Evergreen Terrace, Educational District',
  city: 'Springfield',
  state: 'Oregon',
  pincode: '97477',
  website: 'https://greenwoodacademy.edu',
  principal_name: 'Dr. Eleanor Vance',
  academic_session: '2026-2027',
  currency: 'USD',
  timezone: 'America/Los_Angeles',
  school_start_time: '08:00',
  school_end_time: '14:30',
  late_cutoff_time: '08:30',
  half_day_cutoff_time: '11:30',
  device_api_key: 'educore-hw-key-2026',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// In-memory data store for fallback or local demo
class MemoryDatabase {
  users: (User & { password_hash?: string; role_ids: string[] })[] = [];
  roles: Role[] = [...INITIAL_ROLES];
  permissions: Permission[] = [...INITIAL_PERMISSIONS];
  rolePermissions: { role_id: string; permission_id: string }[] = [];
  schoolSettings: SchoolSettings = { ...INITIAL_SCHOOL_SETTINGS };
  auditLogs: AuditLog[] = [];
  academicYears: AcademicYear[] = [];
  classes: SchoolClass[] = [];
  sections: Section[] = [];
  students: Student[] = [];
  parents: Parent[] = [];
  studentParents: StudentParentRelationship[] = [];
  studentEnrollments: StudentEnrollment[] = [];
  studentDocuments: StudentDocument[] = [];
  mobileAppVersions: MobileAppVersion[] = [];
  attendance: AttendanceRecord[] = [];

  constructor() {
    this.seedDefaultData();
  }

  seedDefaultData() {
    // Mobile App Versions Seed
    this.mobileAppVersions = [
      {
        id: 'mav-android',
        platform: 'android',
        min_supported_version: '1.0.0',
        latest_version: '1.0.0',
        min_build_number: 1,
        latest_build_number: 1,
        force_update_title: 'Update Required',
        force_update_message: 'A new version of the school application is required to continue. Please update to access the latest features and security updates.',
        optional_update_title: 'New Version Available',
        optional_update_message: 'A new update is available with improvements and new features.',
        store_url: 'https://play.google.com/store/apps/details?id=com.educore.school',
        maintenance_mode: false,
        maintenance_message: 'The system is currently undergoing scheduled maintenance. Please check back shortly.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'mav-ios',
        platform: 'ios',
        min_supported_version: '1.0.0',
        latest_version: '1.0.0',
        min_build_number: 1,
        latest_build_number: 1,
        force_update_title: 'Update Required',
        force_update_message: 'A new version of the school application is required to continue. Please update to access the latest features and security updates.',
        optional_update_title: 'New Version Available',
        optional_update_message: 'A new update is available with improvements and new features.',
        store_url: 'https://apps.apple.com/app/id000000000',
        maintenance_mode: false,
        maintenance_message: 'The system is currently undergoing scheduled maintenance. Please check back shortly.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Academic Years Seed
    this.academicYears = [
      {
        id: 'ay-2025-26',
        name: '2025-26',
        start_date: '2025-08-15',
        end_date: '2026-06-15',
        is_current: false,
        status: 'ARCHIVED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'ay-2026-27',
        name: '2026-27',
        start_date: '2026-08-15',
        end_date: '2027-06-15',
        is_current: true,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'ay-2027-28',
        name: '2027-28',
        start_date: '2027-08-15',
        end_date: '2028-06-15',
        is_current: false,
        status: 'UPCOMING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Classes Seed
    const classNames = [
      'Nursery', 'LKG', 'UKG',
      'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
      'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
      'Class 11', 'Class 12',
    ];
    this.classes = classNames.map((name, i) => ({
      id: `cls-${i + 1}`,
      name,
      code: name.startsWith('Class ') ? `CLS-${String(i - 2).padStart(2, '0')}` : name.toUpperCase(),
      display_order: i + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Sections Seed
    this.sections = [
      { id: 'sec-a', name: 'Section A', code: 'A', capacity: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'sec-b', name: 'Section B', code: 'B', capacity: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'sec-c', name: 'Section C', code: 'C', capacity: 35, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'sec-d', name: 'Section D', code: 'D', capacity: 35, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];

    // Seed Sample Student
    const sampleStudent: Student = {
      id: 'stu-001',
      admission_number: 'ADM-2026-0001',
      first_name: 'Rahul',
      middle_name: '',
      last_name: 'Sharma',
      gender: 'Male',
      date_of_birth: '2012-05-14',
      blood_group: 'B+',
      nationality: 'American',
      category: 'General',
      photo_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=80',
      phone: '+1 555-0191',
      email: 'rahul.sharma@student.greenwood.edu',
      address: '42 Blossom Hill Road',
      city: 'Springfield',
      state: 'Oregon',
      pincode: '97477',
      admission_date: '2024-08-20',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.students.push(sampleStudent);

    // Seed Sample Parent
    const sampleParent: Parent = {
      id: 'par-001',
      first_name: 'Rajesh',
      last_name: 'Sharma',
      phone: '+1 555-0182',
      email: 'rajesh.sharma@example.com',
      occupation: 'Civil Engineer',
      address: '42 Blossom Hill Road',
      city: 'Springfield',
      state: 'Oregon',
      pincode: '97477',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.parents.push(sampleParent);

    // Link Parent to Student
    this.studentParents.push({
      student_id: sampleStudent.id,
      parent_id: sampleParent.id,
      relationship: 'Father',
      is_primary: true,
      is_emergency: true,
      can_pickup: true,
      created_at: new Date().toISOString(),
    });

    // Seed Academic History for Student (Rahul):
    // 2025-26 in Class 7-A (Promoted)
    const class7 = this.classes.find((c) => c.name === 'Class 7') || this.classes[9];
    const class8 = this.classes.find((c) => c.name === 'Class 8') || this.classes[10];

    this.studentEnrollments.push(
      {
        id: 'enr-001',
        student_id: sampleStudent.id,
        academic_year_id: 'ay-2025-26',
        class_id: class7.id,
        section_id: 'sec-a',
        roll_number: '12',
        enrollment_date: '2025-08-20',
        status: 'PROMOTED',
        promotion_status: 'Promoted to Class 8',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      // 2026-27 in Class 8-B (Active)
      {
        id: 'enr-002',
        student_id: sampleStudent.id,
        academic_year_id: 'ay-2026-27',
        class_id: class8.id,
        section_id: 'sec-b',
        roll_number: '17',
        enrollment_date: '2026-08-16',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );

    // Seed Sample Student Document
    this.studentDocuments.push({
      id: 'doc-001',
      student_id: sampleStudent.id,
      document_type: 'Birth Certificate',
      document_name: 'Rahul_Birth_Certificate.pdf',
      file_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
      file_public_id: 'demo_birth_cert_001',
      uploaded_at: new Date().toISOString(),
    });
    // Map ADMIN to all permissions
    const adminRoleId = INITIAL_ROLES[0].id;
    this.permissions.forEach((p) => {
      this.rolePermissions.push({ role_id: adminRoleId, permission_id: p.id });
    });

    // Map PRINCIPAL permissions
    const principalRoleId = INITIAL_ROLES[1].id;
    this.permissions
      .filter((p) => ['dashboard', 'users', 'students', 'academics', 'attendance', 'fees', 'staff', 'settings'].includes(p.module) && ['view', 'read'].includes(p.action))
      .forEach((p) => {
        this.rolePermissions.push({ role_id: principalRoleId, permission_id: p.id });
      });

    // Map TEACHER permissions
    const teacherRoleId = INITIAL_ROLES[2].id;
    this.permissions
      .filter((p) => (p.module === 'dashboard' && p.action === 'view') || (p.module === 'students' && p.action === 'read') || (p.module === 'attendance'))
      .forEach((p) => {
        this.rolePermissions.push({ role_id: teacherRoleId, permission_id: p.id });
      });

    // Seed default administrator
    const adminUser: User & { password_hash?: string; role_ids: string[] } = {
      id: 'aaaa1111-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      auth_user_id: 'auth-admin-001',
      username: 'admin',
      email: 'admin@greenwoodacademy.edu',
      first_name: 'System',
      last_name: 'Administrator',
      phone: '+1 555-0199',
      profile_image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      role_ids: [adminRoleId],
    };

    // Seed default Principal
    const principalUser: User & { password_hash?: string; role_ids: string[] } = {
      id: 'bbbb2222-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
      auth_user_id: 'auth-principal-002',
      username: 'principal',
      email: 'principal@greenwoodacademy.edu',
      first_name: 'Eleanor',
      last_name: 'Vance',
      phone: '+1 555-0123',
      profile_image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      role_ids: [principalRoleId],
    };

    // Seed default Teacher
    const teacherUser: User & { password_hash?: string; role_ids: string[] } = {
      id: 'cccc3333-cccc-4ccc-cccc-cccccccccccc',
      auth_user_id: 'auth-teacher-003',
      username: 'teacher',
      email: 'teacher@greenwoodacademy.edu',
      first_name: 'Sarah',
      last_name: 'Jenkins',
      phone: '+1 555-0155',
      profile_image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      role_ids: [teacherRoleId],
    };

    this.users.push(adminUser, principalUser, teacherUser);

    // Initial audit log
    this.auditLogs.push({
      id: 'log-001',
      user_id: adminUser.id,
      username: adminUser.username,
      action: 'SYSTEM_BOOTSTRAP',
      entity_type: 'SCHOOL',
      entity_id: this.schoolSettings.id,
      old_values: null,
      new_values: { school_name: this.schoolSettings.school_name },
      ip_address: '127.0.0.1',
      user_agent: 'System Initializer',
      created_at: new Date().toISOString(),
    });
  }
}

export const memoryDb = new MemoryDatabase();

export function isUsingLiveSupabase(): boolean {
  return ENV.isSupabaseConfigured() && supabaseAdmin !== null;
}
