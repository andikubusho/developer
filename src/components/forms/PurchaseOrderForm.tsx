import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../lib/supabase';
import { Material } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { useAuth } from '../../contexts/AuthContext';

const poSchema = z.object({
  material_id: z.string().min(1, 'Material harus dipilih'),
  supplier: z.string().min(3, 'Supplier minimal 3 karakter'),
  quantity: z.number().min(1, 'Jumlah minimal 1'),
  unit_price: z.number().min(0, 'Harga harus positif'),
  order_date: z.string(),
});

type POFormValues = z.infer<typeof poSchema>;

interface POFormProps {
  materials: Material[];
  onSuccess: (values?: any) => void;
  onCancel: () => void;
}

export const PurchaseOrderForm: React.FC<POFormProps> = ({ materials, onSuccess, onCancel }) => {
  const { isMockMode } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      order_date: new Date().toISOString().split('T')[0],
      quantity: 1,
      unit_price: 0,
    },
  });

  const onSubmit = async (values: POFormValues) => {
    setLoading(true);
    try {
      if (isMockMode) {
        console.log('Mock saving PO:', values);
        await new Promise(resolve => setTimeout(resolve, 500));
        onSuccess(values);
        return;
      }

      const po_number = `PO-${Date.now().toString().slice(-6)}`;
      const total_price = values.quantity * values.unit_price;

      const { error } = await supabase
        .from('purchase_orders')
        .insert([{
          ...values,
          po_number,
          total_price,
          status: 'pending'
        }]);

      if (error) throw error;
      onSuccess(values);
    } catch (error) {
      console.error('Error saving PO:', error);
      alert('Gagal menyimpan PO.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select 
        label="Material" 
        {...register('material_id')} 
        error={errors.material_id?.message}
      >
        <option value="">Pilih Material</option>
        {materials.map(m => (
          <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
        ))}
      </Select>

      <Input 
        label="Supplier" 
        {...register('supplier')} 
        error={errors.supplier?.message} 
      />

      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="quantity"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Jumlah"
              value={field.value}
              onValueChange={(values) => field.onChange(values.floatValue || 0)}
              error={errors.quantity?.message}
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
            />
          )}
        />
      </div>

      <Input 
        label="Tanggal Order" 
        type="date" 
        {...register('order_date')} 
        error={errors.order_date?.message} 
      />

      <div className="p-4 bg-white/30 rounded-xl">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-text-secondary">Estimasi Total:</span>
          <span className="text-lg font-bold text-text-primary">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(watch('quantity') * watch('unit_price') || 0)}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" isLoading={loading}>Buat PO</Button>
      </div>
    </form>
  );
};
