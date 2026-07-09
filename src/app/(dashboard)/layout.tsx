'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Users, 
  UserCog,
  Receipt, 
  Clock, 
  Settings, 
  LogOut,
  ChevronRight,
  School,
  FileText,
  BarChart3,
  Search,
  Calculator,
  RotateCcw,
  ExternalLink,
  Menu,
  X,
  Sun,
  Moon,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSettings } from '@/lib/localDb';
import { useTheme } from '@/contexts/ThemeContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading, updateProfilePhoto } = useAuth();
  const { theme, setTheme } = useTheme();

  const [schoolSettings, setSchoolSettings] = React.useState({
    schoolName: 'RIDM Student Financial System',
    schoolLogo: '/logo.png',
  });

  const [currentDate, setCurrentDate] = React.useState<string>('');
  const [currentTime, setCurrentTime] = React.useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    const updateDateTime = () => {
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const dateString = date.toLocaleDateString('en-US', options);
      const timeString = date.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit'
      });
      setCurrentDate(dateString);
      setCurrentTime(timeString);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error: any) {
      console.error('Error logging out:', {
        message: error.message,
        code: error.code
      });
      router.push('/login');
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 128;
        const MAX_HEIGHT = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          updateProfilePhoto(compressed);
        } else {
          updateProfilePhoto(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Students', href: '/students', icon: Users },
    { name: 'Fees & Status', href: '/fees', icon: FileText },
    { name: 'New Payment', href: '/payments', icon: Receipt },
    { name: 'Cash Calculator', href: '/calculator', icon: Calculator },
    { name: 'Installments', href: '/installments', icon: Clock },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Refunds', href: '/refunds', icon: RotateCcw },
    { name: 'Users', href: '/users', icon: UserCog },
    { name: 'System Logs', href: '/audit-logs', icon: Search },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const filteredNavItems = React.useMemo(() => {
    if (!profile) return [];
    const role = profile.role;
    
    // Super Admin has everything
    if (role === 'super_admin') return navItems;
    
    // Admin has everything except User Management
    if (role === 'admin') {
      return navItems.filter(item => item.name !== 'Users' && item.name !== 'System Logs' && item.name !== 'Settings');
    }
    
    if (role === 'accountant') {
      return navItems.filter(item => ['Dashboard', 'Students', 'Fees & Status', 'New Payment', 'Cash Calculator', 'Installments', 'Reports', 'Refunds'].includes(item.name));
    }
    if (role === 'auditor') {
      return navItems.filter(item => ['Dashboard', 'Students', 'Fees & Status', 'Reports', 'Refunds'].includes(item.name));
    }
    return [];
  }, [profile]);

  React.useEffect(() => {
    if (!loading && !profile) {
      router.push('/login');
    }
  }, [profile, loading, router]);

  React.useEffect(() => {
    if (!profile) return;
    
    const fetchSettings = async () => {
      try {
        const data = await getSettings();
        setSchoolSettings({
          schoolName: data.schoolName || 'RIDM Student Financial System',
          schoolLogo: data.schoolLogo || '/logo.png',
        });
      } catch (error: any) {
        console.error('Error fetching settings in layout:', {
          message: error.message,
          code: error.code
        });
      }
    };

    fetchSettings();

    const handleSettingsUpdate = () => {
      fetchSettings();
    };

    window.addEventListener('settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const adminPortalUrl = process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL;

  return (
    <div className={cn(
      "min-h-screen flex overflow-x-hidden transition-all duration-300",
      theme === 'color' 
        ? "bg-gradient-to-r from-[#1e1b4b] via-[#581c87] to-[#6b21a8] text-white" 
        : theme === 'dark' 
        ? "bg-[#0c0d1b] text-gray-100" 
        : "bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-blue-500/5"
    )}>
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          id="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-45 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside 
        id="dashboard-sidebar"
        className={cn(
          "bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 shadow-lg lg:shadow-sm z-50 transition-all duration-300 overflow-hidden print:hidden",
          isSidebarOpen 
            ? "translate-x-0 w-72 lg:w-72" 
            : "-translate-x-full lg:translate-x-0 lg:w-20"
        )}
      >
        <div className={cn(
          "transition-all duration-300",
          isSidebarOpen ? "p-8" : "p-5"
        )}>
          <div className={cn(
            "flex items-center gap-3",
            isSidebarOpen ? "w-56" : "w-10 justify-center"
          )}>
            {schoolSettings.schoolLogo ? (
              <div className="w-10 h-10 rounded-xl border border-gray-100 bg-white flex items-center justify-center p-1.5 overflow-hidden shrink-0 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={schoolSettings.schoolLogo} 
                  alt="Branded Logo" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-purple-200 shrink-0">
                <School size={20} />
              </div>
            )}
            <div className={cn(
              "min-w-0 transition-all duration-300",
              isSidebarOpen ? "opacity-100 w-auto" : "opacity-0 w-0 pointer-events-none hidden"
            )}>
              <h1 className="font-black text-sm tracking-tight text-gray-900 leading-tight truncate">{schoolSettings.schoolName}</h1>
              <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest leading-none mt-0.5">Financial System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-4">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center justify-between py-3.5 rounded-2xl transition-all",
                  isSidebarOpen ? "px-4" : "px-3 justify-center",
                  isActive 
                    ? "bg-purple-600 text-white shadow-xl shadow-purple-100 scale-[1.02]" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-purple-600"
                )}
              >
                <div className={cn(
                  "flex items-center gap-4",
                  isSidebarOpen ? "w-52" : "w-auto justify-center"
                )}>
                  <div className="flex-shrink-0 flex items-center justify-center w-6">
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  {isSidebarOpen && (
                    <span className={cn(
                      "text-sm font-bold tracking-tight whitespace-nowrap transition-opacity duration-300",
                      isActive ? "text-white" : "text-gray-600"
                    )}>
                      {item.name}
                    </span>
                  )}
                </div>
                {isActive && isSidebarOpen && (
                  <ChevronRight 
                    size={14} 
                    className="text-white/50 transition-opacity duration-300 shrink-0" 
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-50">
          {/* Admin Portal Link for Super Admins */}
          {profile.role === 'super_admin' && adminPortalUrl && (
            <a
              href={adminPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "w-full flex items-center justify-between py-3.5 mb-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-100",
                isSidebarOpen ? "px-4" : "px-3 justify-center"
              )}
            >
              <div className={cn(
                "flex items-center gap-4",
                isSidebarOpen ? "w-52" : "w-auto justify-center"
              )}>
                <div className="flex-shrink-0 flex items-center justify-center w-6">
                  <ExternalLink size={20} className="text-blue-400" />
                </div>
                {isSidebarOpen && (
                  <span className="text-sm font-bold tracking-tight whitespace-nowrap transition-opacity duration-300">
                    Admin Portal
                  </span>
                )}
              </div>
              {isSidebarOpen && (
                <ChevronRight 
                  size={14} 
                  className="text-white/30 transition-opacity duration-300 shrink-0" 
                />
              )}
            </a>
          )}

          <div className={cn(
            "bg-gray-50 rounded-2xl flex items-center gap-3 mb-4 transition-all duration-300 overflow-hidden relative",
            isSidebarOpen ? "p-4 w-auto" : "p-2 w-[48px] mx-auto justify-center"
          )}>
            <input 
              type="file"
              id="sidebar-avatar-upload"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <label 
              htmlFor="sidebar-avatar-upload"
              className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0 relative cursor-pointer hover:opacity-90 group/avatar overflow-hidden"
              title="Click to upload custom image"
            >
              {profile.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={profile.photoURL} 
                  alt={profile.displayName || 'Avatar'} 
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                profile.displayName?.charAt(0) || 'U'
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-[8px] text-white font-black uppercase transition-opacity">
                Edit
              </div>

              <span className={cn(
                "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10",
                "bg-emerald-500"
              )} title="Database Connected" />
            </label>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0 transition-opacity duration-300">
                <p className="text-sm font-bold text-gray-900 truncate">{profile.displayName || profile.email}</p>
                <p className="text-[10px] text-purple-500 font-bold uppercase tracking-widest truncate">{profile.role}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-sm overflow-hidden",
              isSidebarOpen ? "px-3" : "justify-center"
            )}
          >
            <div className="flex-shrink-0 flex items-center justify-center w-6">
              <LogOut size={18} />
            </div>
            {isSidebarOpen && (
              <span className="whitespace-nowrap transition-opacity duration-300">
                Sign Out
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-w-0 overflow-x-hidden max-w-full print:ml-0 print:p-0",
        isSidebarOpen ? "ml-0 lg:ml-72" : "ml-0 lg:ml-20"
      )}>
        <header className={cn(
          "h-20 flex items-center justify-between px-4 sm:px-10 sticky top-0 z-40 transition-all duration-300 print:hidden",
          theme === 'color' 
            ? "bg-white/5 backdrop-blur-md border-b border-white/10 text-white"
            : theme === 'dark'
            ? "bg-[#111226]/85 backdrop-blur-md border-b border-white/5 text-gray-100"
            : "bg-white/80 backdrop-blur-md border-b border-gray-100"
        )}>
          <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
             {/* Sidebar Hamburger / Close Toggle Button */}
             <button
               id="sidebar-toggle-btn"
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className={cn(
                 "p-2 -ml-2 rounded-xl transition-all flex items-center justify-center cursor-pointer",
                 theme === 'color'
                   ? "text-white/80 hover:text-white hover:bg-white/10"
                   : theme === 'dark'
                   ? "text-gray-300 hover:text-white hover:bg-white/5"
                   : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"
               )}
               aria-label="Toggle Sidebar"
             >
               {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
             </button>
             <span className={cn(
               "capitalize hidden sm:inline",
               theme === 'color' ? "text-white/60" : "text-gray-400"
             )}>{pathname.split('/')[1] || 'Dashboard'}</span>
             <ChevronRight size={14} className="hidden sm:inline" />
             <span className={cn(
               "font-bold hidden sm:inline",
               theme === 'color' ? "text-white" : "text-gray-900"
             )}>{pathname === '/' ? 'Overview' : 'View All'}</span>
             <span className={cn(
               "font-bold sm:hidden capitalize",
               theme === 'color' ? "text-white" : "text-gray-900"
             )}>{pathname.split('/')[1] || 'Overview'}</span>
          </div>
          <div className="flex items-center gap-6">
            {/* Beautiful Segmented Pill Theme Switcher */}
            <div className={cn(
              "flex items-center p-1 rounded-xl border transition-all duration-300 shadow-xs",
              theme === 'color'
                ? "bg-white/10 border-white/15"
                : theme === 'dark'
                ? "bg-[#1a1b35] border-white/5"
                : "bg-gray-100 border-gray-200/50"
            )}>
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  "px-2 sm:px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                  theme === 'light' 
                    ? "bg-white text-gray-900 shadow-xs font-black" 
                    : theme === 'color'
                    ? "text-white/60 hover:text-white hover:bg-white/5"
                    : "text-gray-400 hover:text-gray-200"
                )}
                title="Light Mode"
              >
                <Sun size={13} className="text-amber-500 shrink-0" />
                <span className="hidden md:inline">Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  "px-2 sm:px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                  theme === 'dark' 
                    ? "bg-purple-600 text-white shadow-xs font-black" 
                    : theme === 'color'
                    ? "text-white/60 hover:text-white hover:bg-white/5"
                    : "text-gray-400 hover:text-gray-900"
                )}
                title="Dark Mode"
              >
                <Moon size={13} className="text-blue-400 shrink-0" />
                <span className="hidden md:inline">Dark</span>
              </button>
              <button
                onClick={() => setTheme('color')}
                className={cn(
                  "px-2 sm:px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                  theme === 'color' 
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xs font-black" 
                    : "text-gray-400 hover:text-gray-900"
                )}
                title="Color Mode"
              >
                <Palette size={13} className="text-pink-400 shrink-0" />
                <span className="hidden md:inline">Color</span>
              </button>
            </div>

            <div className="text-right">
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                theme === 'color' ? "text-white/55" : "text-gray-400"
              )}>System Date</p>
              <p className={cn(
                "text-sm font-black flex flex-col sm:flex-row sm:items-center justify-end gap-0.5 sm:gap-1.5",
                theme === 'color' ? "text-white" : "text-gray-900"
              )}>
                <span className={cn(
                  "text-[10px] sm:text-sm font-medium sm:font-black",
                  theme === 'color' ? "text-white/90" : "text-gray-500 sm:text-gray-900"
                )}>
                  {currentDate || 'Loading Date...'}
                </span>
                <span className={cn("hidden sm:inline", theme === 'color' ? "text-white/30" : "text-gray-300")}>•</span>
                <span className={cn(
                  "text-xs sm:text-sm font-black shrink-0",
                  theme === 'color' ? "text-white" : "text-gray-900"
                )}>
                  {currentTime || 'Loading Time...'}
                </span>
              </p>
            </div>
          </div>
        </header>
        <div className="p-3 sm:p-6 md:p-10 max-w-7xl mx-auto w-full min-w-0 print:p-0 print:max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
}
