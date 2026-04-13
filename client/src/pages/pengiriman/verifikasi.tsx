import { useState, useRef } from "react";

import { useShipments, useUpdateShipment, useCancelPacking } from "@/hooks/use-shipments";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { 
  ClipboardCheck, 
  Clock, 
  PackageCheck, 
  Truck, 
  CalendarIcon, 
  User, 
  RotateCcw, 
  MapPin, 
  Receipt, 
  Package, 
  Download, 
  ChevronDown, 
  Monitor, 
  FileSpreadsheet, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Printer
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { cn, safeFormat } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Bookmark } from "lucide-react";

import { type ShipmentWithRelations } from "@shared/schema";

export default function VerifikasiGudang() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: { shipments = [], total: totalShipments = 0 } = {}, isLoading } = useShipments({
    status: "MENUNGGU_VERIFIKASI",
    limit: pageSize,
    offset: (page - 1) * pageSize
  });
  const { can } = usePermissions();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const updateMut = useUpdateShipment();
  const [openPreview, setOpenPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const pendingShipments = shipments
    .filter(s => s.status === "MENUNGGU_VERIFIKASI")
    .sort((a, b) => {
      // Prioritize "MENUNGGU PACKING" (no verificationDate) over "SEDANG DIPACKING"
      const scoreA = a.verificationDate ? 2 : 1;
      const scoreB = b.verificationDate ? 2 : 1;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return new Date(b.inputDate).getTime() - new Date(a.inputDate).getTime();
    });

  const handleExportExcel = () => {
    const dataToExport = pendingShipments.map((s, index) => ({
      "No": index + 1,
      "Tgl Input": safeFormat(s.inputDate, "dd MMM yyyy HH:mm"),
      "No Faktur": s.invoiceNumber,
      "Pelanggan": s.customer?.name || "-",
      "Merek": s.brand?.name || "-",
      "Tujuan": s.destination,
      "Ekspedisi": s.expedition?.name || "-",
      "Resi": s.receiptNumber || "-",
      "Total Nota": s.totalNotes,
      "Total Box": s.totalBoxes || "-",
      "Status": s.verificationDate ? "SEDANG DIPACKING" : "MENUNGGU PACKING"
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Packing");
    XLSX.writeFile(wb, `laporan-packing-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Laporan Data Packing", 14, 16);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 23);
    
    const tableData = pendingShipments.map((s, index) => [
      index + 1,
      safeFormat(s.inputDate, "dd/MM/yyyy HH:mm"),
      s.invoiceNumber,
      s.customer?.name || "-",
      s.brand?.name || "-",
      s.destination,
      s.expedition?.name || "-",
      s.receiptNumber || "-",
      `${s.totalNotes} Nota`,
      s.verificationDate ? "Sedang Dipacking" : "Menunggu Packing"
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["No", "Tgl Input", "Faktur", "Pelanggan", "Merek", "Tujuan", "Ekspedisi", "Resi", "Muatan", "Status"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [243, 156, 18], textColor: [255, 255, 255] }
    });
    
    doc.save(`laporan-packing-${format(new Date(), "yyyyMMdd")}.pdf`);
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
          <title>Laporan Data Packing</title>
          <style>
            body { font-family: sans-serif; font-size: 12px; color: #111; }
            h2 { margin-bottom: 4px; }
            p { margin: 0 0 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f39c12; color: #fff; padding: 6px 10px; text-align: left; font-size: 11px; }
            td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
            tr:nth-child(even) td { background: #f9fafb; }
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
    <>
      <div className="relative mb-8 -mt-2">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl blur-xl opacity-20 animate-pulse" />
        <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/20">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner group transition-transform hover:scale-105">
                <PackageCheck className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-in zoom-in duration-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Packing Gudang</h1>
                  <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">
                    Logistics
                  </div>
                </div>
                <p className="text-orange-50/80 text-sm sm:text-base font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-200 animate-ping" />
                  Verifikasi barang & persiapan pengiriman
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
              {(isAdmin || can("packing", "export") || can("packing", "print")) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md h-12 px-6 rounded-2xl font-bold gap-2 shadow-lg flex-1 md:flex-none">
                      <Download className="w-4 h-4" /> Export
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-slate-200 shadow-2xl">
                    {(isAdmin || can("packing", "print")) && (
                      <DropdownMenuItem onClick={handlePrint} className="gap-3 p-3 rounded-xl cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Monitor className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">Print Layar</span>
                          <span className="text-[10px] text-slate-500 italic">Pratinjau laporan</span>
                        </div>
                      </DropdownMenuItem>
                    )}
                    {(isAdmin || can("packing", "export")) && (
                      <>
                        <DropdownMenuItem onClick={handleExportExcel} className="gap-3 p-3 rounded-xl cursor-pointer">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">Excel Spreadsheet</span>
                            <span className="text-[10px] text-slate-500">Format .xlsx</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF} className="gap-3 p-3 rounded-xl cursor-pointer">
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

      {/* Mobile View: Card Layout */}
      <div className="grid grid-cols-1 gap-6 md:hidden mb-12">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[2rem]" />
          ))
        ) : pendingShipments.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-200 text-center">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Tidak ada barang dalam antrean packing</p>
          </div>
        ) : (
          pendingShipments.map((shipment) => (
            <div key={shipment.id} className={cn(
              "group relative bg-white rounded-[2rem] border shadow-xl shadow-slate-200/50 overflow-hidden transition-all active:scale-[0.98]",
              shipment.verificationDate ? "border-amber-200" : "border-slate-100"
            )}>
               {/* Status Badge Overlay */}
               <div className="absolute top-0 right-0 p-4">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-1.5 border",
                    shipment.verificationDate ? "bg-amber-50 text-orange-600 border-amber-100" : "bg-slate-50 text-slate-500 border-slate-100"
                  )}>
                    {shipment.verificationDate ? (
                      <>
                        <Clock className="w-3 h-3 animate-spin-slow" />
                        Sedang Dipacking
                      </>
                    ) : "Menunggu Antrean"}
                  </div>
               </div>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-colors",
                    shipment.verificationDate ? "bg-amber-50 text-orange-600 border-amber-100" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 leading-tight">{shipment.invoiceNumber}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{safeFormat(shipment.inputDate)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                    <div className="flex items-center gap-2 mb-2">
                       <User className="w-3.5 h-3.5 text-slate-400" />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pelanggan</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-snug">{shipment.customer?.name}</p>
                    <div className="flex items-start gap-1.5 mt-2">
                      <MapPin className="w-3 h-3 text-slate-300 mt-1 shrink-0" />
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{shipment.destination}</p>
                    </div>
                    {shipment.brand && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                        <Bookmark className="w-3 h-3 text-slate-300" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{shipment.brand.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ekspedisi</span>
                       <p className="text-xs font-black text-slate-800 truncate">{shipment.expedition?.name || "-"}</p>
                       <p className="text-[10px] font-mono font-bold text-orange-600 mt-1 truncate">{shipment.receiptNumber || "Tanpa Resi"}</p>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Muatan</span>
                       <div className="flex flex-col gap-1">
                          <span className="text-xs font-black text-slate-800">{shipment.totalNotes} <span className="font-normal text-slate-500 text-[9px]">Nota</span></span>
                          {shipment.totalBoxes && <span className="text-xs font-black text-slate-800">{shipment.totalBoxes} <span className="font-normal text-slate-500 text-[9px]">Box</span></span>}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-50">
                  {!shipment.verificationDate ? (
                    can("packing", "edit") && <TerimaFakturButton shipment={shipment} />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-amber-50/50 rounded-xl px-4 py-2 border border-amber-100/50">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-[11px] font-black text-orange-700 truncate max-w-[120px]">{shipment.packerName}</span>
                        </div>
                        {can("packing", "edit") && <CancelPackingButton shipment={shipment} />}
                      </div>
                      {can("packing", "edit") && <SelesaiPackingButton shipment={shipment} />}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View: Table Layout */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-12">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="w-16 text-center font-bold text-slate-400 text-[10px] uppercase tracking-widest pl-6">No</TableHead>
              <TableHead className="font-bold text-slate-800 py-5">Faktur</TableHead>
              <TableHead className="font-bold text-slate-800">Merek</TableHead>
              <TableHead className="font-bold text-slate-800">Pelanggan</TableHead>
              <TableHead className="font-bold text-slate-800">Ekspedisi & Resi</TableHead>
              <TableHead className="font-bold text-slate-800">Detail Muatan</TableHead>
              <TableHead className="font-bold text-slate-800">Status</TableHead>
              <TableHead className="text-right font-bold text-slate-800 pr-6">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7} className="py-8"><div className="h-10 bg-slate-100 animate-pulse rounded-xl w-full" /></TableCell>
                </TableRow>
              ))
            ) : pendingShipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-20 text-center text-slate-400 font-medium italic">Tidak ada barang dalam antrean packing</TableCell>
              </TableRow>
            ) : (
              pendingShipments.map((shipment: any, idx: number) => (
                <TableRow key={shipment.id} className="hover:bg-slate-50/50 transition-colors border-slate-100/50 group">
                  <TableCell className="text-center pl-6 font-mono text-[10px] font-black text-slate-400">
                    {(page - 1) * pageSize + idx + 1}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner transition-colors",
                        shipment.verificationDate ? "bg-amber-50 text-orange-600 border-amber-100" : "bg-slate-100 text-slate-400 border-white shadow-sm"
                      )}>
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 leading-tight group-hover:text-amber-600 transition-colors uppercase tracking-tight">
                          {shipment.invoiceNumber}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                           <Clock className="w-3 h-3" />
                           {safeFormat(shipment.inputDate)}
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
                    <div className="max-w-[150px]">
                      <div className="font-bold text-slate-800 text-sm line-clamp-1">{shipment.customer?.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">{shipment.destination}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-black text-slate-800 text-xs truncate max-w-[120px]">
                        {shipment.expedition?.name || "-"}
                      </div>
                      <div className="font-mono text-[10px] font-black text-orange-600 px-1.5 py-0.5 rounded border border-orange-100 bg-orange-50/30 w-fit">
                        {shipment.receiptNumber || "TANPA RESI"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-[11px] font-black">
                      <div className="flex items-center gap-1.5 text-slate-700 uppercase tracking-tighter">
                        <FileText className="h-3 w-3 text-slate-300" />
                        {shipment.totalNotes} <span className="font-normal text-slate-400 uppercase text-[9px]">Nota</span>
                      </div>
                      {shipment.totalBoxes && (
                        <div className="flex items-center gap-1.5 text-slate-700 uppercase tracking-tighter">
                          <Package className="h-3 w-3 text-slate-300" />
                          {shipment.totalBoxes} <span className="font-normal text-slate-400 uppercase text-[9px]">Koli</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                       <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] w-fit font-black uppercase tracking-widest border",
                        shipment.verificationDate ? "bg-amber-50 text-orange-600 border-amber-100 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-100"
                       )}>
                        {shipment.verificationDate ? "Packing" : "Antrean"}
                       </span>
                       {shipment.packerName && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                           <User className="w-3 h-3 text-orange-400" />
                           {shipment.packerName}
                        </div>
                       )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex gap-2 justify-end">
                      {!shipment.verificationDate ? (
                        can("packing", "edit") && <TerimaFakturButton shipment={shipment} />
                      ) : (
                        <div className="flex items-center gap-2">
                          {can("packing", "edit") && <CancelPackingButton shipment={shipment} />}
                          {can("packing", "edit") && <SelesaiPackingButton shipment={shipment} />}
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
              Preview Cetak Laporan
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium ml-15">
              Pratinjau laporan operasional packing gudang.
            </DialogDescription>
          </DialogHeader>
          <div ref={printRef} className="p-4">
            <h2 className="text-xl font-bold mb-1">Laporan Data Packing</h2>
            <p className="text-sm text-muted-foreground mb-4">Dicetak: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f39c12] text-white">
                  <th className="px-3 py-2 text-left">No</th>
                  <th className="px-3 py-2 text-left">Tgl Input</th>
                  <th className="px-3 py-2 text-left">Faktur</th>
                  <th className="px-3 py-2 text-left">Pelanggan</th>
                  <th className="px-3 py-2 text-left">Tujuan</th>
                  <th className="px-3 py-2 text-left">Ekspedisi</th>
                  <th className="px-3 py-2 text-left">Resi</th>
                  <th className="px-3 py-2 text-left">Muatan</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingShipments.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{safeFormat(s.inputDate, "dd/MM/yyyy HH:mm")}</td>
                    <td className="px-3 py-2 font-medium">{s.invoiceNumber}</td>
                    <td className="px-3 py-2">{s.customer?.name || "-"}</td>
                    <td className="px-3 py-2">{s.destination}</td>
                    <td className="px-3 py-2">{s.expedition?.name || "-"}</td>
                    <td className="px-3 py-2">{s.receiptNumber || "-"}</td>
                    <td className="px-3 py-2">{s.totalNotes} Nota</td>
                    <td className="px-3 py-2">
                      {s.verificationDate ? "Sedang Dipacking" : "Menunggu Packing"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="p-8 bg-slate-50 gap-3 border-t border-slate-100 mt-8">
            <Button variant="ghost" onClick={() => setOpenPreview(false)} className="rounded-xl font-bold">Tutup</Button>
            <Button onClick={doPrint} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black px-10 shadow-lg h-12">
              <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TerimaFakturButton({ shipment }: { shipment: ShipmentWithRelations }) {
  const [open, setOpen] = useState(false);
  const [packerName, setPackerName] = useState("");
  const [packingDate, setPackingDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const updateMut = useUpdateShipment();

  const resetForm = () => {
    setPackerName("");
    setPackingDate(new Date());
  };

  const handleTerima = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packerName) return;

    updateMut.mutate({
      id: shipment.id,
      verificationDate: packingDate,
      packerName,
    }, {
      onSuccess: () => {
        setOpen(false);
        resetForm();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (val) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-10 px-4 rounded-xl border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-bold gap-2 shadow-sm transition-all"
        >
          <ClipboardCheck className="w-4 h-4" />
          Masuk Packing
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-md">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            Verifikasi Packing
          </DialogTitle>
          <DialogDescription className="text-orange-50/80 font-medium ml-13">
            Faktur <strong>{shipment.invoiceNumber}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6 bg-white">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-widest">Pelanggan</span>
              <span className="font-black text-slate-900">{shipment.customer?.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-widest">Tujuan</span>
              <span className="font-black text-slate-900">{shipment.destination}</span>
            </div>
          </div>

          <form onSubmit={handleTerima} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="packer-name" className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Nama Petugas Packing</Label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                <Input
                  id="packer-name"
                  required
                  value={packerName}
                  onChange={(e) => setPackerName(e.target.value)}
                  className="h-12 pl-11 rounded-xl border-slate-200 bg-slate-50/30 focus-visible:ring-orange-500/20 focus-visible:border-orange-500 transition-all font-bold"
                  placeholder="Siapa yang packing?"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Tanggal Packing</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-12 w-full justify-start text-left font-bold rounded-xl border-slate-200 bg-slate-50/30 hover:bg-slate-50"
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 text-orange-500" />
                    {format(packingDate, "dd MMMM yyyy", { locale: idLocale })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={packingDate}
                    onSelect={(d) => { if (d) { setPackingDate(d); setCalendarOpen(false); } }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={updateMut.isPending || !packerName}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black h-12 shadow-lg shadow-orange-200"
              >
                {updateMut.isPending ? "Memproses..." : "Konfirmasi Masuk Packing"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="w-full mt-2 font-bold text-slate-400">Tutup</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CancelPackingButton({ shipment }: { shipment: ShipmentWithRelations }) {
  const cancelMut = useCancelPacking();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 rounded-lg text-rose-600 hover:bg-rose-50 font-bold gap-1.5"
          disabled={cancelMut.isPending}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Cancel
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl p-0 overflow-hidden border-none shadow-2xl sm:max-w-[420px]">
        <AlertDialogHeader className="p-8 bg-rose-600 text-white">
          <AlertDialogTitle className="text-xl font-black flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-md">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            Batalkan Status
          </AlertDialogTitle>
        </AlertDialogHeader>
        <div className="p-8">
          <AlertDialogDescription className="text-slate-700 font-medium leading-relaxed text-base">
            Apakah Anda yakin ingin membatalkan status packing untuk faktur <span className="font-black text-slate-900">"{shipment.invoiceNumber}"</span>? 
            <br/><br/>
            <span className="text-rose-600 text-sm">Data nama petugas dan tanggal packing sebelumnya akan dihapus secara permanen.</span>
          </AlertDialogDescription>
        </div>
        <AlertDialogFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="rounded-xl font-bold border-none h-12 flex-1">Kembali</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => cancelMut.mutate(shipment.id)}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black h-12 flex-1 shadow-lg shadow-rose-200"
          >
            Ya, Batalkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SelesaiPackingButton({ shipment }: { shipment: ShipmentWithRelations }) {
  const [open, setOpen] = useState(false);
  const [totalBoxes, setTotalBoxes] = useState<string>(shipment.totalBoxes?.toString() || "");
  const updateMut = useUpdateShipment();

  const handleSelesai = (e: React.FormEvent) => {
    e.preventDefault();
    const boxes = parseInt(totalBoxes);
    if (isNaN(boxes) || boxes < 1) return;

    updateMut.mutate({
      id: shipment.id,
      totalBoxes: boxes,
      status: "SIAP_KIRIM",
    }, {
      onSuccess: () => {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          className="h-12 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-200 gap-2 flex-1"
        >
          <PackageCheck className="w-5 h-5" />
          Konfirmasi Selesai
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-emerald-600 text-white">
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-md">
              <PackageCheck className="w-5 h-5 text-white" />
            </div>
            Selesai Packing
          </DialogTitle>
          <DialogDescription className="text-emerald-50/80 font-medium ml-13">
            Faktur <strong>{shipment.invoiceNumber}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSelesai} className="p-8 space-y-6 bg-white">
          <div className="space-y-3">
            <Label htmlFor="total-boxes" className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Total Muatan (Box / Koli)</Label>
            <div className="relative group">
              <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <Input
                id="total-boxes"
                type="number"
                inputMode="numeric"
                min="1"
                required
                className="h-14 pl-12 rounded-xl border-slate-200 bg-slate-50/30 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-black text-xl text-slate-900"
                value={totalBoxes}
                onChange={(e) => setTotalBoxes(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-slate-400 font-bold italic px-1 leading-relaxed">Masukkan jumlah total fisik koli/dus yang akan dikirim.</p>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={updateMut.isPending || !totalBoxes || parseInt(totalBoxes) < 1}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black h-12 shadow-lg shadow-emerald-200"
            >
              {updateMut.isPending ? "Memproses..." : "Konfirmasi & Siap Kirim"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="w-full mt-2 font-bold text-slate-400">Kembali</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
