import { Student, Payment, InstallmentPlan, AuditLog, SchoolSettings, UserProfile, UserRole, RefundRecord } from '@/types';
import { supabase } from './supabase';

// Helper to check if window is defined (browser environment)
const isBrowser = () => typeof window !== 'undefined';

// Initial Seed Data
const DEFAULT_STUDENTS: Student[] = [
  {
    id: 's_1',
    studentId: 'R-101',
    name: 'Ahmed Al-Mansoor',
    class: 'Class 10-A',
    parentName: 'Khalid Al-Mansoor',
    parentContact: '+966 50 123 4567',
    totalFee: 12000,
    totalPaid: 4000,
    remainingBalance: 8000,
    admissionDate: 1717196400000, // June 1, 2024
    status: 'active',
    rollNumber: '10-01',
    paymentPlan: 'Monthly',
    lastPaymentDate: 1718060400000
  },
  {
    id: 's_2',
    studentId: 'R-102',
    name: 'Fatima Al-Farsi',
    class: 'Class 12-B',
    parentName: 'Yousef Al-Farsi',
    parentContact: '+966 55 987 6543',
    totalFee: 15000,
    totalPaid: 15000,
    remainingBalance: 0,
    admissionDate: 1714518000000, // May 1, 2024
    status: 'active',
    rollNumber: '12-05',
    paymentPlan: 'Full Payment',
    lastPaymentDate: 1715036400000
  },
  {
    id: 's_3',
    studentId: 'R-103',
    name: 'Omar Farooq',
    class: 'Class 9-C',
    parentName: 'Tariq Farooq',
    parentContact: '+966 54 333 2211',
    totalFee: 10000,
    totalPaid: 2500,
    remainingBalance: 7500,
    admissionDate: 1719874800000, // July 2, 2024
    status: 'active',
    rollNumber: '09-12',
    paymentPlan: 'Semester',
    lastPaymentDate: 1720134000000
  },
  {
    id: 's_4',
    studentId: 'R-104',
    name: 'Sara Al-Subaie',
    class: 'Class 11-A',
    parentName: 'Mohammed Al-Subaie',
    parentContact: '+966 56 444 5555',
    totalFee: 13000,
    totalPaid: 0,
    remainingBalance: 13000,
    admissionDate: 1722466800000, // August 1, 2024
    status: 'active',
    rollNumber: '11-03',
    paymentPlan: 'Annual'
  }
];

const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: 'pay_1',
    studentId: 'R-101',
    studentName: 'Ahmed Al-Mansoor',
    amount: 4000,
    method: 'cash',
    date: 1718060400000,
    feeType: 'Monthly Fee',
    status: 'success',
    recordedBy: 'ridmacademy@gmail.com',
    notes: 'First installment payment'
  },
  {
    id: 'pay_2',
    studentId: 'R-102',
    studentName: 'Fatima Al-Farsi',
    amount: 15000,
    method: 'credit_card',
    date: 1715036400000,
    feeType: 'Full Admission Fee',
    status: 'success',
    recordedBy: 'ridmacademy@gmail.com',
    notes: 'Paid in full at admission'
  },
  {
    id: 'pay_3',
    studentId: 'R-103',
    studentName: 'Omar Farooq',
    amount: 2500,
    method: 'installment',
    date: 1720134000000,
    feeType: 'Semester Fee',
    status: 'success',
    recordedBy: 'ridmacademy@gmail.com',
    notes: 'Semester 1 payment'
  }
];

const DEFAULT_REFUNDS: RefundRecord[] = [];

const DEFAULT_INSTALLMENT_PLANS: InstallmentPlan[] = [
  {
    id: 'plan_1',
    studentId: 'R-101',
    totalAmount: 12000,
    paidAmount: 4000,
    remainingAmount: 8000,
    months: 3,
    status: 'active',
    startDate: 1717196400000,
    installments: [
      { dueDate: 1717196400000, amount: 4000, status: 'paid' },
      { dueDate: 1719874800000, amount: 4000, status: 'pending' },
      { dueDate: 1722466800000, amount: 4000, status: 'pending' }
    ]
  }
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_1',
    userId: 'mock-admin',
    userName: 'ridmacademy@gmail.com',
    action: 'Database initialized with offline-mode storage',
    date: Date.now()
  }
];

