import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Plus, Trash2, PenTool, CheckCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { DateInput } from '../components/ui/DateInput';

interface AddonItem {
  id: string;
  sale_id: string;
  name: string;
  description: string;
  price: number;
  status: string;
  created_at: string;
  sale?: {
    customer?: { full_name: string };
    unit?: { unit_number: string };
  };
}

interface ScheduleInput {
  amount: number;
  due_date: string;
  name_suffix: string;
}

interface AddonFormData {
  sale_id: string;
  name: string;
  description: string;
  price: number;
  schedules: ScheduleInput[];
}

const SaleAddons: React.FC = () => {
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<AddonFormData>({
    defaultValues: {
      schedules: [{ amount: 0, due_date: new Date().toISOString().split('T')[0], name_suffix: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "schedules"
  });

  const watchPrice = watch('price') || 0;
  const watchSchedules = watch('schedules') || [];
  const totalScheduled = watchSchedules.reduce((sum, sch) => sum + (Number(sch.amount) || 0), 0);
  const remainingPrice = watchPrice - totalScheduled;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [addonsData, salesData] = await Promise.all([
        api.get('sale_addons', 'select=*,sale:sales(customer:customers(full_name),unit:units(unit_number))&order=created_at.desc'),
        api.get('sales', 'select=id,customer:customers(full_name),unit:units(unit_number)&status=eq.active&order=created_at.desc')
      ]);
      setAddons(addonsData || []);
      setSales(salesData || []);
    } catch (error) {
      console.error('Error fetching addons:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AddonFormData) => {
    try {
      if (Math.abs(remainingPrice) > 1) { // allow tiny floating point differences, though it's currency so it should be exact
        alert(`Gagal: Total jadwal (Rp ${totalScheduled.toLocaleString('id-ID')}) tidak sama dengan Harga Pekerjaan (Rp ${data.price.toLocaleString('id-ID')}). Sisa: Rp ${remainingPrice.toLocaleString('id-ID')}`);
        return;
      }

      setLoading(true);
      
      // 1. Insert into sale_addons
      const newAddon = await api.insert('sale_addons', {
        sale_id: data.sale_id,
        name: data.name,
        description: data.description,
        price: data.price,
        status: 'pending'
      });

      if (newAddon && newAddon[0]) {
        // 2. Insert multiple installments
        for (let i = 0; i < data.schedules.length; i++) {
          const sch = data.schedules[i];
          const suffix = sch.name_suffix ? ` - ${sch.name_suffix}` : (data.schedules.length > 1 ? ` (Termin ${i + 1})` : '');
          
          await api.insert('installments', {
            sale_id: data.sale_id,
            addon_id: newAddon[0].id,
            name: `Addon: ${data.name}${suffix}`,
            amount: sch.amount,
            due_date: sch.due_date,
            status: 'unpaid'
          });
        }
      }

      setIsFormOpen(false);
      reset();
      await fetchData();
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pekerjaan tambahan ini? Tagihan yang terkait akan otomatis terhapus dari Schedule Pembayaran Konsumen.')) return;
    try {
      setLoading(true);
      await api.delete('sale_addons', id);
      await fetchData();
    } catch (error: any) {
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Pekerjaan Tambahan</h1>
          <p className="text-text-secondary">Manajemen permintaan khusus dan tagihan pekerjaan tambahan konsumen</p>
        </div>
        <Button onClick={() => setIsFormOpen(!isFormOpen)}>
          <Plus className="w-4 h-4 mr-2" />
          {isFormOpen ? 'Tutup Form' : 'Tambah Pekerjaan'}
        </Button>
      </div>

      {isFormOpen && (
        <Card className="p-6 border-accent-lavender/30 shadow-3d">
          <h2 className="text-lg font-bold mb-4">Input Pekerjaan Tambahan & Termin Tagihan</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
            <div className="space-y-4">
              <Select
                label="Transaksi Penjualan (Konsumen)"
                options={sales.map(s => ({
                  label: `${s.customer?.full_name || '-'} (Unit: ${s.unit?.unit_number || '-'})`,
                  value: s.id
                }))}
                {...register('sale_id', { required: 'Pilih konsumen' })}
                error={errors.sale_id?.message}
              />
              
              <Input
                label="Nama Pekerjaan"
                placeholder="Contoh: Kanopi Depan, Teralis Jendela"
                {...register('name', { required: 'Nama pekerjaan wajib diisi' })}
                error={errors.name?.message}
              />

              <Controller
                name="price"
                control={control}
                rules={{ required: 'Harga wajib diisi', min: 1 }}
                render={({ field }) => (
                  <CurrencyInput
                    label="Harga Pekerjaan Total (Rp)"
                    value={field.value}
                    onValueChange={(values) => field.onChange(values.floatValue || 0)}
                    error={errors.price?.message}
                  />
                )}
              />

              <Input
                label="Deskripsi Tambahan"
                placeholder="Catatan khusus mengenai pekerjaan ini"
                {...register('description')}
              />
            </div>

            <div className="border-t border-slate-200 pt-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-text-primary">Jadwal Pembayaran / Termin</h3>
                <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 flex gap-4">
                  <span>Total Harga: <span className="text-accent-dark font-black">{formatCurrency(watchPrice)}</span></span>
                  <span className={remainingPrice === 0 ? "text-emerald-600" : "text-rose-600"}>
                    Sisa: <span className="font-black">{formatCurrency(remainingPrice)}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-wrap sm:flex-nowrap gap-3 items-start p-3 bg-slate-50/50 border border-slate-100 rounded-xl relative group">
                    <div className="w-full sm:w-1/3">
                      <Controller
                        name={`schedules.${index}.amount`}
                        control={control}
                        rules={{ required: true, min: 1 }}
                        render={({ field: cField }) => (
                          <CurrencyInput
                            label={`Nominal Termin ${index + 1}`}
                            value={cField.value}
                            onValueChange={(values) => cField.onChange(values.floatValue || 0)}
                          />
                        )}
                      />
                    </div>
                    <div className="w-full sm:w-1/3">
                      <Controller
                        name={`schedules.${index}.due_date`}
                        control={control}
                        rules={{ required: true }}
                        render={({ field: cField }) => (
                          <DateInput
                            label="Jatuh Tempo"
                            value={cField.value}
                            onChange={cField.onChange}
                          />
                        )}
                      />
                    </div>
                    <div className="w-full sm:flex-1">
                      <Input
                        label="Keterangan (Opsional)"
                        placeholder="Cth: DP, Pelunasan"
                        {...register(`schedules.${index}.name_suffix`)}
                      />
                    </div>
                    
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="absolute -right-2 -top-2 w-6 h-6 bg-white border border-rose-200 rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus termin ini"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 text-xs border-dashed"
                onClick={() => append({ amount: remainingPrice > 0 ? remainingPrice : 0, due_date: new Date().toISOString().split('T')[0], name_suffix: '' })}
              >
                <Plus className="w-3 h-3 mr-1" /> Tambah Termin
              </Button>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
              <Button type="submit" disabled={loading || remainingPrice !== 0}>
                {remainingPrice !== 0 ? 'Nominal Termin Belum Sesuai' : 'Simpan & Buat Tagihan'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <Table className="min-w-[800px]">
          <THead>
            <TR className="bg-white/30">
              <TH className="px-6 py-4">Tanggal</TH>
              <TH className="px-6 py-4">Konsumen & Unit</TH>
              <TH className="px-6 py-4">Pekerjaan</TH>
              <TH className="px-6 py-4 text-right">Harga</TH>
              <TH className="px-6 py-4 text-center">Status</TH>
              <TH className="px-6 py-4 text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={6} className="text-center py-8">Memuat data...</TD></TR>
            ) : addons.length === 0 ? (
              <TR><TD colSpan={6} className="text-center py-8 text-text-secondary">Belum ada pekerjaan tambahan.</TD></TR>
            ) : (
              addons.map(addon => (
                <TR key={addon.id}>
                  <TD className="px-6 py-4">{formatDate(addon.created_at)}</TD>
                  <TD className="px-6 py-4">
                    <div className="font-bold text-text-primary">{addon.sale?.customer?.full_name || '-'}</div>
                    <div className="text-xs text-text-muted mt-1">Unit: {addon.sale?.unit?.unit_number || '-'}</div>
                  </TD>
                  <TD className="px-6 py-4">
                    <div className="font-medium text-text-primary">{addon.name}</div>
                    <div className="text-xs text-text-secondary mt-1">{addon.description || '-'}</div>
                  </TD>
                  <TD className="px-6 py-4 text-right font-bold text-accent-dark">
                    {formatCurrency(addon.price)}
                  </TD>
                  <TD className="px-6 py-4 text-center">
                    {addon.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> {addon.status}
                      </span>
                    )}
                  </TD>
                  <TD className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(addon.id)} className="text-rose-500 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
};

export default SaleAddons;
