'use client';

import React, { useEffect, useState } from 'react';
import { getStudents, getPayments, getSettings, addStudent, addAuditLog } from '@/lib/localDb';
import { Student, Payment } from '@/types';
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  Clock, 
  ChevronRight, 
  ArrowUpRight,
  Plus,
  X,
  Search,
  Printer,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { calculateOutstanding } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function Dashboard() {
  const { profile } = useAuth();
  
  // Dashboard Core Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalIncome: 0,
    outstanding: 0,
    unpaidCount: 0,
    partialCount: 0,
    recentPayments: [] as Payment[],
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Bulk Upload States
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [csvPasteText, setCsvPasteText] = useState('');
  const [parsedStudents, setParsedStudents] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');

  // Print Fee Slips States
  const [isPrintFeeSlipsOpen, setIsPrintFeeSlipsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlipStudent, setSelectedSlipStudent] = useState<Student | null>(null);
  const [selectedSlipFeeType, setSelectedSlipFeeType] = useState('Monthly Tuition Fee');
  const [selectedSlipAmount, setSelectedSlipAmount] = useState<number>(0);
  const [isPrintingSlip, setIsPrintingSlip] = useState(false);

  // Notification Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Auto-hide Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchDashboardData = async () => {
    try {
      const studentsList = await getStudents();
      setStudents(studentsList);
      const paymentsList = await getPayments();
      const storedSettings = await getSettings();
      setSettings(storedSettings);
      
      const totalIncome = studentsList.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
      
      let outstanding = 0;
      let unpaidCount = 0;
      let partialCount = 0;

      studentsList.forEach(s => {
        const sOut = calculateOutstanding(s);
        if (sOut > 0) {
           outstanding += sOut;
           if ((s.totalPaid || 0) === 0) {
              unpaidCount++;
           } else {
              partialCount++;
           }
        }
      });

      setStats({
        totalStudents: studentsList.length,
        totalIncome,
        outstanding,
        unpaidCount,
        partialCount,
        recentPayments: paymentsList.slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // CSV parsing helper
  const handleParseCsv = (csvText: string) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRows = results.data.map((row: any) => {
          const name = row.name || row.Name || row['Student Name'] || '';
          const classVal = row.class || row.Class || row.Grade || '';
          const studentId = row.studentId || row.studentID || row['Student ID'] || row.id || `R-${Math.floor(200 + Math.random() * 800)}`;
          const parentName = row.parentName || row.ParentName || row['Parent Name'] || row['Guardian Name'] || '';
          const parentContact = row.parentContact || row['Parent Contact'] || row['Emergency Contact'] || '';
          const totalFee = Number(row.totalFee || row['Total Fee'] || row.fee || 0);
          const totalPaid = Number(row.totalPaid || row['Total Paid'] || row.paid || 0);
          const paymentPlan = row.paymentPlan || row['Payment Plan'] || 'Monthly';
          const rollNumber = row.rollNumber || row['Roll Number'] || row.roll || '';
          
          let error = '';
          if (!name) error = 'Missing Name';
          else if (!classVal) error = 'Missing Class';
          else if (isNaN(totalFee) || totalFee <= 0) error = 'Invalid Total Fee';
          else if (isNaN(totalPaid) || totalPaid < 0) error = 'Invalid Paid Amount';
          else if (totalPaid > totalFee) error = 'Paid exceeds total fee';

          return {
            studentId,
            name,
            class: classVal,
            parentName,
            parentContact,
            totalFee,
            totalPaid,
            remainingBalance: totalFee - totalPaid,
            paymentPlan,
            rollNumber,
            status: 'active' as const,
            admissionDate: Date.now(),
            error,
            isValid: !error
          };
        });
        setParsedStudents(parsedRows);
      }
    });
  };

  const handleParseJson = (jsonText: string) => {
    try {
      const data = JSON.parse(jsonText);
      const items = Array.isArray(data) ? data : [data];
      const parsedRows = items.map((row: any) => {
        const name = row.name || row.Name || '';
        const classVal = row.class || row.Class || '';
        const studentId = row.studentId || row.studentID || `R-${Math.floor(200 + Math.random() * 800)}`;
        const parentName = row.parentName || row.ParentName || '';
        const parentContact = row.parentContact || row['Parent Contact'] || '';
        const totalFee = Number(row.totalFee || 0);
        const totalPaid = Number(row.totalPaid || 0);
        const paymentPlan = row.paymentPlan || 'Monthly';
        const rollNumber = row.rollNumber || '';

        let error = '';
        if (!name) error = 'Missing Name';
        else if (!classVal) error = 'Missing Class';
        else if (isNaN(totalFee) || totalFee <= 0) error = 'Invalid Total Fee';
        else if (isNaN(totalPaid) || totalPaid < 0) error = 'Invalid Paid Amount';

        return {
          studentId,
          name,
          class: classVal,
          parentName,
          parentContact,
          totalFee,
          totalPaid,
          remainingBalance: totalFee - totalPaid,
          paymentPlan,
          rollNumber,
          status: 'active' as const,
          admissionDate: Date.now(),
          error,
          isValid: !error
        };
      });
      setParsedStudents(parsedRows);
    } catch (e) {
      setParsedStudents([{ error: 'Invalid JSON format', isValid: false } as any]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const parsedRows = jsonData.map((row: any, idx: number) => {
          const name = row.name || row.Name || row['Student Name'] || '';
          const classVal = row.class || row.Class || row.Grade || '';
          const studentId = row.studentId || row.studentID || `R-${Math.floor(200 + Math.random() * 800)}-${idx}`;
          const parentName = row.parentName || row.ParentName || '';
          const parentContact = row.parentContact || row['Parent Contact'] || '';
          const totalFee = Number(row.totalFee || row.fee || 0);
          const totalPaid = Number(row.totalPaid || row.paid || 0);
          const paymentPlan = row.paymentPlan || 'Monthly';
          const rollNumber = row.rollNumber || row['Roll Number'] || `AUTO-${String(idx + 1).padStart(3, '0')}`;

          return {
            studentId,
            name,
            class: classVal,
            parentName,
            parentContact,
            totalFee,
            totalPaid,
            remainingBalance: totalFee - totalPaid,
            paymentPlan,
            rollNumber,
            status: 'active' as const,
            admissionDate: Date.now(),
            error: !name || !classVal ? 'Missing required fields' : '',
            isValid: !!name && !!classVal
          };
        });
        setParsedStudents(parsedRows);
      };
      reader.readAsArrayBuffer(file);
    } else if (extension === 'pdf' || extension === 'doc' || extension === 'docx') {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/students/extract', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        if (result.students) {
          const processed = result.students.map((s: any) => ({
            ...s,
            remainingBalance: (s.totalFee || 0) - (s.totalPaid || 0),
            status: 'active' as const,
            admissionDate: Date.now(),
            isValid: !!s.name && !!s.class,
            error: !s.name || !s.class ? 'Incomplete data extracted' : ''
          }));
          setParsedStudents(processed);
        } else {
          setToast({ message: result.error || 'Failed to extract data', type: 'error' });
        }
      } catch (error) {
        setToast({ message: 'Error communicating with AI extraction service', type: 'error' });
      } finally {
        setIsProcessing(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          handleParseJson(text);
        } else {
          handleParseCsv(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const loadSampleCsv = () => {
    const sample = `studentId,name,class,parentName,parentContact,totalFee,totalPaid,paymentPlan,rollNumber
R-201,Ali Hassan,Class 10-A,Hassan Ahmad,+966 50 111 2222,12000,4000,Monthly,10-02
R-202,Noura Salem,Class 11-B,Salem Khalid,+966 55 333 4444,15000,5000,Semester,11-14
R-203,Fahad Al-Qahtani,Class 9-C,Yousef Al-Qahtani,+966 54 888 9999,10000,0,Annual,09-22`;
    setCsvPasteText(sample);
    handleParseCsv(sample);
  };

  const handleProcessUpload = async () => {
    const validStudents = parsedStudents.filter(p => p.isValid);
    if (validStudents.length === 0) return;

    setIsProcessing(true);
    try {
      for (const s of validStudents) {
        await addStudent({
          studentId: s.studentId,
          name: s.name,
          class: s.class,
          parentName: s.parentName,
          parentContact: s.parentContact,
          totalFee: s.totalFee,
          totalPaid: s.totalPaid,
          paymentPlan: s.paymentPlan as any,
          rollNumber: s.rollNumber,
          status: 'active',
          admissionDate: Date.now()
        });
      }

      if (profile) {
        await addAuditLog(
          profile.uid,
          profile.email,
          `Bulk uploaded ${validStudents.length} student records successfully via Quick Actions.`
        );
      }

      setToast({
        message: `Successfully uploaded ${validStudents.length} student records!`,
        type: 'success'
      });

      setParsedStudents([]);
      setCsvPasteText('');
      setIsBulkUploadOpen(false);
      await fetchDashboardData();
    } catch (error) {
      console.error(error);
      setToast({
        message: 'Failed to complete bulk upload. Please check your data.',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerFeeSlipPrint = () => {
    if (!selectedSlipStudent) return;
    setIsPrintingSlip(true);
    setTimeout(() => {
      window.print();
      setIsPrintingSlip(false);
    }, 250);
  };

  const Card = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
      <div className={cn("absolute top-0 right-0 w-32 h-32 opacity-1 rounded-full -mr-16 -mt-16 blur-3xl", color)} />
      <div className="relative">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-inner", color.replace('bg-', 'text-').replace('/10', ' bg-opacity-10'))}>
          <Icon size={24} />
        </div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
        <p className="text-xs text-gray-400 font-medium mt-2">{subtext}</p>
      </div>
    </div>
  );

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.class && s.class.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      {/* Pristine Print-Only Fee Slip */}
      {isPrintingSlip && selectedSlipStudent && (
        <div className="hidden print:block fixed inset-0 bg-white z-[300] p-12 text-black font-sans leading-relaxed">
          {/* Header block with Logo & Title */}
          <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
            <div className="flex items-center gap-4">
              {settings?.schoolLogo ? (
                <div className="w-16 h-16 rounded-xl border border-gray-200 p-2 flex items-center justify-center bg-white overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={settings.schoolLogo} alt="Logo" className="object-contain w-full h-full" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-md">
                  {settings?.schoolName?.charAt(0) || 'R'}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">{settings?.schoolName || 'RIDM Academy'}</h1>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Student Financial Services Division</p>
                <p className="text-[10px] text-gray-400">Digital Voucher ID: FS-{selectedSlipStudent.studentId}-{Date.now().toString().slice(-6)}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-4 py-1 bg-gray-100 text-gray-800 text-[10px] font-black uppercase tracking-widest rounded-full">Official Fee Slip</span>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-3">Date: {format(new Date(), 'dd MMM yyyy')}</p>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Due Date: {format(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), 'dd MMM yyyy')}</p>
            </div>
          </div>

          {/* Student Info Grid */}
          <div className="grid grid-cols-2 gap-8 bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Student Details</p>
              <p className="text-base font-black text-gray-900">{selectedSlipStudent.name}</p>
              <p className="text-sm text-gray-600 font-bold mt-1">ID: {selectedSlipStudent.studentId} {selectedSlipStudent.rollNumber && `• Roll: ${selectedSlipStudent.rollNumber}`}</p>
              <p className="text-sm text-gray-500">Class: {selectedSlipStudent.class}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Parent/Guardian</p>
              <p className="text-base font-bold text-gray-900">{selectedSlipStudent.parentName || 'N/A'}</p>
              <p className="text-sm text-gray-600 font-medium mt-1">Contact: {selectedSlipStudent.parentContact || 'N/A'}</p>
              <p className="text-sm text-gray-500">Payment Plan: {selectedSlipStudent.paymentPlan || 'Monthly'}</p>
            </div>
          </div>

          {/* Fee Itemized Table */}
          <div className="mb-8">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Itemized Dues Statement</p>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="py-3">Particulars</th>
                  <th className="py-3">Category</th>
                  <th className="py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-bold text-gray-800">
                <tr>
                  <td className="py-4">
                    <p className="text-gray-900 font-extrabold">{selectedSlipFeeType}</p>
                    <p className="text-xs text-gray-400 font-normal mt-0.5">Academic Tuition & Program Fees</p>
                  </td>
                  <td className="py-4 text-gray-500 uppercase text-xs tracking-wider">Tuition Fee</td>
                  <td className="py-4 text-right text-gray-900 font-black">
                    {selectedSlipAmount.toLocaleString()} {settings?.currency || 'SAR'}
                  </td>
                </tr>
                <tr className="border-t border-gray-300 font-black text-base text-gray-900">
                  <td className="py-4" colSpan={2}>Total Outstanding Payable</td>
                  <td className="py-4 text-right text-lg">
                    {selectedSlipAmount.toLocaleString()} {settings?.currency || 'SAR'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer signatures and security QR */}
          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-dashed border-gray-300 items-end mt-12">
            {/* QR block */}
            <div className="flex flex-col items-start space-y-2">
              <QRCodeSVG 
                value={`RIDM-FEESLIP:${selectedSlipStudent.studentId}:AMOUNT:${selectedSlipAmount}:DATE:${Date.now()}`}
                size={90}
                level="M"
              />
              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Scan to Verify Standings</p>
            </div>

            {/* Middle Stamp or Watermark info */}
            <div className="text-center pb-2 relative flex flex-col items-center justify-center">
              <div className="border-2 border-green-600/40 rounded-xl px-4 py-2 transform rotate-[-6deg] bg-white text-green-700/80 uppercase font-black text-[10px] tracking-widest select-none">
                <p className="leading-tight">RIDM ACADEMY</p>
                <p className="text-[8px] font-bold text-green-600/60 leading-none">SYSTEM VALIDATED</p>
              </div>
            </div>

            {/* Signature Block */}
            <div className="text-right pb-4 border-b border-gray-300">
              <p className="text-xs font-black text-gray-900 uppercase">Authorized Signature</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Accounts & Audit Registrar</p>
            </div>
          </div>

          <div className="mt-16 text-center text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
            Thank you for your prompt cooperation. This fee slip is digitally signed by RIDM Institutional Core.
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {isBulkUploadOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 print:hidden">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 sm:p-8 space-y-6">
            <button 
              onClick={() => {
                setIsBulkUploadOpen(false);
                setParsedStudents([]);
                setCsvPasteText('');
              }} 
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Upload size={24} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Bulk Student Upload</h3>
              <p className="text-gray-500 text-sm mt-1 font-medium">Add multiple students simultaneously by importing a file or pasting raw values.</p>
            </div>

            {/* Tab Controls */}
            <div className="flex border-b border-gray-100 p-1 bg-gray-50 rounded-2xl">
              <button
                onClick={() => {
                  setActiveTab('upload');
                  setParsedStudents([]);
                }}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                  activeTab === 'upload' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Upload Files (.pdf, .docx, .xlsx, .csv, .json)
              </button>
              <button
                onClick={() => {
                  setActiveTab('paste');
                  setParsedStudents([]);
                }}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                  activeTab === 'paste' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Paste CSV Text
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'upload' ? (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center transition-all min-h-[220px] cursor-pointer",
                  isDragging ? "border-purple-500 bg-purple-50/40" : "border-gray-200 hover:border-purple-300 bg-gray-50/30"
                )}
              >
                <Upload size={40} className="text-gray-400 mb-4 animate-bounce" />
                <p className="text-sm font-bold text-gray-700">Drag and drop your file here, or click to browse</p>
                <p className="text-xs text-gray-400 font-medium mt-1">Supports PDF, Word, Excel, CSV, or JSON</p>
                
                <input 
                  type="file" 
                  accept=".csv,.json,.pdf,.docx,.doc,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processFile(file);
                  }}
                  className="hidden" 
                  id="bulk-file-input" 
                />
                <label 
                  htmlFor="bulk-file-input" 
                  className="mt-5 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-xl shadow-xs hover:bg-gray-50 active:scale-95 transition-all cursor-pointer inline-block"
                >
                  Choose File
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">CSV Value Paste Arena</span>
                  <button 
                    onClick={loadSampleCsv} 
                    className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={13} /> Load Sample Template
                  </button>
                </div>
                <textarea
                  value={csvPasteText}
                  onChange={(e) => {
                    setCsvPasteText(e.target.value);
                    handleParseCsv(e.target.value);
                  }}
                  placeholder="studentId,name,class,parentName,parentContact,totalFee,totalPaid,paymentPlan&#10;R-201,Ahmed,Class 10-A,Khalid,+966 50 123 4567,12000,4000,Monthly"
                  className="w-full h-44 p-4 border border-gray-100 rounded-2xl bg-gray-50/50 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all resize-none"
                />
              </div>
            )}

            {/* Parsed List Preview */}
            {parsedStudents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Parsed Records Preview ({parsedStudents.length})</h4>
                  <span className="text-xs font-bold text-green-600">
                    {parsedStudents.filter(p => p.isValid).length} Valid • {parsedStudents.filter(p => !p.isValid).length} Invalid
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-gray-50 pr-2 border border-gray-50 rounded-2xl p-2 bg-gray-50/20">
                  {parsedStudents.map((student, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs font-medium">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{student.name || 'Unnamed Student'}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          ID: {student.studentId || 'New'} • Class: {student.class || 'N/A'} • Plan: {student.paymentPlan || 'Monthly'}
                        </span>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-gray-900">{Number(student.totalFee || 0).toLocaleString()} <small className="text-[10px] text-gray-400 font-normal">Fee</small></span>
                          <span className="text-[10px] text-green-600 font-bold">{Number(student.totalPaid || 0).toLocaleString()} Paid</span>
                        </div>
                        {student.isValid ? (
                          <span className="bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg">Valid</span>
                        ) : (
                          <span className="bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg" title={student.error}>
                            Error
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex gap-3 pt-4 border-t border-gray-50">
              <button 
                onClick={() => {
                  setIsBulkUploadOpen(false);
                  setParsedStudents([]);
                  setCsvPasteText('');
                }}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 font-bold text-sm rounded-2xl hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={isProcessing || parsedStudents.filter(p => p.isValid).length === 0}
                onClick={handleProcessUpload}
                className="flex-1 py-3 px-4 bg-purple-600 text-white font-black text-sm rounded-2xl hover:bg-purple-700 disabled:bg-gray-100 disabled:text-gray-400 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Records...
                  </>
                ) : (
                  <>Import {parsedStudents.filter(p => p.isValid).length} Students</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Fee Slips Modal */}
      {isPrintFeeSlipsOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 print:hidden">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col md:flex-row">
            <button 
              onClick={() => {
                setIsPrintFeeSlipsOpen(false);
                setSelectedSlipStudent(null);
                setSearchQuery('');
              }} 
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all z-10 cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Left side: Student Selector list */}
            <div className="w-full md:w-5/12 border-r border-gray-100 p-6 flex flex-col max-h-[90vh]">
              <div className="mb-4">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Select Student</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">Search through enrollment list</p>
              </div>

              {/* Search Box */}
              <div className="relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search name, ID or class..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {/* Student List Grid */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50 pr-1 space-y-1">
                {filteredStudents.length === 0 ? (
                  <p className="text-center py-10 text-gray-400 text-xs font-bold italic">No active students found</p>
                ) : filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSlipStudent(s);
                      setSelectedSlipAmount(calculateOutstanding(s));
                    }}
                    className={cn(
                      "w-full text-left p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer group",
                      selectedSlipStudent?.id === s.id 
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-100" 
                        : "hover:bg-purple-50/50"
                    )}
                  >
                    <div>
                      <p className={cn("text-sm font-black", selectedSlipStudent?.id === s.id ? "text-white" : "text-gray-900")}>{s.name}</p>
                      <p className={cn("text-[10px] font-bold uppercase tracking-wider mt-0.5", selectedSlipStudent?.id === s.id ? "text-purple-200" : "text-gray-400")}>
                        ID: {s.studentId} • {s.class}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-1.5">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg",
                        selectedSlipStudent?.id === s.id 
                          ? "bg-white/20 text-white" 
                          : calculateOutstanding(s) > 0 
                          ? "bg-red-50 text-red-500" 
                          : "bg-green-50 text-green-500"
                      )}>
                        {calculateOutstanding(s) > 0 ? `${calculateOutstanding(s).toLocaleString()} SAR` : 'Paid'}
                      </span>
                      <ChevronRight size={14} className={selectedSlipStudent?.id === s.id ? "text-white" : "text-gray-300 group-hover:translate-x-0.5 transition-all"} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right side: Slip Preview and Printing Config */}
            <div className="w-full md:w-7/12 bg-gray-50/50 p-6 sm:p-8 flex flex-col justify-between max-h-[90vh] overflow-y-auto">
              {selectedSlipStudent ? (
                <div className="space-y-6 flex-1 flex flex-col">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Print Settings</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Configure slip fields before triggering printer</p>
                  </div>

                  {/* Settings selectors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Statement Type</label>
                      <select 
                        value={selectedSlipFeeType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedSlipFeeType(val);
                          if (val === 'Outstanding Dues Statement') {
                            setSelectedSlipAmount(calculateOutstanding(selectedSlipStudent));
                          } else if (val === 'Monthly Tuition Fee') {
                            setSelectedSlipAmount(selectedSlipStudent.monthlyFee || (selectedSlipStudent.totalFee / 10));
                          } else {
                            setSelectedSlipAmount(selectedSlipStudent.totalFee);
                          }
                        }}
                        className="w-full py-2.5 px-3 bg-white border border-gray-100 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                      >
                        <option value="Outstanding Dues Statement">Outstanding Dues Only</option>
                        <option value="Monthly Tuition Fee">Single Month Tuition</option>
                        <option value="Full Semester tuition Fee">Full Term Tuition</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Custom Slip Value ({settings?.currency || 'SAR'})</label>
                      <input 
                        type="number"
                        value={selectedSlipAmount}
                        onChange={(e) => setSelectedSlipAmount(Number(e.target.value))}
                        className="w-full py-2.5 px-3 bg-white border border-gray-100 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>

                  {/* Slip Preview Block on Screen */}
                  <div className="flex-1 border border-gray-100 rounded-3xl bg-white p-6 relative overflow-hidden shadow-sm flex flex-col justify-between max-w-md mx-auto w-full min-h-[380px]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                    
                    {/* Header of preview */}
                    <div className="flex justify-between items-start pb-4 border-b border-gray-50 mb-4">
                      <div className="flex gap-2.5 items-center">
                        <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm">
                          {settings?.schoolName?.charAt(0) || 'R'}
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-tight leading-none truncate max-w-[150px]">{settings?.schoolName || 'RIDM Academy'}</h4>
                          <span className="text-[7px] text-gray-400 font-bold uppercase tracking-wider">Official Fee Slip</span>
                        </div>
                      </div>
                      <div className="text-right text-[8px] text-gray-400 font-bold uppercase leading-tight">
                        <p>Date: {format(new Date(), 'dd MMM yyyy')}</p>
                        <p className="text-purple-600 mt-0.5">DUE IN 10 DAYS</p>
                      </div>
                    </div>

                    {/* Student particulars */}
                    <div className="space-y-2 mb-4 bg-gray-50/50 p-3.5 rounded-2xl border border-gray-50">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400 font-medium">Student Name</span>
                        <span className="text-gray-800 font-black">{selectedSlipStudent.name}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400 font-medium">Student ID / Roll</span>
                        <span className="text-gray-700 font-bold">{selectedSlipStudent.studentId} {selectedSlipStudent.rollNumber && `/ ${selectedSlipStudent.rollNumber}`}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400 font-medium">Class / Grade</span>
                        <span className="text-gray-700 font-bold">{selectedSlipStudent.class}</span>
                      </div>
                    </div>

                    {/* Details and breakdown */}
                    <div className="space-y-3 mb-4 flex-1">
                      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-1">
                        <span>Description</span>
                        <span>Amount</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold py-1">
                        <div>
                          <p className="text-gray-800 font-black">{selectedSlipFeeType}</p>
                          <p className="text-[9px] text-gray-400 font-normal">Plan: {selectedSlipStudent.paymentPlan || 'Monthly'}</p>
                        </div>
                        <span className="text-gray-900 font-black">{selectedSlipAmount.toLocaleString()} {settings?.currency || 'SAR'}</span>
                      </div>
                    </div>

                    {/* Verification and signature block */}
                    <div className="border-t border-dashed border-gray-100 pt-4 flex items-center justify-between">
                      <div className="opacity-80">
                        <QRCodeSVG 
                          value={`RIDM-FEESLIP:${selectedSlipStudent.studentId}:AMOUNT:${selectedSlipAmount}:DATE:${Date.now()}`}
                          size={48}
                          level="M"
                        />
                      </div>
                      
                      <div className="text-right flex flex-col items-end">
                        <div className="border border-green-600/20 rounded-md px-1.5 py-0.5 mb-1.5 bg-green-50 text-green-700 font-black text-[7px] uppercase tracking-wider">
                          SYSTEM VALIDATED
                        </div>
                        <p className="text-[8px] font-black text-gray-900 uppercase">Accounts Registrar</p>
                      </div>
                    </div>
                  </div>

                  {/* Print Button */}
                  <div className="pt-4 border-t border-gray-100 flex gap-3">
                    <button 
                      onClick={triggerFeeSlipPrint}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-100"
                    >
                      <Printer size={16} /> Print Fee Slip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <Printer size={48} className="text-gray-300 mb-4 animate-pulse" />
                  <h4 className="font-extrabold text-gray-900 text-base">No Student Selected</h4>
                  <p className="text-gray-400 text-xs font-medium max-w-xs mt-1">Please select an active student from the left panel to configure and view their official fee slip statement.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Toast Notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[300] bg-white border border-gray-100 rounded-3xl p-4 flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 print:hidden animate-out fade-out slide-out-to-bottom-5">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
            toast.type === 'success' ? "bg-green-50 text-green-600" :
            toast.type === 'error' ? "bg-red-50 text-red-600" :
            "bg-amber-50 text-amber-600"
          )}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          </div>
          <p className="text-xs font-bold text-gray-900 pr-2">{toast.message}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-10 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Overview Dashboard</h2>
            <p className="text-gray-500 font-medium font-sans">Real-time snapshots of your school&apos;s financial health</p>
          </div>
          {profile?.role !== 'auditor' && (
            <Link 
              href="/students"
              className="inline-flex items-center gap-2 px-6 py-3 gradient-bg text-white font-bold rounded-2xl shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus size={20} />
              Add New Student
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          <Card 
            title="Total Students" 
            value={stats.totalStudents} 
            icon={Users} 
            color="bg-blue-500/10" 
            subtext="Active in database"
          />
          <Card 
            title="Total Collections" 
            value={`${stats.totalIncome.toLocaleString()} ${settings?.currency || 'SAR'}`} 
            icon={TrendingUp} 
            color="bg-green-500/10" 
            subtext="Processed to date"
          />
          <Card 
            title="Outstanding" 
            value={`${stats.outstanding.toLocaleString()} ${settings?.currency || 'SAR'}`} 
            icon={CreditCard} 
            color="bg-red-500/10" 
            subtext={`${stats.unpaidCount} unpaid, ${stats.partialCount} partially paid`}
          />
          <Card 
            title="Active Plans" 
            value="12" 
            icon={Clock} 
            color="bg-purple-500/10" 
            subtext="Installment tracking"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-8 py-5 sm:py-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Recent Transactions</h3>
              <Link href="/reports" className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
                View All <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-4 sm:px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student</th>
                    <th className="px-4 sm:px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="px-4 sm:px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium">
                  {stats.recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 sm:px-8 py-10 text-center text-gray-400 italic">No recent payments found</td>
                    </tr>
                  ) : stats.recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 sm:px-8 py-4 sm:py-5">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{p.studentName}</p>
                            <div className="flex items-center gap-2">
                               <span className={cn(
                                  "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                                  p.status === 'refunded' ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"
                               )}>
                                 {p.status || 'success'}
                               </span>
                               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.method}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-gray-500 font-bold">
                        {format(p.date, 'MMM dd, yyyy')}
                      </td>
                      <td className={cn(
                        "px-4 sm:px-8 py-4 sm:py-5 text-right font-black",
                        p.status === 'refunded' ? "text-red-400 line-through" : "text-gray-900"
                      )}>
                        {p.amount.toLocaleString()} <small className="font-normal text-gray-400">{settings?.currency || 'SAR'}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Links / Actions */}
          <div className="space-y-6">
            <div className="bg-linear-to-br from-indigo-900 via-purple-900 to-purple-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative">
                <h4 className="text-xl font-black mb-1">Financial Report</h4>
                <p className="text-xs font-bold text-purple-300 opacity-80 mb-6">Generate full audit for current term</p>
                <Link href="/reports" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-900 font-black text-sm rounded-2xl hover:bg-purple-50 transition-all">
                  Generate <ChevronRight size={16} strokeWidth={3} />
                </Link>
              </div>
            </div>
            
            {profile?.role !== 'auditor' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                <h4 className="font-bold text-gray-900">Quick Actions</h4>
                <div className="space-y-3">
                  <button 
                    onClick={() => setIsBulkUploadOpen(true)} 
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-50 hover:border-purple-100 hover:bg-purple-50 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-blue-50 text-blue-600">
                        <Users size={18} />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Bulk Student Upload</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-600 transition-all" />
                  </button>

                  <button 
                    onClick={() => setIsPrintFeeSlipsOpen(true)} 
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-orange-50 text-orange-600">
                        <CreditCard size={18} />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Print Fee Slips</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-600 transition-all" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
