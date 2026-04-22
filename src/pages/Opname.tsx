import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ClipboardList, ArrowLeft, Edit, Trash2, CheckCircle2, Clock, Calculator } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { ProjectOpname, Project, SPK, Unit } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getMockData, saveMockData } from '../lib/storage';

const OpnamePage: React.FC = () => {
  const { isMockMode, setDivision } = useAuth();
  const [opnames, setOpnames] = useState<ProjectOpname[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [spks, setSpks] = useState<SPK[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOpname, setSelectedOpname] = useState<ProjectOpname | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    project_id: '',
    unit_id: '',
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
        unit_id: selectedOpname.unit_id || '',
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
        unit_id: '',
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
    setLoading(true);
    if (isMockMode) {
      const defaultProjects: Project[] = [
        { id: '1', name: 'Golden Canyon', location: 'Bogor', description: '', total_units: 50, status: 'ongoing', created_at: '' },
        { id: '2', name: 'DV Village', location: 'Depok', description: '', total_units: 30, status: 'ongoing', created_at: '' }
      ];
      const defaultSpks: SPK[] = [
        { id: '1', spk_number: 'SPK/2026/001', project_id: '1', contractor_name: 'CV Jati Makmur', work_description: 'Pekerjaan Struktur A-01', total_value: 150000000, start_date: '', end_date: '', status: 'active', created_at: '' },
        { id: '2', spk_number: 'SPK/2026/002', project_id: '1', contractor_name: 'Bpk. Sumarno', work_description: 'Pekerjaan Dinding B-05', total_value: 45000000, start_date: '', end_date: '', status: 'active', created_at: '' }
      ];
      const defaultOpnames: ProjectOpname[] = [
        {
          id: '1',
          date: new Date().toISOString(),
          project_id: '1',
          spk_id: '1',
          worker_name: 'CV Jati Makmur',
          work_description: 'Pengecoran Kolam Renang Tahap 1',
          previous_percentage: 0,
          current_percentage: 25,
          amount: 37500000,
          status: 'approved',
          spk: defaultSpks[0],
          project: defaultProjects[0]
        },
        {
          id: '2',
          date: new Date().toISOString(),
          project_id: '1',
          spk_id: '2',
          worker_name: 'Bpk. Sumarno',
          work_description: 'Pasang Bata Merah Lt 1',
          previous_percentage: 10,
          current_percentage: 40,
          amount: 13500000,
          status: 'pending',
          spk: defaultSpks[1],
          project: defaultProjects[0]
        }
      ];
      setProjects(defaultProjects);
      setSpks(defaultSpks);
      setOpnames(getMockData<ProjectOpname>('project_opnames', defaultOpnames));
      setLoading(false);
      return;
    }

    try {
      const [opRes, projRes, spkRes] = await Promise.all([
        supabase.from('project_opnames').select('*, project:projects(*), spk:spk(*)').order('date', { ascending: false }),
        supabase.from('projects').select('*'),
        supabase.from('spk').select('*')
      ]);

      setOpnames(opRes.data || []);
      setProjects(projRes.data || []);
      setSpks(spkRes.data || []);
    } catch (error) {
      console.error('Error fetching opname data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (isMockMode) {
      let updatedOpnames: ProjectOpname[];
      const selectedProject = projects.find(p => p.id === formData.project_id);
      const selectedSpk = spks.find(s => s.id === formData.spk_id);

      if (selectedOpname) {
        updatedOpnames = opnames.map(item => item.id === selectedOpname.id ? { 
          ...item, 
          ...formData,
          project: selectedProject,
          spk: selectedSpk
        } : item);
      } else {
        const newItem: ProjectOpname = {
          id: Math.random().toString(36).substr(2, 9),
          ...formData,
          project: selectedProject,
          spk: selectedSpk
        };
        updatedOpnames = [newItem, ...opnames];
      }
      setOpnames(updatedOpnames);
      saveMockData('project_opnames', updatedOpnames);
    } else {
      try {
        if (selectedOpname) {
          const { error } = await supabase.from('project_opnames').update(formData).eq('id', selectedOpname.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('project_opnames').insert([formData]);
          if (error) throw error;
        }
        fetchData();
      } catch (error) {
        console.error('Error saving opname:', error);
      }
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data opname ini?')) return;
    if (isMockMode) {
      const updatedOpnames = opnames.filter(item => item.id !== id);
      setOpnames(updatedOpnames);
      saveMockData('project_opnames', updatedOpnames);
    } else {
      await supabase.from('project_opnames').delete().eq('id', id);
      fetchData();
    }
  };

  const approveOpname = async (id: string) => {
    if (!confirm('Setujui opname ini untuk pembayaran upah?')) return;
    if (isMockMode) {
      const updated = opnames.map(o => o.id === id ? { ...o, status: 'approved' as const } : o);
      setOpnames(updated);
      saveMockData('project_opnames', updated);
    } else {
      await supabase.from('project_opnames').update({ status: 'approved' }).eq('id', id);
      fetchData();
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
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Opname Proyek & Upah</h1>
            <p className="text-slate-500 font-medium">Verifikasi progress lapangan untuk pembayaran upah kerja</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto shadow-lg shadow-indigo-200" onClick={() => { setSelectedOpname(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Input Opname Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 border-none">
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Pending Payment</p>
              <p className="text-2xl font-black">{formatCurrency(opnames.filter(o => o.status === 'approved').reduce((sum, o) => sum + o.amount, 0))}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-indigo-50 border-indigo-100">
          <div className="flex items-center gap-4 text-indigo-600">
            <div className="p-3 bg-white rounded-2xl shadow-sm">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Total Opname</p>
              <p className="text-2xl font-black">{opnames.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-4 text-emerald-600">
            <div className="p-3 bg-white rounded-2xl shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Telah Dibayar</p>
              <p className="text-2xl font-black">{formatCurrency(opnames.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.amount, 0))}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden border-slate-100 shadow-premium">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari nama pekerja, kontraktor, atau deskripsi pekerjaan..." 
              className="pl-12 h-12 bg-white border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-12 px-6 border-slate-200">
            <Filter className="w-4 h-4 mr-2" />
            Filter Lanjutan
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-widest">
                <th className="px-6 py-4 font-black">Tanggal</th>
                <th className="px-6 py-4 font-black">Pekerja / Kontraktor</th>
                <th className="px-6 py-4 font-black">Pekerjaan</th>
                <th className="px-6 py-4 font-black text-center">Progress</th>
                <th className="px-6 py-4 font-black">Upah (IDR)</th>
                <th className="px-6 py-4 font-black text-center">Status</th>
                <th className="px-6 py-4 font-black text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              ) : filteredOpnames.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-medium">
                    Belum ada data opname yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredOpnames.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-6 py-5 text-sm font-bold text-slate-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.worker_name}</p>
                      <p className="text-[10px] font-bold text-primary mt-0.5">{item.spk?.spk_number || 'Tanpa SPK'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-slate-700 font-medium max-w-xs">{item.work_description}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{item.project?.name}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">
                        <span className="text-[10px] font-black">{item.previous_percentage}%</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-black text-primary">{item.current_percentage}%</span>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Naik {item.current_percentage - item.previous_percentage}%</p>
                    </td>
                    <td className="px-6 py-5 text-sm font-black text-slate-900 tracking-tight">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                        item.status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        item.status === 'approved' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                        "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === 'pending' && (
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-indigo-600 hover:bg-indigo-50 rounded-xl" onClick={() => approveOpname(item.id)} title="Approve">
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 hover:bg-slate-100 rounded-xl" onClick={() => { setSelectedOpname(item); setIsModalOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-rose-500 hover:bg-rose-50 rounded-xl" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedOpname ? 'Edit Data Opname / Upah' : 'Input Opname Proyek Baru'}
        className="max-w-2xl"
      >
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-2 gap-6">
            <Input 
              label="Tanggal Opname" 
              type="date" 
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Pilih Proyek</label>
              <select 
                className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                required
              >
                <option value="">-- Pilih Proyek --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Referensi SPK (Opsional)</label>
              <select 
                className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                value={formData.spk_id}
                onChange={(e) => setFormData({ ...formData, spk_id: e.target.value, worker_name: spks.find(s => s.id === e.target.value)?.contractor_name || formData.worker_name })}
              >
                <option value="">-- Tanpa SPK --</option>
                {spks.filter(s => s.project_id === formData.project_id || !formData.project_id).map(s => (
                  <option key={s.id} value={s.id}>{s.spk_number} - {s.contractor_name}</option>
                ))}
              </select>
            </div>
            <Input 
              label="Nama Pekerja / Kontraktor" 
              placeholder="Masukkan nama..." 
              value={formData.worker_name}
              onChange={(e) => setFormData({ ...formData, worker_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Deskripsi Pekerjaan</label>
            <textarea 
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              rows={3}
              placeholder="Contoh: Pasang keramik lantai 1, Pengecatan eksterior..."
              value={formData.work_description}
              onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
              required
            />
          </div>

          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Calculator className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Kalkulasi Prosentase & Upah</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Input 
                label="Progress Sebelumnya (%)" 
                type="number" 
                value={formData.previous_percentage}
                onChange={(e) => setFormData({ ...formData, previous_percentage: parseInt(e.target.value) || 0 })}
                required
              />
              <Input 
                label="Progress Saat Ini (%)" 
                type="number" 
                value={formData.current_percentage}
                onChange={(e) => setFormData({ ...formData, current_percentage: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimasi Upah</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900">{formatCurrency(formData.amount)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Opname</p>
                <select 
                  className="mt-1 bg-transparent text-sm font-black text-primary focus:outline-none cursor-pointer uppercase tracking-tighter"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="pending">PENDING</option>
                  <option value="approved">APPROVED</option>
                  <option value="paid">PAID</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="h-12 px-6 rounded-2xl border-slate-200">Batal</Button>
            <Button type="submit" className="h-12 px-8 rounded-2xl shadow-lg shadow-indigo-200">
              {selectedOpname ? 'Simpan Perubahan' : 'Simpan Data Opname'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OpnamePage;
