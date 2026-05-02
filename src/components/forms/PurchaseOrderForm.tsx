import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../lib/api';
import { PRItemForPO } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Info, Lock } from 'lucide-react';

const poSchema = z.object({
  project_id: z.string().min(1, 'Proyek harus dipilih'),
  material_id: z.string().min(1, 'Master Material harus dipilih'),
  id_variant: z.preprocess((val: unknown) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.number().optional()),
  supplier_id: z.string().min(1, 'Supplier harus dipilih'),
  quantity: z.number().min(1, 'Jumlah minimal 1'),
  unit_price: z.number().min(0, 'Harga harus positif'),
  order_date: z.string(),
  due_date: z.string().min(1, 'Tanggal jatuh tempo harus diisi'),
  pr_id: z.string().optional(),
});

type POFormValues = z.infer<typeof poSchema>;

interface POFormProps {
  onSuccess: (values?: any) => void;
  onCancel: () => void;
  initialPR?: PRItemForPO;
}

export const PurchaseOrderForm: React.FC<POFormProps> = ({ onSuccess, onCancel, initialPR }) => {
  const [loading, setLoading] = useState(false);
  const [masters, setMasters] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const fromPR = !!initialPR;

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      order_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quantity: initialPR?.quantity || 1,
      project_id: initialPR?.project_id || '',
      material_id: initialPR?.material_id || '',
      id_variant: undefined,
      pr_id: initialPR?.prId || undefined,
    },
  });

  const [isNewVariant, setIsNewVariant] = useState(false);
  const [newVariant, setNewVariant] = useState({ merk: '', spesifikasi: '' });

  const selectedMaterialId = watch('material_id');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedMaterialId) {
      fetchVariants(selectedMaterialId);
    } else {
      setVariants([]);
    }
  }, [selectedMaterialId]);

  const fetchInitialData = async () => {
    try {
      const [masterData, supplierData, projectData] = await Promise.all([
        api.get('materials', 'select=id,name&order=name.asc'),
        api.get('material_suppliers', 'select=id,name&order=name.asc'),
        api.get('projects', 'select=id,name&order=name.asc')
      ]);
      setMasters(masterData);
      setSuppliers(supplierData);
      setProjects(projectData);

      // Setelah data dimuat, set ulang nilai dari PR agar select terpilih dengan benar
      if (initialPR) {
        setValue('project_id', initialPR.project_id);
        setValue('material_id', initialPR.material_id);
        setValue('quantity', Number(initialPR.quantity));
        if (initialPR.prId) setValue('pr_id', initialPR.prId);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const fetchVariants = async (id: string) => {
    try {
      const data = await api.get('material_variants', `material_id=eq.${id}&select=*&order=merk.asc`);
      setVariants(data);
    } catch (err) {
      console.error('Error fetching variants:', err);
    }
  };

  const onSubmit = async (values: POFormValues) => {
    setLoading(true);
    try {
      let finalVariantId = values.id_variant;

      if (isNewVariant) {
        if (!newVariant.merk) {
          alert('Nama Merk harus diisi untuk varian baru');
          setLoading(false);
          return;
        }
        const createdVariant = await api.insert('material_variants', {
          material_id: values.material_id,
          merk: newVariant.merk,
          spesifikasi: newVariant.spesifikasi,
          stok: 0
        });
        finalVariantId = createdVariant[0].id;
      }

      if (!finalVariantId) {
        alert('Silakan pilih varian atau tambah merk baru');
        setLoading(false);
        return;
      }

      const po_number = `PO-${Date.now().toString().slice(-8)}`;
      const total_price = values.quantity * values.unit_price;

      await api.insert('purchase_orders', {
        ...values,
        id_variant: finalVariantId,
        po_number,
        total_price,
        status: 'PENDING'
      });

      onSuccess(values);
    } catch (error) {
      console.error('Error saving PO:', error);
      alert('Gagal menyimpan PO.');
    } finally {
      setLoading(false);
    }
  };

  // Label proyek dari data yang sudah dimuat
  const projectLabel = fromPR
    ? (projects.find(p => p.id === initialPR!.project_id)?.name || initialPR!.projectName || initialPR!.project_id)
    : null;

  const materialLabel = fromPR
    ? (masters.find(m => m.id === initialPR!.material_id)?.name || initialPR!.master?.name || initialPR!.material_id)
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 px-2 pb-2">

      {/* Banner info sumber PR */}
      {fromPR && (
        <div className="flex items-center gap-4 px-6 py-4 rounded-[24px] bg-blue-50/50 border-2 border-blue-100/50 text-blue-700 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600 flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            PO dibuat dari PR&nbsp;
            <span className="font-black underline decoration-blue-200 decoration-2 underline-offset-4">PR-{initialPR!.prId?.slice(0, 6).toUpperCase()}</span>
            &nbsp;— Proyek, material, dan jumlah dikunci sesuai PR.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proyek */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600">1</span>
            Referensi Proyek
          </label>
          {fromPR ? (
            <>
              <input type="hidden" {...register('project_id')} />
              <div className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 flex items-center text-sm font-black text-slate-800 select-none shadow-sm">
                {projectLabel || '...'}
              </div>
            </>
          ) : (
            <>
              <select {...register('project_id')} className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 text-sm font-black text-slate-700 focus:outline-none focus:border-accent-lavender focus:bg-white transition-all appearance-none cursor-pointer">
                <option value="">Pilih Proyek</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.project_id && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.project_id.message}</p>}
            </>
          )}
        </div>

        {/* Supplier — selalu bisa dipilih */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600">2</span>
            Pilih Supplier / Vendor
          </label>
          <select {...register('supplier_id')} className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 text-sm font-black text-slate-700 focus:outline-none focus:border-accent-lavender focus:bg-white transition-all appearance-none cursor-pointer">
            <option value="">Pilih Supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.supplier_id && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.supplier_id.message}</p>}
        </div>
      </div>

      <div className="space-y-4 p-6 bg-gradient-to-br from-slate-50 to-white rounded-[32px] border-2 border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-accent-dark/5 flex items-center justify-center text-accent-dark">
            <Info className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Detail Material Pesanan</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Master Material */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Master Material</label>
            {fromPR ? (
              <>
                <input type="hidden" {...register('material_id')} />
                <div className="w-full h-14 rounded-2xl bg-white border-2 border-slate-100 px-5 flex items-center text-sm font-black text-slate-800 select-none shadow-sm">
                  {materialLabel || '...'}
                </div>
              </>
            ) : (
              <>
                <select {...register('material_id')} className="w-full h-14 rounded-2xl bg-white border-2 border-slate-100 px-5 text-sm font-black text-slate-700 focus:outline-none focus:border-accent-lavender transition-all shadow-sm">
                  <option value="">Pilih Master</option>
                  {masters.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {errors.material_id && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.material_id.message}</p>}
              </>
            )}
          </div>

          {/* Variant (Merk) — selalu bisa dipilih */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Variant (Merk)</label>
              <button
                type="button"
                onClick={() => setIsNewVariant(!isNewVariant)}
                className="text-[10px] font-black text-accent-dark bg-accent-dark/5 px-2 py-1 rounded-md uppercase tracking-widest hover:bg-accent-dark/10 transition-colors"
              >
                {isNewVariant ? '← Pilih yang ada' : '+ Merk Baru'}
              </button>
            </div>

            {isNewVariant ? (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Nama Merk..."
                  value={newVariant.merk}
                  onChange={(e) => setNewVariant({ ...newVariant, merk: e.target.value })}
                  className="h-14 rounded-2xl font-black text-slate-700 border-2 border-slate-100 shadow-sm"
                />
                <Input
                  placeholder="Spek (Opsional)"
                  value={newVariant.spesifikasi}
                  onChange={(e) => setNewVariant({ ...newVariant, spesifikasi: e.target.value })}
                  className="h-14 rounded-2xl font-black text-slate-700 border-2 border-slate-100 shadow-sm"
                />
              </div>
            ) : (
              <select
                {...register('id_variant', { valueAsNumber: true })}
                disabled={!selectedMaterialId}
                className="w-full h-14 rounded-2xl bg-white border-2 border-slate-100 px-5 text-sm font-black text-slate-700 focus:outline-none focus:border-accent-lavender shadow-sm transition-all disabled:opacity-50 appearance-none cursor-pointer"
              >
                <option value="">Pilih Variant / Merk</option>
                {variants.map(v => (
                  <option key={v.id} value={v.id}>{v.merk} {v.spesifikasi ? `(${v.spesifikasi})` : ''}</option>
                ))}
              </select>
            )}
            {errors.id_variant && !isNewVariant && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.id_variant.message}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Jumlah — dikunci jika dari PR */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kuantitas Pesanan</label>
          {fromPR ? (
            <div className="relative">
              <input type="hidden" {...register('quantity', { valueAsNumber: true })} />
              <div className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 flex items-center text-xl font-black text-slate-800 select-none shadow-sm">
                {initialPR!.quantity}
              </div>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">ITEM</div>
            </div>
          ) : (
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <NumberInput
                  value={field.value}
                  onValueChange={(values) => field.onChange(values.floatValue || 0)}
                  error={errors.quantity?.message}
                  className="h-14 rounded-2xl font-black text-xl border-2 border-slate-100 shadow-sm"
                />
              )}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga Satuan (Rp)</label>
          <Controller
            name="unit_price"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onValueChange={(values) => field.onChange(values.floatValue || 0)}
                error={errors.unit_price?.message}
                className="h-14 rounded-2xl font-black text-xl border-2 border-slate-100 shadow-sm"
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Transaksi</label>
          <Input
            type="date"
            {...register('order_date')}
            error={errors.order_date?.message}
            className="h-14 rounded-2xl font-black border-2 border-slate-100 shadow-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Jatuh Tempo Pembayaran</label>
          <Input
            type="date"
            {...register('due_date')}
            error={errors.due_date?.message}
            className="h-14 rounded-2xl font-black border-2 border-slate-100 shadow-sm"
          />
        </div>
      </div>

      <div className="p-8 bg-slate-100 border-2 border-slate-200 text-slate-900 rounded-[32px] shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <Info className="w-24 h-24 -mr-8 -mt-8" />
        </div>
        <div className="flex justify-between items-end relative z-10">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Total Estimasi Pembelian</p>
            <p className="text-4xl font-black tracking-tighter">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(watch('quantity') * watch('unit_price') || 0)}
            </p>
          </div>
          {initialPR?.prId && (
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Referensi Dokumen</p>
              <div className="px-3 py-1 bg-slate-200/50 rounded-lg border border-slate-300 inline-block">
                <span className="text-xs font-black text-slate-700">PR-{initialPR.prId.slice(0, 6).toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-slate-100">
        <Button 
          type="button" 
          variant="ghost" 
          className="h-14 rounded-2xl text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-100 px-8" 
          onClick={onCancel}
        >
          Batalkan
        </Button>
        <Button 
          type="submit" 
          className="h-14 rounded-2xl px-16 font-black text-sm uppercase tracking-widest shadow-premium bg-accent-dark hover:bg-slate-800 text-white transition-all hover:scale-[1.02] active:scale-[0.98]" 
          isLoading={loading}
        >
          Konfirmasi & Buat PO
        </Button>
      </div>
    </form>
  );
};
