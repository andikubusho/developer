import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HardHat, 
  ArrowLeft, 
  Info,
  Calendar,
  Package,
  AlertTriangle,
  RefreshCw,
  Trash2,
  UserCheck
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { api } from '../lib/api';
import { formatNumber, cn } from '../lib/utils';

const MaterialUsage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [rabItems, setRabItems] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    rab_project_id: '',
    rab_item_id: '', // New: ID of the specific RAB item (job)
    material_id: '',
    id_variant: '',
    qty: 0,
    worker_id: '',
    keterangan: ''
  });

  const [selectedRabItem, setSelectedRabItem] = useState<any | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch RAB Projects, Recent Usage History, and Unit Info
      const [rabData, historyData, unitsData, workersData] = await Promise.all([
        api.get('rab_projects', 'select=*&order=nama_proyek.asc'),
        api.get('material_usages', 'select=*,rab:rab_projects(nama_proyek),material:materials(name,unit),variant:material_variants(merk),worker:worker_masters(name)&order=tanggal.desc&limit=10'),
        api.get('units', 'select=id,unit_number,type'),
        api.get('worker_masters', 'select=id,name,type&status=eq.active&order=name.asc')
      ]);

      const unitsMap: Record<string, any> = {};
      if (Array.isArray(unitsData)) {
        unitsData.forEach((u: any) => { if (u?.id) unitsMap[u.id] = u; });
      }

      const enriched = (rabData || []).map((r: any) => ({
        ...r,
        unit: (r.unit_id && unitsMap[r.unit_id]) ? unitsMap[r.unit_id] : null
      }));

      setProjects(enriched);
      setHistory(Array.isArray(historyData) ? historyData : []);
      setWorkers(workersData || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (form.rab_project_id) {
      fetchRabMaterials(form.rab_project_id);
    } else {
      setMasters([]);
      setForm(f => ({ ...f, material_id: '', id_variant: '' }));
    }
  }, [form.rab_project_id]);

  useEffect(() => {
    if (form.material_id) {
      fetchVariants(form.material_id);
    } else {
      setVariants([]);
      setForm(f => ({ ...f, id_variant: '' }));
    }
  }, [form.material_id]);

  useEffect(() => {
    if (form.rab_item_id) {
      const item = rabItems.find(it => it.id === form.rab_item_id);
      setSelectedRabItem(item || null);
      if (item?.material_id) {
        setForm(f => ({ ...f, material_id: item.material_id }));
      }
    } else {
      setSelectedRabItem(null);
      setForm(f => ({ ...f, material_id: '', id_variant: '' }));
    }
  }, [form.rab_item_id, rabItems]);

  useEffect(() => {
    if (form.id_variant) {
      const v = variants.find(v => v.id.toString() === form.id_variant);
      setSelectedVariant(v || null);
    } else {
      setSelectedVariant(null);
    }
  }, [form.id_variant, variants]);

  const fetchRabMaterials = async (rabId: string) => {
    try {
      setLoading(true);
      // Ambil Level 2 (Pekerjaan) dan Level 3 (Material) secara paralel
      const [itemsL3, itemsL2] = await Promise.all([
        api.get('rab_items', `rab_project_id=eq.${rabId}&level=eq.3&select=*,material:materials(*)`),
        api.get('rab_items', `rab_project_id=eq.${rabId}&level=eq.2&select=id,uraian`)
      ]);

      // Ambil data stok varian untuk semua material yang ada di RAB ini
      const materialIds = [...new Set((itemsL3 || []).map((i: any) => i.material_id).filter(Boolean))];
      let variantStocks: Record<string, number> = {};
      
      if (materialIds.length > 0) {
        const variantsData = await api.get('material_variants', `material_id=in.(${materialIds.join(',')})&select=material_id,stok`);
        (variantsData || []).forEach((v: any) => {
          variantStocks[v.material_id] = (variantStocks[v.material_id] || 0) + (Number(v.stok) || 0);
        });
      }

      // Gabungkan data agar item Level 3 mengetahui nama Pekerjaan induknya dan total stoknya
      const mappedItems = (itemsL3 || []).map((l3: any) => {
        const parent = (itemsL2 || []).find((l2: any) => l2.id === l3.parent_id);
        return {
          ...l3,
          parentUraian: parent ? parent.uraian : 'Tanpa Pekerjaan',
          totalStock: variantStocks[l3.material_id] || 0
        };
      });

      setRabItems(mappedItems);
      // Sinkronkan data masters agar sidebar (Info Sidebar) bisa menampilkan nama & unit material
      const materialMasters = mappedItems
        .filter((it: any) => it.material)
        .map((it: any) => it.material);
      setMasters(materialMasters);
    } catch (err) {
      console.error('Error fetching RAB materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVariants = async (id: string) => {
    try {
      const data = await api.get('material_variants', `material_id=eq.${id}&select=*&order=merk.asc`);
      setVariants(data || []);
    } catch (err) {
      console.error('Error fetching variants:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id_variant || form.qty <= 0) return;

    if (selectedVariant && form.qty > selectedVariant.stok) {
      alert(`Stok tidak mencukupi! Saldo saat ini: ${selectedVariant.stok}`);
      return;
    }

    setSubmitting(true);
    try {
      const usageResponse = await api.insert('material_usages', {
        tanggal: form.tanggal,
        rab_project_id: form.rab_project_id || null,
        rab_item_id: form.rab_item_id || null,
        material_id: form.material_id,
        id_variant: parseInt(form.id_variant),
        qty: form.qty,
        worker_id: form.worker_id || null,
        worker_name: workers.find(w => w.id === form.worker_id)?.name || null,
        keterangan: form.keterangan
      });

      // CATAT MUTASI STOK (Untuk Kartu Stok)
      // Kita catat manual agar referensi lebih informatif (Nama Proyek & Unit)
      const project = projects.find(p => p.id === form.rab_project_id);
      const item = rabItems.find(it => it.id === form.rab_item_id);
      const referenceLabel = `Proyek: ${project?.nama_proyek || 'Umum'}${project?.unit ? ` (${project.unit.unit_number})` : ''} - ${item?.uraian || 'Pemakaian'}`;

      await api.insert('stock_movements', {
        id_variant: parseInt(form.id_variant),
        tanggal: new Date().toISOString(),
        tipe: 'OUT',
        qty: form.qty,
        saldo_setelah: (selectedVariant?.stok || 0) - form.qty,
        sumber: 'USAGE',
        reference_id: usageResponse?.[0]?.id || 'Manual',
        keterangan: referenceLabel,
        worker_id: form.worker_id || null
      });

      // Update stok akhir di tabel varian (jika trigger DB tidak melakukannya)
      await api.update('material_variants', parseInt(form.id_variant), {
        stok: (selectedVariant?.stok || 0) - form.qty
      });

      alert('Pemakaian material berhasil dicatat!');
      setForm(f => ({ ...f, qty: 0, keterangan: '' })); // Reset form partial
      fetchInitialData();
      if (form.rab_project_id) fetchRabMaterials(form.rab_project_id);
    } catch (err) {
      console.error('Error saving usage:', err);
      alert('Gagal mencatat pemakaian material');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUsage = async (usage: any) => {
    if (!confirm(`Batalkan pemakaian material "${usage.material?.name}"? Stok akan dikembalikan ke gudang.`)) return;

    try {
      setLoading(true);
      // 1. Hapus Log Mutasi Terkait agar Kartu Stok sinkron
      const movements = await api.get('stock_movements', `sumber=eq.USAGE&reference_id=eq.${usage.id}`);
      if (movements && movements.length > 0) {
        await api.delete('stock_movements', movements[0].id);
      }

      // 2. Kembalikan Saldo Stok di Material Variants (Ditambah lagi)
      const vRows = await api.get('material_variants', `id=eq.${usage.id_variant}&select=stok`);
      const currentStok = Number(vRows?.[0]?.stok) || 0;
      const restoredStok = currentStok + Number(usage.qty);
      await api.update('material_variants', usage.id_variant, { stok: restoredStok });

      // 3. Hapus data Usage
      await api.delete('material_usages', usage.id);
      
      await fetchInitialData();
    } catch (err) {
      console.error('Error deleting usage:', err);
      alert('Gagal membatalkan pemakaian.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10 max-w-6xl mx-auto px-4">
      {/* Header Section */}
      <div className="flex items-center gap-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/materials')} 
          className="p-3 h-auto bg-white/50 shadow-sm border border-white/40 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight italic uppercase">
            Catat <span className="not-italic text-accent-lavender tracking-tighter">Pemakaian Material</span>
          </h1>
          <p className="text-text-secondary font-bold text-sm">Rekam pengambilan material untuk operasional proyek</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Form Section */}
        <div className="lg:col-span-8">
          <Card className="p-10 bg-white/80 backdrop-blur-md border-white/60 shadow-premium rounded-[2.5rem]">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* RAB Selection */}
                <div className="md:col-span-2 p-1 bg-accent-lavender/5 rounded-[2rem] border-2 border-accent-lavender/10">
                  <SearchableSelect 
                    label="1. Pilih Dokumen RAB"
                    options={(projects || []).map(p => ({ 
                      label: `RAB: ${p?.nama_proyek || 'Tanpa Nama'}${p?.unit?.unit_number ? ` - ${p.unit.unit_number}` : ''} - ${p?.lokasi || 'Lokasi Umum'}${p?.keterangan ? ` (${p.keterangan})` : ''}`, 
                      value: p?.id 
                    }))}
                    value={form.rab_project_id}
                    onChange={(val) => setForm({ ...form, rab_project_id: val, rab_item_id: '', material_id: '', id_variant: '' })}
                    placeholder="Cari Proyek atau Unit..."
                  />
                </div>

                {/* Job / RAB Item Selection */}
                <div className={cn("md:col-span-2 transition-all duration-500", !form.rab_project_id && "opacity-30 pointer-events-none")}>
                  <SearchableSelect 
                    label="2. Pilih Pekerjaan (Sesuai RAB)"
                    options={(rabItems || []).map(it => ({ 
                      label: `${it.parentUraian} → ${it.uraian} [Budget: ${Number(it.volume).toFixed(2)} ${it.satuan} | Stok: ${formatNumber(it.totalStock)} ${it.satuan}]`, 
                      value: it.id,
                      className: (Number(it.totalStock) || 0) > 0 ? 'text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-700' : ''
                    }))}
                    value={form.rab_item_id}
                    onChange={(val) => setForm({ ...form, rab_item_id: val, id_variant: '' })}
                    placeholder={form.rab_project_id ? "Cari uraian pekerjaan..." : "Pilih RAB terlebih dahulu"}
                    disabled={!form.rab_project_id}
                  />
                </div>
              </div>

              <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-500", !form.rab_item_id && "opacity-30 pointer-events-none")}>
                {/* Material (Auto-filled from job) */}
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                    <Package className="w-3.5 h-3.5 text-accent-lavender" /> Master Material
                  </label>
                  <div className="h-14 glass-input rounded-2xl px-6 flex items-center font-black text-slate-700 bg-slate-50/50">
                    {selectedRabItem?.material?.name || '--'}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                    <Info className="w-3.5 h-3.5 text-accent-lavender" /> Pilih Merk / Variant
                  </label>
                  <select 
                    className="w-full h-14 glass-input rounded-2xl px-6 text-sm font-bold text-text-primary focus:outline-none shadow-3d-inset disabled:opacity-40"
                    value={form.id_variant}
                    onChange={(e) => setForm({ ...form, id_variant: e.target.value })}
                    required
                    disabled={!form.material_id}
                  >
                    <option value="">-- Pilih Variant --</option>
                    {variants.filter(v => (Number(v.stok) || 0) > 0).map(v => (
                      <option key={v.id} value={v.id}>{v.merk} (Stok: {formatNumber(v.stok)})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-500", !form.id_variant && "opacity-30 pointer-events-none")}>
                 {/* Penerima / Mandor */}
                 <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                    <UserCheck className="w-3.5 h-3.5 text-accent-lavender" /> Penerima / Mandor
                  </label>
                  <select 
                    className="w-full h-14 glass-input rounded-2xl px-6 text-sm font-bold text-text-primary focus:outline-none shadow-3d-inset disabled:opacity-40"
                    value={form.worker_id}
                    onChange={(e) => setForm({ ...form, worker_id: e.target.value })}
                    required
                  >
                    <option value="">-- Pilih Mandor --</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.type})</option>
                    ))}
                  </select>
                </div>

                 {/* Tanggal */}
                 <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                    <Calendar className="w-3.5 h-3.5 text-accent-lavender" /> Tanggal Pemakaian
                  </label>
                  <Input 
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    className="h-14 glass-input rounded-2xl px-6 font-bold"
                    required
                  />
                </div>

                {/* Jumlah */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                    <Package className="w-3.5 h-3.5 text-accent-lavender" /> Jumlah Pemakaian
                  </label>
                  <div className="relative">
                    <Input 
                      type="number"
                      value={form.qty}
                      onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
                      className="h-14 glass-input rounded-2xl px-6 font-black text-2xl"
                      required
                      min="0.01"
                      step="0.01"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted uppercase tracking-widest">
                      {selectedRabItem?.satuan || 'Unit'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <Info className="w-3.5 h-3.5 text-accent-lavender" /> Keperluan / Keterangan
                </label>
                <textarea 
                  className="w-full p-6 glass-input rounded-2xl text-sm font-bold text-text-primary focus:outline-none min-h-[120px] shadow-3d-inset"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  placeholder="Contoh: Pekerjaan Cor Sloof Blok A-12..."
                  required
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-16 rounded-2xl font-black text-lg shadow-premium" 
                  isLoading={submitting}
                  disabled={!form.id_variant || form.qty <= 0}
                >
                  <RefreshCw className={cn("w-5 h-5 mr-3", submitting && "animate-spin")} />
                  Simpan & Update Stok
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Info Sidebar Section */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="p-8 bg-white/60 backdrop-blur-md border-white/60 shadow-premium rounded-[2.5rem]">
            <div className="space-y-8">
              <div className="flex items-center gap-4 border-b border-white/40 pb-4">
                <div className="p-3 bg-accent-lavender/20 rounded-2xl">
                  <Info className="w-6 h-6 text-accent-lavender" />
                </div>
                <h3 className="font-black text-sm uppercase tracking-widest text-text-primary">Status Stok</h3>
              </div>
              
              {selectedVariant ? (
                <div className="space-y-6">
                  <div className="bg-white/40 p-5 rounded-2xl border border-white/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Item Terpilih</p>
                    <p className="text-base font-black text-text-primary leading-tight">
                      {masters.find(m => m.id === form.material_id)?.name} - {selectedVariant.merk}
                    </p>
                  </div>

                  <div className="bg-white/40 p-6 rounded-2xl border border-white/60 shadow-3d-inset">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Saldo Gudang</p>
                      {form.material_id && (
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Kuota RAB</p>
                          <p className="text-xs font-black text-emerald-700">
                            {formatNumber(selectedRabItem?.volume || 0)} {selectedRabItem?.satuan}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tighter text-accent-lavender">
                        {formatNumber(selectedVariant.stok)}
                      </span>
                      <span className="text-xs font-black text-text-muted uppercase">
                        {masters.find(m => m.id === form.material_id)?.unit}
                      </span>
                    </div>
                  </div>

                  {form.qty > 0 && (
                    <div className={cn(
                      "p-5 rounded-2xl border flex items-center gap-4 transition-all duration-500",
                      form.qty > selectedVariant.stok 
                        ? "bg-rose-50 border-rose-200 text-rose-700 animate-pulse" 
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    )}>
                      {form.qty > selectedVariant.stok ? <AlertTriangle className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                          {form.qty > selectedVariant.stok ? "Stok Kurang" : "Estimasi Sisa"}
                        </p>
                        <p className="text-lg font-black">
                          {formatNumber(selectedVariant.stok - form.qty)} {masters.find(m => m.id === form.material_id)?.unit}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mx-auto shadow-3d-inset">
                    <Package className="w-8 h-8 text-text-muted opacity-30" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted max-w-[150px] mx-auto leading-relaxed">
                    Pilih material dan variant untuk melihat saldo stok
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-rose-50/50 border-rose-100 shadow-sm rounded-[2rem] flex gap-4">
             <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
             <div className="space-y-1">
               <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Penting</p>
               <p className="text-[11px] font-medium text-rose-800 leading-relaxed">
                 Data pemakaian bersifat final dan akan langsung memotong saldo stok material di gudang secara otomatis.
               </p>
             </div>
          </Card>
        </div>
      </div>

      {/* Riwayat Pemakaian */}
      <div className="mt-12 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <RefreshCw className="w-5 h-5 text-accent-lavender" />
          <h2 className="text-xl font-black text-text-primary tracking-tight italic uppercase">Riwayat <span className="not-italic text-accent-lavender tracking-tighter">Pemakaian Terbaru</span></h2>
        </div>
        
        <Card className="p-6 bg-white border-none shadow-premium overflow-hidden rounded-[2rem]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b-2 border-slate-100">
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal / RAB</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Material & Merk</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty Keluar</th>
                   <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Penerima / Mandor</th>
                   <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan</th>
                   <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center text-slate-300 italic font-medium">Belum ada riwayat pemakaian.</td></tr>
                ) : history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-black text-slate-700 uppercase text-xs">{h.rab?.nama_proyek}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(h.tanggal).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800">{h.material?.name}</div>
                      <div className="text-[10px] font-black text-emerald-600 uppercase">Merk: {h.variant?.merk}</div>
                    </td>
                    <td className="px-4 py-4 text-right font-black text-rose-600">
                      - {formatNumber(h.qty)} <span className="text-[10px] uppercase text-slate-400 font-bold">{h.material?.unit}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent-lavender/10 flex items-center justify-center">
                          <UserCheck className="w-3 h-3 text-accent-lavender" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{h.worker?.name || h.worker_name || 'Umum'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-medium text-slate-500 max-w-[200px] truncate">
                      {h.keterangan}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteUsage(h)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Batalkan Pemakaian"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MaterialUsage;
