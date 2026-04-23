
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/Card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Building2, FileCheck, X, AlertTriangle,
  ExternalLink, CheckSquare, Filter, Building, Eye, RotateCcw,
  Printer, FileText, FileSpreadsheet, Loader2, CheckCircle, Clock, RefreshCw
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatIndonesiaDate, parseIndonesiaDate, formatRibuan, parseRibuan } from "@/lib/utils";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useBranch } from "@/hooks/use-branch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";

export default function PrincipalClaims() {
  const { toast } = useToast();
  const { can } = usePermissions();
  const { selectedBranchId, selectedBranch } = useBranch();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [principalFilter, setPrincipalFilter] = useState<string>("all");

  // Approval Modal State
  const [approvalModal, setApprovalModal] = useState<{ open: boolean; item: any; action: 'approve' | 'reject' } | null>(null);
  const [viewReasonModal, setViewReasonModal] = useState<{ open: boolean; item: any } | null>(null);
  const [catatanDitolak, setCatatanDitolak] = useState('');
  
  // Cancellation & Revision State
  const [cancelModal, setCancelModal] = useState<{ open: boolean; item: any } | null>(null);
  const [revisionModal, setRevisionModal] = useState<{ open: boolean; item: any } | null>(null);
  const [catatanRevisi, setCatatanRevisi] = useState('');
  
  // Revision Form State
  const [revForm, setRevForm] = useState({
    nilaiKlaim: '',
    rewardPrincipalType: '',
    rewardPrincipalDesc: ''
  });

  const { data: claimsData, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/reward/principal-claims", { branchId: selectedBranchId }],
    queryFn: async () => {
       const res = await fetch(`/api/reward/principal-claims?branchId=${selectedBranchId}`);
       if (!res.ok) throw new Error("Gagal mengambil data klaim");
       return res.json();
    },
    enabled: !!selectedBranchId
  });

  const { data: principals } = useQuery<any[]>({
    queryKey: ["/api/promo/masters/principal", { branchId: selectedBranchId }],
    queryFn: async () => {
       const res = await fetch(`/api/promo/masters/principal?branchId=${selectedBranchId}`);
       if (!res.ok) throw new Error("Gagal mengambil data principal");
       return res.json();
    },
    enabled: !!selectedBranchId
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, catatan, ...rest }: { id: number, status?: string, catatan?: string, [key: string]: any }) => {
      await apiRequest("PATCH", `/api/reward/principal-claims/${id}/status`, { 
        status,
        catatanDitolak: status === 'ditolak' ? catatan : undefined,
        catatanRevisi: status !== 'ditolak' ? catatan : undefined,
        ...rest
      });
    },
    onSuccess: () => {
      toast({ title: "Berhasil!", description: "Data klaim telah diperbarui." });
      setApprovalModal(null);
      setCancelModal(null);
      setRevisionModal(null);
      setCatatanDitolak('');
      setCatatanRevisi('');
      queryClient.invalidateQueries({ queryKey: ["/api/reward/principal-claims"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const dataToExport = filteredClaims.map(c => ({
      "Tanggal": c.createdAt ? format(new Date(c.createdAt), "dd/MM/yyyy") : "-",
      "Info Klaim": `${c.pelanggan?.name || "N/A"} (ID: ${c.id})`,
      "Principal": c.principal?.nama || "N/A",
      "Program": c.program?.nama || "N/A",
      "Total Reward": Number(c.nilaiRewardTotal || 0),
      "INT (Internal)": Number(c.tanggunganInternal || 0),
      "PRN (Principal)": Number(c.tanggunganPrincipal || 0),
      "Nilai Klaim": Number(c.nilaiKlaim || 0),
      "Jenis Reward": c.rewardPrincipalType || "-",
      "Status": c.status === 'belum_klaim' ? 'PENDING' :
                c.status === 'sudah_klaim' ? 'SENT TO PRINCIPAL' :
                c.status === 'disetujui' ? 'SETTLED' : 'REJECTED'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Klaim Principal");
    XLSX.writeFile(wb, `Klaim_Principal_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const dateStr = format(new Date(), "dd/MM/yyyy HH:mm");
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("PRATAMA JAYA & FERIO MOTOR", 14, 15);
    
    doc.setFontSize(14);
    doc.text("Laporan Klaim Principal", 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Dicetak pada: ${dateStr}`, 14, 32);
    doc.text(`Cabang: ${selectedBranchId ? 'ID ' + selectedBranchId : 'Semua Cabang'}`, 14, 37);

    // Summary Box
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(14, 42, 270, 15, 2, 2, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Pending: ${stats.pending}`, 20, 51);
    doc.text(`Sudah Klaim: ${stats.requested}`, 70, 51);
    doc.text(`Disetujui: ${stats.approved}`, 130, 51);
    doc.text(`Ditolak: ${stats.rejected}`, 190, 51);
    doc.text(`Total Cair: Rp ${(stats.totalValue || 0).toLocaleString()}`, 240, 51);

    autoTable(doc, {
      startY: 65,
      head: [["Tanggal", "Pelanggan", "Principal & Program", "Total Reward", "INT", "PRN", "Nilai Klaim", "Status"]],
      body: filteredClaims.map(c => [
        c.createdAt ? format(new Date(c.createdAt), "dd/MM/yy") : "-",
        c.pelanggan?.name || "-",
        `${c.principal?.nama || "-"}\n${c.program?.nama || "-"}`,
        Number(c.nilaiRewardTotal || 0).toLocaleString(),
        Number(c.tanggunganInternal || 0).toLocaleString(),
        Number(c.tanggunganPrincipal || 0).toLocaleString(),
        Number(c.nilaiKlaim || 0).toLocaleString(),
        c.status.toUpperCase().replace('_', ' ')
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }, // indigo-600
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    if (finalY < 180) {
      doc.text("Disetujui Oleh,", 220, finalY);
      doc.text("__________________________", 220, finalY + 25);
      doc.text("( Manajer Operasional )", 220, finalY + 32);
    }
    
    doc.save(`Klaim_Principal_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const filteredClaims = useMemo(() => {
    if (!claimsData) return [];
    let result = claimsData;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.pelanggan?.name?.toLowerCase().includes(lowerSearch) || 
        c.program?.nama?.toLowerCase().includes(lowerSearch)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(c => c.status === statusFilter);
    }

    if (principalFilter !== "all") {
      result = result.filter(c => c.principalId?.toString() === principalFilter);
    }

    return result;
  }, [claimsData, searchTerm, statusFilter, principalFilter]);

  const stats = useMemo(() => {
    if (!claimsData) return { pending: 0, requested: 0, approved: 0, rejected: 0, totalValue: 0 };
    return {
      pending: claimsData.filter(c => c?.status === 'belum_klaim').length,
      requested: claimsData.filter(c => c?.status === 'sudah_klaim').length,
      approved: claimsData.filter(c => c?.status === 'disetujui').length,
      rejected: claimsData.filter(c => c?.status === 'ditolak').length,
      totalValue: claimsData.reduce((sum, c) => sum + (c?.status === 'disetujui' ? Number(c.nilaiRewardTotal || c.rewardPrincipalValue || 0) : 0), 0)
    };
  }, [claimsData]);

  const handleAction = (item: any, action: 'approve' | 'reject') => {
    if (action === 'approve') {
       updateStatusMutation.mutate({ id: item.id, status: 'disetujui' });
    } else {
       setApprovalModal({ open: true, item, action: 'reject' });
    }
  };

  const submitRejection = () => {
    if (!approvalModal?.item) return;
    updateStatusMutation.mutate({ 
      id: approvalModal.item.id, 
      status: 'ditolak', 
      catatan: catatanDitolak 
    });
  };

  const submitCancellation = () => {
    if (!cancelModal?.item) return;
    updateStatusMutation.mutate({
      id: cancelModal.item.id,
      status: 'belum_klaim',
      catatan: catatanRevisi
    });
  };

  const openRevision = (item: any) => {
    setRevisionModal({ open: true, item });
    setRevForm({
      nilaiKlaim: formatRibuan(String(item.nilaiKlaim || item.rewardPrincipalValue || 0)),
      rewardPrincipalType: item.rewardPrincipalType || '',
      rewardPrincipalDesc: item.rewardPrincipalDesc || ''
    });
  };

  const submitRevision = () => {
    if (!revisionModal?.item) return;
    updateStatusMutation.mutate({
      id: revisionModal.item.id,
      status: 'belum_klaim',
      catatan: catatanRevisi,
      ...revForm,
      nilaiKlaim: Number(parseRibuan(revForm.nilaiKlaim))
    });
  };

  const activePrincipalName = useMemo(() => {
    if (principalFilter === "all") return "Semua Principal";
    return principals?.find(p => p.id.toString() === principalFilter)?.nama || "Semua Principal";
  }, [principals, principalFilter]);

  const activeStatusLabel = useMemo(() => {
    if (statusFilter === "all") return "Semua Status";
    return statusFilter === 'belum_klaim' ? 'Pending' :
           statusFilter === 'sudah_klaim' ? 'Sudah Klaim' :
           statusFilter === 'disetujui' ? 'Disetujui' : 'Ditolak';
  }, [statusFilter]);

  const totalNilaiKlaim = useMemo(() => {
    return filteredClaims.reduce((sum, c) => sum + Number(c.nilaiKlaim || c.rewardPrincipalValue || 0), 0);
  }, [filteredClaims]);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      
      {/* Printable Report View */}
      <div className="hidden print:block space-y-6">
        {/* Print Header */}
        <div className="border-b-4 border-slate-900 pb-4 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h1 className="text-3xl font-black">{selectedBranch?.name || "PRATAMA JAYA & FERIO MOTOR"}</h1>
              <h2 className="text-xl font-bold text-slate-700">Laporan Klaim Principal</h2>
            </div>
            <div className="text-right text-sm font-medium">
              <p>Tanggal Cetak: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Filter Principal:</span>
              <p className="font-black text-slate-800">{activePrincipalName}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Filter Status:</span>
              <p className="font-black text-slate-800">{activeStatusLabel}</p>
            </div>
          </div>
        </div>

        {/* Print Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 text-[10px] font-black uppercase">No</th>
              <th className="border border-slate-300 p-2 text-[10px] font-black uppercase text-left">Tanggal</th>
              <th className="border border-slate-300 p-2 text-[10px] font-black uppercase text-left">Pelanggan</th>
              <th className="border border-slate-300 p-2 text-[10px] font-black uppercase text-left">Principal & Program</th>
              <th className="border border-slate-300 p-2 text-[10px] font-black uppercase text-right">Total Reward</th>
              <th className="border border-slate-300 p-2 text-[10px] font-black uppercase text-right">Porsi Perusahaan</th>
              <th className="border border-slate-300 p-2 text-[10px] font-black uppercase text-right">Porsi Principal</th>
              <th className="border border-slate-300 p-2 text-[10px] font-black uppercase text-right text-indigo-700">Nilai Klaim</th>
              <th className="border border-slate-300 p-2 text-[10px] font-black uppercase text-left">Jenis Reward</th>
              <th className="border border-slate-300 p-2 text-[10px] font-black uppercase text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredClaims.map((c, index) => (
              <tr key={c.id}>
                <td className="border border-slate-300 p-2 text-[10px] text-center font-bold">{index + 1}</td>
                <td className="border border-slate-300 p-2 text-[10px]">{c.createdAt ? format(new Date(c.createdAt), "dd/MM/yyyy") : "-"}</td>
                <td className="border border-slate-300 p-2 text-[10px] font-bold">{c.pelanggan?.name || "-"}</td>
                <td className="border border-slate-300 p-2 text-[10px]">
                  <span className="font-bold">{c.principal?.nama}</span><br />
                  <span className="text-slate-500 italic">{c.program?.nama}</span>
                </td>
                <td className="border border-slate-300 p-2 text-[10px] text-right">{(Number(c.nilaiRewardTotal || c.rewardPrincipalValue || 0)).toLocaleString()}</td>
                <td className="border border-slate-300 p-2 text-[10px] text-right">{(Number(c.tanggunganInternal || 0)).toLocaleString()}</td>
                <td className="border border-slate-300 p-2 text-[10px] text-right">{(Number(c.tanggunganPrincipal || 0)).toLocaleString()}</td>
                <td className="border border-slate-300 p-2 text-[10px] text-right font-black text-indigo-700">{(Number(c.nilaiKlaim || c.rewardPrincipalValue || 0)).toLocaleString()}</td>
                <td className="border border-slate-300 p-2 text-[10px]">{c.rewardPrincipalType || "-"}</td>
                <td className="border border-slate-300 p-2 text-[10px] text-center font-black uppercase">
                  {c.status.toUpperCase().replace('_', ' ')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-black">
              <td colSpan={10} className="border border-slate-300 p-2 text-sm">
                <div className="flex justify-between items-center w-full px-2">
                  <span>TOTAL KESELURUHAN NILAI KLAIM</span>
                  <span className="text-indigo-700">Rp {totalNilaiKlaim.toLocaleString()}</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Print Signatures */}
        <div className="pt-10 grid grid-cols-3 gap-8">
          <div className="text-center">
            <p className="font-bold mb-16">Dibuat oleh,</p>
            <div className="border-t border-slate-900 w-40 mx-auto mb-1"></div>
            <p className="text-[10px] font-bold uppercase">( ADMIN CABANG )</p>
          </div>
          <div className="text-center">
            <p className="font-bold mb-16">Disetujui oleh,</p>
            <div className="border-t border-slate-900 w-40 mx-auto mb-1"></div>
            <p className="text-[10px] font-bold uppercase">( SUPERVISOR )</p>
          </div>
          <div className="text-center">
            <p className="font-bold mb-16">Mengetahui,</p>
            <div className="border-t border-slate-900 w-40 mx-auto mb-1"></div>
            <p className="text-[10px] font-bold uppercase">( DIREKTUR )</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
             <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                <Building2 className="h-7 w-7" />
             </div>
             Klaim Principal
          </h1>
          <p className="text-slate-500 font-medium ml-12">Monitoring dan manajemen penagihan reward ke pihak Pabrik/Principal</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
           {can('klaim_principal', 'print') && (
             <Button 
               variant="outline" 
               className="rounded-xl border-slate-200 shadow-sm font-bold text-indigo-600 hover:bg-indigo-50 h-11 print:hidden" 
               onClick={handlePrint}
             >
               <Printer className="h-4 w-4 mr-2" />
               Print
             </Button>
           )}
           
           {can('klaim_principal', 'export') && (
             <>
               <Button 
                 variant="outline" 
                 className="rounded-xl border-slate-200 shadow-sm font-bold text-emerald-600 hover:bg-emerald-50 h-11 print:hidden" 
                 onClick={handleExportExcel}
               >
                 <FileSpreadsheet className="h-4 w-4 mr-2" />
                 Export Excel
               </Button>

               <Button 
                 variant="outline" 
                 className="rounded-xl border-slate-200 shadow-sm font-bold text-rose-600 hover:bg-rose-50 h-11 print:hidden" 
                 onClick={handleExportPDF}
               >
                 <FileText className="h-4 w-4 mr-2" />
                 Export PDF
               </Button>
             </>
           )}

           <Button 
             variant="outline" 
             className="rounded-xl border-slate-200 shadow-sm font-bold text-slate-600 hover:bg-slate-50 h-11 print:hidden" 
             onClick={() => refetch()}
           >
             <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
             Refresh Data
           </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 print:hidden">
         <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden relative group">
            <CardContent className="p-5">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                     <Clock className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none font-bold text-[10px]">WAITING</Badge>
               </div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pending</p>
               <h3 className="text-2xl font-black text-slate-800">{stats.pending}</h3>
            </CardContent>
            <div className="absolute bottom-0 left-0 h-1 bg-blue-500 w-full" />
         </Card>

         <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden relative group">
            <CardContent className="p-5">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                     <ExternalLink className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-none font-bold text-[10px]">PROCESS</Badge>
               </div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sudah Klaim</p>
               <h3 className="text-2xl font-black text-slate-800">{stats.requested}</h3>
            </CardContent>
            <div className="absolute bottom-0 left-0 h-1 bg-amber-500 w-full" />
         </Card>

         <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden relative group">
            <CardContent className="p-5">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                     <CheckCircle className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px]">SUCCESS</Badge>
               </div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Disetujui</p>
               <h3 className="text-2xl font-black text-slate-800">{stats.approved}</h3>
            </CardContent>
            <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 w-full" />
         </Card>

         <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden relative group">
            <CardContent className="p-5">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
                     <X className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="bg-rose-50 text-rose-600 border-none font-bold text-[10px]">FAILED</Badge>
               </div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ditolak</p>
               <h3 className="text-2xl font-black text-slate-800">{stats.rejected}</h3>
            </CardContent>
            <div className="absolute bottom-0 left-0 h-1 bg-rose-500 w-full" />
         </Card>

         <Card className="border-none shadow-xl shadow-indigo-100 bg-gradient-to-br from-indigo-600 to-violet-700 text-white col-span-2 lg:col-span-1">
            <CardContent className="p-5">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-white/20 text-white rounded-lg">
                     <FileCheck className="h-5 w-5" />
                  </div>
               </div>
               <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">Total Cair</p>
               <h3 className="text-xl font-black truncate tracking-tighter">Rp {(stats.totalValue ?? 0).toLocaleString()}</h3>
            </CardContent>
         </Card>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden print:hidden">
        <CardContent className="p-0">
          <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input 
                   placeholder="Cari pelanggan atau program..." 
                   className="pl-12 h-12 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all shadow-sm"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             
             <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-48">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none">
                      <Building className="h-4 w-4" />
                   </div>
                   <Select value={principalFilter} onValueChange={setPrincipalFilter}>
                      <SelectTrigger className="h-12 pl-10 rounded-2xl border-2 border-slate-100 bg-white font-bold text-slate-600">
                         <SelectValue placeholder="Principal" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-100">
                         <SelectItem value="all">Semua Principal</SelectItem>
                         {principals?.map(p => p && p.id ? (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.nama}</SelectItem>
                         ) : null)}
                      </SelectContent>
                   </Select>
                </div>

                <div className="relative w-full md:w-48">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none">
                      <Filter className="h-4 w-4" />
                   </div>
                   <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-12 pl-10 rounded-2xl border-2 border-slate-100 bg-white font-bold text-slate-600">
                         <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-100">
                         <SelectItem value="all">Semua Status</SelectItem>
                         <SelectItem value="belum_klaim">Pending</SelectItem>
                         <SelectItem value="sudah_klaim">Sudah Klaim</SelectItem>
                         <SelectItem value="disetujui">Disetujui</SelectItem>
                         <SelectItem value="ditolak">Ditolak</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
             </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 border-none">
                  <TableHead className="font-black text-[11px] uppercase tracking-widest text-slate-500 py-5 pl-8">TANGGAL</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest text-slate-500 py-5">INFO KLAIM</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest text-slate-500 py-5">PRINCIPAL & PROGRAM</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest text-slate-500 py-5 text-right">TOTAL REWARD</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest text-slate-500 py-5 text-right">INT / PRN</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest text-indigo-600 py-5 text-right">NILAI KLAIM</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest text-slate-500 py-5">STATUS</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest text-slate-500 py-5 text-center pr-8 print:hidden">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1,2,3].map(i => (
                    <TableRow key={i}>
                       <TableCell colSpan={6} className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredClaims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-24 text-center">
                       <div className="flex flex-col items-center gap-4 text-slate-300">
                          <Building2 className="h-16 w-16 opacity-30" />
                          <p className="font-bold text-slate-400">Tidak ada data klaim yang sesuai kriteria.</p>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClaims.map((claim) => (
                    <TableRow key={claim.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 border-dashed">
                      <TableCell className="py-5 pl-8">
                         <div className="flex flex-col">
                            <span className="text-[13px] font-black text-slate-800">
                               {claim.createdAt ? format(new Date(claim.createdAt), "dd MMM yyyy") : "-"}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                               {claim.createdAt ? format(new Date(claim.createdAt), "HH:mm") : "-"}
                            </span>
                         </div>
                      </TableCell>
                      <TableCell className="py-5">
                         <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800 leading-tight mb-1">{claim.pelanggan?.name || "Pelanggan Terhapus"}</span>
                            <div className="flex items-center gap-2">
                               <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-bold py-0 h-4">ID #{claim.id}</Badge>
                               <span className="text-[10px] font-medium text-slate-500 truncate max-w-[150px]">{claim.rewardPrincipalDesc}</span>
                            </div>
                         </div>
                      </TableCell>
                      <TableCell className="py-5">
                         <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 mb-1">
                               <Building className="h-3 w-3 text-slate-400" />
                               <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{claim.principal?.nama || "Principal Terhapus"}</span>
                            </div>
                            <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 px-2 rounded-full w-fit">{claim.program?.nama || "Program Terhapus"}</span>
                         </div>
                      </TableCell>
                      <TableCell className="py-5 text-right">
                         <div className="flex flex-col items-end">
                            <span className="text-[13px] font-black text-slate-900 tracking-tighter">Rp {Number(claim.nilaiRewardTotal || claim.rewardPrincipalValue || 0).toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Total</span>
                         </div>
                      </TableCell>
                      <TableCell className="py-5 text-right">
                         <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                               <span className="text-[11px] font-bold text-amber-600">I: {Number(claim.tanggunganInternal || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                               <span className="text-[11px] font-bold text-indigo-600">P: {Number(claim.tanggunganPrincipal || 0).toLocaleString()}</span>
                            </div>
                         </div>
                      </TableCell>
                      <TableCell className="py-5 text-right">
                         <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-indigo-700 tracking-tighter">Rp {Number(claim.nilaiKlaim || claim.rewardPrincipalValue || 0).toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{claim.rewardPrincipalType}</span>
                         </div>
                      </TableCell>
                      <TableCell className="py-5">
                         <div className="flex flex-col gap-1">
                            <Badge className={`w-fit text-[10px] font-black px-2 py-0.5 shadow-sm ${
                              claim.status === 'belum_klaim' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                              claim.status === 'sudah_klaim' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                              claim.status === 'disetujui' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              'bg-rose-100 text-rose-700 border-rose-200'
                            }`}>
                               {claim.status === 'belum_klaim' ? 'PENDING' :
                                claim.status === 'sudah_klaim' ? 'SENT TO PRINCIPAL' :
                                claim.status === 'disetujui' ? 'SETTLED' :
                                'REJECTED'}
                            </Badge>
                            {claim.status === 'sudah_klaim' && claim.tanggalKlaim && (
                               <span className="text-[9px] font-medium text-slate-400">Tgl Klaim: {format(new Date(claim.tanggalKlaim), "dd/MM")}</span>
                            )}
                         </div>
                      </TableCell>
                      <TableCell className="py-5 pr-8 text-center print:hidden">
                         <div className="flex items-center justify-center gap-1">
                            {claim.status === 'belum_klaim' && (
                               <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 px-3 text-[11px] font-black text-indigo-600 hover:bg-indigo-50 rounded-lg border border-transparent hover:border-indigo-100 transition-all"
                                  onClick={() => updateStatusMutation.mutate({ id: claim.id, status: 'sudah_klaim' })}
                               >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                  KIRIM KLAIM
                               </Button>
                            )}
                            {claim.status === 'sudah_klaim' && (
                               <div className="flex items-center gap-1 animate-in zoom-in duration-300">
                                  <Button 
                                     size="sm" 
                                     className="h-8 px-4 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md shadow-emerald-200"
                                     onClick={() => handleAction(claim, 'approve')}
                                  >
                                     <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                                     SETUJUI
                                  </Button>
                                  <Button 
                                     size="sm" 
                                     variant="ghost" 
                                     className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 rounded-lg"
                                     onClick={() => handleAction(claim, 'reject')}
                                  >
                                     <X className="h-4 w-4" />
                                  </Button>
                               </div>
                            )}
                            {claim.status === 'ditolak' && (
                               <div className="flex items-center gap-1 animate-in zoom-in duration-300">
                                  <Button 
                                     size="sm" 
                                     className="h-8 px-3 text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200"
                                     onClick={() => updateStatusMutation.mutate({ id: claim.id, status: 'belum_klaim' })}
                                  >
                                     <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                     AJUKAN ULANG
                                  </Button>
                                  <Button 
                                     size="sm" 
                                     variant="ghost" 
                                     className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200"
                                     onClick={() => setViewReasonModal({ open: true, item: claim })}
                                  >
                                     <Eye className="h-4 w-4" />
                                  </Button>
                               </div>
                            )}
                            {claim.status === 'disetujui' && (
                               <div className="flex items-center gap-1 animate-in zoom-in duration-300">
                                  <Button 
                                     size="sm" 
                                     className="h-8 px-3 text-[10px] font-black bg-slate-900 hover:bg-slate-800 rounded-lg shadow-md"
                                     onClick={() => openRevision(claim)}
                                  >
                                     <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                     REVISI
                                  </Button>
                                  <Button 
                                     size="sm" 
                                     variant="ghost" 
                                     className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 rounded-lg"
                                     onClick={() => setCancelModal({ open: true, item: claim })}
                                  >
                                     <RotateCcw className="h-4 w-4" />
                                  </Button>
                               </div>
                            )}
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Dialog open={approvalModal?.open && approvalModal.action === 'reject'} onOpenChange={() => setApprovalModal(null)}>
         <DialogContent className="rounded-2xl border-none shadow-2xl">
            <DialogHeader>
               <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  Tolak Klaim #{approvalModal?.item?.id}
               </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
               <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase text-slate-400">Alasan Penolakan</Label>
                  <Textarea 
                     placeholder="Tuliskan alasan penolakan agar tim administrasi mengetahui kendalanya..." 
                     className="rounded-xl border-slate-100 min-h-[120px] focus:ring-rose-500 transition-all font-medium"
                     value={catatanDitolak}
                     onChange={(e) => setCatatanDitolak(e.target.value)}
                  />
               </div>
               
               <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                     <span className="font-bold text-slate-500">Pelanggan:</span>
                     <span className="font-black text-slate-800">{approvalModal?.item?.pelanggan?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                     <span className="font-bold text-slate-500">Nilai Klaim:</span>
                     <span className="font-black text-rose-600">Rp {Number(approvalModal?.item?.nilaiKlaim || approvalModal?.item?.rewardPrincipalValue || 0).toLocaleString()}</span>
                  </div>
               </div>
            </div>
            <DialogFooter className="gap-2">
               <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setApprovalModal(null)}>Batal</Button>
               <Button 
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black px-6" 
                  disabled={!catatanDitolak || updateStatusMutation.isPending}
                  onClick={submitRejection}
               >
                  {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'YA, TOLAK KLAIM'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* View Reason Modal */}
      <Dialog open={viewReasonModal?.open} onOpenChange={() => setViewReasonModal(null)}>
         <DialogContent className="rounded-2xl border-none shadow-2xl">
            <DialogHeader>
               <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-indigo-500" />
                  Alasan Penolakan Klaim #{viewReasonModal?.item?.id}
               </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
               <div className="bg-rose-50 p-6 rounded-2xl border-2 border-rose-100/50">
                  <p className="text-rose-800 font-bold leading-relaxed whitespace-pre-wrap">
                     {viewReasonModal?.item?.catatanDitolak || "Tidak ada catatan alasan penolakan yang diberikan."}
                  </p>
               </div>
               
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl">
                     <span className="font-bold text-slate-500 uppercase tracking-widest">Pelanggan</span>
                     <span className="font-black text-slate-800">{viewReasonModal?.item?.pelanggan?.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl">
                     <span className="font-bold text-slate-500 uppercase tracking-widest">Program</span>
                     <span className="font-black text-slate-800">{viewReasonModal?.item?.program?.nama}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl">
                     <span className="font-bold text-slate-500 uppercase tracking-widest">Nilai Klaim</span>
                     <span className="font-black text-indigo-600">Rp {Number(viewReasonModal?.item?.nilaiKlaim || 0).toLocaleString()}</span>
                  </div>
               </div>
            </div>
            <DialogFooter>
               <Button 
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black px-8 w-full md:w-auto" 
                  onClick={() => setViewReasonModal(null)}
               >
                  TUTUP
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={cancelModal?.open} onOpenChange={() => setCancelModal(null)}>
         <DialogContent className="rounded-2xl border-none shadow-2xl">
            <DialogHeader>
               <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-indigo-600" />
                  Batalkan Klaim #{cancelModal?.item?.id}
               </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
               <p className="text-sm font-bold text-slate-600">
                  Apakah yakin ingin membatalkan klaim ini? Status akan dikembalikan ke <span className="text-indigo-600">PENDING</span>.
               </p>
               <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase text-slate-400">Alasan Pembatalan (Wajib)</Label>
                  <Textarea 
                     placeholder="Tuliskan alasan mengapa klaim ini dibatalkan..." 
                     className="rounded-xl border-slate-100 min-h-[100px] focus:ring-indigo-500 transition-all font-medium"
                     value={catatanRevisi}
                     onChange={(e) => setCatatanRevisi(e.target.value)}
                  />
               </div>
            </div>
            <DialogFooter className="gap-2">
               <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setCancelModal(null)}>Tutup</Button>
               <Button 
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6" 
                  disabled={!catatanRevisi || updateStatusMutation.isPending}
                  onClick={submitCancellation}
               >
                  {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'YA, BATALKAN'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Revision Modal */}
      <Dialog open={revisionModal?.open} onOpenChange={() => setRevisionModal(null)}>
         <DialogContent className="rounded-2xl border-none shadow-2xl max-w-md">
            <DialogHeader>
               <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-indigo-600" />
                  Revisi Klaim #{revisionModal?.item?.id}
               </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-slate-400">Nilai Klaim (Rp)</Label>
                     <Input 
                        type="text"
                        className="rounded-xl border-slate-100 font-bold"
                        value={revForm.nilaiKlaim}
                        onChange={(e) => setRevForm({...revForm, nilaiKlaim: formatRibuan(e.target.value)})}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-slate-400">Jenis Reward</Label>
                     <Input 
                        className="rounded-xl border-slate-100 font-bold"
                        value={revForm.rewardPrincipalType}
                        onChange={(e) => setRevForm({...revForm, rewardPrincipalType: e.target.value})}
                     />
                  </div>
               </div>
               
               <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Keterangan Reward</Label>
                  <Input 
                     className="rounded-xl border-slate-100 font-medium"
                     value={revForm.rewardPrincipalDesc}
                     onChange={(e) => setRevForm({...revForm, rewardPrincipalDesc: e.target.value})}
                  />
               </div>

               <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Alasan Revisi (Wajib)</Label>
                  <Textarea 
                     placeholder="Tuliskan detail perubahan yang dilakukan..." 
                     className="rounded-xl border-slate-100 min-h-[80px] focus:ring-indigo-500 transition-all font-medium"
                     value={catatanRevisi}
                     onChange={(e) => setCatatanRevisi(e.target.value)}
                  />
               </div>
               
               <p className="text-[11px] font-bold text-amber-600 bg-amber-50 p-3 rounded-xl">
                  Catatan: Menyimpan revisi akan mengembalikan status klaim ke PENDING untuk diproses ulang.
               </p>
            </div>
            <DialogFooter className="gap-2">
               <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setRevisionModal(null)}>Batal</Button>
               <Button 
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black px-6" 
                  disabled={!catatanRevisi || updateStatusMutation.isPending}
                  onClick={submitRevision}
               >
                  {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'SIMPAN REVISI'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
