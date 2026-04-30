import React, { useState, useEffect, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ClipboardList, ArrowLeft, Trash2, CheckCircle2, Clock, Calculator, AlertCircle, Save, Building2, Layers, Calendar, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

interface OpnameItem {
  rab_item_id: string;
  uraian: string;
  total_budget: number;
  paid_amount: number;
  paid_percentage: number;
  input_percentage: number;
  calculated_amount: number;
}

const OpnamePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [opnames, setOpnames] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [opnameDate, setOpnameDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchItems, setBatchItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const canVoid = profile?.role === 'admin';

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadUnits();
      loadRABItems();
    } else {
      setBatchItems([]);
    }
  }, [selectedProjectId, selectedUnitId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const projRes = await api.get('projects', 'select=id,name&order=name.asc');
      setProjects(projRes || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    try {
      const data = await api.get('units', `project_id=eq.${selectedProjectId}&order=unit_number.asc`);
      setUnits(data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const loadRABItems = async () => {
    try {
      setLoading(true);
      // 1. Get RAB Projects for this project/unit
      let query = `project_id=eq.${selectedProjectId}`;
      if (selectedUnitId) query += `&unit_id=eq.${selectedUnitId}`;
      
      const rabs = await api.get('rab_projects', query);
      if (!rabs || rabs.length === 0) {
        setBatchItems([]);
        return;
      }

      // 2. Get RAB Items (Wage only) and Opname History in parallel
      const rabProjectIds = rabs.map((r: any) => r.id).join(',');
      const [items, allOpnameItems] = await Promise.all([
        api.get('rab_items', `rab_project_id=in.(${rabProjectIds})&wage_price=gt.0&order=uraian.asc`),
        api.get('project_opname_items', `rab_item_id=in.(select id from rab_items where rab_project_id in (${rabProjectIds}))`)
      ]);

      if (!items) {
        setBatchItems([]);
        return;
      }

      // 3. Get Master Status for all found opname items to filter out 'cancelled'
      const opnameIds = [...new Set((allOpnameItems || []).map((o: any) => o.opname_id))];
      let opnameMasters: any[] = [];
      if (opnameIds.length > 0) {
        opnameMasters = await api.get('project_opnames', `id=in.(${opnameIds.join(',')})`);
      }
      const masterMap = (opnameMasters || []).reduce((acc: any, m: any) => {
        acc[m.id] = m;
        return acc;
      }, {});

      // 4. Map everything together
      const mapped = items.map((item: any) => {
        const history = (allOpnameItems || [])
          .filter((oi: any) => oi.rab_item_id === item.id)
          .map((oi: any) => ({
            ...oi,
            master: masterMap[oi.opname_id] || { status: 'unknown' }
          }))
          .sort((a: any, b: any) => new Date(b.master.date).getTime() - new Date(a.master.date).getTime());

        // Calculate only from approved/paid
        const validHistory = history.filter((h: any) => h.master.status === 'approved' || h.master.status === 'paid');
        const totalPaidPct = validHistory.reduce((sum: number, p: any) => sum + Number(p.percentage_opname), 0);
        const totalPaidRp = validHistory.reduce((sum: number, p: any) => sum + Number(p.amount_opname), 0);
        const totalBudget = (Number(item.wage_price) || 0) * (Number(item.volume) || 1);

        return {
          ...item,
          total_budget: totalBudget,
          paid_amount: totalPaidRp,
          paid_percentage: totalPaidPct,
          history,
          input_percentage: 0,
          calculated_amount: 0
        };
      });

      setBatchItems(mapped);
    } catch (err) {
      console.error('Error loading RAB items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (rabItemId: string, pct: number) => {
    setBatchItems(prev => prev.map(item => {
      if (item.id === rabItemId) {
        const validatedPct = Math.max(0, pct);
        const amount = (validatedPct / 100) * item.total_budget;
        return { ...item, input_percentage: validatedPct, calculated_amount: amount };
      }
      return item;
    }));
  };

  const handleSaveItem = async (item: any) => {
    if (item.input_percentage <= 0) {
      alert('Masukkan persentase progress');
      return;
    }

    if (item.paid_percentage + item.input_percentage > 100.01) {
      alert(`Progress melebihi 100% (Total: ${(item.paid_percentage + item.input_percentage).toFixed(1)}%)`);
      return;
    }

    try {
      setSubmitting(true);
      // 1. Create Master for this specific input (incremental)
      const master = await api.insert('project_opnames', {
        date: opnameDate,
        project_id: selectedProjectId,
        unit_id: selectedUnitId || null,
        worker_name: workerName || 'Umum',
        status: 'approved', // Auto-approve for wage opname
        created_by: profile?.id
      });
      const masterId = master[0].id;

      // 2. Create Detail
      await api.insert('project_opname_items', {
        opname_id: masterId,
        rab_item_id: item.id,
        percentage_opname: item.input_percentage,
        amount_opname: item.calculated_amount
      });

      alert('Progress berhasil disimpan');
      loadRABItems();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async (opnameId: string, currentStatus: string) => {
    if (currentStatus === 'paid') {
      alert('Record yang sudah dibayar tidak dapat dibatalkan.');
      return;
    }
    
    if (!window.confirm('Apakah Anda yakin ingin membatalkan (Void) data progress ini? Data tetap ada di histori namun tidak akan dihitung dalam progress.')) return;

    try {
      setLoading(true);
      await api.update('project_opnames', opnameId, { status: 'cancelled' });
      alert('Data progress berhasil dibatalkan (Void)');
      loadRABItems();
    } catch (err: any) {
      alert(`Gagal membatalkan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = batchItems.filter(item => 
    item.uraian?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Opname Upah Proyek</h1>
            <p className="text-text-secondary font-medium text-sm">Monitoring & Input Progress Pembayaran Upah</p>
          </div>
        </div>
      </div>

      {/* Filter & Audit Section */}
      <Card className="p-8 bg-white/60 backdrop-blur-md border-white/60 shadow-premium rounded-[2.5rem]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Tanggal */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1 opacity-70">
              <Calendar className="w-3.5 h-3.5 text-accent-dark" /> Tanggal Opname
            </label>
            <input 
              type="date" 
              value={opnameDate} 
              onChange={(e) => setOpnameDate(e.target.value)}
              className="w-full h-12 bg-white/50 border-none rounded-2xl px-5 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
            />
          </div>

          {/* Proyek */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1 opacity-70">
              <Building2 className="w-3.5 h-3.5 text-accent-dark" /> Pilih Proyek
            </label>
            <select
              className="w-full h-12 bg-white/50 border-none rounded-2xl px-5 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
              value={selectedProjectId}
              onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedUnitId(''); }}
            >
              <option value="">-- Pilih Proyek --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Unit */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1 opacity-70">
              <Layers className="w-3.5 h-3.5 text-accent-dark" /> Pilih Unit <span className="lowercase font-normal opacity-50">(opsional)</span>
            </label>
            <select
              className="w-full h-12 bg-white/50 border-none rounded-2xl px-5 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all disabled:opacity-30"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              disabled={!selectedProjectId}
            >
              <option value="">{selectedProjectId ? '-- Semua Unit --' : 'Pilih Proyek Dulu'}</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.unit_number} - {u.type}</option>)}
            </select>
          </div>

          {/* Nama Pekerja */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1 opacity-70">
              <User className="w-3.5 h-3.5 text-accent-dark" /> Nama Pekerja / Mandor
            </label>
            <input 
              type="text" 
              placeholder="Contoh: Budi (Mandor)" 
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              className="w-full h-12 bg-white/50 border-none rounded-2xl px-5 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all placeholder:text-text-muted/50"
            />
          </div>
        </div>

        {/* Search Row */}
        {selectedProjectId && (
          <div className="mt-8 pt-8 border-t border-white/40">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                placeholder="Cari item pekerjaan dalam RAB..." 
                className="w-full h-14 bg-white/80 border-none rounded-full px-12 text-sm font-bold text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-accent-lavender/20 text-accent-dark text-[10px] font-black uppercase tracking-widest">
                {filteredItems.length} Items
              </div>
            </div>
          </div>
        )}
      </Card>

      {!selectedProjectId ? (
        <div className="h-64 flex flex-col items-center justify-center text-text-muted bg-white/20 rounded-[2rem] border-2 border-dashed border-white/40">
          <ClipboardList className="w-12 h-12 opacity-20 mb-4" />
          <p className="font-bold uppercase tracking-widest text-[10px]">Silakan pilih proyek untuk memuat data RAB</p>
        </div>
      ) : (
        <Card className="p-0 overflow-hidden border-white/40 shadow-premium bg-white/20 backdrop-blur-sm rounded-[2rem]">
          <Table className="min-w-[1200px]">
            <THead>
              <TR className="bg-accent-dark text-white text-[10px] font-black uppercase tracking-[0.2em]">
                <TH className="px-6 py-5 w-12"></TH>
                <TH className="px-6 py-5">Uraian Pekerjaan</TH>
                <TH className="px-6 py-5 text-right">Nilai RAB</TH>
                <TH className="px-6 py-5 text-center">Progress</TH>
                <TH className="px-6 py-5 text-right">Terpakai</TH>
                <TH className="px-6 py-5 text-right">Sisa Upah</TH>
                <TH className="px-6 py-5 text-center">Status</TH>
                <TH className="px-6 py-5 text-center w-64">Input Baru (%)</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={8} className="px-6 py-12 text-center text-text-muted">Memuat data RAB...</TD></TR>
              ) : filteredItems.length === 0 ? (
                <TR><TD colSpan={8} className="px-6 py-20 text-center text-text-muted font-medium">Tidak ada item upah ditemukan.</TD></TR>
              ) : (
                filteredItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <TR className={cn(
                      "hover:bg-white/40 transition-all border-b border-white/20 last:border-0 group",
                      expandedRows[item.id] && "bg-white/30"
                    )}>
                      <TD className="px-6 py-5">
                        <button 
                          onClick={() => toggleExpand(item.id)}
                          className="p-1 hover:bg-white rounded-lg transition-colors"
                        >
                          {expandedRows[item.id] ? <Layers className="w-4 h-4 text-accent-dark rotate-180" /> : <Layers className="w-4 h-4 text-text-muted" />}
                        </button>
                      </TD>
                      <TD className="px-6 py-5">
                        <div className="text-sm font-bold text-text-primary leading-tight">{item.uraian}</div>
                        <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1">VOL: {item.volume} {item.satuan}</div>
                      </TD>
                      <TD className="px-6 py-5 text-sm font-black text-text-secondary text-right">{formatCurrency(item.total_budget)}</TD>
                      <TD className="px-6 py-5">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] font-black text-accent-dark">{item.paid_percentage.toFixed(1)}%</span>
                          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-700", item.paid_percentage >= 100 ? "bg-emerald-500" : "bg-accent-lavender")} 
                              style={{ width: `${Math.min(100, item.paid_percentage)}%` }}
                            />
                          </div>
                        </div>
                      </TD>
                      <TD className="px-6 py-5 text-sm font-bold text-text-primary text-right">{formatCurrency(item.paid_amount)}</TD>
                      <TD className="px-6 py-5 text-sm font-black text-emerald-600 text-right">{formatCurrency(item.total_budget - item.paid_amount)}</TD>
                      <TD className="px-6 py-5 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          item.paid_percentage >= 100 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          item.paid_percentage > 0 ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-slate-50 text-slate-400 border-slate-100"
                        )}>
                          {item.paid_percentage >= 100 ? 'Selesai' : item.paid_percentage > 0 ? 'Berjalan' : 'Belum Mulai'}
                        </span>
                      </TD>
                      <TD className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 max-w-[100px]">
                            <input 
                              type="number"
                              className="w-full h-10 rounded-xl border border-white/60 bg-white/80 px-3 text-center text-sm font-black focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 disabled:opacity-50"
                              placeholder="0"
                              value={item.input_percentage || ''}
                              onChange={(e) => handleItemChange(item.id, parseFloat(e.target.value) || 0)}
                              disabled={item.paid_percentage >= 100}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-text-muted">%</span>
                          </div>
                          <Button 
                            size="sm" 
                            className="h-10 px-3 rounded-xl shadow-glass"
                            disabled={item.input_percentage <= 0 || item.paid_percentage >= 100}
                            onClick={() => handleSaveItem(item)}
                            isLoading={submitting}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                    {expandedRows[item.id] && (
                      <TR className="bg-slate-50/50">
                        <TD colSpan={8} className="px-12 py-6 border-b border-white/40">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-text-secondary">
                              <Clock className="w-4 h-4" />
                              <h4 className="text-[10px] font-black uppercase tracking-[0.1em]">Riwayat Progress Opname</h4>
                            </div>
                            <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                              <Table>
                                <THead>
                                  <TR className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                    <TH className="px-4 py-3">Tanggal</TH>
                                    <TH className="px-4 py-3">Pekerja</TH>
                                    <TH className="px-4 py-3 text-center">Progress</TH>
                                    <TH className="px-4 py-3 text-right">Nilai Rupiah</TH>
                                    <TH className="px-4 py-3 text-center">Status</TH>
                                    <TH className="px-4 py-3 text-right">Aksi</TH>
                                  </TR>
                                </THead>
                                <TBody>
                                  {item.history.length === 0 ? (
                                    <TR><TD colSpan={6} className="px-4 py-8 text-center text-[11px] text-text-muted">Belum ada histori input.</TD></TR>
                                  ) : (
                                    item.history.map((h: any) => (
                                      <TR key={h.id} className={cn("text-[11px] border-b border-slate-50 last:border-0", h.master.status === 'cancelled' && "opacity-40 grayscale italic line-through")}>
                                        <TD className="px-4 py-4 font-medium">{formatDate(h.master.date)}</TD>
                                        <TD className="px-4 py-4">{h.master.worker_name || 'N/A'}</TD>
                                        <TD className="px-4 py-4 text-center font-bold text-accent-dark">{Number(h.percentage_opname).toFixed(1)}%</TD>
                                        <TD className="px-4 py-4 text-right font-black">{formatCurrency(h.amount_opname)}</TD>
                                        <TD className="px-4 py-4 text-center">
                                          <span className={cn(
                                            "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                            h.master.status === 'cancelled' ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
                                          )}>
                                            {h.master.status}
                                          </span>
                                        </TD>
                                        <TD className="px-4 py-4 text-right">
                                          {canVoid && h.master.status !== 'cancelled' && (
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              className="h-7 px-2 text-rose-500 hover:bg-rose-50 rounded-lg text-[9px] font-black uppercase"
                                              onClick={() => handleVoid(h.opname_id, h.master.status)}
                                            >
                                              Void
                                            </Button>
                                          )}
                                        </TD>
                                      </TR>
                                    ))
                                  )}
                                </TBody>
                              </Table>
                            </div>
                          </div>
                        </TD>
                      </TR>
                    )}
                  </React.Fragment>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default OpnamePage;
