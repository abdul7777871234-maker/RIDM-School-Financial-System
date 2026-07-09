'use client';

import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '@/lib/localDb';
import { 
  Settings as SettingsIcon, 
  School, 
  Image as ImageIcon, 
  Coins, 
  Save, 
  ShieldCheck,
  UserCog,
  ChevronRight,
  Lock,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SchoolSettings } from '@/types';
import Link from 'next/link';
import { Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Section = ({ title, description, icon: Icon, children }: any) => (
  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-8 space-y-6">
    <div className="flex items-start justify-between border-b border-gray-50 pb-4 sm:pb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
          <Icon size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h3>
          <p className="text-xs text-gray-400 font-medium font-sans">{description}</p>
        </div>
      </div>
    </div>
    <div>{children}</div>
  </div>
);

export default function Settings() {
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: '',
    currency: 'SAR',
    theme: 'light',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    new: '',
    confirm: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdatePassword = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!passwords.new) {
      alert('Please enter a new password/access key.');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      alert('Passwords do not match!');
      return;
    }
    if (passwords.new.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });
      if (error) {
        throw error;
      }
      alert('Password updated successfully!');
      setPasswords({ new: '', confirm: '' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      alert(`Error updating password: ${error.message || error}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(settings);
      alert('Settings saved successfully!');
    } catch (error: any) {
      console.error("Error saving settings:", error);
      const errorMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      alert(`Error saving settings: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const resizeAndCompressImage = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
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
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          callback(compressed);
        } else {
          callback(event.target?.result as string);
        }
      };
      img.onerror = () => {
        callback(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    resizeAndCompressImage(file, (compressedBase64) => {
      setSettings(prev => ({ ...prev, schoolLogo: compressedBase64 }));
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      resizeAndCompressImage(file, (compressedBase64) => {
        setSettings(prev => ({ ...prev, schoolLogo: compressedBase64 }));
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white">
            <SettingsIcon size={20} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Configuration</h1>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8 pb-10">
        <Section 
          title="School Information" 
          description="General identity and branding of the educational institution."
          icon={School}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Official School Name</label>
                <input 
                  type="text"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium font-sans"
                  value={settings.schoolName}
                  onChange={(e) => setSettings({...settings, schoolName: e.target.value})}
                  placeholder="e.g. RIDM Academy"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Paste School Logo URL</label>
                <div className="relative">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-medium font-sans"
                    value={settings.schoolLogo || ''}
                    onChange={(e) => setSettings({...settings, schoolLogo: e.target.value})}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </div>

            {/* Direct Drag & Drop or Custom File Logo Uploader Element as requested */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-50">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Or Drag & Drop / Click to Upload Custom Logo File</label>
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-200 hover:border-purple-400 transition-all rounded-2xl p-6 text-center bg-gray-50/50 hover:bg-white cursor-pointer group flex flex-col items-center justify-center min-h-[140px]"
                >
                  <input 
                    type="file"
                    id="logo-input-file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <label htmlFor="logo-input-file" className="cursor-pointer space-y-2 flex flex-col items-center justify-center w-full">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImageIcon size={20} />
                    </div>
                    <p className="text-xs font-bold text-gray-700">Choose custom logo image file</p>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">PNG, JPG, SVG up to 2MB</p>
                  </label>
                </div>
              </div>

              {/* Live logo visual Preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100 min-h-[140px]">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Branding Preview</p>
                {settings.schoolLogo ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 bg-white border border-gray-100 rounded-2xl flex items-center justify-center p-2 shadow-sm overflow-hidden uppercase">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={settings.schoolLogo} 
                        alt="Custom School Logo preview" 
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, schoolLogo: '' }))}
                      className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                    >
                      Remove Logo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                      <School size={24} />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold mt-2">Active Institution Standard Icon</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Section>

        <Section 
          title="Regional & Financial" 
          description="Currency formats and financial system preferences."
          icon={Coins}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Active Currency</label>
              <select 
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-700"
                value={settings.currency}
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
              >
                <option value="SAR">Saudi Riyal (SAR)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="AED">UAE Dirham (AED)</option>
                <option value="KWD">Kuwaiti Dinar (KWD)</option>
              </select>
            </div>
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 flex items-center gap-4">
              <ShieldCheck className="text-orange-500" size={24} />
              <p className="text-xs text-orange-700 font-bold leading-relaxed tracking-tight uppercase">
                Currency changes will update all dashboard figures instantly across the institution.
              </p>
            </div>
          </div>
        </Section>

        <Section 
          title="Account Management" 
          description="Provision new institutional accounts for staff and administrators."
          icon={UserCog}
        >
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-purple-50 flex items-center gap-4">
               <ShieldCheck className="text-purple-600" size={24} />
               <div className="space-y-1">
                 <p className="text-xs text-purple-900 font-bold tracking-tight uppercase leading-none">System Authorization</p>
                 <p className="text-[10px] text-purple-600 font-bold uppercase tracking-widest leading-none">Adding a user will instantly grant them secure terminal access.</p>
               </div>
            </div>

            <Link 
              href="/users"
              className="group flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-purple-200 hover:bg-gray-50/50 transition-all font-sans"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-purple-100 group-hover:text-purple-600 flex items-center justify-center transition-colors">
                  <UserCog size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Manage System Users</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Configure roles and access permissions</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </Section>

        <Section 
          title="Security & Authorization" 
          description="Manage your secure access keys and system permissions."
          icon={Lock}
        >
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-4">
              <UserCog className="text-blue-500" size={24} />
               <div className="space-y-1">
                 <p className="text-xs text-blue-900 font-bold tracking-tight uppercase leading-none">Account Recovery</p>
                 <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Only authorized personnel can update the main system access key.</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">New Access Key</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      id="new-access-key"
                      type="password"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold tracking-tight text-base"
                      value={passwords.new}
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUpdatePassword(e);
                        }
                      }}
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Confirm Access Key</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      id="confirm-access-key"
                      type="password"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold tracking-tight text-base"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUpdatePassword(e);
                        }
                      }}
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>
              </div>
              <div className="pb-1">
                <button
                  id="update-access-key-btn"
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={passwordLoading}
                  className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl shadow-lg hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {passwordLoading ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  Update Access Key
                </button>
              </div>
            </div>
          </div>
        </Section>

        <div className="flex justify-end p-2">
          <button 
            type="submit"
            disabled={saving}
            className="px-10 py-4 gradient-bg text-white font-black rounded-2xl shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-70"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SaveIcon size={22} />}
            Commit Configuration
          </button>
        </div>
      </form>
    </div>
  );
}

const SaveIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);
