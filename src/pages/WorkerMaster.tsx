import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, ArrowLeft, Edit, Trash2, Phone, Building2, CreditCard, BadgeCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

const WorkerMaster: React.FC = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    type: 'Mandor',
    status: 'active'
  });

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const data = await api.get('worker_masters', 'select=*&order=name.asc');
      setWorkers(data || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (editingId) {
        await api.update('worker_masters', editingId, formData);
      } else {
        await api.insert('worker_masters', formData);
      }
      await fetchWorkers();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving worker:', error);
      alert('Gagal menyimpan data mandor/subkon. Pastikan tabel worker_masters sudah tersedia di database.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      phone: '',
      address: '',
      bank_name: '',
      bank_account_name: '',
      bank_account_number: '',
      type: 'Mandor',
      status: 'active'
    });
  };

  const filteredWorkers = workers.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto text-text-muted hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight italic uppercase">Master <span className="text-primary tracking-tighter not-italic">Penerima Upah</span></h1>
            <p className="text-text-secondary font-bold text-sm text-blue-600/80">Database Mandor & Subkontraktor untuk Pembayaran Upah</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto h-12 px-6 rounded-2xl shadow-premium" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Daftarkan Mandor/Subkon
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-white/40 shadow-premium bg-white/20 backdrop-blur-sm rounded-[2rem]">
        <div className="p-6 border-b border-white/40 bg-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              placeholder="Cari nama mandor atau tipe..." 
              className="w-full h-12 bg-white/80 border-none rounded-2xl pl-12 pr-5 text-sm font-bold shadow-3d-inset focus:ring-2 focus:ring-primary/20 transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <Table className="min-w-[1000px]">
          <THead>
            <TR className="bg-white/60 text-text-primary text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/40">
              <TH className="px-6 py-4">Nama & Kontak</TH>
              <TH className="px-6 py-4">Tipe</TH>
              <TH className="px-6 py-4">Informasi Rekening Bank</TH>
              <TH className="px-6 py-4">Status</TH>
              <TH className="px-6 py-4 text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={5} className="px-6 py-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary mx-auto"></div></TD></TR>
            ) : filteredWorkers.length === 0 ? (
              <TR><TD colSpan={5} className="px-6 py-20 text-center text-text-secondary font-bold">Belum ada data mandor yang terdaftar.</TD></TR>
            ) : (
              filteredWorkers.map((item) => (
                <TR key={item.id} className="hover:bg-white/40 transition-all border-b border-white/20">
                  <TD className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent-lavender/20 flex items-center justify-center text-primary font-black text-lg shadow-sm border border-white">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-text-primary leading-tight">{item.name}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Phone className="w-3 h-3 text-text-muted" />
                          <span className="text-xs font-bold text-text-muted">{item.phone || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </TD>
                  <TD className="px-6 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      item.type === 'Subkon' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {item.type}
                    </span>
                  </TD>
                  <TD className="px-6 py-5">
                    <div className="flex flex-col gap-1.5 p-3 bg-white/40 rounded-xl border border-white/60">
                      <div className="flex items-center gap-2 text-xs font-black text-text-primary">
                        <Building2 className="w-3.5 h-3.5 text-primary" /> {item.bank_name || '-'}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-text-secondary">
                        <CreditCard className="w-3.5 h-3.5 text-text-muted" /> {item.bank_account_number || '-'}
                      </div>
                      <div className="text-[9px] font-black uppercase text-text-muted ml-5">
                        a.n {item.bank_account_name || item.name}
                      </div>
                    </div>
                  </TD>
                  <TD className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black text-emerald-600 uppercase">Aktif</span>
                    </div>
                  </TD>
                  <TD className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-white/60" onClick={() => {
                        setEditingId(item.id);
                        setFormData({
                          name: item.name,
                          phone: item.phone || '',
                          address: item.address || '',
                          bank_name: item.bank_name || '',
                          bank_account_name: item.bank_account_name || '',
                          bank_account_number: item.bank_account_number || '',
                          type: item.type || 'Mandor',
                          status: item.status || 'active'
                        });
                        setIsModalOpen(true);
                      }}>
                        <Edit className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-rose-50 text-rose-500" onClick={async () => {
                        if (confirm('Hapus data mandor ini?')) {
                          await api.delete('worker_masters', item.id);
                          fetchWorkers();
                        }
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? "Edit Data Penerima Upah" : "Registrasi Mandor/Subkon Baru"} size="lg">
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-text-primary uppercase tracking-wider ml-1">Nama Lengkap / Nama Perusahaan</label>
              <Input placeholder="Nama Mandor atau PT Subkon" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-text-primary uppercase tracking-wider ml-1">Nomor WhatsApp / HP</label>
              <Input placeholder="0812..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-text-primary uppercase tracking-wider ml-1">Tipe Pekerja</label>
              <select className="w-full h-11 rounded-xl glass-input px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} required>
                <option value="Mandor">MANDOR</option>
                <option value="Subkon">SUBKONTRAKTOR</option>
                <option value="Harian">TUKANG HARIAN</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-text-primary uppercase tracking-wider ml-1">Alamat Domisili</label>
              <Input placeholder="Alamat lengkap" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
          </div>

          <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-black text-primary uppercase tracking-widest italic">
              <BadgeCheck className="w-5 h-5" /> Informasi Pembayaran (Finance)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Nama Bank</label>
                <Input placeholder="BCA, Mandiri, BRI, dll" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Nomor Rekening</label>
                <Input placeholder="Contoh: 1234567890" value={formData.bank_account_number} onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })} />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Nama Pemilik Rekening</label>
              <Input placeholder="Sesuai yang tertera di buku tabungan" value={formData.bank_account_name} onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" className="rounded-xl px-6" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button type="submit" className="rounded-xl px-8 shadow-premium" isLoading={loading}>{editingId ? "Update Data" : "Daftarkan Sekarang"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WorkerMaster;
