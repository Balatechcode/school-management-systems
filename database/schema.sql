-- ============================================================================
-- EduCore Single-School Management System
-- Part 1: Authentication, RBAC, User Management, and School Settings
-- Database: Supabase PostgreSQL (Compatible with PostgreSQL 14+)
-- ============================================================================

-- Enable pgcrypto / uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS TABLE
-- Stores application user profile linked to Supabase Auth (auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    profile_image TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_users_username UNIQUE (username)
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at);

-- ============================================================================
-- 2. ROLES TABLE
-- Predefined organizational roles for the single school
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_roles_code UNIQUE (code)
);

-- Index for roles
CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);

-- ============================================================================
-- 3. PERMISSIONS TABLE
-- Granular module-action capabilities
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_permissions_module_action UNIQUE (module, action)
);

-- Indexes for permissions
CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON public.permissions(action);

-- ============================================================================
-- 4. USER ROLES (JUNCTION TABLE)
-- Many-to-many relationship allowing users to hold multiple roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

-- ============================================================================
-- 5. ROLE PERMISSIONS (JUNCTION TABLE)
-- Many-to-many mapping of roles to system permissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- ============================================================================
-- 6. SCHOOL SETTINGS
-- Single-school master configuration record
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.school_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name VARCHAR(255) NOT NULL,
    school_code VARCHAR(50) NOT NULL,
    logo_url TEXT,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(30),
    website VARCHAR(255),
    principal_name VARCHAR(150),
    academic_session VARCHAR(50) NOT NULL DEFAULT '2026-2027',
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_school_settings_code UNIQUE (school_code)
);

-- ============================================================================
-- 7. AUDIT LOGS
-- Immutable activity audit trail for administrative traceability
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- ============================================================================
-- 8. AUTOMATIC UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_roles_updated_at ON public.roles;
CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_school_settings_updated_at ON public.school_settings;
CREATE TRIGGER trg_school_settings_updated_at
    BEFORE UPDATE ON public.school_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. INITIAL SEED DATA
-- Default roles, standard permissions, and single school settings
-- ============================================================================

-- Insert standard roles
INSERT INTO public.roles (name, code, description) VALUES
    ('System Administrator', 'ADMIN', 'Full administrative authority and system configuration access'),
    ('School Principal', 'PRINCIPAL', 'Executive academic oversight, staff supervision, and school approvals'),
    ('Teacher / Educator', 'TEACHER', 'Classroom instruction, attendance taking, homework, and grading'),
    ('Accountant', 'ACCOUNTANT', 'Fee invoicing, payment collection, financial accounting, and receipts'),
    ('Librarian', 'LIBRARIAN', 'Library catalog, issue/returns, inventory, and book fine tracking'),
    ('Front Desk Receptionist', 'RECEPTIONIST', 'Visitor reception, student gate passes, inquiries, and attendance assist'),
    ('Parent / Guardian', 'PARENT', 'Ward progress, attendance view, fee payments, and notices'),
    ('Student', 'STUDENT', 'Personal schedule, homework access, report cards, and notices')
ON CONFLICT (code) DO NOTHING;

-- Insert core permissions
INSERT INTO public.permissions (module, action, description) VALUES
    ('dashboard', 'view', 'View dashboard overview and analytics widgets'),
    ('users', 'create', 'Register new user profiles in the system'),
    ('users', 'read', 'View user profiles, contact info, and status'),
    ('users', 'update', 'Edit user profiles and contact information'),
    ('users', 'delete', 'Deactivate or soft-delete user profiles'),
    ('users', 'manage_roles', 'Assign and revoke user roles'),
    ('students', 'create', 'Enroll and register student profiles'),
    ('students', 'read', 'View student directories and records'),
    ('students', 'update', 'Edit student academic and personal profiles'),
    ('students', 'delete', 'Archive or delete student records'),
    ('academics', 'read', 'View classes, sections, and subjects'),
    ('academics', 'manage', 'Create and configure classes, sections, subjects'),
    ('attendance', 'create', 'Record daily attendance entries'),
    ('attendance', 'read', 'View attendance registers and reports'),
    ('attendance', 'update', 'Modify existing attendance records'),
    ('fees', 'create', 'Generate fee structures and fee invoices'),
    ('fees', 'read', 'View fee dues, transaction ledgers, and receipts'),
    ('fees', 'update', 'Collect fee payments and issue receipts'),
    ('staff', 'read', 'View teacher and staff directories'),
    ('staff', 'manage', 'Hire, assign, and manage staff members'),
    ('settings', 'read', 'View school configurations and preferences'),
    ('settings', 'update', 'Modify school settings, currency, and logo'),
    ('audit_logs', 'read', 'Inspect security audit logs and change histories')
