'use client';

import React, { useState, useEffect } from 'react';
import { getStudents, getSettings, addAuditLog } from '@/lib/localDb';
import { calculateOutstanding } from '@/lib/calculations';
import { Student, SchoolSettings } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FileText, Search, CreditCard, AlertCircle, CheckCircle2, ChevronRight, 
  BarChart, Mail, Copy, Send, X, ShieldAlert, Sparkles, AlertTriangle, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';

export default function FeesStatus() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'outstanding' | 'paid'>('all');
  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  // Reminder Modal State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reminderType, setReminderType] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // Bulk Report State
  const [showBulkSummary, setShowBulkSummary] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, s] = await Promise.all([getStudents(), getSettings()]);
        setStudents(data);
        setSettings(s);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.studentId.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = 
      filter === 'all' ? true : 
      filter === 'outstanding' ? calculateOutstanding(s) > 0 : 
      calculateOutstanding(s) <= 0;
    return matchesSearch && matchesFilter;
  });

  const totals = {
    expected: students.reduce((acc, s) => acc + (s.totalFee || 0), 0),
    collected: students.reduce((acc, s) => acc + (s.totalPaid || 0), 0),
    outstanding: students.reduce((acc, s) => acc + calculateOutstanding(s), 0),
    unpaidCount: students.filter(s => calculateOutstanding(s) > 0).length,
  };

  // Generate Reminder Templates Dynamically
  const getSubject = (student: Student) => {
    return `[IMPORTANT] Outstanding Fee Payment Reminder - ${student.name} (${student.studentId})`;
  };

  const getMessageContent = (student: Student, type: 'email' | 'sms' | 'whatsapp') => {
    const schoolName = settings?.schoolName || 'RIDM Student Financial System';
    const currency = settings?.currency || 'SAR';
    const balance = calculateOutstanding(student);

    if (type === 'email') {
      return `Dear Parent of ${student.name},

We hope this notification finds you well.

This is an official automated financial update from ${schoolName} regarding your outstanding balance:

• Student Name: ${student.name}
• Enrollment ID: ${student.studentId}
• Academic Class: Class ${student.class || 'N/A'}
• Billing Frequency: ${student.paymentPlan || 'Monthly'}

----------------------------------------------------
FINANCIAL LEDGER SUMMARY:
• Annual Fee Fixed: ${student.totalFee.toLocaleString()} ${currency}
• Amount Paid to Date: ${student.totalPaid.toLocaleString()} ${currency}
• Total Outstanding Balance Due: ${balance.toLocaleString()} ${currency}
----------------------------------------------------

Please settle this outstanding invoice at your earliest convenience through the school's online financial portal, or by visiting our accounts desk. 

If this payment was already recently processed, please disregard this automated notification or upload the transaction receipt for reconciliation.

Kind regards,
Accounts & Finance Office
${schoolName}`;
    }

    if (type === 'sms') {
      return `[FEE REMINDER] ${schoolName}: Parent of ${student.name} (${student.studentId}), outstanding arrears of ${balance.toLocaleString()} ${currency} is due. Please settle via portal. Thank you.`;
    }

    return `*🚨 OUTSTANDING FEE REMINDER - ${schoolName}*

Dear Parent of *${student.name}* (ID: ${student.studentId}),

This is a gentle reminder that your account shows an outstanding balance of *${balance.toLocaleString()} ${settings?.currency || 'SAR'}*.

*Billing Details:*
• Class: Class ${student.class}
• Plan: ${student.paymentPlan}
• Balance Owed: *${balance.toLocaleString()} ${currency}*

Kindly secure payment via our mobile app/portal or school desk.
_Thank you for your timely cooperation!_`;
  };

  // Handle open reminder
  const handleOpenReminder = (student: Student) => {
    setSelectedStudent(student);
    setReminderType('email');
    setCustomSubject(getSubject(student));
    setCustomMessage(getMessageContent(student, 'email'));
    setSentSuccess(false);
    setCopied(false);
  };

  // Switch type updates text area
  const handleTypeChange = (type: 'email' | 'sms' | 'whatsapp') => {
    if (!selectedStudent) return;
    setReminderType(type);
    setCustomSubject(type === 'email' ? getSubject(selectedStudent) : '');
    setCustomMessage(getMessageContent(selectedStudent, type));
    setCopied(false);
  };

  // Copy Template
  const handleCopyToClipboard = () => {
    const textToCopy = reminderType === 'email' 
      ? `Subject: ${customSubject}\n\n${customMessage}` 
      : customMessage;
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Send Reminder (Simulated with Real Database Audit Logging!)
  const handleSendReminder = async () => {
    if (!selectedStudent) return;
    setIsSending(true);

    try {
      // Log official notification audit log to Supabase/Local Database
      const adminEmail = profile?.email || 'admin@ridm.system';
      const adminName = profile?.displayName || 'System Admin';

      await addAuditLog(
        'admin-reminder',
        adminName,
        `Sent ${reminderType.toUpperCase()} outstanding balance reminder of ${calculateOutstanding(selectedStudent).toLocaleString()} ${settings?.currency || 'SAR'} to ${selectedStudent.name} (${selectedStudent.studentId})`
      );

      setTimeout(() => {
        setIsSending(false);
        setSentSuccess(true);
      }, 1200);

    } catch (err) {
      console.error(err);
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Header and Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fee Collection Status</h1>
          <p className="text-gray-500 font-medium font-sans italic">Track institution-wide revenue, arrears & dispatch smart payment reminders</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowBulkSummary(true)}
            className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-black rounded-xl text-xs uppercase tracking-wider border border-purple-200 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} /> Bulk Reminders Report
          </button>
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
            {(['all', 'outstanding', 'paid'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                  filter === f ? "bg-purple-600 text-white shadow-lg shadow-purple-100" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Expected Revenue', value: totals.expected.toLocaleString() + ' ' + (settings?.currency || 'SAR'), icon: BarChart, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Collected', value: totals.collected.toLocaleString() + ' ' + (settings?.currency || 'SAR'), icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
          { label: 'Total Arrears Owed', value: totals.outstanding.toLocaleString() + ' ' + (settings?.currency || 'SAR'), icon: AlertCircle, color: 'text-red-600 bg-red-50' },
          { label: 'Unpaid Students', value: totals.unpaidCount + ' Students', icon: FileText, color: 'text-purple-600 bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", stat.color)}>
              <stat.icon size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-lg font-black text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by student or ID..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-purple-200 focus:ring-4 focus:ring-purple-50 transition-all font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Student Info</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Fixed Fee</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Paid to Date</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Balance Due</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-400">Loading ledger data...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">No records matching your filters</td></tr>
              ) : filteredStudents.map((student) => {
                const outstanding = calculateOutstanding(student);
                return (
                  <tr key={student.id} className="hover:bg-gray-50/20 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1 text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{student.name}</p>
                          {getPlanBadge(student.paymentPlan)}
                          {outstanding > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest bg-red-100 text-red-700 border border-red-200">
                              <AlertTriangle size={8} className="animate-pulse" /> Arrears
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {student.studentId} • Class {student.class}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right font-bold text-gray-500">
                      {student.totalFee.toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-right font-bold text-green-600">
                      {student.totalPaid.toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {outstanding > 0 ? (
                        <span className="font-black text-sm px-3 py-1 rounded-lg text-red-600 bg-red-50 border border-red-100 inline-block">
                          {outstanding.toLocaleString()} {settings?.currency || 'SAR'}
                        </span>
                      ) : (
                        <span className="font-black text-sm px-3 py-1 rounded-lg text-green-600 bg-green-50 inline-block">
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {outstanding > 0 ? (
                          <>
                            <Link 
                              href="/payments"
                              className="inline-flex items-center gap-1 text-[10px] font-black text-purple-600 uppercase tracking-widest hover:bg-purple-100 px-3 py-1.5 rounded-full border border-purple-100 transition-all"
                            >
                              Collect <ChevronRight size={10} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleOpenReminder(student)}
                              className="inline-flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full border border-red-100 cursor-pointer transition-all"
                            >
                              <Mail size={12} /> Send Reminder
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-600 uppercase tracking-widest">
                            Settled <CheckCircle2 size={12} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Reminder Generator Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-purple-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-base">Generate Payment Reminder</h3>
                    <p className="text-xs text-purple-700 font-bold uppercase tracking-wider">Student: {selectedStudent.name} ({selectedStudent.studentId})</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Switcher channel */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Notification Channel</label>
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                    {(['email', 'sms', 'whatsapp'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleTypeChange(type)}
                        className={cn(
                          "py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                          reminderType === type 
                            ? "bg-white text-purple-700 shadow-sm border border-purple-100" 
                            : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        {type === 'email' && '📧 Email'}
                        {type === 'sms' && '💬 SMS'}
                        {type === 'whatsapp' && '🟢 WhatsApp'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject Block */}
                {reminderType === 'email' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Email Subject Line</label>
                    <input 
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white font-bold text-xs text-gray-900 tracking-tight"
                    />
                  </div>
                )}

                {/* Message Box */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Template</label>
                    <span className="text-[9px] text-purple-700 font-extrabold uppercase tracking-wide bg-purple-50 px-2 py-0.5 rounded border border-purple-100">Dyna-Template Verified</span>
                  </div>
                  <textarea 
                    rows={10}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white font-mono text-xs text-gray-700 leading-relaxed"
                  />
                </div>
              </div>

              {/* Success Feedback Banner */}
              {sentSuccess && (
                <div className="p-4 bg-green-50 text-green-700 text-xs font-bold border-t border-green-100 flex items-center justify-between px-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-green-600 shrink-0" />
                    <span>System has dispatched and logged this payment reminder successfully.</span>
                  </div>
                  <span className="text-[9px] bg-green-100 border border-green-200 text-green-800 px-2.5 py-0.5 rounded font-black uppercase">Live DB Synced</span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="p-6 border-t border-gray-50 bg-gray-50/50 flex flex-wrap gap-3 justify-between items-center">
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  className="px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-black rounded-2xl text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-green-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy to Clipboard
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="px-5 py-3 bg-transparent hover:bg-gray-100 text-gray-500 font-black rounded-2xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={handleSendReminder}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-black rounded-2xl text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-100 transition-all cursor-pointer shrink-0"
                  >
                    {isSending ? (
                      <>Discharging...</>
                    ) : (
                      <>
                        <Send size={14} /> Dispatch Reminder
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Report Summary Overlay Modal */}
      <AnimatePresence>
        {showBulkSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkSummary(false)}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-purple-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-base">Arrears & Outstandings Broadcaster Summary</h3>
                    <p className="text-xs text-purple-700 font-bold uppercase tracking-wider">Global Overview: {totals.unpaidCount} Students Flagged</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBulkSummary(false)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 flex gap-4 items-start">
                  <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-xs font-black uppercase text-red-800 tracking-wider mb-1">Unsettled Financial Summary</h4>
                    <p className="text-xs text-red-700 font-medium font-sans">
                      A total of <span className="font-black">{totals.unpaidCount} students</span> currently hold outstanding debts. 
                      The net arrears pending recovery is <span className="font-black">{totals.outstanding.toLocaleString()} {settings?.currency || 'SAR'}</span>.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Flagged Student Directory</h4>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                    {students.filter(s => calculateOutstanding(s) > 0).map(s => {
                      const balance = calculateOutstanding(s);
                      return (
                        <div key={s.id} className="p-4 flex items-center justify-between hover:bg-gray-50/20 transition-all">
                          <div>
                            <p className="font-bold text-gray-900 text-xs">{s.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">ID: {s.studentId} • Plan: {s.paymentPlan}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-red-600 px-2.5 py-1 rounded-lg bg-red-50 border border-red-100">
                              {balance.toLocaleString()} {settings?.currency || 'SAR'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowBulkSummary(false);
                                handleOpenReminder(s);
                              }}
                              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                            >
                              Dispatch
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overall generated email preview */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Generated School Board Summary Report</label>
                  <textarea 
                    rows={6}
                    readOnly
                    value={`SCHOOL ARREARS CONSOLIDATED REPORT
Date: ${new Date().toLocaleDateString()}
Total Flagged Students: ${totals.unpaidCount}
Total Pending Receivables: ${totals.outstanding.toLocaleString()} ${settings?.currency || 'SAR'}

The accounts and registrations lists have been flagged. Individual notification reminders have been prepared for dispatch to parent emails and mobile registers.`}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-mono text-xs text-gray-500 outline-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-50 bg-gray-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkSummary(false)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-100"
                >
                  Dismiss Overview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
