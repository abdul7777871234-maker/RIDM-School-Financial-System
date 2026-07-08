-- Clean up existing tables to ensure a fresh, consistent schema
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS installment_plans CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- Create Students Table
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  class TEXT,
  parent_name TEXT,
  parent_contact TEXT,
  total_fee NUMERIC DEFAULT 0,
  monthly_fee NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  remaining_balance NUMERIC DEFAULT 0,
  admission_date BIGINT,
  status TEXT DEFAULT 'active',
  roll_number TEXT,
  payment_plan TEXT,
  last_payment_date BIGINT
);

-- Create Payments Table
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  student_name TEXT,
  amount NUMERIC NOT NULL,
  method TEXT,
  date BIGINT NOT NULL,
  fee_type TEXT,
  status TEXT DEFAULT 'success',
  recorded_by TEXT,
  notes TEXT
);

-- Create Refund Records Table
CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
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
CREATE TABLE installment_plans (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  months INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  start_date BIGINT NOT NULL,
  installments TEXT DEFAULT '[]'
);

-- Create Audit Logs Table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  date BIGINT NOT NULL
);

-- Create Settings Table
CREATE TABLE settings (
  id TEXT PRIMARY KEY DEFAULT 'school_settings',
  school_name TEXT,
  school_logo TEXT,
  currency TEXT DEFAULT 'SAR',
  theme TEXT DEFAULT 'light'
);

-- Create Users Table (linking to Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'viewer',
  status TEXT DEFAULT 'active',
  is_verified BOOLEAN DEFAULT false,
  created_at BIGINT,
  photo_url TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies for seamless development and authenticated user operations
CREATE POLICY "Allow read/write for all users on students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write for all users on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write for all users on refunds" ON refunds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write for all users on installment_plans" ON installment_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write for all users on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write for all users on settings" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write for all users on users" ON users FOR ALL USING (true) WITH CHECK (true);


