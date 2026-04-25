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
    <div className="glass-card rounded-xl p-6 border border-white/40 shadow-glass space-y-4">
      <div className="flex items-center gap-3 border-b border-white/20 pb-4">
        <div className="p-2 bg-accent-lavender/20 text-accent-dark rounded-xl">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-black text-text-primary uppercase tracking-widest text-xs">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );

  const DataField = ({ label, value, isCurrency = false }: { label: string, value: any, isCurrency?: boolean }) => (
    <div>
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="font-black text-text-primary text-sm">
        {isCurrency ? formatCurrency(value || 0) : (value || '-')}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-accent-dark rounded-xl p-6 text-white shadow-glass shadow-glass">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Total Akhir</p>
          <p className="text-2xl font-black">{formatCurrency(sale.final_price)}</p>
        </div>
        <div className="bg-accent-dark rounded-xl p-6 text-white shadow-glass shadow-glass">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Status Transaksi</p>
          <p className="text-xl font-black uppercase tracking-widest">{sale.status}</p>
        </div>
        <div className="bg-emerald-500 rounded-xl p-6 text-white shadow-glass shadow-glass">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Metode Bayar</p>
          <p className="text-xl font-black uppercase tracking-widest">{sale.payment_method}</p>
        </div>
      </div>

      <DetailSection title="Informasi Dasar" icon={Calendar}>
        <DataField label="Tanggal Transaksi" value={sale.sale_date} />
        <DataField label="Nama Konsumen" value={sale.customer?.full_name} />
        <DataField label="NIK / No. KTP" value={sale.customer?.identity_number} />
        <DataField label="Pekerjaan" value={sale.customer?.job} />
        <DataField label="Tempat, Tgl Lahir" value={sale.customer?.birth_info} />
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
        <DataField label="Down Payment (DP)" value={sale.dp_amount} isCurrency />
        <DataField label="Tgl Down Payment" value={sale.dp_date} />
      </DetailSection>

      {/* INSTALLMENTS IF ANY */}
      {sale.payment_method === 'installment' && sale.installments && sale.installments.length > 0 && (
        <div className="glass-card rounded-xl p-6 border border-white/40 shadow-glass space-y-4">
          <div className="flex items-center gap-3 border-b border-white/20 pb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-black text-text-primary uppercase tracking-widest text-xs">Jadwal Cicilan</h3>
          </div>
          <div className="space-y-2">
            {sale.installments.map((inst: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-white rounded-xl text-[10px] font-black text-text-muted border border-white/40">{idx + 1}</span>
                  <span className="text-sm font-bold text-text-primary">{inst.date}</span>
                </div>
                <span className="font-black text-text-primary text-sm">{formatCurrency(inst.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
