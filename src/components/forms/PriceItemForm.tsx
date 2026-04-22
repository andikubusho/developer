import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PriceListItem } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const priceItemSchema = z.object({
  category: z.enum(['Ruko', 'Rumah']),
  cluster: z.string().optional(),
  blok: z.string().min(1, 'Blok wajib diisi'),
  unit: z.string().min(1, 'Unit wajib diisi'),
  tipe: z.string().min(1, 'Tipe wajib diisi'),
  luas_tanah: z.number().min(1, 'Luas tanah minimal 1'),
  luas_bangunan: z.number().min(1, 'Luas bangunan minimal 1'),
  harga_jual: z.number().min(1000000, 'Harga jual minimal 1jt'),
  booking_fee: z.number().default(15000000),
  dp_percentage: z.number().min(0).max(100).default(20),
});

type PriceItemFormData = z.infer<typeof priceItemSchema>;

interface PriceItemFormProps {
  initialData?: PriceListItem;
  availableTypes?: string[];
  onSubmit: (data: PriceItemFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const PriceItemForm: React.FC<PriceItemFormProps> = ({
  initialData,
  availableTypes = [],
  onSubmit,
  onCancel,
  loading
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<PriceItemFormData>({
    resolver: zodResolver(priceItemSchema),
    defaultValues: initialData ? {
      category: initialData.category,
      cluster: initialData.cluster,
      blok: initialData.blok,
      unit: initialData.unit,
      tipe: initialData.tipe,
      luas_tanah: initialData.luas_tanah,
      luas_bangunan: initialData.luas_bangunan,
      harga_jual: initialData.harga_jual,
      booking_fee: initialData.booking_fee,
      dp_percentage: initialData.dp_percentage * 100,
    } : {
      category: 'Rumah',
      booking_fee: 15000000,
      dp_percentage: 20,
    }
  });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const category = watch('category');
  const hargaJual = watch('harga_jual') || 0;
  const bookingFee = watch('booking_fee') || 0;

  const formatCurrencyInput = (value: string) => {
    if (!value) return '';
    const number = value.replace(/\D/g, '');
    return new Intl.NumberFormat('id-ID').format(parseInt(number) || 0);
  };

  const parseCurrencyInput = (value: string) => {
    return parseInt(value.replace(/\D/g, '')) || 0;
  };

  const onFormSubmit = (data: PriceItemFormData) => {
    onSubmit({
      ...data,
      dp_percentage: data.dp_percentage / 100
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* ... previous grid rows remain same ... */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Kategori *</label>
          <select 
            {...register('category')}
            className="w-full rounded-lg border-slate-200 text-sm focus:ring-primary focus:border-primary"
          >
            <option value="Rumah">Rumah</option>
            <option value="Ruko">Ruko</option>
          </select>
          {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Cluster</label>
          <Input 
            {...register('cluster')} 
            placeholder="Contoh: East / South"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Blok *</label>
          <Input {...register('blok')} placeholder="Contoh: GC" />
          {errors.blok && <p className="text-xs text-red-500">{errors.blok.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Unit *</label>
          <Input {...register('unit')} placeholder="Contoh: 01" />
          {errors.unit && <p className="text-xs text-red-500">{errors.unit.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Tipe *</label>
        <Input 
          {...register('tipe')} 
          list="project-types"
          placeholder="Pilih atau ketik tipe unit..."
        />
        <datalist id="project-types">
          {availableTypes.map(type => (
            <option key={type} value={type} />
          ))}
        </datalist>
        {errors.tipe && <p className="text-xs text-red-500">{errors.tipe.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Luas Tanah (m2) *</label>
          <Input 
            type="number" 
            {...register('luas_tanah', { valueAsNumber: true })} 
          />
          {errors.luas_tanah && <p className="text-xs text-red-500">{errors.luas_tanah.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Luas Bangunan (m2) *</label>
          <Input 
            type="number" 
            {...register('luas_bangunan', { valueAsNumber: true })} 
          />
          {errors.luas_bangunan && <p className="text-xs text-red-500">{errors.luas_bangunan.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Harga Jual (Rp) *</label>
        <div className="relative">
          <Input 
            type="text" 
            className="font-bold text-primary"
            value={formatCurrencyInput(hargaJual.toString())}
            onChange={(e) => setValue('harga_jual', parseCurrencyInput(e.target.value))}
            placeholder="0"
          />
        </div>
        {errors.harga_jual && <p className="text-xs text-red-500">{errors.harga_jual.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Booking Fee (Rp)</label>
          <Input 
            type="text" 
            value={formatCurrencyInput(bookingFee.toString())}
            onChange={(e) => setValue('booking_fee', parseCurrencyInput(e.target.value))}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">DP (%)</label>
          <Input 
            type="number" 
            {...register('dp_percentage', { valueAsNumber: true })} 
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <Button variant="outline" onClick={onCancel} type="button">Batal</Button>
        <Button type="submit" isLoading={loading}>Simpan Unit</Button>
      </div>
    </form>
  );
};
