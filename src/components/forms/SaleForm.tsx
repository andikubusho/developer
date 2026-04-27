import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar, Wallet, Info, Star, CreditCard, Users, Banknote, Briefcase, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CurrencyInput } from '../ui/CurrencyInput';
import { cn, formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const saleSchema = z.object({
  sale_date: z.string(),
  customer_id: z.string().min(1, 'Pilih pelanggan'),
  project_id: z.string().min(1, 'Pilih proyek'),
  unit_id: z.string().min(1, 'Pilih unit'),
  consultant_id: z.string().min(1, 'Pilih konsultan property'),
  supervisor: z.string().optional().nullable(),
  manager: z.string().optional().nullable(),
  makelar: z.string().optional().nullable(),
  freelance: z.string().optional().nullable(),
  price: z.number().min(0),
  discount: z.number().min(0),
  total_price: z.number().min(0),
  promo_id: z.string().optional().nullable(),
  final_price: z.number().min(0),
  payment_method: z.enum(['cash', 'kpr', 'installment']),
  booking_fee: z.number().min(0),
  dp_amount: z.number().min(0),
  deposit_id: z.string().optional().nullable(),
  deposit_amount: z.number().min(0).optional().nullable(),
  initial_payments: z.array(z.object({
    type: z.string(),
    amount: z.number().min(0),
    date: z.string(),
    bank_id: z.string().optional().nullable(),
  })).optional().nullable(),
});

type SaleFormValues = z.infer<typeof saleSchema>;

interface SaleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export const SaleForm: React.FC<SaleFormProps> = ({ onSuccess, onCancel, initialData }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [rawCustomers, setRawCustomers] = useState<any[]>([]);
  const [rawLeads, setRawLeads] = useState<any[]>([]);
  const [consultantStaff, setConsultantStaff] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [verifiedDeposits, setVerifiedDeposits] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [hasLoadedMasterData, setHasLoadedMasterData] = useState(false);

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: initialData ? { ...initialData } : {
      sale_date: new Date().toISOString().split('T')[0],
      real_payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      payment_type: 'transfer',
      price: 0,
      discount: 0,
      total_price: 0,
      final_price: 0,
      booking_fee: 0,
      dp_amount: 0,
      initial_payments: [
        { type: 'Transfer Bank', amount: 0, date: new Date().toISOString().split('T')[0], bank_id: null }
      ],
      deposit_amount: 0,
      installments: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "initial_payments"
  });

  const watchProjectId = watch('project_id');
  const watchUnitId = watch('unit_id');
  const watchPrice = watch('price');
  const watchDiscount = watch('discount');
  const watchPromoId = watch('promo_id');
  const watchCustomerId = watch('customer_id');
  const watchConsultantId = watch('consultant_id');
  const watchDepositAmount = (watch('deposit_amount') as number) || 0;
  const watchBookingFee = (watch('booking_fee') as number) || 0;
  const watchDpAmount = (watch('dp_amount') as number) || 0;
  const watchPayments = watch('initial_payments') || [];
  const totalInitialPayment = watchPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [p, u, pli, c, l, m, pr, d, ba] = await Promise.all([
          api.get('projects', 'select=id,name'),
          api.get('units', 'select=*'),
          api.get('price_list_items', 'select=*'),
          api.get('customers', 'select=id,full_name,phone,consultant_id'),
          api.get('leads', 'select=id,name,phone,consultant_id'),
          api.get('consultants', 'select=id,name'),
          api.get('promos', 'select=id,name,value'),
          api.get('deposits', 'select=id,name,amount,phone,consultant_id&status=eq.verified'),
          api.get('bank_accounts', 'select=*')
        ]);
        const pliData = pli || [];
        const processedUnits = (u || []).map((unit: any) => {
          const pliItem = pliData.find((p: any) => p.unit_id === unit.id);
          if (pliItem) return { ...unit, unit_number: `${pliItem.blok} - ${pliItem.unit}`, price: pliItem.harga_jual, status: pliItem.status };
          return unit;
        });
        const existingIds = processedUnits.map((u: any) => u.id);
        const orphans = pliData.filter((p: any) => !existingIds.includes(p.unit_id)).map((p: any) => ({
          id: p.unit_id || p.id,
          project_id: p.project_id,
          unit_number: `${p.blok} - ${p.unit}`,
          price: p.harga_jual,
          status: p.status
        }));
        setProjects(p || []);
        setUnits([...processedUnits, ...orphans].filter(unit => unit.status === 'available' || (initialData && unit.id === initialData.unit_id)));
        setRawCustomers(c || []);
        setRawLeads(l || []);
        setVerifiedDeposits(d || []);
        setConsultantStaff(m || []);
        setPromos(pr || []);
        setBankAccounts(ba || []);
        setHasLoadedMasterData(true);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, [initialData]);

  useEffect(() => {
    const customer = rawCustomers.find(c => c.id === watchCustomerId) || rawLeads.find(l => l.id === watchCustomerId);
    if (customer && verifiedDeposits.length > 0) {
      const cleanPhone = (p: string) => (p || "").replace(/\D/g, "").replace(/^62/, "0");
      const deposit = verifiedDeposits.find(d => cleanPhone(d.phone) === cleanPhone(customer.phone));
      if (deposit) { setValue('deposit_id', deposit.id); setValue('deposit_amount', deposit.amount); }
      else { setValue('deposit_id', null); setValue('deposit_amount', 0); }
    } else { setValue('deposit_id', null); setValue('deposit_amount', 0); }
  }, [watchCustomerId, verifiedDeposits, rawCustomers, rawLeads, setValue]);

  useEffect(() => {
    const unit = units.find(u => u.id === watchUnitId);
    if (unit) setValue('price', unit.price || 0);
  }, [watchUnitId, units, setValue]);

  useEffect(() => {
    const totalPrice = Math.max(0, (watchPrice || 0) - (watchDiscount || 0));
    setValue('total_price', totalPrice);
    
    // Temukan promo dengan perbandingan ID yang lebih aman
    const promo = promos.find(p => String(p.id) === String(watchPromoId));
    const promoValue = promo?.value || 0;
    
    setValue('final_price', Math.max(0, totalPrice - promoValue));
  }, [watchPrice, watchDiscount, watchPromoId, promos, setValue]);

  useEffect(() => {
    if (watchConsultantId && hasLoadedMasterData) {
      const filtered = [...rawCustomers.filter(c => c.consultant_id === watchConsultantId), ...rawLeads.filter(l => l.consultant_id === watchConsultantId)];
      setCustomers(filtered.map(item => {
        const cleanPhone = (p: string) => (p || "").replace(/\D/g, "").replace(/^62/, "0");
        const hasDep = verifiedDeposits.some(d => cleanPhone(d.phone) === cleanPhone(item.phone));
        return { id: item.id, full_name: (hasDep ? "⭐ " : "") + (item.full_name || item.name) };
      }));
    } else { setCustomers([]); }
  }, [watchConsultantId, rawCustomers, rawLeads, verifiedDeposits, hasLoadedMasterData]);

  const toUuid = (val: string | null | undefined) => (val && val.trim() !== '') ? val : null;

  const onSubmit = async (values: SaleFormValues) => {
    setLoading(true);
    try {
      let finalCustomerId = values.customer_id;
      const lead = rawLeads.find(l => l.id === values.customer_id);
      if (lead) {
        const newCustomer = await api.insert('customers', { full_name: lead.name, phone: lead.phone, address: 'Alamat belum diisi' });
        if (newCustomer?.[0]) finalCustomerId = newCustomer[0].id;
      }
      const { initial_payments, ...restValues } = values;
      const salePayload = {
        ...restValues,
        customer_id: finalCustomerId,
        promo_id: toUuid(restValues.promo_id),
        deposit_id: toUuid(restValues.deposit_id),
        status: initialData ? initialData.status : 'active',
      };
      const saleData = initialData ? await api.update('sales', initialData.id, salePayload) : await api.insert('sales', salePayload);
      if (!saleData?.[0]) throw new Error('Gagal simpan.');
      const newSaleId = saleData[0].id;
      await api.update('units', values.unit_id, { status: 'sold' });
      if (values.deposit_id) await api.update('deposits', values.deposit_id, { status: 'used', sale_id: newSaleId });

      if (!initialData && values.initial_payments && values.initial_payments.length > 0) {
        for (const pay of values.initial_payments) {
          if (pay.amount > 0) {
            await api.insert('payments', {
              sale_id: newSaleId,
              amount: pay.amount,
              payment_date: pay.date,
              payment_method: pay.type,
              bank_account_id: pay.type === 'Transfer Bank' ? toUuid(pay.bank_id) : null,
              status: 'pending'
            });
          }
        }
      }
      onSuccess();
    } catch (error: any) { alert(`Gagal: ${error.message}`); } finally { setLoading(false); }
  };

  const finalPiutang = Math.max(0, (watch('final_price') || 0) - watchDepositAmount - watchBookingFee - watchDpAmount);
  const remainingAfterPayment = Math.max(0, finalPiutang - totalInitialPayment);
  
  // Dashboard Promo Helper
  const selectedPromo = promos.find(p => String(p.id) === String(watchPromoId));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-h-[85vh] overflow-y-auto px-1 py-1">
      {/* HEADER SECTION: DATA DASAR */}
      <div className="bg-white/40 p-5 rounded-[2rem] border border-white/60 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4 text-accent-dark" /> Data Utama Transaksi</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Input label="Tanggal Transaksi" type="date" {...register('sale_date')} />
          <Select label="Konsultan Property" options={consultantStaff.map(m => ({ label: m.name, value: m.id }))} {...register('consultant_id')} disabled={profile?.role === 'marketing' && !!profile?.consultant_id} />
          <Select label="Nama Konsumen" options={customers.map(c => ({ label: c.full_name, value: c.id }))} {...register('customer_id')} disabled={!watchConsultantId} className={cn(watchDepositAmount > 0 && "border-blue-500 bg-blue-50/30")} />
          <Select label="Proyek" options={projects.map(p => ({ label: p.name, value: p.id }))} {...register('project_id')} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <Select label="Pilih Unit / Blok" options={units.filter(u => u.project_id === watchProjectId).map(u => ({ label: u.unit_number, value: u.id }))} {...register('unit_id')} disabled={!watchProjectId} />
          <div className="md:col-span-3 bg-white/60 p-4 rounded-2xl border border-white/80 flex items-center justify-between">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Metode Pembayaran Utama:</span>
            <div className="flex gap-10">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-bold transition-all hover:text-accent-dark">
                <input type="radio" value="cash" {...register('payment_method')} className="w-4 h-4 accent-accent-dark" /> Cash Keras
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-bold transition-all hover:text-accent-dark">
                <input type="radio" value="installment" {...register('payment_method')} className="w-4 h-4 accent-accent-dark" /> Bertahap
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-bold transition-all hover:text-accent-dark">
                <input type="radio" value="kpr" {...register('payment_method')} className="w-4 h-4 accent-accent-dark" /> KPR / Bank
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* TEAM SECTION: TIM MARKETING */}
      <div className="bg-white/40 p-5 rounded-[2rem] border border-white/60 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2"><Users className="w-4 h-4 text-accent-dark" /> Tim Marketing & Penanggung Jawab</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Input label="Supervisor" {...register('supervisor')} placeholder="Nama Supervisor" />
          <Input label="Manager" {...register('manager')} placeholder="Nama Manager" />
          <Input label="Makelar / Agent" {...register('makelar')} placeholder="Nama Makelar" />
          <Input label="Freelance" {...register('freelance')} placeholder="Nama Freelance" />
        </div>
      </div>

      {/* FINANCE SECTION: KALKULASI HARGA */}
      <div className="bg-white/40 p-6 rounded-[2rem] border border-white/60 shadow-sm space-y-6">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2"><Wallet className="w-4 h-4 text-accent-dark" /> Rencana Anggaran & Kalkulasi</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Controller name="price" control={control} render={({ field }) => <CurrencyInput label="Harga Unit" value={field.value} readOnly className="bg-white/30" />} />
          <Controller name="discount" control={control} render={({ field }) => <CurrencyInput label="Discount" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} />} />
          <Select label="Pilih Promo" options={promos.map(p => ({ label: p.name, value: p.id }))} {...register('promo_id')} />
          <Controller name="booking_fee" control={control} render={({ field }) => <CurrencyInput label="Nilai Booking Fee" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} />} />
          <Controller name="dp_amount" control={control} render={({ field }) => <CurrencyInput label="Nilai Down Payment" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} />} />
        </div>

        {/* FINANCIAL SUMMARY DASHBOARD */}
        <div className={cn("p-6 rounded-[2.5rem] relative overflow-hidden border-2 transition-all", watchDepositAmount > 0 ? "bg-blue-50 border-blue-300" : "bg-white/50 border-white/80 shadow-inner")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-text-secondary"><span>Harga Setelah Diskon:</span><span className="font-bold">{formatCurrency(watch('total_price') || 0)}</span></div>
              {selectedPromo?.value ? (
                <div className="flex justify-between text-xs font-bold text-emerald-600 animate-in fade-in slide-in-from-left-2"><span>Potongan Promo Terpilih:</span><span>-{formatCurrency(selectedPromo.value)}</span></div>
              ) : null}
              <div className="flex justify-between text-sm font-black text-text-primary border-t border-white/60 pt-2"><span>Total Harga Akhir:</span><span>{formatCurrency(watch('final_price') || 0)}</span></div>
            </div>
            
            <div className="space-y-2 border-l border-white/60 pl-12">
              {watchDepositAmount > 0 && <div className="flex justify-between text-xs font-bold text-blue-700"><span>Potongan Titipan (Otomatis):</span><span>-{formatCurrency(watchDepositAmount)}</span></div>}
              <div className="flex justify-between text-xs font-bold text-red-600"><span>Total Booking + DP:</span><span>-{formatCurrency(watchBookingFee + watchDpAmount)}</span></div>
              <div className="flex justify-between items-center text-accent-dark pt-2 border-t border-white/60">
                <span className="text-sm font-black uppercase tracking-tighter">SISA PIUTANG KONSUMEN:</span>
                <span className="text-2xl font-black">{formatCurrency(finalPiutang)}</span>
              </div>
            </div>
          </div>
          {watchDepositAmount > 0 && <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-5 py-1.5 font-black uppercase tracking-[0.2em] rounded-bl-3xl shadow-lg">⭐ TITIPAN TERDETEKSI</div>}
        </div>
      </div>

      {/* PAYMENT SECTION: REALITA UANG MASUK (MULTI-PAYMENT) */}
      <div className="bg-amber-50/50 p-6 rounded-[2.5rem] border-2 border-amber-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-amber-900 flex items-center gap-2 uppercase tracking-widest"><CreditCard className="w-5 h-5" /> Realita Penerimaan Uang (Cash Flow)</h3>
            <p className="text-[10px] text-amber-700 font-medium italic">* Bisa input beberapa kali transfer atau campur tunai.</p>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => append({ type: 'Transfer Bank', amount: 0, date: new Date().toISOString().split('T')[0], bank_id: null })}
            className="rounded-xl border-amber-300 text-amber-900 hover:bg-amber-100 font-bold gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah Pembayaran
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="bg-white/60 p-5 rounded-3xl border border-amber-200/60 relative group animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                <div className="md:col-span-2">
                  <Select 
                    label={`Tipe #${index + 1}`}
                    options={[
                      { label: 'Transfer Bank', value: 'Transfer Bank' },
                      { label: 'Tunai / Cash', value: 'Tunai' }
                    ]}
                    {...register(`initial_payments.${index}.type`)}
                  />
                </div>
                <div className="md:col-span-3">
                  <Controller 
                    name={`initial_payments.${index}.amount`} 
                    control={control} 
                    render={({ field }) => <CurrencyInput label="Nilai Bayar" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} placeholder="Rp 0" />} 
                  />
                </div>
                <div className="md:col-span-3">
                  <Input label="Tanggal" type="date" {...register(`initial_payments.${index}.date`)} />
                </div>
                <div className="md:col-span-3">
                  {watch(`initial_payments.${index}.type`) === 'Transfer Bank' ? (
                    <Select 
                      label="Ke Rekening" 
                      options={bankAccounts.map(b => ({ 
                        label: `${b.bank_name} - ${b.account_number} (${b.bank_name || 'PT. ALM'})`, 
                        value: b.id 
                      }))} 
                      {...register(`initial_payments.${index}.bank_id`)} 
                    />
                  ) : (
                    <div className="h-[42px] flex items-center px-4 bg-amber-100/50 rounded-xl border border-amber-200 text-[10px] font-bold text-amber-800 uppercase">Pembayaran Tunai</div>
                  )}
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => remove(index)} 
                    disabled={fields.length === 1}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CALCULATION OF TRUE REMAINING BALANCE */}
        <div className="mt-6 pt-6 border-t border-amber-300 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Total Pembayaran Hari Ini:</span>
            <span className="text-xl font-black text-amber-900">{formatCurrency(totalInitialPayment)}</span>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Sisa Piutang Setelah Bayar Hari Ini:</span>
            <span className="text-2xl font-black text-amber-900">{formatCurrency(remainingAfterPayment)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 pt-4 border-t border-white/40">
        {remainingAfterPayment > 0 && watch('payment_method') === 'cash' && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-200 text-xs font-bold flex items-center gap-2 animate-pulse">
            <Info className="w-4 h-4" /> Nilai tidak cocok, masih kurang bayar
          </div>
        )}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" size="lg" onClick={onCancel} className="px-10 rounded-2xl font-bold">Batal</Button>
          <Button type="submit" size="lg" isLoading={loading || isSubmitting} disabled={remainingAfterPayment > 0 && watch('payment_method') === 'cash'} className="px-12 rounded-2xl font-black bg-accent-dark text-white hover:bg-accent-dark/90 shadow-premium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed">Simpan Transaksi Penjualan</Button>
        </div>
      </div>
    </form>
  );
};
