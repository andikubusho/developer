import React, { useState, useEffect, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, ArrowLeft, Edit, Trash2, Mail, Phone, FileText,
  UserCheck, X, Filter
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';

type RecruitStatus = 'applied' | 'screening' | 'interview' | 'offering' | 'hired' | 'rejected';

interface Recruitment {
  id: string;
  candidate_name: string;
  email: string | null;
  phone: string | null;
  position: string;
  applied_date: string;
  source: string | null;
  cv_url: string | null;
  status: RecruitStatus;
  interview_date: string | null;
  interview_notes: string | null;
  rejection_reason: string | null;
  employee_id: string | null;
  hired_date: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_META: Record<RecruitStatus, { label: string; badge: string }> = {
  applied:   { label: 'Applied',    badge: 'bg-blue-100 text-blue-700' },
  screening: { label: 'Screening',  badge: 'bg-cyan-100 text-cyan-700' },
  interview: { label: 'Interview',  badge: 'bg-amber-100 text-amber-700' },
  offering:  { label: 'Offering',   badge: 'bg-violet-100 text-violet-700' },
  hired:     { label: 'Hired',      badge: 'bg-emerald-100 text-emerald-700' },
  rejected:  { label: 'Rejected',   badge: 'bg-rose-100 text-rose-700' },
};

const ALL_STATUS: RecruitStatus[] = ['applied','screening','interview','offering','hired','rejected'];

const emptyForm = {
  candidate_name: '',
  position: '',
  email: '',
  phone: '',
  source: '',
  cv_url: '',
  applied_date: new Date().toISOString().split('T')[0],
  status: 'applied' as RecruitStatus,
  interview_date: '',
  interview_notes: '',
  rejection_reason: '',
  notes: '',
};

const RecruitmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<RecruitStatus | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Hire modal
  const [hireOpen, setHireOpen] = useState(false);
  const [hireTarget, setHireTarget] = useState<Recruitment | null>(null);
  const [hireForm, setHireForm] = useState({
    employee_id: '',
    division: 'Marketing',
    join_date: new Date().toISOString().split('T')[0],
    salary: 0,
  });
  const [hiring, setHiring] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.get('recruitment', 'select=*&order=applied_date.desc,created_at.desc');
      setItems(data || []);
    } catch (err) {
      console.error('Fetch recruitment failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return items.filter(it => {
      if (filterStatus !== 'all' && it.status !== filterStatus) return false;
      if (s) {
        const haystack = `${it.candidate_name} ${it.position} ${it.email || ''} ${it.phone || ''}`.toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [items, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach(i => { m[i.status] = (m[i.status] || 0) + 1; });
    return m;
  }, [items]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, applied_date: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  };

  const openEdit = (it: Recruitment) => {
    setEditingId(it.id);
    setForm({
      candidate_name: it.candidate_name,
      position: it.position,
      email: it.email || '',
      phone: it.phone || '',
      source: it.source || '',
      cv_url: it.cv_url || '',
      applied_date: it.applied_date,
      status: it.status,
      interview_date: it.interview_date || '',
      interview_notes: it.interview_notes || '',
      rejection_reason: it.rejection_reason || '',
      notes: it.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.candidate_name.trim()) { alert('Nama kandidat wajib diisi'); return; }
    if (!form.position.trim()) { alert('Posisi wajib diisi'); return; }

    setSubmitting(true);
    try {
      const payload: any = {
        candidate_name: form.candidate_name.trim(),
        position: form.position.trim(),
        email: form.email || null,
        phone: form.phone || null,
        source: form.source || null,
        cv_url: form.cv_url || null,
        applied_date: form.applied_date,
        status: form.status,
        interview_date: form.interview_date || null,
        interview_notes: form.interview_notes || null,
        rejection_reason: form.rejection_reason || null,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        await api.update('recruitment', editingId, payload);
      } else {
        await api.insert('recruitment', payload);
      }
      setModalOpen(false);
      await fetchItems();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (it: Recruitment) => {
    if (!confirm(`Hapus kandidat "${it.candidate_name}"?`)) return;
    try {
      await api.delete('recruitment', it.id);
      await fetchItems();
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  const openHire = (it: Recruitment) => {
    setHireTarget(it);
    setHireForm({
      employee_id: '',
      division: 'Marketing',
      join_date: new Date().toISOString().split('T')[0],
      salary: 0,
    });
    setHireOpen(true);
  };

  const handleHire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hireTarget) return;
    if (!hireForm.employee_id.trim()) { alert('Kode Karyawan wajib diisi'); return; }
    if (!hireForm.salary || hireForm.salary <= 0) { alert('Gaji wajib diisi'); return; }

    setHiring(true);
    try {
      // 1. Insert employee
      const empPayload = {
        employee_id: hireForm.employee_id.trim(),
        full_name: hireTarget.candidate_name,
        division: hireForm.division,
        position: hireTarget.position,
        join_date: hireForm.join_date,
        salary: hireForm.salary,
        email: hireTarget.email,
        phone: hireTarget.phone,
      };
      const empInserted = await api.insert('employees', empPayload);
      const empId = Array.isArray(empInserted) ? empInserted[0]?.id : empInserted?.id;

      // 2. Update recruitment status
      await api.update('recruitment', hireTarget.id, {
        status: 'hired',
        hired_date: hireForm.join_date,
        employee_id: empId || null,
      });

      setHireOpen(false);
      await fetchItems();
      alert(`${hireTarget.candidate_name} berhasil di-hire dan ditambahkan ke daftar karyawan.`);
    } catch (err: any) {
      alert(`Gagal hire kandidat: ${err.message}`);
    } finally {
      setHiring(false);
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
            <h1 className="text-2xl font-bold text-text-primary">Rekrutmen</h1>
            <p className="text-text-secondary">Manajemen Kandidat & Proses Seleksi</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Kandidat
        </Button>
      </div>

      {/* Stats Cards (clickable filter) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {ALL_STATUS.map(st => (
          <button
            key={st}
            onClick={() => setFilterStatus(prev => prev === st ? 'all' : st)}
            className={cn(
              "p-3 rounded-xl border-2 text-left transition-all",
              filterStatus === st ? "border-accent-dark bg-accent-dark/5 shadow-sm" : "border-white/40 bg-white/40 hover:bg-white/70"
            )}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">{STATUS_META[st].label}</p>
            <p className="text-xl font-bold text-text-primary mt-1">{stats[st] || 0}</p>
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Cari nama, posisi, email, atau telepon..."
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {filterStatus !== 'all' && (
            <Button variant="outline" size="sm" onClick={() => setFilterStatus('all')}>
              <X className="w-4 h-4 mr-1" /> Filter: {STATUS_META[filterStatus].label}
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table className="min-w-[900px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-6 py-3 font-semibold">Tgl Melamar</TH>
              <TH className="px-6 py-3 font-semibold">Nama Kandidat</TH>
              <TH className="px-6 py-3 font-semibold">Posisi</TH>
              <TH className="px-6 py-3 font-semibold">Kontak</TH>
              <TH className="px-6 py-3 font-semibold">Sumber</TH>
              <TH className="px-6 py-3 font-semibold">Status</TH>
              <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
              </TD></TR>
            ) : filtered.length === 0 ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center text-text-secondary">
                Belum ada kandidat. Klik "Tambah Kandidat" untuk mulai.
              </TD></TR>
            ) : (
              filtered.map(it => (
                <TR key={it.id} className={cn("hover:bg-white/30 transition-colors", it.status === 'rejected' && "opacity-60")}>
                  <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(it.applied_date)}</TD>
                  <TD className="px-6 py-4">
                    <span className="text-sm font-medium text-text-primary">{it.candidate_name}</span>
                    {it.status === 'hired' && it.employee_id && (
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mt-0.5">✓ Karyawan</div>
                    )}
                  </TD>
                  <TD className="px-6 py-4 text-sm text-text-secondary font-medium">{it.position}</TD>
                  <TD className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {it.email && <div className="flex items-center gap-1 text-xs text-text-secondary"><Mail className="w-3 h-3" /> {it.email}</div>}
                      {it.phone && <div className="flex items-center gap-1 text-xs text-text-secondary"><Phone className="w-3 h-3" /> {it.phone}</div>}
                    </div>
                  </TD>
                  <TD className="px-6 py-4 text-xs text-text-muted">{it.source || '-'}</TD>
                  <TD className="px-6 py-4">
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_META[it.status].badge)}>
                      {STATUS_META[it.status].label}
                    </span>
                  </TD>
                  <TD className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {it.cv_url && (
                        <a href={it.cv_url} target="_blank" rel="noreferrer" className="h-8 w-8 flex items-center justify-center rounded hover:bg-slate-100 text-blue-600" title="Lihat CV">
                          <FileText className="w-4 h-4" />
                        </a>
                      )}
                      {it.status !== 'hired' && it.status !== 'rejected' && (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-emerald-600" title="Hire kandidat" onClick={() => openHire(it)}>
                          <UserCheck className="w-4 h-4 mr-1" /> Hire
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(it)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(it)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      {/* Modal Tambah/Edit Kandidat */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Kandidat' : 'Tambah Kandidat Baru'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nama Lengkap" value={form.candidate_name} onChange={e => setForm({ ...form, candidate_name: e.target.value })} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Posisi yang Dilamar" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} required />
            <Input label="Sumber" placeholder="JobStreet / LinkedIn / Referral" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="No. Telepon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Tanggal Melamar" type="date" value={form.applied_date} onChange={e => setForm({ ...form, applied_date: e.target.value })} required />
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as RecruitStatus })}
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                {ALL_STATUS.filter(s => s !== 'hired').map(s => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
              <p className="text-[10px] text-text-muted mt-1">Status "Hired" hanya bisa lewat tombol Hire (auto-create karyawan).</p>
            </div>
          </div>
          <Input label="Link CV (URL)" placeholder="https://..." value={form.cv_url} onChange={e => setForm({ ...form, cv_url: e.target.value })} />

          {(form.status === 'interview' || form.status === 'offering') && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Detail Interview</p>
              <Input label="Tanggal Interview" type="date" value={form.interview_date} onChange={e => setForm({ ...form, interview_date: e.target.value })} />
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">Catatan Interview</label>
                <textarea value={form.interview_notes} onChange={e => setForm({ ...form, interview_notes: e.target.value })} rows={2}
                  className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-none resize-none" />
              </div>
            </div>
          )}

          {form.status === 'rejected' && (
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Alasan Penolakan</label>
              <textarea value={form.rejection_reason} onChange={e => setForm({ ...form, rejection_reason: e.target.value })} rows={2}
                className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Catatan Tambahan</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>{editingId ? 'Update' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Hire (auto-create employee) */}
      <Modal isOpen={hireOpen} onClose={() => setHireOpen(false)} title="Hire Kandidat" size="md">
        {hireTarget && (
          <form onSubmit={handleHire} className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs text-emerald-700 font-bold uppercase tracking-widest">Kandidat yang akan di-hire</p>
              <p className="text-base font-bold text-emerald-900 mt-1">{hireTarget.candidate_name}</p>
              <p className="text-xs text-emerald-700">{hireTarget.position}</p>
            </div>
            <Input label="Kode Karyawan" placeholder="EMP-001" value={hireForm.employee_id} onChange={e => setHireForm({ ...hireForm, employee_id: e.target.value })} required />
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Divisi</label>
              <select value={hireForm.division} onChange={e => setHireForm({ ...hireForm, division: e.target.value })}
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                <option value="Marketing">Marketing</option>
                <option value="Teknik">Teknik</option>
                <option value="Keuangan">Keuangan</option>
                <option value="Accounting">Accounting</option>
                <option value="HRD">HRD</option>
                <option value="Audit">Audit</option>
              </select>
            </div>
            <Input label="Tanggal Bergabung" type="date" value={hireForm.join_date} onChange={e => setHireForm({ ...hireForm, join_date: e.target.value })} required />
            <Input label="Gaji Pokok (Rp)" type="number" value={hireForm.salary} onChange={e => setHireForm({ ...hireForm, salary: Number(e.target.value) })} required />
            <p className="text-[10px] text-text-muted">Setelah Hire: kandidat otomatis ditambahkan ke daftar Karyawan, dan status Recruitment jadi "Hired".</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setHireOpen(false)}>Batal</Button>
              <Button type="submit" isLoading={hiring} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                <UserCheck className="w-4 h-4 mr-2" /> Konfirmasi Hire
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default RecruitmentPage;
