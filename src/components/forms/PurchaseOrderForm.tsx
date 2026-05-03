import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { PRItemForPO } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Info, Lock, Trash2 } from 'lucide-react';
import { SearchableSelect } from '../ui/SearchableSelect';

const poSchema = z.object({
  project_id: z.string().min(1, 'Proyek harus dipilih'),
  material_id: z.string().min(1, 'Master Material harus dipilih'),
  id_variant: z.number().optional(),
  supplier_id: z.string().min(1, 'Supplier harus dipilih'),
  quantity: z.number().min(1, 'Jumlah minimal 1'),
  unit_price: z.number().min(0, 'Harga harus positif'),
  order_date: z.string(),
  due_date: z.string().min(1, 'Tanggal jatuh tempo harus diisi'),
  pr_id: z.string().optional(),
  rab_project_id: z.string().optional(),
});

type POFormValues = z.infer<typeof poSchema>;

interface ItemDetail {
  variants: any[];
  variantId?: number;
  unitPrice: number;
  isNewVariant: boolean;
  newMerk: string;
  newSpek: string;
}

interface POFormProps {
  onSuccess: (values?: any) => void;
  onCancel: () => void;
  initialPR?: PRItemForPO;
  initialOrder?: any;
  initialPRItems?: PRItemForPO[];
}

