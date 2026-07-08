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

// Auto-seed function to make it completely zero-friction for the user
let isSeeded = false;
let seedingPromise: Promise<void> | null = null;
export async function seedConvexIfNeeded() {
  console.log('seedConvexIfNeeded called', { isSeeded, isConfigured: isConvexConfigured() });
  if (isSeeded || !isConvexConfigured()) return;
  if (seedingPromise) return seedingPromise;
  
  console.log('Running seedConvexIfNeeded...');
  seedingPromise = (async () => {
    try {
      console.log('Checking if database needs seeding...');
      // Check if seeded based on settings
      const { data: settings, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      const data = settings && settings.length > 0 ? settings[0] : null;
      if (settings && settings.length > 0) {
        console.log('Database already seeded, skipping.');
        isSeeded = true;
        return;
      }
      console.log('Database empty or error during check, seeding Convex with default initial records...');
      
      // Seed default settings
      const { error: settingsError } = await supabase.from('settings').upsert(mapSettingsToDb(DEFAULT_SETTINGS));
      if (settingsError) throw settingsError;
      console.log('Settings seeded.');

      // Seed default students
      for (const s of DEFAULT_STUDENTS) {
        await mutationWithTimeout("students:add", mapStudentToDb(s));
      }
      console.log('Students seeded.');

      // Seed default payments
      for (const p of DEFAULT_PAYMENTS) {
        await mutationWithTimeout("payments:add", mapPaymentToDb(p));
      }
      console.log('Payments seeded.');

      // Seed default refunds
      for (const r of DEFAULT_REFUNDS) {
        await mutationWithTimeout("refunds:add", mapRefundToDb(r));
      }
      console.log('Refunds seeded.');

      // Seed default plans
      for (const pl of DEFAULT_INSTALLMENT_PLANS) {
        await mutationWithTimeout("installment_plans:add", mapPlanToDb(pl));
      }
      console.log('Plans seeded.');

      // Seed default logs
      for (const l of DEFAULT_AUDIT_LOGS) {
        await mutationWithTimeout("audit_logs:add", mapLogToDb(l));
      }
      console.log('Logs seeded.');
      
      isSeeded = true;
    } catch (err) {
      console.error('Failed to auto-seed Convex:', err);
    } finally {
      seedingPromise = null;
    }
  })();
  
  return seedingPromise;
}

// 1. STUDENTS API
export async function getStudents(): Promise<Student[]> {
  if (isConvexConfigured()) {
    try {
      await seedConvexIfNeeded();
      const data: any[] = await queryWithTimeout("students:get");
      if (data) {
        return data.map(mapStudentFromDb);
      }
    } catch (err) {
      console.error('Convex query error for students:', err);
    }
  }
  initializeLocalDb();
  return getStoredItem<Student[]>('ridm_students', DEFAULT_STUDENTS);
}

export async function getStudentById(id: string): Promise<Student | null> {
  if (isConvexConfigured()) {
    try {
      const data: any = await queryWithTimeout("students:getById", { id });
      if (data) {
        return mapStudentFromDb(data);
      }
    } catch (err) {
      console.error('Convex getStudentById error:', err);
    }
  }
  const students = await getStudents();
  return students.find(s => s.id === id || s.studentId === id) || null;
}

export async function addStudent(studentData: Partial<Student>): Promise<Student> {
  const totalFee = Number(studentData.totalFee) || 0;
  const totalPaid = Number(studentData.totalPaid) || 0;
  const balance = Math.max(0, totalFee - totalPaid);
  const studentId = studentData.studentId || `R-${Math.floor(100 + Math.random() * 900)}`;

  const newStudent: Student = {
    id: studentData.id || `s_${Date.now()}`,
    studentId,
    name: studentData.name || 'Unknown Student',
    class: studentData.class || 'N/A',
    parentName: studentData.parentName || 'N/A',
    parentContact: studentData.parentContact || 'N/A',
    totalFee,
    totalPaid,
    remainingBalance: balance,
    admissionDate: studentData.admissionDate || Date.now(),
    status: studentData.status || 'active',
    rollNumber: studentData.rollNumber,
    monthlyFee: Number(studentData.monthlyFee) || 0,
    paymentPlan: studentData.paymentPlan || 'Monthly',
    lastPaymentDate: studentData.lastPaymentDate
  };

  if (isConvexConfigured()) {
    try {
      await mutationWithTimeout("students:add", mapStudentToDb(newStudent));
      return newStudent;
    } catch (err) {
      console.error('Convex addStudent error:', err);
    }
  }

  const students = await getStudents();
  students.push(newStudent);
  setStoredItem('ridm_students', students);
  return newStudent;
}

export async function updateStudent(studentData: Student): Promise<void> {
  if (isConvexConfigured()) {
    try {
      await mutationWithTimeout("students:update", {
        id: studentData.id,
        updates: mapStudentToDb(studentData)
      });
      return;
    } catch (err) {
      console.error('Convex updateStudent error:', err);
    }
  }

  const students = await getStudents();
  const index = students.findIndex(s => s.id === studentData.id);
  if (index !== -1) {
    students[index] = studentData;
    setStoredItem('ridm_students', students);
  }
}

export async function updateStudentPaymentPlan(id: string, studentId: string, plan: 'Monthly' | 'Semester' | 'Annual' | 'Full Payment'): Promise<void> {
  if (isConvexConfigured()) {
    try {
      await convex.mutation("students:update" as any, {
        id: id,
        updates: { payment_plan: plan }
      });
      return;
    } catch (err) {
      console.error('Convex updateStudentPaymentPlan error:', err);
    }
  }

  const students = await getStudents();
  const index = students.findIndex(s => s.id === id || s.studentId === id);
  if (index !== -1) {
    students[index].paymentPlan = plan;
    setStoredItem('ridm_students', students);
  }
}

export async function deleteStudent(studentId: string, customStudentIdField?: string): Promise<void> {
  if (isConvexConfigured()) {
    try {
      await mutationWithTimeout("students:deleteStudent", { id: studentId });
    } catch (err) {
      console.error('Convex deleteStudent error:', err);
    }
  }

  const students = await getStudents();
  const filteredStudents = students.filter(s => s.id !== studentId && s.studentId !== studentId);
  setStoredItem('ridm_students', filteredStudents);

  if (customStudentIdField) {
    const payments = await getPayments();
    const filteredPayments = payments.filter(p => p.studentId !== customStudentIdField);
    setStoredItem('ridm_payments', filteredPayments);
  }
}

// 2. PAYMENTS API
export async function getPayments(): Promise<Payment[]> {
  if (isConvexConfigured()) {
    try {
      await seedConvexIfNeeded();
      const data: any[] = await convex.query("payments:get" as any);
      if (data) {
        return data.map(mapPaymentFromDb);
      }
    } catch (err) {
      console.error('Convex getPayments error:', err);
    }
  }
  initializeLocalDb();
  return getStoredItem<Payment[]>('ridm_payments', DEFAULT_PAYMENTS);
}

export async function getPaymentsByStudentId(studentId: string): Promise<Payment[]> {
  if (isConvexConfigured()) {
    try {
      const data: any[] = await convex.query("payments:get" as any);
      if (data) {
        const filtered = data.filter((p: any) => p.student_id === studentId);
        return filtered.map(mapPaymentFromDb);
      }
    } catch (err) {
      console.error('Convex getPaymentsByStudentId error:', err);
    }
  }
  const payments = await getPayments();
  return payments.filter(p => p.studentId === studentId);
}

export async function addPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment> {
  const newPayment: Payment = {
    id: `pay_${Date.now()}`,
    ...paymentData,
    date: paymentData.date || Date.now(),
    status: paymentData.status || 'success'
  };

  if (isConvexConfigured()) {
    try {
      await mutationWithTimeout("payments:add", mapPaymentToDb(newPayment));
      
      // Increment total_paid and update remaining_balance
      const student: any = await queryWithTimeout("students:getById", { id: paymentData.studentId });
      if (student) {
        const currentPaid = Number(student.total_paid) || 0;
        const currentFee = Number(student.total_fee) || 0;
        const updatedPaid = currentPaid + Number(paymentData.amount);
        const updatedBalance = Math.max(0, currentFee - updatedPaid);
        await mutationWithTimeout("students:update", {
          id: student.id,
          updates: {
            total_paid: updatedPaid,
            remaining_balance: updatedBalance,
            last_payment_date: Date.now()
          }
        });
      }
      return newPayment;
    } catch (err) {
      console.error('Convex addPayment error:', err);
    }
  }

  const payments = await getPayments();
  payments.unshift(newPayment);
  setStoredItem('ridm_payments', payments);

  // Adjust student's paid amount and outstanding balance
  const students = await getStudents();
  const studentIndex = students.findIndex(s => s.studentId === paymentData.studentId);
  if (studentIndex !== -1) {
    const s = students[studentIndex];
    s.totalPaid = (Number(s.totalPaid) || 0) + Number(paymentData.amount);
    s.remainingBalance = Math.max(0, (Number(s.totalFee) || 0) - s.totalPaid);
    s.lastPaymentDate = Date.now();
    setStoredItem('ridm_students', students);
  }

  return newPayment;
}

export async function refundPayment(paymentId: string): Promise<void> {
  if (isConvexConfigured()) {
    try {
      const payments: any[] = await convex.query("payments:get" as any);
      const pData = payments.find((p: any) => p.id === paymentId);
      if (pData) {
        await mutationWithTimeout("payments:add", {
          ...pData,
          status: 'refunded'
        });
        
        // Revert student record
        const student: any = await queryWithTimeout("students:getById", { id: pData.student_id });
        if (student) {
          const currentPaid = Number(student.total_paid) || 0;
          const currentFee = Number(student.total_fee) || 0;
          const updatedPaid = Math.max(0, currentPaid - Number(pData.amount));
          const updatedBalance = Math.max(0, currentFee - updatedPaid);
          await mutationWithTimeout("students:update", {
            id: student.id,
            updates: {
              total_paid: updatedPaid,
              remaining_balance: updatedBalance
            }
          });
        }
        return;
      }
    } catch (err) {
      console.error('Convex refundPayment error:', err);
    }
  }

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
  if (isConvexConfigured()) {
    try {
      const payments: any[] = await convex.query("payments:get" as any);
      const p = payments.find((pay: any) => pay.id === paymentId);
      if (!p) throw new Error("Payment record not found");

      const paidAmt = Number(p.amount) || 0;
      if (refundAmount > paidAmt) {
        throw new Error("Refund amount exceeds paid amount");
      }

      // Revert student record
      const student: any = await queryWithTimeout("students:getById", { id: p.student_id });
      if (student) {
        const currentPaid = Number(student.total_paid) || 0;
        const currentFee = Number(student.total_fee) || 0;
        const updatedPaid = Math.max(0, currentPaid - refundAmount);
        const updatedBalance = Math.max(0, currentFee - updatedPaid);
        await convex.mutation("students:update" as any, {
          id: student.id,
          updates: {
            total_paid: updatedPaid,
            remaining_balance: updatedBalance
          }
        });
      }

      // Add Refund Record
      const newRefund: RefundRecord = {
        id: `ref_${Date.now()}`,
        studentId: p.student_id,
        studentName: p.student_name,
        paymentId,
        originalPaidAmount: paidAmt,
        refundType,
        refundPercentage,
        refundAmount,
        remainingRetainedAmount: paidAmt - refundAmount,
        date: Date.now(),
        reason,
        processedBy
      };
      await mutationWithTimeout("refunds:add", mapRefundToDb(newRefund));

      // Update payment status/amount
      const remaining = paidAmt - refundAmount;
      await mutationWithTimeout("payments:add", {
        ...p,
        status: remaining === 0 ? 'refunded' : p.status,
        amount: remaining
      });
      return;
    } catch (err) {
      console.error('Convex processRefund error:', err);
    }
  }

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
  if (isConvexConfigured()) {
    try {
      await seedConvexIfNeeded();
      const data: any[] = await queryWithTimeout("refunds:get");
      if (data) {
        return data.map(mapRefundFromDb);
      }
    } catch (err) {
      console.error('Convex getRefunds error:', err);
    }
  }
  initializeLocalDb();
  return getStoredItem<RefundRecord[]>('ridm_refunds', DEFAULT_REFUNDS);
}

export async function deleteRefund(refundId: string): Promise<void> {
  if (isConvexConfigured()) {
    try {
      await mutationWithTimeout("refunds:deleteRefund", { id: refundId });
      return;
    } catch (err) {
      console.error('Convex deleteRefund error:', err);
    }
  }
  initializeLocalDb();
  const refunds = getStoredItem<RefundRecord[]>('ridm_refunds', DEFAULT_REFUNDS);
  const updated = refunds.filter(r => r.id !== refundId);
  setStoredItem('ridm_refunds', updated);
}

export async function clearAllRefunds(): Promise<void> {
  if (isConvexConfigured()) {
    try {
      await mutationWithTimeout("refunds:deleteAll");
      return;
    } catch (err) {
      console.error('Convex clearAllRefunds error:', err);
    }
  }
  setStoredItem('ridm_refunds', []);
}

// 3. INSTALLMENTS API
export async function getInstallmentPlans(): Promise<InstallmentPlan[]> {
  if (isConvexConfigured()) {
    try {
      await seedConvexIfNeeded();
      const data: any[] = await queryWithTimeout("installment_plans:get");
      if (data) {
        return data.map(mapPlanFromDb);
      }
    } catch (err) {
      console.error('Convex getInstallmentPlans error:', err);
    }
  }
  initializeLocalDb();
  return getStoredItem<InstallmentPlan[]>('ridm_installment_plans', DEFAULT_INSTALLMENT_PLANS);
}

export async function addInstallmentPlan(planData: Omit<InstallmentPlan, 'id'>): Promise<InstallmentPlan> {
  const newPlan: InstallmentPlan = {
    id: `plan_${Date.now()}`,
    ...planData
  };

  if (isConvexConfigured()) {
    try {
      await mutationWithTimeout("installment_plans:add", mapPlanToDb(newPlan));
      return newPlan;
    } catch (err) {
      console.error('Convex addInstallmentPlan error:', err);
    }
  }

  const plans = await getInstallmentPlans();
  plans.push(newPlan);
  setStoredItem('ridm_installment_plans', plans);
  return newPlan;
}

// 4. AUDIT LOGS API
export async function getAuditLogs(): Promise<AuditLog[]> {
  if (isConvexConfigured()) {
    try {
      await seedConvexIfNeeded();
      const data: any[] = await queryWithTimeout("audit_logs:get");
      if (data) {
        return data.map(mapLogFromDb);
      }
    } catch (err) {
      console.error('Convex getAuditLogs error:', err);
    }
  }
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

  if (isConvexConfigured()) {
    try {
      await mutationWithTimeout("audit_logs:add", mapLogToDb(newLog));
      return newLog;
    } catch (err) {
      console.error('Convex addAuditLog error:', err);
    }
  }

  const logs = await getAuditLogs();
  logs.unshift(newLog);
  setStoredItem('ridm_audit_logs', logs);
  return newLog;
}

// 5. USERS API
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
  if (isConvexConfigured()) {
    try {
      await seedConvexIfNeeded();
      const data: any = await queryWithTimeout("settings:get", {}, 60000);
      if (data && data.length > 0) {
        return mapSettingsFromDb(data[0]);
      }
      return DEFAULT_SETTINGS;
    } catch (err) {
      console.error('Convex getSettings error:', err);
    }
  }
  initializeLocalDb();
  return getStoredItem<SchoolSettings>('ridm_settings', DEFAULT_SETTINGS);
}

export async function saveSettings(settings: SchoolSettings): Promise<void> {
  if (isConvexConfigured()) {
    try {
      await mutationWithTimeout("settings:save", mapSettingsToDb(settings));
      if (isBrowser()) window.dispatchEvent(new Event('settings-updated'));
      return;
    } catch (err) {
      console.error('Convex saveSettings error:', err);
    }
  }
  setStoredItem('ridm_settings', settings);
  if (isBrowser()) window.dispatchEvent(new Event('settings-updated'));
}
