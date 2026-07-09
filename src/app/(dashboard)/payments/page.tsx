'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStudents, addPayment, addAuditLog, getSettings } from '@/lib/localDb';
import { calculateOutstanding } from '@/lib/calculations';
import { Student, Payment, SchoolSettings } from '@/types';
import { Receipt, Search, User, CreditCard, Banknote, Calendar, Save, CheckCircle2, ChevronRight, X, Printer, QrCode, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { QRCodeCanvas } from 'qrcode.react';

export default function NewPayment() {
  const { user, profile: currentProfile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'cash' | 'credit_card' | 'installment'>('cash');
  const [notes, setNotes] = useState('');
  const [feeType, setFeeType] = useState<string>('Monthly Fee');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const s = await getSettings();
        setSettings(s);
        const data = await getStudents();
        setStudents(data);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Access Control: Auditors cannot create payments
  if (currentProfile && currentProfile.role === 'auditor') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mb-6">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Auditor Access Only</h1>
        <p className="text-gray-500 max-w-md font-medium">
          As an Auditor, you have read-only access to the financial system. You cannot record new payments or issue receipts.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !amount || submitting) return;

    setSubmitting(true);
    try {
      const paymentAmount = Number(amount);
      const paymentData = {
        studentId: selectedStudent.studentId,
        studentName: selectedStudent.name,
        amount: paymentAmount,
        method,
        notes: notes || (selectedMonths.length > 0 ? `Paid months: ${selectedMonths.join(', ')}` : ''),
        date: Date.now(),
        recordedBy: user?.user_metadata?.full_name || user?.email || 'System',
        feeType,
        paidMonths: selectedMonths,
      };

      const result = await addPayment(paymentData);
      setLastPayment(result);

      await addAuditLog(
        user?.id || 'System',
        user?.user_metadata?.full_name || user?.email || 'System',
        `Recorded payment of ${paymentAmount} ${settings?.currency || 'SAR'} for student ${selectedStudent.name}${selectedMonths.length > 0 ? ` (Months: ${selectedMonths.join(', ')})` : ''}`
      );

      const reFetchedStudents = await getStudents();
      setStudents(reFetchedStudents);
    } catch (error: any) {
      console.error("Error processing payment full details:", error);
      const errorMsg = error.message || error.details || error.hint || (typeof error === 'string' ? error : JSON.stringify(error));
      alert(`Error processing payment: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getProfileUrl = () => {
    if (lastPayment && typeof window !== 'undefined') {
       const origin = window.location.origin;
       return `${origin}/students/${lastPayment.studentId}`;
    }
    return '';
  };

  const getPlanBadge = (plan?: 'Monthly' | 'Semester' | 'Annual' | 'Full Payment' | '3 Months' | string) => {
    const p = plan || 'Monthly';
    if (p === 'Monthly') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200 shadow-sm">Monthly</span>;
    }
    if (p === '3 Months') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 shadow-sm">3 Months</span>;
    }
    if (p === 'Semester') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">Semester</span>;
    }
    if (p === 'Annual') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-250 shadow-sm">Annual</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-250 shadow-sm">Full</span>;
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.studentId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Receipt Modal (True Popup) */}
      {lastPayment && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300 print:bg-white print:backdrop-blur-none">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200 print:shadow-none print:m-0 print:w-full print:max-w-none">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-500 to-emerald-500 print:hidden" />
            
            {/* Decorative receipt notches */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-40 h-6 bg-white rounded-full p-2 flex gap-1 items-end justify-center print:hidden">
              {[1,2,3,4,5,6].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-50"/>)}
            </div>

            <div className="p-8 space-y-6 print:p-0">
              <div className="flex flex-col items-center text-center">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 relative mb-2">
                    <img 
                      src="/logo.png" 
                      alt="RIDM Logo" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<div class="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-banknote"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/></svg></div>';
                      }}
                    />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">RIDM ACADEMY</h2>
                  <p className="text-[8px] font-black text-purple-600 uppercase tracking-[0.3em]">Financial Services</p>
                </div>

                <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4 print:hidden">
                  <CheckCircle2 size={32} strokeWidth={3} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Official Digital Receipt</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Transaction Verified</p>
              </div>

              <div className="space-y-4 py-6 border-y border-dashed border-gray-100 print:border-solid">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5 text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400">Student Name</p>
                    <p className="font-bold text-gray-900">{lastPayment.studentName}</p>
                    <p className="text-[10px] font-bold text-gray-400">Student ID: {lastPayment.studentId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400">Category / Date</p>
                    <p className="font-extrabold text-xs text-purple-600 uppercase tracking-wide">{lastPayment.feeType || 'Monthly Fee'}</p>
                    <p className="text-[10px] font-medium text-gray-500">{format(lastPayment.date, 'dd MMM yyyy')}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 flex justify-between items-center print:bg-white print:border print:border-gray-100">
                  <div className="text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400">Amount Paid</p>
                    <p className="text-2xl font-black text-gray-900">{lastPayment.amount.toLocaleString()} <small className="text-sm font-normal opacity-40">{settings?.currency || 'SAR'}</small></p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm print:hidden">
                    <Banknote size={18} className="text-green-600" />
                  </div>
                </div>

                {lastPayment.paidMonths && lastPayment.paidMonths.length > 0 && (
                  <div className="flex flex-col items-start space-y-1 text-left bg-purple-50/50 p-4 rounded-2xl border border-purple-100/50">
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Months Accounted For</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {lastPayment.paidMonths.map(m => (
                        <span key={m} className="px-2.5 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase rounded-lg border border-purple-200 shadow-sm">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code Section */}
              <div className="flex flex-col items-center space-y-4 bg-purple-50/50 p-6 rounded-[2rem] border border-purple-100 print:bg-transparent print:border-none">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <QRCodeCanvas 
                    value={getProfileUrl()} 
                    size={120}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: "/logo.png",
                      x: undefined, y: undefined, height: 24, width: 24,
                      excavate: true,
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Scan to Verify Transaction</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-tight">RIDM Secure Digital Hash</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 print:hidden">
                <button 
                  id="print-receipt-btn"
                  onClick={() => window.print()}
                  className="px-6 py-4 bg-gray-50 border border-gray-100 text-gray-700 font-black rounded-2xl hover:bg-gray-100 transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Printer size={16} />
                  Print
                </button>
                <button 
                  id="dismiss-receipt-btn"
                  onClick={() => {
                    setLastPayment(null);
                    setSelectedStudent(null);
                    setAmount('');
                    setNotes('');
                    setFeeType('Monthly Fee');
                    setSelectedMonths([]);
                  }}
                  className="px-6 py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all text-xs flex items-center justify-center gap-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Record New Payment</h1>
          <p className="text-gray-500 font-medium">Issue digital receipts and update student financial standing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        {/* Step 1: Select Student */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-8 space-y-6">
            <div className="flex items-center gap-4 border-b border-gray-50 pb-4 sm:pb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Search size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">1. Find Student</h3>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or ID..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <p className="text-center py-10 text-gray-400 text-sm italic">Loading database...</p>
              ) : filteredStudents.length === 0 ? (
                <p className="text-center py-10 text-gray-400 text-sm italic">No matching students</p>
              ) : filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudent(student);
                    setSelectedMonths([]);
                    setNotes('');
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                    selectedStudent?.id === student.id 
                      ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100" 
                      : "bg-white border-gray-100 hover:border-purple-200 hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                    selectedStudent?.id === student.id ? "bg-white/20 text-white" : "bg-purple-50 text-purple-600"
                  )}>
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate flex items-center gap-1.5">
                      {student.name}
                      <span className="shrink-0">{getPlanBadge(student.paymentPlan)}</span>
                    </p>
                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", selectedStudent?.id === student.id ? "text-white/60" : "text-gray-400")}>
                      ID: {student.studentId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", selectedStudent?.id === student.id ? "text-white/60" : "text-gray-400")}>Dues</p>
                    <p className="font-black text-xs">{calculateOutstanding(student).toLocaleString()} {settings?.currency || 'SAR'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2: Payment Details */}
        <div className="space-y-6">
          <form 
            onSubmit={handleSubmit}
            className={cn(
              "bg-white rounded-3xl shadow-sm border transition-all p-4 sm:p-8 space-y-6 relative overflow-hidden",
              selectedStudent ? "border-purple-100 opacity-100 scale-100" : "border-gray-50 opacity-50 scale-[0.98] pointer-events-none"
            )}
          >
                <div className="flex items-center gap-4 border-b border-gray-50 pb-4 sm:pb-6">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                    <Banknote size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">2. Transaction Info</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Payment Amount ({settings?.currency || 'SAR'})</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">{settings?.currency || 'SAR'}</span>
                      <input 
                        type="number" 
                        required
                        placeholder="0.00"
                        className="w-full pl-16 pr-5 py-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-purple-50 focus:bg-white transition-all text-2xl font-black text-gray-900"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                  </div>

              <div className="space-y-2 animate-none">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Fee Type (Mandatory)</label>
                <select
                  required
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.75em_auto] bg-[right_1.25rem_center] bg-no-repeat"
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value)}
                >
                  <option value="Monthly Fee">Monthly Fee</option>
                  <option value="3 Months Fee">3 Months Fee</option>
                  <option value="First Term Fee">First Term Fee</option>
                  <option value="Second Term Fee">Second Term Fee</option>
                  <option value="Full Fee">Full Fee</option>
                  <option value="Other">Other</option>
                  {/* Dynamic option to display the selected months if it doesn't match standard options */}
                  {!["Monthly Fee", "3 Months Fee", "First Term Fee", "Second Term Fee", "Full Fee", "Other"].includes(feeType) && (
                    <option value={feeType}>{feeType}</option>
                  )}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'credit_card', label: 'Card', icon: CreditCard },
                    { id: 'installment', label: 'Inst.', icon: Receipt },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id as any)}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                        method === m.id 
                          ? "bg-purple-50 border-purple-600 text-purple-600 shadow-sm" 
                          : "bg-white border-gray-50 text-gray-400 hover:bg-gray-50 hover:border-gray-100"
                      )}
                    >
                      <m.icon size={20} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee Reference Presets Area */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Fee Reference & Presets (Click to Auto-fill)</label>
                <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 space-y-3.5">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-wider">Installment-Based Fee Reference</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: 'Monthly', divisor: 12, remark: 'Monthly fee payment', feeVal: 'Monthly Fee' },
                        { label: '3 Months', divisor: 4, remark: '3-Month fee payment', feeVal: 'Monthly Fee' },
                      ].map((preset) => {
                        const val = selectedStudent ? Math.round((selectedStudent.totalFee || 0) / preset.divisor) : 0;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              if (selectedStudent) {
                                if (!amount || amount === '0') {
                                  setAmount(val.toString());
                                }
                                setNotes(preset.remark);
                                setFeeType(preset.feeVal);
                              }
                            }}
                            className="bg-white hover:bg-purple-50 hover:border-purple-250 border border-gray-100 px-3 py-2 rounded-xl transition-all text-left flex flex-col justify-between h-14"
                          >
                            <span className="text-[8px] font-black uppercase tracking-wider text-gray-400">{preset.label}</span>
                            <span className="text-xs font-black text-gray-900">{val.toLocaleString()} <span className="text-[8px] font-normal text-gray-400">{settings?.currency || 'SAR'}</span></span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-gray-100/60">
                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-wider">Term-Wise Reference</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '1st Term', value: selectedStudent ? Math.round((selectedStudent.totalFee || 0) / 2) : 0, remark: '1st Term fee payment', feeVal: 'First Term Fee' },
                        { label: '2nd Term', value: selectedStudent ? Math.round((selectedStudent.totalFee || 0) / 2) : 0, remark: '2nd Term fee payment', feeVal: 'Second Term Fee' },
                        { label: 'Full Paid', value: selectedStudent ? calculateOutstanding(selectedStudent) : 0, remark: 'Full remaining balance payment', feeVal: 'Full Fee' }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            if (selectedStudent) {
                              if (!amount || amount === '0') {
                                setAmount(preset.value.toString());
                              }
                              setNotes(preset.remark);
                              setFeeType(preset.feeVal);
                            }
                          }}
                          className="bg-white hover:bg-purple-50 hover:border-purple-250 border border-gray-100 px-3 py-2 rounded-xl transition-all text-left flex flex-col justify-between h-14"
                        >
                          <span className="text-[8px] font-black uppercase tracking-wider text-gray-400">{preset.label}</span>
                          <span className="text-xs font-black text-gray-900">{preset.value.toLocaleString()} <span className="text-[8px] font-normal text-gray-400">{settings?.currency || 'SAR'}</span></span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Paid Months (Optional)</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updatedMonths = ['January', 'February', 'March'];
                        setSelectedMonths(updatedMonths);
                        setFeeType("3 Months Fee");
                        if (selectedStudent?.monthlyFee) {
                          setAmount((selectedStudent.monthlyFee * 3).toString());
                        }
                      }}
                      className="text-[9px] font-black uppercase text-purple-600 hover:text-purple-800 tracking-wider bg-purple-50 px-2 py-1 rounded-md border border-purple-100 transition-all"
                    >
                      3 Months (Jan-Mar)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonths([]);
                        setFeeType("Other");
                        setAmount('');
                      }}
                      className="text-[9px] font-black uppercase text-gray-500 hover:text-gray-700 tracking-wider bg-gray-50 px-2 py-1 rounded-md border border-gray-100 transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month) => {
                    const isSelected = selectedMonths.includes(month);
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => {
                          let updatedMonths: string[];
                          if (isSelected) {
                            updatedMonths = selectedMonths.filter(m => m !== month);
                          } else {
                            updatedMonths = [...selectedMonths, month];
                          }
                          setSelectedMonths(updatedMonths);
                          
                          // Auto-calculate amount if monthlyFee exists
                          if (selectedStudent?.monthlyFee) {
                             setAmount((selectedStudent.monthlyFee * updatedMonths.length).toString());
                          }

                          // Auto-set feeType based on user month selection rules
                          if (updatedMonths.length === 3) {
                            setFeeType("3 Months Fee");
                          } else if (updatedMonths.length === 0) {
                            setFeeType("Other");
                          } else {
                            // Otherwise, just display the selected month name(s)
                            setFeeType(updatedMonths.join(', '));
                          }
                        }}
                        className={cn(
                          "py-2.5 px-1 rounded-xl text-xs font-bold transition-all border text-center relative overflow-hidden",
                          isSelected 
                            ? "bg-purple-600 border-purple-600 text-white shadow-md font-black"
                            : "bg-white border-gray-100 text-gray-600 hover:bg-gray-100 hover:border-gray-200"
                        )}
                      >
                        {month.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Internal Remarks (Optional)</label>
                <textarea 
                  rows={3}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium text-sm"
                  placeholder={selectedMonths.length > 0 ? `Paid months: ${selectedMonths.join(', ')}` : "e.g. Term 2 - Installment 1 of 3"}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button 
                type="submit"
                disabled={submitting || !amount}
                className="w-full py-5 gradient-bg text-white font-black rounded-2xl shadow-2xl shadow-purple-100 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={20} />
                    Finalize & Issue Receipt
                  </>
                )}
              </button>
            </div>
          </form>

          {!selectedStudent && (
            <div className="p-8 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 text-center space-y-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-gray-300 shadow-sm">
                <Receipt size={20} />
              </div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.15em] max-w-[200px] mx-auto leading-relaxed">
                Please select a student from the directory to start recording a payment
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  </>
  );
}
