import React from 'react';
import { Calendar, User, Home, MapPin, DollarSign, Tag, Clock, Briefcase } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface SaleDetailProps {
  sale: any;
  onClose: () => void;
}

export const SaleDetail: React.FC<SaleDetailProps> = ({ sale }) => {
  if (!sale) return null;

  const DetailSection = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );

  const DataField = ({ label, value, isCurrency = false }: { label: string, value: any, isCurrency?: boolean }) => (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-black text-slate-900 text-sm">
        {isCurrency ? formatCurrency(value || 0) : (value || '-')}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-600/20">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Total Akhir</p>
          <p className="text-2xl font-black">{formatCurrency(sale.final_price)}</p>
        </div>
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Status Transaksi</p>
          <p className="text-xl font-black uppercase tracking-widest">{sale.status}</p>
        </div>
        <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Metode Bayar</p>
          <p className="text-xl font-black uppercase tracking-widest">{sale.payment_method}</p>
        </div>
      </div>

      <DetailSection title="Informasi Dasar" icon={Calendar}>
        <DataField label="Tanggal Transaksi" value={sale.sale_date} />
        <DataField label="Nama Konsumen" value={sale.customer?.full_name} />
        <DataField label="Proyek" value={sale.unit?.project?.name} />
        <DataField label="Blok / Unit" value={sale.unit?.unit_number} />
      </DetailSection>

      <DetailSection title="Tim Marketing" icon={Briefcase}>
        <DataField label="Marketing" value={sale.marketing?.name} />
        <DataField label="Supervisor" value={sale.supervisor} />
        <DataField label="Manager" value={sale.manager} />
        <DataField label="Makelar / Freelance" value={sale.makelar || sale.freelance} />
      </DetailSection>

      <DetailSection title="Rincian Biaya" icon={DollarSign}>
        <DataField label="Harga Rumah" value={sale.price || sale.unit?.price} isCurrency />
        <DataField label="Potongan (Discount)" value={sale.discount} isCurrency />
        <DataField label="Promo" value={sale.promo?.name || 'Tidak ada'} />
        <DataField label="Total Harga" value={sale.total_price} isCurrency />
        <DataField label="Booking Fee" value={sale.booking_fee} isCurrency />
        <DataField label="Tgl Booking Fee" value={sale.booking_fee_date} />
      </DetailSection>

      {/* INSTALLMENTS IF ANY */}
      {sale.payment_method === 'installment' && sale.installments && sale.installments.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Jadwal Cicilan</h3>
          </div>
          <div className="space-y-2">
            {sale.installments.map((inst: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-white rounded-lg text-[10px] font-black text-slate-400 border border-slate-100">{idx + 1}</span>
                  <span className="text-sm font-bold text-slate-700">{inst.date}</span>
                </div>
                <span className="font-black text-slate-900 text-sm">{formatCurrency(inst.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
