import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { useAuth } from '../../contexts/AuthContext';

const materialSchema = z.object({
  name: z.string().min(2, 'Nama material minimal 2 karakter'),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  stock: z.number().min(0),
  min_stock: z.number().min(0),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

interface MaterialFormProps {
  onSuccess: (values?: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export const MaterialForm: React.FC<MaterialFormProps> = ({ onSuccess, onCancel, initialData }) => {
  const { isMockMode } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: initialData || {
      stock: 0,
      min_stock: 0,
    },
  });

  const onSubmit = async (values: MaterialFormValues) => {
    setLoading(true);
    try {
      if (isMockMode) {
        console.log('Mock saving material:', values);
        await new Promise(resolve => setTimeout(resolve, 500));
        onSuccess(values);
        return;
      }

      if (initialData?.id) {
        const { error } = await supabase
          .from('materials')
          .update(values)
          .eq('id', initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('materials')
          .insert([values]);
        if (error) throw error;
      }
      onSuccess(values);
    } catch (error) {
      console.error('Error saving material:', error);
      alert('Gagal menyimpan data material.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input 
        label="Nama Material" 
        {...register('name')} 
        error={errors.name?.message} 
      />
      <Input 
        label="Satuan" 
        placeholder="Contoh: Sak, m3, Batang"
        {...register('unit')} 
        error={errors.unit?.message} 
      />
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="stock"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Stok Saat Ini"
              value={field.value}
              onValueChange={(values) => field.onChange(values.floatValue || 0)}
              error={errors.stock?.message}
            />
          )}
        />
        <Controller
          name="min_stock"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Minimal Stok"
              value={field.value}
              onValueChange={(values) => field.onChange(values.floatValue || 0)}
              error={errors.min_stock?.message}
            />
          )}
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" isLoading={loading}>Simpan Material</Button>
      </div>
    </form>
  );
};
