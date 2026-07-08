'use client';

import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '@/lib/localDb';
import { Search, User, Info } from 'lucide-react';
import { AuditLog } from '@/types';
import { format } from 'date-fns';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getAuditLogs();
        setLogs(data);
      } catch (error) {
        console.error("Error fetching audit logs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.userName.toLowerCase().includes(search.toLowerCase()) || 
    (l.action && l.action.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">System Audit logs</h1>
        <p className="text-gray-500 font-medium font-sans">Track every administrative action performed in the system</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by user or action..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm ml-auto">
            Last 100 Actions
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{`Timestamp / Status`}</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Operator</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Action Description</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 text-sm">Retrieving audit sequence...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-sans italic tracking-tight">
                    No historical logs matching your search
                  </td>
                </tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/20 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500 shadow-sm" />
                      <div>
                        <p className="text-sm font-bold text-gray-800">{format(log.date, 'MMM dd, yyyy')}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{format(log.date, 'HH:mm:ss')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-xs shadow-inner">
                        <User size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 tracking-tight">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-start gap-2 max-w-md">
                      <Info size={14} className="text-blue-500 mt-1 shrink-0" />
                      <p className="text-sm text-gray-600 leading-relaxed font-sans">{log.action}</p>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                      LOG_{(log.id || '').slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
