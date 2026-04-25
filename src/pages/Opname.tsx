import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ClipboardList, ArrowLeft, Edit, Trash2, CheckCircle2, Clock, Calculator, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { ProjectOpname, Project, SPK } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

const OpnamePage: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [opnames, setOpnames] = useState<ProjectOpname[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [spks, setSpks] = useState<SPK[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOpname, setSelectedOpname] = useState<ProjectOpname | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    project_id: '',
    spk_id: '',
    worker_name: '',
    work_description: '',
    previous_percentage: 0,
    current_percentage: 0,
    amount: 0,
    status: 'pending' as 'pending' | 'approved' | 'paid'
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedOpname) {
      setFormData({
        date: selectedOpname.date.split('T')[0],
        project_id: selectedOpname.project_id,
        spk_id: selectedOpname.spk_id || '',
        worker_name: selectedOpname.worker_name,
        work_description: selectedOpname.work_description,
        previous_percentage: selectedOpname.previous_percentage,
        current_percentage: selectedOpname.current_percentage,
        amount: selectedOpname.amount,
        status: selectedOpname.status
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        project_id: '',
        spk_id: '',
        worker_name: '',
        work_description: '',
        previous_percentage: 0,
        current_percentage: 0,
        amount: 0,
        status: 'pending'
      });
    }
  }, [selectedOpname, isModalOpen]);

  // Auto-calculate amount if SPK is selected
  useEffect(() => {
    if (formData.spk_id && !selectedOpname) {
      const spk = spks.find(s => s.id === formData.spk_id);
      if (spk) {
        const diff = formData.current_percentage - formData.previous_percentage;
        if (diff > 0) {
          const calculatedAmount = (diff / 100) * spk.total_value;
          setFormData(prev => ({ ...prev, amount: calculatedAmount }));
        }
      }
    }
  }, [formData.spk_id, formData.current_percentage, formData.previous_percentage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [opRes, projRes, spkRes] = await Promise.all([
        api.get('project_opnames', 'select=*,project:projects(name),spk:spk(*)&order=created_at.desc'),
        api.get('projects', 'select=id,name'),
        api.get('spks', 'select=*')
      ]);

      console.log('🔍 SPK DATA STRUCTURE:', spkRes?.[0]);
      setOpnames(opRes || []);
      setProjects(projRes || []);
      setSpks(spkRes || []);
    } catch (error) {
      console.error('Error fetching opname data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (selectedOpname) {
        await api.update('project_opnames', selectedOpname.id, formData);
      } else {
        await api.insert('project_opnames', formData);
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving opname:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data opname ini?')) return;
    try {
      setLoading(true);
      await api.delete('project_opnames', id);
      await fetchData();
    } catch (error: any) {
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const approveOpname = async (id: string) => {
    if (!confirm('Setujui opname ini untuk pembayaran upah?')) return;
    try {
      setLoading(true);
      await api.update('project_opnames', id, { status: 'approved' });
      await fetchData();
    } catch (error: any) {
      alert(`Gagal menyetujui: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredOpnames = opnames.filter(item => 
    item.worker_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.work_description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Opname Proyek & Upah</h1>
            <p className="text-text-secondary font-medium">Verifikasi progress lapangan untuk pembayaran upah kerja</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto shadow-glass shadow-glass" onClick={() => { setSelectedOpname(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Input Opname Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-accent-lavender to-accent-dark border-none">
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md"><Clock className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest">Pending Payment</p>
              <p className="text-2xl font-black">{formatCurrency(opnames.filter(o => o.status === 'approved').reduce((sum, o) => sum + o.amount, 0))}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-accent-lavender/20 border-accent-lavender/30">
          <div className="flex items-center gap-4 text-accent-dark">
            <div className="p-3 glass-card rounded-xl shadow-glass"><ClipboardList className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-accent-lavender uppercase tracking-widest">Total Opname</p>
              <p className="text-2xl font-black">{opnames.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-4 text-emerald-600">
            <div className="p-3 glass-card rounded-xl shadow-glass"><CheckCircle2 className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Telah Dibayar</p>
              <p className="text-2xl font-black">{formatCurrency(opnames.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.amount, 0))}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden border-white/40 shadow-premium">
        <div className="p-6 border-b border-white/40 flex flex-col sm:flex-row gap-4 bg-white/20">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari nama pekerja, kontraktor, atau deskripsi pekerjaan..." 
              className="pl-12 h-12 bg-white border-white/40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-12 px-6 border-white/40">
            <Filter className="w-4 h-4 mr-2" />
            Filter Lanjutan
          </Button>
        </div>

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30/80 text-text-secondary text-[10px] uppercase tracking-widest">
                <TH className="px-6 py-4 font-black">Tanggal</TH>
                <TH className="px-6 py-4 font-black">Pekerja / Kontraktor</TH>
                <TH className="px-6 py-4 font-black">Pekerjaan</TH>
                <TH className="px-6 py-4 font-black text-center">Progress</TH>
                <TH className="px-6 py-4 font-black">Upah (IDR)</TH>
                <TH className="px-6 py-4 font-black text-center">Status</TH>
                <TH className="px-6 py-4 font-black text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={7} className="px-6 py-12 text-center text-text-muted">Memuat data...</TD></TR>
              ) : filteredOpnames.length === 0 ? (
                <TR><TD colSpan={7} className="px-6 py-20 text-center text-text-muted font-medium">Belum ada data opname yang tercatat.</TD></TR>
              ) : (
                filteredOpnames.map((item) => (
                  <TR key={item.id} className="hover:bg-white/30/80 transition-all group">
                    <TD className="px-6 py-5 text-sm font-bold text-text-secondary">{formatDate(item.date)}</TD>
                    <TD className="px-6 py-5">
                      <p className="text-sm font-black text-text-primary uppercase tracking-tight">{item.worker_name}</p>
                      <p className="text-[10px] font-bold text-primary mt-0.5">{item.spk ? `SPK-${item.spk.id.substring(0, 8)}` : 'Tanpa SPK'}</p>
                    </TD>
                    <TD className="px-6 py-5">
                      <p className="text-sm text-text-primary font-medium max-w-xs">{item.work_description}</p>
                      <p className="text-[10px] text-text-muted font-bold mt-1 uppercase tracking-widest">{item.project?.name}</p>
                    </TD>
                    <TD className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/40 text-text-secondary">
                        <span className="text-[10px] font-black">{item.previous_percentage}%</span>
                        <ChevronRight className="w-3 h-3 text-text-muted" />
                        <span className="text-[10px] font-black text-primary">{item.current_percentage}%</span>
                      </div>
                      <p className="text-[10px] font-black text-text-muted mt-1 uppercase tracking-widest">Naik {item.current_percentage - item.previous_percentage}%</p>
                    </TD>
                    <TD className="px-6 py-5 text-sm font-black text-text-primary tracking-tight">{formatCurrency(item.amount)}</TD>
                    <TD className="px-6 py-5 text-center">
                      <span className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border", item.status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : item.status === 'approved' ? "bg-accent-lavender/20 text-accent-dark border-accent-lavender/30" : "bg-amber-50 text-amber-600 border-amber-100")}>{item.status}</span>
                    </TD>
                    <TD className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === 'pending' && (
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-accent-dark hover:bg-accent-lavender/20 rounded-xl" onClick={() => approveOpname(item.id)} title="Approve"><CheckCircle2 className="w-4 h-4" /></Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 hover:bg-white/40 rounded-xl" onClick={() => { setSelectedOpname(item); setIsModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-rose-500 hover:bg-rose-50 rounded-xl" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedOpname ? 'Edit Data Opname / Upah' : 'Input Opname Proyek Baru'} className="max-w-2xl">
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-2 gap-6">
            <Input label="Tanggal Opname" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
            <div>
              <label className="text-[11px] font-black text-text-muted uppercase tracking-widest mb-2 block">Pilih Proyek</label>
              <select className="w-full h-12 rounded-xl glass-input px-4 py-2 text-sm font-bold focus:outline-none focus:border-transparent transition-all" value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })} required>
                <option value="">-- Pilih Proyek --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[11px] font-black text-text-muted uppercase tracking-widest mb-2 block">Referensi SPK (Opsional)</label>
              <select className="w-full h-12 rounded-xl glass-input px-4 py-2 text-sm font-bold focus:outline-none focus:border-transparent transition-all" value={formData.spk_id} onChange={(e) => setFormData({ ...formData, spk_id: e.target.value, worker_name: spks.find(s => s.id === e.target.value)?.contractor_name || formData.worker_name })}>
                <option value="">-- Tanpa SPK --</option>
                {spks.filter(s => s.project_id === formData.project_id || !formData.project_id).map(s => <option key={s.id} value={s.id}>SPK-{s.id.substring(0, 8)} - {s.contractor_name}</option>)}
              </select>
            </div>
            <Input label="Nama Pekerja / Kontraktor" placeholder="Masukkan nama..." value={formData.worker_name} onChange={(e) => setFormData({ ...formData, worker_name: e.target.value })} required />
          </div>
          <div>
            <label className="text-[11px] font-black text-text-muted uppercase tracking-widest mb-2 block">Deskripsi Pekerjaan</label>
            <textarea className="w-full rounded-xl border border-white/40 px-4 py-3 text-sm font-medium focus:outline-none focus:border-transparent transition-all" rows={3} placeholder="Contoh: Pasang keramik lantai 1, Pengecatan eksterior..." value={formData.work_description} onChange={(e) => setFormData({ ...formData, work_description: e.target.value })} required />
          </div>
          <div className="p-6 bg-white/30 rounded-xl border border-white/40">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Calculator className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Kalkulasi Prosentase & Upah</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Input label="Progress Sebelumnya (%)" type="number" value={formData.previous_percentage} onChange={(e) => setFormData({ ...formData, previous_percentage: parseInt(e.target.value) || 0 })} required />
              <Input label="Progress Saat Ini (%)" type="number" value={formData.current_percentage} onChange={(e) => setFormData({ ...formData, current_percentage: parseInt(e.target.value) || 0 })} required />
            </div>
            <div className="mt-6 pt-6 border-t border-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Estimasi Upah</p>
                <div className="flex items-center gap-2 mt-1"><span className="text-2xl font-black text-text-primary">{formatCurrency(formData.amount)}</span></div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Status Opname</p>
                <select className="mt-1 bg-transparent text-sm font-black text-primary focus:outline-none cursor-pointer uppercase tracking-tighter" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}>
                  <option value="pending">PENDING</option>
                  <option value="approved">APPROVED</option>
                  <option value="paid">PAID</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="h-12 px-6 rounded-xl border-white/40">Batal</Button>
            <Button type="submit" isLoading={loading} className="h-12 px-8 rounded-xl shadow-glass shadow-glass">{selectedOpname ? 'Simpan Perubahan' : 'Simpan Data Opname'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OpnamePage;
