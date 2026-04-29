import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  RefreshCw, 
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  Building2,
  Filter
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { api } from '../lib/api';
import { formatNumber, formatDate } from '../lib/utils';

const StockCard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const variantId = searchParams.get('variantId');
  
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState(variantId || '');
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [variantInfo, setVariantInfo] = useState<any | null>(null);

  useEffect(() => {
    fetchVariants();
  }, []);

  useEffect(() => {
    if (selectedVariantId) {
      fetchMovements(selectedVariantId);
    } else {
      setMovements([]);
      setVariantInfo(null);
    }
  }, [selectedVariantId]);

  const fetchVariants = async () => {
    try {
      const data = await api.get('material_variants', 'select=*,master:materials(name,code)&order=material_id.asc,merk.asc');
      setVariants(data || []);
    } catch (err) {
      console.error('Error fetching variants:', err);
    }
  };

  const fetchMovements = async (id: string) => {
    try {
      setLoading(true);
      const [moveData, vInfo] = await Promise.all([
        api.get('stock_movements', `id_variant=eq.${id}&order=tanggal.desc`),
        api.get('material_variants', `id=eq.${id}&select=*,master:materials(*)`)
      ]);
      setMovements(moveData || []);
      setVariantInfo(vInfo?.[0] || null);
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/materials')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Kartu Stok</h1>
            <p className="text-text-secondary font-medium">Riwayat mutasi keluar/masuk material per varian</p>
          </div>
        </div>
        <Button variant="outline" className="rounded-xl h-12 bg-white">
          <FileSpreadsheet className="w-5 h-5 mr-2 text-emerald-600" /> Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Selector Card */}
        <Card className="p-6 bg-accent-dark text-white border-none shadow-premium lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-accent-lavender" />
              <h3 className="font-black uppercase text-xs tracking-widest">Pilih Varian</h3>
            </div>
            <select 
              className="w-full h-12 bg-white/10 border border-white/20 rounded-xl px-4 text-sm font-bold focus:outline-none focus:bg-white/20 transition-all text-white"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
            >
              <option value="" className="text-gray-900">-- Pilih Varian --</option>
              {variants.map(v => (
                <option key={v.id} value={v.id} className="text-gray-900">
                  {v.master?.code ? `[${v.master.code}] ` : ''}{v.master?.name} - {v.merk}
                </option>
              ))}
            </select>
            
            {variantInfo && (
              <div className="pt-6 space-y-4 border-t border-white/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Merk / Spesifikasi</p>
                  <p className="font-black text-accent-lavender">{variantInfo.merk}</p>
                  <p className="text-sm font-bold text-white/80 leading-tight mb-1">{variantInfo.master?.name}</p>
                  <p className="text-xs opacity-70 italic">{variantInfo.spesifikasi || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Stok Akhir</p>
                  <p className="text-3xl font-black">{formatNumber(variantInfo.stok)} <span className="text-xs font-bold opacity-60 uppercase">{variantInfo.master?.unit}</span></p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Movement Table */}
        <Card className="lg:col-span-3 p-0 border-none shadow-premium overflow-hidden bg-white">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">Mutasi Terakhir</h2>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR isHoverable={false}>
                  <TH className="px-6 py-4">Tanggal / Waktu</TH>
                  <TH className="px-6 py-4">Tipe</TH>
                  <TH className="px-6 py-4">Sumber / Referensi</TH>
                  <TH className="px-6 py-4 text-right">Masuk (In)</TH>
                  <TH className="px-6 py-4 text-right">Keluar (Out)</TH>
                  <TH className="px-6 py-4 text-right">Saldo</TH>
                </TR>
              </THead>
              <TBody>
                {loading && selectedVariantId ? (
                  <TR isHoverable={false}>
                    <TD colSpan={6} className="py-20 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-accent-dark" />
                    </TD>
                  </TR>
                ) : !selectedVariantId ? (
                  <TR isHoverable={false}>
                    <TD colSpan={6} className="py-20 text-center text-text-muted font-bold uppercase text-[10px] tracking-widest">Silakan pilih varian material</TD>
                  </TR>
                ) : movements.length === 0 ? (
                  <TR isHoverable={false}>
                    <TD colSpan={6} className="py-20 text-center text-text-muted font-bold uppercase text-[10px] tracking-widest">Belum ada riwayat mutasi</TD>
                  </TR>
                ) : movements.map(m => (
                  <TR key={m.id}>
                    <TD className="px-6 py-4">
                      <div className="flex items-center gap-2 font-bold text-text-primary">
                        <Calendar className="w-3 h-3 text-text-muted" />
                        {formatDate(m.tanggal)}
                      </div>
                    </TD>
                    <TD className="px-6 py-4">
                      {m.tipe === 'IN' ? (
                        <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center w-fit gap-1">
                          <ArrowDownLeft className="w-3 h-3" /> Masuk
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center w-fit gap-1">
                          <ArrowUpRight className="w-3 h-3" /> Keluar
                        </span>
                      )}
                    </TD>
                    <TD className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-text-primary uppercase">{m.sumber}</span>
                        <span className="text-[10px] text-text-muted font-medium">{m.reference_id?.slice(0, 8)}...</span>
                      </div>
                    </TD>
                    <TD className="px-6 py-4 text-right font-black text-emerald-600">
                      {m.tipe === 'IN' ? `+${formatNumber(m.qty)}` : '-'}
                    </TD>
                    <TD className="px-6 py-4 text-right font-black text-rose-600">
                      {m.tipe === 'OUT' ? `-${formatNumber(m.qty)}` : '-'}
                    </TD>
                    <TD className="px-6 py-4 text-right font-black text-accent-dark text-lg">
                      {formatNumber(m.saldo_setelah)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StockCard;