const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'RIDM Student Financial System',
  schoolLogo: '/logo.png',
  currency: 'SAR',
  theme: 'light'
};

const DEFAULT_USERS: UserProfile[] = [
  {
    uid: 'mock-admin',
    email: 'ridmacademy@gmail.com',
    displayName: 'Super Admin',
    role: 'super_admin',
    status: 'active',
    isVerified: true,
    createdAt: Date.now()
  }
];

// LocalStorage Helper Get/Set
function getStoredItem<T>(key: string, defaultValue: T): T {
  if (!isBrowser()) return defaultValue;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(stored) as T;
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    return defaultValue;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Initializer
export function initializeLocalDb() {
  getStoredItem('ridm_students', DEFAULT_STUDENTS);
  getStoredItem('ridm_payments', DEFAULT_PAYMENTS);
  getStoredItem('ridm_refunds', DEFAULT_REFUNDS);
  getStoredItem('ridm_installment_plans', DEFAULT_INSTALLMENT_PLANS);
  getStoredItem('ridm_audit_logs', DEFAULT_AUDIT_LOGS);
  getStoredItem('ridm_settings', DEFAULT_SETTINGS);
  getStoredItem('ridm_users', DEFAULT_USERS);
}

// Mappings between frontend CamelCase and Supabase snake_case
const mapStudentFromDb = (s: any): Student => ({
  id: s.id,
  studentId: s.student_id,
  name: s.name,
  class: s.class,
  parentName: s.parent_name,
  parentContact: s.parent_contact,
  totalFee: Number(s.total_fee) || 0,
  monthlyFee: Number(s.monthly_fee) || 0,
  totalPaid: Number(s.total_paid) || 0,
  remainingBalance: Number(s.remaining_balance) || 0,
  admissionDate: Number(s.admission_date) || Date.now(),
  status: s.status,
  rollNumber: s.roll_number,
  paymentPlan: s.payment_plan,
  lastPaymentDate: s.last_payment_date ? Number(s.last_payment_date) : undefined
});

const mapStudentToDb = (s: Partial<Student>) => ({
  id: s.id,
  student_id: s.studentId,
  name: s.name,
  class: s.class,
  parent_name: s.parentName,
  parent_contact: s.parentContact,
  total_fee: s.totalFee,
  monthly_fee: s.monthlyFee,
  total_paid: s.totalPaid,
  remaining_balance: s.remainingBalance,
  admission_date: s.admissionDate,
  status: s.status,
  roll_number: s.rollNumber,
  payment_plan: s.paymentPlan,
  last_payment_date: s.lastPaymentDate
});

const mapPaymentFromDb = (p: any): Payment => ({
  id: p.id,
  studentId: p.student_id,
  studentName: p.student_name,
  amount: Number(p.amount) || 0,
  method: p.method,
  date: Number(p.date) || Date.now(),
  feeType: p.fee_type,
  status: p.status,
  recordedBy: p.recorded_by,
  notes: p.notes
});

const mapPaymentToDb = (p: Partial<Payment>) => ({
  id: p.id,
  student_id: p.studentId,
  student_name: p.studentName,
  amount: p.amount,
  method: p.method,
  date: p.date,
  fee_type: p.feeType,
  status: p.status,
  recorded_by: p.recordedBy,
  notes: p.notes
});

const mapRefundFromDb = (r: any): RefundRecord => ({
  id: r.id,
  studentId: r.student_id,
  studentName: r.student_name,
  paymentId: r.payment_id,
  originalPaidAmount: Number(r.original_paid_amount) || 0,
  refundType: r.refund_type,
  refundPercentage: r.refund_percentage ? Number(r.refund_percentage) : undefined,
  refundAmount: Number(r.refund_amount) || 0,
  remainingRetainedAmount: Number(r.remaining_retained_amount) || 0,
  date: Number(r.date) || Date.now(),
  reason: r.reason,
  processedBy: r.processed_by
});

const mapRefundToDb = (r: Partial<RefundRecord>) => ({
  id: r.id,
  student_id: r.studentId,
  student_name: r.studentName,
  payment_id: r.paymentId,
  original_paid_amount: r.originalPaidAmount,
  refund_type: r.refundType,
  refund_percentage: r.refundPercentage,
  refund_amount: r.refundAmount,
  remaining_retained_amount: r.remainingRetainedAmount,
  date: r.date,
  reason: r.reason,
  processed_by: r.processedBy
});

const mapPlanFromDb = (p: any): InstallmentPlan => ({
  id: p.id,
  studentId: p.student_id,
  totalAmount: Number(p.total_amount) || 0,
  paidAmount: Number(p.paid_amount) || 0,
  remainingAmount: Number(p.remaining_amount) || 0,
  months: Number(p.months) || 1,
  status: p.status,
  startDate: Number(p.start_date) || Date.now(),
  installments: typeof p.installments === 'string' ? JSON.parse(p.installments) : (p.installments || [])
});

const mapPlanToDb = (p: Partial<InstallmentPlan>) => ({
  id: p.id,
  student_id: p.studentId,
  total_amount: p.totalAmount,
  paid_amount: p.paidAmount,
  remaining_amount: p.remainingAmount,
  months: p.months,
  status: p.status,
  start_date: p.startDate,
  installments: p.installments ? (typeof p.installments === 'string' ? p.installments : JSON.stringify(p.installments)) : '[]'
});

const mapLogFromDb = (l: any): AuditLog => ({
  id: l.id,
  userId: l.user_id,
  userName: l.user_name,
  action: l.action,
  date: Number(l.date) || Date.now()
});

const mapLogToDb = (l: Partial<AuditLog>) => ({
  id: l.id,
  user_id: l.userId,
  user_name: l.userName,
  action: l.action,
  date: l.date
});

const mapSettingsFromDb = (s: any): SchoolSettings => ({
  schoolName: s.school_name || 'RIDM Student Financial System',
  schoolLogo: s.school_logo || undefined,
  currency: s.currency || 'SAR',
  theme: s.theme || 'light'
});

const mapSettingsToDb = (s: SchoolSettings) => ({
  id: 'school_settings',
  school_name: s.schoolName,
  school_logo: s.schoolLogo,
  currency: s.currency,
  theme: s.theme
});


// 1. STUDENTS API
export async function getStudents(): Promise<Student[]> {
  const { data: students, error } = await supabase.from('students').select('*');
  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }
  return students.map(mapStudentFromDb);
}

