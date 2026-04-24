import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { api } from '../lib/api';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { Material } from '../types';

const MasterMaterial: React.FC = () => {
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
    unit_price: 0
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
      setForm({ name: '', unit: '', stock: 0, min_stock: 10, unit_price: 0 });
      fetchMaterials();
    } catch (error) {
      console.error('Error saving material:', error);
      alert('Gagal menyimpan data material');
    } finally {
      setLoading(false);
    }
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
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Master Material</h1>
          <p className="text-slate-500 font-medium">Manajemen data stok dan harga satuan material konstruksi</p>
        </div>
        <Button onClick={() => { setEditingMaterial(null); setForm({ name: '', unit: '', stock: 0, min_stock: 10, unit_price: 0 }); setIsModalOpen(true); }} className="rounded-2xl h-12 px-8">
          <Plus className="w-5 h-5 mr-2" /> Tambah Material
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-primary">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Jenis</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalTypes} Material</p>
          </div>
        </Card>
        <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", stats.lowStock > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stok Kritis/Habis</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.lowStock} Item</p>
          </div>
        </Card>
        <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nilai Inventori</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(stats.totalValue)}</p>
          </div>
        </Card>
      </div>

      {/* Search & Table */}
      <Card className="p-0 border-none shadow-premium overflow-hidden bg-white">
        <div className="p-6 border-b border-slate-50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari material..." 
              className="pl-12 h-12 bg-slate-50 border-none rounded-xl"
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
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Memuat Data Material...</p>
                  </TD>
                </TR>
              ) : filteredMaterials.map((m) => {
                const status = getStockStatus(m.stock, m.min_stock);
                const totalValue = m.stock * ((m as any).unit_price || 0);
                return (
                  <TR key={m.id}>
                    <TD className="font-black text-slate-900">{m.name}</TD>
                    <TD><span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">{m.unit}</span></TD>
                    <TD className="font-bold text-slate-600">{formatCurrency((m as any).unit_price || 0)}</TD>
                    <TD className="font-black text-slate-900">{formatNumber(m.stock)}</TD>
                    <TD className="text-slate-400 font-bold">{formatNumber(m.min_stock)}</TD>
                    <TD>
                      <span className={cn("px-3 py-1 rounded-full text-[9px] font-black border tracking-widest", status.color)}>
                        {status.label}
                      </span>
                    </TD>
                    <TD className="text-right font-black text-slate-900">{formatCurrency(totalValue)}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingMaterial(m); setForm({ name: m.name, unit: m.unit, stock: m.stock, min_stock: m.min_stock, unit_price: (m as any).unit_price || 0 }); setIsModalOpen(true); }} className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100">
                          <Pencil className="w-4 h-4 text-indigo-600" />
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
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input 
              label="Nama Material"
              placeholder="Contoh: Semen Gresik, Besi 10mm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Satuan</label>
                <select 
                  className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  required
                >
                  <option value="">Pilih Satuan</option>
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
              <Input 
                label="Harga Satuan (Rp)"
                type="number"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label={editingMaterial ? "Total Stok Saat Ini" : "Stok Awal"}
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                required
              />
              <Input 
                label="Batas Minimal Stok"
                type="number"
                value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1" isLoading={loading}>
              {editingMaterial ? "Simpan Perubahan" : "Tambahkan Material"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MasterMaterial;
