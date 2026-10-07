-- ============================================================================
-- EduCore Single-School Management System
-- Part 4: Student Attendance Module with RFID & Biometric Support
-- Database: Supabase PostgreSQL (Compatible with PostgreSQL 14+)
-- ============================================================================

-- 1. EXTEND STUDENTS TABLE FOR HARDWARE IDENTIFICATION (RFID & BIOMETRIC)
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS rfid_card_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS biometric_id VARCHAR(100);

-- Unique constraints for RFID cards and Biometric device IDs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_students_rfid_card'
    ) THEN
        ALTER TABLE public.students ADD CONSTRAINT uq_students_rfid_card UNIQUE (rfid_card_number);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_students_biometric_id'
    ) THEN
        ALTER TABLE public.students ADD CONSTRAINT uq_students_biometric_id UNIQUE (biometric_id);
    END IF;
END $$;

-- High-speed partial indexes for fast gate scanner card lookups
CREATE INDEX IF NOT EXISTS idx_students_rfid ON public.students(rfid_card_number) WHERE rfid_card_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_biometric ON public.students(biometric_id) WHERE biometric_id IS NOT NULL;

-- 2. EXTEND SCHOOL SETTINGS FOR TIMING RULES & HARDWARE INTEGRATION
ALTER TABLE public.school_settings
ADD COLUMN IF NOT EXISTS school_start_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS late_cutoff_time TIME DEFAULT '08:30:00',
ADD COLUMN IF NOT EXISTS half_day_cutoff_time TIME DEFAULT '11:30:00',
ADD COLUMN IF NOT EXISTS device_api_key VARCHAR(100) DEFAULT 'educore-hw-key-2026';

-- 3. CORE ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.student_enrollments(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE')),
    entry_mode VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (entry_mode IN ('MANUAL', 'RFID', 'BIOMETRIC', 'QR_CODE')),
    check_in_time TIME,
    check_out_time TIME,
    device_id VARCHAR(100),
    remarks TEXT,
    marked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_student_attendance_date UNIQUE (student_id, attendance_date)
);

-- 4. PERFORMANCE & FOREIGN KEY INDEXES (Supabase Postgres Best Practice)
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_id ON public.attendance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON public.attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_date ON public.attendance(enrollment_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, attendance_date);

-- 5. TRIGGER FOR UPDATED_AT
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
CREATE TRIGGER trg_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. PERMISSIONS SEEDING FOR ATTENDANCE MODULE
INSERT INTO public.permissions (module, action, description) VALUES
    ('attendance', 'read', 'View class attendance registers and statistics'),
    ('attendance', 'create', 'Mark student attendance'),
    ('attendance', 'update', 'Edit marked attendance entries'),
    ('attendance', 'delete', 'Delete attendance records'),
    ('attendance', 'export', 'Export attendance reports')
ON CONFLICT (module, action) DO NOTHING;

-- Map attendance permissions to TEACHER, PRINCIPAL, and ADMIN roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.module = 'attendance'
  AND (
      (r.code = 'TEACHER' AND p.action IN ('read', 'create', 'update'))
   OR (r.code = 'PRINCIPAL' AND p.action IN ('read', 'create', 'update', 'export'))
   OR (r.code = 'ADMIN')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read attendance" ON public.attendance;
CREATE POLICY "Authenticated users can read attendance" ON public.attendance
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert attendance" ON public.attendance;
CREATE POLICY "Allow authenticated insert attendance" ON public.attendance
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update attendance" ON public.attendance;
CREATE POLICY "Allow authenticated update attendance" ON public.attendance
    FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete attendance" ON public.attendance;
CREATE POLICY "Allow authenticated delete attendance" ON public.attendance
    FOR DELETE TO authenticated USING (true);
