'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStudents, addStudent, updateStudent, deleteStudent, getSettings } from '@/lib/localDb';
import { calculateOutstanding, calculateTotalPaid } from '@/lib/calculations';
import { Student, SchoolSettings } from '@/types';
import { Plus, Search, User, Phone, GraduationCap, X, Save, Trash2, AlertTriangle, Loader2, BookOpen, Hash, DollarSign, Calendar, ChevronRight, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Students() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '',
    studentId: '',
    rollNumber: '',
    class: '',
    parentName: '',
    parentContact: '',
    totalFee: 0,
    totalPaid: 0,
    remainingBalance: 0,
    status: 'active',
    admissionDate: Date.now(),
    paymentPlan: 'Monthly',
    paidMonths: [],
  });

  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isDeletingInProgress, setIsDeletingInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  
  useEffect(() => {
    const fetchSettings = async () => {
      const s = await getSettings();
      setSettings(s);
    };
    fetchSettings();
  }, []);

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setNewStudent({ ...student });
    setError(null);
    setIsModalOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    setIsDeletingInProgress(true);
    try {
      await deleteStudent(deletingStudent.id!, deletingStudent.studentId);
      setStudents(prev => prev.filter(s => s.id !== deletingStudent.id));
      setDeletingStudent(null);
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student and their payment history. Please try again.");
    } finally {
      setIsDeletingInProgress(false);
    }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
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

  const handleSubmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      if (editingStudent) {
        // Update existing student
        await updateStudent({ ...editingStudent, ...newStudent } as Student);
        setStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...editingStudent, ...newStudent } as Student : s));
      } else {
        // Register new student
        if (!newStudent.studentId) {
          const year = new Date().getFullYear();
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          newStudent.studentId = `RIDM-${year}-${randomNum}`;
        }
        const added = await addStudent(newStudent);
        setStudents(prev => [...prev, added]);
      }
      setIsModalOpen(false);
      setEditingStudent(null);
      setNewStudent({ name: '', studentId: '', rollNumber: '', class: '', parentName: '', parentContact: '', totalFee: 0, totalPaid: 0, paymentPlan: 'Monthly', paidMonths: [] });
    } catch (err: any) {
      console.error("Error submitting student:", err);
      setError(err.message || "Failed to save student. Please check database connectivity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlanBadge = (plan?: 'Monthly' | 'Semester' | 'Annual' | 'Full Payment' | '3 Months' | string) => {
    const p = plan || 'Monthly';
    if (p === 'Monthly') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200 ml-2 shadow-sm shrink-0">Monthly</span>;
    }
    if (p === '3 Months') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 ml-2 shadow-sm shrink-0">3 Months</span>;
    }
    if (p === 'Semester') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 ml-2 shadow-sm shrink-0">Semester</span>;
    }
    if (p === 'Annual') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-250 ml-2 shadow-sm shrink-0">Annual</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-250 ml-2 shadow-sm shrink-0">Full</span>;
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.studentId.toLowerCase().includes(search.toLowerCase()) ||
    (s.rollNumber && s.rollNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6" id="students-directory-container">
      <div className="flex justify-between items-center" id="students-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Directory</h1>
          <p className="text-gray-500 font-medium">Manage all enrolled students and their records</p>
        </div>
        <button 
          id="open-register-student-button"
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="px-6 py-3 gradient-bg text-white font-bold rounded-2xl shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          Register Student
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/30">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Student Info</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Class</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parent Details</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Paid</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Balance</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Status & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400">Loading student directory...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400">No students found matching your search</td>
                </tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <div 
                        onClick={() => router.push(`/students/${student.id}`)}
                        className="cursor-pointer group/name"
                      >
                        <p className="font-bold text-gray-900 group-hover/name:text-purple-600 transition-colors flex items-center flex-wrap gap-1">
                          <span className="truncate max-w-[200px]">{student.name}</span>
                          {getPlanBadge(student.paymentPlan)}
                          <ChevronRight size={14} className="opacity-0 group-hover/name:opacity-100 transition-all text-purple-400 shrink-0" />
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          ID: {student.studentId}{student.rollNumber ? ` • Roll: ${student.rollNumber}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest">
                      {student.class}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <User size={12} className="text-gray-400" />
                        <span className="text-xs font-bold">{student.parentName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Phone size={12} />
                        <span className="text-[10px]">{student.parentContact}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-black text-gray-900">{calculateTotalPaid(student).toLocaleString()} <small className="text-gray-400 font-normal">{settings?.currency || 'SAR'}</small></p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-black text-gray-900">{calculateOutstanding(student).toLocaleString()} <small className="text-gray-400 font-normal">{settings?.currency || 'SAR'}</small></p>
                  </td>
                  <td className="px-8 py-5 text-right flex items-center justify-end gap-3">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm inline-block",
                      student.status === 'active' ? "bg-green-50 text-green-600 border border-green-100" : "bg-gray-100 text-gray-500 border border-gray-200"
                    )}>
                      {student.status}
                    </span>
                    <button
                      onClick={() => handleOpenEditModal(student)}
                      className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-blue-100"
                      title="Edit Student"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeletingStudent(student)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-rose-100"
                      title="Delete Student Records & Clear Payments"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-2 sm:p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh]">
            <div className="p-4 sm:p-8 border-b border-gray-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                    {editingStudent ? 'Edit Student' : 'New Student Registration'}
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">Enter all official institutional details</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div >
            <form id="student-registration-form" onSubmit={handleSubmitStudent} className="p-4 sm:p-8 space-y-6 overflow-y-auto flex-1">
              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold flex items-center gap-3 animate-in shake-in">
                  <AlertTriangle size={18} />
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Student Name</label>
                  <input 
                    required
                    type="text"
                    placeholder="Enter full legal name"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Student ID #</label>
                    {!editingStudent && (
                      <button
                        type="button"
                        onClick={() => {
                          const year = new Date().getFullYear();
                          const randomNum = Math.floor(1000 + Math.random() * 9000);
                          setNewStudent({ ...newStudent, studentId: `RIDM-${year}-${randomNum}` });
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-purple-600 hover:text-purple-850 active:scale-95 transition-all"
                      >
                        Auto generate
                      </button>
                    )}
                  </div>
                  <input 
                    required
                    type="text"
                    disabled={!!editingStudent}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium disabled:opacity-50"
                    value={newStudent.studentId}
                    onChange={(e) => setNewStudent({...newStudent, studentId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Roll Number</label>
                    <button
                      type="button"
                      onClick={() => {
                        const randomRoll = Math.floor(100 + Math.random() * 900).toString();
                        setNewStudent({ ...newStudent, rollNumber: randomRoll });
                      }}
                      className="text-[10px] font-black uppercase tracking-wider text-purple-600 hover:text-purple-850 active:scale-95 transition-all"
                    >
                      Auto generate
                    </button>
                  </div>
                  <input 
                    required
                    type="text"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    value={newStudent.rollNumber || ''}
                    onChange={(e) => setNewStudent({...newStudent, rollNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Class / Grade</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    value={newStudent.class}
                    onChange={(e) => setNewStudent({...newStudent, class: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Parent Contact</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    value={newStudent.parentContact}
                    onChange={(e) => setNewStudent({...newStudent, parentContact: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Parent Name</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    value={newStudent.parentName}
                    onChange={(e) => setNewStudent({...newStudent, parentName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Monthly Fee ({settings?.currency || 'SAR'})</label>
                  <input 
                    required
                    type="number"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    value={newStudent.monthlyFee || ''}
                    onChange={(e) => {
                      const mFee = Number(e.target.value);
                      const plan = newStudent.paymentPlan || 'Monthly';
                      const multiplier = ({ 'Monthly': 1, '3 Months': 3, 'Semester': 5, 'Annual': 10, 'Full Payment': 10 } as Record<string, number>)[plan] || 1;
                      const total = mFee * multiplier;
                      setNewStudent({
                        ...newStudent, 
                        monthlyFee: mFee,
                        totalFee: total,
                        remainingBalance: Math.max(0, total - (newStudent.totalPaid || 0))
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Total Fixed Fees ({settings?.currency || 'SAR'})</label>
                  <input 
                    required
                    type="number"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium animate-none"
                    value={newStudent.totalFee || ''}
                    onChange={(e) => {
                      const total = Number(e.target.value);
                      setNewStudent({
                        ...newStudent, 
                        totalFee: total,
                        remainingBalance: Math.max(0, total - (newStudent.totalPaid || 0))
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Payment Plan</label>
                  <select 
                    required
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.7em_auto] bg-[right_1.25rem_center] bg-no-repeat"
                    value={newStudent.paymentPlan || 'Monthly'}
                    onChange={(e) => {
                      const plan = e.target.value as any;
                      const monthlyFee = newStudent.monthlyFee || 0;
                      const multiplier = ({ 'Monthly': 1, '3 Months': 3, 'Semester': 5, 'Annual': 10, 'Full Payment': 10 } as Record<string, number>)[plan] || 1;
                      const totalFee = monthlyFee * multiplier;
                      const currentMonths = newStudent.paidMonths || [];
                      
                      const computedPaid = Math.round(monthlyFee * currentMonths.length);
                      
                      setNewStudent({
                        ...newStudent,
                        paymentPlan: plan,
                        totalFee: totalFee,
                        totalPaid: computedPaid,
                        remainingBalance: Math.max(0, totalFee - computedPaid)
                      });
                    }}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="3 Months">3 Months</option>
                    <option value="Semester">Semester</option>
                    <option value="Annual">Annual</option>
                    <option value="Full Payment">Full Payment</option>
                  </select>
                </div>
              </div>


              <div className="flex justify-end pt-4">
                <button 
                  disabled={isSubmitting}
                  type="submit"
                  className="px-8 py-4 gradient-bg text-white font-black rounded-2xl shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Complete Registration
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingStudent && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-rose-100">
            <div className="p-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Destructive Operation</h3>
              <p className="text-sm text-gray-500 font-medium mt-2">
                Are you sure you want to delete <span className="font-extrabold text-gray-900">{deletingStudent.name}</span>?
              </p>
              <p className="text-xs text-rose-500 font-bold bg-rose-50/50 border border-rose-100/30 px-4 py-2.5 rounded-xl mt-3 leading-relaxed">
                This action is irreversible. All student details will be deleted, and all associated payments will be permanently cleared to bring dues back to zero.
              </p>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
              <button 
                disabled={isDeletingInProgress}
                onClick={() => setDeletingStudent(null)}
                className="px-5 py-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                disabled={isDeletingInProgress}
                onClick={handleDeleteStudent}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-rose-100"
              >
                {isDeletingInProgress ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Wipe & Clear Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
