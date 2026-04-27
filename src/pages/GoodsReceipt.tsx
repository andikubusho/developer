import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, 
  Plus, 
  Search, 
  Trash2, 
  ArrowLeft,
  Calendar,
  Building2,
  Package,
  Save,
  CheckCircle2,
  FileText,
  Home
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
}

interface PO {
  id: string;
  projectId: string;
  createdAt: string;
}

const GoodsReceipt: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedPO, setSelectedPO] = useState('');
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
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
      fetchUnits(selectedProject);
    } else {
      setUnits([]);
      setSelectedUnit('');
    }
  }, [selectedProject]);

  const fetchData = async () => {
    try {
      const [resProj, resMat, resPO] = await Promise.all([
        api.get('projects', 'select=id,name&order=name.asc'),
        api.get('materials', 'select=id,name,unit&order=name.asc'),
        api.get('purchase_orders', 'select=*&order=created_at.desc')
      ]);
      setProjects(resProj || []);
      setMaterials(resMat || []);
      setPos(resPO || []);
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
    if (!selectedProject || items.length === 0) {
      alert('Pilih proyek dan masukkan minimal 1 item');
      return;
    }

    if (items.some(i => !i.materialId || i.qty <= 0)) {
      alert('Pastikan semua item memiliki material dan jumlah yang valid');
      return;
    }

    try {
      setLoading(true);
      const transactions = items.map(item => ({
        materialId: item.materialId,
        projectId: selectedProject,
        unitId: selectedUnit || null,
        transactionType: 'GR',
        qtyChange: item.qty,
        referenceType: selectedPO ? 'PO' : null,
        referenceId: selectedPO || null,
        notes: `Penerimaan Barang${selectedUnit ? ` (Unit ${units.find(u => u.id === selectedUnit)?.unitNumber})` : ''}: ${item.notes || notes}`
      }));

      const res = await fetch('/api/material-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal memproses penerimaan');
      }

      alert('Penerimaan barang berhasil diproses dan stok telah diperbarui!');
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
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Penerimaan Barang</h1>
            <p className="text-text-secondary font-medium">Input logistik masuk untuk proyek & unit</p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit} 
          className="rounded-xl h-12 px-8 shadow-glass bg-emerald-600 hover:bg-emerald-700"
          isLoading={loading}
        >
          <Save className="w-5 h-5 mr-2" /> Simpan Penerimaan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Info */}
        <Card className="lg:col-span-1 p-6 space-y-6 bg-white border-none shadow-premium">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Proyek Tujuan
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
              <Home className="w-3 h-3" /> Unit Properti (Opsional)
            </label>
            <select 
              className="w-full h-12 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none disabled:opacity-50"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              disabled={!selectedProject}
            >
              <option value="">{selectedProject ? 'Stok Umum Proyek' : 'Pilih Proyek Dulu'}</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3 h-3" /> Referensi PO (Opsional)
            </label>
            <select 
              className="w-full h-12 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none"
              value={selectedPO}
              onChange={(e) => setSelectedPO(e.target.value)}
            >
              <option value="">Tanpa PO...</option>
              {pos.filter(p => p.projectId === selectedProject).map(p => (
                <option key={p.id} value={p.id}>PO #{p.id.substring(0,8)} - {new Date(p.createdAt).toLocaleDateString()}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Tanggal Terima
            </label>
            <Input 
              type="date" 
              value={receiveDate}
              onChange={(e) => setReceiveDate(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Catatan Umum</label>
            <textarea 
              className="w-full h-24 glass-input rounded-xl p-4 text-sm font-medium focus:outline-none resize-none"
              placeholder="Contoh: Barang datang via ekspedisi Jaya, kondisi baik..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </Card>

        {/* Right Column: Items Table */}
        <Card className="lg:col-span-2 p-0 border-none shadow-premium bg-white overflow-hidden">
          <div className="p-6 border-b border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-accent-dark" />
                <h2 className="font-black text-text-primary uppercase tracking-tight">Detail Barang Masuk</h2>
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
                  <TH className="w-1/4 text-center">Jumlah (Qty)</TH>
                  <TH className="text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {items.length === 0 ? (
                  <TR isHoverable={false}>
                    <TD colSpan={3} className="py-20 text-center text-text-muted">
                      <Truck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-bold uppercase text-[10px] tracking-widest">Belum ada item yang ditambahkan</p>
                    </TD>
                  </TR>
                ) : items.map((item, index) => (
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
                    <TD className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Input 
                          type="number"
                          className="h-10 w-24 text-center font-black rounded-lg"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))}
                        />
                        <span className="text-[10px] font-black text-text-muted uppercase">
                          {materials.find(m => m.id === item.materialId)?.unit || '-'}
                        </span>
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
                ))}
              </TBody>
            </Table>
          </div>
          
          {items.length > 0 && (
            <div className="p-6 bg-glass/20 border-t border-white/20">
              <div className="flex items-center gap-3 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-xs font-bold uppercase tracking-widest">Siap diproses untuk stok proyek</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GoodsReceipt;
