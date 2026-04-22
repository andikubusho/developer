import { useState, useRef } from "react";

import { useShipments, useUpdateShipment, useCancelSiapKirim } from "@/hooks/use-shipments";
import { useAuth } from "@/hooks/use-auth";
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
import { Textarea } from "@/components/ui/textarea";

import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Send, PackageOpen, CalendarIcon, Clock, Truck, RotateCcw, MapPin, Receipt, Package, User, Download, ChevronDown, Monitor, FileSpreadsheet, FileText, Bookmark } from "lucide-react";
import { type ShipmentWithRelations } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, safeFormat } from "@/lib/utils";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SiapKirim() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: { shipments = [], total: totalShipments = 0 } = {}, isLoading } = useShipments({
    status: "SIAP_KIRIM,DALAM_PENGIRIMAN",
    limit: pageSize,
    offset: (page - 1) * pageSize
  });
  const { can } = usePermissions();
  const [openPreview, setOpenPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const readyShipments = shipments.filter(s =>
    s.status === "SIAP_KIRIM" ||
    s.status === "DALAM_PENGIRIMAN"
  ).sort((a, b) => {
    // Prioritize "SIAP KIRIM" over "DALAM_PENGIRIMAN"
    const scoreA = a.status === "SIAP_KIRIM" ? 1 : 2;
    const scoreB = b.status === "SIAP_KIRIM" ? 1 : 2;
    if (scoreA !== scoreB) return scoreA - scoreB;
    return new Date(b.inputDate).getTime() - new Date(a.inputDate).getTime();
  });

  const handleExportExcel = () => {
    const dataToExport = readyShipments.map((s, index) => ({
      "No": index + 1,
      "Tgl Input": safeFormat(s.inputDate, "dd MMM yyyy HH:mm"),
      "No Faktur": s.invoiceNumber,
      "Pelanggan": s.customer?.name || "-",
      "Merek": s.brand?.name || "-",
      "Tujuan": s.destination,
      "Ekspedisi": s.expedition?.name || "-",
      "Resi": s.receiptNumber || "-",
      "Pengirim": s.senderName || "-",
      "Total Nota": s.totalNotes,
      "Total Box": s.totalBoxes || "-",
      "Status": s.status === "DALAM_PENGIRIMAN" || s.status === "SIAP_KIRIM" ? "SIAP DI KIRIM" : "SEDANG DIPACKING"
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal Pengiriman");
    XLSX.writeFile(wb, `laporan-jadwal-pengiriman-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Laporan Jadwal Pengiriman", 14, 16);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 23);
    
    const tableData = readyShipments.map((s, index) => [
      index + 1,
      safeFormat(s.inputDate, "dd/MM/yyyy HH:mm"),
      s.invoiceNumber,
      s.customer?.name || "-",
      s.brand?.name || "-",
      s.destination,
      s.expedition?.name || "-",
      s.receiptNumber || "-",
      s.senderName || "-",
      `${s.totalNotes} Nota`,
      s.status === "DALAM_PENGIRIMAN" || s.status === "SIAP_KIRIM" ? "Siap Di Kirim" : "Sedang Dipacking"
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["No", "Tgl Input", "Faktur", "Pelanggan", "Merek", "Tujuan", "Ekspedisi", "Resi", "Pengirim", "Muatan", "Status"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] }
    });
    
    doc.save(`laporan-jadwal-pengiriman-${format(new Date(), "yyyyMMdd")}.pdf`);
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
          <title>Laporan Jadwal Pengiriman</title>
          <style>
            body { font-family: sans-serif; font-size: 12px; color: #111; }
            h2 { margin-bottom: 4px; }
            p { margin: 0 0 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #4f46e5; color: #fff; padding: 6px 10px; text-align: left; font-size: 11px; }
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl blur-xl opacity-20 animate-pulse" />
        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/20">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner group transition-transform hover:scale-105">
                <PackageOpen className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-in zoom-in duration-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Jadwal Pengiriman</h1>
                  <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">
                    Logistik
                  </div>
                </div>
                <p className="text-blue-50/80 text-sm sm:text-base font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-200 animate-ping" />
                  Jadwal pengiriman barang yang sudah selesai dipacking
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {(isAdmin || can("siap_kirim", "export") || can("siap_kirim", "print")) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-11 gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-sm rounded-xl flex-1 md:flex-none">
                      <Download className="w-4 h-4" />
                      <span className="font-bold">Export</span>
                      <ChevronDown className="w-3 h-3 text-white/70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-100 shadow-xl">
                    {(isAdmin || can("siap_kirim", "print")) && (
                      <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer py-2 font-bold text-slate-700">
                        <Monitor className="w-4 h-4 text-indigo-500" /> Print Layar
                      </DropdownMenuItem>
                    )}
                    {(isAdmin || can("siap_kirim", "export")) && (
                      <>
                        <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer py-2 font-bold text-slate-700">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer py-2 font-bold text-slate-700">
                          <FileText className="w-4 h-4 text-rose-500" /> Export PDF
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
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground whitespace-nowrap bg-white rounded-xl border">Loading...</div>
        ) : readyShipments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-white rounded-xl border italic">Tidak ada jadwal pengiriman yang ditemukan.</div>
        ) : (
          readyShipments.map((shipment) => (
            <div key={shipment.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-4 font-sans">
              <div className="flex justify-between items-start border-b pb-3">
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    {shipment.invoiceNumber}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Verif: {safeFormat(shipment.verificationDate)}
                  </p>
                  {shipment.brand && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Bookmark className="h-3 w-3 text-slate-400" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        {shipment.brand.name}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-100 text-blue-700">
                    {shipment.status === "DALAM_PENGIRIMAN" ? "SIAP DI KIRIM" : "SIAP KIRIM"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                <div className="space-y-2 text-left">
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground font-medium uppercase tracking-tighter text-[10px]">Pelanggan</p>
                    <p className="font-bold text-slate-800 line-clamp-2 leading-snug">{shipment.customer?.name}</p>
                  </div>
                  <div className="space-y-0.5 pt-1 border-t border-slate-50 md:border-none">
                    <p className="text-muted-foreground font-medium uppercase tracking-tighter text-[10px]">Ekspedisi</p>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Truck className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">{shipment.expedition?.name || "-"}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground font-medium uppercase tracking-tighter text-[10px]">Tujuan</p>
                    <div className="flex items-start gap-1 text-slate-600">
                      <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-snug">{shipment.destination}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5 pt-1 border-t border-slate-50 md:border-none">
                    <p className="text-muted-foreground font-medium uppercase tracking-tighter text-[10px]">Resi / No. Pol</p>
                    <div className="flex items-center gap-1">
                      <p className="font-mono text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-fit truncate max-w-full">
                        {shipment.receiptNumber || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 p-3 rounded-lg flex justify-between items-center text-xs border border-slate-100 shadow-inner">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-bold text-slate-700">{shipment.totalNotes} <span className="font-normal text-slate-500 uppercase text-[9px]">Nota</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l pl-4 border-slate-200">
                    <Package className="h-3.5 w-3.5 text-blue-500" />
                    <span className="font-bold text-slate-700">{shipment.totalBoxes || 0} <span className="font-normal text-slate-500 uppercase text-[9px]">Koli</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-500 italic">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-[80px]">{shipment.packerName || "-"}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                {shipment.status === "SIAP_KIRIM" && (
                  <div className="flex gap-2">
                    {can("siap_kirim", "edit") && <BatalPackingButton shipment={shipment} />}
                    {can("siap_kirim", "edit") && <ShipDialog shipment={shipment} />}
                  </div>
                )}
                {shipment.status === "DALAM_PENGIRIMAN" && (
                  <div className="flex gap-2">
                    {can("siap_kirim", "edit") && <CancelSiapKirimButton shipment={shipment} />}
                    {can("siap_kirim", "edit") && <SelesaiDikirimButton shipment={shipment} />}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View: Table Layout */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-600">No. Faktur & Tanggal</TableHead>
              <TableHead className="font-semibold text-slate-600">Merek</TableHead>
              <TableHead className="font-semibold text-slate-600">Pelanggan & Tujuan</TableHead>
              <TableHead className="font-semibold text-slate-600">Ekspedisi & Resi</TableHead>
              <TableHead className="font-semibold text-slate-600 text-center">Informasi</TableHead>
              <TableHead className="font-semibold text-slate-600">Pengirim</TableHead>
              <TableHead className="font-semibold text-slate-600">Progress</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12">Loading...</TableCell></TableRow>
            ) : readyShipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <PackageOpen className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="font-medium text-slate-500">Tidak ada barang yang sedang diproses saat ini.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              readyShipments.map((shipment) => {
                const isDalamPengiriman = shipment.status === "DALAM_PENGIRIMAN";
                return (
                  <TableRow key={shipment.id} className="hover:bg-blue-50/30 transition-colors">
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-foreground">{shipment.invoiceNumber}</p>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <div className="flex items-center text-[10px] text-muted-foreground gap-1">
                            <span className="font-medium w-10 uppercase">Input:</span>
                            {safeFormat(shipment.inputDate, "dd MMM yy, HH:mm")}
                          </div>
                          {shipment.verificationDate && (
                            <div className="flex items-center text-[10px] text-blue-600 gap-1">
                              <span className="font-medium w-10 uppercase">Verif:</span>
                              {safeFormat(shipment.verificationDate, "dd MMM yy, HH:mm")}
                            </div>
                          )}
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
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{shipment.customer?.name}</p>
                        <div className="flex items-start text-xs text-muted-foreground gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{shipment.destination}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-blue-500" />
                          <span className="font-semibold text-sm">{shipment.expedition?.name || "-"}</span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground gap-1 mt-1">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                            {shipment.receiptNumber || "Tanpa Resi"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100" title="Total Nota">
                          <Receipt className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-bold">{shipment.totalNotes}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100" title="Total Box/Koli">
                          <Package className="w-3 h-3 text-blue-400" />
                          <span className="text-xs font-bold text-blue-700">{shipment.totalBoxes || 0}</span>
                        </div>
                        </div>
                        {shipment.packerName && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>Packer: {shipment.packerName}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">{shipment.senderName || "-"}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex gap-2">
                          <div className="flex items-center gap-0.5" title="Packing Complete">
                            <Clock className="h-4 w-4 text-green-500" />
                          </div>
                          <div className="flex items-center gap-0.5" title="Siap Dikirim">
                            <Package className="h-4 w-4 text-blue-500 animate-pulse" />
                          </div>
                          <div className="flex items-center gap-0.5 opacity-30" title="Belum Dikirim">
                            <Truck className="h-4 w-4 text-slate-300" />
                          </div>
                        </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-left">
                        {isDalamPengiriman ? (
                          <>
                            <span className="px-2 py-1 rounded-full text-[10px] w-fit font-bold uppercase bg-blue-100 text-blue-700">
                              PROSES KIRIM
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="px-2 py-1 rounded-full text-[10px] w-fit font-bold uppercase bg-orange-100 text-orange-700">
                              SIAP KIRIM
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end items-center">
                        {shipment.status === "SIAP_KIRIM" && (
                          <>
                            {can("siap_kirim", "edit") && <BatalPackingButton shipment={shipment} />}
                            {can("siap_kirim", "edit") && <ShipDialog shipment={shipment} />}
                          </>
                        )}
                        {shipment.status === "DALAM_PENGIRIMAN" && (
                          <>
                            {can("siap_kirim", "edit") && <CancelSiapKirimButton shipment={shipment} />}
                            {can("siap_kirim", "edit") && <SelesaiDikirimButton shipment={shipment} />}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalShipments > pageSize && (
        <div className="mt-4 mb-6 flex justify-center print:hidden">
          <Pagination>
            <PaginationContent className="bg-white rounded-full border border-slate-200 shadow-sm px-2 py-1">
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  className={page === 1 ? "pointer-events-none opacity-40" : "cursor-pointer hover:bg-slate-50"}
                />
              </PaginationItem>
              
              <span className="text-xs font-bold mx-4 flex items-center text-slate-500 uppercase tracking-wider">
                Hal {page} dari {Math.ceil(totalShipments / pageSize)} <span className="text-indigo-600 ml-2 hidden sm:inline">({totalShipments} Total)</span>
              </span>

              <PaginationItem>
                <PaginationNext 
                  onClick={() => setPage(p => Math.min(Math.ceil(totalShipments / pageSize), p + 1))}
                  className={page >= Math.ceil(totalShipments / pageSize) ? "pointer-events-none opacity-40" : "cursor-pointer hover:bg-slate-50"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={openPreview} onOpenChange={setOpenPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview Cetak Laporan</DialogTitle>
            <DialogDescription>Pratinjau laporan sebelum dicetak.</DialogDescription>
          </DialogHeader>
          <div ref={printRef} className="p-4">
            <h2 className="text-xl font-bold mb-1">Laporan Jadwal Pengiriman</h2>
            <p className="text-sm text-muted-foreground mb-4">Dicetak: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#4f46e5] text-white">
                  <th className="px-3 py-2 text-left">No</th>
                  <th className="px-3 py-2 text-left">Tgl Input</th>
                  <th className="px-3 py-2 text-left">Faktur</th>
                  <th className="px-3 py-2 text-left">Pelanggan</th>
                  <th className="px-3 py-2 text-left">Tujuan</th>
                  <th className="px-3 py-2 text-left">Ekspedisi</th>
                   <th className="px-3 py-2 text-left">Resi</th>
                   <th className="px-3 py-2 text-left">Pengirim</th>
                   <th className="px-3 py-2 text-left">Muatan</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {readyShipments.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{safeFormat(s.inputDate, "dd/MM/yyyy HH:mm")}</td>
                    <td className="px-3 py-2 font-medium">{s.invoiceNumber}</td>
                    <td className="px-3 py-2">{s.customer?.name || "-"}</td>
                    <td className="px-3 py-2">{s.destination}</td>
                    <td className="px-3 py-2">{s.expedition?.name || "-"}</td>
                    <td className="px-3 py-2">{s.receiptNumber || "-"}</td>
                    <td className="px-3 py-2 font-medium">{s.senderName || "-"}</td>
                    <td className="px-3 py-2">{s.totalNotes} Nota</td>
                    <td className="px-3 py-2">
                      {s.status === "DALAM_PENGIRIMAN" || s.status === "SIAP_KIRIM" ? "Siap Di Kirim" : "Sedang Dipacking"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenPreview(false)}>Tutup</Button>
            <Button onClick={doPrint} className="bg-blue-600 hover:bg-blue-700">
              <Monitor className="w-4 h-4 mr-2" /> Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShipDialog({ shipment }: { shipment: ShipmentWithRelations }) {
  const [open, setOpen] = useState(false);
  const updateMut = useUpdateShipment();

  const [senderName, setSenderName] = useState("");
  const [boxes, setBoxes] = useState(shipment.totalBoxes?.toString() || "");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  const handleShip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName || !date || !boxes) return;

    updateMut.mutate({
      id: shipment.id,
      senderName,
      totalBoxes: parseInt(boxes),
      receiptNumber: receiptNumber || null,
      shippingDate: date,
      shippingNotes: shippingNotes || null,
      status: "DALAM_PENGIRIMAN"
    }, {
      onSuccess: () => setOpen(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (val) {
        setSenderName("");
        setReceiptNumber("");
        setShippingNotes("");
        setDate(new Date());
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 hover-elevate shadow-sm">
          <Send className="w-4 h-4 mr-1.5" /> Jadwal Kirim
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white">
        <div className="h-32 bg-gradient-to-br from-indigo-500 to-blue-600 relative overflow-hidden flex items-center px-8">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          
          <div className="relative flex items-center gap-5">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-white leading-tight">
                Jadwal Pengiriman
              </DialogTitle>
              <DialogDescription className="text-indigo-50 text-xs font-medium opacity-90">
                Faktur: {shipment.invoiceNumber}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleShip} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="senderName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nama Pengirim <span className="text-red-500">*</span></Label>
              <Input
                id="senderName"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Nama kurir/supir..."
                className="h-11 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-all font-semibold shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ship-boxes" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Jumlah koli/dus <span className="text-red-500">*</span></Label>
              <Input
                id="ship-boxes"
                type="number"
                min="1"
                required
                value={boxes}
                onChange={(e) => setBoxes(e.target.value)}
                placeholder="Jumlah dus..."
                className="h-11 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-all font-semibold shadow-sm"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tanggal Kirim <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full h-11 justify-start text-left font-semibold rounded-xl border-slate-200 hover:bg-slate-50",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                    {date ? format(date, "PPP", { locale: idLocale }) : <span>Pilih tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-slate-100 shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiptNumber" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">No. Resi (Opsional)</Label>
            <Input
              id="receiptNumber"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="Masukkan no resi ekspedisi jika ada"
              className="h-11 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-all font-semibold shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingNotes" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Keterangan Kirim (Opsional)</Label>
            <Textarea
              id="shippingNotes"
              value={shippingNotes}
              onChange={(e) => setShippingNotes(e.target.value)}
              placeholder="Catatan saat pengiriman..."
              rows={2}
              className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-all font-medium shadow-sm resize-none"
            />
          </div>

          <DialogFooter className="pt-4 flex gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl font-bold text-slate-400"
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={updateMut.isPending} 
              className="flex-[2] h-12 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 text-white"
            >
              {updateMut.isPending ? "Menyimpan..." : "Simpan Jadwal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelSiapKirimButton({ shipment }: { shipment: ShipmentWithRelations }) {
  const cancelMut = useCancelSiapKirim();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 hover-elevate shadow-sm"
          disabled={cancelMut.isPending}
        >
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Batal Jadwal
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan Jadwal Kirim?</AlertDialogTitle>
            <AlertDialogDescription>
            Apakah Anda yakin ingin membatalkan jadwal pengiriman untuk faktur <strong>{shipment.invoiceNumber}</strong>?
            Status akan tetap di menu ini sebagai <strong>"SIAP KIRIM"</strong> (sebelum dijadwalkan). Data pengirim, tanggal kirim, resi, dan keterangan akan dihapus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => cancelMut.mutate(shipment.id)}
            className="bg-red-600 hover:bg-red-700"
          >
            Ya, Batalkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BatalPackingButton({ shipment }: { shipment: ShipmentWithRelations }) {
  const updateMut = useUpdateShipment();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-amber-600 border-amber-200 hover:bg-amber-50 hover-elevate shadow-sm"
          disabled={updateMut.isPending}
        >
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Batal Packing
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan Status Packing?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin membatalkan status packing untuk faktur <strong>{shipment.invoiceNumber}</strong>?
            Data akan kembali ke menu Packing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => updateMut.mutate({ id: shipment.id, status: "MENUNGGU_VERIFIKASI", verificationDate: null })}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Ya, Batalkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SelesaiDikirimButton({ shipment }: { shipment: ShipmentWithRelations }) {
  const updateMut = useUpdateShipment();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white hover-elevate shadow-sm"
          disabled={updateMut.isPending}
        >
          <Package className="w-4 h-4 mr-1.5" />
          Selesai Dikirim
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Selesai Dikirim</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah faktur <strong>{shipment.invoiceNumber}</strong> sudah selesai dikirim dan diterima?
            Data akan dipindahkan ke menu Barang Terkirim.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => updateMut.mutate({ id: shipment.id, status: "TERKIRIM" })}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Ya, Selesai
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
