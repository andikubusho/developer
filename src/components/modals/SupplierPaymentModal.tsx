import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  X, 
  Wallet, 
  Calendar, 
  Landmark, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, cn } from '../../lib/utils';

const paymentSchema = z.object({
  amount: z.number().min(1000, 'Minimal pembayaran Rp 1.000'),
  payment_date: z.string().min(1, 'Tanggal harus diisi'),
  payment_method: z.string().min(1, 'Metode harus dipilih'),
  bank_id: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  po: {
    id: string;
    po_number: string;
    supplier_name: string;
    total_price: number;
    total_paid: number;
    balance: number;
  };
  onSuccess: () => void;
}

export const SupplierPaymentModal: React.FC<Props> = ({ isOpen, onClose, po, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);

  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: po.balance,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Transfer Bank',
    },
  });

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const data = await api.get('bank_accounts', 'select=*');
      setBanks(data || []);
    } catch (err) {
      console.error('Error fetching banks:', err);
    }
  };

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      setLoading(true);
      
      const payload = {
        po_id: po.id,
        supplier_name: po.supplier_name,
        amount: values.amount,
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        status: 'paid', // Supplier payments are usually directly recorded as paid by Finance
        notes: values.notes,
        created_at: new Date().toISOString()
      };

      await api.insert('supplier_payment', payload);
      
      onSuccess();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Gagal menyimpan pembayaran.');
    } finally {
      setLoading(false);
    }
  };

  const amount = watch('amount') || 0;
  const remainingAfter = Math.max(0, po.balance - amount);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Input Pembayaran Supplier" size="lg">
      <div className="space-y-6 p-1">
        {/* PO Info Summary */}
        <div className="bg-accent-lavender/10 rounded-2xl p-4 border border-accent-lavender/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-[10px] font-black text-accent-dark uppercase tracking-widest mb-1">Referensi Tagihan</h4>
              <p className="text-sm font-black text-text-primary">{po.po_number}</p>
              <p className="text-[10px] font-bold text-text-muted uppercase">{po.supplier_name}</p>
            </div>
            <div className="text-right">
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Sisa Hutang</h4>
              <p className="text-lg font-black text-accent-dark">{formatCurrency(po.balance)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary bg-white/40 p-2 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Pastikan nilai pembayaran sesuai dengan bukti transfer.</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                label="Nilai Pembayaran"
                value={field.value}
                onValueChange={(values) => field.onChange(values.floatValue || 0)}
                error={errors.amount?.message}
                placeholder="Rp 0"
              />
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Tanggal Bayar" 
              type="date" 
              {...register('payment_date')} 
              error={errors.payment_date?.message} 
            />
            <Select 
              label="Metode" 
              {...register('payment_method')} 
              error={errors.payment_method?.message}
            >
              <option value="Transfer Bank">Transfer Bank</option>
              <option value="Tunai">Tunai</option>
              <option value="Cek / Giro">Cek / Giro</option>
            </Select>
          </div>

          <Select label="Rekening Sumber (Opsional)" {...register('bank_id')}>
            <option value="">Pilih Rekening...</option>
            {banks.map(bank => (
              <option key={bank.id} value={bank.id}>{bank.bank_name} - {bank.account_name}</option>
            ))}
          </Select>

          <Input 
            label="Keterangan" 
            {...register('notes')} 
            placeholder="Contoh: Pelunasan termin 1"
          />

          {/* Forecast Summary */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-text-secondary uppercase tracking-wider">Sisa Hutang Setelah Bayar:</span>
              <span className={cn(
                "font-black text-sm",
                remainingAfter === 0 ? "text-emerald-600" : "text-accent-dark"
              )}>
                {formatCurrency(remainingAfter)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Batal</Button>
            <Button type="submit" isLoading={loading} className="px-8">Simpan Pembayaran</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