export const PurchaseOrderForm: React.FC<POFormProps> = ({ onSuccess, onCancel, initialPR, initialOrder, initialPRItems }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [masters, setMasters] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Batch mode state
  const isBatchMode = !!(initialPRItems && initialPRItems.length > 0);
  const [batchSupplier, setBatchSupplier] = useState('');
  const [batchOrderDate, setBatchOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchDueDate, setBatchDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [itemDetails, setItemDetails] = useState<ItemDetail[]>(() =>
    (initialPRItems || []).map(() => ({ variants: [], variantId: undefined, unitPrice: 0, isNewVariant: false, newMerk: '', newSpek: '' }))
  );

  const fromPR = !!initialPR;
  const isEditMode = !!initialOrder;

  const toDateStr = (v: any) => v ? String(v).split('T')[0] : '';

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      order_date: initialOrder?.order_date ? toDateStr(initialOrder.order_date) : new Date().toISOString().split('T')[0],
      due_date: initialOrder?.due_date ? toDateStr(initialOrder.due_date) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      unit_price: Number(initialOrder?.unit_price) || 0,
      quantity: Number(initialOrder?.quantity) || Number(initialPR?.quantity) || 1,
      project_id: initialOrder?.project_id || initialPR?.project_id || '',
      material_id: initialOrder?.material_id || initialPR?.material_id || '',
      supplier_id: initialOrder?.supplier_id ? String(initialOrder.supplier_id) : '',
      id_variant: initialOrder?.id_variant ? Number(initialOrder.id_variant) : undefined,
      pr_id: initialOrder?.pr_id || initialPR?.prId || undefined,
      rab_project_id: initialOrder?.rab_project_id || initialPR?.rab_project_id || undefined,
    },
  });

  const [isNewVariant, setIsNewVariant] = useState(false);
  const [newVariant, setNewVariant] = useState({ merk: '', spesifikasi: '' });

  const selectedMaterialId = watch('material_id');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedMaterialId) {
      fetchVariants(selectedMaterialId);
    } else {
      setVariants([]);
    }
  }, [selectedMaterialId]);

  useEffect(() => {
    if (initialOrder?.id_variant && variants.length > 0) {
      setValue('id_variant', Number(initialOrder.id_variant));
    }
  }, [variants]);

  const fetchInitialData = async () => {
    try {
      const [masterData, supplierData, projectData] = await Promise.all([
        api.get('materials', 'select=id,name&order=name.asc'),
        api.get('material_suppliers', 'select=id,name&order=name.asc'),
        api.get('projects', 'select=id,name&order=name.asc')
      ]);
      setMasters(masterData);
      setSuppliers(supplierData);
      setProjects(projectData);

      if (isBatchMode && initialPRItems) {
        const variantResults = await Promise.all(
          initialPRItems.map(item =>
            api.get('material_variants', `material_id=eq.${item.material_id}&select=*&order=merk.asc`)
          )
        );
        setItemDetails(initialPRItems.map((_, i) => ({
          variants: variantResults[i] || [],
          variantId: undefined,
          unitPrice: 0,
          isNewVariant: false,
          newMerk: '',
          newSpek: ''
        })));
      } else if (initialOrder) {
        setValue('project_id', initialOrder.project_id || '');
        setValue('material_id', initialOrder.material_id || '');
        setValue('supplier_id', String(initialOrder.supplier_id || ''));
        setValue('quantity', Number(initialOrder.quantity) || 0);
        setValue('unit_price', Number(initialOrder.unit_price) || 0);
        setValue('order_date', toDateStr(initialOrder.order_date));
        setValue('due_date', toDateStr(initialOrder.due_date));
        if (initialOrder.pr_id) setValue('pr_id', initialOrder.pr_id);
      } else if (initialPR) {
        setValue('project_id', initialPR.project_id);
        setValue('material_id', initialPR.material_id);
        setValue('quantity', Number(initialPR.quantity));
        if (initialPR.prId) setValue('pr_id', initialPR.prId);
        if (initialPR.rab_project_id) setValue('rab_project_id', initialPR.rab_project_id);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setDataLoaded(true);
    }
  };

  const fetchVariants = async (id: string) => {
    try {
      const data = await api.get('material_variants', `material_id=eq.${id}&select=*&order=merk.asc`);
      setVariants(data);
    } catch (err) {
      console.error('Error fetching variants:', err);
    }
  };

  const handleDeleteVariant = async (variantId: number, idx?: number) => {
    const variant = idx !== undefined 
      ? itemDetails[idx].variants.find(v => v.id === variantId)
      : variants.find(v => v.id === variantId);

    if (!variant) return;
    
    if (Number(variant.stok) > 0) {
      alert(`Tidak bisa menghapus varian "${variant.merk}" karena sudah memiliki stok (${variant.stok}).`);
      return;
    }

    if (!confirm(`Hapus varian "${variant.merk}"? Tindakan ini tidak bisa dibatalkan.`)) return;

    try {
      await api.delete('material_variants', variantId);
      
      // Refresh list
      if (idx !== undefined) {
        const newDetails = [...itemDetails];
        newDetails[idx].variants = newDetails[idx].variants.filter(v => v.id !== variantId);
        newDetails[idx].variantId = undefined;
        setItemDetails(newDetails);
      } else {
        setVariants(prev => prev.filter(v => v.id !== variantId));
        setValue('id_variant', undefined);
      }
    } catch (err) {
      console.error('Error deleting variant:', err);
      alert('Gagal menghapus varian. Mungkin sudah ada transaksi terkait.');
    }
  };

  const onSubmit = async (values: POFormValues) => {
    setLoading(true);
    try {
      let finalVariantId = values.id_variant;

      if (isNewVariant) {
        if (!newVariant.merk) {
          alert('Nama Merk harus diisi untuk varian baru');
          setLoading(false);
          return;
        }
        const createdVariant = await api.insert('material_variants', {
          material_id: values.material_id,
          merk: newVariant.merk,
          spesifikasi: newVariant.spesifikasi,
          stok: 0
        });
        finalVariantId = createdVariant[0].id;
      }

      if (!finalVariantId) {
        alert('Silakan pilih varian atau tambah merk baru');
        setLoading(false);
        return;
      }

      const total_price = values.quantity * values.unit_price;
      const poItem = {
        material_id: values.material_id,
        material_name: masters.find(m => m.id === values.material_id)?.name || '-',
        id_variant: finalVariantId,
        quantity: values.quantity,
        unit_price: values.unit_price,
        subtotal: total_price,
        pr_id: values.pr_id
      };

      if (initialOrder) {
        await api.update('purchase_orders', initialOrder.id, {
          project_id: values.project_id,
          supplier_id: Number(values.supplier_id),
          date: values.order_date,
          due_date: values.due_date,
          total_price,
          status: initialOrder.status,
          rab_project_id: values.rab_project_id,
          items: [poItem]
        });
      } else {
        const po_number = `PO-${Date.now().toString().slice(-8)}`;
        await api.insert('purchase_orders', {
          id: crypto.randomUUID(),
          project_id: values.project_id,
          supplier_id: Number(values.supplier_id),
          date: values.order_date,
          due_date: values.due_date,
          po_number,
          total_price,
          status: 'PENDING',
          rab_project_id: values.rab_project_id,
          items: [poItem]
        });
      }

      onSuccess(values);
    } catch (error: any) {
      console.error('Error saving PO:', error);
      alert(`Gagal menyimpan PO: ${error?.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const updateItemDetail = (i: number, patch: Partial<ItemDetail>) => {
    setItemDetails(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  };

  const onBatchSubmit = async () => {
    if (!batchSupplier) { alert('Supplier harus dipilih'); return; }
    setLoading(true);
    try {
      const poItems = [];
      const po_number = `PO-${Date.now().toString().slice(-8)}`;
      let grandTotal = 0;

      for (let i = 0; i < initialPRItems!.length; i++) {
        const item = initialPRItems![i];
        const detail = itemDetails[i];
        let variantId = detail.variantId;

        if (detail.isNewVariant) {
          if (!detail.newMerk) {
            alert(`Merk untuk "${item.master?.name}" harus diisi`);
            setLoading(false);
            return;
          }
          const created = await api.insert('material_variants', {
            material_id: item.material_id,
            merk: detail.newMerk,
            spesifikasi: detail.newSpek,
            stok: 0
          });
          variantId = created[0].id;
        }

        if (!variantId) {
          alert(`Pilih varian untuk "${item.master?.name}"`);
          setLoading(false);
          return;
        }

        const subtotal = Number(item.quantity) * detail.unitPrice;
        grandTotal += subtotal;

        poItems.push({
          material_id: item.material_id,
          material_name: item.master?.name || '-',
          id_variant: variantId,
          quantity: Number(item.quantity),
          unit_price: detail.unitPrice,
          subtotal,
          pr_id: item.prId
        });
      }

      // Insert as ONE PO
      await api.insert('purchase_orders', {
        id: crypto.randomUUID(),
        project_id: initialPRItems![0].project_id,
        supplier_id: Number(batchSupplier),
        date: batchOrderDate,
        due_date: batchDueDate,
        po_number,
        total_price: grandTotal,
        status: 'PENDING',
        rab_project_id: initialPRItems![0].rab_project_id,
        items: poItems // Store all items in JSONB
      });

      // Notify
      try {
        await api.insert('notifications', {
          target_divisions: ['teknik', 'audit', 'keuangan'],
          title: 'Purchase Order (PO) Dibuat',
          message: `${profile?.full_name} menerbitkan PO baru #${po_number} untuk proyek ${projectLabel || 'Proyek'}`,
          sender_name: profile?.full_name || 'Purchasing',
          metadata: { type: 'teknik_po_new', po_number }
        });
      } catch (notifErr) {
        console.error('Failed to send PO notification:', notifErr);
      }

      onSuccess();
    } catch (error: any) {
      alert(`Gagal membuat PO: ${error?.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const projectLabel = fromPR
    ? (projects.find(p => p.id === initialPR!.project_id)?.name || initialPR!.projectName || initialPR!.project_id)
    : null;

  const materialLabel = fromPR
    ? (masters.find(m => m.id === initialPR!.material_id)?.name || initialPR!.master?.name || initialPR!.material_id)
    : null;

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-accent-dark/20 border-t-accent-dark rounded-full animate-spin" />
      </div>
    );
  }

  if (isBatchMode) {
    const batchTotal = (initialPRItems || []).reduce(
      (sum, item, i) => sum + Number(item.quantity) * (itemDetails[i]?.unitPrice || 0), 0
    );
    return (
      <div className="space-y-6 px-2 pb-2">
        {/* Banner info sumber PR */}
        <div className="flex items-center gap-4 px-6 py-4 rounded-[24px] bg-blue-50/50 border-2 border-blue-100/50 text-blue-700 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600 flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Mode Batch: Membuat {initialPRItems!.length} PO sekaligus dari PR yang sama.
          </span>
        </div>

        {/* Shared: Supplier + Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchableSelect
            label="Supplier / Vendor"
            options={suppliers.map(s => ({ label: s.name, value: String(s.id) }))}
            value={batchSupplier}
            onChange={(v) => setBatchSupplier(String(v))}
            placeholder="Pilih supplier..."
          />
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Order</label>
            <input
              type="date"
              value={batchOrderDate}
              onChange={e => setBatchOrderDate(e.target.value)}
              className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 text-sm font-black text-slate-700 focus:outline-none focus:border-accent-lavender transition-all shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Jatuh Tempo</label>
            <input
              type="date"
              value={batchDueDate}
              onChange={e => setBatchDueDate(e.target.value)}
              className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 text-sm font-black text-slate-700 focus:outline-none focus:border-accent-lavender transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Per-item cards */}
        <div className="space-y-3">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">{initialPRItems!.length} Item Material</p>
          {initialPRItems!.map((item, i) => {
            const detail = itemDetails[i];
            if (!detail) return null;
            return (
              <div key={i} className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-[24px] border-2 border-slate-100 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-dark/10 flex items-center justify-center text-xs font-black text-accent-dark shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{item.master?.name || item.material_id}</p>
                    <p className="text-xs text-slate-400">
                      Qty: <span className="font-black text-slate-600">{item.quantity}</span> · {item.projectName}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Variant selector per item */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Variant (Merk)</label>
                      <button
                        type="button"
                        onClick={() => updateItemDetail(i, { isNewVariant: !detail.isNewVariant })}
                        className="text-[10px] font-black text-accent-dark bg-accent-dark/5 px-2 py-1 rounded-md uppercase tracking-widest hover:bg-accent-dark/10 transition-colors"
                      >
                        {detail.isNewVariant ? '← Pilih ada' : '+ Merk Baru'}
                      </button>
                    </div>
                    {detail.isNewVariant ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Nama Merk..."
                          value={detail.newMerk}
                          onChange={e => updateItemDetail(i, { newMerk: e.target.value })}
                          className="h-12 rounded-xl bg-white border-2 border-slate-100 px-4 text-sm font-black text-slate-700 focus:outline-none focus:border-accent-lavender"
                        />
                        <input
                          placeholder="Spek (Opsional)"
                          value={detail.newSpek}
                          onChange={e => updateItemDetail(i, { newSpek: e.target.value })}
                          className="h-12 rounded-xl bg-white border-2 border-slate-100 px-4 text-sm font-black text-slate-700 focus:outline-none focus:border-accent-lavender"
                        />
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          value={detail.variantId ?? ''}
                          onChange={e => updateItemDetail(i, { variantId: e.target.value ? Number(e.target.value) : undefined })}
                          className="flex-1 h-12 rounded-xl bg-white border-2 border-slate-100 px-4 text-sm font-black text-slate-700 focus:outline-none focus:border-accent-lavender appearance-none cursor-pointer"
                        >
                          <option value="">Pilih Variant / Merk</option>
                          {(detail.variants || []).map(v => (
                            <option key={v.id} value={v.id}>{v.merk}{v.spesifikasi ? ` (${v.spesifikasi})` : ''}</option>
                          ))}
                        </select>
                        {detail.variantId && (
                          <button
                            type="button"
                            onClick={() => handleDeleteVariant(detail.variantId!, i)}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors border-2 border-rose-100"
                            title="Hapus Varian"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Unit price per item */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Harga Satuan (Rp)</label>
                    <CurrencyInput
                      value={detail.unitPrice}
                      onValueChange={(values) => updateItemDetail(i, { unitPrice: values.floatValue || 0 })}
                      className="h-12 rounded-xl font-black border-2 border-slate-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1 border-t border-slate-100">
                  <span className="text-sm font-black text-slate-600">
                    Subtotal:&nbsp;
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(item.quantity) * detail.unitPrice)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grand total */}
        <div className="p-6 bg-slate-100 border-2 border-slate-200 rounded-[24px] flex justify-between items-center">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Total Estimasi Pembelian</p>
          <p className="text-3xl font-black tracking-tighter">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(batchTotal)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            className="h-14 rounded-2xl text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-100 px-8"
            onClick={onCancel}
          >
            Batalkan
          </Button>
          <Button
            type="button"
            className="h-14 rounded-2xl px-12 font-black text-sm uppercase tracking-widest shadow-premium bg-accent-dark hover:bg-slate-800 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            isLoading={loading}
            onClick={onBatchSubmit}
          >
            Buat {initialPRItems!.length} PO
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 px-2 pb-2">

      {/* Banner info sumber PR */}
      {fromPR && (
        <div className="flex items-center gap-4 px-6 py-4 rounded-[24px] bg-blue-50/50 border-2 border-blue-100/50 text-blue-700 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600 flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            PO dibuat dari PR&nbsp;
            <span className="font-black underline decoration-blue-200 decoration-2 underline-offset-4">PR-{initialPR!.prId?.slice(0, 6).toUpperCase()}</span>
            &nbsp;— Proyek, material, dan jumlah dikunci sesuai PR.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proyek */}
        <div className="space-y-2">
          {fromPR ? (
            <>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600">1</span>
                Referensi Proyek
              </label>
              <input type="hidden" {...register('project_id')} />
              <div className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 flex items-center text-sm font-black text-slate-800 select-none shadow-sm">
                {projectLabel || '...'}
              </div>
            </>
          ) : (
            <Controller
              name="project_id"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label="Referensi Proyek"
                  options={projects.map(p => ({ label: p.name, value: p.id }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Cari proyek..."
                  error={errors.project_id?.message}
                />
              )}
            />
          )}
        </div>

        {/* Supplier */}
        <div className="space-y-2">
          <Controller
            name="supplier_id"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label="Pilih Supplier / Vendor"
                options={suppliers.map(s => ({ label: s.name, value: String(s.id) }))}
                value={String(field.value || '')}
                onChange={field.onChange}
                placeholder="Cari & pilih supplier..."
                error={errors.supplier_id?.message}
              />
            )}
          />
        </div>
      </div>

      <div className="space-y-4 p-6 bg-gradient-to-br from-slate-50 to-white rounded-[32px] border-2 border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-accent-dark/5 flex items-center justify-center text-accent-dark">
            <Info className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Detail Material Pesanan</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Master Material */}
          <div className="space-y-2">
            {fromPR ? (
              <>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Master Material</label>
                <input type="hidden" {...register('material_id')} />
                <div className="w-full h-14 rounded-2xl bg-white border-2 border-slate-100 px-5 flex items-center text-sm font-black text-slate-800 select-none shadow-sm">
                  {materialLabel || '...'}
                </div>
              </>
            ) : (
              <Controller
                name="material_id"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="Master Material"
                    options={masters.map(m => ({ label: m.name, value: m.id }))}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Cari material..."
                    error={errors.material_id?.message}
                  />
                )}
              />
            )}
          </div>

          {/* Variant (Merk) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Variant (Merk)</label>
              <button
                type="button"
                onClick={() => setIsNewVariant(!isNewVariant)}
                className="text-[10px] font-black text-accent-dark bg-accent-dark/5 px-2 py-1 rounded-md uppercase tracking-widest hover:bg-accent-dark/10 transition-colors"
              >
                {isNewVariant ? '← Pilih yang ada' : '+ Merk Baru'}
              </button>
            </div>

            {isNewVariant ? (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Nama Merk..."
                  value={newVariant.merk}
                  onChange={(e) => setNewVariant({ ...newVariant, merk: e.target.value })}
                  className="h-14 rounded-2xl font-black text-slate-700 border-2 border-slate-100 shadow-sm"
                />
                <Input
                  placeholder="Spek (Opsional)"
                  value={newVariant.spesifikasi}
                  onChange={(e) => setNewVariant({ ...newVariant, spesifikasi: e.target.value })}
                  className="h-14 rounded-2xl font-black text-slate-700 border-2 border-slate-100 shadow-sm"
                />
              </div>
            ) : (
              <Controller
              name="id_variant"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  <select
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    className="flex-1 h-14 rounded-2xl bg-white border-2 border-slate-100 px-5 text-sm font-black text-slate-700 focus:outline-none focus:border-accent-lavender appearance-none cursor-pointer shadow-sm transition-all"
                  >
                    <option value="">Pilih Variant / Merk</option>
                    {variants.map(v => (
                      <option key={v.id} value={v.id}>{v.merk}{v.spesifikasi ? ` (${v.spesifikasi})` : ''}</option>
                    ))}
                  </select>
                  {field.value && (
                    <button
                      type="button"
                      onClick={() => handleDeleteVariant(Number(field.value))}
                      className="w-14 h-14 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors border-2 border-rose-100 shadow-sm"
                      title="Hapus Varian"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                </div>
              )}
            />
            )}
            {errors.id_variant && !isNewVariant && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.id_variant.message}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Jumlah */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kuantitas Pesanan</label>
          {fromPR ? (
            <div className="relative">
              <input type="hidden" {...register('quantity', { valueAsNumber: true })} />
              <div className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 flex items-center text-xl font-black text-slate-800 select-none shadow-sm">
                {initialPR!.quantity}
              </div>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">ITEM</div>
            </div>
          ) : (
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <NumberInput
                  value={field.value}
                  onValueChange={(values) => field.onChange(values.floatValue || 0)}
                  error={errors.quantity?.message}
                  className="h-14 rounded-2xl font-black text-xl border-2 border-slate-100 shadow-sm"
                />
              )}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga Satuan (Rp)</label>
          <Controller
            name="unit_price"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onValueChange={(values) => field.onChange(values.floatValue || 0)}
                error={errors.unit_price?.message}
                className="h-14 rounded-2xl font-black text-xl border-2 border-slate-100 shadow-sm"
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Transaksi</label>
          <Input
            type="date"
            {...register('order_date')}
            error={errors.order_date?.message}
            className="h-14 rounded-2xl font-black border-2 border-slate-100 shadow-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Jatuh Tempo Pembayaran</label>
          <Input
            type="date"
            {...register('due_date')}
            error={errors.due_date?.message}
            className="h-14 rounded-2xl font-black border-2 border-slate-100 shadow-sm"
          />
        </div>
      </div>

      <div className="p-8 bg-slate-100 border-2 border-slate-200 text-slate-900 rounded-[32px] shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <Info className="w-24 h-24 -mr-8 -mt-8" />
        </div>
        <div className="flex justify-between items-end relative z-10">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Total Estimasi Pembelian</p>
            <p className="text-4xl font-black tracking-tighter">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(watch('quantity') * watch('unit_price') || 0)}
            </p>
          </div>
          {initialPR?.prId && (
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Referensi Dokumen</p>
              <div className="px-3 py-1 bg-slate-200/50 rounded-lg border border-slate-300 inline-block">
                <span className="text-xs font-black text-slate-700">PR-{initialPR.prId.slice(0, 6).toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-slate-100">
        <Button
          type="button"
          variant="ghost"
          className="h-14 rounded-2xl text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-100 px-8"
          onClick={onCancel}
        >
          Batalkan
        </Button>
        <Button
          type="submit"
          className="h-14 rounded-2xl px-16 font-black text-sm uppercase tracking-widest shadow-premium bg-accent-dark hover:bg-slate-800 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          isLoading={loading}
        >
          {isEditMode ? 'Simpan Perubahan' : 'Konfirmasi & Buat PO'}
        </Button>
      </div>
    </form>
  );
};
