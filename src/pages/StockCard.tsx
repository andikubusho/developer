import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, 
  Search, 
  Filter, 
  ArrowLeft,
  Building2,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  FileText,
  Home
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { formatDate, formatNumber, cn } from '../lib/utils';
import { api } from '../lib/api';

interface Project {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitNumber: string;
}

interface Material {
  id: string;
  name: string;
  unit: string;
}

interface StockLog {
  id: number;
  material_id: string;
  project_id: string;
  unit_id?: string;
  transaction_type: string;
  qty_change: string;
  qty_before: string;
  qty_after: string;
  created_at: string;
  notes: string;
}

const StockCard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchUnits(selectedProject);
    } else {
      setUnits([]);
      setSelectedUnit('');
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchLogs();
  }, [selectedProject, selectedUnit, selectedMaterial]);

  const fetchBaseData = async () => {
    try {
      const [resProj, resMat] = await Promise.all([
        api.get('projects', 'select=id,name&order=name.asc'),
        api.get('materials', 'select=id,name,unit&order=name.asc')
      ]);
      setProjects(resProj || []);
      setMaterials(resMat || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const fetchUnits = async (projectId: string) => {
    try {
      const data = await api.get('units', `select=id,unitNumber:unit_number&project_id=eq.${projectId}&order=unit_number.asc`);
      setUnits(data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = '/api/material-stock-logs?';
      if (selectedProject) url += `projectId=${selectedProject}&`;
      if (selectedUnit) url += `unitId=${selectedUnit}&`;
      if (selectedMaterial) url += `materialId=${selectedMaterial}&`;
      
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionLabel = (type: string) => {
    switch(type) {
      case 'GR': return { label: 'MASUK', color: 'text-emerald-600 bg-emerald-50', icon: ArrowDownLeft };
      case 'USAGE': return { label: 'KELUAR', color: 'text-orange-600 bg-orange-50', icon: ArrowUpRight };
      case 'ADJUSTMENT': return { label: 'PENYESUAIAN', color: 'text-blue-600 bg-blue-50', icon: RefreshCw };
      default: return { label: type, color: 'text-gray-600 bg-gray-50', icon: FileText };
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Kartu Stok</h1>
            <p className="text-text-secondary font-medium">Lacak mutasi material hingga level Unit Properti</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-white border-none shadow-premium">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Proyek
            </label>
            <select 
              className="w-full h-10 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">Semua Proyek...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Home className="w-3 h-3" /> Unit
            </label>
            <select 
              className="w-full h-10 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none disabled:opacity-50"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              disabled={!selectedProject}
            >
              <option value="">{selectedProject ? 'Semua Unit...' : 'Pilih Proyek Dulu'}</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Package className="w-3 h-3" /> Material
            </label>
            <select 
              className="w-full h-10 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none"
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
            >
              <option value="">Semua Material...</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <Button 
              variant="outline" 
              className="w-full h-10 rounded-xl border-white/40 hover:bg-white/30"
              onClick={fetchLogs}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading ? "animate-spin" : "")} /> Segarkan
            </Button>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="p-0 border-none shadow-premium bg-white overflow-hidden">
        <div className="p-6 border-b border-white/20 flex items-center gap-2">
          <History className="w-5 h-5 text-accent-dark" />
          <h2 className="font-black text-text-primary uppercase tracking-tight">Riwayat Mutasi Stok</h2>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full">
            <THead>
              <TR isHoverable={false}>
                <TH>Tanggal & Jam</TH>
                <TH>Material</TH>
                <TH>Alokasi</TH>
                <TH>Tipe</TH>
                <TH className="text-center">Awal</TH>
                <TH className="text-center">Mutasi</TH>
                <TH className="text-center">Akhir</TH>
                <TH>Keterangan</TH>
              </TR>
            </THead>
            <TBody>
              {loading && logs.length === 0 ? (
                <TR isHoverable={false}>
                  <TD colSpan={8} className="py-20 text-center">
                    <RefreshCw className="w-8 h-8 text-accent-dark animate-spin mx-auto mb-4" />
                    <p className="text-text-muted font-bold uppercase text-[10px] tracking-widest">Mengambil Riwayat...</p>
                  </TD>
                </TR>
              ) : logs.length === 0 ? (
                <TR isHoverable={false}>
                  <TD colSpan={8} className="py-20 text-center text-text-muted">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-bold uppercase text-[10px] tracking-widest">Tidak ada data mutasi ditemukan</p>
                  </TD>
                </TR>
              ) : logs.map((log) => {
                const trans = getTransactionLabel(log.transaction_type);
                const mat = materials.find(m => m.id === log.material_id);
                const proj = projects.find(p => p.id === log.project_id);
                
                return (
                  <TR key={log.id}>
                    <TD className="text-[11px] font-bold text-text-secondary whitespace-nowrap">
                      {formatDate(log.created_at)}
                      <div className="text-[9px] opacity-60">{new Date(log.created_at).toLocaleTimeString()}</div>
                    </TD>
                    <TD>
                      <div className="font-black text-text-primary text-xs">{mat?.name || 'Unknown'}</div>
                    </TD>
                    <TD>
                      <div className="text-[10px] font-black text-accent-dark uppercase">{proj?.name || '-'}</div>
                      {log.unit_id && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-text-muted">
                          <Home className="w-2.5 h-2.5" /> Unit ID: {log.unit_id.substring(0,8)}...
                        </div>
                      )}
                    </TD>
                    <TD>
                      <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black flex items-center w-fit gap-1", trans.color)}>
                        <trans.icon className="w-3 h-3" /> {trans.label}
                      </span>
                    </TD>
                    <TD className="text-center font-bold text-text-muted text-xs">{formatNumber(Number(log.qty_before))}</TD>
                    <TD className="text-center">
                      <span className={cn(
                        "font-black text-sm",
                        Number(log.qty_change) > 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {Number(log.qty_change) > 0 ? '+' : ''}{formatNumber(Number(log.qty_change))}
                      </span>
                      <span className="text-[9px] font-bold text-text-muted ml-1">{mat?.unit}</span>
                    </TD>
                    <TD className="text-center font-black text-text-primary text-sm">{formatNumber(Number(log.qty_after))}</TD>
                    <TD className="text-xs text-text-secondary font-medium italic max-w-[200px]">
                      {log.notes || '-'}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default StockCard;
