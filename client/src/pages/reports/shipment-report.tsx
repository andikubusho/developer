import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGlobalPeriod } from "@/hooks/use-global-period";
import { ReportLayout } from "@/components/reports/report-layout";
import { ReportFilter } from "@/components/reports/report-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, CheckCircle2, AlertCircle, MapPin, User, Calendar, Clock, ClipboardCheck, Send, FileCheck, Hash, ExternalLink, Box, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn, safeFormat } from "@/lib/utils";
import { useBranch } from "@/hooks/use-branch";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";

export default function ShipmentReport() {
  const [filters, setFilters] = useState<any>({});
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { selectedBranchId } = useBranch();
  const { can } = usePermissions();

  const canExport = can("laporan_pengiriman", "export");
  const canPrint = can("laporan_pengiriman", "print");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/shipments", filters, selectedBranchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate.toISOString());
      if (filters.endDate) params.append("endDate", filters.endDate.toISOString());
      if (filters.customerId) params.append("customerId", filters.customerId.toString());
      if (filters.merekId) params.append("merekId", filters.merekId.toString());
      if (selectedBranchId) params.append("branchId", selectedBranchId.toString());
      
      const res = await fetch(`/api/shipments?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data");
      return res.json();
    }
  });

  const shipments = data?.shipments || [];

  const { globalMonth, globalYear, startDate: globalStartDate, endDate: globalEndDate, isCurrentMonth } = useGlobalPeriod();
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const { data: globalStatsData } = useQuery<any>({
    queryKey: ["/api/shipments/globalStats", globalStartDate, globalEndDate, selectedBranchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", globalStartDate.toISOString());
      params.append("endDate", globalEndDate.toISOString());
      if (selectedBranchId) params.append("branchId", selectedBranchId.toString());
      
      const res = await fetch(`/api/shipments?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data global stats");
      return res.json();
    }
  });

  const globalShipments = globalStatsData?.shipments || [];

  const stats = useMemo(() => {
    return {
      total: shipments.length,
      delivered: shipments.filter((s: any) => s.status === "TERKIRIM").length,
      pending: shipments.filter((s: any) => s.status === "MENUNGGU_VERIFIKASI" || s.status === "SEDANG_PACKING").length,
      ready: shipments.filter((s: any) => s.status === "SIAP_KIRIM" || s.status === "DALAM_PENGIRIMAN").length,
      menunggu: shipments.filter((s: any) => s.status === "MENUNGGU_VERIFIKASI").length,
      sedangPacking: shipments.filter((s: any) => s.status === "SEDANG_PACKING").length,
      siapKirim: shipments.filter((s: any) => s.status === "SIAP_KIRIM").length,
      prosesKirim: shipments.filter((s: any) => s.status === "DALAM_PENGIRIMAN").length,
      terkirim: globalShipments.filter((s: any) => s.status === "TERKIRIM").length,
      fakturKembali: globalShipments.filter((s: any) => s.invoiceReturned).length,
    };
  }, [shipments, globalShipments]);

  // Sort by status priority: Proses Kembali > Faktur Kembali > others
  const sortedShipments = useMemo(() => {
    return [...shipments].sort((a: any, b: any) => {
      const getPriority = (s: any) => {
        if (s.invoiceProcessed && !s.invoiceReturned) return 1;
        if (s.invoiceReturned) return 2;
        return 3;
      };
      return getPriority(a) - getPriority(b);
    });
  }, [shipments]);

  // Apply status filter
  const filteredShipments = useMemo(() => {
    if (!statusFilter) return sortedShipments;
    return sortedShipments.filter((s: any) => {
      switch (statusFilter) {
        case "MENUNGGU_PACKING": return s.status === "MENUNGGU_VERIFIKASI";
        case "SEDANG_PACKING": return s.status === "SEDANG_PACKING";
        case "SIAP_KIRIM": return s.status === "SIAP_KIRIM";
        case "PROSES_KIRIM": return s.status === "DALAM_PENGIRIMAN";
        case "TERKIRIM": return s.status === "TERKIRIM";
        case "FAKTUR_KEMBALI": return s.invoiceReturned === true;
        default: return true;
      }
    });
  }, [sortedShipments, statusFilter]);

  // Pagination
  const totalFiltered = filteredShipments.length;
  const totalPages = Math.ceil(totalFiltered / pageSize);
  const paginatedShipments = filteredShipments.slice((page - 1) * pageSize, page * pageSize);

  // Group paginated data by Customer for table display
  const groupedShipments = useMemo(() => {
    const groups: Record<string, any[]> = {};
    paginatedShipments.forEach((s: any) => {
      const name = s.customer?.name || "Tanpa Nama";
      if (!groups[name]) groups[name] = [];
      groups[name].push(s);
    });
    return groups;
  }, [paginatedShipments]);

  // Reset page when status filter changes
  const handleStatusFilter = (filter: string) => {
    if (statusFilter === filter) {
      setStatusFilter(null);
    } else {
      setStatusFilter(filter);
    }
    setPage(1);
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(shipments.map((s: any) => ({
      "No. Faktur": s.invoiceNumber,
      "Tgl Input": format(new Date(s.inputDate), "dd/MM/yyyy HH:mm"),
      "Toko": s.customer?.name || "-",
      "Merek": s.brand?.name || "-",
      "Alamat": s.destination || "-",
      "Status": s.status,
      "Ekspedisi": s.expedition?.name || "-",
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pengiriman");
    XLSX.writeFile(workbook, `laporan-pengiriman-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text("Laporan Pengiriman", 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${filters.startDate ? format(filters.startDate, "dd/MM/yyyy") : "-"} s/d ${filters.endDate ? format(filters.endDate, "dd/MM/yyyy") : "-"}`, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [["No. Faktur", "Tgl Input", "Toko", "Merek", "Status", "Ekspedisi"]],
      body: shipments.map((s: any) => [
        s.invoiceNumber,
        format(new Date(s.inputDate), "dd/MM/yy"),
        s.customer?.name || "-",
        s.brand?.name || "-",
        s.status,
        s.expedition?.name || "-",
      ]),
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
      styles: { fontSize: 8 }
    });
    doc.save(`laporan-pengiriman-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const summaryCards = [
    { label: "Total Pengiriman", value: stats.total, icon: Package, color: "bg-blue-500" },
    { label: "Selesai / Terkirim", value: stats.delivered, icon: CheckCircle2, color: "bg-emerald-500" },
    { label: "Masih Proses", value: stats.ready, icon: Truck, color: "bg-indigo-500" },
    { label: "Menunggu Verif", value: stats.pending, icon: AlertCircle, color: "bg-amber-500" },
  ];

  return (
    <ReportLayout 
      title="Laporan Pengiriman" 
      subtitle="Monitoring Data Pengiriman Gudang"
      summaryCards={summaryCards}
      onExportExcel={canExport ? handleExportExcel : undefined}
      onExportPDF={canExport ? handleExportPDF : undefined}
      onPrint={canPrint ? () => window.print() : undefined}
    >
      <div className="space-y-6">
        <ReportFilter onFilter={setFilters} showSalesman={false} />

        {!isCurrentMonth && (
          <div className={cn(
            "px-4 py-3 rounded-2xl border flex items-center justify-center text-xs sm:text-sm font-bold tracking-wide shadow-md w-full transition-all duration-500",
            "bg-amber-500/80 text-white border-amber-400 backdrop-blur-xl animate-pulse ring-2 ring-amber-400/50"
          )}>
            <Calendar className="w-4 h-4 mr-2 text-white" />
            Anda sedang melihat data historis: {months[globalMonth]} {globalYear}
          </div>
        )}

        {/* Status Operasional Grid — Clickable Badges */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
           <div
             onClick={() => handleStatusFilter("MENUNGGU_PACKING")}
             className={cn(
               "bg-white p-3 md:p-5 rounded-[1.25rem] md:rounded-[2rem] border shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
               statusFilter === "MENUNGGU_PACKING" ? "border-amber-400 ring-2 ring-amber-200 shadow-amber-100" : "border-slate-100 hover:border-amber-200"
             )}
           >
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 underline decoration-slate-200 underline-offset-4 uppercase tracking-[0.1em] mb-3">Menunggu Packing</p>
              <p className="text-xl md:text-4xl font-black text-amber-600 tracking-tighter">{stats.menunggu}</p>
           </div>
           <div
             onClick={() => handleStatusFilter("SEDANG_PACKING")}
             className={cn(
               "bg-white p-3 md:p-5 rounded-[1.25rem] md:rounded-[2rem] border shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
               statusFilter === "SEDANG_PACKING" ? "border-blue-400 ring-2 ring-blue-200 shadow-blue-100" : "border-slate-100 hover:border-blue-200"
             )}
           >
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 underline decoration-slate-200 underline-offset-4 uppercase tracking-[0.1em] mb-3">Sedang Packing</p>
              <p className="text-xl md:text-4xl font-black text-blue-600 tracking-tighter">{stats.sedangPacking}</p>
           </div>
           <div
             onClick={() => handleStatusFilter("SIAP_KIRIM")}
             className={cn(
               "bg-white p-3 md:p-5 rounded-[1.25rem] md:rounded-[2rem] border shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
               statusFilter === "SIAP_KIRIM" ? "border-indigo-400 ring-2 ring-indigo-200 shadow-indigo-100" : "border-slate-100 hover:border-indigo-200"
             )}
           >
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 underline decoration-slate-200 underline-offset-4 uppercase tracking-[0.1em] mb-3">Siap Kirim</p>
              <p className="text-xl md:text-4xl font-black text-indigo-600 tracking-tighter">{stats.siapKirim}</p>
           </div>
           <div
             onClick={() => handleStatusFilter("PROSES_KIRIM")}
             className={cn(
               "bg-white p-3 md:p-5 rounded-[1.25rem] md:rounded-[2rem] border shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
               statusFilter === "PROSES_KIRIM" ? "border-blue-400 ring-2 ring-blue-200 shadow-blue-100" : "border-slate-100 hover:border-blue-100"
             )}
           >
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 underline decoration-slate-200 underline-offset-4 uppercase tracking-[0.1em] mb-3">Proses Kirim</p>
              <p className="text-xl md:text-4xl font-black text-blue-500 tracking-tighter">{stats.prosesKirim}</p>
           </div>
           <div
             onClick={() => handleStatusFilter("TERKIRIM")}
             className={cn(
               "bg-white p-3 md:p-5 rounded-[1.25rem] md:rounded-[2rem] border shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
               statusFilter === "TERKIRIM" ? "border-emerald-400 ring-2 ring-emerald-200 shadow-emerald-100" : "border-slate-100 hover:border-emerald-200"
             )}
           >
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 underline decoration-slate-200 underline-offset-4 uppercase tracking-[0.1em] mb-3">Terkirim Selesai</p>
              <p className="text-xl md:text-4xl font-black text-emerald-600 tracking-tighter">{stats.terkirim}</p>
           </div>
           <div
             onClick={() => handleStatusFilter("FAKTUR_KEMBALI")}
             className={cn(
               "bg-white p-3 md:p-5 rounded-[1.25rem] md:rounded-[2rem] border shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
               statusFilter === "FAKTUR_KEMBALI" ? "border-slate-400 ring-2 ring-slate-300 shadow-slate-100" : "border-slate-100 hover:border-slate-300"
             )}
           >
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 underline decoration-slate-200 underline-offset-4 uppercase tracking-[0.1em] mb-3">Faktur Kembali</p>
              <p className="text-xl md:text-4xl font-black text-slate-800 tracking-tighter">{stats.fakturKembali}</p>
           </div>
        </div>

        {/* Active filter indicator */}
        {statusFilter && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Filter aktif:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
              {statusFilter === "MENUNGGU_PACKING" && "Menunggu Packing"}
              {statusFilter === "SEDANG_PACKING" && "Sedang Packing"}
              {statusFilter === "SIAP_KIRIM" && "Siap Kirim"}
              {statusFilter === "PROSES_KIRIM" && "Proses Kirim"}
              {statusFilter === "TERKIRIM" && "Terkirim Selesai"}
              {statusFilter === "FAKTUR_KEMBALI" && "Faktur Kembali"}
              <span className="ml-1 text-primary/60">({totalFiltered})</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStatusFilter(null); setPage(1); }}
              className="h-7 px-2 text-xs font-bold text-slate-400 hover:text-red-500 rounded-full"
            >
              <X className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>
        )}

        {/* Desktop View Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto no-horizontal-scroll">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-slate-500 text-[10px] md:text-xs">No</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[120px] text-[10px] md:text-xs">No. Faktur</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[100px] text-[10px] md:text-xs">Tgl Input</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[150px] text-[10px] md:text-xs">Toko</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[100px] text-[10px] md:text-xs">Merek</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[180px] text-[10px] md:text-xs">Tujuan</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[110px] text-[10px] md:text-xs">Status</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[110px] text-[10px] md:text-xs">Ekspedisi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400">Loading data...</TableCell>
                    </TableRow>
                  ) : Object.keys(groupedShipments).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400">Tidak ada data ditemukan</TableCell>
                    </TableRow>
                  ) : Object.entries(groupedShipments).map(([customerName, items], gIdx) => (
                    <React.Fragment key={`group-f-${gIdx}-${customerName}`}>
                      <TableRow key={`header-${gIdx}`} className="bg-slate-50/40">
                        <TableCell colSpan={7} className="py-2.5 px-4 border-l-4 border-blue-400/40">
                           <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary opacity-60" />
                              <span className="font-black text-slate-700 uppercase tracking-wider text-xs">{customerName}</span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100/80 px-2.5 py-1 rounded-full ml-auto">{items.length} Transaksi</span>
                           </div>
                        </TableCell>
                      </TableRow>
                      {items.map((s, idx) => (
                        <TableRow key={`row-${s.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="text-center text-slate-300 font-medium text-xs">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-slate-800 text-xs">{s.invoiceNumber}</TableCell>
                          <TableCell className="text-slate-500 text-xs">
                             <div className="flex flex-col gap-0.5">
                                <span className="font-black text-slate-600 underline decoration-slate-200 underline-offset-2">{safeFormat(s.inputDate, "dd MMM yyyy")}</span>
                                <span className="text-[9px] opacity-70 font-bold uppercase">{safeFormat(s.inputDate, "HH:mm")} WITA</span>
                             </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-600 text-xs">{s.customer?.name || "-"}</TableCell>
                          <TableCell>
                            {s.brand ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tighter">
                                {s.brand.name}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[9px] font-bold">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-400 italic max-w-[200px] truncate text-xs">{s.destination || "-"}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border",
                              s.status === "TERKIRIM" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              s.status === "MENUNGGU_VERIFIKASI" ? "bg-amber-50 text-amber-600 border-amber-100" :
                              "bg-blue-50 text-blue-600 border-blue-100"
                            )}>
                              {s.status.replace(/_/g, " ")}
                            </span>
                          </TableCell>
                          <TableCell className="font-black text-primary italic text-[10px]">{s.expedition?.name || "-"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t border-slate-100 bg-slate-50/10" key={`footer-${gIdx}`}>
                        <TableCell colSpan={6} className="text-right font-black text-slate-500 uppercase text-[9px] tracking-widest pl-4 pr-4">Subtotal {customerName}</TableCell>
                        <TableCell className="font-black text-slate-800 tracking-tighter text-xs">{items.length} FAKTUR</TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                  {totalFiltered > 0 && (
                    <TableRow className="bg-slate-100/50 border-t-2 border-slate-200">
                      <TableCell colSpan={6} className="text-right font-black uppercase text-xs tracking-[0.2em] py-5 text-slate-500">
                        {statusFilter ? "Total Filter" : "Grand Total Pengiriman"}
                      </TableCell>
                      <TableCell className="font-black text-lg py-5 text-primary tracking-tighter">{totalFiltered} FAKTUR</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4">
            <p className="text-xs text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-700">{(page - 1) * pageSize + 1}</span> - <span className="font-bold text-slate-700">{Math.min(page * pageSize, totalFiltered)}</span> dari <span className="font-bold text-slate-700">{totalFiltered}</span> data
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 px-3 rounded-xl font-bold text-xs gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <span className="text-xs font-black text-slate-500 px-3">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-9 px-3 rounded-xl font-bold text-xs gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Mobile View Cards */}
        <div className="md:hidden space-y-6 pb-10">
           {isLoading ? (
              <div className="text-center py-10 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Memuat data pengiriman...</div>
           ) : Object.keys(groupedShipments).length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold uppercase text-[10px] tracking-widest italic border-2 border-dashed rounded-3xl">Tidak ada pengiriman ditemukan</div>
           ) : (
              <>
                 {Object.entries(groupedShipments).map(([customerName, items], gIdx) => (
                    <div key={`mobile-shipment-group-${gIdx}-${customerName}`} className="space-y-4">
                       <div className="flex items-center gap-2 px-2">
                          <MapPin className="h-4 w-4 text-slate-300" />
                          <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest leading-none py-1">{customerName}</h3>
                          <div className="flex-1 h-px bg-slate-100/60" />
                          <Badge variant="outline" className="text-[8px] font-black border-slate-200 text-slate-300">{items.length} Trx</Badge>
                       </div>
                       
                       <div className="space-y-4 px-1">
                          {items.map((s, idx) => (
                             <Card key={`card-${s.id}-${idx}`} className="border-slate-100 shadow-sm rounded-2xl overflow-hidden active:scale-[0.99] transition-transform">
                                <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                   <div className="flex items-center gap-2">
                                      <Hash className="w-3 h-3 text-slate-400" />
                                      <span className="text-[10px] font-bold font-mono text-slate-500">{s.invoiceNumber}</span>
                                   </div>
                                   <Badge className={cn(
                                      "text-[8px] font-black uppercase px-2 h-4",
                                      s.status === "TERKIRIM" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                      s.status === "MENUNGGU_VERIFIKASI" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                      "bg-blue-50 text-blue-600 border-blue-100"
                                   )}>
                                      {s.status.replace(/_/g, " ")}
                                   </Badge>
                                </div>
                                <CardContent className="p-4 space-y-4">
                                   <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-3">
                                         <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                            <Calendar className="w-5 h-5" />
                                         </div>
                                         <div className="space-y-0.5">
                                            <div className="font-bold text-slate-700 text-xs">
                                               {safeFormat(s.inputDate, "dd MMM yyyy")}
                                            </div>
                                            <div className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Waktu: {safeFormat(s.inputDate, "HH:mm")}</div>
                                         </div>
                                      </div>
                                       <div className="text-right">
                                          <div className="flex items-center justify-end gap-1 text-primary font-black italic text-[11px]">
                                             <Truck className="w-3.5 h-3.5" />
                                             {s.expedition?.name || "-"}
                                          </div>
                                          {s.brand && (
                                            <div className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-1 uppercase">
                                              {s.brand.name}
                                            </div>
                                          )}
                                       </div>
                                   </div>
                                   
                                   <div className="pt-3 border-t border-slate-50 relative">
                                      <div className="flex items-start gap-2">
                                         <MapPin className="w-3.5 h-3.5 text-slate-200 shrink-0 mt-0.5" />
                                         <div className="space-y-1">
                                            <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Tujuan Pengiriman</div>
                                            <div className="text-[10px] font-medium text-slate-500 leading-relaxed italic">{s.destination || "Alamat tidak tersedia"}</div>
                                         </div>
                                      </div>
                                   </div>
                                </CardContent>
                             </Card>
                          ))}
                       </div>
                    </div>
                 ))}
                 
                 {/* Grand Total */}
                 <div className="px-1 pt-8">
                    <Card className="bg-white border-2 border-blue-100 rounded-[2rem] p-8 shadow-xl shadow-blue-50">
                       <div className="flex flex-col items-center gap-4 text-center">
                          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border-4 border-white shadow-inner">
                             <Box className="w-7 h-7" />
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">
                               {statusFilter ? "Total Filter" : "Grand Total Pengiriman"}
                             </p>
                             <div className="flex items-center justify-center gap-2">
                                <span className="text-4xl font-black text-slate-900 tracking-tighter">{totalFiltered}</span>
                                <span className="text-lg font-black text-slate-400 uppercase tracking-widest">Faktur</span>
                             </div>
                             <p className="text-[9px] text-blue-400 mt-4 font-black uppercase flex items-center justify-center gap-2">
                                <Truck className="w-3 h-3" />
                                Monitoring Pengiriman Aktif
                             </p>
                          </div>
                       </div>
                    </Card>
                 </div>
              </>
           )}
        </div>
      </div>
    </ReportLayout>
  );
}
