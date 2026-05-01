import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  ClipboardList, 
  ArrowLeft, 
  Building2, 
  Layers, 
  Calendar, 
  User,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Trash2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import { Project } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const OpnamePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [opnames, setOpnames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const canVoid = profile?.role === 'admin';

  useEffect(() => {
    fetchInitialData();
    fetchOpnameHistory();
  }, [selectedProjectId, selectedUnitId]);

  const fetchInitialData = async () => {
    const projRes = await api.get('projects', 'select=id,name&order=name.asc');
    setProjects(projRes || []);
    if (selectedProjectId) {
      const unitsData = await api.get('units', `project_id=eq.${selectedProjectId}&order=unit_number.asc`);
      setUnits(unitsData || []);
    }
  };

  const fetchOpnameHistory = async () => {
    try {
      setLoading(true);
      let query = `select=*,project:projects(name),unit:units(unit_number),items:project_opname_items(percentage_opname,amount_opname,rab_items(uraian))&order=date.desc`;
      
      if (selectedProjectId) query += `&project_id=eq.${selectedProjectId}`;
      if (selectedUnitId) query += `&unit_id=eq.${selectedUnitId}`;
      
      const data = await api.get('project_opnames', query);
      setOpnames(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async (id: string, status: string) => {
    if (status === 'paid') {
      alert('Record yang sudah dibayar tidak dapat dibatalkan.');
      return;
    }
    if (!window.confirm('Batalkan data progress ini?')) return;

    try {
      await api.update('project_opnames', id, { status: 'cancelled' });
      fetchOpnameHistory();
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredOpnames = opnames.filter(o => 
    o.worker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 glass-card flex items-center justify-center text-accent-lavender shadow-3d">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-text-primary uppercase tracking-tighter italic italic">Histori <span className="text-accent-lavender not-italic">Opname</span></h1>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-70">Monitor progress upah dan pelaporan harian</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/opname/new')}
          className="btn-3d bg-accent-lavender text-text-primary px-10 h-14 flex items-center gap-3"
        >
          <Plus className="w-5 h-5" />
          Buat Baru
        </button>
      </div>

      <Card className="p-6 bg-white border-none shadow-premium">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Proyek
            </label>
            <select
              className="w-full h-11 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none"
              value={selectedProjectId}
              onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedUnitId(''); }}
            >
              <option value="">Semua Proyek</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3 h-3" /> Unit
            </label>
            <select
              className="w-full h-11 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              disabled={!selectedProjectId}
            >
              <option value="">Semua Unit</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
            </select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Search className="w-3 h-3" /> Cari Mandor
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nama mandor..."
                className="w-full h-11 glass-input rounded-xl pl-10 pr-4 text-sm font-medium focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden border-none shadow-premium bg-white">
        <Table className="min-w-[1000px]">
          <THead>
            <TR className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
              <TH className="w-12"></TH>
              <TH className="px-6 py-4">Tanggal</TH>
              <TH className="px-6 py-4">Proyek / Unit</TH>
              <TH className="px-6 py-4">Mandor</TH>
              <TH className="px-6 py-4 text-right">Total Opname</TH>
              <TH className="px-6 py-4 text-center">Status</TH>
              <TH className="px-6 py-4 text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={7} className="text-center py-12 italic">Memuat histori...</TD></TR>
            ) : filteredOpnames.length === 0 ? (
              <TR><TD colSpan={7} className="text-center py-20 text-text-muted">Belum ada data opname.</TD></TR>
            ) : (
              filteredOpnames.map((o) => {
                const totalAmt = (o.items || []).reduce((sum: number, item: any) => sum + Number(item.amount_opname), 0);
                const isExpanded = expandedRows[o.id];

                return (
                  <React.Fragment key={o.id}>
                    <TR className={cn(
                      "hover:bg-slate-50 transition-colors border-b border-slate-100",
                      o.status === 'cancelled' && "opacity-50 grayscale italic"
                    )}>
                      <TD className="pl-4">
                        <button onClick={() => toggleExpand(o.id)} className="p-1 hover:bg-slate-100 rounded-lg">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </TD>
                      <TD className="px-6 py-4 font-bold text-sm">{formatDate(o.date)}</TD>
                      <TD className="px-6 py-4">
                        <div className="font-bold text-sm text-text-primary">{o.project?.name}</div>
                        <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">{o.unit?.unit_number || 'Umum'}</div>
                      </TD>
                      <TD className="px-6 py-4 text-sm font-medium">{o.worker_name}</TD>
                      <TD className="px-6 py-4 text-right font-black text-accent-dark">{formatCurrency(totalAmt)}</TD>
                      <TD className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          o.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          o.status === 'paid' ? "bg-blue-50 text-blue-600 border-blue-100" :
                          "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                          {o.status}
                        </span>
                      </TD>
                      <TD className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           {canVoid && o.status !== 'cancelled' && o.status !== 'paid' && (
                             <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-rose-500 hover:bg-rose-50"
                              onClick={() => handleVoid(o.id, o.status)}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           )}
                         </div>
                      </TD>
                    </TR>
                    {isExpanded && (
                      <TR className="bg-slate-50/50">
                        <TD colSpan={7} className="px-12 py-6 border-b border-slate-100">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                              <ClipboardList className="w-4 h-4" /> Rincian Item Pekerjaan
                            </h4>
                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                              <Table>
                                <THead>
                                  <TR className="bg-slate-100/50 text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">
                                    <TH className="px-4 py-3">Uraian Pekerjaan</TH>
                                    <TH className="px-4 py-3 text-center">Progress</TH>
                                    <TH className="px-4 py-3 text-right">Nilai Rupiah</TH>
                                  </TR>
                                </THead>
                                <TBody>
                                  {(o.items || []).map((item: any, idx: number) => (
                                    <TR key={idx} className="border-b border-slate-50 last:border-0">
                                      <TD className="px-4 py-3 text-[11px] font-bold text-text-primary">{item.rab_items?.uraian}</TD>
                                      <TD className="px-4 py-3 text-center">
                                        <span className="text-[11px] font-black text-emerald-600">{Number(item.percentage_opname).toFixed(1)}%</span>
                                      </TD>
                                      <TD className="px-4 py-3 text-right text-[11px] font-black">{formatCurrency(item.amount_opname)}</TD>
                                    </TR>
                                  ))}
                                </TBody>
                              </Table>
                            </div>
                          </div>
                        </TD>
                      </TR>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
};

export default OpnamePage;
