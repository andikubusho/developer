import React, { useEffect, useState, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Search, 
  ArrowLeft,
  RefreshCw,
  History,
  Truck,
  HardHat,
  Plus,
  Tag,
  Pencil
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatNumber, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

interface MasterMaterial {
  id: string;
  name: string;
  unit: string;
  code?: string;
}

interface MaterialVariant {
  id: number;
  material_id: string;
  merk: string;
  spesifikasi: string;
  stok: number;
  harga_terakhir: number;
  supplier_default?: number;
}

const Materials: React.FC = () => {
  const navigate = useNavigate();
  const [masters, setMasters] = useState<MasterMaterial[]>([]);
  const [variants, setVariants] = useState<MaterialVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('detail');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<MaterialVariant | null>(null);
  const [form, setForm] = useState({
    material_id: '',
    merk: '',
    spesifikasi: '',
    supplier_default: null as number | null
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resMaster, resVariant] = await Promise.all([
        api.get('materials', 'select=id,name,unit,code&order=name.asc'),
        api.get('material_variants', 'select=*&order=material_id.asc,merk.asc')
      ]);
      setMasters(resMaster || []);
      setVariants(resVariant || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const masterSummary = useMemo(() => {
    return masters.map(m => {
      const relatedVariants = variants.filter(v => v.material_id === m.id);
      const totalStok = relatedVariants.reduce((sum, v) => sum + Number(v.stok || 0), 0);
      return { ...m, totalStok, variantCount: relatedVariants.length };
    });
  }, [masters, variants]);

  const filteredData = useMemo(() => {
    if (viewMode === 'summary') {
      return masterSummary.filter(m => 
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.code || '').toLowerCase().includes(search.toLowerCase())
      );
    } else {
      return variants.filter(v => {
        const master = masters.find(m => m.id === v.material_id);
        const searchStr = `${v.merk} ${master?.name} ${master?.code || ''}`.toLowerCase();
        return searchStr.includes(search.toLowerCase());
      });
    }
  }, [viewMode, search, masterSummary, variants, masters]);

  const handleSubmitVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingVariant) {
        await api.update('material_variants', editingVariant.id, form);
      } else {
        await api.insert('material_variants', { ...form, stok: 0 });
      }
      setIsModalOpen(false);
      setEditingVariant(null);
      setForm({ material_id: '', merk: '', spesifikasi: '', supplier_default: null });
      fetchData();
    } catch (error) {
      console.error('Error saving variant:', error);
      alert('Gagal menyimpan data variant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Manajemen Stok</h1>
            <p className="text-text-secondary font-medium">Stok Material berdasarkan Master dan Varian (Merk)</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate('/goods-receipt')} className="rounded-xl h-12 bg-white">
            <Truck className="w-5 h-5 mr-2 text-emerald-600" /> Terima Barang
          </Button>
          <Button variant="outline" onClick={() => navigate('/material-usage')} className="rounded-xl h-12 bg-white">
            <HardHat className="w-5 h-5 mr-2 text-orange-600" /> Catat Pakai
          </Button>
          <Button onClick={() => { setEditingVariant(null); setForm({ kode_material: '', merk: '', spesifikasi: '', supplier_default: null }); setIsModalOpen(true); }} className="rounded-xl h-12 px-6 shadow-premium">
            <Plus className="w-5 h-5 mr-2" /> Tambah Variant
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-1 bg-slate-100 rounded-2xl flex gap-1">
          <button 
            onClick={() => setViewMode('detail')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              viewMode === 'detail' ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
            )}
          >
            Detail Variant
          </button>
          <button 
            onClick={() => setViewMode('summary')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              viewMode === 'summary' ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
            )}
          >
            Summary Master
          </button>
        </div>
        
        <div className="flex-1 w-full relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input 
            placeholder={viewMode === 'summary' ? "Cari master material..." : "Cari merk atau material..."}
            className="pl-12 h-12 bg-white border-none shadow-sm rounded-2xl w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="p-0 border-none shadow-premium overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <THead>
              {viewMode === 'summary' ? (
                <TR isHoverable={false}>
                  <TH className="px-6 py-4">Kode</TH>
                  <TH className="px-6 py-4">Nama Material (Master)</TH>
                  <TH className="px-6 py-4 text-center">Jumlah Varian</TH>
                  <TH className="px-6 py-4 text-center">Total Stok</TH>
                  <TH className="px-6 py-4">Satuan</TH>
                </TR>
              ) : (
                <TR isHoverable={false}>
                  <TH className="px-6 py-4">Master</TH>
                  <TH className="px-6 py-4">Merk / Varian</TH>
                  <TH className="px-6 py-4">Spesifikasi</TH>
                  <TH className="px-6 py-4 text-right">Stok Aktual</TH>
                  <TH className="px-6 py-4 text-right">Harga Terakhir</TH>
                  <TH className="px-6 py-4 text-right">Aksi</TH>
                </TR>
              )}
            </THead>
            <TBody>
              {loading ? (
                <TR isHoverable={false}>
                  <TD colSpan={6} className="py-20 text-center">
                    <RefreshCw className="w-8 h-8 text-accent-dark animate-spin mx-auto mb-4" />
                    <p className="text-text-muted font-bold uppercase text-[10px] tracking-widest">Memuat Data Stok...</p>
                  </TD>
                </TR>
              ) : filteredData.length === 0 ? (
                <TR isHoverable={false}>
                  <TD colSpan={6} className="py-20 text-center text-text-muted">Tidak ada data ditemukan.</TD>
                </TR>
              ) : viewMode === 'summary' ? (
                (filteredData as any[]).map((m) => (
                  <TR key={m.id}>
                    <TD className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-black text-slate-600">{m.code || '-'}</span>
                    </TD>
                    <TD className="px-6 py-4 font-black text-text-primary">{m.name}</TD>
                    <TD className="px-6 py-4 text-center">
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black">{m.variantCount} Varian</span>
                    </TD>
                    <TD className="px-6 py-4 text-center">
                      <span className={cn("text-lg font-black", Number(m.totalStok) === 0 ? "text-rose-500" : "text-emerald-600")}>
                        {formatNumber(m.totalStok)}
                      </span>
                    </TD>
                    <TD className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">{m.unit}</TD>
                  </TR>
                ))
              ) : (
                (filteredData as MaterialVariant[]).map((v) => {
                  const master = masters.find(m => m.id === v.material_id);
                  return (
                    <TR key={v.id}>
                      <TD className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-accent-dark uppercase tracking-widest">{master?.code || '-'}</span>
                          <span className="text-sm font-bold text-text-muted">{master?.name || 'Unknown'}</span>
                        </div>
                      </TD>
                      <TD className="px-6 py-4">
                         <div className="flex items-center gap-2">
                           <Tag className="w-3 h-3 text-emerald-500" />
                           <span className="font-black text-text-primary uppercase tracking-tight">{v.merk}</span>
                         </div>
                      </TD>
                      <TD className="px-6 py-4 text-[10px] text-text-secondary italic font-medium">{v.spesifikasi || '-'}</TD>
                      <TD className="px-6 py-4 text-right">
                        <span className={cn("text-base font-black", Number(v.stok) === 0 ? "text-rose-500" : "text-emerald-600")}>
                          {formatNumber(v.stok)}
                        </span>
                        <span className="ml-1 text-[9px] font-bold text-text-muted uppercase">{master?.unit}</span>
                      </TD>
                      <TD className="px-6 py-4 text-right font-bold text-text-secondary">{formatCurrency(v.harga_terakhir || 0)}</TD>
                      <TD className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setEditingVariant(v); setForm({ material_id: v.material_id, merk: v.merk, spesifikasi: v.spesifikasi || '', supplier_default: v.supplier_default || null }); setIsModalOpen(true); }}
                            className="h-8 w-8 p-0 rounded-xl hover:bg-slate-100"
                          >
                            <Pencil className="w-4 h-4 text-accent-dark" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/stock-card?variantId=${v.id}`)}
                            className="h-8 w-8 p-0 rounded-xl hover:bg-slate-100"
                          >
                            <History className="w-4 h-4 text-slate-500" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingVariant ? "Edit Variant Material" : "Tambah Variant Baru"}
        size="lg"
      >
        <form onSubmit={handleSubmitVariant} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Pilih Master Material</label>
            <select 
              className="w-full h-14 glass-input rounded-xl px-6 text-base font-bold text-text-primary focus:outline-none shadow-glass"
              value={form.material_id}
              onChange={(e) => setForm({ ...form, material_id: e.target.value })}
              required
              disabled={!!editingVariant}
            >
              <option value="">-- Pilih Master --</option>
              {masters.map(m => (
                <option key={m.id} value={m.id}>
                  {m.code ? `[${m.code}] ` : ''}{m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Merk / Varian</label>
            <Input 
              placeholder="Contoh: Semen Gresik, Semen Tiga Roda, Besi Krakatau"
              value={form.merk}
              onChange={(e) => setForm({ ...form, merk: e.target.value })}
              className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Spesifikasi (Opsional)</label>
            <Input 
              placeholder="Contoh: Tipe 1, 40kg, Diameter 10mm"
              value={form.spesifikasi}
              onChange={(e) => setForm({ ...form, spesifikasi: e.target.value })}
              className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
            />
          </div>
          
          <div className="pt-6 flex gap-4">
            <Button type="button" variant="ghost" className="flex-1 h-12 rounded-xl" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1 h-12 rounded-xl text-base font-extrabold shadow-glass" isLoading={loading}>
              {editingVariant ? "Simpan Perubahan" : "Tambahkan Variant"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Materials;
