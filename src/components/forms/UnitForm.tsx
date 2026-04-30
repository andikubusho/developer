import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CurrencyInput } from '../ui/CurrencyInput';

const unitSchema = z.object({
  project_id: z.string().min(1, 'Pilih proyek'),
  unit_number: z.string().min(1, 'Nomor unit wajib diisi'),
  type: z.string().min(1, 'Tipe unit wajib diisi'),
  luas_tanah: z.number().min(0).optional(),
  luas_bangunan: z.number().min(0).optional(),
  price: z.number().min(1000000, 'Harga minimal 1 juta'),
  status: z.enum(['available', 'booked', 'sold']),
  is_blocking: z.boolean().optional(),
  category: z.string().optional(),
});

type UnitFormValues = z.infer<typeof unitSchema>;

interface UnitFormProps {
  projects: { id: string; name: string }[];
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export const UnitForm: React.FC<UnitFormProps> = ({ projects, onSuccess, onCancel, initialData }) => {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: initialData || {
      status: 'available',
    },
  });

  const onSubmit = async (values: UnitFormValues) => {
    setLoading(true);
    try {
      // Check if the id is a valid UUID before updating
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(initialData?.id || '');

      if (initialData?.id && isUUID) {
        await api.update('units', initialData.id, values);
      } else {
        // If no ID or ID is not a UUID (e.g. from Price List merge), we Insert
        await api.insert('units', values);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving unit:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select 
        label="Proyek" 
        options={projects.map(p => ({ label: p.name, value: p.id }))}
        {...register('project_id')}
        error={errors.project_id?.message}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input 
          label="Nomor Unit" 
          {...register('unit_number')} 
          error={errors.unit_number?.message} 
        />
        <Input 
          label="Tipe Unit" 
          placeholder="Tipe 36/72"
          {...register('type')} 
          error={errors.type?.message} 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input 
          label="Luas Tanah (m2)" 
          type="number"
          {...register('luas_tanah', { valueAsNumber: true })} 
          error={errors.luas_tanah?.message} 
        />
        <Input 
          label="Luas Bangunan (m2)" 
          type="number"
          {...register('luas_bangunan', { valueAsNumber: true })} 
          error={errors.luas_bangunan?.message} 
        />
      </div>
      <Controller
        name="price"
        control={control}
        render={({ field }) => (
          <CurrencyInput
            label="Harga"
            value={field.value}
            onValueChange={(values) => field.onChange(values.floatValue || 0)}
            error={errors.price?.message}
          />
        )}
      />
      <Select 
        label="Status" 
        options={[
          { label: 'Tersedia', value: 'available' },
          { label: 'Booked', value: 'booked' },
          { label: 'Terjual', value: 'sold' },
        ]}
        {...register('status')}
        error={errors.status?.message}
      />
      <Select 
        label="Kategori" 
        options={[
          { label: 'Rumah', value: 'Rumah' },
          { label: 'Ruko', value: 'Ruko' },
        ]}
        {...register('category')}
        error={errors.category?.message}
      />

      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
        <input 
          type="checkbox" 
          id="is_blocking"
          {...register('is_blocking')}
          className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
        />
        <label htmlFor="is_blocking" className="text-sm font-black text-amber-900 cursor-pointer uppercase tracking-tight">
          Blocking Unit (Tampil sebagai Terjual di Price List)
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" isLoading={loading}>Simpan Unit</Button>
      </div>
    </form>
  );
};
