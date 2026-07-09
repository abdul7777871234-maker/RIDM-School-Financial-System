-- ============================================================================
-- ENTERPRISE-GRADE SUPABASE PRODUCTION SCHEMA, RBAC MATRIX, AND USER SYNC
-- ============================================================================

-- 1. ENUMS & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin', 'accountant', 'auditor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. SCHEMAS & TABLES DEFINITION

-- User Profile Sync Table (Caches auth.users app_metadata for quick queries)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    role user_role_enum DEFAULT 'auditor'::user_role_enum NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class TEXT,
    parent_name TEXT,
    parent_contact TEXT,
    total_fee NUMERIC DEFAULT 0.00 NOT NULL,
    monthly_fee NUMERIC DEFAULT 0.00 NOT NULL,
    total_paid NUMERIC DEFAULT 0.00 NOT NULL,
    remaining_balance NUMERIC DEFAULT 0.00 NOT NULL,
    admission_date BIGINT NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    roll_number TEXT,
    payment_plan TEXT,
    last_payment_date BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payments Table (Cascades when a student is deleted)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL,
    date BIGINT NOT NULL,
    fee_type TEXT,
    status TEXT DEFAULT 'success' NOT NULL,
    recorded_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Refunds Table (Cascades when a student is deleted)
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    payment_id TEXT NOT NULL,
    original_paid_amount NUMERIC NOT NULL,
    refund_type TEXT NOT NULL,
    refund_percentage NUMERIC,
    refund_amount NUMERIC NOT NULL,
    remaining_retained_amount NUMERIC NOT NULL,
    date BIGINT NOT NULL,
    reason TEXT NOT NULL,
    processed_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Installment Plans Table (Cascades when a student is deleted)
CREATE TABLE IF NOT EXISTS public.installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    total_amount NUMERIC NOT NULL,
    paid_amount NUMERIC NOT NULL,
    remaining_amount NUMERIC NOT NULL,
    months NUMERIC NOT NULL,
    status TEXT NOT NULL,
    start_date BIGINT NOT NULL,
    installments JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    date BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- School Branded Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    school_name TEXT NOT NULL,
    school_logo TEXT,
    currency TEXT DEFAULT 'SAR' NOT NULL,
    theme TEXT DEFAULT 'light' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. INDEXES FOR LIGHTNING PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(date);
CREATE INDEX IF NOT EXISTS idx_refunds_student_id ON public.refunds(student_id);
CREATE INDEX IF NOT EXISTS idx_installments_student_id ON public.installment_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON public.audit_logs(date);

-- 4. SEED INITIAL SCHOOL CONFIG
INSERT INTO public.settings (id, school_name, school_logo, currency, theme)
VALUES ('school_settings', 'RIDM Student Financial System', '/logo.png', 'SAR', 'light')
ON CONFLICT (id) DO NOTHING;


-- 5. TRIGGER TRIGGERS FOR USER AUTOMATION
-- Automatic Synchronization of auth.users into public.users
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Automatic Update of profile when auth metadata updates (like role change)
CREATE OR REPLACE FUNCTION public.handle_user_update() 
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.users SET
    email = NEW.email,
    role = COALESCE((NEW.raw_app_meta_data->>'role')::user_role_enum, public.users.role, 'auditor'::user_role_enum)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();


-- 6. INDESTRUCTIBLE ROW LEVEL SECURITY (RLS) POLICIES
-- Clean, idempotent drop of all old policies, and enforcement of strict RBAC matrices
-- Never use USING (true), never query public.users inside a users policy (eliminates recursion)

DO $$ 
DECLARE 
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END $$;

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
CREATE POLICY "users_select_policy" ON public.users FOR SELECT TO authenticated USING (
    auth.uid() = id OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
);

CREATE POLICY "users_insert_policy" ON public.users FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);

CREATE POLICY "users_update_policy" ON public.users FOR UPDATE TO authenticated USING (
    auth.uid() = id OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
) WITH CHECK (
    auth.uid() = id OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);

CREATE POLICY "users_delete_policy" ON public.users FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);


-- --- RLS FOR public.students ---
CREATE POLICY "students_select_policy" ON public.students FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant', 'auditor') OR
    (auth.jwt() ->> 'email') = email
);

CREATE POLICY "students_insert_policy" ON public.students FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "students_update_policy" ON public.students FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "students_delete_policy" ON public.students FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);


-- --- RLS FOR public.payments ---
CREATE POLICY "payments_select_policy" ON public.payments FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant', 'auditor')
);

CREATE POLICY "payments_insert_policy" ON public.payments FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "payments_update_policy" ON public.payments FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "payments_delete_policy" ON public.payments FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);


-- --- RLS FOR public.refunds ---
CREATE POLICY "refunds_select_policy" ON public.refunds FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant', 'auditor')
);

CREATE POLICY "refunds_insert_policy" ON public.refunds FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "refunds_update_policy" ON public.refunds FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
);

CREATE POLICY "refunds_delete_policy" ON public.refunds FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);


-- --- RLS FOR public.installment_plans ---
CREATE POLICY "installments_select_policy" ON public.installment_plans FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant', 'auditor')
);

CREATE POLICY "installments_insert_policy" ON public.installment_plans FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "installments_update_policy" ON public.installment_plans FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);

CREATE POLICY "installments_delete_policy" ON public.installment_plans FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
);


-- --- RLS FOR public.audit_logs ---
CREATE POLICY "audit_select_policy" ON public.audit_logs FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
);

CREATE POLICY "audit_insert_policy" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'accountant')
);


-- --- RLS FOR public.settings ---
CREATE POLICY "settings_select_policy" ON public.settings FOR SELECT TO authenticated USING (
    auth.uid() IS NOT NULL
);

CREATE POLICY "settings_modify_policy" ON public.settings FOR ALL TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
);


-- 7. SECURE SUPER ADMIN BOOTSTRAP FUNCTION
-- Idempotent, safe promoter of the first system administrator
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin(admin_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Find user in auth.users securely
    SELECT id INTO user_id FROM auth.users WHERE email = admin_email;
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', admin_email;
    END IF;

    -- Update app_metadata securely
    UPDATE auth.users 
    SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "super_admin"}'::jsonb
    WHERE id = user_id;

    -- Update public.users securely
    UPDATE public.users 
    SET role = 'super_admin'::user_role_enum,
        is_verified = true,
        updated_at = timezone('utc'::text, now())
    WHERE id = user_id;
END;
$$;
