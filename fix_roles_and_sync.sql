-- ============================================================================
-- EMERGENCY FIX: ROLE ENUM MIGRATION AND RBAC RE-ALIGNMENT
-- ============================================================================

-- 1. Update User Role Enum
-- Since we cannot easily drop an enum used in columns, we add the new values.
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'auditor';

-- 2. Data Migration: Map existing roles to new enterprise roles
-- 'staff' -> 'accountant'
-- others -> 'auditor'
-- super_admin and admin remain unchanged

UPDATE public.users SET role = 'accountant'::user_role_enum WHERE role::text = 'staff';
UPDATE public.users SET role = 'auditor'::user_role_enum WHERE role::text IN ('teacher', 'student', 'parent');

-- Sync Auth app_metadata to ensure JWTs match the new roles
UPDATE auth.users SET raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"accountant"') 
WHERE raw_app_meta_data->>'role' = 'staff';

UPDATE auth.users SET raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"auditor"') 
WHERE raw_app_meta_data->>'role' IN ('teacher', 'student', 'parent');

-- 3. Update public.users table default
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'auditor'::user_role_enum;

-- 4. Update Sync Trigger to handle new roles and avoid cast errors
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, display_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_app_meta_data->>'role')::user_role_enum, 'auditor'::user_role_enum),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.created_at, timezone('utc'::text, now()))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    display_name = COALESCE(public.users.display_name, EXCLUDED.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update RBAC Matrix for Enterprise Roles
-- Drop existing policies first
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- --- RLS FOR public.users ---
CREATE POLICY "users_select_all" ON public.users FOR SELECT TO authenticated USING (
    auth.uid() = id OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
);

CREATE POLICY "users_admin_manage" ON public.users FOR ALL TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);

-- --- RLS FOR public.students ---
CREATE POLICY "students_read_access" ON public.students FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant', 'auditor')
);

CREATE POLICY "students_write_access" ON public.students FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "students_update_access" ON public.students FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "students_delete_access" ON public.students FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);

-- --- RLS FOR public.payments ---
CREATE POLICY "payments_read_access" ON public.payments FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant', 'auditor')
);

CREATE POLICY "payments_write_access" ON public.payments FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "payments_modify_access" ON public.payments FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "payments_delete_access" ON public.payments FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);

-- --- RLS FOR public.refunds ---
CREATE POLICY "refunds_read_access" ON public.refunds FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant', 'auditor')
);

CREATE POLICY "refunds_write_access" ON public.refunds FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "refunds_delete_access" ON public.refunds FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);

-- --- RLS FOR public.installment_plans ---
CREATE POLICY "installments_read_access" ON public.installment_plans FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "installments_write_access" ON public.installment_plans FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

-- --- RLS FOR public.audit_logs ---
CREATE POLICY "audit_read_access" ON public.audit_logs FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
);

CREATE POLICY "audit_write_access" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

-- --- RLS FOR public.settings ---
CREATE POLICY "settings_read_access" ON public.settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_manage_access" ON public.settings FOR ALL TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
);
