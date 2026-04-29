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
import { api } from '../lib/api';
import { formatNumber } from '../lib/utils';

const MaterialUsage: React.FC = () => {
  const navigate = useNavigate();
  const [masters, setMasters] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    material_id: '',
    id_variant: '',
    qty: 0,
    keterangan: ''
  });

  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  useEffect(() => {
    fetchMasters();
  }, []);

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

  const fetchMasters = async () => {
    try {
      setLoading(true);
      const data = await api.get('materials', 'select=*&order=name.asc');
      setMasters(data || []);
    } catch (err) {
      console.error('Error fetching masters:', err);
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
    <div className="space-y-8 pb-10 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/materials')} className="p-2 h-auto">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Catat Pemakaian Material</h1>
          <p className="text-text-secondary font-medium">Rekam pengambilan material untuk operasional proyek</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 bg-white border-none shadow-premium">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Tanggal Pemakaian</label>
                <div className="relative">
                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                   <Input 
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    className="h-14 pl-12 glass-input rounded-xl px-4 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Master Material</label>
                  <select 
                    className="w-full h-14 glass-input rounded-xl px-6 text-base font-bold text-text-primary focus:outline-none shadow-glass"
                    value={form.material_id}
                    onChange={(e) => setForm({ ...form, material_id: e.target.value })}
                    required
                  >
                    <option value="">-- Pilih Master --</option>
                    {masters.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Pilih Merk / Variant</label>
                  <select 
                    className="w-full h-14 glass-input rounded-xl px-6 text-base font-bold text-text-primary focus:outline-none shadow-glass"
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

              <div className="space-y-2">
                <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Jumlah Pemakaian</label>
                <div className="relative">
                  <Input 
                    type="number"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
                    className="h-14 glass-input rounded-xl px-6 font-black text-2xl"
                    required
                    min="0.01"
                    step="0.01"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-text-muted uppercase tracking-widest">
                    {masters.find(m => m.id === form.material_id)?.unit}
                  </div>
                </div>
                {selectedVariant && (
                  <p className={cn(
                    "text-[10px] font-bold px-2 uppercase",
                    form.qty > selectedVariant.stok ? "text-rose-600" : "text-emerald-600"
                  )}>
                    {form.qty > selectedVariant.stok ? "❌ Melebihi stok tersedia" : `✅ Saldo tersisa: ${formatNumber(selectedVariant.stok - form.qty)}`}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Keperluan / Keterangan</label>
                <textarea 
                  className="w-full p-6 glass-input rounded-xl text-base font-medium focus:outline-none min-h-[120px]"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  placeholder="Contoh: Pekerjaan Cor Sloof Blok A-12..."
                  required
                />
              </div>

              <Button type="submit" className="w-full h-16 rounded-2xl font-black text-lg bg-accent-dark shadow-premium" isLoading={submitting}>
                Simpan & Update Stok
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-accent-dark text-white border-none shadow-premium">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/10 rounded-lg">
                <Info className="w-5 h-5 text-accent-lavender" />
              </div>
              <h3 className="font-black text-sm uppercase tracking-widest">Informasi Stok</h3>
            </div>
            
            {selectedVariant ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Item Aktif</p>
                  <p className="text-lg font-black leading-tight">{masters.find(m => m.id === form.material_id)?.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Varian Merk</p>
                  <p className="text-lg font-black">{selectedVariant.merk}</p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Saldo Gudang Saat Ini</p>
                  <p className="text-4xl font-black tracking-tight text-accent-lavender">
                    {formatNumber(selectedVariant.stok)}
                    <span className="text-xs ml-2 opacity-50 uppercase">{masters.find(m => m.id === form.material_id)?.unit}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center opacity-40">
                <Package className="w-12 h-12 mx-auto mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest">Pilih variant untuk melihat stok</p>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-rose-50 border-none shadow-sm">
             <div className="flex gap-4">
               <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
               <div className="space-y-1">
                 <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Penting</p>
                 <p className="text-[11px] font-medium text-rose-800 leading-relaxed">
                   Setiap pencatatan pemakaian akan langsung memotong saldo stok. Pastikan kuantitas yang diinput sudah benar sesuai fisik yang keluar.
                 </p>
               </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MaterialUsage;
