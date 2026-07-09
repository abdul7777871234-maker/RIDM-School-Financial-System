'use client';

import React, { useEffect, useState } from 'react';
import { getStudents, getPayments, getSettings } from '@/lib/localDb';
import { Student, Payment } from '@/types';
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  Clock, 
  ChevronRight, 
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { calculateOutstanding } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalIncome: 0,
    outstanding: 0,
    unpaidCount: 0,
    partialCount: 0,
    recentPayments: [] as Payment[],
  });
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const students = await getStudents();
        const paymentsList = await getPayments();
        const storedSettings = await getSettings();
        setSettings(storedSettings);
        
        const totalIncome = students.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
        
        let outstanding = 0;
        let unpaidCount = 0;
        let partialCount = 0;

        students.forEach(s => {
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
          totalStudents: students.length,
          totalIncome,
          outstanding,
          unpaidCount,
          partialCount,
          recentPayments: paymentsList.slice(0, 5), // last 5 payments
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

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

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Overview Dashboard</h2>
          <p className="text-gray-500 font-medium font-sans">Real-time snapshots of your school&apos;s financial health</p>
        </div>
        <Link 
          href="/students"
          className="inline-flex items-center gap-2 px-6 py-3 gradient-bg text-white font-bold rounded-2xl shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} />
          Add New Student
        </Link>
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
          
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
            <h4 className="font-bold text-gray-900">Quick Actions</h4>
            <div className="space-y-3">
              {[
                { name: 'Bulk Student Upload', icon: Users, color: 'bg-blue-50 text-blue-600' },
                { name: 'Print Fee Slips', icon: CreditCard, color: 'bg-orange-50 text-orange-600' },
              ].map(action => (
                <button key={action.name} className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-50 hover:border-purple-100 hover:bg-purple-50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold", action.color)}>
                      <action.icon size={18} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{action.name}</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-600 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
