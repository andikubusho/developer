import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { Profile, UserRole, Capabilities, Role, ALL_DIVISIONS } from '../types';
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
    if (role === 'admin') {
      permissions[menu.key] = { 
        view: true, 
        create: true, 
        edit: true, 
        delete: true, 
        print: true,
        viewAll: 'viewAll' in menu.capabilities ? (menu.capabilities as any).viewAll : false 
      };
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
        print: menu.capabilities.print,
        viewAll: false 
      };
    } else {
      permissions[menu.key] = { 
        view: false, 
        create: false, 
        edit: false, 
        delete: false, 
        print: false,
        viewAll: false
      };
    }
  });
  return permissions;
};

const PermissionToggle: React.FC<{
  isAvail: boolean;
  hasAccess: boolean;
  onToggle: () => void;
  label: string;
}> = ({ isAvail, hasAccess, onToggle, label }) => {
  return (
    <button
      type="button"
      disabled={!isAvail}
      onClick={onToggle}
      className={cn(
        "w-6 h-6 rounded-md transition-all flex items-center justify-center mx-auto border-2 shadow-sm flex-shrink-0",
        !isAvail 
          ? "bg-slate-100/50 border-slate-100 cursor-not-allowed opacity-30" 
          : hasAccess 
            ? "bg-accent-dark border-accent-dark text-white shadow-premium scale-110" 
            : "bg-white border-slate-200 text-transparent hover:border-accent-dark/40 hover:bg-slate-50/50"
      )}
      title={!isAvail ? "Fitur tidak tersedia" : hasAccess ? `Cabut Akses ${label}` : `Beri Akses ${label}`}
    >
      {isAvail && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
    </button>
  );
};

const DataScopeToggle: React.FC<{
  userId: string;
  currentPermissions: Record<string, Capabilities> | null;
  onUpdate: () => void;
}> = ({ userId, currentPermissions, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const marketingModules = ['leads', 'follow-ups', 'sales', 'deposits'];
  
  // Check if ALL relevant modules have viewAll: true
  const isAll = marketingModules.every(key => !!currentPermissions?.[key]?.viewAll);

  const handleToggle = async (targetValue: boolean) => {
    if (loading) return;
    try {
      setLoading(true);
      const updatedPerms = { ...(currentPermissions || {}) };
      
      marketingModules.forEach(key => {
        if (updatedPerms[key]) {
          updatedPerms[key].viewAll = targetValue;
        } else {
          // Initialize default if key doesn't exist
          updatedPerms[key] = { view: false, create: false, edit: false, delete: false, print: false, viewAll: targetValue };
        }
      });
      
      await api.update('profiles', userId, { permissions: updatedPerms });
      onUpdate();
    } catch (error) {
      alert('Gagal memperbarui jangkauan data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex p-0.5 bg-slate-100 rounded-lg w-fit border border-slate-200">
      <button
        onClick={() => handleToggle(false)}
        disabled={loading}
        className={cn(
          "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
          !isAll ? "bg-white text-accent-dark shadow-sm" : "text-text-muted hover:text-text-secondary"
        )}
      >
        Sendiri
      </button>
      <button
        onClick={() => handleToggle(true)}
        disabled={loading}
        className={cn(
          "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
          isAll ? "bg-accent-dark text-white shadow-sm" : "text-text-muted hover:text-text-secondary"
        )}
      >
        Semua
      </button>
    </div>
  );
};

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [consultants, setConsultants] = useState<{ id: string; name: string }[]>([]);
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
    role_id: '',
    consultant_id: '' as string | null,
    permissions: null as Record<string, Capabilities> | null
  });

  const [roleForm, setRoleForm] = useState({
    id: '',
    name: '',
    division: 'marketing' as UserRole,
    authorized_divisions: [] as UserRole[],
    permissions: {} as Record<string, Capabilities>,
    receive_notifications: false,
    notification_settings: {} as Record<string, boolean>
  });

  const NOTIFICATION_TYPES = [
    { key: 'marketing_lead', label: 'Lead Baru Masuk', division: 'marketing', description: 'Pop-up saat staf marketing menambah lead baru' },
    { key: 'marketing_deposit', label: 'Titipan Baru', division: 'marketing', description: 'Pop-up saat ada input titipan konsumen' },
    { key: 'marketing_sale', label: 'Penjualan Baru', division: 'marketing', description: 'Pop-up saat transaksi penjualan diinput' },
    { key: 'keuangan_payment_new', label: 'Pembayaran Konsumen Baru', division: 'keuangan', description: 'Pop-up saat ada pembayaran masuk ke antrean verifikasi' },
    { key: 'teknik_pr_new', label: 'Pengajuan Material (PR) Baru', division: 'teknik', description: 'Pop-up saat gudang membuat pengajuan baru' },
    { key: 'teknik_pr_approved', label: 'PR Disetujui Manager', division: 'teknik', description: 'Pop-up saat manager menyetujui pengajuan' },
    { key: 'teknik_po_new', label: 'PO Dibuat', division: 'teknik', description: 'Pop-up saat PO material diterbitkan' },
    { key: 'teknik_receipt', label: 'Penerimaan Barang', division: 'teknik', description: 'Pop-up saat barang/material sampai di gudang' },
  ];

  const divisionOptions: UserRole[] = ['admin', 'marketing', 'teknik', 'keuangan', 'audit', 'hrd', 'accounting'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profilesData, rolesData, consultantsData] = await Promise.all([
        api.get('profiles', 'select=*&order=full_name.asc'),
        api.get('roles', 'select=*&order=name.asc'),
        api.get('consultants', 'select=id,name&order=name.asc')
      ]);
      setProfiles(profilesData || []);
      setAvailableRoles(rolesData || []);
      setConsultants(consultantsData || []);
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
    MENU_KEYS.forEach(m => initialPerms[m.key] = { 
      view: false, 
      create: false, 
      edit: false, 
      delete: false, 
      print: false,
      viewAll: false
    });
    
    setRoleForm({ id: '', name: '', division: 'marketing', authorized_divisions: [], permissions: initialPerms, receive_notifications: false, notification_settings: {} });
    setSelectedRole(null);
    setIsRoleModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setRoleForm({
      id: role.id,
      name: role.name,
      division: role.division,
      authorized_divisions: role.authorized_divisions || [],
      permissions: role.permissions,
      receive_notifications: !!role.receive_notifications,
      notification_settings: role.notification_settings || {}
    });
    setSelectedRole(role);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Auto-set primary division to the first authorized division if available
      const primaryDivision = roleForm.authorized_divisions.length > 0 
        ? roleForm.authorized_divisions[0] 
        : roleForm.division;

      const payload = { 
        name: roleForm.name, 
        division: primaryDivision, 
        authorized_divisions: roleForm.authorized_divisions,
        permissions: roleForm.permissions,
        receive_notifications: roleForm.receive_notifications,
        notification_settings: roleForm.notification_settings
      };

      if (roleForm.id) {
        await api.update('roles', roleForm.id, payload);
      } else {
        await api.insert('roles', payload);
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
    setUserForm({ id: '', full_name: '', username: '', password: '', role: 'marketing', role_id: '', consultant_id: null, permissions: null });
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
      consultant_id: p.consultant_id || null,
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
        consultant_id: userForm.consultant_id || null,
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
      ...(selectedProfile.permissions || {}),
      [menuKey]: {
        ...(selectedProfile.permissions?.[menuKey] || { 
          view: false, 
          create: false, 
          edit: false, 
          delete: false, 
          print: false,
          viewAll: false 
        }), 
        [cap]: val 
      }
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
            <h1 className="text-3xl font-black text-text-primary tracking-tight">User Management</h1>
            <p className="text-text-secondary font-medium">Kelola akses dan jabatan pengguna sistem</p>
          </div>
        </div>
        <Button 
          onClick={activeTab === 'users' ? handleAddUser : handleAddRole} 
          className="gap-2"
        >
          {activeTab === 'users' ? <UserPlus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {activeTab === 'users' ? 'Tambah User' : 'Buat Jabatan'}
        </Button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex p-1.5 bg-glass-deep backdrop-blur-glass-sm rounded-pill w-full max-w-md relative overflow-hidden border border-white/40 shadow-inset">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black transition-all relative z-10 uppercase tracking-widest",
            activeTab === 'users' ? "text-white" : "text-text-secondary hover:text-text-primary"
          )}
        >
          <UsersIcon className="w-4 h-4" />
          Daftar User
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black transition-all relative z-10 uppercase tracking-widest",
            activeTab === 'roles' ? "text-white" : "text-text-secondary hover:text-text-primary"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          Jabatan
        </button>
        <motion.div
          className="absolute top-1.5 bottom-1.5 bg-accent-dark rounded-pill shadow-glass z-0"
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
              <Table>
                  <THead>
                    <TR className="bg-white/20 text-text-secondary text-[10px] uppercase tracking-widest border-b">
                      <TH className="px-6 py-4 font-black">Staf</TH>
                      <TH className="px-6 py-4 font-black">Username</TH>
                      <TH className="px-6 py-4 font-black">Role Utama</TH>
                      <TH className="px-6 py-4 font-black">Jabatan Detail</TH>
                      <TH className="px-6 py-4 font-black">Scope Data</TH>
                      <TH className="px-6 py-4 font-black text-right">Aksi</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {loading ? (
                      <TR><TD colSpan={5} className="px-6 py-20 text-center text-text-muted">Memuat data...</TD></TR>
                    ) : profiles.map((p) => (
                      <TR key={p.id} className="hover:bg-white/40 transition-colors">
                        <TD className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-accent-mint/50 border border-white flex items-center justify-center text-accent-dark font-black shadow-glass">
                              {p.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-black text-text-primary">{p.full_name || 'Tanpa Nama'}</p>
                              <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">ID: {p.id.substring(0, 8)}</p>
                            </div>
                          </div>
                        </TD>
                        <TD className="px-6 py-4 text-sm font-bold text-text-secondary">
                          {p.username || p.email?.split('@')[0]}
                        </TD>
                        <TD className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-white/40 text-text-secondary text-[10px] font-black uppercase tracking-widest border border-white/40">
                            {p.role}
                          </span>
                        </TD>
                        <TD className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-[10px] font-black uppercase tracking-widest border",
                            p.role_id ? "bg-accent-lavender/30 text-accent-dark border-accent-lavender/40" : "text-text-muted border-white/40"
                          )}>
                            {availableRoles.find(r => r.id === p.role_id)?.name || '-'}
                          </span>
                        </TD>
                        <TD className="px-6 py-4">
                          {p.role === 'marketing' ? (
                            <DataScopeToggle 
                              userId={p.id} 
                              currentPermissions={p.permissions} 
                              onUpdate={fetchData} 
                            />
                          ) : (
                            <span className="text-text-muted font-bold">-</span>
                          )}
                        </TD>
                        <TD className="px-6 py-4 text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedProfile(p); setIsPermissionsModalOpen(true); }} className="h-8 text-primary hover:bg-primary/5">
                            <Shield className="w-3.5 h-3.5 mr-2" /> Akses
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditUser(p)} className="h-8 text-text-muted hover:text-text-secondary">
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(p.id, p.full_name)} className="h-8 text-red-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
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
              <Card key={role.id} className="p-6 border-none shadow-glass hover:shadow-glass-2 transition-all group bg-white/40 backdrop-blur-glass">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-accent-mint/50 text-accent-dark flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-glass">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)} className="h-8 w-8 p-0">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id, role.name)} className="h-8 w-8 p-0 text-red-500 hover:bg-red-400/20">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="text-lg font-black text-text-primary mb-1">{role.name}</h3>
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-6">Divisi: {role.division}</p>
                <Button 
                  variant="secondary" 
                  className="w-full justify-between group/btn"
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
            <label className="text-xs font-black text-text-muted uppercase tracking-widest block mb-1.5">Nama Lengkap</label>
            <Input value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} required />
          </div>
          <div>
            <label className="text-xs font-black text-text-muted uppercase tracking-widest block mb-1.5">Username</label>
            <Input 
              value={userForm.username} 
              onChange={e => setUserForm({...userForm, username: e.target.value})} 
              disabled={isEditUserModalOpen}
              className={isEditUserModalOpen ? "bg-white/30 cursor-not-allowed" : ""}
              required 
            />
          </div>
          <div>
            <label className="text-xs font-black text-text-muted uppercase tracking-widest block mb-1.5">Role Utama (Divisi)</label>
            <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full rounded-xl border-white/40 text-sm p-2.5">
              {divisionOptions.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-text-muted uppercase tracking-widest block mb-1.5">Jabatan / Role Detail</label>
            <select 
              value={userForm.role_id || ''} 
              onChange={e => onRoleChange(e.target.value)}
              className="w-full rounded-xl border-white/40 text-sm p-2.5"
            >
              <option value="">- Tanpa Jabatan Khusus -</option>
              {availableRoles
                .filter(r => r.division === userForm.role)
                .map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-text-muted uppercase tracking-widest block mb-1.5">Tautkan ke Konsultan Property (Untuk Isolasi Data)</label>
            <select 
              value={userForm.consultant_id || ''} 
              onChange={e => setUserForm({...userForm, consultant_id: e.target.value || null})}
              className="w-full rounded-xl border-white/40 text-sm p-2.5 bg-accent-mint/10 border-2"
            >
              <option value="">- Belum Ditautkan -</option>
              {consultants.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="text-[10px] text-text-muted mt-1 italic">*Wajib diisi untuk staf Marketing agar jangkauan data "SENDIRI" berfungsi.</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
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
        <div className="mb-6 flex justify-end">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest gap-2 bg-amber-50 text-amber-600 border-amber-200"
            onClick={async () => {
              try {
                if (!roleForm.authorized_divisions.length && !roleForm.division) {
                  alert('Pilih minimal satu divisi dulu');
                  return;
                }
                const targetDivs = [...new Set([roleForm.division, ...roleForm.authorized_divisions])];
                await api.insert('notifications', {
                  title: 'Tes Notifikasi System',
                  message: `Ini adalah pesan uji coba untuk jabatan: ${roleForm.name}.\nJika Anda melihat ini, berarti sistem pop-up sudah aktif.`,
                  sender_name: profile?.full_name || 'Admin',
                  target_divisions: targetDivs,
                  metadata: { type: 'marketing_lead' } // Gunakan type yang umum
                });
                alert('Sinyal tes terkirim ke divisi: ' + targetDivs.join(', '));
              } catch (err) {
                alert('Gagal mengirim sinyal tes');
              }
            }}
          >
            <Bell className="w-3 h-3" /> Kirim Sinyal Tes Pop-up
          </Button>
        </div>
        <form onSubmit={handleSaveRole} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-text-muted uppercase tracking-widest block mb-1.5">Nama Jabatan</label>
              <Input value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} required />
            </div>
            <div>
              <label className="text-xs font-black text-text-muted uppercase tracking-widest block mb-1.5">Divisi yang Diizinkan</label>
              <div className="flex flex-wrap gap-2 p-3 bg-white/30 rounded-xl border border-white/40">
                {ALL_DIVISIONS.map(d => (
                  <label key={d} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={roleForm.authorized_divisions.includes(d)}
                      onChange={(e) => {
                        const next = e.target.checked 
                          ? [...roleForm.authorized_divisions, d]
                          : roleForm.authorized_divisions.filter(x => x !== d);
                        setRoleForm({...roleForm, authorized_divisions: next});
                      }}
                      className="w-4 h-4 rounded border-white/40 text-accent-dark focus:ring-accent-dark/20"
                    />
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      roleForm.authorized_divisions.includes(d) ? "text-accent-dark" : "text-text-muted group-hover:text-text-secondary"
                    )}>
                      {d}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-[9px] text-text-muted mt-1 italic font-bold">*Tentukan divisi mana saja yang bisa diakses oleh jabatan ini.</p>
            </div>
          </div>

          <div className="bg-accent-dark/5 p-6 rounded-[2rem] border border-accent-dark/10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">Konfigurasi Notifikasi & Pop-Up</h4>
                <p className="text-[10px] text-text-secondary font-medium">Pilih jenis kejadian yang akan memunculkan pop-up real-time</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-text-muted uppercase">Aktifkan Semua</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={roleForm.receive_notifications}
                    onChange={(e) => {
                      const val = e.target.checked;
                      const allSettings: any = {};
                      NOTIFICATION_TYPES.forEach(t => allSettings[t.key] = val);
                      setRoleForm({ ...roleForm, receive_notifications: val, notification_settings: allSettings });
                    }}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-dark"></div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['marketing', 'teknik', 'keuangan'].map(div => (
                <div key={div} className="space-y-3">
                  <h5 className="text-[10px] font-black text-accent-dark uppercase tracking-[0.2em] border-b border-accent-dark/10 pb-1">{div}</h5>
                  <div className="space-y-2">
                    {NOTIFICATION_TYPES.filter(t => t.division === div).map(t => (
                      <label key={t.key} className="flex items-start gap-3 p-3 rounded-2xl bg-white/40 border border-white/60 hover:bg-white/60 transition-all cursor-pointer group">
                        <input 
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-accent-dark focus:ring-accent-dark/20"
                          checked={!!roleForm.notification_settings[t.key]}
                          onChange={(e) => {
                            setRoleForm({
                              ...roleForm,
                              notification_settings: { ...roleForm.notification_settings, [t.key]: e.target.checked }
                            });
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-xs font-black text-text-primary group-hover:text-accent-dark transition-colors">{t.label}</p>
                          <p className="text-[9px] text-text-secondary leading-tight mt-0.5">{t.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t border-white/40 pt-4">
            <h4 className="text-sm font-black text-text-primary mb-4">Konfigurasi Hak Akses Template</h4>
            <div className="max-h-[50vh] overflow-y-auto border border-white/40 rounded-xl overflow-hidden">
              <Table className="w-full text-left border-collapse">
                <THead>
                  <TR className="text-[10px] uppercase font-black tracking-widest border-b bg-slate-50/50">
                    <TH className="py-4 px-4 text-text-muted">Menu</TH>
                    <TH className="py-4 px-1 text-center w-[70px] bg-blue-50/50 text-blue-600 border-x border-white">View</TH>
                    <TH className="py-4 px-1 text-center w-[70px] bg-emerald-50/50 text-emerald-600 border-r border-white">Create</TH>
                    <TH className="py-4 px-1 text-center w-[70px] bg-amber-50/50 text-amber-600 border-r border-white">Edit</TH>
                    <TH className="py-4 px-1 text-center w-[70px] bg-rose-50/50 text-rose-600 border-r border-white">Delete</TH>
                    <TH className="py-4 px-1 text-center w-[70px] bg-sky-50/50 text-sky-600 border-r border-white">Print</TH>
                    <TH className="py-4 px-1 text-center w-[70px] bg-indigo-50/50 text-indigo-600 border-r border-white">Semua</TH>
                  </TR>
                </THead>
                <TBody>
                  {MENU_KEYS.map((menu, index) => {
                    const prevMenu = index > 0 ? MENU_KEYS[index - 1] : null;
                    const showCategory = menu.category && menu.category !== prevMenu?.category;
                    return (
                      <React.Fragment key={menu.key}>
                        {showCategory && (
                          <TR className="bg-slate-50/80">
                            <TD colSpan={7} className="py-2.5 px-4 border-y border-slate-100">
                              <p className="text-[9px] font-black text-accent-dark uppercase tracking-[0.2em]">{menu.category}</p>
                            </TD>
                          </TR>
                        )}
                        <TR className="hover:bg-white/20">
                          <TD className="py-3 px-4">
                            <p className="text-sm font-bold text-text-primary">{menu.label}</p>
                            <p className="text-[10px] text-text-muted uppercase">{menu.group}</p>
                          </TD>
                          {(['view', 'create', 'edit', 'delete', 'print', 'viewAll'] as const).map(cap => {
                            const isAvail = (menu.capabilities as any)[cap];
                            return (
                              <TD key={cap} className="py-3 px-1 text-center">
                                <PermissionToggle
                                  isAvail={isAvail}
                                  hasAccess={!!roleForm.permissions[menu.key]?.[cap]}
                                  onToggle={() => updateRolePermission(menu.key, cap, !roleForm.permissions[menu.key]?.[cap])}
                                  label={`${cap} ${menu.label}`}
                                />
                              </TD>
                            );
                          })}
                        </TR>
                      </React.Fragment>
                    );
                  })}
                </TBody>
              </Table>
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
        <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-white/40">
          <Table className="w-full text-left border-collapse">
            <THead>
              <TR className="text-[10px] uppercase font-black text-text-muted tracking-widest bg-white/40">
                <TH className="py-4 px-4 w-1/2">Modul</TH>
                <TH className="py-4 px-1 text-center w-[60px]">View</TH>
                <TH className="py-4 px-1 text-center w-[60px]">Input</TH>
                <TH className="py-4 px-1 text-center w-[60px]">Edit</TH>
                <TH className="py-4 px-1 text-center w-[60px]">Hapus</TH>
                <TH className="py-4 px-1 text-center w-[60px]">Cetak</TH>
                <TH className="py-4 px-1 text-center w-[60px]">Semua</TH>
              </TR>
            </THead>
            <TBody>
              {MENU_KEYS.map((menu, index) => {
                const prevMenu = index > 0 ? MENU_KEYS[index - 1] : null;
                const showCategory = menu.category && menu.category !== prevMenu?.category;
                return (
                  <React.Fragment key={menu.key}>
                    {showCategory && (
                      <TR className="bg-slate-50/80">
                        <TD colSpan={7} className="py-2.5 px-4 border-y border-slate-100">
                          <p className="text-[9px] font-black text-accent-dark uppercase tracking-[0.2em]">{menu.category}</p>
                        </TD>
                      </TR>
                    )}
                    <TR className="hover:bg-white/20">
                      <TD className="py-4 px-4">
                        <p className="text-sm font-bold text-text-primary">{menu.label}</p>
                        <p className="text-[10px] text-text-muted uppercase tracking-widest">{menu.group}</p>
                      </TD>
                      {(['view', 'create', 'edit', 'delete', 'print', 'viewAll'] as const).map(cap => {
                        const isAvail = (menu.capabilities as any)[cap];
                        return (
                          <TD key={cap} className="py-4 px-1 text-center">
                            <PermissionToggle
                              isAvail={isAvail}
                              hasAccess={!!selectedProfile?.permissions?.[menu.key]?.[cap]}
                              onToggle={() => handleUpdateUserPermissions(menu.key, cap, !selectedProfile?.permissions?.[menu.key]?.[cap])}
                              label={`${cap} ${menu.label}`}
                            />
                          </TD>
                        );
                      })}
                    </TR>
                  </React.Fragment>
                );
              })}
            </TBody>
          </Table>
        </div>
        <div className="mt-6 pt-6 border-t flex justify-end">
          <Button onClick={() => setIsPermissionsModalOpen(false)}>Selesai & Simpan</Button>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
