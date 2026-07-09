'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStudents, getPayments, refundPayment, addAuditLog, getRefunds, getSettings } from '@/lib/localDb';
import { calculateOutstanding } from '@/lib/calculations';
import { Student, Payment, RefundRecord, SchoolSettings } from '@/types';
import { User, Phone, BookOpen, Calendar, DollarSign, ArrowLeft, Loader2, Receipt, Printer, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function StudentProfile() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalRefunded, setTotalRefunded] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  const fetchData = async () => {
    try {
      const s = await getSettings();
      setSettings(s);
      const allStudents = await getStudents();
      const found = allStudents.find(s => s.id === id || s.studentId === id);
      
      if (found) {
        setStudent(found);
        const allPayments = await getPayments();
        const studentPayments = allPayments.filter(p => p.studentId === found.studentId);
        setPayments(studentPayments.sort((a,b) => b.date - a.date));

        const refunds = await getRefunds();
        const studentRefunds = refunds.filter(r => r.studentId === found.studentId);
        const refAmount = studentRefunds.reduce((acc, r) => acc + r.refundAmount, 0);
        setTotalRefunded(refAmount);
      }
    } catch (error) {
      console.error("Error fetching student profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRefund = async (paymentId: string, amount: number) => {
     if (!confirm(`Are you sure you want to refund this payment of ${amount} ${settings?.currency || 'SAR'}? This will remove the transaction and update the student balance.`)) return;
     
     setRefunding(paymentId);
     try {
        await refundPayment(paymentId);
        await addAuditLog(
          user?.id || 'System',
          user?.user_metadata?.full_name || user?.email || 'System',
          `Processed refund of ${amount} ${settings?.currency || 'SAR'} for student ${student?.name} (Transaction ID: ${paymentId})`
        );
        await fetchData(); // Refresh data
        alert("Refund processed successfully.");
     } catch (err: any) {
        alert("Failed to process refund: " + err.message);
     } finally {
        setRefunding(null);
     }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 size={40} className="text-purple-600 animate-spin" />
        <p className="text-gray-500 font-medium">Retrieving student records...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-300">
          <User size={40} />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900">Student Not Found</h3>
          <p className="text-gray-500 mt-1">The requested profile does not exist in the database.</p>
        </div>
        <button 
          onClick={() => router.push('/students')}
          className="px-6 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-colors mb-2"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-xl font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all print:hidden"
        >
          <Printer size={18} />
          Print Profile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border border-gray-100 p-4 sm:p-8 text-center overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-blue-500" />
            <div className="w-24 h-24 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-6 text-3xl font-black shadow-inner shadow-purple-100">
              {student.name.charAt(0)}
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">{student.name}</h2>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-600 mb-6 px-4 py-1.5 bg-purple-50 rounded-full inline-block">
              ID: {student.studentId}
            </p>

            <div className="grid grid-cols-1 gap-4 text-left">
              <div className="p-4 rounded-2xl bg-gray-50 space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Academic Class & Plan</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-900">
                    <BookOpen size={14} className="text-purple-500" />
                    <span className="font-bold text-sm text-purple-600">{student.class || 'N/A'}</span>
                  </div>
                  {student.paymentPlan === 'Monthly' && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-green-600 bg-green-50 border border-green-200">Monthly</span>}
                  {student.paymentPlan === '3 Months' && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-teal-600 bg-teal-50 border border-teal-200">3 Months</span>}
                  {student.paymentPlan === 'Semester' && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-200">Semester</span>}
                  {student.paymentPlan === 'Annual' && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-200">Annual</span>}
                  {student.paymentPlan === 'Full Payment' && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-purple-600 bg-purple-50 border border-purple-200">Full</span>}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 space-y-1.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Change Plan</p>
                <select
                  className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-1 focus:ring-purple-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65em_auto] bg-[right_1rem_center] bg-no-repeat cursor-pointer"
                  value={student.paymentPlan || 'Monthly'}
                  onChange={async (e) => {
                    const newPlan = e.target.value as any;
                    try {
                      const { updateStudentPaymentPlan } = await import('@/lib/localDb');
                      await updateStudentPaymentPlan(student.id!, student.studentId, newPlan);
                      setStudent(prev => prev ? { ...prev, paymentPlan: newPlan } : null);
                    } catch (err: any) {
                      alert("Failed to update plan: " + err.message);
                    }
                  }}
                >
                  <option value="Monthly">Monthly Plan (Green)</option>
                  <option value="3 Months">3 Months Plan (Teal)</option>
                  <option value="Semester">Semester Plan (Blue)</option>
                  <option value="Annual">Annual Plan (Orange)</option>
                  <option value="Full Payment">Full Payment (Purple)</option>
                </select>
              </div>
              {student.rollNumber && (
                <div className="p-4 rounded-2xl bg-gray-50 space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Roll Number</p>
                  <div className="flex items-center gap-2 text-gray-900">
                    <User size={14} className="text-blue-500" />
                    <span className="font-bold text-sm text-blue-600">#{student.rollNumber}</span>
                  </div>
                </div>
              )}
              <div className="p-4 rounded-2xl bg-gray-50 space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Info</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User size={14} className="text-gray-400" />
                    <span className="text-xs font-bold">{student.parentName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone size={14} className="text-gray-400" />
                    <span className="text-xs">{student.parentContact}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-600 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8 text-white space-y-6 shadow-xl shadow-purple-100">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-purple-200 uppercase tracking-widest">Remaining Balance</p>
                <h3 className="text-4xl font-black">{calculateOutstanding(student).toLocaleString()} <span className="text-lg font-medium opacity-60">{settings?.currency || 'SAR'}</span></h3>
             </div>
             <div className="h-px bg-white/10" />
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Total Fee</p>
                   <p className="font-bold">{student.totalFee.toLocaleString()} {settings?.currency || 'SAR'}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Total Paid</p>
                   {/* Here totalPaid + totalRefunded = Original Total Paid before refunds */}
                   <p className="font-bold">{(student.totalPaid + totalRefunded).toLocaleString()} {settings?.currency || 'SAR'}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Total Refunded</p>
                   <p className="font-bold">{totalRefunded.toLocaleString()} {settings?.currency || 'SAR'}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Net Paid</p>
                   <p className="font-bold">{student.totalPaid.toLocaleString()} {settings?.currency || 'SAR'}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="p-4 sm:p-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                  <Receipt size={24} />
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Financial Transaction Log</h3>
              </div>
              <span className="px-4 py-1.5 rounded-full bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-widest shrink-0 self-start sm:self-auto">
                {payments.length} Records Found
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {payments.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                    <Receipt size={24} />
                  </div>
                  <p className="text-gray-400 font-medium italic">No payments recorded for this student yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {payments.map((payment) => (
                    <div key={payment.id} className="p-4 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/50 transition-colors group gap-4">
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="text-center p-3 rounded-2xl bg-gray-50 border border-gray-100 group-hover:bg-white transition-all">
                          <p className="text-[10px] font-black text-gray-400 uppercase">{format(payment.date, 'MMM')}</p>
                          <p className="text-xl font-black text-gray-900">{format(payment.date, 'dd')}</p>
                          <p className="text-[10px] font-bold text-gray-400">{format(payment.date, 'yyyy')}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter",
                              payment.status === 'refunded' ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100"
                            )}>
                              {payment.status === 'refunded' ? 'REFUNDED' : 'SUCCESS'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[9px] font-black uppercase tracking-wider">
                              {payment.feeType || 'Monthly Fee'}
                            </span>
                            <span className="text-xs font-bold text-gray-700 capitalize">{payment.method === 'credit_card' ? 'Card' : payment.method}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-medium">Recorded by {payment.recordedBy}</p>
                          {payment.notes && (
                            <p className="text-xs text-gray-500 mt-2 font-medium italic">&quot;{payment.notes}&quot;</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="text-2xl font-black text-gray-900">+{payment.amount.toLocaleString()}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{settings?.currency || 'SAR'}</p>
                        </div>
                        {payment.status !== 'refunded' && (
                          <button 
                            onClick={() => handleRefund(payment.id!, payment.amount)}
                            disabled={refunding === payment.id}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all group/refund flex flex-col items-center gap-1"
                            title="Issue Refund"
                          >
                            {refunding === payment.id ? (
                              <Loader2 size={16} className="animate-spin text-red-500" />
                            ) : (
                              <>
                                <RotateCcw size={16} />
                                <span className="text-[8px] font-black uppercase opacity-0 group-hover/refund:opacity-100 transition-opacity">Refund</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-50/50 text-center border-t border-gray-50">
               <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Official Fiscal Record of RIDM Institutional Division</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
