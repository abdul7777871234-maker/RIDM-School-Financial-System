'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getStudents, getSettings } from '@/lib/localDb';
import { Student, SchoolSettings } from '@/types';
import { 
  Calculator, 
  Coins, 
  Banknote, 
  User, 
  CreditCard, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateOutstanding } from '@/lib/calculations';

interface Denomination {
  value: number;
  label: string;
  type: 'note' | 'coin';
}

const NOTES: Denomination[] = [
  { value: 500, label: '500 Note', type: 'note' },
  { value: 100, label: '100 Note', type: 'note' },
  { value: 50, label: '50 Note', type: 'note' },
  { value: 20, label: '20 Note', type: 'note' },
  { value: 10, label: '10 Note', type: 'note' },
  { value: 5, label: '5 Note', type: 'note' },
];

const COINS: Denomination[] = [
  { value: 2, label: '2 Coin', type: 'coin' },
  { value: 1, label: '1 Coin', type: 'coin' },
  { value: 0.50, label: '0.50 Coin', type: 'coin' },
  { value: 0.25, label: '0.25 Coin', type: 'coin' },
  { value: 0.10, label: '0.10 Coin', type: 'coin' },
  { value: 0.05, label: '0.05 Coin', type: 'coin' },
];

const ALL_DENOMINATIONS = [...NOTES, ...COINS];

