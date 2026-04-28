import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const SPK: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [spks, setSpks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    project_id: '',
    contractor_name: '',
    work_description: '',
    contract_value: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'active'
  });

  useEffect(() => {
    fetchSpks();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await api.get('projects', 'select=id,name&order=name.asc');
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchSpks = async () => {
    try {
      setLoading(true);
      const data = await api.get('spks', 'select=*,project:projects(name)&order=created_at.desc');
      setSpks(data || []);
    } catch (error) {
      console.error('Error fetching SPK:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.contractor_name || !formData.contract_value) {
      alert('Mohon lengkapi data wajib (Proyek, Penerima, Nilai Kontrak)');
      return;
    }

    try {
      setSubmitting(true);
      const newSpk = {
        ...formData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };
      
      await api.insert('spks', [newSpk]);
      alert('SPK berhasil dibuat!');
      setIsModalOpen(false);
      setFormData({
        project_id: '',
        contractor_name: '',
        work_description: '',
        contract_value: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        status: 'active'
      });
      fetchSpks();
    } catch (err) {
      console.error('Error saving SPK:', err);
      alert('Gagal membuat SPK');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">SPK Kontraktor</h1>
            <p className="text-text-secondary">Surat Perintah Kerja pelaksanaan proyek</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-xl h-11 px-6 shadow-premium">
          <Plus className="w-4 h-4 mr-2" /> Buat SPK Baru
        </Button>
      </div>

      <Card className="p-0">
        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">No. SPK</TH>
                <TH className="px-6 py-3 font-semibold">Proyek</TH>
                <TH className="px-6 py-3 font-semibold">Penerima</TH>
                <TH className="px-6 py-3 font-semibold text-right">Nilai Kontrak</TH>
                <TH className="px-6 py-3 font-semibold text-center">Status</TH>
                <TH className="px-6 py-3 font-semibold">Tanggal</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-muted">Memuat data...</TD></TR>
              ) : spks.length === 0 ? (
                <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-secondary">Belum ada data SPK.</TD></TR>
              ) : (
                spks.map((s) => (
                  <TR key={s.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 font-bold text-text-primary uppercase">SPK-{s.id.substring(0, 8)}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">{s.project?.name || 'Proyek Umum'}</TD>
                    <TD className="px-6 py-4 text-sm text-text-primary font-medium">{s.contractor_name || '-'}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">{formatCurrency(s.contract_value)}</TD>
                    <TD className="px-6 py-4">
                      <div className="flex justify-center items-center gap-1.5">
                        {s.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                        <span className={cn('text-xs font-medium capitalize', s.status === 'completed' ? 'text-emerald-700' : 'text-amber-700')}>{s.status}</span>
                      </div>
                    </TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(s.created_at)}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>

      {/* Create SPK Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-accent-dark/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl p-0 overflow-hidden shadow-2xl border-none">
            <div className="p-6 border-b border-white/40 flex items-center justify-between bg-white/50">
              <h2 className="text-xl font-black text-accent-dark tracking-tight">BUAT SPK BARU</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/80 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 bg-white/30 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-1">Pilih Proyek</label>
                  <select
                    className="w-full h-12 bg-white/50 border border-white/60 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    required
                  >
                    <option value="">-- Pilih Lokasi Proyek --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-1">Nama Penerima (Kontraktor/Mandor)</label>
                  <input
                    type="text"
                    className="w-full h-12 bg-white/50 border border-white/60 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
                    placeholder="Contoh: Bpk. Slamet / PT. Bangun Jaya"
                    value={formData.contractor_name}
                    onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-1">Deskripsi Pekerjaan</label>
                  <textarea
                    className="w-full h-24 bg-white/50 border border-white/60 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all resize-none"
                    placeholder="Jelaskan detail lingkup pekerjaan..."
                    value={formData.work_description}
                    onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-1">Nilai Kontrak (Rp)</label>
                  <input
                    type="number"
                    className="w-full h-12 bg-white/50 border border-white/60 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
                    placeholder="0"
                    value={formData.contract_value || ''}
                    onChange={(e) => setFormData({ ...formData, contract_value: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-1">Status</label>
                  <select
                    className="w-full h-12 bg-white/50 border border-white/60 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Aktif</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Selesai</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    className="w-full h-12 bg-white/50 border border-white/60 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-1">Tanggal Selesai (Target)</label>
                  <input
                    type="date"
                    className="w-full h-12 bg-white/50 border border-white/60 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px]"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-[2] h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-premium"
                  disabled={submitting}
                >
                  {submitting ? 'Menyimpan...' : 'Simpan SPK'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SPK;
