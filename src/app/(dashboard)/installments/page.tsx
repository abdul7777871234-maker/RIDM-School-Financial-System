'use client';

import React, { useState, useEffect } from 'react';
import { getInstallmentPlans, getSettings } from '@/lib/localDb';
import { Student, InstallmentPlan } from '@/types';
import { Clock, Search, Calendar, CheckCircle2, AlertCircle, ChevronRight, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Installments() {
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await getInstallmentPlans();
        const storedSettings = await getSettings();
        setSettings(storedSettings);
        setPlans(data);
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Flexible Payment Plans</h1>
          <p className="text-gray-500 font-medium">Tracking and managing monthly student installments</p>
        </div>
        <div className="flex items-center gap-3 bg-purple-50 px-4 py-2 rounded-2xl border border-purple-100 italic">
          <PieChart className="text-purple-600" size={18} />
          <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Global Collection rate: 84%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-gray-400">Loading installment schema...</div>
        ) : plans.length === 0 ? (
          <div className="col-span-full p-12 rounded-3xl border-2 border-dashed border-gray-100 bg-gray-50 text-center space-y-4">
             <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto text-gray-300 shadow-sm border border-gray-50">
               <Clock size={24} />
             </div>
             <div>
               <p className="text-gray-900 font-bold">No active installment plans found.</p>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-xs mx-auto">Installment plans can be configured during the payment collection process for eligible students.</p>
             </div>
          </div>
        ) : plans.map(plan => (
          <div key={plan.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-8 space-y-6 hover:shadow-md transition-all group">
             <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                      {plan.months}m
                   </div>
                   <div>
                      <h4 className="font-bold text-gray-900 truncate max-w-[120px]">Student ID: {plan.studentId}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">{plan.status}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Remaining</p>
                   <p className="text-lg font-black text-gray-900">{plan.remainingAmount.toLocaleString()} {settings?.currency || 'SAR'}</p>
                </div>
             </div>

             <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Sequence</p>
                <div className="flex gap-1.5">
                   {plan.installments.map((inst, idx) => (
                      <div 
                         key={idx} 
                         className={cn(
                            "flex-1 h-3 rounded-full transition-all border border-transparent shadow-inner",
                            inst.status === 'paid' ? "bg-green-500 shadow-green-100" : 
                            inst.status === 'late' ? "bg-red-500 animate-pulse" : "bg-gray-100"
                         )}
                         title={`${inst.amount} ${settings?.currency || 'SAR'} - ${inst.status}`}
                      />
                   ))}
                </div>
             </div>

             <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress</p>
                   <p className="text-xs font-black text-gray-900">{Math.round((plan.paidAmount / plan.totalAmount) * 100)}% Collected</p>
                </div>
                <button className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all transform group-hover:rotate-12">
                   <ChevronRight size={18} />
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
