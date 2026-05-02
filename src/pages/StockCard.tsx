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
import * as XLSX from 'xlsx';

const StockCard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const variantId = searchParams.get('variantId');
  
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState(variantId || '');
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [variantInfo, setVariantInfo] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Awal bulan ini
    end: new Date().toISOString().split('T')[0]
  });
  const [openingBalance, setOpeningBalance] = useState(0);

  useEffect(() => {
    fetchVariants();
  }, []);

  useEffect(() => {
    if (selectedVariantId) {
      fetchMovements(selectedVariantId);
    } else {
      setMovements([]);
      setVariantInfo(null);
      setOpeningBalance(0);
    }
  }, [selectedVariantId, dateRange]);

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
      // 1. Ambil Data Mutasi dalam Range (Ascending agar mudah hitung saldo berjalan)
      const moveData = await api.get('stock_movements', 
        `id_variant=eq.${id}&tanggal=gte.${dateRange.start}T00:00:00&tanggal=lte.${dateRange.end}T23:59:59&order=tanggal.asc`
      );

      // 2. Ambil Info Varian
      const vInfo = await api.get('material_variants', `id=eq.${id}&select=*,master:materials(*)`);

      // 3. Hitung Saldo Awal (Mutasi sebelum startDate)
      const historicalData = await api.get('stock_movements', 
        `id_variant=eq.${id}&tanggal=lt.${dateRange.start}T00:00:00&select=tipe,qty`
      );
      
      const initialBal = (historicalData || []).reduce((acc: number, cur: any) => {
        return cur.tipe === 'IN' ? acc + Number(cur.qty) : acc - Number(cur.qty);
      }, 0);

      setOpeningBalance(initialBal);
      setMovements(moveData || []);
      setVariantInfo(vInfo?.[0] || null);
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!variantInfo || movements.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    // 1. Siapkan Header Informasi
    const header = [
      ['KARTU STOK MATERIAL'],
      [`Periode: ${formatDate(dateRange.start)} s/d ${formatDate(dateRange.end)}`],
      [''],
      ['Material:', variantInfo.master?.name || '-'],
      ['Merk:', variantInfo.merk || '-'],
      ['Satuan:', variantInfo.master?.unit || '-'],
      [''],
      ['Tanggal', 'Tipe', 'Sumber / Referensi', 'Masuk (In)', 'Keluar (Out)', 'Saldo']
    ];

    // 2. Baris Saldo Awal
    const rows = [
      [formatDate(dateRange.start), 'SALDO AWAL', '-', '-', '-', openingBalance]
    ];

    // 3. Baris Mutasi
    let runningBalance = openingBalance;
    movements.forEach(m => {
      runningBalance = m.tipe === 'IN' ? runningBalance + Number(m.qty) : runningBalance - Number(m.qty);
      rows.push([
        formatDate(m.tanggal),
        m.tipe === 'IN' ? 'MASUK' : m.tipe === 'OUT' ? 'KELUAR' : 'PENYESUAIAN',
        m.keterangan || m.sumber,
        m.tipe === 'IN' ? m.qty : 0,
        m.tipe === 'OUT' ? m.qty : 0,
        runningBalance
      ]);
    });

    // 4. Generate Workbook
    const ws = XLSX.utils.aoa_to_sheet([...header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kartu Stok');

    // 5. Download File
    const fileName = `KartuStok_${variantInfo.merk.replace(/\s+/g, '_')}_${dateRange.start}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 h-12 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="date" 
              className="bg-transparent border-none text-xs font-bold focus:outline-none" 
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span className="mx-2 text-slate-300">-</span>
            <input 
              type="date" 
              className="bg-transparent border-none text-xs font-bold focus:outline-none" 
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
          <Button 
            variant="outline" 
            className="rounded-xl h-12 bg-white hover:bg-slate-50 transition-all border-slate-200"
            onClick={handleExport}
            disabled={!selectedVariantId || movements.length === 0}
          >
            <FileSpreadsheet className="w-5 h-5 mr-2 text-emerald-600" /> Export Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Selector Card */}
        <Card className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-accent-lavender" />
                <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400">Pilih Varian</h3>
              </div>
              <button onClick={fetchVariants} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw className={cn("w-3 h-3 text-slate-400", loading && "animate-spin")} />
              </button>
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {loading && variants.length === 0 ? (
                <div className="py-10 text-center text-xs font-bold text-slate-300 animate-pulse italic">
                  Memuat varian...
                </div>
              ) : variants.length === 0 ? (
                <div className="py-10 text-center text-xs font-bold text-slate-300 italic">
                  Varian tidak ditemukan.
                </div>
              ) : variants.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariantId(v.id.toString())}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all duration-300 border-2 group",
                    selectedVariantId === v.id.toString()
                      ? "bg-accent-lavender border-accent-lavender shadow-glow-lavender text-white"
                      : "bg-slate-50 border-transparent hover:border-slate-200 text-text-primary"
                  )}
                >
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-tighter mb-1",
                    selectedVariantId === v.id.toString() ? "text-white/70" : "text-emerald-600"
                  )}>
                    {v.master?.code || 'NO CODE'}
                  </p>
                  <p className="font-black text-xs leading-tight">{v.merk}</p>
                  <p className={cn(
                    "text-[10px] font-bold mt-1",
                    selectedVariantId === v.id.toString() ? "text-white/60" : "text-slate-400"
                  )}>
                    {v.master?.name}
                  </p>
                </button>
              ))}
            </div>
            
            {variantInfo && (
              <div className="pt-6 space-y-4 border-t border-slate-100">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-3d-inset">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Stok Akhir Saat Ini</p>
                  <p className="text-3xl font-black text-text-primary">
                    {formatNumber(variantInfo.stok)} 
                    <span className="text-xs font-bold text-slate-400 uppercase ml-2">{variantInfo.master?.unit}</span>
                  </p>
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
                {selectedVariantId && !loading && (
                  <TR className="bg-slate-50/50 italic">
                    <TD className="px-6 py-3 font-bold text-slate-400" colSpan={3}>SALDO AWAL (PER {formatDate(dateRange.start)})</TD>
                    <TD className="px-6 py-3 text-right">-</TD>
                    <TD className="px-6 py-3 text-right">-</TD>
                    <TD className="px-6 py-3 text-right font-black text-slate-600">{formatNumber(openingBalance)}</TD>
                  </TR>
                )}
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
                ) : movements.map((m, idx) => {
                  // Hitung running balance secara manual berdasarkan urutan array asc
                  let runningBalance = openingBalance;
                  for (let i = 0; i <= idx; i++) {
                    const tx = movements[i];
                    runningBalance = tx.tipe === 'IN' ? runningBalance + Number(tx.qty) : runningBalance - Number(tx.qty);
                  }

                  return (
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
                        ) : m.tipe === 'OUT' ? (
                          <span className="px-2 py-1 rounded bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center w-fit gap-1">
                            <ArrowUpRight className="w-3 h-3" /> Keluar
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest flex items-center w-fit gap-1">
                            Penyesuaian
                          </span>
                        )}
                      </TD>
                      <TD className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-tighter opacity-70">{m.sumber}</span>
                          <span className="text-xs font-bold text-text-primary uppercase leading-tight">
                            {m.keterangan || m.reference_id?.slice(0, 8)}
                          </span>
                        </div>
                      </TD>
                      <TD className="px-6 py-4 text-right font-black text-emerald-600">
                        {m.tipe === 'IN' ? `+${formatNumber(m.qty)}` : '-'}
                      </TD>
                      <TD className="px-6 py-4 text-right font-black text-rose-600">
                        {m.tipe === 'OUT' ? `-${formatNumber(m.qty)}` : '-'}
                      </TD>
                      <TD className="px-6 py-4 text-right font-black text-accent-dark text-lg">
                        {formatNumber(runningBalance)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StockCard;