ON CONFLICT (module, action) DO NOTHING;

-- Map ADMIN to ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Map PRINCIPAL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module IN ('dashboard', 'users', 'students', 'academics', 'attendance', 'fees', 'staff', 'settings') AND p.action IN ('view', 'read')
WHERE r.code = 'PRINCIPAL'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Map TEACHER permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON (p.module = 'dashboard' AND p.action = 'view')
   OR (p.module = 'students' AND p.action = 'read')
   OR (p.module = 'attendance' AND p.action IN ('create', 'read', 'update'))
   OR (p.module = 'academics' AND p.action = 'read')
WHERE r.code = 'TEACHER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Map ACCOUNTANT permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON (p.module = 'dashboard' AND p.action = 'view')
   OR (p.module = 'students' AND p.action = 'read')
   OR (p.module = 'fees' AND p.action IN ('create', 'read', 'update'))
WHERE r.code = 'ACCOUNTANT'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Insert initial single school settings
INSERT INTO public.school_settings (
    school_name,
    school_code,
    logo_url,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    website,
    principal_name,
    academic_session,
    currency,
    timezone
) VALUES (
    'Greenwood International Academy',
    'GIA-2026',
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&auto=format&fit=crop&q=80',
    'contact@greenwoodacademy.edu',
    '+1 (555) 345-6789',
    '742 Evergreen Terrace, Educational District',
    'Springfield',
    'Oregon',
    '97477',
    'https://greenwoodacademy.edu',
    'Dr. Eleanor Vance',
    '2026-2027',
    'USD',
    'America/Los_Angeles'
) ON CONFLICT (school_code) DO NOTHING;

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read roles and permissions
CREATE POLICY "Authenticated users can read roles" ON public.roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read permissions" ON public.permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read role_permissions" ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read school_settings" ON public.school_settings
    FOR SELECT TO authenticated USING (true);

-- Allow users to view their own profile
CREATE POLICY "Users can read their own profile" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() = auth_user_id);

-- Allow users to read their own role mappings
CREATE POLICY "Users can read their own user_roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Allow authenticated users to read audit logs
CREATE POLICY "Authenticated users can read audit_logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (true);

-- Allow inserting audit logs
CREATE POLICY "Allow inserting audit logs" ON public.audit_logs
    FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Service role bypasses all policies automatically in Supabase

-- ============================================================================
-- PART 2: ACADEMIC STRUCTURE, STUDENTS, PARENTS, ENROLLMENTS & DOCUMENTS
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

CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 40 CHECK (capacity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sections_code ON public.sections(code);

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

CREATE INDEX IF NOT EXISTS idx_students_admission_number ON public.students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_names ON public.students(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_students_phone ON public.students(phone);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);

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

CREATE TABLE IF NOT EXISTS public.student_parents (
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    is_emergency BOOLEAN NOT NULL DEFAULT false,
    can_pickup BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_student_parents_student ON public.student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON public.student_parents(parent_id);

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
    CONSTRAINT uq_enrollment_student_year UNIQUE (student_id, academic_year_id),
    CONSTRAINT uq_enrollment_roll_number UNIQUE (academic_year_id, class_id, section_id, roll_number)
);

CREATE INDEX IF NOT EXISTS idx_enrollment_student ON public.student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_academic_year ON public.student_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_class_section ON public.student_enrollments(class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_status ON public.student_enrollments(status);

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

-- RLS FOR PART 2 TABLES
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read academic_years" ON public.academic_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read sections" ON public.sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read parents" ON public.parents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read student_parents" ON public.student_parents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read student_enrollments" ON public.student_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read student_documents" ON public.student_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update students" ON public.students FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert parents" ON public.parents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update parents" ON public.parents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert student_parents" ON public.student_parents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated delete student_parents" ON public.student_parents FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert student_enrollments" ON public.student_enrollments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update student_enrollments" ON public.student_enrollments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert student_documents" ON public.student_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated delete student_documents" ON public.student_documents FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert academic_years" ON public.academic_years FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update academic_years" ON public.academic_years FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert classes" ON public.classes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update classes" ON public.classes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert sections" ON public.sections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update sections" ON public.sections FOR UPDATE TO authenticated USING (true);