type ActiveTab = 'cash' | 'installments' | 'credit';

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cash');
  const [feeAmount, setFeeAmount] = useState<string>('');
  
  // Received Cash Inputs state
  const [receivedNotes, setReceivedNotes] = useState<{ [key: number]: string }>({});
  const [receivedCoins, setReceivedCoins] = useState<{ [key: number]: string }>({});

  // Students fetched for live Credit calculations
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  // Installment Configs
  const [installmentMonths, setInstallmentMonths] = useState<number>(3);

  // Direct cash handlers
  const handleNoteChange = (value: number, valStr: string) => {
    setReceivedNotes(prev => ({ ...prev, [value]: valStr }));
  };

  const handleCoinChange = (value: number, valStr: string) => {
    setReceivedCoins(prev => ({ ...prev, [value]: valStr }));
  };

  // Fetch Students and Settings
  useEffect(() => {
    async function loadData() {
      setIsLoadingStudents(true);
      try {
        const [fetchedStudents, s] = await Promise.all([getStudents(), getSettings()]);
        setStudents(fetchedStudents);
        setSettings(s);
        if (fetchedStudents.length > 0) {
          setSelectedStudentId(fetchedStudents[0].id || '');
        }
      } catch (err) {
        console.error('Error fetching data for calculator:', err);
      } finally {
        setIsLoadingStudents(false);
      }
    }
    loadData();
  }, []);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Compute Total Cash Received in Note/Coin section
  const totalPaid = useMemo(() => {
    let sum = 0;
    NOTES.forEach(n => {
      const qty = parseFloat(receivedNotes[n.value] || '0') || 0;
      sum += qty * n.value;
    });
    COINS.forEach(c => {
      const qty = parseFloat(receivedCoins[c.value] || '0') || 0;
      sum += qty * c.value;
    });
    return Math.round(sum * 100) / 100;
  }, [receivedNotes, receivedCoins]);

  // Due Target Fee Amount
  const targetFee = useMemo(() => {
    if (activeTab === 'credit' && selectedStudent) {
      return calculateOutstanding(selectedStudent);
    }
    return parseFloat(feeAmount) || 0;
  }, [feeAmount, activeTab, selectedStudent]);

  // Change remaining to return
  const remaining = useMemo(() => {
    return Math.round((totalPaid - targetFee) * 100) / 100;
  }, [totalPaid, targetFee]);

  // Credit remaining computations
  const finalCreditRemainingAfterPay = useMemo(() => {
    if (!selectedStudent) return 0;
    const currentBalance = calculateOutstanding(selectedStudent);
    const balanceAfterPay = currentBalance - totalPaid;
    return balanceAfterPay > 0 ? Math.round(balanceAfterPay * 100) / 100 : 0;
  }, [selectedStudent, totalPaid]);

  // Compute returned change breakdown dynamically
  const returnBreakdown = useMemo(() => {
    if (remaining <= 0) return null;
    let amt = remaining;
    const breakdown: { value: number; label: string; count: number; type: 'note' | 'coin' }[] = [];
    
    for (const d of ALL_DENOMINATIONS) {
      if (amt >= d.value) {
        const count = Math.floor(Math.round((amt / d.value) * 10000) / 10000);
        if (count > 0) {
          breakdown.push({
            value: d.value,
            label: d.label,
            count,
            type: d.type
          });
          amt = Math.round((amt - count * d.value) * 100) / 100;
        }
      }
    }
    return breakdown;
  }, [remaining]);

  // Breakdown of a single installment into notes & coins (handy for parent payment visual validation)
  const singleInstallmentAmount = useMemo(() => {
    const fee = parseFloat(feeAmount) || 0;
    return Math.round((fee / installmentMonths) * 100) / 100;
  }, [feeAmount, installmentMonths]);

  const installmentDenominationsBreakdown = useMemo(() => {
    if (singleInstallmentAmount <= 0) return null;
    let amt = singleInstallmentAmount;
    const breakdown: { value: number; label: string; count: number; type: 'note' | 'coin' }[] = [];
    
    for (const d of ALL_DENOMINATIONS) {
      if (amt >= d.value) {
        const count = Math.floor(Math.round((amt / d.value) * 10000) / 10000);
        if (count > 0) {
          breakdown.push({
            value: d.value,
            label: d.label,
            count,
            type: d.type
          });
          amt = Math.round((amt - count * d.value) * 100) / 100;
        }
      }
    }
    return breakdown;
  }, [singleInstallmentAmount]);

  // Formulate the requested specific output format:
  // "returns 1 coin or 2 coins and rest of the notes remains"
  const countsSummaryText = useMemo(() => {
    if (!returnBreakdown) return null;
    let coinCount = 0;
    let noteCount = 0;
    
    returnBreakdown.forEach(item => {
      if (item.type === 'coin') {
        coinCount += item.count;
      } else {
        noteCount += item.count;
      }
    });

    const coinLabelText = coinCount === 1 ? '1 coin' : `${coinCount} coins`;
    const noteLabelText = noteCount === 0 ? '' : noteCount === 1 ? '1 note remains' : `${noteCount} notes remains`;

    if (coinCount > 0 && noteCount > 0) {
      return `returns ${coinLabelText} and rest of the ${noteLabelText}`;
    } else if (coinCount > 0) {
      return `returns ${coinLabelText} and no extra notes remains`;
    } else if (noteCount > 0) {
      return `returns no coins and the rest of the ${noteLabelText}`;
    }
    return '';
  }, [returnBreakdown]);

  const clearAll = () => {
    setFeeAmount('');
    setReceivedNotes({});
    setReceivedCoins({});
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Institutional Cash Desk & Calculator</h1>
          <p className="text-gray-500 font-medium mt-1">
            Resolve incoming physical banknotes, count exact denominations, split installments, and map credit payments for students dynamically.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('cash')}
            className={cn(
              "px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'cash' ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Calculator size={14} />
            Direct Cash
          </button>
          <button
            onClick={() => setActiveTab('installments')}
            className={cn(
              "px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'installments' ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Clock size={14} />
            Installments Splitter
          </button>
          <button
            onClick={() => setActiveTab('credit')}
            className={cn(
              "px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'credit' ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <CreditCard size={14} />
            Credit Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Interactive Calculator Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-8 shadow-sm space-y-6">
            
            {/* Header section based on tab */}
            <div className="flex items-center justify-between border-b border-gray-50 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  {activeTab === 'cash' && <Calculator size={22} />}
                  {activeTab === 'installments' && <Clock size={22} />}
                  {activeTab === 'credit' && <CreditCard size={22} />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {activeTab === 'cash' && "1. Base Fee Due & Tendered Cash"}
                    {activeTab === 'installments' && "1. Installments Setup & Schedule Details"}
                    {activeTab === 'credit' && "1. Select Student for Credit Balance Update"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {activeTab === 'cash' && "Compute direct change back using physical bills and coins"}
                    {activeTab === 'installments' && "Divide institutional fee into custom split notes over months"}
                    {activeTab === 'credit' && "Resolve payments against live student credit balances"}
                  </p>
                </div>
              </div>
              <button
                onClick={clearAll}
                className="px-4 py-2 text-xs font-bold text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
              >
                Clear Inputs
              </button>
            </div>

            {/* TAB CONTENT: DIRECT CASH */}
            {activeTab === 'cash' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Fee Amount Due</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{settings?.currency || 'SAR'}</span>
                      <input
                        type="number"
                        value={feeAmount}
                        onChange={(e) => setFeeAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-14 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-purple-150 transition-all font-bold text-lg text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="bg-purple-50/30 border border-purple-100/30 rounded-2xl p-5 flex flex-col justify-center">
                    <p className="text-xs font-black text-purple-500 uppercase tracking-wider">Total Received Tender</p>
                    <p className="text-3xl font-black text-purple-950 mt-1">{totalPaid.toLocaleString()} <small className="text-xs text-purple-600 font-bold">{settings?.currency || 'SAR'}</small></p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: INSTALLMENTS */}
            {activeTab === 'installments' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Total Fee for Installment Plan</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{settings?.currency || 'SAR'}</span>
                      <input
                        type="number"
                        value={feeAmount}
                        onChange={(e) => setFeeAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-14 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-purple-150 transition-all font-bold text-lg text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Installment Frequency</label>
                    <select
                      value={installmentMonths}
                      onChange={(e) => setInstallmentMonths(parseInt(e.target.value))}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-purple-150 transition-all font-bold text-gray-900 text-sm"
                    >
                      <option value={2}>2 Installments (Bi-monthly)</option>
                      <option value={3}>3 Installments (Quarterly)</option>
                      <option value={4}>4 Installments (4 Months)</option>
                      <option value={6}>6 Installments (Half-Yearly)</option>
                    </select>
                  </div>
                </div>

                <div className="p-5 bg-purple-50/40 rounded-2xl border border-purple-100/30 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-semibold">Installment Monthly Payment:</span>
                    <span className="font-bold text-purple-950 text-base">{singleInstallmentAmount.toLocaleString()} {settings?.currency || 'SAR'}</span>
                  </div>
                  <p className="text-xs text-purple-600 leading-relaxed font-medium">
                    This setup splits a total of <span className="font-extrabold">{parseFloat(feeAmount || '0').toLocaleString()} {settings?.currency || 'SAR'}</span> equally into {installmentMonths} individual payments. 
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CREDIT PAYMENT */}
            {activeTab === 'credit' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Pick Student to Resolve Credit</label>
                  {isLoadingStudents ? (
                    <div className="py-4 text-center text-xs text-gray-400 font-bold">Loading institutional student rosters...</div>
                  ) : (
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-purple-150 transition-all font-bold text-gray-900 text-sm"
                    >
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name} ({student.class}) - Remaining Balance: {calculateOutstanding(student).toLocaleString()} {settings?.currency || 'SAR'}
                        </option>
                      ))}
                      {students.length === 0 && (
                        <option>No students found. Add students in the Students tab first</option>
                      )}
                    </select>
                  )}
                </div>

                {selectedStudent && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Current Student Balance</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{calculateOutstanding(selectedStudent).toLocaleString()} {settings?.currency || 'SAR'}</p>
                    </div>
                    <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/30">
                      <p className="text-[10px] text-purple-600 font-black uppercase tracking-wider">Remaining Balance After Tender</p>
                      <p className="text-xl font-bold text-purple-950 mt-1">{finalCreditRemainingAfterPay.toLocaleString()} {settings?.currency || 'SAR'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Universal Note Count Entry */}
            <div className="border-t border-gray-50 pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Banknote size={20} className="text-purple-600" />
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Tendered Notes (Bills) Count</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {NOTES.map((n) => (
                  <div key={n.value} className="bg-gray-50/60 hover:bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center justify-between gap-3 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-gray-900">Note of {n.value}</p>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Bill</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={receivedNotes[n.value] || ''}
                      onChange={(e) => handleNoteChange(n.value, e.target.value)}
                      placeholder="0"
                      className="w-16 bg-white border border-gray-100 py-2 px-3 rounded-xl outline-none text-right font-bold text-gray-900 text-sm focus:border-purple-200 focus:ring-2 focus:ring-purple-50"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Universal Coin Count Entry */}
            <div className="border-t border-gray-50 pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Coins size={20} className="text-amber-500" />
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Tendered Coins Count</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {COINS.map((c) => (
                  <div key={c.value} className="bg-gray-50/60 hover:bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center justify-between gap-3 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-gray-900">Coin of {c.value}</p>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Metal Coin</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={receivedCoins[c.value] || ''}
                      onChange={(e) => handleCoinChange(c.value, e.target.value)}
                      placeholder="0"
                      className="w-16 bg-white border border-gray-100 py-2 px-3 rounded-xl outline-none text-right font-bold text-gray-900 text-sm focus:border-purple-200 focus:ring-2 focus:ring-purple-50"
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Right Sidebar - Dynamically Updated Summary Sheet */}
        <div id="calculator-sidebar-results" className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-8 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-4 flex items-center gap-2">
                <CheckCircle2 className="text-purple-600" size={18} />
                2. Live Audit & Balance Outcomes
              </h3>

              {/* Installment breakdown if on installment tab */}
              {activeTab === 'installments' && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/20">
                    <p className="text-xs font-black text-purple-700 uppercase tracking-wider mb-2">Each Monthly Installment requires:</p>
                    <p className="text-base font-black text-purple-950 mb-4">{singleInstallmentAmount.toLocaleString()} {settings?.currency || 'SAR'}</p>
                    {installmentDenominationsBreakdown && (
                      <div className="space-y-2 mt-2">
                        {installmentDenominationsBreakdown.map((item) => (
                          <div key={item.value} className="flex items-center justify-between text-xs text-gray-600 font-medium">
                            <span>
                              {item.type === 'note' ? `note of ${item.value} remains` : `coin of ${item.value} remains`}
                            </span>
                            <span className="font-bold text-gray-950">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Normal direct cash details */}
              {activeTab === 'cash' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                    <span>Total Cash Tendered:</span>
                    <span className="font-bold text-gray-900">{totalPaid.toLocaleString()} {settings?.currency || 'SAR'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-500 pb-4 border-b border-gray-100">
                    <span>Target Due Fee:</span>
                    <span className="font-bold text-gray-900">{targetFee.toLocaleString()} {settings?.currency || 'SAR'}</span>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Return Change Balance</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">
                        {remaining >= 0 ? 'Remaining change for parent:' : 'Tender shortfall:'}
                      </span>
                      <span className={cn(
                        "text-xl font-black",
                        remaining >= 0 ? "text-green-600" : "text-red-500"
                      )}>
                        {remaining >= 0 ? `+${remaining.toLocaleString()}` : `${remaining.toLocaleString()}`} {settings?.currency || 'SAR'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Credit student details showing remains */}
              {activeTab === 'credit' && selectedStudent && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/20">
                    <p className="text-[10px] font-black text-purple-700 uppercase tracking-wider mb-1">Student Account Balance Record</p>
                    <div className="flex justify-between text-xs font-bold text-gray-800 my-1">
                      <span>{selectedStudent.name}</span>
                      <span>Class: {selectedStudent.class}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-purple-100">
                      <span>Remaining Credit Due:</span>
                      <span className="font-bold text-purple-950">{calculateOutstanding(selectedStudent).toLocaleString()} {settings?.currency || 'SAR'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                      <span>Total Tender Paid:</span>
                      <span className="font-bold text-purple-950">{totalPaid.toLocaleString()} {settings?.currency || 'SAR'}</span>
                    </div>
                    
                    {/* Displaying "credit payment show that remaining balance of credit remainings" */}
                    <div className="flex justify-between items-center text-sm font-black text-purple-800 pt-3 mt-2 border-t border-purple-200">
                      <span>Remaining Balance of Credit Remains:</span>
                      <span>{finalCreditRemainingAfterPay.toLocaleString()} {settings?.currency || 'SAR'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* DENOMINATION PHRASING SUMMARY ("returns 1 coin or 2 coins and rest of the notes remains") */}
              {remaining > 0 && countsSummaryText && (
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 shadow-inner">Balancing Statement</p>
                  <p className="text-xs font-extrabold text-purple-900 leading-snug first-letter:capitalize">
                    {countsSummaryText}
                  </p>
                </div>
              )}

              {/* DYNAMIC BREAKDOWN DISPLAY ("note of 500 remains", "note of 100") */}
              {remaining > 0 && returnBreakdown && (
                <div className="space-y-3 pt-4 border-t border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recommended Drawer Denominations</p>
                  <div className="space-y-2">
                    {returnBreakdown.map((item) => (
                      <div key={item.value} className="flex items-center justify-between bg-gray-50/50 p-3 rounded-2xl border border-gray-100 transition-all hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          {item.type === 'note' ? (
                            <div className="w-8 h-8 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center">
                              <Banknote size={16} />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                              <Coins size={16} />
                            </div>
                          )}
                          <div>
                            {/* Phrasing style formatted as: note of {value} remains */}
                            <p className="text-xs font-semibold text-gray-700">
                              {item.type === 'note' ? (
                                <>note of <span className="font-extrabold text-gray-900">{item.value}</span> remains</>
                              ) : (
                                <>coin of <span className="font-extrabold text-gray-900">{item.value}</span> remains</>
                              )}
                            </p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{item.type} breakdown</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-gray-950 px-2.5 py-1 bg-white rounded-lg border border-gray-100 shadow-sm">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shortfall messaging */}
              {remaining < 0 && activeTab === 'cash' && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-2 items-start">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-red-600 uppercase tracking-widest">Tender Deficit</p>
                    <p className="text-xs font-medium text-red-800 leading-relaxed mt-1">
                      Cash inputs fall short of fee by <span className="font-black">{Math.abs(remaining).toLocaleString()} {settings?.currency || 'SAR'}</span>. Please enter higher count bills or coins.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
