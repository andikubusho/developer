import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Pencil, 
  Trash2, 
  RefreshCw,
  MoreVertical,
  ChevronRight,
  Download,
  Upload,
  FileSpreadsheet,
  ArrowLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { api } from '../lib/api';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { Material } from '../types';
import { useAuth } from '../contexts/AuthContext';

const MasterMaterial: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [form, setForm] = useState({
    name: '',
    unit: '',
    stock: 0,
    min_stock: 10,
    unit_price: 0,
    specification: ''
  });

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await api.get('materials', 'select=*&order=name.asc');
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingMaterial) {
        await api.update('materials', editingMaterial.id, form);
      } else {
        await api.insert('materials', form);
      }
      setIsModalOpen(false);
      setEditingMaterial(null);
      setForm({ name: '', unit: '', stock: 0, min_stock: 10, unit_price: 0, specification: '' });
      fetchMaterials();
    } catch (error) {
      console.error('Error saving material:', error);
      alert('Gagal menyimpan data material');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        'Nama Material': '',
        'Spesifikasi': '',
        'Satuan': 'Pilih: Sak, m³, Batang, kg, Liter, Lembar, m², Unit',
        'Volume': 0,
        'Harga Satuan': 0,
        'Min Stok': 10
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Master_Material.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const mappedData = data.map((item: any) => ({
          name: item['Nama Material'],
          specification: item['Spesifikasi'] || '',
          unit: item['Satuan'] || 'Unit',
          stock: Number(item['Volume']) || 0,
          unit_price: Number(item['Harga Satuan']) || 0,
          min_stock: Number(item['Min Stok']) || 10
        })).filter(i => i.name);

        if (mappedData.length === 0) {
          alert('Tidak ada data valid untuk diimpor');
          return;
        }

        // Insert in bulk
        await api.insert('materials', mappedData);
        alert(`Berhasil mengimpor ${mappedData.length} material!`);
        fetchMaterials();
      } catch (err) {
        console.error('Import error:', err);
        alert('Gagal mengimpor file. Pastikan format benar.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus material ini?')) return;
    try {
      setLoading(true);
      await api.delete('materials', id);
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Gagal menghapus material');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { label: 'HABIS', color: 'bg-rose-100 text-rose-600 border-rose-200' };
    if (stock < minStock) return { label: 'KRITIS', color: 'bg-amber-100 text-amber-600 border-amber-200' };
    return { label: 'AMAN', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    totalTypes: materials.length,
    lowStock: materials.filter(m => m.stock < m.min_stock).length,
    totalValue: materials.reduce((sum, m) => sum + (m.stock * (m as any).unit_price || 0), 0)
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Master Material</h1>
            <p className="text-text-secondary font-medium">Manajemen data stok dan harga satuan material konstruksi</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={handleDownloadTemplate} className="rounded-xl h-12 px-6 bg-white border border-white/40 hover:bg-white/30">
            <Download className="w-5 h-5 mr-2 text-accent-dark" /> Template Excel
          </Button>
          <label className="relative cursor-pointer">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleImportExcel}
            />
            <div className="flex items-center justify-center rounded-xl h-12 px-6 bg-white border border-white/40 hover:bg-white/30 font-bold text-text-primary transition-all">
              <Upload className="w-5 h-5 mr-2 text-emerald-600" /> Upload Excel
            </div>
          </label>
          <Button onClick={() => { setEditingMaterial(null); setForm({ name: '', unit: '', stock: 0, min_stock: 10, unit_price: 0, specification: '' }); setIsModalOpen(true); }} className="rounded-xl h-12 px-8 shadow-glass shadow-glass">
            <Plus className="w-5 h-5 mr-2" /> Tambah Manual
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-accent-lavender/20 flex items-center justify-center text-primary">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Total Jenis</p>
            <p className="text-2xl font-black text-text-primary tracking-tight">{stats.totalTypes} Material</p>
          </div>
        </Card>
        <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
          <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", stats.lowStock > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Stok Kritis/Habis</p>
            <p className="text-2xl font-black text-text-primary tracking-tight">{stats.lowStock} Item</p>
          </div>
        </Card>
        <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Nilai Inventori</p>
            <p className="text-2xl font-black text-text-primary tracking-tight">{formatCurrency(stats.totalValue)}</p>
          </div>
        </Card>
      </div>

      {/* Search & Table */}
      <Card className="p-0 border-none shadow-premium overflow-hidden bg-white">
        <div className="p-6 border-b border-white/20 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari material..." 
              className="pl-12 h-12 glass-input border-none rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                <TH>Harga Satuan</TH>
                <TH>Stok</TH>
                <TH>Min. Stok</TH>
                <TH>Status</TH>
                <TH className="text-right">Total Nilai</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading && materials.length === 0 ? (
                <TR isHoverable={false}>
                  <TD colSpan={8} className="text-center py-20">
                    <RefreshCw className="w-8 h-8 text-accent-dark animate-spin mx-auto mb-4" />
                    <p className="text-text-muted font-bold uppercase text-[10px] tracking-widest">Memuat Data Material...</p>
                  </TD>
                </TR>
              ) : filteredMaterials.map((m) => {
                const status = getStockStatus(m.stock, m.min_stock);
                const totalValue = m.stock * ((m as any).unit_price || 0);
                return (
                  <TR key={m.id}>
                    <TD className="font-black text-text-primary">{m.name}</TD>
                    <TD className="text-[10px] text-text-secondary font-medium max-w-[200px] truncate">{m.specification || '-'}</TD>
                    <TD><span className="px-3 py-1 rounded-xl bg-white/40 text-text-secondary text-[10px] font-black uppercase tracking-widest">{m.unit}</span></TD>
                    <TD className="font-bold text-text-secondary">{formatCurrency((m as any).unit_price || 0)}</TD>
                    <TD className="font-black text-text-primary">{formatNumber(m.stock)}</TD>
                    <TD className="text-text-muted font-bold">{formatNumber(m.min_stock)}</TD>
                    <TD>
                      <span className={cn("px-3 py-1 rounded-full text-[9px] font-black border tracking-widest", status.color)}>
                        {status.label}
                      </span>
                    </TD>
                    <TD className="text-right font-black text-text-primary">{formatCurrency(totalValue)}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingMaterial(m); setForm({ name: m.name, unit: m.unit, stock: m.stock, min_stock: m.min_stock, unit_price: (m as any).unit_price || 0, specification: m.specification || '' }); setIsModalOpen(true); }} className="h-9 w-9 p-0 rounded-xl hover:bg-white/40">
                          <Pencil className="w-4 h-4 text-accent-dark" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="h-9 w-9 p-0 rounded-xl hover:bg-rose-50">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMaterial ? "Edit Material" : "Tambah Material Baru"}
        size="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Nama Material</label>
              <Input 
                placeholder="Contoh: Semen Gresik, Besi 10mm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Spesifikasi Detail</label>
              <Input 
                placeholder="Contoh: Ukuran, Merk, Standar SNI, dll."
                value={form.specification}
                onChange={(e) => setForm({ ...form, specification: e.target.value })}
                className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Jenis Satuan</label>
              <select 
                className="w-full h-14 glass-input rounded-xl px-6 text-base font-bold text-text-primary glass-input focus:outline-none transition-all shadow-glass"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                required
              >
                <option value="">Pilih Satuan...</option>
                <option value="Sak">Sak (Semen)</option>
                <option value="m³">m³ (Pasir/Batu)</option>
                <option value="Batang">Batang (Besi/Kayu)</option>
                <option value="kg">kg (Paku/Kawat)</option>
                <option value="Liter">Liter (Cat/Cairan)</option>
                <option value="Lembar">Lembar (Triplek/Seng)</option>
                <option value="m²">m² (Keramik/Granit)</option>
                <option value="Unit">Unit (Pintu/Jendela)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Harga Satuan (Rp)</label>
              <Input 
                type="number"
                placeholder="0"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
                className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">
                {editingMaterial ? "Total Stok Saat Ini" : "Stok Awal (Volume)"}
              </label>
              <Input 
                type="number"
                placeholder="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Batas Minimal Stok</label>
              <Input 
                type="number"
                placeholder="10"
                value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
                className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
                required
              />
            </div>
          </div>
          
          <div className="pt-6 flex gap-4">
            <Button type="button" variant="ghost" className="flex-1 h-14 rounded-xl text-base font-bold" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1 h-14 rounded-xl text-base font-extrabold shadow-glass shadow-glass" isLoading={loading}>
              {editingMaterial ? "Simpan Perubahan" : "Tambahkan Material"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MasterMaterial;
