-- ============================================================
-- SecurAI – Initial Database Schema
-- Supabase PostgreSQL Migration
-- ============================================================

-- ----------------------------
-- 0. Helper: auto-update updated_at
-- ----------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------
-- 1. profiles
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------
-- 2. projects
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_name      TEXT NOT NULL,
  original_file_name TEXT,
  status            TEXT DEFAULT 'uploaded'
                    CHECK status IN ('uploaded','scanning','completed','failed'),
  total_files       INTEGER DEFAULT 0,
  scanned_files     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------
-- 3. scans
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.scans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status             TEXT DEFAULT 'pending'
                     CHECK status IN ('pending','scanning','completed','failed'),
  total_files        INTEGER DEFAULT 0,
  sensitive_files    INTEGER DEFAULT 0,
  secrets_found      INTEGER DEFAULT 0,
  critical_findings  INTEGER DEFAULT 0,
  risk_score         NUMERIC(5,2) DEFAULT 0
                     CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level         TEXT
                     CHECK risk_level IN ('Low','Medium','High','Critical'),
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans"
  ON public.scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans"
  ON public.scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans"
  ON public.scans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scans"
  ON public.scans FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------
-- 4. findings
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.findings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id           UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path         TEXT NOT NULL,
  line_number       INTEGER,
  secret_type       TEXT NOT NULL,
  masked_value      TEXT,
  severity          TEXT NOT NULL
                    CHECK severity IN ('Low','Medium','High','Critical'),
  severity_score    INTEGER DEFAULT 0,
  confidence_score  NUMERIC(5,2),
  ai_verdict        TEXT
                    CHECK ai_verdict IN (
                      'Leak Confirmed',
                      'Suspicious',
                      'Test Data',
                      'False Positive'
                    ),
  detection_method  TEXT,
  context_snippet   TEXT,
  recommendation    TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

-- Findings: ownership through scan -> scan.user_id
CREATE POLICY "Users can view own findings"
  ON public.findings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = findings.scan_id
        AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert findings for own scans"
  ON public.findings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = findings.scan_id
        AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update findings for own scans"
  ON public.findings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = findings.scan_id
        AND scans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = findings.scan_id
        AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete findings for own scans"
  ON public.findings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = findings.scan_id
        AND scans.user_id = auth.uid()
    )
  );

-- ----------------------------
-- 5. reports
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id       UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_name   TEXT,
  report_path   TEXT,
  generated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Reports: ownership through scan -> scan.user_id
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = reports.scan_id
        AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reports for own scans"
  ON public.reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = reports.scan_id
        AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update reports for own scans"
  ON public.reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = reports.scan_id
        AND scans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = reports.scan_id
        AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete reports for own scans"
  ON public.reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = reports.scan_id
        AND scans.user_id = auth.uid()
    )
  );

-- ----------------------------
-- 6. scan_files
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.scan_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id         UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  file_path       TEXT NOT NULL,
  file_extension  TEXT,
  findings_count  INTEGER DEFAULT 0,
  scan_status     TEXT DEFAULT 'pending'
                  CHECK scan_status IN ('pending','scanned','skipped','failed'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scan_files ENABLE ROW LEVEL SECURITY;

-- scan_files: ownership through scan -> scan.user_id
CREATE POLICY "Users can view own scan_files"
  ON public.scan_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = scan_files.scan_id
        AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert scan_files for own scans"
  ON public.scan_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = scan_files.scan_id
        AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update scan_files for own scans"
  ON public.scan_files FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = scan_files.scan_id
        AND scans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = scan_files.scan_id
        AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete scan_files for own scans"
  ON public.scan_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = scan_files.scan_id
        AND scans.user_id = auth.uid()
    )
  );

-- ----------------------------
-- 7. Auth profile auto-creation trigger
-- ----------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------
-- 8. Indexes
-- ----------------------------
CREATE INDEX IF NOT EXISTS idx_projects_user_id      ON public.projects   (user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id         ON public.scans      (user_id);
CREATE INDEX IF NOT EXISTS idx_scans_project_id      ON public.scans      (project_id);
CREATE INDEX IF NOT EXISTS idx_findings_scan_id      ON public.findings   (scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_project_id   ON public.findings   (project_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity     ON public.findings   (severity);
CREATE INDEX IF NOT EXISTS idx_findings_ai_verdict   ON public.findings   (ai_verdict);
CREATE INDEX IF NOT EXISTS idx_reports_scan_id       ON public.reports    (scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_files_scan_id    ON public.scan_files (scan_id);
