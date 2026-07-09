'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
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
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSettings } from '@/lib/localDb';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading, updateProfilePhoto } = useAuth();

  const [schoolSettings, setSchoolSettings] = React.useState({
    schoolName: 'RIDM Student Financial System',
    schoolLogo: '/logo.png',
  });

  const [currentDateTime, setCurrentDateTime] = React.useState<string>('');
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
        minute: '2-digit', 
        second: '2-digit' 
      });
      setCurrentDateTime(`${dateString} • ${timeString}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ridm_local_session');
    }
    router.push('/login');
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
    { name: 'System Logs', href: '/audit-logs', icon: Search },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

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
      } catch (err) {
        console.error('Error fetching settings in layout:', err);
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
    <div className="min-h-screen bg-gray-50 flex">
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
          "bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 shadow-lg lg:shadow-sm z-50 transition-all duration-300 overflow-hidden",
          isSidebarOpen 
            ? "translate-x-0 w-72 lg:w-72" 
            : "-translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-72 group"
        )}
      >
        <div className="p-5 group-hover:p-8 transition-all duration-300">
          <div className="flex items-center gap-3 w-56">
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
              "min-w-0 transition-opacity duration-300",
              isSidebarOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <h1 className="font-black text-sm tracking-tight text-gray-900 leading-tight truncate">{schoolSettings.schoolName}</h1>
              <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest leading-none mt-0.5">Financial System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center justify-between py-3.5 rounded-2xl transition-all",
                  isSidebarOpen ? "px-4" : "px-3 group-hover:px-4",
                  isActive 
                    ? "bg-purple-600 text-white shadow-xl shadow-purple-100 scale-[1.02]" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-purple-600"
                )}
              >
                <div className="flex items-center gap-4 w-52">
                  <div className="flex-shrink-0 flex items-center justify-center w-6">
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={cn(
                    "text-sm font-bold tracking-tight whitespace-nowrap transition-opacity duration-300",
                    isActive ? "text-white" : "text-gray-600",
                    isSidebarOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    {item.name}
                  </span>
                </div>
                {isActive && (
                  <ChevronRight 
                    size={14} 
                    className={cn(
                      "text-white/50 transition-opacity duration-300 shrink-0", 
                      isSidebarOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )} 
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
                isSidebarOpen ? "px-4" : "px-3 group-hover:px-4"
              )}
            >
              <div className="flex items-center gap-4 w-52">
                <div className="flex-shrink-0 flex items-center justify-center w-6">
                  <ExternalLink size={20} className="text-blue-400" />
                </div>
                <span className={cn(
                  "text-sm font-bold tracking-tight whitespace-nowrap transition-opacity duration-300",
                  isSidebarOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  Admin Portal
                </span>
              </div>
              <ChevronRight 
                size={14} 
                className={cn(
                  "text-white/30 transition-opacity duration-300 shrink-0", 
                  isSidebarOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )} 
              />
            </a>
          )}

          <div className={cn(
            "bg-gray-50 rounded-2xl flex items-center gap-3 mb-4 transition-all duration-300 overflow-hidden relative",
            isSidebarOpen ? "p-4 w-auto" : "p-2 group-hover:p-4 w-[48px] group-hover:w-auto mx-auto group-hover:mx-0"
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
            <div className={cn(
              "flex-1 min-w-0 transition-opacity duration-300",
              isSidebarOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <p className="text-sm font-bold text-gray-900 truncate">{profile.displayName || profile.email}</p>
              <p className="text-[10px] text-purple-500 font-bold uppercase tracking-widest truncate">{profile.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-sm overflow-hidden"
          >
            <div className="flex-shrink-0 flex items-center justify-center w-6">
              <LogOut size={18} />
            </div>
            <span className={cn(
              "whitespace-nowrap transition-opacity duration-300",
              isSidebarOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        isSidebarOpen ? "ml-0 lg:ml-72" : "ml-0 lg:ml-20"
      )}>
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 sm:px-10 sticky top-0 z-40">
          <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
             {/* Sidebar Hamburger / Close Toggle Button */}
             <button
               id="sidebar-toggle-btn"
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="p-2 -ml-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all flex items-center justify-center cursor-pointer"
               aria-label="Toggle Sidebar"
             >
               {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
             </button>
             <span className="capitalize hidden sm:inline">{pathname.split('/')[1] || 'Dashboard'}</span>
             <ChevronRight size={14} className="hidden sm:inline" />
             <span className="text-gray-900 font-bold hidden sm:inline">{pathname === '/' ? 'Overview' : 'View All'}</span>
             <span className="text-gray-900 font-bold sm:hidden capitalize">{pathname.split('/')[1] || 'Overview'}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">System Date</p>
              <p className="text-sm font-black text-gray-900">
                {currentDateTime || 'Loading Date...'}
              </p>
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
