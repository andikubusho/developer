import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar, Wallet, Users, Briefcase, Plus, Trash2, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateInput } from '../ui/DateInput';
import { Select } from '../ui/Select';
import { CurrencyInput } from '../ui/CurrencyInput';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
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
  booking_fee_date: z.string().optional().nullable(),
  dp_amount: z.number().min(0),
  dp_date: z.string().optional().nullable(),
  deposit_id: z.string().optional().nullable(),
  deposit_amount: z.number().min(0).optional().nullable(),
  installments: z.array(z.object({
    name: z.string().optional().nullable(),
    due_date: z.string(),
    amount: z.number().min(0),
    status: z.string(),
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
      payment_method: 'cash',
      price: 0,
      discount: 0,
      total_price: 0,
      final_price: 0,
      booking_fee: 0,
      booking_fee_date: new Date().toISOString().split('T')[0],
      dp_amount: 0,
      dp_date: new Date().toISOString().split('T')[0],
      deposit_amount: 0,
      installments: [],
    }
  });

  const { fields: installmentFields, append: appendInstallment, remove: removeInstallment, replace: replaceInstallments } = useFieldArray({
    control,
    name: "installments"
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
  
  const finalPiutang = Math.max(0, (watch('final_price') || 0) - watchDepositAmount - watchBookingFee - watchDpAmount);
  const remainingAfterPayment = finalPiutang;


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [p, u, pli, c, l, m, pr, d, ba, inst] = await Promise.all([
          api.get('projects', 'select=id,name'),
          api.get('units', 'select=*'),
          api.get('price_list_items', 'select=*'),
          api.get('customers', 'select=id,full_name,phone,consultant_id'),
          api.get('leads', 'select=id,name,phone,consultant_id'),
          api.get('consultants', 'select=id,name'),
          api.get('promos', 'select=id,name,value'),
          api.get('deposits', 'select=id,name,amount,phone,consultant_id&status=eq.verified'),
          api.get('bank_accounts', 'select=*'),
          initialData?.id ? api.get('installments', `sale_id=eq.${initialData.id}&order=due_date.asc`) : Promise.resolve([])
        ]);
        const pliData = pli || [];
        const processedUnits = (u || []).map((unit: any) => {
          const pliItem = pliData.find((p: any) => p.unit_id === unit.id);
          if (pliItem) return { ...unit, unit_number: `${pliItem.blok} - ${pliItem.unit}`, price: pliItem.harga_jual, status: pliItem.status };
          return unit;
        });
        const existingIds = processedUnits.map((u: any) => u.id);
        const orphans = pliData
          .filter((p: any) => !existingIds.includes(p.unit_id) && isValidUuid(p.unit_id))
          .map((p: any) => ({
            id: p.unit_id,
            project_id: p.project_id,
            unit_number: `${p.blok} - ${p.unit}`,
            price: p.harga_jual,
            status: p.status
          }));
        setProjects(p || []);
        setUnits([...processedUnits, ...orphans].filter(unit => 
          ((unit.status === 'available' || !unit.status) && !unit.is_blocking) || 
          (initialData && unit.id === initialData.unit_id)
        ));
        setRawCustomers(c || []);
        setRawLeads(l || []);
        setVerifiedDeposits(d || []);
        setConsultantStaff(m || []);
        setPromos(pr || []);
        setBankAccounts(ba || []);
        
        if (inst && inst.length > 0) {
          replaceInstallments(inst.map((i: any) => ({
            due_date: i.due_date,
            amount: Number(i.amount),
            status: i.status || 'unpaid'
          })));
        }

        setHasLoadedMasterData(true);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, [initialData]);

  // Track whether edit-mode initial values have been fully applied
  const isEditInitialized = useRef(false);

  useEffect(() => {
    // Edit mode: jangan reset deposit jika konsumen tidak berubah
    if (initialData && !isEditInitialized.current) return; // Skip during init
    if (initialData && watchCustomerId === initialData.customer_id) return;
    const customer = rawCustomers.find(c => c.id === watchCustomerId) || rawLeads.find(l => l.id === watchCustomerId);
    if (customer && verifiedDeposits.length > 0) {
      const cleanPhone = (p: string) => (p || "").replace(/\D/g, "").replace(/^62/, "0");
      const deposit = verifiedDeposits.find(d => cleanPhone(d.phone) === cleanPhone(customer.phone));
      if (deposit) { setValue('deposit_id', deposit.id); setValue('deposit_amount', deposit.amount); }
      else { setValue('deposit_id', null); setValue('deposit_amount', 0); }
    } else if (!initialData) { setValue('deposit_id', null); setValue('deposit_amount', 0); }
  }, [watchCustomerId, verifiedDeposits, rawCustomers, rawLeads, setValue]);

  useEffect(() => {
    // Edit mode: jangan override harga jika unit tidak berubah dari data asal
    if (initialData && !isEditInitialized.current) return; // Skip during init
    if (initialData && watchUnitId === initialData.unit_id) return;
    const unit = units.find(u => u.id === watchUnitId);
    if (unit) setValue('price', unit.price || 0);
  }, [watchUnitId, units, setValue]);

  useEffect(() => {
    // Edit mode: jangan recalculate harga jika harga/diskon/promo tidak berubah dari data asal
    if (initialData && !isEditInitialized.current) return; // Skip during init
    if (initialData &&
      watchPrice === initialData.price &&
      watchDiscount === initialData.discount &&
      String(watchPromoId) === String(initialData.promo_id)) return;
    const totalPrice = Math.max(0, (watchPrice || 0) - (watchDiscount || 0));
    setValue('total_price', totalPrice);
    const promo = promos.find((p: any) => String(p.id) === String(watchPromoId));
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

  // Edit mode: re-apply ALL select values after async options finish loading
  useEffect(() => {
    if (!hasLoadedMasterData || !initialData) return;
    setValue('consultant_id', initialData.consultant_id || '');
    setValue('project_id', initialData.project_id || '');
    setValue('unit_id', initialData.unit_id || '');
    setValue('promo_id', initialData.promo_id || '');
    setValue('payment_method', initialData.payment_method || 'cash');
  }, [hasLoadedMasterData]);

  // Edit mode: re-apply customer_id once customers list is populated
  useEffect(() => {
    if (!initialData || !customers.length) return;
    if (isEditInitialized.current) return; // Only run once
    
    // Set customer_id after customers are available
    setValue('customer_id', initialData.customer_id || '');
    
    // Mark initialization as complete — all subsequent changes are user-initiated
    setTimeout(() => {
      isEditInitialized.current = true;
    }, 200);
  }, [customers]);

  const watchPaymentMethod = watch('payment_method');
  const watchInstallments = watch('installments') || [];
  const totalInstallmentPlanned = watchInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);

  const generateDefaultSchedule = (months: number) => {
    // Validasi: pastikan harga sudah terisi
    const currentFinalPrice = watch('final_price') || 0;
    if (currentFinalPrice <= 0) {
      alert('⚠️ Total Harga Akhir masih Rp 0. Pastikan unit sudah dipilih.');
      return;
    }

    // Peringatan: booking fee atau DP belum diisi
    if (watchBookingFee <= 0 && watchDpAmount <= 0) {
      const lanjut = confirm(
        '⚠️ PERINGATAN!\n\n' +
        'Nilai Booking Fee dan Down Payment masih Rp 0.\n' +
        'Jadwal cicilan akan dibuat berdasarkan TOTAL HARGA PENUH.\n\n' +
        'Disarankan isi Booking Fee & DP terlebih dahulu agar jadwal cicilan akurat.\n\n' +
        'Lanjutkan tetap buat jadwal?'
      );
      if (!lanjut) return;
    } else if (watchBookingFee <= 0 || watchDpAmount <= 0) {
      const belumIsi = watchBookingFee <= 0 ? 'Booking Fee' : 'Down Payment';
      const lanjut = confirm(
        `⚠️ PERINGATAN!\n\n` +
        `Nilai ${belumIsi} masih Rp 0.\n` +
        `Jadwal cicilan akan dihitung dari sisa piutang: ${formatCurrency(finalPiutang)}\n\n` +
        `Pastikan ${belumIsi} sudah benar sebelum membuat jadwal.\n\n` +
        `Lanjutkan?`
      );
      if (!lanjut) return;
    }

    const sisa = finalPiutang;
    if (sisa <= 0) {
      alert('✅ Sisa piutang sudah Rp 0. Tidak perlu jadwal cicilan.');
      return;
    }
    
    const amountPerMonth = Math.floor(sisa / months);
    const schedule = [];
    const today = new Date();
    
    for (let i = 1; i <= months; i++) {
      // Buat tanggal baru dengan menambah i bulan dari bulan sekarang
      const d = new Date(today.getFullYear(), today.getMonth() + i, today.getDate());
      
      // Format manual YYYY-MM-DD agar tidak tergeser oleh timezone (UTC)
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      schedule.push({
        name: `Cicilan ${i}`,
        due_date: `${year}-${month}-${day}`,
        amount: i === months ? sisa - (amountPerMonth * (months - 1)) : amountPerMonth,
        status: 'unpaid'
      });
    }
    replaceInstallments(schedule);
  };

  const toUuid = (val: string | null | undefined) => (val && val.trim() !== '') ? val : null;
  const isValidUuid = (val: string | null | undefined) =>
    !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const onSubmit = async (values: SaleFormValues) => {
    setLoading(true);
    try {
      let finalCustomerId = values.customer_id;
      const lead = rawLeads.find(l => l.id === values.customer_id);
      if (lead) {
        // CHECK IF CUSTOMER ALREADY EXISTS WITH THIS PHONE
        const cleanPhone = (p: string) => (p || "").replace(/\D/g, "").replace(/^62/, "0");
        const existingCustomer = rawCustomers.find(c => cleanPhone(c.phone) === cleanPhone(lead.phone));
        
        if (existingCustomer) {
          finalCustomerId = existingCustomer.id;
        } else {
          const newCustomer = await api.insert('customers', { 
            full_name: lead.name, 
            phone: lead.phone, 
            address: 'Alamat belum diisi',
            consultant_id: lead.consultant_id
          });
          if (newCustomer?.[0]) finalCustomerId = newCustomer[0].id;
        }
      }
      const { installments, ...restValues } = values;
      const salePayload = {
        ...restValues,
        customer_id: finalCustomerId,
        unit_id: isValidUuid(restValues.unit_id) ? restValues.unit_id : null,
        promo_id: toUuid(restValues.promo_id),
        deposit_id: toUuid(restValues.deposit_id),
        status: initialData ? initialData.status : 'active',
      };
      const saleData = initialData ? await api.update('sales', initialData.id, salePayload) : await api.insert('sales', salePayload);
      if (!saleData?.[0]) throw new Error('Gagal simpan.');
      const newSaleId = saleData[0].id;

      // Notify relevant divisions
      if (!initialData) {
        try {
          const customerName = rawCustomers.find(c => c.id === finalCustomerId)?.full_name 
            || rawLeads.find(l => l.id === finalCustomerId)?.name 
            || 'Konsumen';
            
          await api.insert('notifications', {
            target_divisions: ['marketing', 'keuangan', 'audit'],
            title: 'Penjualan Baru',
            message: `${profile?.full_name} berhasil melakukan closing penjualan kepada ${customerName} senilai ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(salePayload.final_price)}`,
            sender_name: profile?.full_name || 'Marketing',
            metadata: { type: 'marketing_sale', sale_id: newSaleId }
          });
        } catch (notifErr) {
          console.error('Failed to send sale notification:', notifErr);
        }
      }
      if (isValidUuid(values.unit_id)) {
        await api.update('units', values.unit_id, { status: 'sold' });
      }
      if (values.deposit_id) await api.update('deposits', values.deposit_id, { status: 'used', sale_id: newSaleId });

      // Save Installments Schedule (Now applicable to ALL payment methods for BF & DP)
      if (initialData) {
        await api.apiRequest(`installments?sale_id=eq.${newSaleId}`, { method: 'DELETE' });
      }

      let allInstallmentsToSave = [];

      // 1. Selalu buat tagihan Booking Fee (Jika > 0)
      if (values.booking_fee && values.booking_fee > 0) {
        allInstallmentsToSave.push({
          sale_id: newSaleId,
          name: 'Booking Fee',
          due_date: values.booking_fee_date || values.sale_date,
          amount: values.booking_fee,
          status: 'unpaid'
        });
      }

      // 2. Selalu buat tagihan Down Payment (Jika > 0)
      if (values.dp_amount && values.dp_amount > 0) {
        allInstallmentsToSave.push({
          sale_id: newSaleId,
          name: 'Down Payment',
          due_date: values.dp_date || values.sale_date,
          amount: values.dp_amount,
          status: 'unpaid'
        });
      }

      // 3. Logika sisa pelunasan berdasarkan metode bayar
      if (values.payment_method === 'installment' && installments && installments.length > 0) {
        // Gabungkan jadwal cicilan yang di-generate dari UI
        const mappedInstallments = installments.map((inst, index) => ({
          sale_id: newSaleId,
          name: inst.name || `Cicilan ${index + 1}`,
          due_date: inst.due_date,
          amount: inst.amount,
          status: 'unpaid',
        }));
        allInstallmentsToSave = [...allInstallmentsToSave, ...mappedInstallments];
      } else if (values.payment_method === 'cash') {
        // Untuk cash keras, sisa piutang dilunasi sekaligus
        const currentFinalPrice = values.final_price || 0;
        const currentBf = values.booking_fee || 0;
        const currentDp = values.dp_amount || 0;
        const depositAmt = (initialData?.deposit_amount) || watchDepositAmount || 0; // estimate deposit from state if missing
        
        const sisaCash = currentFinalPrice - currentBf - currentDp - depositAmt;
        if (sisaCash > 0) {
          allInstallmentsToSave.push({
            sale_id: newSaleId,
            name: 'Pelunasan Cash',
            due_date: values.sale_date, // Harus lunas saat transaksi
            amount: sisaCash,
            status: 'unpaid'
          });
        }
      }

      // 4. Save all installments
      if (allInstallmentsToSave.length > 0) {
        await api.insert('installments', allInstallmentsToSave);
      }

      // Auto-create SPK kontraktor untuk setiap penjualan baru
      if (!initialData && values.project_id) {
        const customerName = rawCustomers.find((c: any) => c.id === finalCustomerId)?.full_name
          || rawLeads.find((l: any) => l.id === finalCustomerId)?.name
          || 'Konsumen';
        const unitNumber = units.find((u: any) => u.id === values.unit_id)?.unit_number || '';
        try {
          await api.insert('spks', {
            id: crypto.randomUUID(),
            project_id: values.project_id,
            unit_id: isValidUuid(values.unit_id) ? values.unit_id : null,
            contractor_name: 'Belum Ditentukan',
            work_description: `Pembangunan unit ${unitNumber} atas nama ${customerName}`,
            contract_value: 0,
            start_date: values.sale_date,
            status: 'active',
            created_at: new Date().toISOString(),
          });
        } catch (spkErr) {
          console.error('Auto-create SPK gagal (tidak mempengaruhi penjualan):', spkErr);
        }
      }

      onSuccess();
    } catch (error: any) { alert(`Gagal: ${error.message}`); } finally { setLoading(false); }
  };

  // Dashboard Promo Helper
  const selectedPromo = promos.find(p => String(p.id) === String(watchPromoId));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-h-[85vh] overflow-y-auto px-1 py-1">
      {/* HEADER SECTION: DATA DASAR */}
      <div className="bg-white/40 p-5 rounded-[2rem] border border-white/60 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4 text-accent-dark" /> Data Utama Transaksi</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Controller name="sale_date" control={control} render={({ field }) => <DateInput label="Tanggal Transaksi" value={field.value} onChange={field.onChange} />} />
          <Select label="Konsultan Property" options={(() => {
            const opts = consultantStaff.map(m => ({ label: m.name, value: m.id }));
            if (initialData?.consultant_id && !opts.find(o => o.value === initialData.consultant_id)) {
              opts.unshift({ label: initialData.consultant?.name || 'Loading...', value: initialData.consultant_id });
            }
            return opts;
          })()} {...register('consultant_id')} disabled={profile?.role === 'marketing' && !!profile?.consultant_id} />
          <Select label="Nama Konsumen" options={(() => {
            const opts = customers.map(c => ({ label: c.full_name, value: c.id }));
            if (initialData?.customer_id && !opts.find(o => o.value === initialData.customer_id)) {
              opts.unshift({ label: initialData.customer?.full_name || 'Loading...', value: initialData.customer_id });
            }
            return opts;
          })()} {...register('customer_id')} disabled={!watchConsultantId} className={cn(watchDepositAmount > 0 && "border-blue-500 bg-blue-50/30")} />
          <Select label="Proyek" options={(() => {
            const opts = projects.map(p => ({ label: p.name, value: p.id }));
            if (initialData?.project_id && !opts.find(o => o.value === initialData.project_id)) {
              const projName = initialData.unit?.project?.name || 'Loading...';
              opts.unshift({ label: projName, value: initialData.project_id });
            }
            return opts;
          })()} {...register('project_id')} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <Select label="Pilih Unit / Blok" options={(() => {
            const opts = units.filter(u => u.project_id === watchProjectId).map(u => ({ label: u.unit_number, value: u.id }));
            if (initialData?.unit_id && !opts.find(o => o.value === initialData.unit_id)) {
              opts.unshift({ label: initialData.unit?.unit_number || 'Loading...', value: initialData.unit_id });
            }
            return opts;
          })()} {...register('unit_id')} disabled={!watchProjectId} />
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
          <Select label="Pilih Promo" options={(() => {
            const opts = promos.map(p => ({ label: p.name, value: p.id }));
            if (initialData?.promo_id && !opts.find(o => o.value === initialData.promo_id)) {
              opts.unshift({ label: initialData.promo?.name || 'Loading...', value: initialData.promo_id });
            }
            return opts;
          })()} {...register('promo_id')} />
          <Controller name="booking_fee" control={control} render={({ field }) => <CurrencyInput label="Nilai Booking Fee" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} />} />
          <Controller name="dp_amount" control={control} render={({ field }) => <CurrencyInput label="Nilai Down Payment" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} />} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller name="booking_fee_date" control={control} render={({ field }) => <DateInput label="Tanggal Booking Fee" value={field.value} onChange={field.onChange} />} />
          <Controller name="dp_date" control={control} render={({ field }) => <DateInput label="Tanggal Down Payment" value={field.value} onChange={field.onChange} />} />
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

      {/* INSTALLMENT SCHEDULE SECTION (ONLY FOR BERTAHAP) */}
      {watchPaymentMethod === 'installment' && (
        <div className="bg-blue-50/50 p-6 rounded-[2.5rem] border-2 border-blue-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-blue-900 flex items-center gap-2 uppercase tracking-widest"><Calendar className="w-5 h-5" /> Rencana Jadwal Cicilan (Future Schedule)</h3>
              <p className="text-[10px] text-blue-700 font-medium italic">* Tentukan jadwal penagihan piutang di masa mendatang.</p>
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => generateDefaultSchedule(3)}
                className="rounded-xl border-blue-300 text-blue-900 hover:bg-blue-100 font-bold text-[10px]"
              >
                Auto 3 Bln
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => generateDefaultSchedule(6)}
                className="rounded-xl border-blue-300 text-blue-900 hover:bg-blue-100 font-bold text-[10px]"
              >
                Auto 6 Bln
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => generateDefaultSchedule(12)}
                className="rounded-xl border-blue-300 text-blue-900 hover:bg-blue-100 font-bold text-[10px]"
              >
                Auto 12 Bln
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => generateDefaultSchedule(18)}
                className="rounded-xl border-blue-300 text-blue-900 hover:bg-blue-100 font-bold text-[10px]"
              >
                Auto 18 Bln
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => appendInstallment({ due_date: new Date().toISOString().split('T')[0], amount: 0, status: 'unpaid' })}
                className="rounded-xl border-blue-300 text-blue-900 hover:bg-blue-100 font-bold gap-2"
              >
                <Plus className="w-4 h-4" /> Tambah Manual
              </Button>
            </div>
          </div>

          {/* Helper for Indonesian Date Input */}
          <div className="space-y-3">
            {installmentFields.map((field, index) => (
              <div key={field.id} className="bg-white/60 p-4 rounded-2xl border border-blue-200/60 relative group flex items-end gap-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex-1">
                  <Controller 
                    name={`installments.${index}.due_date`}
                    control={control}
                    render={({ field }) => <DateInput label={`Jatuh Tempo #${index + 1}`} value={field.value} onChange={field.onChange} />}
                  />
                </div>
                <div className="flex-[2]">
                  <Controller 
                    name={`installments.${index}.amount`} 
                    control={control} 
                    render={({ field }) => <CurrencyInput label="Nilai Tagihan" value={field.value} onValueChange={(v) => field.onChange(v.floatValue || 0)} placeholder="Rp 0" />} 
                  />
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeInstallment(index)} 
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl mb-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-blue-300 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Total Jadwal Terencana:</span>
              <span className="text-xl font-black text-blue-900">{formatCurrency(totalInstallmentPlanned)}</span>
            </div>
            {Math.abs(remainingAfterPayment - totalInstallmentPlanned) > 100 && (
              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Selisih Belum Terjadwal:</span>
                <span className="text-lg font-black text-red-600">{formatCurrency(remainingAfterPayment - totalInstallmentPlanned)}</span>
              </div>
            )}
            {Math.abs(remainingAfterPayment - totalInstallmentPlanned) <= 100 && (
              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Status:</span>
                <span className="text-sm font-black text-emerald-600 uppercase">Jadwal Sesuai Piutang ✓</span>
              </div>
            )}
          </div>
        </div>
      )}

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
