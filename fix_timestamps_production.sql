-- ============================================================================
-- PRODUCTION-SAFE TIMESTAMPTZ CONVERSION MIGRATION (VERSION 2)
-- Safely converts BIGINT (Unix MS) columns to TIMESTAMPTZ only if they exist
-- and are currently BIGINT. Fixes ISO 8601 insertion errors.
-- Matches actual schema by excluding non-existent users.updated_at.
-- ============================================================================

BEGIN;

-- Helper function to safely convert a column to TIMESTAMPTZ if it is BIGINT
CREATE OR REPLACE FUNCTION public.safe_convert_bigint_to_timestamptz(tbl TEXT, col TEXT)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = tbl 
        AND column_name = col 
        AND data_type = 'bigint'
    ) THEN
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE TIMESTAMPTZ USING to_timestamp(%I / 1000.0)', tbl, col, col);
        
        -- Set default if it doesn't have one and is a standard audit column
        IF col IN ('created_at', 'updated_at') THEN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT timezone(''utc''::text, now())', tbl, col);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 1. public.users
SELECT public.safe_convert_bigint_to_timestamptz('users', 'created_at');
-- Explicitly NOT altering updated_at as it does not exist in users table

-- 2. public.students
SELECT public.safe_convert_bigint_to_timestamptz('students', 'admission_date');
SELECT public.safe_convert_bigint_to_timestamptz('students', 'last_payment_date');
SELECT public.safe_convert_bigint_to_timestamptz('students', 'created_at');
SELECT public.safe_convert_bigint_to_timestamptz('students', 'updated_at');

-- 3. public.payments
SELECT public.safe_convert_bigint_to_timestamptz('payments', 'date');
SELECT public.safe_convert_bigint_to_timestamptz('payments', 'created_at');
SELECT public.safe_convert_bigint_to_timestamptz('payments', 'updated_at');

-- 4. public.refunds
SELECT public.safe_convert_bigint_to_timestamptz('refunds', 'date');
SELECT public.safe_convert_bigint_to_timestamptz('refunds', 'created_at');
SELECT public.safe_convert_bigint_to_timestamptz('refunds', 'updated_at');

-- 5. public.installment_plans
SELECT public.safe_convert_bigint_to_timestamptz('installment_plans', 'start_date');
SELECT public.safe_convert_bigint_to_timestamptz('installment_plans', 'created_at');
SELECT public.safe_convert_bigint_to_timestamptz('installment_plans', 'updated_at');

-- 6. public.audit_logs
SELECT public.safe_convert_bigint_to_timestamptz('audit_logs', 'date');
SELECT public.safe_convert_bigint_to_timestamptz('audit_logs', 'created_at');

-- 7. public.settings
SELECT public.safe_convert_bigint_to_timestamptz('settings', 'created_at');
SELECT public.safe_convert_bigint_to_timestamptz('settings', 'updated_at');

-- Cleanup helper function
DROP FUNCTION public.safe_convert_bigint_to_timestamptz(TEXT, TEXT);

COMMIT;
