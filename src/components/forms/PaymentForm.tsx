import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CurrencyInput } from '../ui/CurrencyInput';
import { useAuth } from '../../contexts/AuthContext';
import { getMockData, saveMockData } from '../../lib/storage';

const paymentSchema = z.object({
  sale_id: z.string().min(1, 'Pilih transaksi'),
  installment_id: z.string().optional().nullable(),
  amount: z.number().min(1000),
  payment_date: z.string(),
  payment_method: z.string().min(1, 'Metode pembayaran wajib diisi'),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  sales: { id: string; customer: { full_name: string }; unit: { unit_number: string } }[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ sales, onSuccess, onCancel }) => {
  const { isMockMode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [installments, setInstallments] = useState<{ id: string; due_date: string; amount: number }[]>([]);

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Transfer Bank',
    },
  });

  const selectedSaleId = watch('sale_id');
  React.useEffect(() => {
    if (selectedSaleId) {
      fetchInstallments(selectedSaleId);
    }
  }, [selectedSaleId]);

  const fetchInstallments = async (saleId: string) => {
    if (isMockMode) {
      const mockInstallments = getMockData<any>('installments', []);
      const saleInstallments = mockInstallments
        .filter(i => i.sale_id === saleId && i.status === 'unpaid')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      
      setInstallments(saleInstallments);
      return;
    }
    const { data } = await supabase
      .from('installments')
      .select('id, due_date, amount')
      .eq('sale_id', saleId)
      .eq('status', 'unpaid')
      .order('due_date', { ascending: true });
    
    setInstallments(data || []);
  };

  const selectedInstallmentId = watch('installment_id');
  React.useEffect(() => {
    const inst = installments.find(i => i.id === selectedInstallmentId);
    if (inst) {
      setValue('amount', inst.amount);
    }
  }, [selectedInstallmentId, installments, setValue]);

  const onSubmit = async (values: PaymentFormValues) => {
    setLoading(true);
    try {
      if (isMockMode) {
        const payments = getMockData<any>('payments', []);
        const selectedSale = sales.find(s => s.id === values.sale_id);
        
        const newPayment = {
          id: Math.random().toString(36).substr(2, 9),
          ...values,
          status: 'pending',
          sale: {
            customer: { full_name: selectedSale?.customer?.full_name },
            unit: { unit_number: selectedSale?.unit?.unit_number }
          }
        };
        
        saveMockData('payments', [newPayment, ...payments]);
        onSuccess();
        return;
      }

      // 1. Create Payment
      const { error: payError } = await supabase
        .from('payments')
        .insert([{
          ...values,
          status: 'pending'
        }]);

      if (payError) throw payError;

      onSuccess();
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Gagal mencatat pembayaran.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select 
        label="Transaksi Penjualan" 
        options={sales.map(s => ({ 
          label: `${s.customer.full_name} - ${s.unit.unit_number}`, 
          value: s.id 
        }))}
        {...register('sale_id')}
        error={errors.sale_id?.message}
      />
      <Select 
        label="Cicilan (Opsional)" 
        options={installments.map(i => ({ 
          label: `Jatuh Tempo: ${i.due_date} - ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(i.amount)}`, 
          value: i.id 
        }))}
        {...register('installment_id')}
        error={errors.installment_id?.message}
      />
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              label="Jumlah Bayar"
              value={field.value}
              onValueChange={(values) => field.onChange(values.floatValue || 0)}
              error={errors.amount?.message}
            />
          )}
        />
        <Input 
          label="Tanggal Bayar" 
          type="date" 
          {...register('payment_date')} 
          error={errors.payment_date?.message} 
        />
      </div>
      <Input 
        label="Metode Pembayaran" 
        placeholder="Contoh: Transfer BCA, Tunai"
        {...register('payment_method')} 
        error={errors.payment_method?.message} 
      />
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" isLoading={loading}>Simpan Pembayaran</Button>
      </div>
    </form>
  );
};
