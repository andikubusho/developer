import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CurrencyInput } from '../ui/CurrencyInput';
import { formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';

const saleSchema = z.object({
  sale_date: z.string(),
  customer_id: z.string().min(1, 'Pilih pelanggan'),
  project_id: z.string().min(1, 'Pilih proyek'),
  unit_id: z.string().min(1, 'Pilih unit'),
  marketing_id: z.string().min(1, 'Pilih marketing'),
  supervisor: z.string().optional(),
  manager: z.string().optional(),
  makelar: z.string().optional(),
  freelance: z.string().optional(),
  price: z.number().min(0),
  discount: z.number().min(0),
  total_price: z.number().min(0),
  promo_id: z.string().optional(),
  final_price: z.number().min(0),
  payment_method: z.enum(['cash', 'kpr', 'installment']),
  booking_fee: z.number().min(0),
  booking_fee_date: z.string(),
  cash_amount: z.number().optional(),
  cash_date: z.string().optional(),
  cash_payment_type: z.enum(['cash', 'bank']).optional(),
  dp_amount: z.number().optional(),
  dp_date: z.string().optional(),
  installments: z.array(z.object({
    date: z.string(),
    amount: z.number().min(0),
  })).optional(),
});

type SaleFormValues = z.infer<typeof saleSchema>;

interface SaleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const SaleForm: React.FC<SaleFormProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_number: string; price: number; project_id: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; full_name: string }[]>([]);
  const [marketingStaff, setMarketingStaff] = useState<{ id: string; full_name: string }[]>([]);
  const [promos, setPromos] = useState<{ id: string; name: string; value: number }[]>([]);

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      sale_date: new Date().toISOString().split('T')[0],
      booking_fee_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      price: 0,
      discount: 0,
      total_price: 0,
      final_price: 0,
      booking_fee: 0,
      installments: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "installments" });

  const watchProjectId = watch('project_id');
  const watchUnitId = watch('unit_id');
  const watchPrice = watch('price');
  const watchDiscount = watch('discount');
  const watchPromoId = watch('promo_id');
  const watchPaymentMethod = watch('payment_method');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [p, u, c, l, m, pr] = await Promise.all([
          api.get('projects', 'select=id,name'),
          api.get('units', 'select=id,unit_number,price,project_id&status=eq.available'),
          api.get('customers', 'select=id,full_name'),
          api.get('leads', 'select=id,name'),
          api.get('profiles', 'select=id,full_name&role=eq.marketing'),
          api.get('promos', 'select=id,name,value')
        ]);

        setProjects(p || []);
        setUnits(u || []);
        setCustomers([
          ...(c || []).map((item: any) => ({ id: item.id, full_name: item.full_name })),
          ...(l || []).map((item: any) => ({ id: item.id, full_name: item.name + ' (Lead)' }))
        ]);
        setMarketingStaff(m || []);
        setPromos(pr || []);
      } catch (err) {
        console.error('Fetch error in SaleForm:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const unit = units.find(u => u.id === watchUnitId);
    if (unit) setValue('price', unit.price);
  }, [watchUnitId, units, setValue]);

  useEffect(() => {
    const totalPrice = Math.max(0, watchPrice - watchDiscount);
    setValue('total_price', totalPrice);
    const promo = promos.find(p => p.id === watchPromoId);
    const promoValue = promo ? promo.value : 0;
    setValue('final_price', Math.max(0, totalPrice - promoValue));
  }, [watchPrice, watchDiscount, watchPromoId, promos, setValue]);

  const onSubmit = async (values: SaleFormValues) => {
    setLoading(true);
    try {
      // 1. Insert into sales table
      const saleData = await api.insert('sales', {
        sale_date: values.sale_date,
        customer_id: values.customer_id,
        unit_id: values.unit_id,
        marketing_id: values.marketing_id,
        supervisor: values.supervisor,
        manager: values.manager,
        makelar: values.makelar,
        freelance: values.freelance,
        total_price: values.total_price,
        discount: values.discount,
        promo_id: values.promo_id,
        final_price: values.final_price,
        booking_fee: values.booking_fee,
        booking_fee_date: values.booking_fee_date,
        payment_method: values.payment_method,
        status: 'active'
      });

      if (!saleData || !saleData[0]) throw new Error('Gagal membuat transaksi penjualan.');
      const newSaleId = saleData[0].id;

      // 2. Update unit status
      await api.update('units', values.unit_id, { status: 'sold' });

      // 3. Handle installments
      if (values.payment_method === 'installment' && values.installments && values.installments.length > 0) {
        const installmentData = values.installments.map(inst => ({
          sale_id: newSaleId,
          due_date: inst.date,
          amount: inst.amount,
          status: 'unpaid'
        }));
        // Note: PostgREST insert handles arrays automatically
        await api.insert('installments', installmentData);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving sale:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = units.filter(u => u.project_id === watchProjectId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Tanggal Transaksi" type="date" {...register('sale_date')} error={errors.sale_date?.message} />
        <Select 
          label="Nama Konsumen" 
          options={customers.map(c => ({ label: c.full_name, value: c.id }))}
          {...register('customer_id')}
          error={errors.customer_id?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select 
          label="Proyek" 
          options={projects.map(p => ({ label: p.name, value: p.id }))}
          {...register('project_id')}
          error={errors.project_id?.message}
        />
        <Select 
          label="Blok / Unit" 
          options={filteredUnits.map(u => ({ label: u.unit_number, value: u.id }))}
          {...register('unit_id')}
          error={errors.unit_id?.message}
          disabled={!watchProjectId}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select 
          label="Marketing" 
          options={marketingStaff.map(m => ({ label: m.full_name, value: m.id }))}
          {...register('marketing_id')}
          error={errors.marketing_id?.message}
        />
        <Input label="Supervisor" {...register('supervisor')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="Manager" {...register('manager')} />
        <Input label="Makelar" {...register('makelar')} />
        <Input label="Freelance" {...register('freelance')} />
      </div>

      <div className="border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Rincian Harga</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="price"
            control={control}
            render={({ field }) => (
              <CurrencyInput label="Harga Rumah" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} readOnly className="bg-slate-50" error={errors.price?.message} />
            )}
          />
          <Controller
            name="discount"
            control={control}
            render={({ field }) => (
              <CurrencyInput label="Discount" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} error={errors.discount?.message} />
            )}
          />
          <Controller
            name="total_price"
            control={control}
            render={({ field }) => (
              <CurrencyInput label="Total Harga" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} readOnly className="bg-slate-50" error={errors.total_price?.message} />
            )}
          />
          <Select label="Promo" options={promos.map(p => ({ label: p.name, value: p.id }))} {...register('promo_id')} />
          <div className="md:col-span-2">
            <Controller
              name="final_price"
              control={control}
              render={({ field }) => (
                <CurrencyInput label="Total Akhir" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} readOnly className="bg-indigo-50 font-bold text-indigo-700" error={errors.final_price?.message} />
              )}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Metode Pembayaran</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="cash" {...register('payment_method')} className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-slate-600">Cash Keras</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="installment" {...register('payment_method')} className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-slate-600">Bertahap</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="kpr" {...register('payment_method')} className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-slate-600">KPR</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Controller
                name="booking_fee"
                control={control}
                render={({ field }) => (
                  <CurrencyInput label="Nilai Booking Fee" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} error={errors.booking_fee?.message} />
                )}
              />
              {watch('booking_fee') > 0 && (
                <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl shadow-sm">
                  <p className="text-xs font-bold text-indigo-600 uppercase mb-2 flex items-center gap-2"><Calendar className="w-3 h-3" /> Panduan Sisa</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Total:</span><span>{formatCurrency(watch('final_price'))}</span></div>
                    <div className="flex justify-between text-red-600"><span>Booking:</span><span>-{formatCurrency(watch('booking_fee'))}</span></div>
                    <div className="pt-2 border-t border-indigo-200 flex justify-between font-bold text-indigo-700">
                      <span>Sisa:</span>
                      <span>{formatCurrency(Math.max(0, watch('final_price') - watch('booking_fee')))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Input label="Tanggal Booking Fee" type="date" {...register('booking_fee_date')} />
          </div>

          {watchPaymentMethod === 'installment' && (
            <div className="bg-slate-50 p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Jadwal Cicilan</span>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ date: '', amount: 0 })}>
                  <Plus className="w-3 h-3 mr-1" /> Tambah
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2 bg-white p-2 rounded-lg border border-slate-200">
                  <div className="flex-1"><Input label="Tanggal" type="date" {...register(`installments.${index}.date` as const)} /></div>
                  <div className="flex-1"><Controller name={`installments.${index}.amount` as const} control={control} render={({ field }) => (
                    <CurrencyInput label="Nilai" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} />
                  )} /></div>
                  <Button type="button" variant="ghost" size="sm" className="text-red-500 h-10" onClick={() => remove(index)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" isLoading={loading}>Simpan Transaksi</Button>
      </div>
    </form>
  );
};
