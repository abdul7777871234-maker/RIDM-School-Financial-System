'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  CreditCard, 
  Clock, 
  FileBarChart, 
  Download, 
  UserCog, 
  History, 
  Settings,
  GraduationCap,
  Calculator
} from 'lucide-react';
import { cn } from '../lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: GraduationCap, label: 'Students', path: '/students' },
  { icon: Receipt, label: 'Fee Management', path: '/fees' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: Calculator, label: 'Cash Calculator', path: '/calculator' },
  { icon: Clock, label: 'Installments', path: '/installments' },
  { icon: FileBarChart, label: 'Reports', path: '/reports' },
  { icon: Download, label: 'Exports', path: '/exports' },
  { icon: UserCog, label: 'Users', path: '/users' },
  { icon: History, label: 'Audit Logs', path: '/audit-logs' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Sidebar: React.FC<{ isOpen: boolean; toggle: () => void }> = ({ isOpen, toggle }) => {
  const pathname = usePathname();

  return (
    <aside 
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 border-r border-gray-100",
        !isOpen && "-translate-x-full"
      )}
    >
      <div className="flex flex-col h-full">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-800">SchoolFee</h1>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Management</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-purple-50 text-purple-600 shadow-sm" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon size={20} className={cn(
                  "transition-colors",
                  "group-hover:text-purple-600"
                )} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="p-4 rounded-2xl bg-linear-to-br from-purple-50 to-pink-50 border border-purple-100">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-tighter mb-1">System Version</p>
            <p className="text-sm font-bold text-gray-800">v1.0.4-secure</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
