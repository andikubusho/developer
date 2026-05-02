import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  User as UserIcon,
  Pencil, 
  Trash2, 
  RefreshCw,
  ArrowLeft,
  Building2,
  CreditCard
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface Supplier {
  id: number;
  name: string;
  address: string;
  phone: string;
  contact_person: string;
  bank_name: string;
  account_number: string;
  created_at: string;
}

const Suppliers: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    contact_person: '',
    bank_name: '',
    account_number: ''
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.get('suppliers', 'select=*&order=created_at.desc');
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingSupplier) {
        await api.update('suppliers', editingSupplier.id, form);
      } else {
        await api.insert('suppliers', form);
      }

      setIsModalOpen(false);
      setEditingSupplier(null);
      setForm({ name: '', address: '', phone: '', contact_person: '', bank_name: '', account_number: '' });
      fetchSuppliers();
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus supplier ini?')) return;
    try {
      setLoading(true);
      await api.delete('suppliers', id);
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Gagal menghapus supplier');
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_person.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Master Supplier</h1>
            <p className="text-text-secondary font-medium">Kelola daftar pemasok material konstruksi</p>
          </div>
        </div>
        <Button onClick={() => { setEditingSupplier(null); setForm({ name: '', address: '', phone: '', contact_person: '', bank_name: '', account_number: '' }); setIsModalOpen(true); }} className="rounded-xl h-12 px-8 shadow-premium">
          <Plus className="w-5 h-5 mr-2" /> Tambah Supplier
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-accent-lavender/20 flex items-center justify-center text-primary">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Total Supplier</p>
            <p className="text-2xl font-black text-text-primary tracking-tight">{suppliers.length} Mitra</p>
          </div>
        </Card>
        <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Aktif Bertransaksi</p>
            <p className="text-2xl font-black text-text-primary tracking-tight">{suppliers.length} Perusahaan</p>
          </div>
        </Card>
      </div>

      {/* Search & Table */}
      <Card className="p-0 border-none shadow-premium overflow-hidden bg-white">
        <div className="p-6 border-b border-white/20 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari nama supplier atau kontak..." 
              className="pl-12 h-12 glass-input border-none rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full">
            <THead>
              <TR isHoverable={false}>
                <TH>Nama Supplier</TH>
                <TH>Kontak Person</TH>
                <TH>Telepon</TH>
                <TH>Alamat</TH>
                <TH>Informasi Bank</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading && suppliers.length === 0 ? (
                <TR isHoverable={false}>
                  <TD colSpan={6} className="text-center py-20">
                    <RefreshCw className="w-8 h-8 text-accent-dark animate-spin mx-auto mb-4" />
                    <p className="text-text-muted font-bold uppercase text-[10px] tracking-widest">Memuat Data Supplier...</p>
                  </TD>
                </TR>
              ) : filteredSuppliers.length === 0 ? (
                <TR isHoverable={false}>
                  <TD colSpan={6} className="text-center py-20 text-text-muted">
                    Tidak ada data supplier ditemukan.
                  </TD>
                </TR>
              ) : filteredSuppliers.map((s) => (
                <TR key={s.id}>
                  <TD className="font-black text-text-primary">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent-lavender/10 flex items-center justify-center text-primary text-xs">
                        {s.name.substring(0, 2).toUpperCase()}
                      </div>
                      {s.name}
                    </div>
                  </TD>
                  <TD className="font-bold text-text-secondary">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-3 h-3 text-text-muted" />
                      {s.contact_person}
                    </div>
                  </TD>
                  <TD className="text-sm text-text-secondary font-medium">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-text-muted" />
                      {s.phone}
                    </div>
                  </TD>
                  <TD className="text-xs text-text-secondary max-w-[200px] truncate">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-text-muted" />
                      {s.address}
                    </div>
                  </TD>
                  <TD>
                    <div className="text-[10px] leading-tight">
                      <div className="font-black text-text-primary flex items-center gap-1">
                        <CreditCard className="w-2 h-2" /> {s.bank_name}
                      </div>
                      <div className="text-text-muted">{s.account_number}</div>
                    </div>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingSupplier(s); setForm({ name: s.name, address: s.address, phone: s.phone, contact_person: s.contact_person, bank_name: s.bank_name, account_number: s.account_number || '' }); setIsModalOpen(true); }} className="h-9 w-9 p-0 rounded-xl hover:bg-white/40">
                        <Pencil className="w-4 h-4 text-accent-dark" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="h-9 w-9 p-0 rounded-xl hover:bg-rose-50">
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingSupplier ? "Edit Supplier" : "Tambah Supplier Baru"}
        size="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Nama Perusahaan / Supplier</label>
              <Input 
                placeholder="Contoh: PT. Sumber Bangunan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-12 rounded-xl border-white/40 focus:border-primary shadow-glass"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Nama Kontak (PIC)</label>
              <Input 
                placeholder="Nama penanggung jawab"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="h-12 rounded-xl border-white/40 focus:border-primary shadow-glass"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">No. Telepon / WA</label>
              <Input 
                placeholder="0812..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-12 rounded-xl border-white/40 focus:border-primary shadow-glass"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Alamat Kantor</label>
              <Input 
                placeholder="Jl. Raya..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="h-12 rounded-xl border-white/40 focus:border-primary shadow-glass"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Nama Bank</label>
              <Input 
                placeholder="BCA / Mandiri / BNI"
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                className="h-12 rounded-xl border-white/40 focus:border-primary shadow-glass"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Nomor Rekening</label>
              <Input 
                placeholder="0001234567"
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                className="h-12 rounded-xl border-white/40 focus:border-primary shadow-glass"
              />
            </div>
          </div>
          
          <div className="pt-4 flex gap-4">
            <Button type="button" variant="ghost" className="flex-1 h-12 rounded-xl text-sm font-bold" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1 h-12 rounded-xl text-sm font-extrabold shadow-glass" isLoading={loading}>
              {editingSupplier ? "Simpan Perubahan" : "Tambahkan Supplier"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Suppliers;
