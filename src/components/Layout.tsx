'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, X, Bell, User, LogOut, Sun, Moon, Calculator } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { usePathname } from 'next/navigation';
import { CashCalculatorPanel } from './CashCalculatorPanel';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const { profile, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const pathname = usePathname();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleCalculator = () => setIsCalculatorOpen(!isCalculatorOpen);
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => logout();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className="blur-bg" />
      
      <Sidebar isOpen={isSidebarOpen} toggle={toggleSidebar} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 z-40">
          <button 
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-gray-800">Admin Dashboard</h2>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleCalculator}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors relative"
              title="Cash Calculator"
            >
              <Calculator size={20} />
            </button>

            <button 
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">{profile?.displayName}</p>
                <p className="text-xs font-medium text-purple-600 capitalize">{profile?.role.replace('_', ' ')}</p>
              </div>
              <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold shadow-md">
                {profile?.displayName?.charAt(0).toUpperCase() || <User size={20} />}
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <CashCalculatorPanel isOpen={isCalculatorOpen} onClose={toggleCalculator} />
    </div>
  );
};
