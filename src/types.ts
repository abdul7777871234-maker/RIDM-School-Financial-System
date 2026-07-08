export type UserRole = 'super_admin' | 'manager' | 'accountant' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  status: 'active' | 'inactive';
  isVerified: boolean;
  createdAt: number;
  photoURL?: string;
}

export interface Student {
  id?: string;
  studentId: string;
  name: string;
  class: string;
  parentName: string;
  parentContact: string;
  totalFee: number;
  monthlyFee?: number;
  totalPaid: number;
  remainingBalance: number;
  admissionDate: number;
  status: 'active' | 'graduated' | 'dropped';
  lastPaymentDate?: number;
  rollNumber?: string;
  paymentPlan?: 'Monthly' | 'Semester' | 'Annual' | 'Full Payment' | '3 Months';
  paidMonths?: string[];
}

export interface RefundRecord {
  id: string;
  studentId: string;
  studentName: string;
  paymentId: string;
  originalPaidAmount: number;
  refundType: 'Full' | 'Partial' | 'Percentage';
  refundPercentage?: number;
  refundAmount: number;
  remainingRetainedAmount: number;
  date: number;
  reason: string;
  processedBy: string;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  method: 'cash' | 'credit_card' | 'installment';
  date: number;
  notes?: string;
  recordedBy?: string;
  status?: 'success' | 'refunded';
  feeType?: string;
  paidMonths?: string[];
}

export interface InstallmentPlan {
  id: string;
  studentId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  months: number;
  status: 'active' | 'completed' | 'cancelled';
  startDate: number;
  installments: {
    dueDate: number;
    amount: number;
    status: 'pending' | 'paid' | 'late';
  }[];
}

export interface AuditLog {
  id?: string;
  userId: string;
  userName: string;
  action: string;
  date: number;
}

export interface SchoolSettings {
  schoolName: string;
  schoolLogo?: string;
  currency: string;
  theme: 'light' | 'dark';
}
