/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoleCode =
  | 'ADMIN'
  | 'PRINCIPAL'
  | 'TEACHER'
  | 'ACCOUNTANT'
  | 'LIBRARIAN'
  | 'RECEPTIONIST'
  | 'PARENT'
  | 'STUDENT';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  auth_user_id: string | null;
  username: string;
  email?: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  profile_image?: string | null;
  status: UserStatus;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Role {
  id: string;
  name: string;
  code: RoleCode;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string | null;
  created_at: string;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  created_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface SchoolSettings {
  id: string;
  school_name: string;
  school_code: string;
  logo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  website?: string | null;
  principal_name?: string | null;
  academic_session: string;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  username?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface AuthUserProfile extends User {
  roles: Role[];
  permissions: string[]; // e.g., ["dashboard.view", "users.read", "students.create"]
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  error?: string;
}

export interface InitialAdminSetupPayload {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

// ============================================================================
// PART 2: ACADEMIC STRUCTURE, STUDENTS, PARENTS, ENROLLMENTS & DOCUMENTS
// ============================================================================

export type AcademicYearStatus = 'ACTIVE' | 'ARCHIVED' | 'UPCOMING';

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: AcademicYearStatus;
  created_at: string;
  updated_at: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  code: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  name: string;
  code: string;
  capacity: number;
  created_at: string;
  updated_at: string;
}

export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED' | 'PASSED_OUT' | 'LEFT';

export interface Student {
  id: string;
  admission_number: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  gender?: string | null;
  date_of_birth?: string | null;
  blood_group?: string | null;
  nationality?: string | null;
  category?: string | null;
  photo_url?: string | null;
  photo_public_id?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  admission_date?: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Parent {
  id: string;
  user_id?: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  alternate_phone?: string | null;
  email?: string | null;
  occupation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentParentRelationship {
  student_id: string;
  parent_id: string;
  relationship: string;
  is_primary: boolean;
  is_emergency: boolean;
  can_pickup: boolean;
  created_at: string;
  parent?: Parent;
  student?: Student;
}

export type EnrollmentStatus = 'ACTIVE' | 'PROMOTED' | 'TRANSFERRED' | 'COMPLETED' | 'CANCELLED';

export interface StudentEnrollment {
  id: string;
  student_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  roll_number: string;
  enrollment_date: string;
  status: EnrollmentStatus;
  promotion_status?: string | null;
  created_at: string;
  updated_at: string;
  academic_year?: AcademicYear;
  school_class?: SchoolClass;
  section?: Section;
}

export interface StudentDocument {
  id: string;
  student_id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_public_id?: string | null;
  uploaded_by?: string | null;
  uploaded_at: string;
}

export interface StudentWithDetails extends Student {
  current_enrollment?: StudentEnrollment | null;
  enrollments?: StudentEnrollment[];
  parents?: (StudentParentRelationship & { parent: Parent })[];
  documents?: StudentDocument[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

