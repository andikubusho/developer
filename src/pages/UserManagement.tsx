import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, UserRole, Capabilities } from '../types';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Shield, User as UserIcon, Mail, Trash2, Save, UserCheck, UserPlus, Eye, Plus, Pencil, Printer, Check, X } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { MENU_KEYS } from '../../shared/schema';

const getDefaultPermissions = (role: UserRole): Record<string, any> => {
  const permissions: Record<string, any> = {};
  MENU_KEYS.forEach(menu => {
    if (role === 'admin' || role === 'owner') {
      permissions[menu.key] = { view: true, create: true, edit: true, delete: true, print: true };
    } else if (role === 'marketing') {
      // Marketing defaults
      const isMarketingModule = ['leads', 'follow-ups', 'deposits', 'sales', 'promos', 'price-list', 'site-plan', 'floor-plan', 'marketing-schedule', 'marketing-master'].includes(menu.key);
      permissions[menu.key] = { view: isMarketingModule, create: isMarketingModule, edit: isMarketingModule, delete: false, print: isMarketingModule };
    } else {
      // Generic default
      permissions[menu.key] = { view: false, create: false, edit: false, delete: false, print: false };
    }
  });
  return permissions;
};

const UserManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [addUserForm, setAddUserForm] = useState({
    full_name: '',
    email: '',
    role: 'marketing' as UserRole
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingId(profile.id);
    setEditForm(profile);
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          role: editForm.role
        })
        .eq('id', editingId);

      if (error) throw error;
      
      setProfiles(profiles.map(p => p.id === editingId ? { ...p, ...editForm } as Profile : p));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Gagal mengupdate profil');
    }
  };

  const handleAddUser = async () => {
    try {
      if (!addUserForm.full_name || !addUserForm.email) {
        alert('Nama dan Email wajib diisi');
        return;
      }

      // Check if email already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', addUserForm.email)
        .maybeSingle();

      if (existing) {
        alert('Email sudah digunakan');
        return;
      }

      const newId = crypto.randomUUID();
      const defaultPerms = getDefaultPermissions(addUserForm.role);

      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: newId,
            full_name: addUserForm.full_name,
            email: addUserForm.email,
            role: addUserForm.role,
            permissions: defaultPerms
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setProfiles([data, ...profiles]);
      setIsAddModalOpen(false);
      setAddUserForm({ full_name: '', email: '', role: 'marketing' });
      
      // Ask to set detail permissions
      if (confirm('User berhasil ditambahkan. Apakah Anda ingin mengatur Hak Akses Detail sekarang?')) {
        setSelectedProfile(data);
        setIsPermissionsModalOpen(true);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Gagal menambah user');
    }
  };

  const handleUpdatePermissions = async (menuKey: string, capability: keyof Capabilities, value: boolean) => {
    if (!selectedProfile) return;

    const updatedPermissions = {
      ...selectedProfile.permissions,
      [menuKey]: {
        ...(selectedProfile.permissions?.[menuKey] || { view: false, create: false, edit: false, delete: false, print: false }),
        [capability]: value
      }
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: updatedPermissions })
        .eq('id', selectedProfile.id);

      if (error) throw error;

      const updated = { ...selectedProfile, permissions: updatedPermissions };
      setSelectedProfile(updated);
      setProfiles(profiles.map(p => p.id === selectedProfile.id ? updated : p));
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('Gagal mengupdate hak akses');
    }
  };

  const roles: UserRole[] = ['admin', 'owner', 'marketing', 'teknik', 'keuangan', 'audit', 'hrd', 'accounting'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen User & Role</h1>
          <p className="text-slate-500">Kelola akses dan otoritas staf perusahaan</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Tambah User
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest border-b">
                <th className="px-6 py-4 font-black">User Info</th>
                <th className="px-6 py-4 font-black">Email</th>
                <th className="px-6 py-4 font-black">Role / Akses</th>
                <th className="px-6 py-4 font-black text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Memuat data staf...</td>
                </tr>
              ) : profiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {p.full_name?.charAt(0) || 'U'}
                      </div>
                      {editingId === p.id ? (
                        <Input 
                          value={editForm.full_name} 
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          className="h-9 text-sm"
                        />
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-slate-900">{p.full_name || 'Tanpa Nama'}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-tighter">ID: {p.id.substring(0, 8)}</p>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {(p as any).email || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === p.id ? (
                      <select 
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                        className="rounded-lg border-slate-200 text-sm focus:ring-primary focus:border-primary px-3 py-1.5"
                      >
                        {roles.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        p.role === 'admin' ? 'bg-indigo-50 text-primary' :
                        p.role === 'owner' ? 'bg-amber-50 text-amber-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {p.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === p.id ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-8">Batal</Button>
                        <Button size="sm" onClick={handleSave} className="h-8 gap-2">
                          <Save className="w-3.5 h-3.5" /> Simpan
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedProfile(p);
                            setIsPermissionsModalOpen(true);
                          }}
                          className="h-8 gap-2 text-primary hover:bg-primary/5"
                        >
                          <Shield className="w-3.5 h-3.5" /> Akses
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(p)}
                          className="h-8 gap-2 text-slate-400 hover:text-slate-600"
                        >
                          <UserCheck className="w-4 h-4" /> Edit Role
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Card>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah User Baru"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Nama Lengkap</label>
            <Input 
              placeholder="Masukkan nama lengkap" 
              value={addUserForm.full_name}
              onChange={(e) => setAddUserForm({ ...addUserForm, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Email Perusahaan</label>
            <Input 
              type="email"
              placeholder="user@perusahaan.com" 
              value={addUserForm.email}
              onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Role Utama</label>
            <select 
              value={addUserForm.role}
              onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value as UserRole })}
              className="w-full rounded-xl border-slate-200 text-sm focus:ring-primary focus:border-primary px-4 py-2.5"
            >
              {roles.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
            <Button className="flex-1" onClick={handleAddUser}>Simpan User</Button>
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        title={`Hak Akses Detail: ${selectedProfile?.full_name}`}
        size="xl"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-2 -mr-2">
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
                <th className="py-3 pr-4">Modul / Menu</th>
                <th className="py-3 px-2 text-center">View</th>
                <th className="py-3 px-2 text-center">Create</th>
                <th className="py-3 px-2 text-center">Edit</th>
                <th className="py-3 px-2 text-center">Delete</th>
                <th className="py-3 px-2 text-center">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {MENU_KEYS.map((menu) => (
                <tr key={menu.key} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="text-sm font-bold text-slate-900">{menu.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{menu.group}</p>
                  </td>
                  {(['view', 'create', 'edit', 'delete', 'print'] as const).map((cap) => (
                    <td key={cap} className="py-3 px-2 text-center">
                      <button
                        onClick={() => handleUpdatePermissions(menu.key, cap, !selectedProfile?.permissions?.[menu.key]?.[cap])}
                        className={cn(
                          "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center",
                          selectedProfile?.permissions?.[menu.key]?.[cap]
                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                            : "border-slate-200 text-transparent hover:border-primary/50"
                        )}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
        <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
          <Button onClick={() => setIsPermissionsModalOpen(false)}>Selesai</Button>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;