export async function getStudentById(id: string): Promise<Student | null> {
  const students = await getStudents();
  return students.find(s => s.id === id || s.studentId === id) || null;
}

export async function addStudent(studentData: Partial<Student>): Promise<Student> {
  const newStudent: Student = {
    id: studentData.id || `s_${Date.now()}`,
    studentId: studentData.studentId || `R-${Math.floor(100 + Math.random() * 900)}`,
    name: studentData.name || 'Unknown Student',
    class: studentData.class || 'N/A',
    parentName: studentData.parentName || 'N/A',
    parentContact: studentData.parentContact || 'N/A',
    totalFee: Number(studentData.totalFee) || 0,
    totalPaid: Number(studentData.totalPaid) || 0,
    remainingBalance: Math.max(0, (Number(studentData.totalFee) || 0) - (Number(studentData.totalPaid) || 0)),
    admissionDate: studentData.admissionDate || Date.now(),
    status: studentData.status || 'active',
    rollNumber: studentData.rollNumber,
    monthlyFee: Number(studentData.monthlyFee) || 0,
    paymentPlan: studentData.paymentPlan || 'Monthly',
    lastPaymentDate: studentData.lastPaymentDate
  };

  const { error } = await supabase.from('students').insert(mapStudentToDb(newStudent));
  if (error) {
    console.error('Supabase addStudent error:', error);
    throw error;
  }
  return newStudent;
}

