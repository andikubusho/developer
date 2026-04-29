import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, CheckCircle2, Clock, Printer, Eye, Edit, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const EMPTY_FORM = {
  project_id: '',
  unit_id: '',
  contractor_name: '',
  work_description: '',
  contract_value: 0,
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  status: 'active'
};

const inputCls = "w-full h-12 bg-white/50 border border-white/60 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all";
const labelCls = "text-[10px] font-black text-text-muted uppercase tracking-widest block ml-1";

const SPK: React.FC = () => {
  const navigate = useNavigate();
  const [spks, setSpks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSpk, setEditingSpk] = useState<any | null>(null);
  const [viewingSpk, setViewingSpk] = useState<any | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchSpks();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (formData.project_id) fetchUnits(formData.project_id);
    else setUnits([]);
  }, [formData.project_id]);

  const fetchUnits = async (projectId: string) => {
    const data = await api.get('units', `project_id=eq.${projectId}&order=unit_number.asc`);
    setUnits(data || []);
  };

  const fetchProjects = async () => {
    const data = await api.get('projects', 'select=id,name&order=name.asc');
    setProjects(data || []);
  };

  const fetchSpks = async () => {
    try {
      setLoading(true);
      const [spkData, projectsData, unitsData] = await Promise.all([
        api.get('spks', 'select=*&order=created_at.desc'),
        api.get('projects', 'select=id,name'),
        api.get('units', 'select=id,unit_number'),
      ]);
      const projectMap: Record<string, string> = {};
      (projectsData || []).forEach((p: any) => { projectMap[p.id] = p.name; });
      const unitMap: Record<string, string> = {};
      (unitsData || []).forEach((u: any) => { unitMap[u.id] = u.unit_number; });
      setSpks((spkData || []).map((s: any) => ({
        ...s,
        project: s.project_id ? { name: projectMap[s.project_id] || '-' } : null,
        unit: s.unit_id ? { unit_number: unitMap[s.unit_id] || '-' } : null,
      })));
    } catch (error) {
      console.error('Error fetching SPK:', error);
      setSpks([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingSpk(null);
    setFormData(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (spk: any) => {
    setEditingSpk(spk);
    setFormData({
      project_id: spk.project_id || '',
      unit_id: spk.unit_id || '',
      contractor_name: spk.contractor_name || '',
      work_description: spk.work_description || '',
      contract_value: spk.contract_value || 0,
      start_date: spk.start_date || new Date().toISOString().split('T')[0],
      end_date: spk.end_date || '',
      status: spk.status || 'active',
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.contractor_name) {
      alert('Mohon lengkapi Proyek dan Nama Penerima');
      return;
    }
    try {
      setSubmitting(true);
      if (editingSpk) {
        await api.update('spks', editingSpk.id, formData);
      } else {
        await api.insert('spks', { ...formData, id: crypto.randomUUID(), created_at: new Date().toISOString() });
      }
      setIsFormOpen(false);
      setEditingSpk(null);
      setFormData(EMPTY_FORM);
      fetchSpks();
    } catch (err) {
      console.error('Error saving SPK:', err);
      alert('Gagal menyimpan SPK');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (spk: any) => {
    if (!confirm(`Hapus SPK-${spk.id.substring(0, 8).toUpperCase()}? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await api.delete('spks', spk.id);
      setSpks(prev => prev.filter(s => s.id !== spk.id));
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  const handlePrint = (spk: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>SPK - ${spk.id.substring(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { font-size: 16px; color: #666; }
            .info-grid { display: grid; grid-template-columns: 160px 1fr; gap: 10px; margin-bottom: 30px; }
            .label { font-weight: bold; }
            .description { border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 30px; line-height: 1.6; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; }
            .sign-box { text-align: center; width: 200px; }
            .sign-line { border-bottom: 1px solid #333; margin-top: 60px; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">SURAT PERINTAH KERJA (SPK)</div>
            <div class="subtitle">Nomor: SPK/${spk.id.substring(0, 8).toUpperCase()}/${new Date(spk.created_at).getFullYear()}</div>
          </div>
          <div class="info-grid">
            <div class="label">Proyek:</div><div>${spk.project?.name || '-'}</div>
            <div class="label">Unit Property:</div><div>${spk.unit?.unit_number || 'Semua Unit / Proyek Umum'}</div>
            <div class="label">Penerima Kerja:</div><div>${spk.contractor_name}</div>
            <div class="label">Nilai Kontrak:</div><div>${formatCurrency(spk.contract_value)}</div>
            <div class="label">Tanggal Mulai:</div><div>${formatDate(spk.start_date)}</div>
            <div class="label">Target Selesai:</div><div>${spk.end_date ? formatDate(spk.end_date) : '-'}</div>
            <div class="label">Status:</div><div style="text-transform:capitalize">${spk.status}</div>
          </div>
          <div class="label">Deskripsi & Lingkup Pekerjaan:</div>
          <div class="description">${spk.work_description || 'Tidak ada deskripsi detail.'}</div>
          <div class="footer">
            <div class="sign-box"><div>Pihak Pertama,</div><div class="sign-line"></div><div>( Bag. Teknik / Proyek )</div></div>
            <div class="sign-box"><div>Pihak Kedua,</div><div class="sign-line"></div><div>( ${spk.contractor_name} )</div></div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <Button onClick={openCreate} className="rounded-xl h-11 px-6 shadow-premium">
          <Plus className="w-4 h-4 mr-2" /> Buat SPK Baru
        </Button>
      </div>

      {/* Table */}
      <Card className="p-0">
        <Table className="min-w-[900px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-6 py-3 font-semibold">No. SPK</TH>
              <TH className="px-6 py-3 font-semibold">Proyek / Unit</TH>
              <TH className="px-6 py-3 font-semibold">Penerima</TH>
              <TH className="px-6 py-3 font-semibold text-right">Nilai Kontrak</TH>
              <TH className="px-6 py-3 font-semibold text-center">Status</TH>
              <TH className="px-6 py-3 font-semibold">Tanggal</TH>
              <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center text-text-muted">Memuat data...</TD></TR>
            ) : spks.length === 0 ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center text-text-secondary">Belum ada data SPK.</TD></TR>
            ) : (
              spks.map((s) => (
                <TR key={s.id} className="hover:bg-white/30 transition-colors group">
                  <TD className="px-6 py-4 font-bold text-text-primary uppercase">SPK-{s.id.substring(0, 8)}</TD>
                  <TD className="px-6 py-4">
                    <div className="text-sm text-text-primary font-bold">{s.project?.name || 'Proyek Umum'}</div>
                    <div className="text-[10px] text-text-muted uppercase font-black tracking-widest">{s.unit?.unit_number ? `Unit: ${s.unit.unit_number}` : 'Global'}</div>
                  </TD>
                  <TD className="px-6 py-4 text-sm text-text-primary font-medium">{s.contractor_name || '-'}</TD>
                  <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">{formatCurrency(s.contract_value || 0)}</TD>
                  <TD className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      {s.status === 'completed'
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <Clock className="w-4 h-4 text-amber-500" />}
                      <span className={cn('text-xs font-medium capitalize', s.status === 'completed' ? 'text-emerald-700' : 'text-amber-700')}>{s.status}</span>
                    </div>
                  </TD>
                  <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(s.created_at)}</TD>
                  <TD className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-accent-dark hover:bg-accent-lavender/20"
                        onClick={() => setViewingSpk(s)} title="Lihat Detail">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
                        onClick={() => openEdit(s)} title="Edit SPK">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-text-muted hover:text-text-primary hover:bg-white/60"
                        onClick={() => handlePrint(s)} title="Print SPK">
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50"
                        onClick={() => handleDelete(s)} title="Hapus SPK">
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

      {/* View Modal */}
      {viewingSpk && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-accent-dark/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-0 overflow-hidden shadow-2xl border-none">
            <div className="p-5 border-b border-white/40 flex items-center justify-between bg-white/50">
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Detail SPK</p>
                <h2 className="text-lg font-black text-accent-dark">SPK-{viewingSpk.id.substring(0, 8).toUpperCase()}</h2>
              </div>
              <button onClick={() => setViewingSpk(null)} className="p-2 hover:bg-white/80 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 bg-white/30 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Proyek', value: viewingSpk.project?.name || '-' },
                  { label: 'Unit', value: viewingSpk.unit?.unit_number || 'Global' },
                  { label: 'Penerima / Kontraktor', value: viewingSpk.contractor_name || '-' },
                  { label: 'Nilai Kontrak', value: formatCurrency(viewingSpk.contract_value || 0) },
                  { label: 'Tanggal Mulai', value: formatDate(viewingSpk.start_date) || '-' },
                  { label: 'Target Selesai', value: viewingSpk.end_date ? formatDate(viewingSpk.end_date) : '-' },
                  { label: 'Status', value: viewingSpk.status },
                  { label: 'Dibuat', value: formatDate(viewingSpk.created_at) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/60 rounded-xl p-3">
                    <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">{label}</div>
                    <div className="font-bold text-text-primary capitalize">{value}</div>
                  </div>
                ))}
              </div>
              {viewingSpk.work_description && (
                <div className="bg-white/60 rounded-xl p-4">
                  <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Deskripsi Pekerjaan</div>
                  <p className="text-sm text-text-primary leading-relaxed">{viewingSpk.work_description}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setViewingSpk(null)}>Tutup</Button>
                <Button className="flex-1 rounded-xl" onClick={() => { setViewingSpk(null); openEdit(viewingSpk); }}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" className="rounded-xl px-4" onClick={() => handlePrint(viewingSpk)}>
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-accent-dark/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl p-0 overflow-hidden shadow-2xl border-none">
            <div className="p-6 border-b border-white/40 flex items-center justify-between bg-white/50">
              <h2 className="text-xl font-black text-accent-dark tracking-tight">
                {editingSpk ? `EDIT SPK-${editingSpk.id.substring(0, 8).toUpperCase()}` : 'BUAT SPK BARU'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/80 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6 bg-white/30 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={labelCls}>Pilih Proyek *</label>
                  <select className={inputCls} value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value, unit_id: '' })} required>
                    <option value="">-- Pilih Lokasi Proyek --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Pilih Unit (Opsional)</label>
                  <select className={inputCls} value={formData.unit_id}
                    onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                    disabled={!formData.project_id}>
                    <option value="">-- Pilih Unit Property --</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Nama Penerima (Kontraktor/Mandor) *</label>
                  <input type="text" className={inputCls}
                    placeholder="Contoh: Bpk. Slamet / PT. Bangun Jaya"
                    value={formData.contractor_name}
                    onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Status</label>
                  <select className={inputCls} value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="active">Aktif</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Selesai</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className={labelCls}>Deskripsi Pekerjaan</label>
                  <textarea className="w-full h-24 bg-white/50 border border-white/60 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all resize-none"
                    placeholder="Jelaskan detail lingkup pekerjaan..."
                    value={formData.work_description}
                    onChange={(e) => setFormData({ ...formData, work_description: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Nilai Kontrak (Rp)</label>
                  <input type="number" className={inputCls} placeholder="0"
                    value={formData.contract_value || ''}
                    onChange={(e) => setFormData({ ...formData, contract_value: Number(e.target.value) })} />
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Tanggal Mulai</label>
                  <input type="date" className={inputCls} value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Tanggal Selesai (Target)</label>
                  <input type="date" className={inputCls} value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px]"
                  onClick={() => setIsFormOpen(false)}>Batal</Button>
                <Button type="submit" className="flex-[2] h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-premium"
                  disabled={submitting}>
                  {submitting ? 'Menyimpan...' : editingSpk ? 'Simpan Perubahan' : 'Simpan SPK'}
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
