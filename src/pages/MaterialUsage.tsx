import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HardHat, 
  Plus, 
  Trash2, 
  ArrowLeft,
  Calendar,
  Building2,
  Package,
  Save,
  AlertCircle,
  FileSpreadsheet,
  Home,
  Search
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { formatNumber, cn } from '../lib/utils';
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
  stock?: number; 
}

const MaterialUsage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projectStocks, setProjectStocks] = useState<Record<string, number>>({});
  
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [items, setItems] = useState<{
    materialId: string;
    qty: number;
    notes: string;
  }[]>([]);
  const [materialSearch, setMaterialSearch] = useState('');

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(materialSearch.toLowerCase())
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectStocks(selectedProject);
      fetchUnits(selectedProject);
    } else {
      setUnits([]);
      setSelectedUnit('');
    }
  }, [selectedProject]);

  const fetchData = async () => {
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

  const fetchProjectStocks = async (projectId: string) => {
    try {
      const data = await api.get('project_material_stocks', `project_id=eq.${projectId}`);
      const stocks: Record<string, number> = {};
      data.forEach((s: any) => {
        stocks[s.material_id] = Number(s.stock);
      });
      setProjectStocks(stocks);
    } catch (err) {
      console.error('Error fetching project stocks:', err);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { materialId: '', qty: 1, notes: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!selectedProject || !selectedUnit || items.length === 0) {
      alert('Pilih proyek, unit, dan masukkan minimal 1 item pemakaian');
      return;
    }

    // Validation
    for (const item of items) {
      if (!item.materialId || item.qty <= 0) {
        alert('Pastikan semua item memiliki material dan jumlah yang valid');
        return;
      }
      const available = projectStocks[item.materialId] || 0;
      if (item.qty > available) {
        alert(`Stok tidak mencukupi untuk material: ${materials.find(m => m.id === item.materialId)?.name}. Tersedia: ${available}`);
        return;
      }
    }

    try {
      setLoading(true);
      const unitName = units.find(u => u.id === selectedUnit)?.unitNumber;
      
      const transactions = items.map(item => ({
        materialId: item.materialId,
        projectId: selectedProject,
        unitId: selectedUnit,
        transactionType: 'USAGE',
        qtyChange: -item.qty, 
        notes: `Pemakaian Unit ${unitName}: ${item.notes || notes}`
      }));

      const res = await fetch('/api/material-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal memproses pemakaian');
      }

      alert('Pemakaian material berhasil dicatat!');
      navigate('/materials');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
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
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Pemakaian Material</h1>
            <p className="text-text-secondary font-medium">Alokasikan pengeluaran material ke unit proyek</p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit} 
          className="rounded-xl h-12 px-8 shadow-glass bg-orange-600 hover:bg-orange-700"
          isLoading={loading}
        >
          <Save className="w-5 h-5 mr-2" /> Simpan Pemakaian
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Info */}
        <Card className="lg:col-span-1 p-6 space-y-6 bg-white border-none shadow-premium">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Proyek Lokasi
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
              <Home className="w-3 h-3" /> Unit Properti
            </label>
            <select 
              className="w-full h-12 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none disabled:opacity-50"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              disabled={!selectedProject}
            >
              <option value="">{selectedProject ? 'Pilih Unit...' : 'Pilih Proyek Dulu'}</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Tanggal Pakai
            </label>
            <Input 
              type="date" 
              value={usageDate}
              onChange={(e) => setUsageDate(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Catatan Pekerjaan</label>
            <textarea 
              className="w-full h-24 glass-input rounded-xl p-4 text-sm font-medium focus:outline-none resize-none"
              placeholder="Contoh: Pekerjaan pondasi, Pasang dinding Lt 2..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          
          {selectedUnit && (
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
              <p className="text-[11px] font-medium text-orange-700 leading-relaxed">
                Pemakaian ini akan divalidasi terhadap kuota RAB Unit <b>{units.find(u => u.id === selectedUnit)?.unitNumber}</b>.
              </p>
            </div>
          )}
        </Card>

        {/* Right Column: Items Table */}
        <Card className="lg:col-span-2 p-0 border-none shadow-premium bg-white overflow-hidden">
          <div className="p-6 border-b border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-accent-dark" />
                <h2 className="font-black text-text-primary uppercase tracking-tight">Detail Pemakaian</h2>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Cari..."
                  className="h-8 pl-9 pr-4 rounded-pill bg-white/50 border border-white/40 text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-accent-lavender w-32"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                />
              </div>
            </div>
            <Button variant="ghost" onClick={handleAddItem} className="h-10 px-4 rounded-pill bg-accent-lavender/10 text-primary hover:bg-accent-lavender/20">
              <Plus className="w-4 h-4 mr-2" /> Tambah Baris
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table className="w-full">
              <THead>
                <TR isHoverable={false}>
                  <TH className="w-1/2">Material</TH>
                  <TH className="text-center">Stok Proyek</TH>
                  <TH className="text-center">Jumlah Pakai</TH>
                  <TH className="text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {items.length === 0 ? (
                  <TR isHoverable={false}>
                    <TD colSpan={4} className="py-20 text-center text-text-muted">
                      <HardHat className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-bold uppercase text-[10px] tracking-widest">Klik "Tambah Baris" untuk mencatat pemakaian</p>
                    </TD>
                  </TR>
                ) : items.map((item, index) => {
                  const available = projectStocks[item.materialId] || 0;
                  const isExceeded = item.qty > available;
                  
                  return (
                    <TR key={index} isHoverable={false}>
                      <TD className="py-4">
                        <select 
                          className="w-full h-10 glass-input rounded-lg px-3 text-sm font-bold focus:outline-none"
                          value={item.materialId}
                          onChange={(e) => handleItemChange(index, 'materialId', e.target.value)}
                        >
                          <option value="">Pilih Material...</option>
                          {filteredMaterials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                        </select>
                      </TD>
                      <TD className="text-center font-black text-text-secondary text-sm">
                        {formatNumber(available)}
                      </TD>
                      <TD className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Input 
                            type="number"
                            className={cn(
                              "h-10 w-24 text-center font-black rounded-lg",
                              isExceeded ? "border-rose-500 text-rose-600 bg-rose-50" : ""
                            )}
                            value={item.qty}
                            onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))}
                          />
                          {isExceeded && <span className="text-[9px] font-black text-rose-600 uppercase tracking-tighter">Stok Kurang!</span>}
                        </div>
                      </TD>
                      <TD className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-9 w-9 p-0 rounded-lg text-rose-500 hover:bg-rose-50"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
};

export default MaterialUsage;
