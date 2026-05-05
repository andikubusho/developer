import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Banknote, CheckSquare, Square, Filter, History, Landmark, Wallet, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const OpnamePayment: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [opnames, setOpnames] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterProject, setFilterProject] = useState('');
  const [filterWorker, setFilterWorker] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailPayment, setDetailPayment] = useState<any | null>(null);

  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank' as 'bank' | 'cash',
    bank_account_id: '',
    note: '',
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [opnameData, projectData, bankData, paymentData] = await Promise.all([
        api.get('project_opnames', 'select=*&status=eq.approved&order=date.desc'),
        api.get('projects', 'select=id,name&order=name.asc'),
        api.get('bank_accounts', 'select=id,bank_name,account_number&order=bank_name.asc'),
        api.get('opname_payments', 'select=*&order=created_at.desc'),
      ]);
      setOpnames(opnameData || []);
      setProjects(projectData || []);
      setBanks(bankData || []);

      // Enrich payments with items
      if (paymentData && paymentData.length > 0) {
        const itemData = await api.get('opname_payment_items', 'select=*');
        const itemMap: Record<string, any[]> = {};
        (itemData || []).forEach((item: any) => {
          if (!itemMap[item.payment_id]) itemMap[item.payment_id] = [];
          itemMap[item.payment_id].push(item);
        });
        setPayments(paymentData.map((p: any) => ({ ...p, items: itemMap[p.id] || [] })));
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOpnames = opnames.filter(o => {
    const matchProject = filterProject ? o.project_id === filterProject : true;
    const matchWorker = filterWorker ? (o.worker_name || '').toLowerCase().includes(filterWorker.toLowerCase()) : true;
    return matchProject && matchWorker;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredOpnames.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredOpnames.map(o => o.id)));
    }
  };

  const selectedOpnames = filteredOpnames.filter(o => selected.has(o.id));
  const totalSelected = selectedOpnames.reduce((sum, o) => sum + (o.amount || 0), 0);

  // Group selected by worker for summary
  const workerSummary = selectedOpnames.reduce((acc: Record<string, { name: string; total: number; items: any[] }>, o) => {
    const key = o.worker_name || 'Tidak Diketahui';
    if (!acc[key]) acc[key] = { name: key, total: 0, items: [] };
    acc[key].total += o.amount || 0;
    acc[key].items.push(o);
    return acc;
  }, {});

  const handleOpenModal = () => {
    if (selected.size === 0) { alert('Pilih minimal satu opname terlebih dahulu.'); return; }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.payment_date) { alert('Tanggal pembayaran wajib diisi.'); return; }
    if (form.payment_method === 'bank' && !form.bank_account_id) { alert('Pilih rekening bank.'); return; }
    setSaving(true);
    try {
      // Untuk setiap worker yang terpilih, buat satu payment record
      for (const workerName of Object.keys(workerSummary)) {
        const group = workerSummary[workerName];
        const bankInfo = form.payment_method === 'bank'
          ? banks.find(b => b.id === form.bank_account_id)
          : null;

        const paymentPayload = {
          payment_date: form.payment_date,
          worker_name: workerName,
          bank_account_info: bankInfo ? `${bankInfo.bank_name} - ${bankInfo.account_number}` : null,
          total_amount: group.total,
          payment_method: form.payment_method,
          bank_account_id: form.payment_method === 'bank' ? (form.bank_account_id || null) : null,
          note: form.note || null,
          created_by: profile?.id || null,
        };

        const newPayment = await api.insert('opname_payments', paymentPayload);
        const paymentId = newPayment?.id || newPayment?.[0]?.id;

        if (paymentId) {
          // Insert items
          for (const opname of group.items) {
            await api.insert('opname_payment_items', {
              payment_id: paymentId,
              opname_id: opname.id,
              amount: opname.amount,
            });
          }
        }

        // Update opname status → paid
        for (const opname of group.items) {
          await api.update('project_opnames', opname.id, { status: 'paid' });
        }

        // Catat ke cash flow
        await api.insert('cash_flow', {
          date: form.payment_date,
          type: 'out',
          category: 'Upah Mandor / Opname',
          description: `Pembayaran upah - ${workerName} (${group.items.length} opname)`,
          amount: group.total,
          bank_account_id: form.payment_method === 'bank' ? (form.bank_account_id || null) : null,
          reference_type: 'opname_payment',
        });
      }

      setSelected(new Set());
      setIsModalOpen(false);
      setForm({ payment_date: new Date().toISOString().split('T')[0], payment_method: 'bank', bank_account_id: '', note: '' });
      await fetchAll();
      alert('Pembayaran berhasil dicatat.');
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const projectName = (id: string) => projects.find(p => p.id === id)?.name || '-';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-1 sm:p-2 h-auto">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-text-primary tracking-tight">Pembayaran Opname / Upah</h1>
            <p className="text-[10px] sm:text-sm text-text-secondary font-medium uppercase tracking-widest">Divisi Keuangan</p>
          </div>
        </div>
        {tab === 'pending' && (
          <Button
            size="sm"
            className="w-full sm:w-auto rounded-xl text-[10px] sm:text-sm py-3"
            onClick={handleOpenModal}
            disabled={selected.size === 0}
          >
            <Banknote className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Bayar Terpilih ({selected.size})
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('pending')}
          className={cn('px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
            tab === 'pending' ? 'bg-accent-lavender text-white shadow-lg' : 'bg-white/50 text-text-secondary hover:bg-white/80')}
        >
          Menunggu Pembayaran
        </button>
        <button
          onClick={() => setTab('history')}
          className={cn('px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2',
            tab === 'history' ? 'bg-accent-lavender text-white shadow-lg' : 'bg-white/50 text-text-secondary hover:bg-white/80')}
        >
          <History className="w-3.5 h-3.5" /> Histori Pembayaran
        </button>
      </div>

      {/* TAB: PENDING */}
      {tab === 'pending' && (
        <>
          {/* Filter */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Filter className="w-4 h-4 text-text-muted shrink-0" />
              <select
                className="h-9 rounded-xl border border-white/40 bg-white/60 px-3 text-sm font-bold text-text-primary focus:outline-none"
                value={filterProject}
                onChange={e => setFilterProject(e.target.value)}
              >
                <option value="">Semua Proyek</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="Cari nama mandor..."
                className="h-9 rounded-xl border border-white/40 bg-white/60 px-3 text-sm font-bold text-text-primary focus:outline-none flex-1"
                value={filterWorker}
                onChange={e => setFilterWorker(e.target.value)}
              />
              {selected.size > 0 && (
                <div className="ml-auto text-sm font-black text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                  Total: {formatCurrency(totalSelected)}
                </div>
              )}
            </div>
          </Card>

          {/* Tabel Opname Pending */}
          <Card className="p-0">
            <div className="overflow-x-auto scrollbar-hide">
              <Table className="min-w-full">
                <THead>
                  <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                    <TH className="px-3 py-3 w-10">
                      <button onClick={toggleAll} className="text-text-muted hover:text-accent-dark">
                        {selected.size === filteredOpnames.length && filteredOpnames.length > 0
                          ? <CheckSquare className="w-4 h-4 text-accent-dark" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </TH>
                    <TH className="px-3 py-3 font-black hidden sm:table-cell">Tanggal</TH>
                    <TH className="px-3 py-3 font-black">Proyek / Unit</TH>
                    <TH className="px-3 py-3 font-black">Mandor</TH>
                    <TH className="px-3 py-3 font-black hidden md:table-cell">Keterangan</TH>
                    <TH className="px-3 py-3 font-black text-right">Nilai</TH>
                  </TR>
                </THead>
                <TBody>
                  {loading ? (
                    <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-muted">Memuat data...</TD></TR>
                  ) : filteredOpnames.length === 0 ? (
                    <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-secondary text-sm">Tidak ada opname yang menunggu pembayaran.</TD></TR>
                  ) : (
                    filteredOpnames.map(o => (
                      <TR key={o.id} className={cn('transition-colors cursor-pointer', selected.has(o.id) ? 'bg-blue-50/60' : 'hover:bg-white/30')}
                        onClick={() => toggleSelect(o.id)}>
                        <TD className="px-3 py-3">
                          {selected.has(o.id)
                            ? <CheckSquare className="w-4 h-4 text-accent-dark" />
                            : <Square className="w-4 h-4 text-text-muted" />}
                        </TD>
                        <TD className="px-3 py-3 text-[11px] text-text-secondary hidden sm:table-cell whitespace-nowrap">
                          {formatDate(o.date)}
                        </TD>
                        <TD className="px-3 py-3">
                          <div className="font-black text-text-primary text-xs">{projectName(o.project_id)}</div>
                          <div className="text-[10px] text-text-muted">{o.unit_id ? `Unit: ${o.unit_id}` : 'Tanpa Unit'}</div>
                        </TD>
                        <TD className="px-3 py-3">
                          <div className="font-bold text-xs text-text-primary">{o.worker_name || '-'}</div>
                        </TD>
                        <TD className="px-3 py-3 text-[11px] text-text-secondary hidden md:table-cell max-w-[200px] truncate">
                          {o.work_description || '-'}
                        </TD>
                        <TD className="px-3 py-3 text-right font-black text-[11px] text-emerald-700 whitespace-nowrap">
                          {formatCurrency(o.amount || 0)}
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          </Card>
        </>
      )}

      {/* TAB: HISTORY */}
      {tab === 'history' && (
        <Card className="p-0">
          <div className="overflow-x-auto scrollbar-hide">
            <Table className="min-w-full">
              <THead>
                <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                  <TH className="px-3 py-3 font-black hidden sm:table-cell">Tanggal Bayar</TH>
                  <TH className="px-3 py-3 font-black">Mandor</TH>
                  <TH className="px-3 py-3 font-black hidden md:table-cell">Rekening / Metode</TH>
                  <TH className="px-3 py-3 font-black text-center hidden md:table-cell">Jml Opname</TH>
                  <TH className="px-3 py-3 font-black text-right">Total Bayar</TH>
                  <TH className="px-3 py-3 font-black text-center">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-muted">Memuat...</TD></TR>
                ) : payments.length === 0 ? (
                  <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-secondary text-sm">Belum ada histori pembayaran.</TD></TR>
                ) : (
                  payments.map(p => (
                    <TR key={p.id} className="hover:bg-white/30 transition-colors">
                      <TD className="px-3 py-3 text-[11px] text-text-secondary hidden sm:table-cell whitespace-nowrap">
                        {formatDate(p.payment_date)}
                      </TD>
                      <TD className="px-3 py-3">
                        <div className="font-black text-xs text-text-primary">{p.worker_name}</div>
                        <div className="text-[10px] text-text-muted sm:hidden">{formatDate(p.payment_date)}</div>
                      </TD>
                      <TD className="px-3 py-3 hidden md:table-cell">
                        {p.payment_method === 'bank' ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700">
                            <Landmark className="w-3 h-3" /> {p.bank_account_info || 'Bank Transfer'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            <Wallet className="w-3 h-3" /> Cash
                          </span>
                        )}
                      </TD>
                      <TD className="px-3 py-3 text-center hidden md:table-cell">
                        <span className="text-xs font-black text-text-secondary">{p.items?.length || 0}</span>
                      </TD>
                      <TD className="px-3 py-3 text-right font-black text-[11px] text-emerald-700 whitespace-nowrap">
                        {formatCurrency(p.total_amount || 0)}
                      </TD>
                      <TD className="px-3 py-3 text-center">
                        <button
                          onClick={() => setDetailPayment(p)}
                          className="text-[10px] font-black text-accent-dark hover:underline uppercase tracking-widest"
                        >
                          Detail
                        </button>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </Card>
      )}

      {/* MODAL: Form Pembayaran */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Konfirmasi Pembayaran Upah">
        <div className="space-y-4">
          {/* Summary opname terpilih */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3 max-h-48 overflow-y-auto">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Opname yang Dibayar</p>
            {(Object.values(workerSummary) as { name: string; total: number; items: any[] }[]).map(ws => (
              <div key={ws.name} className="border border-slate-200 rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-text-primary">{ws.name}</span>
                  <span className="text-xs font-black text-emerald-700">{formatCurrency(ws.total)}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{ws.items.length} opname</p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-xs font-black text-text-primary uppercase tracking-wider">Total</span>
              <span className="text-sm font-black text-emerald-700">{formatCurrency(totalSelected)}</span>
            </div>
          </div>

          {/* Detail pembayaran */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Tanggal Bayar</label>
              <input type="date" value={form.payment_date}
                onChange={e => setForm({ ...form, payment_date: e.target.value })}
                className="w-full h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold focus:outline-none focus:border-accent-dark bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Metode</label>
              <select value={form.payment_method}
                onChange={e => setForm({ ...form, payment_method: e.target.value as 'bank' | 'cash', bank_account_id: '' })}
                className="w-full h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold focus:outline-none focus:border-accent-dark bg-white">
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          {form.payment_method === 'bank' && (
            <div className="space-y-1.5">
              <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Rekening Bank</label>
              <select value={form.bank_account_id}
                onChange={e => setForm({ ...form, bank_account_id: e.target.value })}
                className="w-full h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold focus:outline-none focus:border-accent-dark bg-white">
                <option value="">Pilih Rekening...</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name} — {b.account_number}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Catatan (Opsional)</label>
            <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
              rows={2} placeholder="Catatan tambahan..."
              className="w-full rounded-xl border-2 border-slate-100 px-4 py-3 text-sm font-medium focus:outline-none focus:border-accent-dark bg-white resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="button" isLoading={saving} onClick={handleSave}>
              <Banknote className="w-4 h-4 mr-2" /> Simpan Pembayaran
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Detail Histori */}
      <Modal isOpen={!!detailPayment} onClose={() => setDetailPayment(null)} title="Detail Pembayaran">
        {detailPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</p><p className="font-bold text-text-primary">{formatDate(detailPayment.payment_date)}</p></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mandor</p><p className="font-bold text-text-primary">{detailPayment.worker_name}</p></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode</p><p className="font-bold text-text-primary capitalize">{detailPayment.payment_method}</p></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rekening</p><p className="font-bold text-text-primary">{detailPayment.bank_account_info || '-'}</p></div>
              {detailPayment.note && <div className="col-span-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan</p><p className="font-bold text-text-primary">{detailPayment.note}</p></div>}
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Opname Tercakup ({detailPayment.items?.length || 0})</p>
              {(detailPayment.items || []).map((item: any) => (
                <div key={item.id} className="flex justify-between text-xs font-medium text-text-secondary">
                  <span>{item.opname_id}</span>
                  <span className="font-black text-emerald-700">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-sm font-black text-text-primary">Total Dibayar</span>
              <span className="text-base font-black text-emerald-700">{formatCurrency(detailPayment.total_amount)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OpnamePayment;
