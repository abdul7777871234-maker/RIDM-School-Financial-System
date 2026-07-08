-- Create Students Table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  class TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  total_fee NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  remaining_balance NUMERIC DEFAULT 0,
  admission_date BIGINT,
  status TEXT DEFAULT 'active',
  roll_number TEXT,
  payment_plan TEXT,
  last_payment_date BIGINT
);

-- Create Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id),
  student_name TEXT,
  amount NUMERIC NOT NULL,
  date BIGINT NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'success',
  note TEXT
);

-- Create Refund Records Table
CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id),
  student_name TEXT,
  payment_id TEXT,
  original_paid_amount NUMERIC,
  refund_type TEXT,
  refund_percentage NUMERIC,
  refund_amount NUMERIC,
  remaining_retained_amount NUMERIC,
  date BIGINT,
  reason TEXT,
  processed_by TEXT
);

-- Create Installment Plans Table
CREATE TABLE IF NOT EXISTS installment_plans (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id),
  total_amount NUMERIC NOT NULL,
  installments_count INTEGER NOT NULL,
  amount_per_installment NUMERIC NOT NULL,
  start_date BIGINT NOT NULL,
  status TEXT DEFAULT 'active'
);

-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  date BIGINT NOT NULL
);

-- Create Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  school_name TEXT,
  theme TEXT
);
