import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, UserRole } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Shield, User as UserIcon, Mail, Trash2, Save, UserCheck } from 'lucide-react';
import { formatDate } from '../lib/utils';

const UserManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});

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

  const roles: UserRole[] = ['admin', 'owner', 'marketing', 'teknik', 'keuangan', 'audit', 'hrd', 'accounting'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen User & Role</h1>
          <p className="text-slate-500">Kelola akses dan otoritas staf perusahaan</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left border-collapse">
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(p)}
                        className="h-8 gap-2 text-slate-400 hover:text-primary"
                      >
                        <UserCheck className="w-4 h-4" /> Edit Role
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;
