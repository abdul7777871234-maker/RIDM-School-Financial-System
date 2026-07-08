'use client';

import React, { useState, useEffect } from 'react';
import { getPayments, getStudents, getRefunds, deleteRefund, clearAllRefunds, getSettings } from '@/lib/localDb';
import { Payment, Student, RefundRecord, SchoolSettings } from '@/types';
import { RotateCcw, Search, Calendar, ChevronRight, User, ArrowUpRight, Plus, X, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RefundsPage() {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  // Refund dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [activePayments, setActivePayments] = useState<Payment[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  
  const [refundType, setRefundType] = useState<'Full' | 'Partial' | 'Percentage'>('Full');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundPercentage, setRefundPercentage] = useState<string>('50');
  const [refundReason, setRefundReason] = useState<string>('');
  
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const handleDeleteRefund = async (refundId: string) => {
    try {
      await deleteRefund(refundId);
      
      const { addAuditLog } = await import('@/lib/localDb');
      await addAuditLog(
        user?.id || 'System',
        user?.user_metadata?.full_name || user?.email || 'System',
        `Deleted refund record with ID: ${refundId}`
      );

      await fetchInitialData();
      setConfirmDeleteId(null);
      alert("Refund record deleted successfully.");
    } catch (err: any) {
      alert("Failed to delete refund record: " + err.message);
    }
  };

  const handleClearAllRefunds = async () => {
    try {
      await clearAllRefunds();

      const { addAuditLog } = await import('@/lib/localDb');
      await addAuditLog(
        user?.id || 'System',
        user?.user_metadata?.full_name || user?.email || 'System',
        `Cleared all refund records`
      );

      await fetchInitialData();
      setConfirmClearAll(false);
      alert("All refund records cleared successfully.");
    } catch (err: any) {
      alert("Failed to clear refund records: " + err.message);
    }
  };

  const fetchInitialData = async () => {
    try {
      const records = await getRefunds();
      setRefunds(records.sort((a,b) => b.date - a.date));

      const studentsData = await getStudents();
      setAllStudents(studentsData);
      
      const s = await getSettings();
      setSettings(s);
    } catch (error) {
      console.error("Error fetching initial refund data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const filteredRefunds = refunds.filter(r => 
    r.studentName.toLowerCase().includes(search.toLowerCase()) || 
    r.studentId.toLowerCase().includes(search.toLowerCase())
  );

  const matchingStudents = allStudents.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
    s.studentId.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const calculateAutoRefundAmount = () => {
    const chosenPayment = activePayments.find(p => p.id === selectedPaymentId);
    if (!chosenPayment) return 0;
    
    if (refundType === 'Full') {
      return chosenPayment.amount;
    } else if (refundType === 'Percentage') {
      return chosenPayment.amount * (Number(refundPercentage) / 100);
    }
    return Number(refundAmount) || 0;
  };
  
  const currentRefundAmount = calculateAutoRefundAmount();
  const chosenPayment = activePayments.find(p => p.id === selectedPaymentId);

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentId || submittingRefund) return;
    
    if (!chosenPayment) return;
    
    if (currentRefundAmount > chosenPayment.amount) {
      alert("Refund amount cannot exceed paid amount.");
      return;
    }

    setSubmittingRefund(true);
    try {
      const { processRefund, addAuditLog } = await import('@/lib/localDb');
      
      await processRefund(
        selectedPaymentId, 
        currentRefundAmount,
        refundType,
        refundType === 'Percentage' ? Number(refundPercentage) : undefined,
        refundReason || 'No reason provided',
        user?.user_metadata?.full_name || user?.email || 'System'
      );
      
      await addAuditLog(
        user?.id || 'System',
        user?.user_metadata?.full_name || user?.email || 'System',
        `Processed ${refundType} refund of ${currentRefundAmount} ${settings?.currency || 'SAR'} for student ${chosenPayment.studentName}`
      );

      await fetchInitialData(); // Reload stats
      
      setIsModalOpen(false);
      setSelectedStudentId('');
      setSelectedPaymentId('');
      setStudentSearch('');
      setRefundAmount('');
      setRefundReason('');
      setRefundType('Full');
      alert("Refund processed successfully.");
    } catch (err: any) {
      alert("Failed to reverse payment: " + err.message);
    } finally {
      setSubmittingRefund(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Refund Management</h1>
          <p className="text-gray-500 font-medium font-sans">Reverse recorded transactions and process institutional refunds</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-2xl hover:opacity-90 flex items-center gap-2 self-start md:self-auto shadow-md transition-all text-xs uppercase tracking-wider"
        >
          <Plus size={16} strokeWidth={2.5} />
          Process New Refund
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between flex-wrap gap-4">
          <div className="relative max-w-md flex-1 min-w-[260px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by student or ID..." 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-purple-200 focus:ring-4 focus:ring-purple-55 transition-all font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-5 py-2.5 bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-100 shadow-sm shrink-0">
              {refunds.length} Total Reversed Records
            </div>
            {refunds.length > 0 && (
              confirmClearAll ? (
                <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-2xl border border-red-100 animate-in fade-in duration-200">
                  <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Are you sure?</span>
                  <button
                    onClick={handleClearAllRefunds}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Yes, Clear All
                  </button>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Remove all refund data"
                >
                  <Trash2 size={14} />
                  Delete All
                </button>
              )
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Refund Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">Synchronizing refund ledger...</td></tr>
              ) : filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                      <RotateCcw size={24} />
                    </div>
                    <p className="text-gray-400 font-medium italic">No refund records found in the database.</p>
                  </td>
                </tr>
              ) : filteredRefunds.map((refund) => (
                <tr key={refund.id} className="hover:bg-gray-50/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3 animate-none">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-xs font-bold text-gray-900">{format(refund.date, 'dd MMM yyyy')}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
                        {refund.studentName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{refund.studentName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {refund.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="text-lg font-black text-red-600">-{refund.refundAmount.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{settings?.currency || 'SAR'} - {refund.refundType} Refund</p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest inline-block border border-red-100">
                      Refunded
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link 
                        href={`/students/${refund.studentId}`}
                        className="inline-flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-purple-600 transition-colors"
                      >
                        View Student <ArrowUpRight size={14} />
                      </Link>

                      {confirmDeleteId === refund.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteRefund(refund.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 hover:text-red-800 uppercase tracking-widest transition-colors cursor-pointer"
                          >
                            Confirm?
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="inline-flex items-center text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(refund.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors cursor-pointer"
                          title="Delete refund record"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-10 text-center bg-gray-50/30 border-t border-gray-50">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">
            All refunds represent a reversal of financial liability and are recorded for regulatory compliance
          </p>
        </div>
      </div>

      {/* Process Refund Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="my-8 bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 shrink-0">
            <button 
              onClick={() => {
                setIsModalOpen(false);
                setSelectedStudentId('');
                setSelectedPaymentId('');
                setStudentSearch('');
              }}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500"
            >
              <X size={20} />
            </button>
            
            <div className="p-10 space-y-6">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Record Student Refund</h3>
                <p className="text-xs text-gray-400 font-medium">Search matching profiles to reverse recorded payment entries</p>
              </div>

              <form onSubmit={handleSubmitRefund} className="space-y-6">
                {/* 1. Student search and filter dropdown */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">1. Student Matching Search</label>
                  <input 
                    type="text" 
                    placeholder="Type Name or Admission ID..." 
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">2. Choose Matching Student</label>
                  <select
                    required
                    className="w-full px-5 py-4 bg-gray-100/50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-800"
                    value={selectedStudentId}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setSelectedStudentId(val);
                      setSelectedPaymentId('');
                      if (val) {
                        const studentObj = allStudents.find(s => s.id === val);
                        if (studentObj) {
                          const { getPaymentsByStudentId } = await import('@/lib/localDb');
                          const payments = await getPaymentsByStudentId(studentObj.studentId);
                          setActivePayments(payments); // Allowing all active payments
                        }
                      } else {
                        setActivePayments([]);
                      }
                    }}
                  >
                    <option value="">-- Choose active matching profile ({matchingStudents.length}) --</option>
                    {matchingStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (+{s.studentId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Choose Payment logic */}
                {selectedStudentId && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">3. Select Active Payment</label>
                    {activePayments.length === 0 ? (
                      <p className="text-xs font-black text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-100">
                        No active successful payments registered on file for this student.
                      </p>
                    ) : (
                      <select
                        required
                        className="w-full px-5 py-4 bg-gray-100/50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-800"
                        value={selectedPaymentId}
                        onChange={(e) => setSelectedPaymentId(e.target.value)}
                      >
                        <option value="">-- Select Transaction --</option>
                        {activePayments.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.feeType || 'Monthly Fee'} — {p.amount.toLocaleString()} {settings?.currency || 'SAR'} ({format(p.date, 'dd MMM yyyy')})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {selectedPaymentId && chosenPayment && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-end">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">4. Refund Configuration</label>
                       <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">Paid: {chosenPayment.amount} {settings?.currency || 'SAR'}</span>
                    </div>
                    
                    <select
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                      value={refundType}
                      onChange={(e: any) => setRefundType(e.target.value)}
                    >
                      <option value="Full">Full Refund (100%)</option>
                      <option value="Partial">Partial Refund (Custom {settings?.currency || 'SAR'})</option>
                      <option value="Percentage">Percentage Refund (%)</option>
                    </select>

                    {refundType === 'Partial' && (
                       <input 
                         type="number" 
                         required
                         placeholder={`Enter exact ${settings?.currency || 'SAR'} amount to refund`} 
                         className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none"
                         value={refundAmount}
                         onChange={(e) => setRefundAmount(e.target.value)}
                       />
                    )}

                    {refundType === 'Percentage' && (
                       <input 
                         type="number" 
                         required
                         max="100"
                         min="1"
                         placeholder="Percentage (e.g. 50)" 
                         className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none"
                         value={refundPercentage}
                         onChange={(e) => setRefundPercentage(e.target.value)}
                       />
                    )}

                    <div className="p-4 bg-gray-100 rounded-2xl">
                       <p className="text-2xl font-black text-red-600 flex justify-between items-center">
                         <span>-{currentRefundAmount} {settings?.currency || 'SAR'}</span>
                       </p>
                       <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Calculated Refund Action</p>
                    </div>

                    <input 
                      type="text" 
                      placeholder="Reason for Refund (Optional)" 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedStudentId('');
                      setSelectedPaymentId('');
                      setStudentSearch('');
                    }}
                    className="flex-1 px-6 py-4 border border-gray-100 hover:bg-gray-50 text-gray-700 font-bold rounded-2xl transition-all text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submittingRefund || !selectedPaymentId}
                    className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all text-xs uppercase flex items-center justify-center gap-2"
                  >
                    {submittingRefund && <Loader2 size={14} className="animate-spin" />}
                    Confirm Refund
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
