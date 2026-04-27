import React, { useEffect, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  ArrowRightLeft, 
  ArrowLeft,
  Building2,
  RefreshCw,
  History,
  Truck,
  HardHat
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { formatNumber, cn } from '../lib/utils';

interface Project {
  id: string;
  name: string;
}

interface Material {
  id: string;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
  specification?: string;
}

const Materials: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projectStocks, setProjectStocks] = useState<Record<string, number>>({});
  
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectStocks(selectedProject);
    }
  }, [selectedProject]);

  const fetchBaseData = async () => {
    try {
      setLoading(true);
      const [resProj, resMat] = await Promise.all([
        api.get('projects', 'select=id,name&order=name.asc'),
        api.get('materials', 'select=*&order=name.asc')
      ]);
      setProjects(resProj || []);
      setMaterials(resMat || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectStocks = async (projectId: string) => {
    try {
      setLoading(true);
      const data = await api.get('project_material_stocks', `project_id=eq.${projectId}`);
      const stocks: Record<string, number> = {};
      data.forEach((s: any) => {
        const matId = s.material_id || s.materialId;
        if (matId) {
          stocks[matId] = Number(s.stock);
        }
      });
      setProjectStocks(stocks);
    } catch (err) {
      console.error('Error fetching project stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const displayMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Stok Material</h1>
            <p className="text-text-secondary font-medium">Monitoring persediaan material di setiap lokasi proyek</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate('/goods-receipt')} className="rounded-xl h-12 bg-white">
            <Truck className="w-5 h-5 mr-2 text-emerald-600" /> Terima Barang
          </Button>
          <Button variant="outline" onClick={() => navigate('/material-usage')} className="rounded-xl h-12 bg-white">
            <HardHat className="w-5 h-5 mr-2 text-orange-600" /> Catat Pakai
          </Button>
          <Button onClick={() => navigate('/stock-card')} className="rounded-xl h-12 px-6 shadow-premium">
            <History className="w-5 h-5 mr-2" /> Riwayat/Kartu Stok
          </Button>
        </div>
      </div>

      {/* Project Selector & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-accent-dark text-white border-none shadow-premium lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-accent-lavender" />
              <h3 className="font-black uppercase text-xs tracking-widest">Pilih Lokasi Proyek</h3>
            </div>
            <select 
              className="w-full h-12 bg-white/10 border border-white/20 rounded-xl px-4 text-sm font-bold focus:outline-none focus:bg-white/20 transition-all text-white"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="" className="text-gray-900">Global (Master Material)</option>
              {projects.map(p => <option key={p.id} value={p.id} className="text-gray-900">{p.name}</option>)}
            </select>
            <p className="text-[10px] opacity-70 leading-relaxed italic">
              *Pilih proyek untuk melihat saldo stok aktual di lapangan.
            </p>
          </div>
        </Card>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
              <div className="w-14 h-14 rounded-xl bg-accent-lavender/20 flex items-center justify-center text-primary">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Total Jenis Material</p>
                <p className="text-2xl font-black text-text-primary tracking-tight">{materials.length} Item</p>
              </div>
           </Card>
           <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
              <div className="w-14 h-14 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Stok Menipis / Habis</p>
                <p className="text-2xl font-black text-rose-600 tracking-tight">
                  {selectedProject 
                    ? materials.filter(m => (projectStocks[m.id] || 0) <= m.min_stock).length 
                    : materials.filter(m => m.stock <= m.min_stock).length
                  } Item
                </p>
              </div>
           </Card>
        </div>
      </div>

      {/* Material Table */}
      <Card className="p-0 border-none shadow-premium overflow-hidden bg-white">
        <div className="p-6 border-b border-white/20 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari material..." 
              className="pl-12 h-12 glass-input border-none rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full">
            <THead>
              <TR isHoverable={false}>
                <TH>Nama Material</TH>
                <TH>Spesifikasi</TH>
                <TH>Satuan</TH>
                <TH className="text-center">{selectedProject ? 'Stok Proyek' : 'Stok Global'}</TH>
                <TH className="text-center">Min. Stok</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR isHoverable={false}>
                  <TD colSpan={7} className="py-20 text-center">
                    <RefreshCw className="w-8 h-8 text-accent-dark animate-spin mx-auto mb-4" />
                    <p className="text-text-muted font-bold uppercase text-[10px] tracking-widest">Memuat Persediaan...</p>
                  </TD>
                </TR>
              ) : displayMaterials.map((m) => {
                const currentStock = selectedProject ? (projectStocks[m.id] || 0) : m.stock;
                const isCritical = currentStock <= m.min_stock;
                
                return (
                  <TR key={m.id}>
                    <TD className="font-black text-text-primary">{m.name}</TD>
                    <TD className="text-[10px] text-text-secondary font-medium max-w-[200px] truncate">{m.specification || '-'}</TD>
                    <TD>
                      <span className="px-3 py-1 rounded-xl bg-white/40 text-text-secondary text-[10px] font-black uppercase tracking-widest">
                        {m.unit}
                      </span>
                    </TD>
                    <TD className="text-center">
                      <span className={cn(
                        "text-lg font-black",
                        isCritical ? "text-rose-600" : "text-text-primary"
                      )}>
                        {formatNumber(currentStock)}
                      </span>
                    </TD>
                    <TD className="text-center text-text-muted font-bold">{formatNumber(m.min_stock)}</TD>
                    <TD>
                      {isCritical ? (
                        <span className="px-3 py-1 rounded-full text-[9px] font-black bg-rose-100 text-rose-600 border border-rose-200 uppercase tracking-widest">Kritis / Habis</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-600 border border-emerald-200 uppercase tracking-widest">Tersedia</span>
                      )}
                    </TD>
                    <TD className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl hover:bg-accent-lavender/10 text-primary"
                        onClick={() => navigate(`/stock-card?materialId=${m.id}${selectedProject ? `&projectId=${selectedProject}` : ''}`)}
                      >
                        <History className="w-4 h-4 mr-2" /> Kartu Stok
                      </Button>
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

export default Materials;
