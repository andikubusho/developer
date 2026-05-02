import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Info } from 'lucide-react';

const poSchema = z.object({
  project_id: z.string().min(1, 'Proyek harus dipilih'),
  material_id: z.string().min(1, 'Master Material harus dipilih'),
  id_variant: z.number().optional(),
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
  initialPR?: any;
}

export const PurchaseOrderForm: React.FC<POFormProps> = ({ onSuccess, onCancel, initialPR }) => {
  const [loading, setLoading] = useState(false);
  const [masters, setMasters] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      order_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quantity: initialPR?.quantity || 1,
      project_id: initialPR?.project_id || '',
      material_id: initialPR?.material_id || '',
      id_variant: undefined,
      pr_id: initialPR?.prId || initialPR?.id || undefined,
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
        api.get('suppliers', 'select=id,name&order=name.asc'),
        api.get('projects', 'select=id,name&order=name.asc')
      ]);
      setMasters(masterData);
      setSuppliers(supplierData);
      setProjects(projectData);
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

      // Jika user memilih tambah varian baru
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
        finalVariantId = createdVariant.id;
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Proyek</label>
          <select {...register('project_id')} className="w-full h-12 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
            <option value="">Pilih Proyek</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {errors.project_id && <p className="text-xs text-red-500">{errors.project_id.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Supplier</label>
          <select {...register('supplier_id')} className="w-full h-12 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
            <option value="">Pilih Supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.supplier_id && <p className="text-xs text-red-500">{errors.supplier_id.message}</p>}
        </div>
      </div>

      <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-xs font-black text-primary uppercase tracking-widest">Detail Material</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Master Material</label>
            <select {...register('material_id')} className="w-full h-12 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
              <option value="">Pilih Master</option>
              {masters.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {errors.material_id && <p className="text-xs text-red-500">{errors.material_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">Variant (Merk)</label>
              <button 
                type="button"
                onClick={() => setIsNewVariant(!isNewVariant)}
                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
              >
                {isNewVariant ? '← Pilih yang ada' : '+ Merk Baru'}
              </button>
            </div>
            
            {isNewVariant ? (
              <div className="flex gap-2">
                <Input 
                  placeholder="Nama Merk..." 
                  value={newVariant.merk}
                  onChange={(e) => setNewVariant({ ...newVariant, merk: e.target.value })}
                  className="h-12 text-sm rounded-xl"
                />
                <Input 
                  placeholder="Spek (Opsional)" 
                  value={newVariant.spesifikasi}
                  onChange={(e) => setNewVariant({ ...newVariant, spesifikasi: e.target.value })}
                  className="h-12 text-sm rounded-xl"
                />
              </div>
            ) : (
              <select 
                {...register('id_variant', { valueAsNumber: true })} 
                disabled={!selectedMaterialId} 
                className="w-full h-12 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
              >
                <option value="">Pilih Variant / Merk</option>
                {variants.map(v => (
                  <option key={v.id} value={v.id}>{v.merk} {v.spesifikasi ? `(${v.spesifikasi})` : ''}</option>
                ))}
              </select>
            )}
            {errors.id_variant && !isNewVariant && <p className="text-xs text-red-500">{errors.id_variant.message}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="quantity"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Jumlah (Qty)"
              value={field.value}
              onValueChange={(values) => field.onChange(values.floatValue || 0)}
              error={errors.quantity?.message}
              className="h-12"
            />
          )}
        />
        <Controller
          name="unit_price"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              label="Harga Satuan"
              value={field.value}
              onValueChange={(values) => field.onChange(values.floatValue || 0)}
              error={errors.unit_price?.message}
              className="h-12"
            />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input 
          label="Tanggal Order" 
          type="date" 
          {...register('order_date')} 
          error={errors.order_date?.message} 
          className="h-12 rounded-xl"
        />
        <Input 
          label="Jatuh Tempo" 
          type="date" 
          {...register('due_date')} 
          error={errors.due_date?.message} 
          className="h-12 rounded-xl"
        />
      </div>

      <div className="p-5 bg-accent-dark text-white rounded-2xl shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Pembelian</p>
            <p className="text-2xl font-black tracking-tight">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(watch('quantity') * watch('unit_price') || 0)}
            </p>
          </div>
          {initialPR && (
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ref PR</p>
              <p className="text-sm font-bold">PR-{(initialPR?.prId || initialPR?.id || '').slice(0, 6).toUpperCase()}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" className="h-12 rounded-xl flex-1" onClick={onCancel}>Batal</Button>
        <Button type="submit" className="h-12 rounded-xl flex-1 font-black shadow-premium" isLoading={loading}>Buat PO</Button>
      </div>
    </form>
  );
};
