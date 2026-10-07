/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const AcademicYearSchema = z.object({
  name: z.string().min(1, 'Academic year name is required'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid start date (YYYY-MM-DD) required'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid end date (YYYY-MM-DD) required'),
  is_current: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'UPCOMING']).optional(),
}).refine((data) => new Date(data.start_date) < new Date(data.end_date), {
  message: 'Start date must be before end date',
  path: ['end_date'],
});

export const ClassSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  code: z.string().min(1, 'Class code is required'),
  display_order: z.number().int().min(1, 'Display order must be an integer >= 1'),
});

export const SectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  code: z.string().min(1, 'Section code is required'),
  capacity: z.number().int().min(1, 'Capacity must be greater than 0'),
});

export const StudentSchema = z.object({
  admission_number: z.string().optional(), // Auto-generated if omitted
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().optional().nullable(),
  last_name: z.string().min(1, 'Last name is required'),
  gender: z.enum(['Male', 'Female', 'Other']).optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date of birth required').optional().nullable(),
  blood_group: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  admission_date: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'PASSED_OUT', 'LEFT']).optional(),
});

export const ParentSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(7, 'Phone number is required (min 7 digits)'),
  alternate_phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
});

export const StudentParentRelationshipSchema = z.object({
  parent_id: z.string().uuid().optional(),
  relationship: z.string().min(1, 'Relationship is required (e.g. Father, Mother)'),
  is_primary: z.boolean().optional(),
  is_emergency: z.boolean().optional(),
  can_pickup: z.boolean().optional(),
  // Or create parent inline:
  parent: ParentSchema.optional(),
});

export const EnrollmentSchema = z.object({
  student_id: z.string().min(1, 'Student ID is required'),
  academic_year_id: z.string().min(1, 'Academic year is required'),
  class_id: z.string().min(1, 'Class is required'),
  section_id: z.string().min(1, 'Section is required'),
  roll_number: z.string().min(1, 'Roll number is required'),
  enrollment_date: z.string().optional(),
  status: z.enum(['ACTIVE', 'PROMOTED', 'TRANSFERRED', 'COMPLETED', 'CANCELLED']).optional(),
  promotion_status: z.string().optional().nullable(),
});

export const AttendanceStatusSchema = z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE']);
export const AttendanceEntryModeSchema = z.enum(['MANUAL', 'RFID', 'BIOMETRIC', 'QR_CODE']);

export const MarkBulkAttendanceSchema = z.object({
  academic_year_id: z.string().min(1, 'Academic year is required'),
  class_id: z.string().min(1, 'Class is required'),
  section_id: z.string().min(1, 'Section is required'),
  attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid attendance date (YYYY-MM-DD) required'),
  records: z.array(
    z.object({
      student_id: z.string().min(1, 'Student ID is required'),
      enrollment_id: z.string().min(1, 'Enrollment ID is required'),
      status: AttendanceStatusSchema,
      entry_mode: AttendanceEntryModeSchema.optional().default('MANUAL'),
      check_in_time: z.string().optional().nullable(),
      check_out_time: z.string().optional().nullable(),
      remarks: z.string().optional().nullable(),
    })
  ).min(1, 'At least one student record is required'),
});

export const DeviceTapSchema = z.object({
  card_number: z.string().optional(),
  biometric_id: z.string().optional(),
  device_id: z.string().optional().default('GATE_SCANNER'),
  direction: z.enum(['IN', 'OUT']).optional().default('IN'),
  timestamp: z.string().optional(),
}).refine((data) => Boolean(data.card_number || data.biometric_id), {
  message: 'Either card_number or biometric_id must be provided',
});
