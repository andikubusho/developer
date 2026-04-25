import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { Profile, UserRole, Capabilities, Role } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Shield, Trash2, Pencil, Plus, ArrowLeft, Check, UserPlus, ShieldCheck, ChevronRight, LayoutGrid, Users as UsersIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { MENU_KEYS } from '../../shared/schema';
import { motion, AnimatePresence } from 'motion/react';

const getDefaultPermissions = (role: UserRole): Record<string, any> => {
  const permissions: Record<string, any> = {};
  MENU_KEYS.forEach(menu => {
    if (role === 'admin' || role === 'owner') {
      permissions[menu.key] = { view: true, create: true, edit: true, delete: true, print: true };
      return;
    }

    const roleGroupMap: Record<string, string> = {
      'marketing': 'Marketing',
      'teknik': 'Teknik',
      'keuangan': 'Keuangan',
      'accounting': 'Accounting',
      'hrd': 'HRD',
      'audit': 'Audit'
    };

    const targetGroup = roleGroupMap[role as string];
    if (menu.group === targetGroup) {
      permissions[menu.key] = { 
        view: true, 
        create: menu.capabilities.create, 
        edit: menu.capabilities.edit, 
        delete: menu.capabilities.delete, 
        print: menu.capabilities.print 
      };
    } else {
      permissions[menu.key] = { view: false, create: false, edit: false, delete: false, print: false };
    }
  });
  return permissions;
};

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  
  // Selection state
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Forms state
  const [userForm, setUserForm] = useState({
    id: '',
    full_name: '',
    username: '',
    password: '',
    role: 'marketing' as UserRole,
    role_id: '' as string | null,
    permissions: null as any
  });

  const [roleForm, setRoleForm] = useState({
    id: '',
    name: '',
    division: 'marketing' as UserRole,
    permissions: {} as Record<string, Capabilities>
  });

  const divisionOptions: UserRole[] = ['admin', 'marketing', 'owner', 'supervisor', 'manager', 'teknik', 'keuangan', 'audit', 'hrd', 'accounting'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profilesData, rolesData] = await Promise.all([
        api.get('profiles', 'select=*&order=created_at.desc'),
        api.get('roles', 'order=name.asc')
      ]);
      setProfiles(profilesData || []);
      setAvailableRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const hashPassword = async (password: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // --- ROLE ACTIONS ---
  
  const handleAddRole = () => {
    const initialPerms: any = {};
    MENU_KEYS.forEach(m => initialPerms[m.key] = { view: false, create: false, edit: false, delete: false, print: false });
    
    setRoleForm({ id: '', name: '', division: 'marketing', permissions: initialPerms });
    setSelectedRole(null);
    setIsRoleModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setRoleForm({
      id: role.id,
      name: role.name,
      division: role.division,
      permissions: role.permissions
    });
    setSelectedRole(role);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (roleForm.id) {
        await api.update('roles', roleForm.id, { 
          name: roleForm.name, 
          division: roleForm.division, 
          permissions: roleForm.permissions 
        });
      } else {
        await api.insert('roles', { 
          name: roleForm.name, 
          division: roleForm.division, 
          permissions: roleForm.permissions 
        });
      }
      setIsRoleModalOpen(false);
      fetchData();
      alert('Role berhasil disimpan');
    } catch (error) {
      alert('Gagal menyimpan role');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (!confirm(`Hapus jabatan "${name}"? User yang menggunakan jabatan ini akan kehilangan referensi jabatannya (tetap memiliki akses terakhir).`)) return;
    try {
      setLoading(true);
      await api.delete('roles', id);
      fetchData();
    } catch (error) {
      alert('Gagal menghapus role');
    } finally {
      setLoading(false);
    }
  };

  const updateRolePermission = (menuKey: string, cap: keyof Capabilities, val: boolean) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [menuKey]: { ...prev.permissions[menuKey], [cap]: val }
      }
    }));
  };

  // --- USER ACTIONS ---

  const handleAddUser = () => {
    setUserForm({ id: '', full_name: '', username: '', password: '', role: 'marketing', role_id: '', permissions: null });
    setIsUserModalOpen(true);
  };

  const handleEditUser = (p: Profile) => {
    setUserForm({
      id: p.id,
      full_name: p.full_name,
      username: p.username || (p.email ? p.email.split('@')[0] : ''),
      password: '',
      role: p.role,
      role_id: p.role_id || '',
      permissions: p.permissions
    });
    setIsEditUserModalOpen(true);
  };

  const onRoleChange = (roleId: string) => {
    const role = availableRoles.find(r => r.id === roleId);
    if (!role) {
      setUserForm(prev => ({ ...prev, role_id: roleId }));
      return;
    }

    if (confirm(`Terapkan izin dari [${role.name}]? Ini akan menimpa pengaturan izin saat ini.`)) {
      setUserForm(prev => ({ 
        ...prev, 
        role_id: roleId, 
        role: role.division, 
        permissions: role.permissions 
      }));
    } else {
      // User cancelled, but we still update the role_id if they just want the label?
      // No, usually it's better to stay as is. But for UI consistency, we update only the ID if they want.
      // For now, we update NOTHING to keep it safe.
    }
  };

  const handleSaveUser = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    try {
      setLoading(true);
      const username = userForm.username.toLowerCase().replace(/\s/g, '');
      const internalEmail = `${username}@internal.com`;
      
      const payload: any = {
        full_name: userForm.full_name,
        role: userForm.role,
        role_id: userForm.role_id || null,
        permissions: userForm.permissions || getDefaultPermissions(userForm.role)
      };

      if (userForm.password) {
        payload.password = await hashPassword(userForm.password);
      }

      if (isEdit) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', userForm.id);
        if (error) throw error;
      } else {
        // Check duplicate
        const { data: existing } = await supabase.from('profiles').select('id').eq('email', internalEmail).single();
        if (existing) throw new Error('Username sudah digunakan');
        
        const newId = crypto.randomUUID();
        const { error } = await supabase.from('profiles').insert([{ ...payload, id: newId, email: internalEmail }]);
        if (error) throw error;
      }

      setIsUserModalOpen(false);
      setIsEditUserModalOpen(false);
      fetchData();
      alert(isEdit ? 'User diperbarui' : 'User ditambahkan');
    } catch (error: any) {
      alert(`Gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserPermissions = async (menuKey: string, cap: keyof Capabilities, val: boolean) => {
    if (!selectedProfile) return;
    const newPerms = {
      ...selectedProfile.permissions,
      [menuKey]: { ...(selectedProfile.permissions?.[menuKey] || { view: false, create: false, edit: false, delete: false, print: false }), [cap]: val }
    };
    try {
      await api.update('profiles', selectedProfile.id, { permissions: newPerms });
      setSelectedProfile({ ...selectedProfile, permissions: newPerms });
      setProfiles(profiles.map(p => p.id === selectedProfile.id ? { ...p, permissions: newPerms } : p));
    } catch (error) {
      alert('Gagal update izin');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === profile?.id) return alert('Tidak bisa hapus akun sendiri');
    if (!confirm(`Hapus user "${name}" permanen?`)) return;
    try {
      setLoading(true);
      await api.delete('profiles', id);
      fetchData();
    } catch (error) {
      alert('Gagal hapus user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
            <p className="text-slate-500 font-medium">Kelola akses dan jabatan pengguna sistem</p>
          </div>
        </div>
        <Button 
          onClick={activeTab === 'users' ? handleAddUser : handleAddRole} 
          className="gap-2 shadow-lg shadow-primary/20"
        >
          {activeTab === 'users' ? <UserPlus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {activeTab === 'users' ? 'Tambah User' : 'Buat Jabatan'}
        </Button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full max-w-md relative overflow-hidden">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all relative z-10",
            activeTab === 'users' ? "text-primary" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <UsersIcon className="w-4 h-4" />
          Daftar User
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all relative z-10",
            activeTab === 'roles' ? "text-primary" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          Manajemen Jabatan/Role
        </button>
        <motion.div
          className="absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-sm z-0"
          initial={false}
          animate={{
            x: activeTab === 'users' ? 0 : '100%',
            width: 'calc(50% - 6px)'
          }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
        />
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'users' ? (
          <motion.div
            key="users-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-0 overflow-hidden border-none shadow-premium">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-widest border-b">
                      <th className="px-6 py-4 font-black">Staf</th>
                      <th className="px-6 py-4 font-black">Username</th>
                      <th className="px-6 py-4 font-black">Role Utama</th>
                      <th className="px-6 py-4 font-black">Jabatan Detail</th>
                      <th className="px-6 py-4 font-black text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400">Memuat data...</td></tr>
                    ) : profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {p.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{p.full_name || 'Tanpa Nama'}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-tighter">ID: {p.id.substring(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                          {p.username || p.email?.split('@')[0]}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            {p.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            p.role_id ? "bg-indigo-50 text-indigo-600" : "text-slate-300"
                          )}>
                            {availableRoles.find(r => r.id === p.role_id)?.name || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedProfile(p); setIsPermissionsModalOpen(true); }} className="h-8 text-primary hover:bg-primary/5">
                            <Shield className="w-3.5 h-3.5 mr-2" /> Akses
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditUser(p)} className="h-8 text-slate-400 hover:text-slate-600">
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(p.id, p.full_name)} className="h-8 text-red-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="roles-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {availableRoles.map(role => (
              <Card key={role.id} className="p-6 border-none shadow-premium hover:shadow-xl transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)} className="h-8 w-8 p-0">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id, role.name)} className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-1">{role.name}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">Divisi: {role.division}</p>
                <Button 
                  variant="outline" 
                  className="w-full justify-between group/btn border-slate-200 hover:border-indigo-600 hover:text-indigo-600"
                  onClick={() => handleEditRole(role)}
                >
                  Edit Konfigurasi Izin
                  <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODALS --- */}

      {/* User Add/Edit Modal */}
      <Modal
        isOpen={isUserModalOpen || isEditUserModalOpen}
        onClose={() => { setIsUserModalOpen(false); setIsEditUserModalOpen(false); }}
        title={isEditUserModalOpen ? "Edit Detail User" : "Tambah User Baru"}
        size="md"
      >
        <form onSubmit={(e) => handleSaveUser(e, isEditUserModalOpen)} className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Nama Lengkap</label>
            <Input value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} required />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Username</label>
            <Input 
              value={userForm.username} 
              onChange={e => setUserForm({...userForm, username: e.target.value})} 
              disabled={isEditUserModalOpen}
              className={isEditUserModalOpen ? "bg-slate-50 cursor-not-allowed" : ""}
              required 
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Role Utama (Divisi)</label>
            <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full rounded-xl border-slate-200 text-sm p-2.5">
              {divisionOptions.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Jabatan / Role Detail</label>
            <select 
              value={userForm.role_id || ''} 
              onChange={e => onRoleChange(e.target.value)}
              className="w-full rounded-xl border-slate-200 text-sm p-2.5"
            >
              <option value="">- Tanpa Jabatan Khusus -</option>
              {availableRoles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.division.toUpperCase()})</option>)}
            </select>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <label className="text-xs font-black text-amber-600 uppercase tracking-widest block mb-1.5">Password</label>
            <Input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} placeholder={isEditUserModalOpen ? "Kosongkan jika tidak berubah" : "****"} required={!isEditUserModalOpen} />
          </div>
          <Button type="submit" className="w-full h-12" isLoading={loading}>Simpan User</Button>
        </form>
      </Modal>

      {/* Unified Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={selectedRole ? `Edit Jabatan: ${selectedRole.name}` : "Tambah Jabatan Baru"}
        size="3xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Nama Jabatan</label>
              <Input value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} required />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Divisi Utama</label>
              <select value={roleForm.division} onChange={e => setRoleForm({...roleForm, division: e.target.value as UserRole})} className="w-full rounded-xl border-slate-200 text-sm p-2.5">
                {divisionOptions.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-black text-slate-900 mb-4">Konfigurasi Hak Akses Template</h4>
            <div className="max-h-[50vh] overflow-y-auto border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b">
                    <th className="py-3 px-4">Menu</th>
                    <th className="py-3 px-1 text-center w-[60px]">View</th>
                    <th className="py-3 px-1 text-center w-[60px]">Create</th>
                    <th className="py-3 px-1 text-center w-[60px]">Edit</th>
                    <th className="py-3 px-1 text-center w-[60px]">Delete</th>
                    <th className="py-3 px-1 text-center w-[60px]">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {MENU_KEYS.map(menu => (
                    <tr key={menu.key} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <p className="text-sm font-bold text-slate-800">{menu.label}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{menu.group}</p>
                      </td>
                      {(['view', 'create', 'edit', 'delete', 'print'] as const).map(cap => {
                        const isAvail = (menu.capabilities as any)[cap];
                        return (
                          <td key={cap} className="py-3 px-1 text-center">
                            {isAvail ? (
                              <button
                                type="button"
                                onClick={() => updateRolePermission(menu.key, cap, !roleForm.permissions[menu.key]?.[cap])}
                                className={cn(
                                  "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center mx-auto",
                                  roleForm.permissions[menu.key]?.[cap] ? "bg-primary border-primary text-white" : "border-slate-200 text-transparent"
                                )}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </button>
                            ) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Button type="submit" className="w-full h-12" isLoading={loading}>Simpan Template Jabatan</Button>
        </form>
      </Modal>

      {/* Permissions Modal (Individual Override) */}
      <Modal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        title={`Custom Hak Akses: ${selectedProfile?.full_name}`}
        size="3xl"
      >
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b">
                <th className="py-4 px-4 w-1/2">Modul</th>
                <th className="py-4 px-1 text-center w-[60px]">View</th>
                <th className="py-4 px-1 text-center w-[60px]">Input</th>
                <th className="py-4 px-1 text-center w-[60px]">Edit</th>
                <th className="py-4 px-1 text-center w-[60px]">Hapus</th>
                <th className="py-4 px-1 text-center w-[60px]">Cetak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {MENU_KEYS.map(menu => (
                <tr key={menu.key} className="hover:bg-slate-50/50">
                  <td className="py-4 px-4">
                    <p className="text-sm font-bold text-slate-900">{menu.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{menu.group}</p>
                  </td>
                  {(['view', 'create', 'edit', 'delete', 'print'] as const).map(cap => {
                    const isAvail = (menu.capabilities as any)[cap];
                    return (
                      <td key={cap} className="py-4 px-1 text-center">
                        {isAvail ? (
                          <button
                            onClick={() => handleUpdateUserPermissions(menu.key, cap, !selectedProfile?.permissions?.[menu.key]?.[cap])}
                            className={cn(
                              "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center mx-auto",
                              selectedProfile?.permissions?.[menu.key]?.[cap] ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "border-slate-200 text-transparent"
                            )}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        ) : "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 pt-6 border-t flex justify-end">
          <Button onClick={() => setIsPermissionsModalOpen(false)}>Selesai & Simpan</Button>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
