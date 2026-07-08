'use client';

import React, { useState, useEffect } from 'react';
import { getPayments, getStudents, getSettings } from '@/lib/localDb';
import { Student, Payment, SchoolSettings } from '@/types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  Download, 
  Printer, 
  Calendar, 
  Filter,
  Users,
  CreditCard,
  AlertTriangle,
  FileText,
  Table as TableIcon,
  ChevronDown,
  Database,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { calculateOutstanding } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [paymentsData, studentsData, settingsData] = await Promise.all([
          getPayments(),
          getStudents(),
          getSettings()
        ]);
        setPayments(paymentsData);
        setStudents(studentsData);
        setSettings(settingsData);
      } catch (err: any) {
        console.error("Error fetching report data:", err);
        setError(err.message || "Failed to sync with financial database");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredStudentsForReport = students.filter(s => {
    if (selectedPlanFilter === 'all') return true;
    return s.paymentPlan === selectedPlanFilter;
  });

  const studentIdsForFilteredStudents = new Set(filteredStudentsForReport.map(s => s.studentId));
  const filteredPaymentsForReport = payments.filter(p => studentIdsForFilteredStudents.has(p.studentId));

  const stats = {
    totalRevenue: filteredStudentsForReport.reduce((acc, s) => acc + (s.totalFee || 0), 0),
    collected: filteredPaymentsForReport.filter(p => p.status !== 'refunded').reduce((acc, p) => acc + (p.amount || 0), 0),
    outstanding: filteredStudentsForReport.reduce((acc, s) => acc + calculateOutstanding(s), 0),
    refunded: filteredPaymentsForReport.filter(p => p.status === 'refunded').reduce((acc, p) => acc + (p.amount || 0), 0),
    collectionRate: 0
  };

  if (stats.totalRevenue > 0) {
    stats.collectionRate = Math.round((stats.collected / stats.totalRevenue) * 100);
  }

  // Prepare chart data: Daily collection for current month
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const chartData = daysInMonth.map(day => {
    const totalForDay = filteredPaymentsForReport
      .filter(p => p.status !== 'refunded' && isSameDay(new Date(p.date), day))
      .reduce((sum, p) => sum + p.amount, 0);
    return {
      day: format(day, 'dd'),
      amount: totalForDay
    };
  });

  const methodData = [
    { name: 'Cash', value: filteredPaymentsForReport.filter(p => p.status !== 'refunded' && p.method === 'cash').reduce((acc, p) => acc + p.amount, 0), color: '#8b5cf6' },
    { name: 'Card', value: filteredPaymentsForReport.filter(p => p.status !== 'refunded' && p.method === 'credit_card').reduce((acc, p) => acc + p.amount, 0), color: '#3b82f6' },
    { name: 'Installment', value: filteredPaymentsForReport.filter(p => p.status !== 'refunded' && p.method === 'installment').reduce((acc, p) => acc + p.amount, 0), color: '#ec4899' },
  ].filter(d => d.value > 0);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('RIDM Financial Intelligence Report', 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Report Period: Current Academic Session`, 14, 28);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 34);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Executive Summary:', 14, 45);
    doc.setFontSize(10);
    doc.text(`• Total Revenue Expected: ${stats.totalRevenue.toLocaleString()} ${settings?.currency || 'SAR'}`, 14, 52);
    doc.text(`• Total Collected to Date: ${stats.collected.toLocaleString()} ${settings?.currency || 'SAR'}`, 14, 58);
    doc.text(`• Total Refunded (Reversals): ${stats.refunded.toLocaleString()} ${settings?.currency || 'SAR'}`, 14, 64);
    doc.text(`• Outstanding Arrears: ${stats.outstanding.toLocaleString()} ${settings?.currency || 'SAR'}`, 14, 70);
    doc.text(`• Collection Efficiency: ${stats.collectionRate}%`, 14, 76);
    
    const tableData = filteredPaymentsForReport.slice(0, 50).map(p => [
      format(new Date(p.date), 'dd/MM/yyyy'),
      p.studentName,
      p.studentId,
      `${p.amount.toLocaleString()} ${settings?.currency || 'SAR'}`,
      p.status === 'refunded' ? 'Refunded' : (p.method || 'Cash')
    ]);
    
    autoTable(doc, {
      startY: 85,
      head: [['Date', 'Student Name', 'ID', 'Amount', 'Status/Method']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 8 }
    });
    
    doc.save('RIDM-Financial-Report.pdf');
    setShowExportOptions(false);
  };

  const exportToSQL = () => {
    const schema = `
-- RIDM Financial Database Schema
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    grade VARCHAR(100),
    parent_name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    total_paid DECIMAL(10, 2) DEFAULT 0,
    total_due DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(50),
    notes TEXT,
    processed_by VARCHAR(255)
);

-- Data Export (Current Table State)
`;

    const dataInserts = payments.map(p => 
      `INSERT INTO payments (id, student_id, amount, method, payment_date) VALUES ('${p.id}', '${p.studentId}', ${p.amount}, '${p.method}', '${format(new Date(p.date), 'yyyy-MM-dd HH:mm:ss')}');`
    ).join('\n');

    const content = schema + dataInserts;
    const blob = new Blob([content], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RIDM-Database-Export.sql';
    link.click();
    setShowExportOptions(false);
  };

  const exportToExcel = () => {
    const exportData = payments.map(p => ({
      'Date': format(new Date(p.date), 'dd/MM/yyyy'),
      'Student Name': p.studentName,
      'Student ID': p.studentId,
      [`Amount (${settings?.currency || 'SAR'})`]: p.amount,
      'Payment Method': p.method,
      'Notes': p.notes || '-'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Data");
    XLSX.writeFile(wb, "RIDM-Collections-Export.xlsx");
    setShowExportOptions(false);
  };

  const exportToDoc = () => {
    // Simple text-based doc export using blob
    const content = `
      RIDM FINANCIAL REPORT
      =====================
      Generated: ${new Date().toLocaleString()}
      
      STATS:
      Total Revenue: ${stats.totalRevenue} ${settings?.currency || 'SAR'}
      Collected: ${stats.collected} ${settings?.currency || 'SAR'}
      Outstanding: ${stats.outstanding} ${settings?.currency || 'SAR'}
      Collection Rate: ${stats.collectionRate}%
      
      TRANSACTIONS LOG:
      ${payments.map(p => `${format(p.date, 'yyyy-MM-dd')} | ${p.studentName} | ${p.amount} ${settings?.currency || 'SAR'} | ${p.method}`).join('\n')}
    `;
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RIDM-Report.doc';
    link.click();
    setShowExportOptions(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Intelligence Center</h1>
          <p className="text-gray-500 font-medium">Holistic view of collections, growth, and arrears</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-gray-100 rounded-xl">
            <Filter size={14} className="text-gray-400" />
            <select
              className="text-xs font-black uppercase tracking-wider text-gray-700 outline-none cursor-pointer bg-transparent"
              value={selectedPlanFilter}
              onChange={(e) => setSelectedPlanFilter(e.target.value)}
            >
              <option value="all">All Payment Plans</option>
              <option value="Monthly">Monthly Plan</option>
              <option value="Semester">Semester Plan</option>
              <option value="Annual">Annual Plan</option>
              <option value="Full Payment">Full Payment</option>
            </select>
          </div>
          
          <div className="relative">
            <button 
              id="export-report-dropdown-btn"
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="px-5 py-2.5 gradient-bg text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-100 flex items-center gap-2"
            >
              <Download size={14} /> 
              Export Report
              <ChevronDown size={14} className={cn("transition-transform", showExportOptions && "rotate-180")} />
            </button>

            {showExportOptions && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowExportOptions(false)} 
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Format</p>
                  </div>
                  <button 
                    onClick={exportToPDF}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">PDF Document</p>
                      <p className="text-[10px] text-gray-400 font-medium">Standard sharing format</p>
                    </div>
                  </button>
                  <button 
                    onClick={exportToExcel}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-50 text-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TableIcon size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Excel Worksheet</p>
                      <p className="text-[10px] text-gray-400 font-medium">Spreadsheet processing</p>
                    </div>
                  </button>
                  <button 
                    onClick={exportToDoc}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Word Document</p>
                      <p className="text-[10px] text-gray-400 font-medium">Text edit format</p>
                    </div>
                  </button>
                  <button 
                    onClick={exportToSQL}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 group border-t border-gray-50 mt-1"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Database size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">SQL Script</p>
                      <p className="text-[10px] text-gray-400 font-medium">Database Schema & Data</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Revenue Expected', value: stats.totalRevenue, icon: BarChart, subtitle: 'Aggregate fixed liability', color: 'blue' },
          { label: 'Total Collected', value: stats.collected, icon: CheckCircle2, subtitle: `Efficiency: ${stats.collectionRate}%`, color: 'green' },
          { label: 'Pending Arrears', value: stats.outstanding, icon: AlertTriangle, subtitle: `${filteredStudentsForReport.filter(s => calculateOutstanding(s) > 0).length} Outstanding profiles`, color: 'red' },
          { label: 'Total Refunded', value: stats.refunded, icon: RotateCcw, subtitle: `${filteredPaymentsForReport.filter(p => p.status === 'refunded').length} Reversals processed`, color: 'purple' },
        ].map(card => (
          <div key={card.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
             <div className="flex items-center justify-between">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", 
                  card.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                  card.color === 'green' ? 'bg-green-50 text-green-600' :
                  card.color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                )}>
                   <card.icon size={20} />
                </div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{card.subtitle}</span>
             </div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
                <p className="text-xl font-black text-gray-900">{card.value.toLocaleString()} <small className="text-xs font-bold text-gray-400">{settings?.currency || 'SAR'}</small></p>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main collection chart */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="text-lg font-bold text-gray-900 tracking-tight">Collection Activity (This Month)</h3>
                 <p className="text-xs text-gray-400 font-medium font-sans">Visualizing daily cash flow and bank transfers</p>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Revenue ({settings?.currency || 'SAR'})</span>
              </div>
           </div>

           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                       dataKey="day" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                       dy={10}
                    />
                    <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                    />
                    <Tooltip 
                       contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Line 
                       type="monotone" 
                       dataKey="amount" 
                       stroke="#8b5cf6" 
                       strokeWidth={4} 
                       dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                       activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                 </LineChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Method breakdown */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
           <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Method Partitioning</h3>
              <p className="text-xs text-gray-400 font-medium font-sans italic">Volume distribution by payment gateway</p>
           </div>

           <div className="h-[240px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                       data={methodData}
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={8}
                       dataKey="value"
                    >
                       {methodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                    </Pie>
                    <Tooltip />
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                 <p className="text-xl font-black text-gray-900">{(stats.collected / 1000).toFixed(1)}k</p>
              </div>
           </div>

           <div className="space-y-4">
              {methodData.map((item) => (
                 <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                       <span className="text-xs font-bold text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-gray-900">{Math.round((item.value / stats.collected) * 100)}%</span>
                 </div>
              ))}
           </div>
        </div>
      </div>

      {/* Student Financial Ledger */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Student Financial Ledger</h3>
            <p className="text-xs text-gray-400 font-medium">Complete record of student fee statuses and collection synchronization</p>
          </div>
          {error && (
            <div className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-2">
              <AlertTriangle size={12} /> Sync Warning: {error}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-100">
              {filteredStudentsForReport.filter(s => calculateOutstanding(s) === 0).length} Settled
            </div>
            <div className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100">
              {filteredStudentsForReport.filter(s => calculateOutstanding(s) > 0).length} Outstanding
            </div>
          </div>
        </div>
 
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Details</th>
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Fee</th>
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount Paid</th>
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right font-black">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudentsForReport
                .sort((a, b) => (calculateOutstanding(b) - calculateOutstanding(a)))
                .map(student => (
                  <tr key={student.id || student.studentId} className="group hover:bg-gray-50/50 transition-colors">
                     <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase",
                          calculateOutstanding(student) > 0 ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"
                        )}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                            {student.name}
                            {getPlanBadge(student.paymentPlan)}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">{student.studentId} • {student.class}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      {calculateOutstanding(student) > 0 ? (
                        <span className="px-2 py-1 rounded-md bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-tighter">PENDING</span>
                      ) : (
                        <span className="px-2 py-1 rounded-md bg-green-50 text-green-600 text-[8px] font-black uppercase tracking-tighter">SETTLED</span>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="text-[10px] font-bold text-gray-500 tracking-tight">{(student.totalFee || 0).toLocaleString()} {settings?.currency || 'SAR'}</span>
                    </td>
                    <td className="py-4">
                      <span className="text-[10px] font-bold text-green-600 tracking-tight">{(student.totalPaid || 0).toLocaleString()} {settings?.currency || 'SAR'}</span>
                    </td>
                    <td className="py-4 text-right">
                      <span className={cn(
                        "text-xs tracking-tight font-mono",
                        calculateOutstanding(student) > 0 ? "font-black text-red-600" : "font-medium text-gray-300"
                      )}>
                        {calculateOutstanding(student).toLocaleString()} {settings?.currency || 'SAR'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {filteredStudentsForReport.length === 0 && (
            <div className="py-12 text-center text-gray-400 italic text-xs">
              No students synced to the financial ledger yet for this payment plan selection.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
