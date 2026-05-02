import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HardHat, 
  ArrowLeft, 
  Info,
  Calendar,
  Package,
  AlertTriangle,
  RefreshCw
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
  const [rabItems, setRabItems] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    rab_project_id: '',
    material_id: '',
    id_variant: '',
    qty: 0,
    keterangan: ''
  });

  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch RAB Projects with Project Names
      const data = await api.get('rab_projects', 'select=*,project:projects(name),unit:property_units(code)');
      setProjects(data || []);
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
      // Get level 3 items (materials) from this RAB
      const items = await api.get('rab_items', `rab_project_id=eq.${rabId}&level=eq.3&select=*,material:materials(*)`);
      
      // Filter out items without material_id and deduplicate
      const uniqueMaterials: any[] = [];
      const seen = new Set();
      
      items.forEach((item: any) => {
        if (item.material && !seen.has(item.material_id)) {
          uniqueMaterials.push(item.material);
          seen.add(item.material_id);
        }
      });

      setRabItems(items || []);
      setMasters(uniqueMaterials);
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
      await api.insert('material_usages', {
        tanggal: form.tanggal,
        rab_project_id: form.rab_project_id,
        material_id: form.material_id,
        id_variant: parseInt(form.id_variant),
        qty: form.qty,
        keterangan: form.keterangan
      });

      alert('Pemakaian material berhasil dicatat!');
      navigate('/materials');
    } catch (err) {
      console.error('Error saving usage:', err);
      alert('Gagal mencatat pemakaian material');
    } finally {
      setSubmitting(false);
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
                      {masters.find(m => m.id === form.material_id)?.unit || 'Unit'}
                    </div>
                  </div>
                </div>
              </div>

                {/* RAB Project */}
                <div className="space-y-3 md:col-span-2">
                  <SearchableSelect 
                    label="Pilih Proyek / Unit (RAB)"
                    options={projects.map(p => ({ 
                      label: `${p.project?.name || 'N/A'} - ${p.unit?.code || 'Umum'}`, 
                      value: p.id 
                    }))}
                    value={form.rab_project_id}
                    onChange={(val) => setForm({ ...form, rab_project_id: val, material_id: '', id_variant: '' })}
                    placeholder="Cari Proyek atau Unit..."
                  />
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <SearchableSelect 
                    label="Master Material (Dari RAB)"
                    options={masters.map(m => ({ label: m.name, value: m.id }))}
                    value={form.material_id}
                    onChange={(val) => setForm({ ...form, material_id: val, id_variant: '' })}
                    placeholder={form.rab_project_id ? "Pilih material..." : "Pilih RAB terlebih dahulu"}
                    disabled={!form.rab_project_id}
                  />
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
                    {variants.map(v => (
                      <option key={v.id} value={v.id}>{v.merk} (Stok: {formatNumber(v.stok)})</option>
                    ))}
                  </select>
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
                            {formatNumber(rabItems.find(it => it.material_id === form.material_id)?.volume || 0)} {masters.find(m => m.id === form.material_id)?.unit}
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
    </div>
  );
};

export default MaterialUsage;
