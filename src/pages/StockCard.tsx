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
  Filter,
  Truck,
  HardHat,
  UserCheck,
  Info,
  Package
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { api } from '../lib/api';
import { formatNumber, formatDate, cn } from '../lib/utils';
import * as XLSX from 'xlsx';

const StockCard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const variantId = searchParams.get('variantId');
  
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState(variantId || '');
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [variantInfo, setVariantInfo] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Awal bulan ini
    end: new Date().toISOString().split('T')[0]
  });
  const [openingBalance, setOpeningBalance] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVariants();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
      setLoading(true);
      let query = 'select=*,master:materials(name,code)&order=material_id.asc,merk.asc&limit=50';
      
      if (searchTerm) {
        // Cari berdasarkan merk varian ATAU nama material di master
        query = `select=*,master:materials!inner(name,code)&merk=ilike.*${searchTerm}*&order=merk.asc&limit=50`;
        // Catatan: Jika ingin cari di nama material juga, Supabase butuh filter or
        // Namun untuk kesederhanaan awal, kita cari merk dulu
      }

      const data = await api.get('material_variants', query);
      setVariants(data || []);
    } catch (err) {
      console.error('Error fetching variants:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async (id: string) => {
    try {
      setLoading(true);
      // 1. Ambil Data Mutasi dalam Range (Ascending agar mudah hitung saldo berjalan)
      const moveData = await api.get('stock_movements', 
        `id_variant=eq.${id}&select=*,worker:worker_masters(name)&tanggal=gte.${dateRange.start}T00:00:00&tanggal=lte.${dateRange.end}T23:59:59&order=tanggal.asc`
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
      
      // 4. Enrich USAGE movements with Work Description (Uraian)
      const usageIds = (moveData || [])
        .filter((m: any) => m.sumber === 'USAGE' && m.reference_id)
        .map((m: any) => m.reference_id);

      if (usageIds.length > 0) {
        try {
          const usageDetails = await api.get('material_usages', 
            `id=in.(${usageIds.join(',')})&select=id,rab_item:rab_items(uraian),worker:worker_masters(name),rab:rab_projects(nama_proyek,keterangan,unit:units(unit_number))`
          );
          const usageMap: Record<string, { uraian: string, workerName: string, projectTitle: string }> = {};
          (usageDetails || []).forEach((u: any) => {
            if (u.id) {
              const unitPart = u.rab?.unit?.unit_number ? ` (${u.rab.unit.unit_number})` : '';
              usageMap[u.id] = { 
                uraian: u.rab_item?.uraian || '',
                workerName: u.worker?.name || '',
                projectTitle: u.rab ? `${u.rab.nama_proyek || 'RAB'}${unitPart} - ${u.rab.keterangan || 'Tanpa Judul'}` : ''
              };
            }
          });
          
          moveData.forEach((m: any) => {
            if (m.sumber === 'USAGE' && usageMap[m.reference_id]) {
              m.uraian_pekerjaan = usageMap[m.reference_id].uraian;
              m.project_title = usageMap[m.reference_id].projectTitle;
              if (!m.worker && usageMap[m.reference_id].workerName) {
                m.worker = { name: usageMap[m.reference_id].workerName };
              }
            }
          });
        } catch (e) {
          console.error('Error enriching usages:', e);
        }
      }

      setMovements(moveData || []);
      setVariantInfo(vInfo?.[0] || null);
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncLegacyData = async () => {
    if (!confirm('Apakah Anda yakin ingin mensinkronkan semua data lama? Proses ini mungkin memakan waktu.')) return;
    try {
      setLoading(true);
      console.log('🚀 Memulai Sinkronisasi...');
      
      // 1. Ambil data
      const [allGR, allUsage, allMovements, allVariants] = await Promise.all([
        api.get('goods_receipts'),
        api.get('material_usages'),
        api.get('stock_movements'),
        api.get('material_variants')
      ]);

      const existingMovements = new Set((allMovements || []).map((m: any) => `${m.sumber}:${m.reference_id}`));
      let added = 0;

      // 2. Sync GR
      for (const gr of allGR) {
        if (!existingMovements.has(`GR:${gr.id}`)) {
          await api.insert('stock_movements', {
            tanggal: gr.tanggal, id_variant: gr.id_variant, qty: gr.qty, tipe: 'IN', sumber: 'GR', reference_id: gr.id, keterangan: 'Sync Data Lama'
          });
          added++;
        }
      }

      // 3. Sync Usage
      for (const u of allUsage) {
        if (!existingMovements.has(`USAGE:${u.id}`)) {
          await api.insert('stock_movements', {
            tanggal: u.tanggal, id_variant: u.id_variant, qty: u.qty, tipe: 'OUT', sumber: 'USAGE', reference_id: u.id, keterangan: 'Sync Data Lama'
          });
          added++;
        }
      }

      // 4. Recalculate Stocks
      const latestMoves = await api.get('stock_movements');
      const stockMap: Record<string, number> = {};
      latestMoves.forEach((m: any) => {
        stockMap[m.id_variant] = (stockMap[m.id_variant] || 0) + (m.tipe === 'IN' ? Number(m.qty) : -Number(m.qty));
      });

      for (const v of allVariants) {
        const calc = stockMap[v.id] || 0;
        if (Number(v.stok) !== calc) await api.update('material_variants', v.id, { stok: calc });
      }

      alert(`Sinkronisasi Selesai! ${added} mutasi baru ditambahkan.`);
      fetchVariants();
    } catch (err) {
      console.error(err);
      alert('Gagal sinkronisasi data.');
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
        `${m.project_title ? `[${m.project_title}] ` : ''}${m.work_description || m.uraian_pekerjaan ? `${m.work_description || m.uraian_pekerjaan} ` : ''}${m.keterangan || m.sumber}${m.worker_name || m.worker?.name ? ` (Mandor: ${m.worker_name || m.worker.name})` : ''}`,
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
          <Button 
            variant="ghost"
            size="sm"
            className="text-[10px] font-black text-slate-400 hover:text-accent-lavender"
            onClick={syncLegacyData}
            disabled={loading}
          >
            <RefreshCw className={cn("w-3 h-3 mr-1", loading && "animate-spin")} /> Sync Data Lama
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

            {/* Kotak Pencarian */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari Merk / Material..."
                className="w-full h-10 bg-slate-50 border-none rounded-xl pl-10 pr-4 text-xs font-bold text-text-primary focus:ring-2 focus:ring-accent-lavender/30 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 p-1.5 rounded-lg shrink-0 shadow-sm",
                            m.sumber === 'GR' ? "bg-emerald-100 text-emerald-600" : 
                            m.sumber === 'USAGE' ? "bg-rose-100 text-rose-600" : 
                            "bg-amber-100 text-amber-600"
                          )}>
                            {m.sumber === 'GR' ? <Truck className="w-3.5 h-3.5" /> : 
                             m.sumber === 'USAGE' ? <HardHat className="w-3.5 h-3.5" /> : 
                             <Package className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              {m.sumber === 'GR' ? 'Penerimaan Barang' : 
                               m.sumber === 'USAGE' ? 'Pemakaian Proyek' : 
                               m.sumber === 'OPNAME' ? 'Penyesuaian Opname' : m.sumber}
                            </span>
                             <span className="text-xs font-black text-slate-700 uppercase leading-tight truncate max-w-[300px]">
                              {m.project_title || m.work_description || m.uraian_pekerjaan || m.keterangan || (
                                m.sumber === 'GR' ? `PO #${m.reference_id}` : 
                                m.sumber === 'USAGE' ? `Keluar #${m.reference_id}` : 
                                `${m.sumber} #${m.reference_id}`
                              )}
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {m.project_title && (m.work_description || m.uraian_pekerjaan) && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                  {m.work_description || m.uraian_pekerjaan}
                                </span>
                              )}
                              {(m.work_description || m.uraian_pekerjaan || m.project_title) && m.keterangan && (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                  #{m.reference_id}
                                </span>
                              )}
                              {(m.worker_name || m.worker?.name) && (
                                <span className="text-[10px] font-bold text-accent-lavender flex items-center gap-1.5 bg-accent-lavender/5 w-fit px-2 py-0.5 rounded-full border border-accent-lavender/10">
                                  <UserCheck className="w-2.5 h-2.5" /> {m.worker_name || m.worker.name}
                                </span>
                              )}
                            </div>
                          </div>
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
