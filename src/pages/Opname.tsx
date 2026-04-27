import React, { useState, useEffect, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ClipboardList, ArrowLeft, Trash2, CheckCircle2, Clock, Calculator, AlertCircle, Save } from 'lucide-react';
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
  const { setDivision } = useAuth();
  const [opnames, setOpnames] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [opnameDate, setOpnameDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchItems, setBatchItems] = useState<OpnameItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProjectId && isModalOpen) {
      loadUnits();
      loadRABForBatch();
    }
  }, [selectedProjectId, selectedUnitId, isModalOpen]);

  const loadUnits = async () => {
    try {
      const data = await api.get('units', `project_id=eq.${selectedProjectId}&order=unit_number.asc`);
      setUnits(data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [opRes, projRes] = await Promise.all([
        api.get('project_opnames', 'select=*,project:projects(name)&order=date.desc'),
        api.get('projects', 'select=id,name')
      ]);
      setOpnames(opRes || []);
      setProjects(projRes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRABForBatch = async () => {
    try {
      setLoading(true);
      // 1. Get RAB Project (Filtered by Project and Unit if available)
      let query = `project_id=eq.${selectedProjectId}`;
      if (selectedUnitId) {
        query += `&unit_id=eq.${selectedUnitId}`;
      }
      
      const rabs = await api.get('rab_projects', query);
      if (!rabs || rabs.length === 0) {
        setBatchItems([]);
        return;
      }

      // 2. Get RAB Items and Existing Progress in Parallel
      const [items, progress] = await Promise.all([
        api.get('rab_items', `rab_project_id=eq.${rabs[0].id}&wage_price=gt.0&order=urutan.asc`),
        api.get('project_opname_items', `select=rab_item_id,percentage_opname,amount_opname`)
      ]);

      // 3. Map Items with their progress
      const mapped = (items || []).map((item: any) => {
        const itemProgress = (progress || []).filter((p: any) => p.rab_item_id === item.id);
        const totalPaidPct = itemProgress.reduce((sum: number, p: any) => sum + Number(p.percentage_opname), 0);
        const totalPaidRp = itemProgress.reduce((sum: number, p: any) => sum + Number(p.amount_opname), 0);
        const totalBudget = (item.wage_price || 0) * (item.volume || 1);

        return {
          rab_item_id: item.id,
          uraian: item.uraian,
          total_budget: totalBudget,
          paid_amount: totalPaidRp,
          paid_percentage: totalPaidPct,
          input_percentage: 0,
          calculated_amount: 0
        };
      });

      setBatchItems(mapped);
    } catch (err) {
      console.error('Error loading RAB batch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (rabItemId: string, pct: number) => {
    setBatchItems(prev => prev.map(item => {
      if (item.rab_item_id === rabItemId) {
        const validatedPct = Math.max(0, pct);
        const amount = (validatedPct / 100) * item.total_budget;
        return { ...item, input_percentage: validatedPct, calculated_amount: amount };
      }
      return item;
    }));
  };

  const handleSaveBatch = async () => {
    const validItems = batchItems.filter(item => item.input_percentage > 0);
    if (validItems.length === 0) {
      alert('Masukkan minimal satu progress pekerjaan');
      return;
    }

    // Validation: Check if any item exceeds 100%
    const overflow = validItems.find(item => item.paid_percentage + item.input_percentage > 100.01);
    if (overflow) {
      alert(`Pekerjaan "${overflow.uraian}" melebihi progress 100% (Total: ${overflow.paid_percentage + overflow.input_percentage}%)`);
      return;
    }

    try {
      setSubmitting(true);
      // 1. Create Master
      const master = await api.insert('project_opnames', {
        date: opnameDate,
        project_id: selectedProjectId,
        unit_id: selectedUnitId || null,
        worker_name: workerName,
        status: 'pending'
      });
      const masterId = master[0].id;

      // 2. Create Details
      const details = validItems.map(item => ({
        opname_id: masterId,
        rab_item_id: item.rab_item_id,
        percentage_opname: item.input_percentage,
        amount_opname: item.calculated_amount
      }));

      // Bulk insert details
      await Promise.all(details.map(d => api.insert('project_opname_items', d)));

      alert('Opname batch berhasil disimpan!');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOpnames = opnames.filter(item => 
    item.worker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Opname Upah (Batch Mode)</h1>
            <p className="text-text-secondary font-medium">Progress pembayaran upah berbasis RAB Proyek</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto shadow-glass" onClick={() => { 
          setSelectedProjectId('');
          setSelectedUnitId('');
          setWorkerName('');
          setBatchItems([]);
          setIsModalOpen(true); 
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Input Opname Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-accent-lavender to-accent-dark border-none">
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md"><Clock className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest">Pending Review</p>
              <p className="text-2xl font-black">{opnames.filter(o => o.status === 'pending').length} Records</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-accent-lavender/20 border-accent-lavender/30">
          <div className="flex items-center gap-4 text-accent-dark">
            <div className="p-3 glass-card rounded-xl shadow-glass"><ClipboardList className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-accent-lavender uppercase tracking-widest">Total Batch</p>
              <p className="text-2xl font-black">{opnames.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-4 text-emerald-600">
            <div className="p-3 glass-card rounded-xl shadow-glass"><CheckCircle2 className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Status Aktif</p>
              <p className="text-2xl font-black">Online</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden border-white/40 shadow-premium">
        <div className="p-6 border-b border-white/40 flex flex-col sm:flex-row gap-4 bg-white/20">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari nama pekerja atau proyek..." 
              className="pl-12 h-12 bg-white border-white/40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table className="min-w-[800px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-widest">
              <TH className="px-6 py-4 font-black">Tanggal</TH>
              <TH className="px-6 py-4 font-black">Proyek</TH>
              <TH className="px-6 py-4 font-black">Pekerja / Kontraktor</TH>
              <TH className="px-6 py-4 font-black text-center">Status</TH>
              <TH className="px-6 py-4 font-black text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={5} className="px-6 py-12 text-center text-text-muted">Memuat data...</TD></TR>
            ) : filteredOpnames.length === 0 ? (
              <TR><TD colSpan={5} className="px-6 py-20 text-center text-text-muted font-medium">Belum ada data opname batch.</TD></TR>
            ) : (
              filteredOpnames.map((item) => (
                <TR key={item.id} className="hover:bg-white/30 transition-all group">
                  <TD className="px-6 py-5 text-sm font-bold text-text-secondary">{formatDate(item.date)}</TD>
                  <TD className="px-6 py-5 text-sm font-black text-text-primary uppercase">{item.project?.name || 'N/A'}</TD>
                  <TD className="px-6 py-5 text-sm font-medium text-text-primary">{item.worker_name}</TD>
                  <TD className="px-6 py-5 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      item.status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      item.status === 'approved' ? "bg-accent-lavender/20 text-accent-dark border-accent-lavender/30" :
                      "bg-amber-50 text-amber-600 border-amber-100"
                    )}>
                      {item.status}
                    </span>
                  </TD>
                  <TD className="px-6 py-5 text-right">
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-rose-500 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Input Progress Upah (Batch RAB)" 
        className="max-w-6xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Input label="Tanggal Opname" type="date" value={opnameDate} onChange={(e) => setOpnameDate(e.target.value)} />
            <div>
              <label className="text-[11px] font-black text-text-muted uppercase tracking-widest mb-2 block">Pilih Proyek</label>
              <select 
                className="w-full h-12 rounded-xl glass-input px-4 text-sm font-bold focus:outline-none" 
                value={selectedProjectId} 
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedUnitId('');
                }}
              >
                <option value="">-- Pilih Proyek --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-black text-text-muted uppercase tracking-widest mb-2 block">Pilih Unit (Opsional)</label>
              <select 
                className="w-full h-12 rounded-xl glass-input px-4 text-sm font-bold focus:outline-none disabled:opacity-50" 
                value={selectedUnitId} 
                onChange={(e) => setSelectedUnitId(e.target.value)}
                disabled={!selectedProjectId}
              >
                <option value="">-- Semua Unit / Umum --</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.unit_number} - {u.type}</option>)}
              </select>
            </div>
            <Input label="Nama Pekerja / Kontraktor" placeholder="Masukkan nama..." value={workerName} onChange={(e) => setWorkerName(e.target.value)} />
          </div>

          {selectedProjectId ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Calculator className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Item Pekerjaan Terdaftar di RAB</span>
              </div>
              
              <div className="border border-white/40 rounded-2xl overflow-hidden shadow-premium">
                <Table>
                  <THead>
                    <TR className="bg-white/40 text-[9px] font-black uppercase tracking-widest">
                      <TH className="px-4 py-3">Pekerjaan</TH>
                      <TH className="px-4 py-3 text-right">Total Upah (RAB)</TH>
                      <TH className="px-4 py-3 text-center">Progress Sblmnya</TH>
                      <TH className="px-4 py-3 text-center w-32">Input % Baru</TH>
                      <TH className="px-4 py-3 text-right">Nilai Rp (Auto)</TH>
                      <TH className="px-4 py-3 text-center">Sisa Akhir %</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {batchItems.length === 0 ? (
                      <TR><TD colSpan={6} className="px-4 py-10 text-center text-text-muted">Tidak ada item upah di RAB proyek ini.</TD></TR>
                    ) : (
                      batchItems.map((item) => (
                        <TR key={item.rab_item_id} className={cn("hover:bg-white/30", item.paid_percentage >= 100 && "bg-emerald-50/30")}>
                          <TD className="px-4 py-3 text-sm font-medium text-text-primary">{item.uraian}</TD>
                          <TD className="px-4 py-3 text-sm font-black text-text-secondary text-right">{formatCurrency(item.total_budget)}</TD>
                          <TD className="px-4 py-3 text-center">
                            <span className="text-xs font-bold text-text-muted">{item.paid_percentage.toFixed(1)}%</span>
                          </TD>
                          <TD className="px-4 py-3 text-center">
                            <input 
                              type="number"
                              className={cn(
                                "w-20 h-10 rounded-lg border border-white/60 bg-white px-2 text-center text-sm font-black focus:outline-none",
                                item.paid_percentage >= 100 ? "opacity-50 cursor-not-allowed" : "focus:border-primary"
                              )}
                              value={item.input_percentage || ''}
                              onChange={(e) => handleItemChange(item.rab_item_id, parseFloat(e.target.value) || 0)}
                              disabled={item.paid_percentage >= 100}
                              placeholder="0"
                            />
                          </TD>
                          <TD className="px-4 py-3 text-sm font-black text-primary text-right">{formatCurrency(item.calculated_amount)}</TD>
                          <TD className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className={cn(
                                "text-xs font-black",
                                (100 - item.paid_percentage - item.input_percentage) < 0 ? "text-rose-500" : "text-emerald-600"
                              )}>
                                {(100 - item.paid_percentage - item.input_percentage).toFixed(1)}%
                              </span>
                              {(100 - item.paid_percentage - item.input_percentage) < 0 && <AlertCircle className="w-3 h-3 text-rose-500 mt-1" />}
                            </div>
                          </TD>
                        </TR>
                      ))
                    )}
                  </TBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-text-muted bg-white/20 rounded-3xl border-2 border-dashed border-white/40">
              <ClipboardList className="w-12 h-12 opacity-20 mb-4" />
              <p className="font-bold uppercase tracking-widest text-[10px]">Silakan pilih proyek untuk memuat daftar RAB</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-12 px-6 border-white/40">Batal</Button>
            <Button 
              onClick={handleSaveBatch} 
              isLoading={submitting} 
              disabled={!selectedProjectId || batchItems.length === 0}
              className="rounded-xl h-12 px-10 shadow-glass"
            >
              <Save className="w-4 h-4 mr-2" />
              Simpan Batch Opname
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OpnamePage;
