-- ============================================================================
-- EduCore Single-School Management System
-- Part 2: Academic Structure, Students, Parents, Enrollments & Documents
-- Database: Supabase PostgreSQL
-- ============================================================================

-- ============================================================================
-- 1. ACADEMIC YEARS
-- Tracks institutional school sessions (only one current at any time)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'UPCOMING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_academic_year_dates CHECK (start_date < end_date)
);

CREATE INDEX IF NOT EXISTS idx_academic_years_name ON public.academic_years(name);
CREATE INDEX IF NOT EXISTS idx_academic_years_status ON public.academic_years(status);
CREATE INDEX IF NOT EXISTS idx_academic_years_current ON public.academic_years(is_current);

-- ============================================================================
-- 2. CLASSES
-- Grade levels / classes offered by the single school
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_display_order ON public.classes(display_order);
CREATE INDEX IF NOT EXISTS idx_classes_code ON public.classes(code);

-- ============================================================================
-- 3. SECTIONS
-- Classroom sections with designated student capacities
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 40 CHECK (capacity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sections_code ON public.sections(code);

-- ============================================================================
-- 4. STUDENTS
-- Core student demographic and master records
-- (Notice: NO permanent class_id/section_id here - managed via enrollments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20),
    date_of_birth DATE,
    blood_group VARCHAR(10),
    nationality VARCHAR(100) DEFAULT 'American',
    category VARCHAR(50) DEFAULT 'General',
    photo_url TEXT,
    photo_public_id TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(30),
    admission_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'PASSED_OUT', 'LEFT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for high-frequency student queries
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON public.students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_names ON public.students(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_students_phone ON public.students(phone);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);

-- ============================================================================
-- 5. PARENTS / GUARDIANS
-- Parent directory for primary/emergency contacts and guardians
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    alternate_phone VARCHAR(50),
    email VARCHAR(255),
    occupation VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parents_phone ON public.parents(phone);
CREATE INDEX IF NOT EXISTS idx_parents_email ON public.parents(email);
CREATE INDEX IF NOT EXISTS idx_parents_names ON public.parents(first_name, last_name);

-- ============================================================================
-- 6. STUDENT_PARENTS (JUNCTION TABLE)
-- Many-to-many link between students and parents with relationship flags
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_parents (
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL, -- Father, Mother, Guardian, Foster
    is_primary BOOLEAN NOT NULL DEFAULT false,
    is_emergency BOOLEAN NOT NULL DEFAULT false,
    can_pickup BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_student_parents_student ON public.student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON public.student_parents(parent_id);

-- ============================================================================
-- 7. STUDENT_ENROLLMENTS
-- Historical and active yearly academic placement of students
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE RESTRICT,
    roll_number VARCHAR(50) NOT NULL,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PROMOTED', 'TRANSFERRED', 'COMPLETED', 'CANCELLED')),
    promotion_status VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Rule 1: A student has exactly one active enrollment per academic year
    CONSTRAINT uq_enrollment_student_year UNIQUE (student_id, academic_year_id),
    -- Rule 2: Roll number must be unique per session + class + section
    CONSTRAINT uq_enrollment_roll_number UNIQUE (academic_year_id, class_id, section_id, roll_number)
);

CREATE INDEX IF NOT EXISTS idx_enrollment_student ON public.student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_academic_year ON public.student_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_class_section ON public.student_enrollments(class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_status ON public.student_enrollments(status);

-- ============================================================================
-- 8. STUDENT_DOCUMENTS
-- Student digital verification documents (Cloudinary storage backed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_public_id TEXT,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_documents_student ON public.student_documents(student_id);

-- ============================================================================
-- 9. TRIGGERS FOR UPDATED_AT
-- ============================================================================
DROP TRIGGER IF EXISTS trg_academic_years_updated_at ON public.academic_years;
CREATE TRIGGER trg_academic_years_updated_at
    BEFORE UPDATE ON public.academic_years
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_classes_updated_at ON public.classes;
CREATE TRIGGER trg_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sections_updated_at ON public.sections;
CREATE TRIGGER trg_sections_updated_at
    BEFORE UPDATE ON public.sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_parents_updated_at ON public.parents;
CREATE TRIGGER trg_parents_updated_at
    BEFORE UPDATE ON public.parents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_student_enrollments_updated_at ON public.student_enrollments;
CREATE TRIGGER trg_student_enrollments_updated_at
    BEFORE UPDATE ON public.student_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES FOR PART 2
-- ============================================================================
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated staff & users
CREATE POLICY "Authenticated users can read academic_years" ON public.academic_years
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read classes" ON public.classes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read sections" ON public.sections
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read students" ON public.students
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read parents" ON public.parents
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read student_parents" ON public.student_parents
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read student_enrollments" ON public.student_enrollments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read student_documents" ON public.student_documents
    FOR SELECT TO authenticated USING (true);

-- Insert/Update/Delete policies for service role & authenticated authorized operations
CREATE POLICY "Allow authenticated insert students" ON public.students
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update students" ON public.students
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert parents" ON public.parents
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update parents" ON public.parents
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert student_parents" ON public.student_parents
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated delete student_parents" ON public.student_parents
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert student_enrollments" ON public.student_enrollments
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update student_enrollments" ON public.student_enrollments
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert student_documents" ON public.student_documents
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated delete student_documents" ON public.student_documents
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert academic_years" ON public.academic_years
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update academic_years" ON public.academic_years
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert classes" ON public.classes
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update classes" ON public.classes
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert sections" ON public.sections
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update sections" ON public.sections
    FOR UPDATE TO authenticated USING (true);

-- ============================================================================
-- 11. PART 2 SEED DATA: ACADEMIC YEARS, CLASSES, SECTIONS & INITIAL STUDENTS
-- ============================================================================

-- Seed Academic Years
INSERT INTO public.academic_years (name, start_date, end_date, is_current, status) VALUES
    ('2025-26', '2025-08-15', '2026-06-15', false, 'ARCHIVED'),
    ('2026-27', '2026-08-15', '2027-06-15', true, 'ACTIVE'),
    ('2027-28', '2027-08-15', '2028-06-15', false, 'UPCOMING')
ON CONFLICT (name) DO NOTHING;

-- Seed Standard Classes (Nursery through Class 12)
INSERT INTO public.classes (name, code, display_order) VALUES
    ('Nursery', 'NUR', 1),
    ('LKG', 'LKG', 2),
    ('UKG', 'UKG', 3),
    ('Class 1', 'CLS-01', 4),
    ('Class 2', 'CLS-02', 5),
    ('Class 3', 'CLS-03', 6),
    ('Class 4', 'CLS-04', 7),
    ('Class 5', 'CLS-05', 8),
    ('Class 6', 'CLS-06', 9),
    ('Class 7', 'CLS-07', 10),
    ('Class 8', 'CLS-08', 11),
    ('Class 9', 'CLS-09', 12),
    ('Class 10', 'CLS-10', 13),
    ('Class 11', 'CLS-11', 14),
    ('Class 12', 'CLS-12', 15)
ON CONFLICT (code) DO NOTHING;

-- Seed Sections
INSERT INTO public.sections (name, code, capacity) VALUES
    ('Section A', 'A', 40),
    ('Section B', 'B', 40),
    ('Section C', 'C', 35),
    ('Section D', 'D', 35)
ON CONFLICT (code) DO NOTHING;

-- Seed Part 2 Granular Permissions
INSERT INTO public.permissions (module, action, description) VALUES
    ('students', 'create', 'Enroll and register student profiles'),
    ('students', 'read', 'View student directories and detailed records'),
    ('students', 'update', 'Edit student academic and personal profiles'),
    ('students', 'delete', 'Archive or deactivate student records'),
    ('parents', 'create', 'Register parent and guardian profiles'),
    ('parents', 'read', 'View parent contact and ward details'),
    ('parents', 'update', 'Edit parent and guardian information'),
    ('parents', 'delete', 'Remove parent contacts'),
    ('enrollment', 'create', 'Enroll and assign students to classes'),
    ('enrollment', 'read', 'View historical and active enrollment records'),
    ('enrollment', 'update', 'Promote, transfer, or modify student enrollments'),
    ('enrollment', 'delete', 'Cancel or archive enrollments'),
    ('academic_years', 'create', 'Create new academic sessions'),
    ('academic_years', 'read', 'View academic calendar sessions'),
    ('academic_years', 'update', 'Change current session and dates'),
    ('academic_years', 'delete', 'Archive academic sessions'),
    ('classes', 'create', 'Define grade levels and classes'),
    ('classes', 'read', 'View class directory and sequence'),
    ('classes', 'update', 'Modify class attributes and ordering'),
    ('classes', 'delete', 'Remove class configurations'),
    ('sections', 'create', 'Create sections with capacities'),
    ('sections', 'read', 'View section assignments and capacities'),
    ('sections', 'update', 'Edit section codes and capacities'),
    ('sections', 'delete', 'Remove section configurations'),
    ('documents', 'create', 'Upload student verification documents'),
    ('documents', 'read', 'Inspect and download student documents'),
    ('documents', 'delete', 'Remove student document records')
ON CONFLICT (module, action) DO NOTHING;

-- Ensure ADMIN has all newly added permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PRINCIPAL Part 2 permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module IN ('students', 'parents', 'enrollment', 'academic_years', 'classes', 'sections', 'documents') AND p.action IN ('read', 'update', 'create')
WHERE r.code = 'PRINCIPAL'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- TEACHER Part 2 permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module IN ('students', 'parents', 'enrollment', 'academic_years', 'classes', 'sections', 'documents') AND p.action = 'read'
WHERE r.code = 'TEACHER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- RECEPTIONIST Part 2 permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module IN ('students', 'parents', 'enrollment') AND p.action IN ('create', 'read', 'update')
WHERE r.code = 'RECEPTIONIST'
ON CONFLICT (role_id, permission_id) DO NOTHING;