export async function updateStudent(studentData: Student): Promise<void> {
  const { error } = await supabase.from('students').update(mapStudentToDb(studentData)).eq('id', studentData.id);
  if (error) {
    console.error('Supabase updateStudent error:', error);
    throw error;
  }
}

export async function updateStudentPaymentPlan(id: string, studentId: string, plan: 'Monthly' | 'Semester' | 'Annual' | 'Full Payment'): Promise<void> {
  const { error } = await supabase.from('students').update({ payment_plan: plan }).eq('id', id);
  if (error) {
    console.error('Supabase updateStudentPaymentPlan error:', error);
    throw error;
  }
}

export async function deleteStudent(studentId: string, customStudentIdField?: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', studentId);
  if (error) {
    console.error('Supabase deleteStudent error:', error);
    throw error;
  }
  
  if (customStudentIdField) {
      await supabase.from('payments').delete().eq('student_id', customStudentIdField);
  }
}

// 2. PAYMENTS API
export async function getPayments(): Promise<Payment[]> {
  const { data: payments, error } = await supabase.from('payments').select('*');
  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
  return payments.map(mapPaymentFromDb);
}

export async function getPaymentsByStudentId(studentId: string): Promise<Payment[]> {
  const { data: payments, error } = await supabase.from('payments').select('*').eq('student_id', studentId);
  if (error) {
    console.error('Error fetching payments by student id:', error);
    return [];
  }
  return payments.map(mapPaymentFromDb);
}

export async function addPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment> {
  const newPayment: Payment = {
    id: `pay_${Date.now()}`,
    ...paymentData,
    date: paymentData.date || Date.now(),
    status: paymentData.status || 'success'
  };

  const { error } = await supabase.from('payments').insert(mapPaymentToDb(newPayment));
  if (error) {
    console.error('Supabase addPayment error:', error);
    throw error;
  }

  // Adjust student's paid amount and outstanding balance
  const { data: student, error: studentError } = await supabase.from('students').select('*').eq('student_id', paymentData.studentId).single();
  if (student) {
    const updatedPaid = (Number(student.total_paid) || 0) + Number(paymentData.amount);
    const updatedBalance = Math.max(0, (Number(student.total_fee) || 0) - updatedPaid);
    await supabase.from('students').update({
      total_paid: updatedPaid,
      remaining_balance: updatedBalance,
      last_payment_date: Date.now()
    }).eq('id', student.id);
  }

  return newPayment;
}

export async function refundPayment(paymentId: string): Promise<void> {
  const payments = await getPayments();
  const index = payments.findIndex(p => p.id === paymentId);
  if (index !== -1) {
    const p = payments[index];
    p.status = 'refunded';
    setStoredItem('ridm_payments', payments);

    // Revert student record
    const students = await getStudents();
    const studentIndex = students.findIndex(s => s.studentId === p.studentId);
    if (studentIndex !== -1) {
      const s = students[studentIndex];
      s.totalPaid = Math.max(0, (Number(s.totalPaid) || 0) - p.amount);
      s.remainingBalance = Math.max(0, (Number(s.totalFee) || 0) - s.totalPaid);
      setStoredItem('ridm_students', students);
    }
  }
}

export async function processRefund(
  paymentId: string, 
  refundAmount: number, 
  refundType: 'Full' | 'Partial' | 'Percentage', 
  refundPercentage: number | undefined, 
  reason: string, 
  processedBy: string
): Promise<void> {
  const payments = await getPayments();
  const index = payments.findIndex(p => p.id === paymentId);
  if (index === -1) throw new Error("Payment record not found");

  const p = payments[index];
  if (refundAmount > p.amount) {
    throw new Error("Refund amount exceeds paid amount");
  }

  // Deduct refundAmount from student's paid amount
  const students = await getStudents();
  const studentIndex = students.findIndex(s => s.studentId === p.studentId);
  if (studentIndex !== -1) {
    const s = students[studentIndex];
    s.totalPaid = Math.max(0, (Number(s.totalPaid) || 0) - refundAmount);
    s.remainingBalance = Math.max(0, (Number(s.totalFee) || 0) - s.totalPaid);
    setStoredItem('ridm_students', students);
  }

  // Push new RefundRecord
  const refunds = await getRefunds();
  const newRefund: RefundRecord = {
    id: `ref_${Date.now()}`,
    studentId: p.studentId,
    studentName: p.studentName,
    paymentId,
    originalPaidAmount: p.amount,
    refundType,
    refundPercentage,
    refundAmount,
    remainingRetainedAmount: p.amount - refundAmount,
    date: Date.now(),
    reason,
    processedBy
  };
  refunds.unshift(newRefund);
  setStoredItem('ridm_refunds', refunds);

  // Update payment status/amount
  const remaining = p.amount - refundAmount;
  if (remaining === 0) {
    p.status = 'refunded';
  } else {
    p.amount = remaining;
  }
  setStoredItem('ridm_payments', payments);
}

