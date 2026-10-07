-- ============================================================================
-- EduCore Single-School Management System
-- Part 3: Mobile App Versioning & In-App Force Update Configuration
-- Database: Supabase PostgreSQL
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mobile_app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios')),
    min_supported_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    latest_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    min_build_number INTEGER NOT NULL DEFAULT 1,
    latest_build_number INTEGER NOT NULL DEFAULT 1,
    force_update_title VARCHAR(150) NOT NULL DEFAULT 'Update Required',
    force_update_message TEXT NOT NULL DEFAULT 'A new version of the school application is required to continue. Please update to access the latest features and security updates.',
    optional_update_title VARCHAR(150) NOT NULL DEFAULT 'New Version Available',
    optional_update_message TEXT NOT NULL DEFAULT 'A new update is available with improvements and new features.',
    store_url TEXT NOT NULL DEFAULT 'https://play.google.com/store/apps',
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    maintenance_message TEXT DEFAULT 'The system is currently undergoing scheduled maintenance. Please check back shortly.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_mobile_app_platform UNIQUE (platform)
);

CREATE INDEX IF NOT EXISTS idx_mobile_app_versions_platform ON public.mobile_app_versions(platform);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_mobile_app_versions_updated_at ON public.mobile_app_versions;
CREATE TRIGGER trg_mobile_app_versions_updated_at
    BEFORE UPDATE ON public.mobile_app_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.mobile_app_versions ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated mobile app on splash launch) can check app version status
DROP POLICY IF EXISTS "Public read mobile app versions" ON public.mobile_app_versions;
CREATE POLICY "Public read mobile app versions" ON public.mobile_app_versions
    FOR SELECT TO anon, authenticated
    USING (true);

-- Default seeds for Android and iOS
INSERT INTO public.mobile_app_versions (
    platform,
    min_supported_version,
    latest_version,
    min_build_number,
    latest_build_number,
    store_url
) VALUES
    ('android', '1.0.0', '1.0.0', 1, 1, 'https://play.google.com/store/apps/details?id=com.educore.school'),
    ('ios', '1.0.0', '1.0.0', 1, 1, 'https://apps.apple.com/app/id000000000')
ON CONFLICT (platform) DO NOTHING;
