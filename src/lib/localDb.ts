import { Student, Payment, InstallmentPlan, AuditLog, SchoolSettings, UserProfile, UserRole, RefundRecord } from '@/types';
import { supabase } from './supabase';

// Helper to check if window is defined (browser environment)
const isBrowser = () => typeof window !== 'undefined';

// Initial Seed Data (Fallbacks if DB is empty or during initialization)
const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'RIDM Student Financial System',
  schoolLogo: '/logo.png',
  currency: 'SAR',
  theme: 'light'
};

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
  admissionDate: s.admission_date ? new Date(s.admission_date).getTime() : Date.now(),
  status: s.status,
  rollNumber: s.roll_number,
  paymentPlan: s.payment_plan,
  lastPaymentDate: s.last_payment_date ? new Date(s.last_payment_date).getTime() : undefined
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
  admission_date: s.admissionDate ? new Date(s.admissionDate).toISOString() : null,
  status: s.status,
  roll_number: s.rollNumber,
  payment_plan: s.paymentPlan,
  last_payment_date: s.lastPaymentDate ? new Date(s.lastPaymentDate).toISOString() : null
});

const mapPaymentFromDb = (p: any): Payment => ({
  id: p.id,
  studentId: p.student_id,
  studentName: p.student_name,
  amount: Number(p.amount) || 0,
  method: p.method,
  date: p.date ? new Date(p.date).getTime() : Date.now(),
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
  date: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
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
  date: r.date ? new Date(r.date).getTime() : Date.now(),
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
  date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
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
  startDate: p.start_date ? new Date(p.start_date).getTime() : Date.now(),
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
  start_date: p.startDate ? new Date(p.startDate).toISOString() : null,
  installments: p.installments ? (typeof p.installments === 'string' ? p.installments : JSON.stringify(p.installments)) : '[]'
});

const mapLogFromDb = (l: any): AuditLog => ({
  id: l.id,
  userId: l.user_id,
  userName: l.user_name,
  action: l.action,
  date: l.date ? new Date(l.date).getTime() : Date.now()
});

const mapLogToDb = (l: Partial<AuditLog>) => ({
  id: l.id,
  user_id: l.userId,
  user_name: l.userName,
  action: l.action,
  date: l.date ? new Date(l.date).toISOString() : new Date().toISOString()
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
    console.error('Error fetching students:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return [];
  }
  return students.map(mapStudentFromDb);
}

export async function getStudentById(id: string): Promise<Student | null> {
  const { data: student, error } = await supabase.from('students').select('*').or(`id.eq.${id},student_id.eq.${id}`).single();
  if (error || !student) return null;
  return mapStudentFromDb(student);
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
    console.error('Supabase addStudent error:', {
      message: error.message,
      code: error.code,
      details: error.details
    });
    throw error;
  }
  return newStudent;
}

export async function updateStudent(studentData: Student): Promise<void> {
  const { error } = await supabase.from('students').update(mapStudentToDb(studentData)).eq('id', studentData.id);
  if (error) {
    console.error('Supabase updateStudent error:', {
      message: error.message,
      code: error.code
    });
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
    console.error('Supabase deleteStudent error:', {
      message: error.message,
      code: error.code
    });
    throw error;
  }
  
  if (customStudentIdField) {
      await supabase.from('payments').delete().eq('student_id', customStudentIdField);
  }
}

// 2. PAYMENTS API
export async function getPayments(): Promise<Payment[]> {
  const { data: payments, error } = await supabase.from('payments').select('*').order('date', { ascending: false });
  if (error) {
    console.error('Error fetching payments:', {
      message: error.message,
      code: error.code
    });
    return [];
  }
  return payments.map(mapPaymentFromDb);
}

