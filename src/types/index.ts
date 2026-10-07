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
  school_start_time?: string | null;
  school_end_time?: string | null;
  late_cutoff_time?: string | null;
  half_day_cutoff_time?: string | null;
  device_api_key?: string | null;
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
  rfid_card_number?: string | null;
  biometric_id?: string | null;
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
    total_pages: number;
    totalPages: number; // alias for web frontend compatibility
    has_next: boolean;
    has_prev: boolean;
  };
}

export type MobilePlatform = 'android' | 'ios';

export interface MobileAppVersion {
  id: string;
  platform: MobilePlatform;
  min_supported_version: string;
  latest_version: string;
  min_build_number: number;
  latest_build_number: number;
  force_update_title: string;
  force_update_message: string;
  optional_update_title: string;
  optional_update_message: string;
  store_url: string;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckUpdateQuery {
  platform: MobilePlatform;
  current_version?: string;
  build_number?: number;
}

export interface CheckUpdateResponse {
  platform: MobilePlatform;
  current_version: string;
  current_build_number: number;
  latest_version: string;
  min_supported_version: string;
  force_update: boolean;
  optional_update: boolean;
  title: string | null;
  message: string | null;
  store_url: string;
  maintenance_mode: boolean;
  maintenance_message: string | null;
}

// Attendance Types (Part 4)
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
export type AttendanceEntryMode = 'MANUAL' | 'RFID' | 'BIOMETRIC' | 'QR_CODE';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  enrollment_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  entry_mode: AttendanceEntryMode;
  check_in_time?: string | null;
  check_out_time?: string | null;
  device_id?: string | null;
  remarks?: string | null;
  marked_by?: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
}

export interface ClassAttendanceRosterItem {
  student_id: string;
  enrollment_id: string;
  roll_number: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  photo_url?: string | null;
  gender?: string | null;
  rfid_card_number?: string | null;
  biometric_id?: string | null;
  status: AttendanceStatus;
  entry_mode: AttendanceEntryMode;
  check_in_time?: string | null;
  check_out_time?: string | null;
  remarks?: string | null;
  attendance_id?: string | null;
}

export interface AttendanceDailyStats {
  date: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  leave: number;
  percentage: number;
}

export interface DeviceTapPayload {
  card_number?: string;
  biometric_id?: string;
  device_id?: string;
  direction?: 'IN' | 'OUT';
  timestamp?: string;
}

export interface MarkBulkAttendancePayload {
  academic_year_id: string;
  class_id: string;
  section_id: string;
  attendance_date: string;
  records: Array<{
    student_id: string;
    enrollment_id: string;
    status: AttendanceStatus;
    entry_mode?: AttendanceEntryMode;
    check_in_time?: string | null;
    check_out_time?: string | null;
    remarks?: string | null;
  }>;
}