export async function getRefunds(): Promise<RefundRecord[]> {
  initializeLocalDb();
  return getStoredItem<RefundRecord[]>('ridm_refunds', DEFAULT_REFUNDS);
}

export async function deleteRefund(refundId: string): Promise<void> {
  const refunds = await getRefunds();
  const updated = refunds.filter(r => r.id !== refundId);
  setStoredItem('ridm_refunds', updated);
}

export async function clearAllRefunds(): Promise<void> {
  setStoredItem('ridm_refunds', []);
}

// 3. INSTALLMENTS API
export async function getInstallmentPlans(): Promise<InstallmentPlan[]> {
  initializeLocalDb();
  return getStoredItem<InstallmentPlan[]>('ridm_installment_plans', DEFAULT_INSTALLMENT_PLANS);
}

export async function addInstallmentPlan(planData: Omit<InstallmentPlan, 'id'>): Promise<InstallmentPlan> {
  const newPlan: InstallmentPlan = {
    id: `plan_${Date.now()}`,
    ...planData
  };

  const plans = await getInstallmentPlans();
  plans.push(newPlan);
  setStoredItem('ridm_installment_plans', plans);
  return newPlan;
}

// 4. AUDIT LOGS API
export async function getAuditLogs(): Promise<AuditLog[]> {
  initializeLocalDb();
  return getStoredItem<AuditLog[]>('ridm_audit_logs', DEFAULT_AUDIT_LOGS);
}

export async function addAuditLog(userId: string, userName: string, action: string): Promise<AuditLog> {
  const newLog: AuditLog = {
    id: `log_${Date.now()}`,
    userId,
    userName,
    action,
    date: Date.now()
  };

  const logs = await getAuditLogs();
  logs.unshift(newLog);
  setStoredItem('ridm_audit_logs', logs);
  return newLog;
}

// 5. USERS API (Already uses localStorage)
export async function getUsers(): Promise<UserProfile[]> {
  initializeLocalDb();
  return getStoredItem<UserProfile[]>('ridm_users', DEFAULT_USERS);
}

export async function addUser(email: string, role: UserRole): Promise<UserProfile> {
  const users = await getUsers();
  const newUser: UserProfile = {
    uid: `user_${Date.now()}`,
    email,
    displayName: email.split('@')[0],
    role,
    status: 'active',
    isVerified: true,
    createdAt: Date.now()
  };
  users.push(newUser);
  setStoredItem('ridm_users', users);
  return newUser;
}

export async function updateUserStatus(uid: string, status: 'active' | 'inactive'): Promise<void> {
  const users = await getUsers();
  const index = users.findIndex(u => u.uid === uid);
  if (index !== -1) {
    users[index].status = status;
    setStoredItem('ridm_users', users);
  }
}

// 6. SETTINGS API
export async function getSettings(): Promise<SchoolSettings> {
  initializeLocalDb();
  return getStoredItem<SchoolSettings>('ridm_settings', DEFAULT_SETTINGS);
}

export async function saveSettings(settings: SchoolSettings): Promise<void> {
  setStoredItem('ridm_settings', settings);
  if (isBrowser()) window.dispatchEvent(new Event('settings-updated'));
}
