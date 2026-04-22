import { useState, useRef, useEffect } from "react";

import { useShipments, useUpdateShipment } from "@/hooks/use-shipments";
import { useGlobalPeriod } from "@/hooks/use-global-period";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  Download, 
  Clock, 
  PackageCheck, 
  Truck as TruckIcon, 
  FileSpreadsheet, 
  FileText, 
  Monitor, 
  ChevronDown, 
  CheckCheck, 
  MapPin, 
  Receipt, 
  Package, 
  User, 
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Printer,
  Bookmark
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
export default function Terkirim() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { startDate: globalStartDate, endDate: globalEndDate } = useGlobalPeriod();

  const { data: shipmentData, isLoading } = useShipments({
    status: "TERKIRIM",
    search: search || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    startDate: globalStartDate,
    endDate: globalEndDate
  });

  const { shipments = [], total: totalShipments = 0, totalReturned = 0, totalProcessed = 0 } = shipmentData || {};
  
  if (shipmentData) {
    console.log("[TERKIRIM] stats:", { totalShipments, totalReturned, totalProcessed });
  }

  const { can } = usePermissions();
  const [openPreview, setOpenPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const allItems = shipments;
  const shippedItems = allItems;


  const exportExcel = () => {
    const rows = shippedItems.map((s, i) => ({
      "No": i + 1,
      "Tgl Kirim": s.shippingDate ? format(new Date(s.shippingDate), "dd/MM/yyyy") : "-",
      "No Faktur": s.invoiceNumber,
      "Pelanggan": s.customer?.name || "-",
      "Merek": s.brand?.name || "-",
      "Info Kurir": s.senderName || "-",
      "Ekspedisi": s.expedition?.name || "-",
      "koli/dus": s.totalBoxes || "-",
      "No. Resi": s.receiptNumber || "-",
      "Keterangan": s.shippingNotes || "-",
      "Status": "TERKIRIM",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Faktur");
    XLSX.writeFile(wb, `riwayat-faktur-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Riwayat Faktur", 14, 16);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 23);

    autoTable(doc, {
      startY: 28,
      head: [["No", "Tgl Kirim", "No Faktur", "Pelanggan", "Merek", "Info Kurir", "Ekspedisi", "koli/dus", "No. Resi", "Keterangan", "Status"]],
      body: shippedItems.map((s, i) => [
        i + 1,
        s.shippingDate ? format(new Date(s.shippingDate), "dd/MM/yyyy") : "-",
        s.invoiceNumber,
        s.customer?.name || "-",
        s.brand?.name || "-",
        s.senderName || "-",
        s.expedition?.name || "-",
        s.totalBoxes || "-",
        s.receiptNumber || "-",
        s.shippingNotes || "-",
        "TERKIRIM",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] },
    });

    doc.save(`riwayat-faktur-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const handlePrint = () => {
    setOpenPreview(true);
  };

  const doPrint = () => {
    const printContent = printRef.current?.innerHTML;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win || !printContent) return;
    win.document.write(`
      <html>
        <head>
          <title>Riwayat Faktur</title>
          <style>
            body { font-family: sans-serif; font-size: 12px; color: #111; }
            h2 { margin-bottom: 4px; }
            p { margin: 0 0 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #16a34a; color: #fff; padding: 6px 10px; text-align: left; font-size: 11px; }
            td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
            tr:nth-child(even) td { background: #f9fafb; }
            .badge { display:inline-block; padding: 2px 8px; border-radius: 999px; background: #dcfce7; color: #15803d; font-size: 10px; font-weight: bold; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-6">
      <div className="relative mb-8 -mt-2">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl blur-xl opacity-20 animate-pulse" />
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/20">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner group transition-transform hover:scale-105">
                <TruckIcon className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-in zoom-in duration-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Riwayat Faktur</h1>
                  <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">
                    Logistics
                  </div>
                </div>
                <p className="text-emerald-50/80 text-sm sm:text-base font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-ping" />
                  Riwayat data pengiriman dan pengembalian faktur
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
              {(can("terkirim", "export") || can("terkirim", "print")) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md h-12 px-6 rounded-2xl font-bold gap-2 shadow-lg flex-1 md:flex-none">
                      <Download className="w-4 h-4" /> Export
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-slate-200 shadow-2xl">
                    {can("terkirim", "print") && (
                      <DropdownMenuItem onClick={handlePrint} className="gap-3 p-3 rounded-xl cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Monitor className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">Print Layar</span>
                          <span className="text-[10px] text-slate-500 italic">Pratinjau sebelum cetak</span>
                        </div>
                      </DropdownMenuItem>
                    )}
                    {can("terkirim", "export") && (
                      <>
                        <DropdownMenuItem onClick={exportExcel} className="gap-3 p-3 rounded-xl cursor-pointer">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">Excel Spreadsheet</span>
                            <span className="text-[10px] text-slate-500">Format .xlsx</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportPDF} className="gap-3 p-3 rounded-xl cursor-pointer">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">Dokumen PDF</span>
                            <span className="text-[10px] text-slate-500">Format .pdf</span>
                          </div>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistik Faktur */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-blue-200 transition-colors flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Faktur</p>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{totalShipments}</h2>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-emerald-200 transition-colors flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Sudah Kembali</p>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{totalReturned}</h2>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-rose-200 transition-colors flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Belum Kembali</p>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{totalProcessed}</h2>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="mb-8 relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
        </div>
        <Input 
          placeholder="Cari nomor faktur, nama pelanggan, atau kurir..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-14 pl-12 bg-white border-slate-200 rounded-2xl shadow-sm focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700"
        />
        {totalShipments > 0 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-tighter">
            {totalShipments} data terkirim
          </div>
        )}
      </div>

      {/* Mobile View: Card Layout */}
      <div className="grid grid-cols-1 gap-6 md:hidden mb-12">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[2rem]" />
          ))
        ) : allItems.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-200 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Belum ada riwayat pengiriman</p>
          </div>
        ) : (
          allItems.map((shipment) => (
            <div key={shipment.id} className="group relative bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden transition-all hover:border-emerald-200 active:scale-[0.98]">
               {/* Top Badge Overlay */}
               <div className="absolute top-0 right-0 p-4">
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-1.5">
                    <CheckCheck className="w-3 h-3" />
                    Terkirim
                  </div>
               </div>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 leading-tight">{shipment.invoiceNumber}</h3>
                    <div className="flex items-center gap-2 mt-1">
                    </div>
                    {shipment.brand && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-50">
                        <Bookmark className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                          {shipment.brand.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                    <div className="flex items-center gap-2 mb-2">
                       <User className="w-3.5 h-3.5 text-slate-400" />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-snug">{shipment.customer?.name}</p>
                    <div className="flex items-start gap-1.5 mt-2">
                      <MapPin className="w-3 h-3 text-slate-300 mt-1 shrink-0" />
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{shipment.destination}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                       <div className="flex items-center gap-2 mb-2">
                         <TruckIcon className="w-3.5 h-3.5 text-slate-400" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ekspedisi</span>
                       </div>
                       <p className="text-xs font-black text-slate-800 truncate">{shipment.expedition?.name || "-"}</p>
                       <p className="text-[10px] font-mono font-bold text-emerald-600 mt-1 truncate">{shipment.receiptNumber || "Tanpa Resi"}</p>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                       <div className="flex items-center gap-2 mb-2">
                         <Package className="w-3.5 h-3.5 text-slate-400" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muatan</span>
                       </div>
                       <p className="text-xs font-black text-slate-800">{shipment.totalBoxes || 0} <span className="text-[9px] font-normal text-slate-500 uppercase">Koli</span></p>
                       <p className="text-[10px] font-bold text-slate-400 mt-1 truncate italic">{shipment.senderName || "No Driver"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2 pt-5 border-t border-slate-50">
                   {can("terkirim", "edit") && !shipment.invoiceProcessed && <ProsesFakturButton shipment={shipment} />}
                   {can("terkirim", "edit") && !shipment.invoiceProcessed && <FailDialog id={shipment.id} invoice={shipment.invoiceNumber} />}
                   {shipment.invoiceReturned ? (
                    <div className="w-full flex items-center justify-center p-3 rounded-2xl bg-teal-50/50 border border-teal-100/50 text-teal-700 text-xs font-black uppercase tracking-widest gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Faktur Kembali {shipment.returnedDate && `(${format(new Date(shipment.returnedDate), "dd/MM/yy")})`}
                    </div>
                   ) : shipment.invoiceProcessed ? (
                    <div className="w-full flex items-center justify-center p-3 rounded-2xl bg-blue-50/50 border border-blue-100/50 text-blue-700 text-xs font-black uppercase tracking-widest gap-2">
                      <Clock className="w-4 h-4" /> Proses Kembali
                    </div>
                   ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-12">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="w-16 text-center font-bold text-slate-400 text-[10px] uppercase tracking-widest pl-6">No</TableHead>
              <TableHead className="font-bold text-slate-800 py-5">Faktur & Tanggal</TableHead>
              <TableHead className="font-bold text-slate-800">Merek</TableHead>
              <TableHead className="font-bold text-slate-800">Pelanggan</TableHead>
              <TableHead className="font-bold text-slate-800">Ekspedisi & Resi</TableHead>
              <TableHead className="font-bold text-slate-800">Kurir & Muatan</TableHead>
              <TableHead className="text-right font-bold text-slate-800 pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="py-8"><div className="h-10 bg-slate-100 animate-pulse rounded-xl w-full" /></TableCell>
                </TableRow>
              ))
            ) : allItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center text-slate-400 font-medium italic">Belum ada riwayat pengiriman</TableCell>
              </TableRow>
            ) : (
              allItems.map((shipment: any, idx: number) => (
                <TableRow key={shipment.id} className="hover:bg-slate-50/50 transition-colors border-slate-100/50 group">
                  <TableCell className="text-center pl-6 font-mono text-[10px] font-black text-slate-400">
                    {(page - 1) * pageSize + idx + 1}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors uppercaseTracking-tight">
                          {shipment.invoiceNumber}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-3">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(shipment.inputDate), "dd/MM/yy")}</span>
                          {shipment.shippingDate && <span className="flex items-center gap-1 text-emerald-600/70"><TruckIcon className="w-2.5 h-2.5" /> {format(new Date(shipment.shippingDate), "HH:mm")}</span>}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {shipment.brand ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tighter">
                        {shipment.brand.name}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-[9px] font-bold">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[180px]">
                      <div className="font-bold text-slate-800 text-sm line-clamp-1">{shipment.customer?.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-start gap-1">
                        <MapPin className="w-3 h-3 shrink-0 m-0.5" />
                        <span className="line-clamp-1">{shipment.destination}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-black text-slate-800 text-xs">
                        {shipment.expedition?.name || "-"}
                      </div>
                      <div className="font-mono text-[10px] font-black text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 bg-emerald-50/30 w-fit">
                        {shipment.receiptNumber || "TANPA RESI"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-tighter">
                        <User className="h-3 h-3 text-blue-500" />
                        {shipment.senderName || "-"}
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-400">
                        <Package className="w-3 h-3" />
                        {shipment.totalBoxes || 0} <span className="text-[9px] font-normal uppercase tracking-widest">Koli</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex flex-col items-end gap-2">
                       {shipment.invoiceReturned ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 text-[11px] font-black uppercase tracking-widest">
                          <CheckCircle2 className="w-4 h-4" /> Faktur Kembali {shipment.returnedDate && `(${format(new Date(shipment.returnedDate), "dd/MM")})`}
                        </div>
                       ) : shipment.invoiceProcessed ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-black uppercase tracking-widest">
                          <Clock className="w-4 h-4" /> Proses Kembali
                        </div>
                       ) : (
                        <div className="flex gap-2">
                          {can("terkirim", "edit") && <ProsesFakturButton shipment={shipment} />}
                          {can("terkirim", "edit") && <FailDialog id={shipment.id} invoice={shipment.invoiceNumber} />}
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

      {/* Pagination Controls */}
      {totalShipments > pageSize && (
        <div className="flex items-center justify-between gap-4 py-8 mb-12">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="rounded-xl h-12 flex-1 font-bold border border-slate-200 bg-white shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Prev
            </Button>
            <div className="text-[10px] font-black text-slate-500 bg-white px-6 h-12 flex items-center rounded-xl border border-slate-200 uppercase tracking-widest">
              Hal {page} / {Math.ceil(totalShipments / pageSize)}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setPage(p => Math.min(Math.ceil(totalShipments / pageSize), p + 1))}
              disabled={page >= Math.ceil(totalShipments / pageSize)}
              className="rounded-xl h-12 flex-1 font-bold border border-slate-200 bg-white shadow-sm"
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
        </div>
      )}

      <Dialog open={openPreview} onOpenChange={setOpenPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto p-0 border-none rounded-3xl shadow-2xl">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-md text-white">
                <Monitor className="w-6 h-6" />
              </div>
              Preview Riwayat Faktur
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium ml-15">
              Pratinjau laporan sebelum dicetak dalam format landscape.
            </DialogDescription>
          </DialogHeader>
          <div ref={printRef} className="p-4">
            <h2 className="text-xl font-bold mb-1">Riwayat Faktur</h2>
            <p className="text-sm text-muted-foreground mb-4">Dicetak: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-green-600 text-white">
                  <th className="px-3 py-2 text-left">No</th>
                  <th className="px-3 py-2 text-left">Tgl Kirim</th>
                  <th className="px-3 py-2 text-left">No Faktur</th>
                  <th className="px-3 py-2 text-left">Pelanggan</th>
                  <th className="px-3 py-2 text-left">Info Kurir</th>
                  <th className="px-3 py-2 text-left">Ekspedisi</th>
                  <th className="px-3 py-2 text-center">koli/dus</th>
                  <th className="px-3 py-2 text-left">No. Resi</th>
                  <th className="px-3 py-2 text-left">Keterangan</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {shippedItems.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{s.shippingDate ? format(new Date(s.shippingDate), "dd/MM/yyyy") : "-"}</td>
                    <td className="px-3 py-2 font-medium">{s.invoiceNumber}</td>
                    <td className="px-3 py-2">{s.customer?.name || "-"}</td>
                    <td className="px-3 py-2">{s.senderName || "-"}</td>
                    <td className="px-3 py-2">{s.expedition?.name || "-"}</td>
                    <td className="px-3 py-2 text-center font-bold">{s.totalBoxes || "-"}</td>
                    <td className="px-3 py-2">{s.receiptNumber || "-"}</td>
                    <td className="px-3 py-2 italic">{s.shippingNotes || "-"}</td>
                    <td className="px-3 py-2">
                      <span className="badge">TERKIRIM</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="p-8 bg-slate-50 gap-3 border-t border-slate-100 mt-8">
            <Button variant="ghost" onClick={() => setOpenPreview(false)} className="rounded-xl font-bold">Tutup</Button>
            <Button onClick={doPrint} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black px-10 shadow-lg h-12">
              <Printer className="w-4 h-4 mr-2" /> Cetak ke Printer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function FailDialog({ id, invoice }: { id: number, invoice: string }) {
  const [open, setOpen] = useState(false);
  const updateMut = useUpdateShipment();

  const handleFail = () => {
    updateMut.mutate({
      id,
      status: "SIAP_KIRIM",
      invoiceProcessed: false,
    }, {
      onSuccess: () => setOpen(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl text-rose-600 border-rose-100 hover:bg-rose-50 hover:text-rose-700 transition-all font-bold gap-2 bg-white shadow-sm">
          <XCircle className="w-4 h-4" /> Gagal Kirim
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-rose-600 text-white">
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-md">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            Gagal Kirim
          </DialogTitle>
        </DialogHeader>
        <div className="p-8 pb-4">
          <p className="font-medium text-slate-700 leading-relaxed">
            Apakah Anda yakin ingin menandai faktur <span className="font-black text-slate-900">"{invoice}"</span> sebagai <span className="text-rose-600 font-bold uppercase underline underline-offset-4 Decoration-2">gagal kirim</span>?
          </p>
          <div className="mt-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-3">
            <Clock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-rose-700 font-medium leading-relaxed">
              Status pengiriman akan dikembalikan menjadi <strong>"Jadwal Pengiriman"</strong> sehingga dapat dijadwalkan ulang oleh admin gudang.
            </p>
          </div>
        </div>
        <DialogFooter className="p-8 pt-4 bg-white flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold border-none h-12 flex-1">Batal</Button>
          <Button type="button" className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black h-12 flex-1 shadow-lg shadow-rose-200" onClick={handleFail} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Memproses..." : "Ya, Tandai Gagal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProsesFakturButton({ shipment }: { shipment: any }) {
  const [open, setOpen] = useState(false);
  const updateMut = useUpdateShipment();

  const handleProses = () => {
    updateMut.mutate({
      id: shipment.id,
      invoiceProcessed: true,
    }, {
      onSuccess: () => setOpen(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-200 gap-2">
          <FileCheck className="w-4 h-4 text-blue-200" /> Proses Faktur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-blue-600 text-white">
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-md">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            Proses Kembali
          </DialogTitle>
        </DialogHeader>
        <div className="p-8 pb-4">
          <p className="font-medium text-slate-700 leading-relaxed">
            Apakah Anda ingin memproses faktur <span className="font-black text-slate-900">"{shipment.invoiceNumber}"</span> ke tahap pemantauan fisik?
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
            <TruckIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
              Data akan dikirim ke menu <strong>Pengembalian Faktur</strong> untuk pemantauan faktur fisik yang sudah kembali ke gudang.
            </p>
          </div>
        </div>
        <DialogFooter className="p-8 pt-4 bg-white flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold border-none h-12 flex-1">Batal</Button>
          <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black h-12 flex-1 shadow-lg shadow-blue-200" onClick={handleProses} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Memproses..." : "Ya, Proses Kembali"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