export async function getPaymentsByStudentId(studentId: string): Promise<Payment[]> {
  const { data: payments, error } = await supabase.from('payments').select('*').eq('student_id', studentId).order('date', { ascending: false });
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
    console.error('Supabase addPayment error:', {
      message: error.message,
      code: error.code
    });
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
  const { error } = await supabase.from('payments').update({ status: 'refunded' }).eq('id', paymentId);
  if (error) {
    console.error('Error refunding payment:', error);
    throw error;
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
  // 1. Get payment details
  const { data: p, error: pError } = await supabase.from('payments').select('*').eq('id', paymentId).single();
  if (pError || !p) throw new Error("Payment record not found");

  if (refundAmount > Number(p.amount)) {
    throw new Error("Refund amount exceeds paid amount");
  }

  // 2. Deduct from student balance
  const { data: student, error: sError } = await supabase.from('students').select('*').eq('student_id', p.student_id).single();
  if (student) {
    const updatedPaid = Math.max(0, (Number(student.total_paid) || 0) - refundAmount);
    const updatedBalance = Math.max(0, (Number(student.total_fee) || 0) - updatedPaid);
    await supabase.from('students').update({
      total_paid: updatedPaid,
      remaining_balance: updatedBalance
    }).eq('id', student.id);
  }

  // 3. Create Refund Record
  const newRefund: RefundRecord = {
    id: `ref_${Date.now()}`,
    studentId: p.student_id,
    studentName: p.student_name,
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
  
  const { error: refError } = await supabase.from('refunds').insert(mapRefundToDb(newRefund));
  if (refError) throw refError;

  // 4. Update payment status
  const remaining = p.amount - refundAmount;
  const newStatus = remaining === 0 ? 'refunded' : 'success';
  await supabase.from('payments').update({ 
    amount: remaining,
    status: newStatus 
  }).eq('id', paymentId);
}

export async function getRefunds(): Promise<RefundRecord[]> {
  const { data, error } = await supabase.from('refunds').select('*').order('date', { ascending: false });
  if (error) {
    console.error('Error fetching refunds:', error);
    return [];
  }
  return data.map(mapRefundFromDb);
}

export async function deleteRefund(refundId: string): Promise<void> {
  const { error } = await supabase.from('refunds').delete().eq('id', refundId);
  if (error) throw error;
}

export async function clearAllRefunds(): Promise<void> {
  // Use a filter that matches all if possible, or just truncate
  const { error } = await supabase.from('refunds').delete().neq('id', 'null');
  if (error) throw error;
}

// 3. INSTALLMENTS API
export async function getInstallmentPlans(): Promise<InstallmentPlan[]> {
  const { data, error } = await supabase.from('installment_plans').select('*');
  if (error) {
    console.error('Error fetching installment plans:', error);
    return [];
  }
  return data.map(mapPlanFromDb);
}

export async function addInstallmentPlan(planData: Omit<InstallmentPlan, 'id'>): Promise<InstallmentPlan> {
  const newPlan: InstallmentPlan = {
    id: `plan_${Date.now()}`,
    ...planData
  };

  const { error } = await supabase.from('installment_plans').insert(mapPlanToDb(newPlan));
  if (error) throw error;
  return newPlan;
}

// 4. AUDIT LOGS API
export async function getAuditLogs(): Promise<AuditLog[]> {
  const { data, error } = await supabase.from('audit_logs').select('*').order('date', { ascending: false });
  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
  return data.map(mapLogFromDb);
}

export async function addAuditLog(userId: string, userName: string, action: string): Promise<AuditLog> {
  const newLog: AuditLog = {
    id: `log_${Date.now()}`,
    userId,
    userName,
    action,
    date: Date.now()
  };

  const { error } = await supabase.from('audit_logs').insert(mapLogToDb(newLog));
  if (error) {
    console.error('Error adding audit log:', error);
  }
  return newLog;
}

function mapUserFromDb(row: any): UserProfile {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role as UserRole,
    status: row.status as 'active' | 'inactive',
    isVerified: row.is_verified || false,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at || undefined,
    photoURL: row.photo_url || undefined
  };
}

// 5. USERS API (Strictly Supabase-based with Self-Healing Sync)
export async function getUsers(): Promise<UserProfile[]> {
  try {
    // We explicitly check for browser environment to ensure relative fetch works
    if (!isBrowser()) {
      throw new Error('getUsers API fetch can only be performed from the browser.');
    }

    const res = await fetch('/api/users');
    
    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = 'Failed to fetch and synchronize users';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch (e) {
        errorMessage = `${errorMessage}: ${res.status} ${res.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await res.json();
    return data.map(mapUserFromDb);
  } catch (error: any) {
    // If it's a "Failed to fetch" or other network error, we log it and proceed to fallback
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.warn('Network error fetching users from API (likely service role key missing), falling back to direct DB access.');
    } else {
      console.error('Error fetching synchronized users from API, falling back to direct DB fetch:', error);
    }

    // Fallback: Direct Supabase fetch using the client-side anon key
    const { data, error: dbError } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    
    if (dbError) {
      console.error('Critical: Fallback fetch also failed:', {
        message: dbError.message,
        code: dbError.code
      });
      throw new Error(`System Error: Unable to retrieve users list. ${dbError.message}`);
    }
    
    return data ? data.map(mapUserFromDb) : [];
  }
}

export async function addUser(email: string, role: UserRole, uid: string): Promise<UserProfile> {
  const newUser: UserProfile = {
    uid,
    email,
    displayName: email.split('@')[0],
    role,
    status: 'active',
    isVerified: true,
    createdAt: Date.now()
  };

  const { error } = await supabase.from('users').upsert({
    id: newUser.uid,
    email: newUser.email,
    display_name: newUser.displayName,
    role: newUser.role,
    status: newUser.status,
    is_verified: newUser.isVerified
  });

  if (error) {
    console.error('Error syncing user to Supabase:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw new Error(`Failed to sync user: ${error.message}`);
  }

  return newUser;
}

export async function updateUserStatus(uid: string, status: 'active' | 'inactive'): Promise<void> {
  const { error } = await supabase.from('users').update({ status }).eq('id', uid);
  if (error) {
    console.error('Error updating user status in Supabase:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw new Error(`Failed to update user status: ${error.message}`);
  }
}

export async function deleteUser(uid: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', uid);
  if (error) {
    console.error('Error deleting user from Supabase:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

// 6. SETTINGS API
export async function getSettings(): Promise<SchoolSettings> {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 'school_settings').single();
  if (error || !data) {
    return DEFAULT_SETTINGS;
  }
  return mapSettingsFromDb(data);
}

export async function saveSettings(settings: SchoolSettings): Promise<void> {
  const { error } = await supabase.from('settings').upsert(mapSettingsToDb(settings));
  if (error) throw error;
  if (isBrowser()) window.dispatchEvent(new Event('settings-updated'));
}
