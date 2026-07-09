'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addStudent, getSettings } from '@/lib/localDb';
import { ArrowLeft, User, Hash, School, Phone, Calendar, Save, CreditCard } from 'lucide-react';
import { SchoolSettings } from '@/types';

export default function AddStudent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    rollNumber: '',
    class: '',
    parentName: '',
    parentContact: '',
    admissionDate: new Date().toISOString().split('T')[0],
    totalFee: 0,
    monthlyFee: 0,
    paymentPlan: 'Monthly' as 'Monthly' | 'Full Payment' | '3 Months',
    paidMonths: [] as string[],
    paymentStatus: 'paid_at_admission' as 'paid_at_admission' | 'will_pay_later',
  });

  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  React.useEffect(() => {
    const fetchSettings = async () => {
      const s = await getSettings();
      setSettings(s);
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Ensure studentId is not empty or regenerate if missing
      const finalFormData = { ...formData };
      if (!finalFormData.studentId) {
        const year = new Date().getFullYear();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        finalFormData.studentId = `RIDM-${year}-${randomNum}`;
      }

      const monthlyFee = finalFormData.monthlyFee || 0;
      const totalFee = finalFormData.totalFee || 0;
      // Since paid months is removed, totalPaid should be 0 unless initialized differently, 
      // but let's just use what's in the state (which is 0)
      const computedPaid = 0;

      const studentData = {
        ...finalFormData,
        admissionDate: new Date(finalFormData.admissionDate).getTime(),
        status: 'active' as const,
        monthlyFee: monthlyFee,
        totalFee: totalFee,
        totalPaid: computedPaid,
        remainingBalance: Math.max(0, totalFee - computedPaid),
        paymentPlan: finalFormData.paymentPlan,
      };
      
      await addStudent(studentData);
      
      router.push('/students');
    } catch (err: any) {
      console.error("Error adding student:", err);
      setError(err.message || "An unexpected error occurred while saving the record.");
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, icon: Icon, type = 'text', name, value, onChange, placeholder, required = true }: any) => (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
        <input 
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium text-gray-900"
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => router.back()} 
        className="inline-flex items-center gap-2 text-gray-500 font-bold hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={20} />
        Back to List
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white shadow-lg">
            <User size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Student</h1>
            <p className="text-gray-500 font-medium text-sm italic">Register a new student and set initial fee balance</p>
          </div>
        </div>

        <form id="standalone-student-registration-form" onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center text-xs">!</span>
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <InputField 
                label="Student Full Name" 
                icon={User} 
                name="name" 
                value={formData.name} 
                onChange={(e: any) => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. Abdullah Ahmed" 
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700">Student ID / Admission No.</label>
                <button
                  type="button"
                  onClick={() => {
                    const year = new Date().getFullYear();
                    const randomNum = Math.floor(1000 + Math.random() * 9000);
                    setFormData({ ...formData, studentId: `RIDM-${year}-${randomNum}` });
                  }}
                  className="text-xs font-black uppercase tracking-wider text-purple-600 hover:text-purple-800 transition-colors"
                >
                  Auto generate
                </button>
              </div>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
                <input 
                  type="text"
                  name="studentId" 
                  value={formData.studentId} 
                  onChange={(e: any) => setFormData({...formData, studentId: e.target.value})} 
                  placeholder="e.g. RIDM-2026-1234" 
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium text-gray-900"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700">Roll Number</label>
                <button
                  type="button"
                  onClick={() => {
                    const randomRoll = Math.floor(100 + Math.random() * 900).toString();
                    setFormData({ ...formData, rollNumber: randomRoll });
                  }}
                  className="text-xs font-black uppercase tracking-wider text-purple-600 hover:text-purple-800 transition-colors"
                >
                  Auto generate
                </button>
              </div>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
                <input 
                  type="text"
                  name="rollNumber" 
                  value={formData.rollNumber} 
                  onChange={(e: any) => setFormData({...formData, rollNumber: e.target.value})} 
                  placeholder="e.g. 101" 
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Class / Grade</label>
              <div className="relative">
                <School className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  name="class"
                  value={formData.class}
                  onChange={(e: any) => setFormData({...formData, class: e.target.value})}
                  required
                  className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-gray-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.7em_auto] bg-[right_1.25rem_center] bg-no-repeat"
                >
                  <option value="" disabled>Select Class / Grade</option>
                  <optgroup label="Early Years & Preschool">
                    <option value="Playgroup / Foundation Year">Playgroup / Foundation Year</option>
                    <option value="KG-I">KG-I</option>
                    <option value="KG-II">KG-II</option>
                  </optgroup>
                  <optgroup label="School Grades">
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </optgroup>
                  <optgroup label="Quran Classes">
                    <option value="Quran: Hifz">Hifz</option>
                    <option value="Quran: Nazra">Nazra</option>
                    <option value="Quran: Lesson Preparation">Lesson Preparation</option>
                    <option value="Quran: Tilawat (Recitation Correction)">Tilawat (Recitation Correction)</option>
                    <option value="Quran: Quran Foundation">Quran Foundation</option>
                  </optgroup>
                </select>
              </div>
            </div>
            <InputField 
              label="Admission Date" 
              icon={Calendar} 
              type="date"
              name="admissionDate" 
              value={formData.admissionDate} 
              onChange={(e: any) => setFormData({...formData, admissionDate: e.target.value})} 
            />
          </div>

          <div className="space-y-6 pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">02</span>
              Parental Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField 
                label="Parent/Guardian Name" 
                icon={User} 
                name="parentName" 
                value={formData.parentName} 
                onChange={(e: any) => setFormData({...formData, parentName: e.target.value})} 
                placeholder="e.g. Ahmed Al-Farsi" 
              />
              <InputField 
                label="Emergency Contact" 
                icon={Phone} 
                name="parentContact" 
                value={formData.parentContact} 
                onChange={(e: any) => setFormData({...formData, parentContact: e.target.value})} 
                placeholder="e.g. +966 5X XXX XXXX" 
              />
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center text-xs">03</span>
              Financial Records & Payment Plan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField 
                label={`Monthly Fee (${settings?.currency || 'SAR'})`} 
                icon={CreditCard} 
                type="number"
                name="monthlyFee" 
                value={formData.monthlyFee} 
                onChange={(e: any) => {
                  const monthlyFee = parseFloat(e.target.value) || 0;
                  const plan = formData.paymentPlan || 'Monthly';
                  const multiplier = ({ 'Monthly': 1, '3 Months': 3, 'Semester': 5, 'Annual': 10, 'Full Payment': 10 } as Record<string, number>)[plan] || 1;
                  setFormData({
                    ...formData,
                    monthlyFee,
                    totalFee: monthlyFee * multiplier
                  });
                }}
                placeholder={`amount in ${settings?.currency || 'SAR'}`} 
              />
              <InputField 
                label={`Total Fixed Fees (${settings?.currency || 'SAR'})`} 
                icon={CreditCard} 
                type="number"
                name="totalFee" 
                value={formData.totalFee} 
                onChange={(e: any) => setFormData({...formData, totalFee: parseFloat(e.target.value) || 0})} 
                placeholder={`amount in ${settings?.currency || 'SAR'}`} 
              />
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Payment Plan</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                      name="paymentPlan"
                      value={formData.paymentPlan}
                      onChange={(e: any) => {
                        const plan = e.target.value;
                        const monthlyFee = formData.monthlyFee || 0;
                        const multiplier = ({ 'Monthly': 1, '3 Months': 3, 'Semester': 5, 'Annual': 10, 'Full Payment': 10 } as Record<string, number>)[plan] || 1;
                        setFormData({
                          ...formData, 
                          paymentPlan: plan,
                          totalFee: monthlyFee * multiplier
                        });
                      }}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-gray-800 appearance-none"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="3 Months">3 Months</option>
                      <option value="Semester">Semester</option>
                      <option value="Annual">Annual</option>
                      <option value="Full Payment">Full Payment</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>
            </div>
            </div>



          <div className="pt-8 border-t border-gray-100 flex items-center justify-end gap-4">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="px-8 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-10 py-3.5 gradient-bg text-white font-bold rounded-2xl shadow-lg shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 transition-all flex items-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
              Save Records
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
