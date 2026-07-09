'use client';

import React, { useState, useEffect } from 'react';
import { getUsers } from '@/lib/localDb';
import { supabase } from '@/lib/supabase';
import { 
  UserPlus, 
  ShieldCheck, 
  Search, 
  UserX, 
  CheckCircle2, 
  Mail,
  Trash2,
  AlertTriangle,
  X,
  Check,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserProfile, UserRole } from '@/types';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function Users() {
  const { profile: currentProfile, refreshSession } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'accountant' as UserRole,
  });

  // Custom visual feedback state instead of browser alerts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ uid: string; email: string } | null>(null);

  // Auto-hide toast messages
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (error: any) {
        console.error("Error fetching users:", {
          message: error.message,
          details: error.details,
          code: error.code
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Access Control: Only Super Admins can manage users
  if (currentProfile && currentProfile.role !== 'super_admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-20 h-20 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mb-6">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Security Alert: Access Forbidden</h1>
        <p className="text-gray-500 max-w-md font-medium">
          The User Management module is strictly reserved for Super Administrators. Your attempt has been logged for security audit purposes.
        </p>
      </div>
    );
  }

  const handleDeleteUser = (uid: string, email: string) => {
    if (currentProfile && currentProfile.uid === uid) {
      setToast({ message: "You cannot delete your own user account.", type: 'error' });
      return;
    }
    if (uid === 'mock-admin' || uid === 'admin-user') {
      setToast({ message: "The default system administrator account cannot be deleted.", type: 'warning' });
      return;
    }
    setConfirmDelete({ uid, email });
  };

  const executeDeleteUser = async () => {
    if (!confirmDelete) return;
    const { uid } = confirmDelete;
    try {
      setLoading(true);
      // Delete from both Auth and public database via single API call
      const response = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to delete user');

      setUsers(users.filter(u => u.uid !== uid));
      setToast({ message: "User deleted successfully from system.", type: 'success' });
    } catch (error: any) {
      console.error("Error deleting user:", {
        message: error.message,
        details: error.details,
        code: error.code
      });
      setToast({ message: `Failed to delete user: ${error.message}`, type: 'error' });
    } finally {
      setConfirmDelete(null);
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, requesterUid: currentProfile?.uid })
      });

      const resData = await response.json();
      if (!response.ok) {
        // If server returns structured error, extract message. Otherwise fallback.
        const errorMessage = typeof resData.error === 'string' ? resData.error : (resData.error?.message || 'Failed to add user');
        throw new Error(errorMessage);
      }

      // Re-fetch users to get the fresh profiles directly from Supabase
      const data = await getUsers();
      setUsers(data);
      
      setShowAdd(false);
      setNewUser({ username: '', password: '', role: 'accountant' });
      setToast({ message: 'User created and synchronized successfully!', type: 'success' });
    } catch (error: any) {
      console.error("Error adding user:", {
        message: error.message,
        details: error.details,
        code: error.code
      });
      setToast({ message: `Error: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, status: newStatus, version: user.updatedAt })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to update user status');

      setUsers(users.map(u => u.uid === user.uid ? { ...u, status: newStatus, updatedAt: resData.updatedAt } : u));
      setToast({ message: `User status changed to ${newStatus}.`, type: 'success' });
    } catch (error: any) {
      console.error("Error updating status:", {
        message: error.message,
        details: error.details,
        code: error.code
      });
      setToast({ message: `Failed to update user status: ${error.message}`, type: 'error' });
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      setLoading(true);
      const targetUser = users.find(u => u.uid === uid);
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role: newRole, version: targetUser?.updatedAt })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to update user role');

      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole, updatedAt: resData.updatedAt } : u));
      setToast({ message: `User role successfully updated to ${newRole.replace('_', ' ')}.`, type: 'success' });

      if (currentProfile && currentProfile.uid === uid) {
        await refreshSession();
      }
    } catch (error: any) {
      console.error("Error updating role:", {
        message: error.message,
        details: error.details,
        code: error.code
      });
      setToast({ message: `Failed to update user role: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUserAvatarUpload = (uid: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
          saveUserAvatar(uid, compressed);
        } else {
          saveUserAvatar(uid, event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveUserAvatar = async (uid: string, photoURL: string) => {
    try {
      // Update avatar in Supabase directly
      const { error } = await supabase.from('users').update({ photo_url: photoURL }).eq('id', uid);
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, photoURL } : u));
      
      // If it's the current user, notify other components
      if (currentProfile && currentProfile.uid === uid) {
        window.dispatchEvent(new Event('profile-updated'));
      }
      
      setToast({ message: "Profile picture updated successfully.", type: 'success' });
    } catch (error: any) {
      console.error("Error saving avatar:", {
        message: error.message,
        details: error.details,
        code: error.code
      });
      setToast({ message: "Failed to save profile picture.", type: 'error' });
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 font-medium">Manage permissions and system access</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 px-5 py-3 gradient-bg text-white font-bold rounded-2xl shadow-lg shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <UserPlus size={20} />
          Add Internal User
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShieldCheck size={18} className="text-purple-600" />
              Role Overview
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-50 space-y-1">
                <p className="text-xs font-black text-purple-600 uppercase tracking-widest">Super Admin</p>
                <p className="text-xs text-purple-500 font-medium leading-relaxed">Full system access, user management, and security overrides.</p>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50 space-y-1">
                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Admin</p>
                <p className="text-xs text-indigo-500 font-medium leading-relaxed">Operational management over students, records, and financial systems.</p>
              </div>
              <div className="p-4 rounded-2xl bg-pink-50 space-y-1">
                <p className="text-xs font-black text-pink-600 uppercase tracking-widest">Accountant</p>
                <p className="text-xs text-pink-500 font-medium leading-relaxed">Register students, collect fees, manage installments and refunds.</p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 space-y-1">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Auditor</p>
                <p className="text-xs text-blue-500 font-medium leading-relaxed">View-only access to dashboard, income, payments, and financial reports.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {showAdd && (
            <div className="bg-white rounded-3xl shadow-sm border-2 border-purple-100 p-8 animate-in fade-in slide-in-from-top-4 duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Authorize New Institutional User</h3>
              <form id="authorize-user-form" onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Username (System ID)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                       type="text"
                      required
                      placeholder="e.g. ACCOUNTANT_01"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Initial Password</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">System Role</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-700 capitalize"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                  >
                    <option value="accountant">Accountant</option>
                    <option value="auditor">Auditor</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="md:col-span-3 flex justify-end gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAdd(false)}
                    className="px-6 py-3 text-gray-500 font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 gradient-bg text-white font-bold rounded-2xl shadow-lg"
                  >
                    Confirm Access
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Filter users by email..."
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm outline-none focus:bg-white focus:border-purple-100 transition-all font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text">User Info</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Joined</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-gray-50/20 transition-colors group">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <input 
                            type="file"
                            id={`user-avatar-upload-${u.uid}`}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUserAvatarUpload(u.uid, e)}
                          />
                          <label 
                            htmlFor={`user-avatar-upload-${u.uid}`}
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-white font-black overflow-hidden relative cursor-pointer hover:opacity-95 group/user-avatar",
                              u.role === 'super_admin' ? "gradient-bg" : "bg-gray-200 text-gray-500"
                            )}
                            title="Click to change this user's avatar"
                          >
                            {u.photoURL ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.photoURL} alt={u.displayName || u.email} className="w-full h-full object-cover" />
                            ) : (
                              (u.displayName || u.email).charAt(0).toUpperCase()
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/user-avatar:opacity-100 flex items-center justify-center text-[8px] text-white font-black uppercase transition-opacity">
                              Edit
                            </div>
                          </label>
                          <div>
                            <p className="text-sm font-bold text-gray-900 tracking-tight">{u.displayName || u.email}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        {currentProfile && (currentProfile.role === 'super_admin' || currentProfile.role === 'admin') && u.uid !== currentProfile.uid ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tighter cursor-pointer border border-transparent outline-none focus:ring-2 focus:ring-purple-500",
                              u.role === 'super_admin' ? "bg-purple-100 text-purple-700" :
                              u.role === 'admin' ? "bg-indigo-100 text-indigo-700" :
                              u.role === 'accountant' ? "bg-pink-100 text-pink-700" :
                              u.role === 'auditor' ? "bg-blue-100 text-blue-700" :
                              "bg-gray-100 text-gray-700"
                            )}
                          >
                            <option value="accountant">Accountant</option>
                            <option value="auditor">Auditor</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        ) : (
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-tighter inline-block",
                            u.role === 'super_admin' ? "bg-purple-100 text-purple-700" :
                            u.role === 'admin' ? "bg-indigo-100 text-indigo-700" :
                            u.role === 'accountant' ? "bg-pink-100 text-pink-700" :
                            u.role === 'auditor' ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                          )}>
                            {u.role.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{format(u.createdAt, 'MMM dd, yyyy')}</p>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", u.status === 'active' ? "bg-green-500" : "bg-gray-300")} />
                          <span className={cn("text-xs font-bold uppercase tracking-tight", u.status === 'active' ? "text-green-600" : "text-gray-400")}>
                            {u.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => toggleStatus(u)}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              u.status === 'active' ? "text-gray-300 hover:text-amber-600 hover:bg-amber-50" : "text-gray-300 hover:text-green-600 hover:bg-green-50"
                            )}
                            title={u.status === 'active' ? "Deactivate User" : "Activate User"}
                          >
                            {u.status === 'active' ? <UserX size={18} /> : <CheckCircle2 size={18} />}
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteUser(u.uid, u.email)}
                            className="p-2 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-sans tracking-tight italic">
                         No users found with these criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[300] bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
            toast.type === 'success' ? "bg-green-50 text-green-600" :
            toast.type === 'error' ? "bg-red-50 text-red-600" :
            "bg-amber-50 text-amber-600"
          )}>
            {toast.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          </div>
          <p className="text-sm font-bold text-gray-900 pr-4">{toast.message}</p>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 shadow-inner shadow-rose-100">
              <Trash2 size={28} />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Delete User Account</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Are you sure you want to permanently delete user <span className="font-bold text-gray-800">{confirmDelete.email}</span>? This action is irreversible and will immediately revoke all access keys.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="px-5 py-3 rounded-2xl bg-gray-50 text-gray-500 hover:bg-gray-100 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={executeDeleteUser}
                className="px-5 py-3 rounded-2xl bg-rose-600 text-white hover:bg-rose-700 font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-100 transition-all"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
