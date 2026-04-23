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
  price: z.number().min(1000000, 'Harga minimal 1 juta'),
  status: z.enum(['available', 'booked', 'sold']),
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
      if (initialData?.id) {
        await api.update('units', initialData.id, values);
      } else {
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
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" isLoading={loading}>Simpan Unit</Button>
      </div>
    </form>
  );
};
