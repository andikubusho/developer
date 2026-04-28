import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  BarChart3, 
  ArrowLeft, 
  Building2, 
  Package, 
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { api } from '../lib/api';
import { cn, formatNumber } from '../lib/utils';

const RABRecap: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';
  
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(initialProjectId);
  const [loading, setLoading] = useState(false);
  const [recapData, setRecapData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchRecap(selectedProject);
    } else {
      setRecapData([]);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    const data = await api.get('projects', 'select=id,name&order=name.asc');
    setProjects(data);
  };

  const fetchRecap = async (projectId: string) => {
    setLoading(true);
    try {
      const data = await api.getBudgetStatus(projectId);
      setRecapData(data);
    } catch (err) {
      console.error('Error fetching recap:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = recapData.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/rab')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Rekapitulasi Material RAB</h1>
            <p className="text-text-secondary font-medium">Monitoring budget vs realisasi pengadaan</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <Card className="p-6 space-y-6 h-fit bg-white border-none shadow-premium lg:sticky lg:top-24">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Pilih Proyek
            </label>
            <select 
              className="w-full h-12 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">Pilih Proyek...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Search className="w-3 h-3" /> Cari Material
            </label>
            <div className="relative">
              <input 
                type="text"
                placeholder="Nama material..."
                className="w-full h-12 glass-input rounded-xl pl-10 pr-4 text-sm font-medium focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
          </div>

          {selectedProject && recapData.length > 0 && (
            <div className="pt-4 border-t border-white/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-text-muted uppercase">Total Item RAB</span>
                <span className="text-sm font-bold text-text-primary">{recapData.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-text-muted uppercase text-rose-500">Over Budget</span>
                <span className="text-sm font-bold text-rose-600">{recapData.filter(d => d.used > d.quota).length}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {!selectedProject ? (
            <Card className="p-20 text-center bg-white/50 border-dashed border-2 border-white/40">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-20 h-20 bg-accent-lavender/20 rounded-full flex items-center justify-center mx-auto">
                  <PieChart className="w-10 h-10 text-accent-dark" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">Silakan Pilih Proyek</h2>
                <p className="text-text-secondary text-sm">Pilih proyek untuk melihat rekapan penggunaan material berdasarkan anggaran (RAB).</p>
              </div>
            </Card>
          ) : loading ? (
            <Card className="p-20 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-accent-dark border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-text-secondary font-bold uppercase text-[10px] tracking-widest">Menganalisis Anggaran...</p>
            </Card>
          ) : filteredData.length === 0 ? (
            <Card className="p-20 text-center">
              <p className="text-text-secondary">Tidak ada data material yang terhubung ke RAB di proyek ini.</p>
            </Card>
          ) : (
            <Card className="p-0 border-none shadow-premium bg-white overflow-hidden">
              <Table>
                <THead>
                  <TR isHoverable={false}>
                    <TH className="pl-6">Material</TH>
                    <TH className="text-center">Satuan</TH>
                    <TH className="text-right">Kuota RAB</TH>
                    <TH className="text-right">Diajukan (PR)</TH>
                    <TH className="text-right">Diterima (GR)</TH>
                    <TH className="text-right">Sisa Kuota</TH>
                    <TH className="pr-6 text-center">Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredData.map((item, idx) => {
                    const remaining = item.quota - item.used;
                    const isOver = remaining < 0;
                    const usagePercent = item.quota > 0 ? (item.used / item.quota) * 100 : 0;
                    
                    return (
                      <TR key={idx}>
                        <TD className="pl-6 py-4 font-bold text-text-primary">{item.name}</TD>
                        <TD className="text-center text-xs font-black text-text-muted uppercase">{item.unit}</TD>
                        <TD className="text-right font-bold">{formatNumber(item.quota)}</TD>
                        <TD className={cn("text-right font-bold", item.used > 0 ? "text-accent-dark" : "text-text-muted")}>
                          {formatNumber(item.used)}
                        </TD>
                        <TD className={cn("text-right font-bold", item.received > 0 ? "text-emerald-600" : "text-text-muted")}>
                          {formatNumber(item.received)}
                        </TD>
                        <TD className={cn("text-right font-black", isOver ? "text-rose-600" : "text-emerald-700")}>
                          {formatNumber(remaining)}
                        </TD>
                        <TD className="pr-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isOver ? (
                              <div className="flex items-center gap-1 text-rose-600" title="Over Budget!">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase">OVER</span>
                              </div>
                            ) : remaining === 0 ? (
                              <div className="flex items-center gap-1 text-text-muted" title="Habis">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase">FULL</span>
                              </div>
                            ) : (
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden" title={`${usagePercent.toFixed(1)}% Terpakai`}>
                                <div 
                                  className={cn("h-full transition-all", usagePercent > 90 ? "bg-amber-500" : "bg-emerald-500")}
                                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RABRecap;
