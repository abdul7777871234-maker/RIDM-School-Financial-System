'use client';

import React from 'react';
import { 
  Download, 
  Printer, 
  Archive, 
  Share2,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function Exports() {
  const exportCards = [
    {
      title: "Full Financial Audit",
      description: "Complete list of all payments, student records, and installment logs.",
      icon: Archive,
      color: "purple",
      formats: ["PDF", "EXCEL", "CSV"],
      path: "/reports"
    },
    {
      title: "Monthly Student Dues",
      description: "List of students with outstanding balances for the current month.",
      icon: Layers,
      color: "red",
      formats: ["PDF", "EXCEL"],
      path: "/reports"
    },
    {
      title: "Daily Collection Summary",
      description: "End-of-day summary for cash and credit collections.",
      icon: Calendar,
      color: "green",
      formats: ["PDF"],
      path: "/reports"
    },
    {
      title: "System Audit Logs",
      description: "Export administrative activity records for security review.",
      icon: Share2,
      color: "indigo",
      formats: ["CSV"],
      path: "/audit-logs"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
          <Download size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Export & Print Center</h1>
          <p className="text-sm text-gray-500 font-medium font-sans">Generate professional digital records for administrative use</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportCards.map((card, index) => (
          <Link 
            key={index}
            href={card.path}
            className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-8 hover:shadow-md hover:border-purple-100 transition-all group flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110",
                  card.color === 'purple' ? 'bg-purple-50 text-purple-600' : 
                  card.color === 'red' ? 'bg-red-50 text-red-600' : 
                  card.color === 'green' ? 'bg-green-50 text-green-600' : 
                  'bg-indigo-50 text-indigo-600'
                )}>
                  <card.icon size={24} />
                </div>
                <div className="flex gap-2">
                  {card.formats.map(f => (
                    <span key={f} className="text-[10px] font-black text-gray-400 border border-gray-100 px-2 py-0.5 rounded-md">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 font-medium font-sans leading-relaxed">{card.description}</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
              <span className={cn(
                "text-xs font-black uppercase tracking-[0.15em]",
                card.color === 'purple' ? 'text-purple-600' : 
                card.color === 'red' ? 'text-red-600' : 
                card.color === 'green' ? 'text-green-600' : 
                'text-indigo-600'
              )}>
                Configure & Export
              </span>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white transition-all transform group-hover:translate-x-1",
                card.color === 'purple' ? 'bg-purple-600' : 
                card.color === 'red' ? 'bg-red-600' : 
                card.color === 'green' ? 'bg-green-600' : 
                'bg-indigo-600'
              )}>
                <ChevronRight size={16} strokeWidth={3} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="p-8 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 text-center space-y-4">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-gray-300 shadow-sm">
          <Printer size={20} />
        </div>
        <div>
          <h4 className="font-bold text-gray-900">Direct Print Capability</h4>
          <p className="text-xs text-gray-400 font-medium max-w-xs mx-auto">You can also print individual student receipts directly from their profile pages using the &quot;New Receipt&quot; tool.</p>
        </div>
      </div>
    </div>
  );
}
