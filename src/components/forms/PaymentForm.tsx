import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CurrencyInput } from '../ui/CurrencyInput';
import { api } from '../../lib/api';

const paymentSchema = z.object({
  sale_id: z.string().min(1, 'Pilih transaksi'),
  installment_id: z.string().optional().nullable(),
  bank_account_id: z.string().optional().nullable(),
  amount: z.number().min(1000),
  payment_date: z.string(),
  payment_method: z.string().min(1, 'Metode pembayaran wajib diisi'),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  sales: { id: string; customer: { full_name: string }; unit: { unit_number: string } }[];
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ sales, initialData, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [installments, setInstallments] = useState<{ id: string; due_date: string; amount: number }[]>([]);
  const [banks, setBanks] = useState<{ id: string; bank_name: string; account_number: string; account_holder: string }[]>([]);

  const { register, handleSubmit, watch, setValue, control, reset, formState: { errors } } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Tunai',
    },
  });

  // Sync initialData when modal opens
  React.useEffect(() => {
    if (initialData) {
      reset({
        sale_id: initialData.sale_id,
        installment_id: initialData.installment_id,
        bank_account_id: initialData.bank_account_id,
        amount: initialData.amount,
        payment_date: initialData.payment_date,
        payment_method: initialData.payment_method,
      });
    }
  }, [initialData, reset]);

  const selectedSaleId = watch('sale_id');
  const watchPaymentMethod = watch('payment_method');

  React.useEffect(() => {
    if (selectedSaleId) {
      fetchInstallments(selectedSaleId);
    }
  }, [selectedSaleId]);

  const fetchInstallments = async (saleId: string) => {
    try {
      const data = await api.get('installments', `select=id,due_date,amount&sale_id=eq.${saleId}&status=eq.unpaid&order=due_date.asc`);
      setInstallments(data || []);
    } catch (error) {
      console.error('Error fetching installments:', error);
    }
  };

  const fetchBanks = async () => {
    try {
      console.log('Fetching bank accounts...');
      const data = await api.get('bank_accounts', 'select=id,bank_name,account_number,account_holder&order=bank_name.asc');
      console.log('Banks found:', data);
      setBanks(data || []);
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  // Re-fetch banks when payment method changes to Bank to ensure fresh data
  React.useEffect(() => {
    if (watchPaymentMethod === 'Transfer Bank') {
      fetchBanks();
    }
  }, [watchPaymentMethod]);

  const selectedInstallmentId = watch('installment_id');
  React.useEffect(() => {
    // Only auto-set amount if NOT in edit mode
    if (!initialData) {
      const inst = installments.find(i => i.id === selectedInstallmentId);
      if (inst) {
        setValue('amount', inst.amount);
      }
    }
  }, [selectedInstallmentId, installments, setValue, initialData]);

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      setLoading(true);
      
      // Sanitasi Payload: Pastikan semua UUID adalah null jika kosong
      const cleanInstallmentId = values.installment_id && values.installment_id !== "" ? values.installment_id : null;
      
      // Pastikan bank_account_id diambil langsung dari values jika metodenya Transfer Bank
      const cleanBankId = values.payment_method === 'Transfer Bank' ? (values.bank_account_id || null) : null;

      const payload = {
        sale_id: values.sale_id,
        installment_id: cleanInstallmentId,
        bank_account_id: cleanBankId,
        amount: values.amount,
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        status: initialData ? initialData.status : 'pending'
      };
      
      console.log('Final Payload to API:', payload);
      // Peringatan Diagnosa saat Simpan
      if (values.payment_method === 'Transfer Bank' && !cleanBankId) {
        alert('PERINGATAN: Anda memilih Transfer Bank tapi ID Bank kosong!');
      }

      if (initialData) {
        // Mode Update
        await api.update('payments', initialData.id, payload);
        
        // Sinkronisasi Cash Flow (Jika sudah pernah diverifikasi atau ada recordnya)
        const cfData = await api.get('cash_flow', `select=id&reference_id=eq.${initialData.id}`);
        if (cfData && cfData[0]) {
          const customerName = sales.find(s => s.id === values.sale_id)?.customer?.full_name || 'Pelanggan';
          await api.update('cash_flow', cfData[0].id, { 
            amount: payload.amount,
            date: payload.payment_date,
            description: `Pembayaran ${values.payment_method} - ${customerName}`,
            bank_account_id: payload.bank_account_id
          });
        }
      } else {
        // Mode Insert Baru
        await api.insert('payments', payload);
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Detailed Error:', error);
      alert(`Gagal menyimpan pembayaran: ${error.message || 'Terjadi kesalahan pada server'}`);
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
        disabled={!!initialData}
      />
      <Select 
        label="Cicilan (Opsional)" 
        options={installments.map(i => ({ 
          label: `Jatuh Tempo: ${i.due_date} - ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(i.amount)}`, 
          value: i.id 
        }))}
        {...register('installment_id')}
        error={errors.installment_id?.message}
        disabled={!!initialData}
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
        <Input label="Tanggal Bayar" type="date" {...register('payment_date')} error={errors.payment_date?.message} />
      </div>
      
      <Select 
        label="Metode Pembayaran" 
        options={[
          { label: 'Tunai / Cash', value: 'Tunai' },
          { label: 'Transfer Bank', value: 'Transfer Bank' }
        ]}
        {...register('payment_method')}
        error={errors.payment_method?.message}
      />

      {watchPaymentMethod === 'Transfer Bank' && (
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300">
          <Controller
            name="bank_account_id"
            control={control}
            rules={{ required: watchPaymentMethod === 'Transfer Bank' }}
            render={({ field }) => (
              <Select 
                label="Rekening Bank Tujuan" 
                options={banks.map(b => ({ 
                  label: `${b.bank_name} - ${b.account_number} (A/N ${b.account_holder})`, 
                  value: b.id 
                }))}
                value={field.value || ''}
                onChange={field.onChange}
                error={errors.bank_account_id?.message}
              />
            )}
          />
          <p className="text-[10px] text-emerald-700 mt-2 italic">* Pastikan dana sudah masuk ke rekening yang dipilih sebelum verifikasi.</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" isLoading={loading}>Simpan Pembayaran</Button>
      </div>
    </form>
  );
};
