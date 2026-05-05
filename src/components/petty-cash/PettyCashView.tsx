import React, { useState, useEffect, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../ui/Table';
import {
  Plus, Search, Filter, Wallet, Edit, Trash2, Download,
  ArrowLeftRight, ArrowDown, Landmark, HardHat
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { executeTransfer, deleteTransferGroup, AccountRef } from '../../lib/transfer';

export interface PettyCashItem {
  id: string;
  date: string;
  description: string;
  type: 'in' | 'out';
  amount: number;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  transfer_group_id?: string | null;
  source_type?: 'manual' | 'bank' | 'cash_besar' | 'petty_cash' | null;
  source_id?: string | null;
  division?: 'keuangan' | 'teknik' | null;
  project_id?: string | null;
}

interface ProjectOption { id: string; name: string }

export interface PettyCashViewProps {
  division: 'keuangan' | 'teknik';
  projectId?: string;            // wajib jika division='teknik'
  projectName?: string;          // dipakai untuk label
  accentColor?: 'teal' | 'amber';
  title?: string;
  subtitle?: string;
}

// Identitas dompet untuk transfer (mirror logic di transfer.ts)
const selfAccountRef = (
  division: 'keuangan' | 'teknik',
  projectId: string | undefined,
  projectName?: string
): AccountRef => {
  if (division === 'keuangan') return { kind: 'petty_cash', division: 'keuangan', label: 'Petty Cash Keuangan' };
  return {
    kind: 'petty_cash',
    division: 'teknik',
    projectId: projectId!,
    label: `Petty Cash Teknik - ${projectName || 'Proyek'}`,
  };
};

export const PettyCashView: React.FC<PettyCashViewProps> = ({
  division,
  projectId,
  projectName,
  accentColor = 'teal',
  title,
  subtitle,
}) => {
  const [items, setItems] = useState<PettyCashItem[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);  // untuk opsi PC Teknik di transfer
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Pengeluaran/Pemasukan manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    requested_by: '',
    description: '',
    amount: 0,
    type: 'out' as 'in' | 'out',
  });

  // Modal Transfer
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferForm, setTransferForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    direction: 'in' as 'in' | 'out',
    counterKey: '',                    // 'cash' | bankId | 'petty_keu' | 'petty_tek:<projectId>'
    jumlah: '',
    keterangan: '',
  });

  // Reset & re-fetch saat dompet berganti (project_id berubah utk teknik)
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division, projectId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchItems(), fetchBanks(), fetchProjects()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      // Filter berdasarkan dompet aktif: division + project_id
      const projFilter = division === 'teknik'
        ? `&project_id=eq.${projectId}`
        : '&project_id=is.null';
      const data = await api.get(
        'petty_cash',
        `select=*&division=eq.${division}${projFilter}&order=date.desc`
      );
      setItems(data || []);
    } catch (err) {
      console.error('Fetch Petty Cash Failed:', err);
    }
  };

  const fetchBanks = async () => {
    try {
      const data = await api.get('bank_accounts', 'select=id,bank_name,account_number&order=bank_name.asc');
      setBanks(data || []);
    } catch (err) {
      console.error('Fetch Banks Failed:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await api.get('projects', 'select=id,name&order=name.asc');
      setProjects(data || []);
    } catch (err) {
      console.error('Fetch Projects Failed:', err);
    }
  };

  // ----- Save manual entry -----
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (division === 'teknik' && !projectId) { alert('Pilih proyek terlebih dahulu'); return; }
    try {
      setLoading(true);
      await api.insert('petty_cash', {
        ...formData,
        status: 'approved',     // langsung approved (no approval flow)
        source_type: 'manual',
        division,
        project_id: division === 'teknik' ? projectId : null,
      });
      await fetchItems();
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        requested_by: '',
        description: '',
        amount: 0,
        type: 'out',
      });
    } catch (error: any) {
      console.error('Error saving petty cash:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ----- Delete (handle transfer pair) -----
  const handleDelete = async (item: PettyCashItem) => {
    if (item.transfer_group_id) {
      if (!confirm('Transaksi ini adalah transfer antar akun. Hapus akan menghilangkan kedua sisi. Lanjutkan?')) return;
      try {
        setLoading(true);
        await deleteTransferGroup(item.transfer_group_id);
        await fetchItems();
      } catch (err: any) {
        alert(`Gagal menghapus transfer: ${err.message}`);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!confirm('Hapus data kas kecil ini?')) return;
    try {
      setLoading(true);
      await api.delete('petty_cash', item.id);
      await fetchItems();
    } catch (error: any) {
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ----- Transfer counter-account dropdown ke AccountRef -----
  const counterToAccountRef = (key: string): AccountRef | null => {
    if (!key) return null;
    if (key === 'cash') return { kind: 'cash_besar', label: 'Kas Besar (Tunai)' };
    if (key === 'petty_keu') return { kind: 'petty_cash', division: 'keuangan', label: 'Petty Cash Keuangan' };
    if (key.startsWith('petty_tek:')) {
      const pid = key.split(':')[1];
      const p = projects.find(x => x.id === pid);
      return { kind: 'petty_cash', division: 'teknik', projectId: pid, label: `Petty Cash Teknik - ${p?.name || pid}` };
    }
    const bank = banks.find((b: any) => b.id === key);
    if (!bank) return null;
    return { kind: 'bank', id: bank.id, label: `${bank.bank_name} - ${bank.account_number}` };
  };

  const selfRef = selfAccountRef(division, projectId, projectName);
  const selfKey = division === 'keuangan' ? 'petty_keu' : `petty_tek:${projectId || ''}`;

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (division === 'teknik' && !projectId) { alert('Pilih proyek terlebih dahulu'); return; }
    const counter = counterToAccountRef(transferForm.counterKey);
    if (!counter) { alert('Pilih akun lawan transfer'); return; }
    const jumlah = Number(transferForm.jumlah.replace(/\D/g, ''));
    if (!jumlah || jumlah <= 0) { alert('Jumlah harus lebih dari 0'); return; }

    setTransferring(true);
    try {
      await executeTransfer({
        date: transferForm.tanggal,
        amount: jumlah,
        description: transferForm.keterangan || undefined,
        from: transferForm.direction === 'in' ? counter : selfRef,
        to:   transferForm.direction === 'in' ? selfRef : counter,
        requestedBy: 'Transfer',
      });
      setTransferOpen(false);
      setTransferForm({
        tanggal: new Date().toISOString().split('T')[0],
        direction: 'in',
        counterKey: '',
        jumlah: '',
        keterangan: '',
      });
      await fetchItems();
    } catch (err: any) {
      alert(`Gagal transfer: ${err.message}`);
    } finally {
      setTransferring(false);
    }
  };

  // Saldo: sum approved (in - out)
  const currentBalance = useMemo(
    () => items
      .filter(i => i.status === 'approved')
      .reduce((sum, i) => i.type === 'in' ? sum + i.amount : sum - i.amount, 0),
    [items]
  );

  const filteredPetty = items.filter(item =>
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.requested_by || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ambil opsi counter-account, exclude self
  const counterOptions = useMemo(() => {
    const opts: { value: string; label: string; group?: string }[] = [];
    opts.push({ value: 'cash', label: 'Kas Besar (Tunai)', group: 'Tunai' });
    banks.forEach(b => opts.push({ value: b.id, label: `${b.bank_name} - ${b.account_number}`, group: 'Bank' }));
    if (selfKey !== 'petty_keu') {
      opts.push({ value: 'petty_keu', label: 'Petty Cash Keuangan', group: 'Petty Cash' });
    }
    projects.forEach(p => {
      const k = `petty_tek:${p.id}`;
      if (k !== selfKey) {
        opts.push({ value: k, label: `Petty Cash Teknik - ${p.name}`, group: 'Petty Cash' });
      }
    });
    return opts;
  }, [banks, projects, selfKey]);

  // Visual tone
  const balanceCardBg = accentColor === 'amber' ? 'bg-amber-600' : 'bg-accent-dark';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {accentColor === 'amber' ? <HardHat className="w-6 h-6 text-amber-600" /> : <Wallet className="w-6 h-6 text-text-secondary" />}
            <h1 className="text-2xl font-bold text-text-primary">{title || 'Petty Cash'}</h1>
          </div>
          <p className="text-text-secondary">{subtitle || 'Manajemen Kas Kecil Operasional'}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Laporan
          </Button>
          <Button
            onClick={() => { setTransferForm(p => ({ ...p, direction: 'in' })); setTransferOpen(true); }}
            className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center gap-2 shadow-none border-0"
          >
            <ArrowLeftRight className="w-4 h-4" /> Top Up / Setor
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Input Pengeluaran
          </Button>
        </div>
      </div>

      {/* Saldo Card */}
      <Card className={cn("p-6 text-white", balanceCardBg)}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Saldo Kas Kecil Saat Ini</p>
            <h3 className="text-3xl font-bold">{formatCurrency(currentBalance)}</h3>
          </div>
        </div>
      </Card>

      {/* Tabel */}
      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Cari deskripsi atau pemohon..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
        </div>

        <Table className="min-w-[800px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-6 py-3 font-semibold">Tanggal</TH>
              <TH className="px-6 py-3 font-semibold">Pemohon</TH>
              <TH className="px-6 py-3 font-semibold">Deskripsi</TH>
              <TH className="px-6 py-3 font-semibold text-right">Jumlah</TH>
              <TH className="px-6 py-3 font-semibold">Tipe</TH>
              <TH className="px-6 py-3 font-semibold">Status</TH>
              <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR>
                <TD colSpan={7} className="px-6 py-10 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
                </TD>
              </TR>
            ) : filteredPetty.length === 0 ? (
              <TR>
                <TD colSpan={7} className="px-6 py-10 text-center text-text-secondary">
                  Tidak ada data kas kecil.
                </TD>
              </TR>
            ) : (
              filteredPetty.map((item) => {
                const isTransfer = !!item.transfer_group_id;
                let sourceLabel = '';
                if (isTransfer) {
                  if (item.source_type === 'cash_besar') sourceLabel = 'Kas Besar';
                  else if (item.source_type === 'bank') {
                    const b = banks.find((x: any) => x.id === item.source_id);
                    sourceLabel = b ? `${b.bank_name} ${b.account_number}` : 'Bank';
                  } else if (item.source_type === 'petty_cash') {
                    sourceLabel = 'Petty Cash lain';
                  }
                }
                return (
                  <TR key={item.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(item.date)}</TD>
                    <TD className="px-6 py-4 text-sm font-medium text-text-primary">
                      {isTransfer
                        ? <span className="text-[10px] font-black uppercase tracking-widest text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">Transfer</span>
                        : item.requested_by}
                    </TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">
                      {isTransfer && (
                        <div className="flex items-center gap-1.5 text-violet-700 font-bold text-xs mb-0.5">
                          <ArrowLeftRight className="w-3 h-3" />
                          {item.type === 'in' ? `Top-up dari ${sourceLabel}` : `Setor ke ${sourceLabel}`}
                        </div>
                      )}
                      <div>{item.description}</div>
                    </TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">{formatCurrency(item.amount)}</TD>
                    <TD className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        item.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {item.type === 'in' ? 'Masuk' : 'Keluar'}
                      </span>
                    </TD>
                    <TD className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        item.status === 'approved' ? 'bg-green-100 text-green-700' :
                        item.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      )}>
                        {item.status}
                      </span>
                    </TD>
                    <TD className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTransfer && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(item)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </Card>

      {/* Modal Input Manual */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Input Kas Kecil">
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Tipe</label>
              <select
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="out">Keluar</option>
                <option value="in">Masuk</option>
              </select>
            </div>
          </div>
          <Input label="Pemohon" placeholder="Nama pemohon" value={formData.requested_by} onChange={(e) => setFormData({ ...formData, requested_by: e.target.value })} required />
          <Input label="Deskripsi" placeholder="Contoh: Pembelian ATK" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
          <Input label="Jumlah (Rp)" type="number" placeholder="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} required />
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan Data</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Transfer */}
      <Modal isOpen={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer Petty Cash" size="lg">
        <form onSubmit={handleTransferSubmit} className="space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-violet-50 text-violet-700 border border-violet-200">
            <ArrowLeftRight className="w-4 h-4" /> Pemindahan Saldo
          </div>

          {/* Toggle arah */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTransferForm(p => ({ ...p, direction: 'in', counterKey: '' }))}
              className={cn(
                "h-10 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                transferForm.direction === 'in'
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-500 hover:bg-white"
              )}
            >
              Top Up (Masuk)
            </button>
            <button
              type="button"
              onClick={() => setTransferForm(p => ({ ...p, direction: 'out', counterKey: '' }))}
              className={cn(
                "h-10 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                transferForm.direction === 'out'
                  ? "bg-rose-600 text-white shadow"
                  : "text-slate-500 hover:bg-white"
              )}
            >
              Setor (Keluar)
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Tanggal</label>
            <input type="date" value={transferForm.tanggal} onChange={e => setTransferForm({ ...transferForm, tanggal: e.target.value })} required className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500" />
          </div>

          {transferForm.direction === 'in' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Dari (Sumber Dana)</label>
                <CounterSelect
                  value={transferForm.counterKey}
                  onChange={v => setTransferForm({ ...transferForm, counterKey: v })}
                  options={counterOptions}
                />
              </div>
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <ArrowDown className="w-5 h-5 text-violet-600" />
                </div>
              </div>
              <SelfBox accentColor={accentColor} label={selfRef.label} mode="dest" />
            </>
          ) : (
            <>
              <SelfBox accentColor={accentColor} label={selfRef.label} mode="source" />
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <ArrowDown className="w-5 h-5 text-violet-600" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ke (Tujuan)</label>
                <CounterSelect
                  value={transferForm.counterKey}
                  onChange={v => setTransferForm({ ...transferForm, counterKey: v })}
                  options={counterOptions}
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Jumlah (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={transferForm.jumlah}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '');
                const formatted = raw ? Number(raw).toLocaleString('id-ID') : '';
                setTransferForm({ ...transferForm, jumlah: formatted });
              }}
              placeholder="0"
              required
              className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-black text-violet-700 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Keterangan (Opsional)</label>
            <textarea
              value={transferForm.keterangan}
              onChange={e => setTransferForm({ ...transferForm, keterangan: e.target.value })}
              rows={2}
              placeholder="Mis. Top-up kas kecil bulan Mei..."
              className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setTransferOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={transferring} className="flex-1 h-11 rounded-xl font-black text-white border-0 bg-violet-600 hover:bg-violet-700">
              Eksekusi Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ---------------------------------------------------------------------
// Sub-komponen kecil
// ---------------------------------------------------------------------

const CounterSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; group?: string }[];
}> = ({ value, onChange, options }) => {
  // Group by group field; pakai native select untuk simplicity
  type Opt = { value: string; label: string; group?: string };
  const groups: Record<string, Opt[]> = {};
  options.forEach((o: Opt) => {
    const g = o.group || 'Lainnya';
    (groups[g] ||= []).push(o);
  });
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      required
      className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500 bg-white"
    >
      <option value="">-- Pilih Akun --</option>
      {Object.entries(groups).map(([gname, opts]) => (
        <optgroup key={gname} label={gname}>
          {opts.map((o: Opt) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
};

const SelfBox: React.FC<{ accentColor?: 'teal' | 'amber'; label: string; mode: 'source' | 'dest' }> = ({ accentColor, label, mode }) => {
  const tone = accentColor === 'amber'
    ? (mode === 'source' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100')
    : (mode === 'source' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100');
  return (
    <div className={cn("flex items-center gap-2 px-4 py-3 rounded-xl border", tone)}>
      <Wallet className="w-5 h-5" />
      <span className="text-sm font-black">{label}</span>
    </div>
  );
};

export default PettyCashView;
