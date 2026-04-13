import { useState, useRef } from "react";

import { useShipments } from "@/hooks/use-shipments";
import { useGlobalPeriod } from "@/hooks/use-global-period";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CircleCheckBig, Clock, Truck, MapPin, Receipt, Package, User, Download, ChevronDown, Monitor, FileSpreadsheet, FileText, Bookmark, Search, Calendar } from "lucide-react";
import { type ShipmentWithRelations } from "@shared/schema";
import { safeFormat, cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

export default function KirimanSelesai() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { startDate, endDate, isCurrentMonth, globalMonth, globalYear } = useGlobalPeriod();
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const { data: { shipments = [], total: totalShipments = 0 } = {}, isLoading } = useShipments({
    status: "TERKIRIM",
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: search || undefined,
    startDate,
    endDate
  });
  const { can } = usePermissions();
  const [openPreview, setOpenPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Client-side filter for senderName (server already handles invoice & customer search)
  const completedShipments = [...shipments]
    .filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      // Server already filters by invoice/customer, but also match senderName client-side
      return (
        s.invoiceNumber.toLowerCase().includes(q) ||
        (s.customer?.name || "").toLowerCase().includes(q) ||
        (s.senderName || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      new Date(b.inputDate).getTime() - new Date(a.inputDate).getTime()
    );

  // Reset page when search changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleExportExcel = () => {
    const dataToExport = completedShipments.map((s, index) => ({
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
      "Status": "TERKIRIM"
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kiriman Selesai");
    XLSX.writeFile(wb, `laporan-kiriman-selesai-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Laporan Kiriman Selesai", 14, 16);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 23);
    
    const tableData = completedShipments.map((s, index) => [
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
      "Terkirim"
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["No", "Tgl Input", "Faktur", "Pelanggan", "Merek", "Tujuan", "Ekspedisi", "Resi", "Pengirim", "Muatan", "Status"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] }
    });
    
    doc.save(`laporan-kiriman-selesai-${format(new Date(), "yyyyMMdd")}.pdf`);
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
          <title>Laporan Kiriman Selesai</title>
          <style>
            body { font-family: sans-serif; font-size: 12px; color: #111; }
            h2 { margin-bottom: 4px; }
            p { margin: 0 0 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #10b981; color: #fff; padding: 6px 10px; text-align: left; font-size: 11px; }
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
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl blur-xl opacity-20 animate-pulse" />
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/20">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner group transition-transform hover:scale-105">
                <CircleCheckBig className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-in zoom-in duration-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Kiriman Selesai</h1>
                  <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">
                    Logistik
                  </div>
                </div>
                <p className="text-emerald-50/80 text-sm sm:text-base font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-ping" />
                  Daftar kiriman yang sudah selesai dikirim
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Cari faktur, pelanggan..."
                  className="h-11 pl-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30 focus-visible:border-white/40 font-medium"
                />
              </div>
              {(isAdmin || can("terkirim", "export") || can("terkirim", "print")) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-11 gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-sm rounded-xl flex-1 md:flex-none">
                      <Download className="w-4 h-4" />
                      <span className="font-bold">Export</span>
                      <ChevronDown className="w-3 h-3 text-white/70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-100 shadow-xl">
                    {(isAdmin || can("terkirim", "print")) && (
                      <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer py-2 font-bold text-slate-700">
                        <Monitor className="w-4 h-4 text-emerald-500" /> Print Layar
                      </DropdownMenuItem>
                    )}
                    {(isAdmin || can("terkirim", "export")) && (
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

      {!isCurrentMonth && (
        <div className={cn(
          "mb-6 px-4 py-3 rounded-2xl border flex items-center justify-center text-xs sm:text-sm font-bold tracking-wide shadow-md w-full transition-all duration-500",
          "bg-amber-500/80 text-white border-amber-400 backdrop-blur-xl animate-pulse ring-2 ring-amber-400/50"
        )}>
          <Calendar className="w-4 h-4 mr-2 text-white" />
          Anda sedang melihat data historis: {months[globalMonth]} {globalYear}
        </div>
      )}

      {/* Mobile View: Card Layout */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground whitespace-nowrap bg-white rounded-xl border">Loading...</div>
        ) : completedShipments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-white rounded-xl border italic">Tidak ada kiriman selesai yang ditemukan.</div>
        ) : (
          completedShipments.map((shipment) => (
            <div key={shipment.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-4 font-sans">
              <div className="flex justify-between items-start border-b pb-3">
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-600" />
                    {shipment.invoiceNumber}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Input: {safeFormat(shipment.inputDate)}
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
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700">
                    TERKIRIM
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
                      <Truck className="h-3 w-3 text-emerald-600 shrink-0" />
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
                    <p className="text-muted-foreground font-medium uppercase tracking-tighter text-[10px]">Resi</p>
                    <div className="flex items-center gap-1">
                      <p className="font-mono text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-fit truncate max-w-full">
                        {shipment.receiptNumber || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/80 p-3 rounded-lg flex justify-between items-center text-xs border border-emerald-100 shadow-inner">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-bold text-slate-700">{shipment.totalNotes} <span className="font-normal text-slate-500 uppercase text-[9px]">Nota</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l pl-4 border-emerald-200">
                    <Package className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="font-bold text-slate-700">{shipment.totalBoxes || 0} <span className="font-normal text-slate-500 uppercase text-[9px]">Koli</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-500 italic">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-[80px]">{shipment.senderName || "-"}</span>
                </div>
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
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12">Loading...</TableCell></TableRow>
            ) : completedShipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <CircleCheckBig className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="font-medium text-slate-500">Tidak ada kiriman selesai saat ini.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              completedShipments.map((shipment) => (
                <TableRow key={shipment.id} className="hover:bg-emerald-50/30 transition-colors">
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-foreground">{shipment.invoiceNumber}</p>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <div className="flex items-center text-[10px] text-muted-foreground gap-1">
                          <span className="font-medium w-10 uppercase">Input:</span>
                          {safeFormat(shipment.inputDate, "dd MMM yy, HH:mm")}
                        </div>
                        {shipment.shippingDate && (
                          <div className="flex items-center text-[10px] text-emerald-600 gap-1">
                            <span className="font-medium w-10 uppercase">Kirim:</span>
                            {safeFormat(shipment.shippingDate, "dd MMM yy, HH:mm")}
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
                        <Truck className="w-4 h-4 text-emerald-500" />
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
                        <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100" title="Total Box/Koli">
                          <Package className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-700">{shipment.totalBoxes || 0}</span>
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
                    <span className="px-2 py-1 rounded-full text-[10px] w-fit font-bold uppercase bg-emerald-100 text-emerald-700">
                      TERKIRIM
                    </span>
                  </TableCell>
                </TableRow>
              ))
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
                Hal {page} dari {Math.ceil(totalShipments / pageSize)} <span className="text-emerald-600 ml-2 hidden sm:inline">({totalShipments} Total)</span>
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
            <h2 className="text-xl font-bold mb-1">Laporan Kiriman Selesai</h2>
            <p className="text-sm text-muted-foreground mb-4">Dicetak: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#10b981] text-white">
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
                {completedShipments.map((s, i) => (
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
                    <td className="px-3 py-2">Terkirim</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenPreview(false)}>Tutup</Button>
            <Button onClick={doPrint} className="bg-emerald-600 hover:bg-emerald-700">
              <Monitor className="w-4 h-4 mr-2" /> Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
