
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, CheckCircle, Clock, Wallet, RefreshCw, 
  Search, Printer, User, MapPin, Trash2,
  Banknote, Building2, FileText, X
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatIndonesiaDate, parseIndonesiaDate, formatRibuan, parseRibuan } from "@/lib/utils";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { CustomerSearchSelect } from "@/components/promo/CustomerSearchSelect";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useBranch } from "@/hooks/use-branch";
import { usePermissions } from "@/hooks/use-permissions";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PencairanReward() {
  const { toast } = useToast();
  const { selectedBranchId } = useBranch();
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedPelangganId, setSelectedPelangganId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('grouped');

  // Disbursement Modal State
  const [disburseModal, setDisburseModal] = useState<{ open: boolean; item: any; group: any } | null>(null);
  const [metode, setMetode] = useState<'cash' | 'transfer_bank' | 'potong_faktur'>('cash');
  const [tanggalCair, setTanggalCair] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [keteranganCash, setKeteranganCash] = useState('');
  const [namaBank, setNamaBank] = useState('');
  const [nomorRekening, setNomorRekening] = useState('');
  const [namaPemilikRekening, setNamaPemilikRekening] = useState('');
  const [nomorFakturPotong, setNomorFakturPotong] = useState('');
  const [nilaiFakturPotong, setNilaiFakturPotong] = useState('');
  const [nilaiDicairkan, setNilaiDicairkan] = useState<string>('');


  const resetModalForm = () => {
    setMetode('cash');
    setTanggalCair(format(new Date(), 'yyyy-MM-dd'));
    setKeteranganCash('');
    setNamaBank('');
    setNomorRekening('');
    setNamaPemilikRekening('');
    setNomorFakturPotong('');
    setNilaiFakturPotong('');
    setNilaiDicairkan('');
  };


  const openDisburseModal = (item: any, group: any) => {
    resetModalForm();
    const total = item.type === 'point' ? (item.saldoPoin || item.nilai || 0) : (item.nilai || item.totalNilai || 0);
    setNilaiDicairkan(formatRibuan(total));
    setDisburseModal({ open: true, item, group });
  }; 

  const { data: dashboardData, isLoading: isLoadingDashboard, refetch: refetchDashboard } = useQuery<any>({
    queryKey: ["/api/reward/dashboard-data", { branchId: selectedBranchId }],
    queryFn: async () => {
       const res = await fetch(`/api/reward/dashboard-data?branchId=${selectedBranchId}`);
       if (!res.ok) throw new Error("Gagal mengambil data dashboard");
       return res.json();
    },
    enabled: !!selectedBranchId
  });

  const { data: pelangganData } = useQuery<any[]>({
    queryKey: ["/api/sales-customers", { branchId: selectedBranchId }],
    queryFn: async () => {
       const res = await fetch(`/api/sales-customers?branchId=${selectedBranchId}`);
       if (!res.ok) throw new Error("Gagal mengambil data pelanggan");
       return res.json();
    },
    enabled: !!selectedBranchId
  });

  const disburseMutation = useMutation({
    mutationFn: async (payload: any) => {
      await apiRequest("POST", "/api/reward/disburse-item", { 
        ...payload, 
        amount: Number(parseRibuan(nilaiDicairkan)),
        branchId: selectedBranchId,
        metode,
        tanggalCair: parseIndonesiaDate(tanggalCair),
        keteranganCash: metode === 'cash' ? keteranganCash : null,
        namaBank: metode === 'transfer_bank' ? namaBank : null,
        nomorRekening: metode === 'transfer_bank' ? nomorRekening : null,
        namaPemilikRekening: metode === 'transfer_bank' ? namaPemilikRekening : null,
        nomorFakturPotong: metode === 'potong_faktur' ? nomorFakturPotong : null,
        nilaiFakturPotong: metode === 'potong_faktur' ? Number(parseRibuan(nilaiFakturPotong)) : null
      });
    },
    onSuccess: () => {
      toast({ title: "Berhasil!", description: "Reward berhasil dicairkan." });
      setDisburseModal(null);
      resetModalForm();
      queryClient.invalidateQueries({ queryKey: ["/api/reward/dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    }
  });

  const deleteDisburseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/reward/claims/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Berhasil!", description: "Data pencairan berhasil dihapus dan dikembalikan ke antrean." });
      queryClient.invalidateQueries({ queryKey: ["/api/reward/dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-customers"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    }
  });

  // Filter & Grouping Logic
  const flatReadyData = useMemo(() => {
    if (dashboardData?.allTransactions) {
      let result = dashboardData.allTransactions.flatMap((t: any) => {
        const rows: any[] = [];
        t.rewards.cashback?.forEach((cb: any, idx: number) => {
          rows.push({
            ...t,
            id: `cb_${t.id}_${idx}`,
            type: 'cashback',
            label: `${cb.namaPromo || 'Cashback'}`,
            displayNilai: `Rp ${Number(cb.nilai).toLocaleString()}`,
            nilai: cb.nilai,
            refId: cb.transaksiId || t.id,
            canDisburse: true
          });
        });
        t.rewards.points?.forEach((p: any, idx: number) => {
          rows.push({
            ...t,
            id: `pt_${t.id}_${idx}`,
            type: 'point',
            label: p.namaPromo || `POIN HADIAH`,
            desc: p.desc,
            displayNilai: `${Number(p.nilai).toLocaleString()} Pts`,
            nilai: p.nilai,
            refId: p.refId || p.id,
            canDisburse: true
          });
        });
        t.rewards.labels?.forEach((l: any, idx: number) => {
          rows.push({
            ...t,
            id: `lb_${t.id}_${idx}`,
            type: 'cutting',
            label: `CUTTING LABEL`,
            displayNilai: `${l.qty} Pcs (Rp ${Number(l.nilai).toLocaleString()})`,
            nilai: l.nilai,
            refId: l.refId || l.id,
            canDisburse: true
          });
        });
        t.rewards.pakets?.forEach((pk: any, idx: number) => {
          rows.push({
            ...t,
            id: t.isPaketTx ? `pk_${pk.id}` : `pk_${t.id}_${idx}`,
            type: 'paket',
            label: `PROGRAM PAKET`,
            desc: pk.desc,
            displayNilai: pk.nilai > 0 ? `Rp ${Number(pk.nilai).toLocaleString()}` : 'Reward Barang/Tour',
            nilai: pk.nilai,
            refId: t.isPaketTx ? `pk_${pk.id}` : (pk.refId || pk.id),
            canDisburse: true
          });
        });
        t.rewards.principals?.forEach((pr: any, idx: number) => {
          rows.push({
            ...t,
            id: pr.id ? (pr.id.toString().includes('pr_claim') ? pr.id : `pr_${pr.id}`) : `pr_${t.id}_${idx}`,
            type: 'principal',
            label: pr.namaPromo || `PRINCIPAL PROGRAM`,
            desc: pr.desc,
            displayNilai: pr.nilai > 0 ? `Rp ${Number(pr.nilai).toLocaleString()}` : 'Reward Barang/Tour',
            nilai: pr.nilai,
            refId: pr.id ? (pr.id.toString().includes('pr_') ? pr.id : (pr.source === 'company' ? `pr_sub_${pr.id}` : `pr_claim_${pr.id}`)) : `pr_${idx}`,
            canDisburse: true
          });
        });
        return rows.filter((r: any) => r.status !== "hangus" && r.status !== "expired");
      });

      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        result = result.filter((i: any) => 
          i.pelangganNama.toLowerCase().includes(lowerSearch) || 
          i.noFaktur?.toLowerCase().includes(lowerSearch) ||
          i.label?.toLowerCase().includes(lowerSearch)
        );
      }
      if (selectedPelangganId !== "all") {
        result = result.filter((i: any) => i.pelangganId && i.pelangganId.toString() === selectedPelangganId);
      }
      return result.sort((a: any, b: any) => String(b.id || '').localeCompare(String(a.id || '')));
    }
    return [];
  }, [dashboardData, searchTerm, selectedPelangganId]);

  const flatHistoryData = useMemo(() => {
    if (!dashboardData?.history) return [];
    let result = dashboardData.history;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((h: any) => h.pelanggan?.name?.toLowerCase().includes(lowerSearch) || h.rewardDesc?.toLowerCase().includes(lowerSearch));
    }
    if (selectedPelangganId !== "all") {
      result = result.filter((h: any) => h.pelangganId && h.pelangganId.toString() === selectedPelangganId);
    }

    return result;
  }, [dashboardData, searchTerm, selectedPelangganId]);

  const filteredAndGroupedData = useMemo(() => {
    if (!dashboardData) return [];
    const groups: Record<number, any> = {};
    const ensureGroup = (pId: number, pNama: string) => {
      if (!groups[pId]) {
        groups[pId] = {
          id: pId,
          name: pNama,
          totalCair: 0,
          totalReadyNominal: 0,
          ready: [],
          history: []
        };
      }
    };

    const { ready } = dashboardData;
    ready.cashback?.forEach((item: any) => {
       if (item.status === "hangus" || item.status === "expired") return;
       ensureGroup(item.pelangganId, item.pelangganNama);
       groups[item.pelangganId].ready.push({ ...item, type: 'cashback', label: `CASHBACK` });
    });
    ready.points?.forEach((item: any) => {
       if (item.status === "hangus" || item.status === "expired") return;
       ensureGroup(item.pelangganId, item.pelangganNama);
       groups[item.pelangganId].ready.push({ 
         ...item, 
         type: 'point', 
         label: item.namaPromo || 'POIN HADIAH', 
         desc: item.desc,
         displayNilai: `${item.saldoPoin} Pts` 
       });
    });
    ready.labels?.forEach((item: any) => {
       if (item.status === "hangus" || item.status === "expired") return;
       ensureGroup(item.pelangganId, item.pelangganNama);
       groups[item.pelangganId].ready.push({ 
         ...item, 
         type: 'cutting', 
         label: 'CUTTING LABEL', 
         displayNilai: `${item.totalLabel} Pcs (Rp ${Number(item.totalNilai).toLocaleString()})` 
       });
    });
    ready.pakets?.forEach((item: any) => {
       if (item.status === "hangus" || item.status === "expired") return;
       ensureGroup(item.pelangganId, item.pelangganNama);
       groups[item.pelangganId].ready.push({ 
         ...item, 
         type: 'paket', 
         label: 'PROGRAM PAKET',
         displayNilai: item.nilai > 0 ? `Rp ${Number(item.nilai).toLocaleString()}` : 'Reward Barang/Tour'
       });
    });
    ready.principals?.forEach((item: any) => {
       if (item.status === "hangus" || item.status === "expired") return;
       ensureGroup(item.pelangganId, item.pelangganNama);
       groups[item.pelangganId].ready.push({ 
         ...item, 
         type: 'principal', 
         label: item.namaPromo || 'PRINCIPAL PROGRAM',
         displayNilai: item.nilai > 0 ? `Rp ${Number(item.nilai).toLocaleString()}` : 'Reward Barang/Tour'
       });
    });

    dashboardData.history.forEach((item: any) => {
       ensureGroup(item.pelangganId, item.pelanggan?.name || 'Unknown');
       groups[item.pelangganId].history.push(item);
       groups[item.pelangganId].totalCair += Number(item.jumlah);
    });

    // Compute totalReadyNominal from actual items in each group
    // This ensures the header summary is always in sync with the detail items
    // Only sum monetary values (Rp): cashback, cutting labels, and paket
    // Exclude point-based rewards (poin hadiah) as they are not monetary
    Object.values(groups).forEach((group: any) => {
       group.totalReadyNominal = group.ready.reduce((total: number, item: any) => {
         if (item.type === 'point') return total; // Skip poin — bukan nilai uang
         if (item.type === 'cutting') return total + Number(item.totalNilai || 0);
         if (item.type === 'paket') return total + Number(item.nilai || 0);
         if (item.type === 'cashback') return total + Number(item.nilai || 0);
         if (item.type === 'principal') return total + Number(item.nilai || 0);
         return total;
       }, 0);
    });

    let result = Object.values(groups);
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(g => g.name.toLowerCase().includes(lowerSearch));
    }
    if (selectedPelangganId !== "all") {
      result = result.filter(g => g.id && g.id.toString() === selectedPelangganId);
    }

    return result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [dashboardData, searchTerm, selectedPelangganId]);

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Laporan Pencairan Reward - Semua</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { bg-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 30px; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Laporan Pencairan Reward</h1>
            <p>Dicetak pada: ${new Date().toLocaleString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Pelanggan</th>
                <th>Total Pencairan</th>
                <th>Jumlah Antrean Klaim</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAndGroupedData.map(g => `
                <tr>
                  <td>${g.name}</td>
                  <td>Rp ${g.totalCair.toLocaleString()}</td>
                  <td>${g.ready.length}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintSingle = (group: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Laporan Pencairan - ${group.name}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; }
            .summary { margin: 20px 0; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Detail Pencairan Reward</h2>
            <p>Pelanggan: <strong>${group.name}</strong></p>
          </div>
          <div class="summary">
            <div>Total Pencairan: <strong>Rp ${group.totalCair.toLocaleString()}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Sumber</th>
                <th>Deskripsi</th>
                <th>Nilai</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${group.ready.map((c: any) => `
                <tr>
                  <td>${formatIndonesiaDate(c.date || c.tglFaktur || new Date())}</td>
                  <td>${c.type}</td>
                  <td>${c.label || '-'}</td>
                  <td>Rp ${Number(c.nilai || 0).toLocaleString()}</td>
                  <td>Ready</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manajemen Pencairan Reward</h1>
          <p className="text-sm text-muted-foreground">Kontrol dan verifikasi pencairan reward per pelanggan</p>
        </div>
        <div className="flex gap-2">
           <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
              <Button 
                variant={viewMode === 'flat' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('flat')}
                className="h-7 text-[10px] px-2"
              >
                Mode Inputan
              </Button>
              <Button 
                variant={viewMode === 'grouped' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('grouped')}
                className="h-7 text-[10px] px-2"
              >
                Grup Pelanggan
              </Button>
           </div>
           <Button variant="outline" size="sm" onClick={() => refetchDashboard()} className="h-9">
             <RefreshCw className="h-4 w-4 mr-2" /> Refresh
           </Button>
           {can("pencairan", "print") && (
             <Button variant="default" size="sm" onClick={handlePrintAll} className="h-9 bg-blue-600 hover:bg-blue-700">
               <Printer className="h-4 w-4 mr-2" /> Cetak Laporan
             </Button>
           )}
        </div>
      </div>

      <Card className="border-none shadow-sm bg-blue-50/30">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama pelanggan..." 
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-[300px]">
             <CustomerSearchSelect 
                customers={pelangganData || []}
                value={selectedPelangganId}
                onValueChange={setSelectedPelangganId}
                placeholder="Semua Pelanggan"
                allowAll={true}
                className="bg-white"
             />
          </div>
        </CardContent>
      </Card>

      {!selectedBranchId ? (
        <div className="text-center py-24 bg-white border-2 border-dashed rounded-2xl flex flex-col items-center gap-4">
           <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center">
              <MapPin className="h-8 w-8 text-blue-500" />
           </div>
           <div>
              <h3 className="text-lg font-bold text-gray-900">Cabang Belum Dipilih</h3>
              <p className="text-muted-foreground text-sm mt-1">Silakan pilih cabang di sidebar sebelah kiri untuk melihat data pencairan.</p>
           </div>
        </div>
      ) : isLoadingDashboard ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
           <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
           <p className="text-muted-foreground animate-pulse">Memuat data pencairan...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {viewMode === 'flat' ? (
             <div className="space-y-6">
                <Card className="border-2 border-blue-100 overflow-hidden shadow-md">
                 <CardHeader className="bg-blue-50/50 py-3 px-4 border-b">
                   <div className="flex items-center justify-between">
                     <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-800">
                       <Clock className="h-4 w-4" /> Daftar Antrean Reward (Siap Cair)
                     </CardTitle>
                     <Badge className="bg-blue-600 text-white text-[10px]">{flatReadyData.length} item</Badge>
                   </div>
                 </CardHeader>
                 <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                          <TableHead className="font-bold text-[11px]">PELANGGAN</TableHead>
                          <TableHead className="font-bold text-[11px]">JENIS REWARD</TableHead>
                          <TableHead className="font-bold text-[11px]">DETAIL</TableHead>
                          <TableHead className="h-8 text-[10px] py-1 font-bold">NAMA MEREK</TableHead>
                          <TableHead className="font-bold text-[11px] text-right">NILAI BISA DICAIRKAN</TableHead>
                          <TableHead className="font-bold text-[11px] text-right">AKSI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flatReadyData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                               <div className="flex flex-col items-center gap-2">
                                  <Wallet className="h-10 w-10 text-gray-200" />
                                  <p>Tidak ada data reward yang siap dicairkan.</p>
                               </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          flatReadyData.map((item: any, idx: number) => (
                            <TableRow key={`${item.type}-${item.id}-${idx}`} className="hover:bg-blue-50/10">
                              <TableCell className="py-3">
                                 <p className="font-bold text-sm text-gray-900">{item.pelangganNama}</p>
                              </TableCell>
                              <TableCell className="py-3">
                                 <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${
                                   item.type === 'cashback' ? 'bg-green-50 text-green-700 border-green-200' :
                                   item.type === 'point' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                   item.type === 'cutting' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                   item.type === 'paket' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    item.type === 'principal' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                   'bg-gray-50 text-gray-600 border-gray-200'
                                 }`}>
                                   {item.type === 'cashback' ? '💰 CASHBACK' :
                                    item.type === 'point' ? '⭐ POIN HADIAH' :
                                    item.type === 'cutting' ? '🏷️ CUTTING LABEL' :
                                    item.type === 'paket' ? '📦 PROGRAM PAKET' :
                                     item.type === 'principal' ? '🏢 PRINCIPAL PROGRAM' :
                                    item.label}
                                 </Badge>
                              </TableCell>
                              <TableCell className="py-3">
                                 <div className="flex flex-col">
                                    {item.noFaktur && <span className="text-[10px] text-muted-foreground">Faktur: {item.noFaktur}</span>}
                                    {item.desc && <span className="text-[10px] text-blue-600 font-medium">{item.desc}</span>}
                                    {item.type === 'cutting' && <span className="text-[10px] text-orange-600 font-medium">{item.displayNilai}</span>}
                                 </div>
                              </TableCell>
                              <TableCell className="py-3">
                                 <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0 bg-gray-100">{item.brandName || item.brandCode || 'Umum'}</Badge>
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                 <div className="flex flex-col items-end">
                                   <span className="text-base font-black text-green-700">
                                     {item.type === 'point' ? `${Number(item.nilai).toLocaleString()} Pts` : `Rp ${Number(item.nilai).toLocaleString()}`}
                                   </span>
                                 </div>
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                 <Button 
                                    size="sm" 
                                    className="h-8 px-4 text-[11px] bg-blue-600 hover:bg-blue-700 shadow-sm"
                                    disabled={disburseMutation.isPending}
                                    onClick={() => openDisburseModal(item, { id: item.pelangganId, name: item.pelangganNama })}
                                 >
                                    Cairkan Sekarang
                                 </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                 </CardContent>
               </Card>

               <Card className="border border-gray-200 overflow-hidden shadow-sm">
                 <CardHeader className="bg-gray-50 py-3 px-4 border-b">
                   <div className="flex items-center justify-between">
                     <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700">
                       <CheckCircle className="h-4 w-4 text-green-600" /> Riwayat Pencairan Reward (Selesai)
                     </CardTitle>
                     <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">{flatHistoryData.length} pencairan</Badge>
                   </div>
                 </CardHeader>
                 <CardContent className="p-0">
                    <Table>
                       <TableHeader>
                         <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                           <TableHead className="font-bold text-[10px]">TANGGAL</TableHead>
                           <TableHead className="font-bold text-[10px]">PELANGGAN</TableHead>
                           <TableHead className="font-bold text-[10px]">JENIS</TableHead>
                           <TableHead className="font-bold text-[10px]">DESKRIPSI</TableHead>
                           <TableHead className="font-bold text-[10px]">DISETUJUI OLEH</TableHead>
                           <TableHead className="font-bold text-[10px] text-right">JUMLAH DICAIRKAN</TableHead>
                           <TableHead className="font-bold text-[10px] text-right">AKSI</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {flatHistoryData.length === 0 ? (
                           <TableRow>
                             <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground italic">
                                Belum ada riwayat pencairan.
                             </TableCell>
                           </TableRow>
                         ) : (
                           flatHistoryData.map((h: any) => (
                             <TableRow key={h.id} className="hover:bg-green-50/30">
                               <TableCell className="py-2.5 text-[11px] text-gray-600">
                                  {format(new Date(h.tanggalKlaim), "dd/MM/yyyy")}
                               </TableCell>
                               <TableCell className="py-2.5 font-semibold text-[11px] text-gray-900">{h.pelanggan?.name || '-'}</TableCell>
                               <TableCell className="py-2.5">
                                 <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 ${
                                   h.sumber === 'cashback' ? 'bg-green-50 text-green-700 border-green-200' :
                                   h.sumber === 'point' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                   h.sumber === 'cutting' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                   h.sumber === 'paket' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                   'bg-gray-50 text-gray-600 border-gray-200'
                                 }`}>
                                   {h.sumber?.toUpperCase() || '-'}
                                 </Badge>
                               </TableCell>
                               <TableCell className="py-2.5">
                                  <span className="text-[11px] text-gray-700">{h.rewardDesc || '-'}</span>
                               </TableCell>
                               <TableCell className="py-2.5 text-[10px] text-gray-500">
                                  {h.approvedBy || 'System'}
                               </TableCell>
                               <TableCell className="py-2.5 text-right">
                                  <span className="text-sm font-black text-green-700">Rp {Number(h.jumlah).toLocaleString()}</span>
                               </TableCell>
                               <TableCell className="py-2.5 text-right">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Hapus & Kembalikan Pencairan?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tindakan ini akan menghapus riwayat pencairan ini dan mengembalikan status item ke "Belum Dicairkan". 
                                          Saldo/progress pelanggan akan disesuaikan kembali secara otomatis.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction 
                                          className="bg-red-600 hover:bg-red-700 text-white"
                                          onClick={() => deleteDisburseMutation.mutate(h.id)}
                                        >
                                          Ya, Hapus & Kembalikan
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                               </TableCell>
                             </TableRow>
                           ))
                         )}
                       </TableBody>
                    </Table>
                 </CardContent>
               </Card>
            </div>
          ) : (
            filteredAndGroupedData.length === 0 ? (
              <div className="text-center py-20 bg-white border-2 border-dashed rounded-2xl">
                 <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                 <p className="text-muted-foreground">Tidak ada data pencairan ditemukan.</p>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-3">
                {filteredAndGroupedData.map((group) => (
                  <AccordionItem 
                    key={group.id} 
                    value={group.id?.toString() || ""}
                    className="bg-white border-2 rounded-xl overflow-hidden px-0 shadow-sm data-[state=open]:border-blue-300 transition-all"
                  >
                    <div className="flex items-center px-4 py-3 group hover:bg-blue-50/30">
                      <AccordionTrigger className="hover:no-underline flex-1 py-0 justify-start gap-4">
                         <div className="text-left w-full pr-4">
                            <div className="flex items-center justify-between">
                               <p className="font-extrabold text-base text-gray-900 group-data-[state=open]:text-blue-700">{group.name}</p>
                               <div className="flex items-center gap-2">
                                  {group.ready.length > 0 && (
                                     <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] h-5 px-2 font-black shadow-sm">
                                        {group.ready.length} HADIAH SIAP
                                     </Badge>
                                  )}
                                  <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-lg border border-green-200">
                                     <Wallet className="h-3.5 w-3.5 text-green-600" />
                                     <span className="text-xs font-black text-green-700">Rp {group.totalReadyNominal.toLocaleString()}</span>
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                               {group.ready.some((r: any) => r.type === 'point') && (
                                  <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 rounded">⭐ {group.ready.filter((r: any) => r.type === 'point').reduce((sum: number, r: any) => sum + Number(r.saldoPoin || 0), 0)} Pts</span>
                               )}
                               {group.ready.some((r: any) => r.type === 'paket') && (
                                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded">📦 {group.ready.filter((r: any) => r.type === 'paket').length} Paket</span>
                               )}
                               {group.history.length > 0 && (
                                  <span className="text-[9px] font-medium text-gray-500">History: {group.history.length} klaim</span>
                               )}
                            </div>
                         </div>
                      </AccordionTrigger>
                      
                      <div className="flex items-center gap-2 border-l pl-3 ml-2">
                         {can("pencairan", "print") && (
                           <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-9 w-9 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 handlePrintSingle(group);
                              }}
                           >
                              <Printer className="h-5 w-5" />
                           </Button>
                         )}
                      </div>
                     </div>

                    <AccordionContent className="px-4 pb-4 border-t bg-gray-50/30 space-y-6 pt-4">
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 text-blue-800">
                            <Clock className="h-4 w-4" />
                            <h3 className="text-sm font-bold uppercase tracking-wider">Promosi Siap Dicairkan</h3>
                         </div>
                         
                         <div className="bg-white rounded-xl border-2 border-blue-100 overflow-hidden shadow-sm">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-blue-50/50 hover:bg-blue-50/50">
                                  <TableHead className="h-8 text-[10px] py-1 font-bold">INFO PROMO</TableHead>
                                  <TableHead className="h-8 text-[10px] py-1 font-bold">NAMA MEREK</TableHead>
                                  <TableHead className="h-8 text-[10px] py-1 font-bold">NILAI</TableHead>
                                  <TableHead className="h-8 text-[10px] py-1 font-bold text-right">AKSI</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.ready.length === 0 ? (
                                  <TableRow>
                                     <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground italic">
                                        Tidak ada promo yang siap dicairkan saat ini.
                                     </TableCell>
                                  </TableRow>
                                ) : (
                                  group.ready.map((item: any, idx: number) => (
                                     <TableRow key={`${item.type}-${item.id}-${idx}`} className="hover:bg-blue-100/30 transition-colors border-b last:border-0">
                                       <TableCell className="py-3">
                                          <div className="flex items-center gap-3">
                                             <div className={`h-8 w-8 rounded-full flex items-center justify-center text-lg shadow-sm border ${
                                                item.type === 'cashback' ? 'bg-green-100 border-green-200 text-green-600' :
                                                item.type === 'point' ? 'bg-purple-100 border-purple-200 text-purple-600' :
                                                item.type === 'cutting' ? 'bg-orange-100 border-orange-200 text-orange-600' :
                                                 item.type === 'principal' ? 'bg-indigo-100 border-indigo-200 text-indigo-600' :
                                                'bg-blue-100 border-blue-200 text-blue-600'
                                             }`}>
                                                {item.type === 'cashback' ? '💰' : item.type === 'point' ? '⭐' : item.type === 'cutting' ? '🏷️' : item.type === 'principal' ? '🏢' : '📦'}
                                             </div>
                                             <div className="flex flex-col">
                                                <span className="text-[12px] font-black text-gray-800 leading-tight uppercase">
                                                   {item.label || item.namaPromo || (item.type === 'point' ? 'Poin Hadiah' : 'Reward')}
                                                </span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                   <span className="text-[10px] text-muted-foreground bg-gray-100 px-1 rounded">Faktur: {item.noFaktur || '-'}</span>
                                                   {item.totalLabel && <span className="text-[10px] font-bold text-orange-600 border-l pl-1.5 line-clamp-1">{item.totalLabel} Label</span>}
                                                   {item.desc && <span className="text-[10px] font-bold text-blue-600 border-l pl-1.5 line-clamp-1">{item.desc}</span>}
                                                </div>
                                             </div>
                                          </div>
                                       </TableCell>
                                        <TableCell className="py-3">
                                           <Badge variant="outline" className="text-[10px] font-extrabold px-2 py-0.5 border-2 border-blue-100 bg-blue-50 text-blue-700 shadow-sm uppercase tracking-tight">
                                              {item.brandName || item.brandCode || 'Semua Merek'}
                                           </Badge>
                                        </TableCell>
                                       <TableCell className="py-3">
                                          <div className="flex flex-col">
                                             <span className={`text-[13px] font-black ${item.type === 'point' ? 'text-purple-700' : 'text-green-700'}`}>
                                                {item.type === 'point' ? `${item.saldoPoin} Pts` : `Rp ${Number(item.nilai || item.totalNilai || 0).toLocaleString()}`}
                                             </span>
                                             {item.type === 'cutting' && (
                                                <span className="text-[9px] text-muted-foreground italic leading-none">Terakumulasi</span>
                                             )}
                                          </div>
                                       </TableCell>
                                       <TableCell className="py-3 text-right">
                                          <Button 
                                             size="sm" 
                                             className="h-8 px-4 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 shadow-md active:scale-95 transition-transform"
                                             disabled={disburseMutation.isPending}
                                             onClick={() => openDisburseModal(item, group)}
                                          >
                                             Cairkan Sekarang
                                          </Button>
                                       </TableCell>
                                     </TableRow>
                                   ))
                                )}
                              </TableBody>
                            </Table>
                         </div>
                      </div>

                      <Separator className="bg-gray-200" />

                      <div className="space-y-3">
                         <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="h-4 w-4" />
                            <h3 className="text-sm font-bold uppercase tracking-wider">Riwayat Pencairan (Selesai)</h3>
                         </div>

                         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm opacity-80">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50">
                                  <TableHead className="h-8 text-[10px] py-1 font-bold">TANGGAL CAIR</TableHead>
                                  <TableHead className="h-8 text-[10px] py-1 font-bold">REWARD</TableHead>
                                  <TableHead className="h-8 text-[10px] py-1 font-bold">METODE</TableHead>
                                  <TableHead className="h-8 text-[10px] py-1 font-bold text-right">JUMLAH</TableHead>
                                  <TableHead className="h-8 text-[10px] py-1 font-bold text-right">AKSI</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.history.length === 0 ? (
                                  <TableRow>
                                     <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground italic">
                                        Belum ada riwayat pencairan.
                                     </TableCell>
                                  </TableRow>
                                ) : (
                                  group.history.map((h: any) => (
                                    <TableRow key={h.id} className="hover:bg-gray-50/50">
                                      <TableCell className="py-2 text-[10px] text-gray-600">
                                         {format(new Date(h.tanggalKlaim), "dd/MM/yyyy")}
                                      </TableCell>
                                      <TableCell className="py-2">
                                         <div className="flex flex-col">
                                            <span className="text-[10px] font-medium text-gray-700">{h.rewardDesc}</span>
                                            <span className="text-[8px] text-muted-foreground uppercase">{h.sumber}</span>
                                         </div>
                                      </TableCell>
                                      <TableCell className="py-2">
                                         <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-800 uppercase">{h.metodePencairan || 'CASH'}</span>
                                            {h.metodePencairan === 'transfer_bank' && <span className="text-[8px] text-muted-foreground">{h.namaBank}</span>}
                                            {h.metodePencairan === 'potong_faktur' && <span className="text-[8px] text-muted-foreground">Faktur: {h.nomorFakturPotong}</span>}
                                         </div>
                                      </TableCell>
                                      <TableCell className="py-2 text-right text-[10px] font-bold text-green-700">
                                         Rp {Number(h.jumlah).toLocaleString()}
                                      </TableCell>
                                      <TableCell className="py-2 text-right">
                                         <AlertDialog>
                                           <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                               <Trash2 className="h-3 w-3" />
                                             </Button>
                                           </AlertDialogTrigger>
                                           <AlertDialogContent>
                                             <AlertDialogHeader>
                                               <AlertDialogTitle>Batalkan Pencairan?</AlertDialogTitle>
                                               <AlertDialogDescription>
                                                 Item ini akan dikembalikan ke daftar antrean reward.
                                               </AlertDialogDescription>
                                             </AlertDialogHeader>
                                             <AlertDialogFooter>
                                               <AlertDialogCancel className="h-8 text-xs">Batal</AlertDialogCancel>
                                               <AlertDialogAction 
                                                 className="h-8 text-xs bg-red-600 hover:bg-red-700"
                                                 onClick={() => deleteDisburseMutation.mutate(h.id)}
                                               >
                                                 Lanjutkan
                                               </AlertDialogAction>
                                             </AlertDialogFooter>
                                           </AlertDialogContent>
                                         </AlertDialog>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                         </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )
          )}
        </div>
      )}

      {/* DISBURSEMENT MODAL */}
      <Dialog open={disburseModal?.open || false} onOpenChange={(open) => !open && setDisburseModal(null)}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-slate-50 border-2 border-blue-100/60 shadow-2xl rounded-2xl">
          {disburseModal && (
            <div className="flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-blue-200" />
                  Konfirmasi Pencairan Reward
                </DialogTitle>
                <div className="mt-4 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                   <div className="flex justify-between items-center">
                     <div className="flex flex-col">
                        <span className="text-xs text-blue-100 uppercase tracking-widest font-semibold mb-1">Pelanggan</span>
                        <span className="font-bold text-lg leading-tight">{disburseModal.group.name}</span>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-xs text-blue-100 uppercase tracking-widest font-semibold mb-1">Total Cair</span>
                        <span className="font-extrabold text-2xl text-green-300 drop-shadow-md">
                           {disburseModal.item.type === 'point' 
                              ? `${Number(disburseModal.item.saldoPoin).toLocaleString()} Pts` 
                              : `Rp ${Number(disburseModal.item.nilai || disburseModal.item.totalNilai || 0).toLocaleString()}`}
                        </span>
                     </div>
                   </div>
                   <div className="mt-3 pt-3 border-t border-white/20 flex gap-2">
                     <Badge variant="outline" className="bg-white/20 text-white border-none text-[10px] font-bold">
                        {disburseModal.item.label || disburseModal.item.namaPromo || 'REWARD'}
                     </Badge>
                     {disburseModal.item.desc && (
                       <Badge variant="outline" className="bg-white/10 text-blue-100 border-none text-[10px]">
                          {disburseModal.item.desc}
                       </Badge>
                     )}
                   </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-50">
                {/* Nilai Pencairan Section */}
                <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nilai yang Dicairkan <span className="text-red-500">*</span></Label>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                      Maks: Rp {Number(disburseModal.item.type === 'point' ? (disburseModal.item.saldoPoin || disburseModal.item.nilai || 0) : (disburseModal.item.nilai || disburseModal.item.totalNilai || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-slate-400">
                      {disburseModal.item.type === 'point' ? '' : 'Rp'}
                    </span>
                    <Input 
                      type="text"
                      value={nilaiDicairkan}
                      onChange={(e) => setNilaiDicairkan(formatRibuan(e.target.value))}
                      className={`${disburseModal.item.type === 'point' ? 'pl-3' : 'pl-9'} font-mono text-lg font-black text-blue-700 border-slate-200 focus:ring-blue-500 focus:border-blue-500`}
                    />
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-slate-500">Sisa setelah cairkan:</span>
                    <span className={`text-xs font-bold ${(Number(disburseModal.item.type === 'point' ? (disburseModal.item.saldoPoin || disburseModal.item.nilai || 0) : (disburseModal.item.nilai || disburseModal.item.totalNilai || 0)) - Number(parseRibuan(nilaiDicairkan) || 0)) > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                      Rp {formatRibuan(Number(disburseModal.item.type === 'point' ? (disburseModal.item.saldoPoin || disburseModal.item.nilai || 0) : (disburseModal.item.nilai || disburseModal.item.totalNilai || 0)) - Number(parseRibuan(nilaiDicairkan) || 0))}
                    </span>
                  </div>
                  {(Number(disburseModal.item.type === 'point' ? (disburseModal.item.saldoPoin || disburseModal.item.nilai || 0) : (disburseModal.item.nilai || disburseModal.item.totalNilai || 0)) - Number(parseRibuan(nilaiDicairkan) || 0)) > 0 && (
                    <p className="text-[10px] text-orange-600 italic bg-orange-50 p-2 rounded-lg border border-orange-100 animate-in fade-in slide-in-from-top-1">
                      Sisa Rp {formatRibuan(Number(disburseModal.item.type === 'point' ? (disburseModal.item.saldoPoin || disburseModal.item.nilai || 0) : (disburseModal.item.nilai || disburseModal.item.totalNilai || 0)) - Number(parseRibuan(nilaiDicairkan) || 0))} akan tetap tersedia untuk dicairkan berikutnya
                    </p>
                  )}
                </div>

                {/* Method Selection */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Metode Pencairan</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setMetode('cash')}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                        metode === 'cash' 
                          ? 'border-blue-500 bg-blue-50/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20 transform scale-[1.02]' 
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-full mb-2 ${metode === 'cash' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Banknote className="h-6 w-6" />
                      </div>
                      <span className={`text-sm font-bold ${metode === 'cash' ? 'text-blue-700' : 'text-slate-600'}`}>Tarik Cash</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setMetode('transfer_bank')}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                        metode === 'transfer_bank' 
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20 transform scale-[1.02]' 
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-full mb-2 ${metode === 'transfer_bank' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Building2 className="h-6 w-6" />
                      </div>
                      <span className={`text-sm font-bold ${metode === 'transfer_bank' ? 'text-indigo-700' : 'text-slate-600'}`}>Transfer Bank</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetode('potong_faktur')}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                        metode === 'potong_faktur' 
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20 transform scale-[1.02]' 
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-full mb-2 ${metode === 'potong_faktur' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <span className={`text-sm font-bold ${metode === 'potong_faktur' ? 'text-emerald-700' : 'text-slate-600'}`}>Potong Faktur</span>
                    </button>
                  </div>
                </div>

                <Separator className="bg-slate-200" />

                {/* Dynamic Form Area */}
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Tanggal Pencairan <span className="text-red-500">*</span></Label>
                    <Input 
                      type="text" placeholder="DD/MM/YYYY" maxLength={10} 
                      value={tanggalCair} 
                      onChange={(e) => setTanggalCair(e.target.value)}
                      className="bg-white border-slate-200 shadow-sm transition-all focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {metode === 'cash' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Deskripsi / Keterangan Pencairan <span className="text-muted-foreground font-normal">(Opsional)</span></Label>
                      <Input 
                        placeholder="Contoh: Diambil oleh supir bapak Budi" 
                        value={keteranganCash} 
                        onChange={(e) => setKeteranganCash(e.target.value)}
                        className="bg-white border-slate-200 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {metode === 'transfer_bank' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Nama Bank Tujuan <span className="text-red-500">*</span></Label>
                        <Input 
                          placeholder="Contoh: BCA, MANDIRI, BNI" 
                          value={namaBank} 
                          onChange={(e) => setNamaBank(e.target.value.toUpperCase())}
                          className="bg-white border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Nomor Rekening <span className="text-red-500">*</span></Label>
                        <Input 
                          placeholder="Masukkan nomor rekening" 
                          value={nomorRekening} 
                          onChange={(e) => setNomorRekening(e.target.value)}
                          className="bg-white border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 font-mono tracking-wider"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Nama Pemilik Rekening <span className="text-red-500">*</span></Label>
                        <Input 
                          placeholder="Atas nama pada rekening" 
                          value={namaPemilikRekening} 
                          onChange={(e) => setNamaPemilikRekening(e.target.value.toUpperCase())}
                          className="bg-white border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {metode === 'potong_faktur' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Nomor Faktur Order <span className="text-red-500">*</span></Label>
                        <Input 
                          placeholder="Contoh: INV-2401-001" 
                          value={nomorFakturPotong} 
                          onChange={(e) => setNomorFakturPotong(e.target.value.toUpperCase())}
                          className="bg-white border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Nilai Faktur (Rp) <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 font-bold text-slate-400">Rp</span>
                          <Input 
                            type="text"
                            placeholder="0" 
                            value={nilaiFakturPotong} 
                            onChange={(e) => setNilaiFakturPotong(formatRibuan(e.target.value))}
                            className="bg-white border-slate-200 pl-9 font-mono focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-5 bg-white border-t border-slate-200 flex justify-end gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                <Button 
                  variant="outline" 
                  onClick={() => setDisburseModal(null)}
                  className="font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-6 rounded-full"
                >
                  Batal
                </Button>
                <Button 
                  onClick={() => {
                     if (Number(parseRibuan(nilaiDicairkan)) <= 0 || isNaN(Number(parseRibuan(nilaiDicairkan)))) {
                      toast({ title: "Nilai Tidak Valid", description: "Nilai pencairan harus lebih dari 0.", variant: "destructive" });
                      return;
                    }
                    const totalAvailable = Number(disburseModal.item.type === 'point' ? (disburseModal.item.saldoPoin || disburseModal.item.nilai || 0) : (disburseModal.item.nilai || disburseModal.item.totalNilai || 0));
                    if (Number(parseRibuan(nilaiDicairkan)) > totalAvailable) {
                      toast({ title: "Melebihi Batas", description: "Nilai pencairan tidak boleh melebihi saldo tersedia.", variant: "destructive" });
                      return;
                    }

                    if (metode === 'transfer_bank' && (!namaBank || !nomorRekening || !namaPemilikRekening)) {
                      toast({ title: "Formulir Tidak Lengkap", description: "Lengkapi semua data transfer bank.", variant: "destructive" });
                      return;
                    }
                    if (metode === 'potong_faktur' && (!nomorFakturPotong || !nilaiFakturPotong)) {
                      toast({ title: "Formulir Tidak Lengkap", description: "Lengkapi nomor dan nilai faktur.", variant: "destructive" });
                      return;
                    }


                    disburseMutation.mutate({
                       pelangganId: disburseModal.group.id,
                       type: disburseModal.item.type,
                       refId: disburseModal.item.type === 'point' ? `pt_${disburseModal.group.id}` : (disburseModal.item.id || disburseModal.item.refId),
                       amount: Number(parseRibuan(nilaiDicairkan)),
                       desc: disburseModal.item.desc || disburseModal.item.label || disburseModal.item.namaPromo
                    });
                  }}
                  disabled={disburseMutation.isPending}
                  className={`font-semibold px-8 shadow-lg active:scale-95 transition-transform rounded-full border-b-[3px]
                    ${metode === 'cash' ? 'bg-blue-600 hover:bg-blue-700 border-blue-800' : 
                      metode === 'transfer_bank' ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-800' : 
                      'bg-emerald-600 hover:bg-emerald-700 border-emerald-800'}
                  `}
                >
                  {disburseMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sedang Diproses...</>
                  ) : (
                    <><CheckCircle className="mr-2 h-5 w-5" /> Konfirmasi Pencairan</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

