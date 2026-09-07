-- ============================================================
-- SecurAI – Add database-backed profile roles
-- Single source of truth for authorization: public.profiles.role
-- ============================================================

-- ----------------------------
-- 1. role column (default Developer)
-- ----------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Developer'
  CHECK (role IN ('Developer', 'Admin'));

-- ----------------------------
-- 2. Role guard
-- New rows always become Developer (never trust client-supplied roles).
-- Self-service UPDATE can never escalate to Admin; only a privileged
-- context (postgres / SQL editor, where auth.uid() is NULL) may promote.
-- ----------------------------
CREATE OR REPLACE FUNCTION public.enforce_profiles_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'Developer';
    RETURN NEW;
  END IF;

  -- UPDATE: block self-escalation from browser sessions.
  IF NEW.role = 'Admin' AND NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profiles_role_insert ON public.profiles;
CREATE TRIGGER enforce_profiles_role_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profiles_role();

DROP TRIGGER IF EXISTS enforce_profiles_role_update ON public.profiles;
CREATE TRIGGER enforce_profiles_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profiles_role();

-- ----------------------------
-- 3. Promote the initial admin (run once via Supabase SQL Editor, as postgres).
--    This is the ONLY supported way to create an admin. Never run app-side.
-- ----------------------------
-- UPDATE public.profiles
-- SET role = 'Admin'
-- WHERE email = 'admin@gmail.com';