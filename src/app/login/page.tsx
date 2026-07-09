'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { School, LogIn, ShieldAlert, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both your system identification and access key.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Map username to an email format for auth, or use directly if it is already an email
      const systemEmail = username.includes('@') ? username : `${username.toLowerCase()}@ridm.system`;

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: systemEmail,
        password,
      });

      if (authError) {
        setError('Authentication failed. Invalid system credentials.');
        setLoading(false);
        return;
      }
      
      window.location.replace('/');
      return;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Access sequence failed. Tactical override required.');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-r from-[#1e1b4b] via-[#581c87] to-[#6b21a8] flex items-center justify-center p-6 relative overflow-hidden"
    >
      {/* Islamic Pattern Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.35] mix-blend-overlay pointer-events-none" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'80'%20height%3D'80'%20viewBox%3D'0%200%2080%2080'%3E%3Cg%20fill%3D'none'%20stroke%3D'%2523ffffff'%20stroke-width%3D'0.8'%3E%3Cpath%20d%3D'M40%200L50%2030L80%2040L50%2050L40%2080L30%2050L0%2040L30%2030Z'%20stroke-opacity%3D'0.8'%2F%3E%3Cpath%20d%3D'M20%2020L40%2040L60%2020L40%200Z%20M20%2060L40%2080L60%2060L40%2040Z%20M0%2040L20%2020L40%2040L20%2060Z%20M80%2040L60%2020L40%2040L60%2060Z'%20stroke-opacity%3D'0.5'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E")`, 
          backgroundSize: '120px 120px' 
        }} 
      />
      
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-800/10 via-pink-800/10 to-blue-900/10 -z-10" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gradient-to-r from-pink-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center z-10 basis-full">
        {/* Branding & Visual column */}
        <div className="md:col-span-6 text-center md:text-left space-y-4 md:space-y-8 flex flex-col items-center md:items-start justify-center">
          <div className="w-32 sm:w-40 md:w-full md:max-w-[340px] mx-auto md:mx-0 flex items-center justify-center md:-ml-2 group hover:scale-105 transition-transform duration-300 relative">
            {/* Logo Glow */}
            <div className="absolute inset-0 bg-white/40 blur-3xl rounded-full scale-125 animate-pulse pointer-events-none" />
            
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="RIDM Logo" className="relative w-full h-auto object-contain drop-shadow-2xl group-hover:rotate-1 transition-transform z-10" />
          </div>
          <div className="space-y-2 md:space-y-4 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-xl">
              RIDM Student Financial System
            </h1>
            <p className="text-purple-100 font-medium text-sm md:text-xl leading-relaxed font-sans drop-shadow-md max-w-lg hidden sm:block">
              Secure institutional access for financial management, fee tracking, and installment systems.
            </p>
          </div>
        </div>

        {/* Login Column */}
        <div className="md:col-span-6 bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-purple-100/50 p-6 sm:p-8 lg:p-12 border border-gray-100 relative space-y-6 md:space-y-8">
          <div className="border-b border-gray-50 pb-8 text-center md:text-left">
             <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Platform Access</h2>
             <p className="text-sm text-gray-400 font-medium font-sans">Institutional terminal required. Managed by Registry and IT Departments.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="animate-in fade-in slide-in-from-top-1">
                <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex gap-3 border border-red-100 italic">
                  <ShieldAlert size={16} className="shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Identification</label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-900 tracking-tight"
                  placeholder="Username"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secure Access Key</label>
                <div className="relative">
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-900 tracking-tight"
                    placeholder="••••••••••••"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <ShieldCheck size={18} className="text-gray-300" />
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-purple-700 to-blue-700 text-white font-black rounded-2xl hover:from-purple-800 hover:to-blue-800 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-purple-200/50 hover:shadow-purple-300/50 active:scale-[0.98] border-b-4 border-b-blue-900 group"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={20} />
                  <span className="text-lg tracking-tight uppercase">Initiate Access</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 justify-center text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-4">
              <ShieldCheck size={14} className="text-emerald-500" />
              256-bit Encrypted Session
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
