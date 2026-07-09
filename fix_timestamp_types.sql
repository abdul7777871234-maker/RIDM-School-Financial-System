-- ============================================================================
-- TIMESTAMPTZ CONVERSION MIGRATION
-- Safely converts BIGINT (Unix MS) columns to TIMESTAMPTZ without data loss.
-- Fixes "invalid input syntax for type bigint" when sending ISO 8601 strings.
-- ============================================================================

BEGIN;

-- 1. public.users
ALTER TABLE public.users 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN created_at::text ~ '^[0-9]+$' THEN to_timestamp(created_at::bigint / 1000.0) 
      ELSE created_at::timestamptz 
    END
  ),
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN updated_at::text ~ '^[0-9]+$' THEN to_timestamp(updated_at::bigint / 1000.0) 
      ELSE updated_at::timestamptz 
    END
  );

-- 2. public.students
ALTER TABLE public.students
  ALTER COLUMN admission_date TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN admission_date::text ~ '^[0-9]+$' THEN to_timestamp(admission_date::bigint / 1000.0) 
      ELSE admission_date::timestamptz 
    END
  ),
  ALTER COLUMN last_payment_date TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN last_payment_date::text ~ '^[0-9]+$' THEN to_timestamp(last_payment_date::bigint / 1000.0) 
      ELSE last_payment_date::timestamptz 
    END
  ),
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN created_at::text ~ '^[0-9]+$' THEN to_timestamp(created_at::bigint / 1000.0) 
      ELSE created_at::timestamptz 
    END
  ),
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN updated_at::text ~ '^[0-9]+$' THEN to_timestamp(updated_at::bigint / 1000.0) 
      ELSE updated_at::timestamptz 
    END
  );

-- 3. public.payments
ALTER TABLE public.payments
  ALTER COLUMN date TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN date::text ~ '^[0-9]+$' THEN to_timestamp(date::bigint / 1000.0) 
      ELSE date::timestamptz 
    END
  ),
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN created_at::text ~ '^[0-9]+$' THEN to_timestamp(created_at::bigint / 1000.0) 
      ELSE created_at::timestamptz 
    END
  ),
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN updated_at::text ~ '^[0-9]+$' THEN to_timestamp(updated_at::bigint / 1000.0) 
      ELSE updated_at::timestamptz 
    END
  );

-- 4. public.refunds
ALTER TABLE public.refunds
  ALTER COLUMN date TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN date::text ~ '^[0-9]+$' THEN to_timestamp(date::bigint / 1000.0) 
      ELSE date::timestamptz 
    END
  ),
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN created_at::text ~ '^[0-9]+$' THEN to_timestamp(created_at::bigint / 1000.0) 
      ELSE created_at::timestamptz 
    END
  ),
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN updated_at::text ~ '^[0-9]+$' THEN to_timestamp(updated_at::bigint / 1000.0) 
      ELSE updated_at::timestamptz 
    END
  );

-- 5. public.installment_plans
ALTER TABLE public.installment_plans
  ALTER COLUMN start_date TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN start_date::text ~ '^[0-9]+$' THEN to_timestamp(start_date::bigint / 1000.0) 
      ELSE start_date::timestamptz 
    END
  ),
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN created_at::text ~ '^[0-9]+$' THEN to_timestamp(created_at::bigint / 1000.0) 
      ELSE created_at::timestamptz 
    END
  ),
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN updated_at::text ~ '^[0-9]+$' THEN to_timestamp(updated_at::bigint / 1000.0) 
      ELSE updated_at::timestamptz 
    END
  );

-- 6. public.audit_logs
ALTER TABLE public.audit_logs
  ALTER COLUMN date TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN date::text ~ '^[0-9]+$' THEN to_timestamp(date::bigint / 1000.0) 
      ELSE date::timestamptz 
    END
  ),
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN created_at::text ~ '^[0-9]+$' THEN to_timestamp(created_at::bigint / 1000.0) 
      ELSE created_at::timestamptz 
    END
  );

-- 7. public.settings
ALTER TABLE public.settings
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN created_at::text ~ '^[0-9]+$' THEN to_timestamp(created_at::bigint / 1000.0) 
      ELSE created_at::timestamptz 
    END
  ),
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN updated_at::text ~ '^[0-9]+$' THEN to_timestamp(updated_at::bigint / 1000.0) 
      ELSE updated_at::timestamptz 
    END
  );

COMMIT;
