import { useState, useRef, useEffect } from "react";
import { useShipments, useUpdateShipment } from "@/hooks/use-shipments";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Search, Download, Monitor, ChevronDown, CheckCheck, MapPin, Receipt, Truck as TruckIcon, User, Package, Clock, FileSpreadsheet, FileText, CheckCircle2, RotateCcw, XCircle, Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PengembalianFaktur() {
  const { data: { shipments = [], total: totalShipments = 0 } = {}, isLoading } = useShipments();
  const { can } = usePermissions();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [openPreview, setOpenPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Filter hanya yang sudah TERKIRIM dan sudah diproses faktur di menu sebelumnya
  const allItems = shipments
    .filter(s => s.status === "TERKIRIM" && s.invoiceProcessed)
    .filter(s => s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || s.customer?.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Yang belum kembali di atas, yang sudah kembali di bawah
      if (!a.invoiceReturned && b.invoiceReturned) return -1;
      if (a.invoiceReturned && !b.invoiceReturned) return 1;
      
      // Jika sama, urutkan berdasarkan tanggal kirim terbesar (terbaru)
      return (b.shippingDate ? new Date(b.shippingDate).getTime() : 0) - (a.shippingDate ? new Date(a.shippingDate).getTime() : 0);
    });

  const [page, setPage] = useState(1);
  const itemsPerPage = 50;
  
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  const displayedItems = allItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const exportExcel = () => {
    const rows = allItems.map((s, i) => ({
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
      "Status Faktur": s.invoiceReturned ? "SUDAH KEMBALI" : "BELUM KEMBALI",
      "Tgl Kembali": s.returnedDate ? format(new Date(s.returnedDate), "dd/MM/yyyy") : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Pengembalian Faktur");
    XLSX.writeFile(wb, `laporan-pengembalian-faktur-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Laporan Pengembalian Faktur", 14, 16);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 23);

    autoTable(doc, {
      startY: 28,
      head: [["No", "Tgl Kirim", "No Faktur", "Pelanggan", "Merek", "Info Kurir", "Ekspedisi", "No. Resi", "Status Faktur", "Tgl Kembali"]],
      body: allItems.map((s, i) => [
        i + 1,
        s.shippingDate ? format(new Date(s.shippingDate), "dd/MM/yyyy") : "-",
        s.invoiceNumber,
        s.customer?.name || "-",
        s.brand?.name || "-",
        s.senderName || "-",
        s.expedition?.name || "-",
        s.receiptNumber || "-",
        s.invoiceReturned ? "SUDAH KEMBALI" : "BELUM KEMBALI",
        s.returnedDate ? format(new Date(s.returnedDate), "dd/MM/yyyy") : "-",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 118, 110] }, // Teal 700
    });

    doc.save(`laporan-pengembalian-faktur-${format(new Date(), "yyyyMMdd")}.pdf`);
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
          <title>Laporan Pengembalian Faktur</title>
          <style>
            body { font-family: sans-serif; font-size: 12px; color: #111; }
            h2 { margin-bottom: 4px; }
            p { margin: 0 0 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #0f766e; color: #fff; padding: 6px 10px; text-align: left; font-size: 11px; }
            td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
            tr:nth-child(even) td { background: #f9fafb; }
            .badge-success { display:inline-block; padding: 2px 8px; border-radius: 999px; background: #ccfbf1; color: #0f766e; font-size: 10px; font-weight: bold; }
            .badge-warning { display:inline-block; padding: 2px 8px; border-radius: 999px; background: #fef3c7; color: #b45309; font-size: 10px; font-weight: bold; }
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
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl blur-xl opacity-20 animate-pulse" />
        <div className="relative bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/20">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner group transition-transform hover:scale-105">
                <Receipt className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-in zoom-in duration-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Pengembalian Faktur</h1>
                  <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">
                    Logistics
                  </div>
                </div>
                <p className="text-teal-50/80 text-sm sm:text-base font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-200 animate-ping" />
                  Kelola faktur fisik barang yang sudah terkirim
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
              <div className="relative group flex-1 md:flex-none">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-teal-100 group-focus-within:text-white transition-colors" />
                </div>
                <Input 
                  placeholder="Cari faktur, pelanggan..." 
                  className="pl-11 bg-black/20 border-white/20 text-white placeholder:text-teal-100/70 h-11 rounded-2xl w-full md:w-[280px] focus-visible:ring-white/30 focus-visible:border-white/50 backdrop-blur-md transition-all font-medium"
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>

              {(isAdmin || can("pengembalian", "export") || can("pengembalian", "print")) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md h-11 px-6 rounded-2xl font-bold gap-2 shadow-lg flex-1 md:flex-none">
                      <Download className="w-4 h-4" /> Export
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-slate-200 shadow-2xl">
                    {(isAdmin || can("pengembalian", "print")) && (
                      <DropdownMenuItem onClick={handlePrint} data-testid="export-screen" className="gap-3 p-3 rounded-xl cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Monitor className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">Print Layar</span>
                          <span className="text-[10px] text-slate-500 italic">Pratinjau laporan</span>
                        </div>
                      </DropdownMenuItem>
                    )}
                    {(isAdmin || can("pengembalian", "export")) && (
                      <>
                        <DropdownMenuItem onClick={exportExcel} data-testid="export-excel" className="gap-3 p-3 rounded-xl cursor-pointer">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">Excel Spreadsheet</span>
                            <span className="text-[10px] text-slate-500">Format .xlsx</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportPDF} data-testid="export-pdf" className="gap-3 p-3 rounded-xl cursor-pointer">
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
      <div className="grid grid-cols-1 gap-6 md:hidden mb-12 mt-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[2rem]" />
          ))
        ) : allItems.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-200 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-medium italic">Belum ada faktur yang perlu dikembalikan.</p>
          </div>
        ) : (
          displayedItems.map((shipment) => (
            <div key={shipment.id} className={cn(
              "group relative bg-white rounded-[2rem] border shadow-xl shadow-slate-200/50 overflow-hidden transition-all active:scale-[0.98]",
              shipment.invoiceReturned ? "border-teal-200 bg-teal-50/10" : "border-slate-100"
            )}>
               {/* Status Badge Overlay */}
               <div className="absolute top-0 right-0 p-4">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-1.5 border",
                    shipment.invoiceReturned ? "bg-teal-50 text-teal-700 border-teal-100" : "bg-amber-50 text-amber-700 border-amber-100"
                  )}>
                    {shipment.invoiceReturned ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Sudah Kembali
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 animate-pulse text-amber-500" />
                        Belum Kembali
                      </>
                    )}
                  </div>
               </div>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-colors",
                    shipment.invoiceReturned ? "bg-teal-50 text-teal-600 border-teal-100" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 leading-tight flex items-center gap-2">
                       {shipment.invoiceNumber}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                      <TruckIcon className="w-3 h-3" />
                      Kirim: {shipment.shippingDate ? format(new Date(shipment.shippingDate), "dd MMM yy", { locale: idLocale }) : "-"}
                    </p>
                    {shipment.brand && (
                      <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-50">
                        <Bookmark className="w-3 h-3 text-slate-300" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
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
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pelanggan</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-snug">{shipment.customer?.name}</p>
                    <div className="flex items-start gap-1.5 mt-2">
                      <MapPin className="w-3 h-3 text-slate-300 mt-1 shrink-0" />
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{shipment.destination}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 overflow-hidden">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ekspedisi</span>
                       <p className="text-xs font-black text-slate-800 truncate">{shipment.expedition?.name || "-"}</p>
                       <p className="text-[10px] font-mono font-bold text-teal-600 mt-1 truncate">{shipment.receiptNumber || shipment.senderName || "Tanpa Resi/Kurir"}</p>
                       <div className="mt-2">
                         {shipment.status === "TERKIRIM" ? (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-700 border border-emerald-200">
                             <CheckCircle2 className="w-3 h-3" /> Terkirim
                           </span>
                         ) : (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter bg-amber-50 text-amber-700 border border-amber-200">
                             <Clock className="w-3 h-3" /> Belum Terkirim
                           </span>
                         )}
                       </div>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Faktur</span>
                       <div className="flex flex-col gap-1 mt-2">
                         {shipment.invoiceReturned ? (
                           <>
                              <span className="text-xs font-black text-teal-700">Dikembalikan</span>
                              {shipment.returnedDate && (
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">TGL: {format(new Date(shipment.returnedDate), "dd MMM yy", { locale: idLocale })}</span>
                              )}
                           </>
                         ) : (
                           <span className="text-xs font-black text-amber-600 uppercase">Menunggu</span>
                         )}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-50 flex gap-2">
                   {!shipment.invoiceReturned ? (
                    <>
                      {can("pengembalian", "edit") && (
                        <div className="flex-1">
                          <BatalFakturDialog id={shipment.id} invoice={shipment.invoiceNumber} />
                        </div>
                      )}
                      {can("pengembalian", "edit") && (
                        <div className="flex-[2]">
                          <KembaliButton id={shipment.id} invoice={shipment.invoiceNumber} />
                        </div>
                      )}
                    </>
                  ) : (
                    can("pengembalian", "edit") && (
                       <div className="w-full">
                          <BatalKembaliDialog id={shipment.id} invoice={shipment.invoiceNumber} />
                       </div>
                    )
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
              <TableHead className="font-bold text-slate-800 py-5 pl-6">Faktur & Tanggal</TableHead>
              <TableHead className="font-bold text-slate-800">Merek</TableHead>
              <TableHead className="font-bold text-slate-800">Pelanggan</TableHead>
              <TableHead className="font-bold text-slate-800">Ekspedisi & Info</TableHead>
              <TableHead className="font-bold text-slate-800">Status Faktur</TableHead>
              <TableHead className="text-right font-bold text-slate-800 pr-6">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5} className="py-8"><div className="h-10 bg-slate-100 animate-pulse rounded-xl w-full" /></TableCell>
                </TableRow>
              ))
            ) : allItems.length === 0 ? (
              <TableRow>
                 <TableCell colSpan={5} className="py-20 text-center text-slate-400 font-medium italic">Belum ada faktur yang perlu dikembalikan.</TableCell>
              </TableRow>
            ) : (
              displayedItems.map((shipment) => {
                const isReturned = shipment.invoiceReturned;
                return (
                  <TableRow key={shipment.id} className={cn("hover:bg-slate-50/50 transition-colors border-slate-100/50 group", isReturned ? "bg-teal-50/10" : "")}>
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner transition-colors",
                          isReturned ? "bg-teal-50 text-teal-600 border-teal-100" : "bg-slate-100 text-slate-400 border-white shadow-sm"
                        )}>
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-black text-slate-900 leading-tight group-hover:text-teal-600 transition-colors uppercase tracking-tight">
                            {shipment.invoiceNumber}
                          </div>
                          <div className="flex flex-col gap-0.5 mt-1">
                            {shipment.shippingDate && (
                              <div className="flex items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest gap-1">
                                <TruckIcon className="w-3 h-3" /> KRS: {format(new Date(shipment.shippingDate), "dd MMM yy", { locale: idLocale })}
                              </div>
                            )}
                            {isReturned && shipment.returnedDate && (
                              <div className="flex items-center text-[9px] font-bold text-teal-600 uppercase tracking-widest gap-1">
                                <CheckCircle2 className="w-3 h-3" /> RET: {format(new Date(shipment.returnedDate), "dd MMM yy", { locale: idLocale })}
                              </div>
                            )}
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
                      <div className="max-w-[200px]">
                        <div className="font-bold text-slate-800 text-sm line-clamp-1">{shipment.customer?.name}</div>
                        <div className="flex items-start text-[10px] text-slate-400 mt-1 gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{shipment.destination}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-black text-slate-800 text-xs truncate max-w-[150px]">
                          <TruckIcon className="w-3.5 h-3.5 text-primary" />
                          {shipment.expedition?.name || "-"}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {shipment.receiptNumber && (
                            <div className="font-mono text-[10px] font-black text-teal-600 px-1.5 py-0.5 rounded border border-teal-100 bg-teal-50/30 w-fit max-w-[100px] truncate" title="No. Resi">
                              {shipment.receiptNumber}
                            </div>
                          )}
                          {shipment.senderName && (
                            <div className="flex items-center text-[10px] font-bold text-slate-500 gap-1" title="Nama Kurir">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">{shipment.senderName}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-1">
                          {shipment.status === "TERKIRIM" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Terkirim
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> Belum Terkirim
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] w-fit font-black uppercase tracking-widest border flex items-center gap-1.5",
                        isReturned ? "bg-teal-50 text-teal-700 border-teal-100 shadow-sm" : "bg-amber-50 text-amber-600 border-amber-100 shadow-sm"
                       )}>
                        {isReturned ? (
                          <>
                             <CheckCircle2 className="w-3 h-3 text-teal-500" />
                             SUDAH KEMBALI
                          </>
                        ) : (
                          <>
                             <Clock className="w-3 h-3 text-amber-500" />
                             BELUM KEMBALI
                          </>
                        )}
                       </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                       {!isReturned ? (
                        <div className="flex items-center justify-end gap-2">
                          {can("pengembalian", "edit") && <BatalFakturDialog id={shipment.id} invoice={shipment.invoiceNumber} />}
                          {can("pengembalian", "edit") && <KembaliButton id={shipment.id} invoice={shipment.invoiceNumber} />}
                        </div>
                      ) : (
                        can("pengembalian", "edit") && <BatalKembaliDialog id={shipment.id} invoice={shipment.invoiceNumber} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="py-4 border-t border-slate-100 flex items-center justify-between px-6 bg-slate-50/30 rounded-b-[2rem] mb-12 hidden md:flex">
          <p className="text-xs text-slate-500 font-medium">
            Menampilkan <span className="font-bold text-slate-700">{(page - 1) * itemsPerPage + 1}</span> hingga <span className="font-bold text-slate-700">{Math.min(page * itemsPerPage, allItems.length)}</span> dari <span className="font-bold text-slate-700">{allItems.length}</span> entri
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                  return (
                    <PaginationItem key={p}>
                      <PaginationLink 
                        onClick={() => setPage(p)}
                        isActive={page === p}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                if ((p === 2 && page > 3) || (p === totalPages - 1 && page < totalPages - 2)) {
                  return (
                    <PaginationItem key={p}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return null;
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Mobile Pagination Controls */}
      {totalPages > 1 && (
        <div className="md:hidden py-4 border-t border-slate-100 flex justify-center bg-slate-50/30 rounded-b-[2rem] mb-12 mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              <span className="text-xs font-bold text-slate-600 px-4">
                Hal {page}/{totalPages}
              </span>
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
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
              Pratinjau laporan sebelum dicetak.
            </DialogDescription>
          </DialogHeader>
          <div ref={printRef} className="p-4">
            <h2 className="text-xl font-bold mb-1">Laporan Pengembalian Faktur</h2>
            <p className="text-sm text-muted-foreground mb-4">Dicetak: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-teal-700 text-white">
                  <th className="px-3 py-2 text-left">No</th>
                  <th className="px-3 py-2 text-left">Tgl Kirim</th>
                  <th className="px-3 py-2 text-left">No Faktur</th>
                  <th className="px-3 py-2 text-left">Pelanggan</th>
                  <th className="px-3 py-2 text-left">Info Kurir</th>
                  <th className="px-3 py-2 text-left">Ekspedisi</th>
                  <th className="px-3 py-2 text-left">No. Resi</th>
                  <th className="px-3 py-2 text-left">Status Faktur</th>
                  <th className="px-3 py-2 text-center">Tgl Kembali</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{s.shippingDate ? format(new Date(s.shippingDate), "dd/MM/yyyy") : "-"}</td>
                    <td className="px-3 py-2 font-medium">{s.invoiceNumber}</td>
                    <td className="px-3 py-2">{s.customer?.name || "-"}</td>
                    <td className="px-3 py-2">{s.senderName || "-"}</td>
                    <td className="px-3 py-2">{s.expedition?.name || "-"}</td>
                    <td className="px-3 py-2">{s.receiptNumber || "-"}</td>
                    <td className="px-3 py-2">
                       <span className={s.invoiceReturned ? "badge-success" : "badge-warning"}>
                        {s.invoiceReturned ? "SUDAH KEMBALI" : "BELUM KEMBALI"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">{s.returnedDate ? format(new Date(s.returnedDate), "dd/MM/yyyy") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="p-8 bg-slate-50 gap-3 border-t border-slate-100 mt-8">
            <Button variant="ghost" onClick={() => setOpenPreview(false)} className="rounded-xl font-bold">Tutup</Button>
            <Button onClick={doPrint} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black px-10 shadow-lg h-12">
              <Monitor className="w-4 h-4 mr-2" /> Cetak Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function KembaliButton({ id, invoice }: { id: number, invoice: string }) {
  const [open, setOpen] = useState(false);
  const updateMut = useUpdateShipment();

  const handleSelesai = () => {
    updateMut.mutate({
      id,
      invoiceReturned: true,
      returnedDate: new Date(),
    }, {
      onSuccess: () => {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-10 w-full md:w-auto px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black shadow-lg shadow-teal-200 gap-2 transition-all" data-testid={`btn-kembali-${id}`}>
          <CheckCheck className="w-4 h-4" /> Faktur Kembali
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-teal-600 text-white">
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-md">
              <CheckCheck className="w-5 h-5 text-white" />
            </div>
            Konfirmasi Faktur Kembali
          </DialogTitle>
        </DialogHeader>
        <div className="p-8 space-y-4 bg-white">
          <p className="text-slate-700 font-medium tracking-tight">Tandai faktur <strong className="text-slate-900 font-black">{invoice}</strong> sudah kembali ke kantor?</p>
          <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
            Faktur ini akan ditandai sukses kembali dengan tanggal penerimaan pada hari ini.
          </p>
        </div>
        <DialogFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-2 bg-white">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold h-12 flex-1">Batal</Button>
          <Button type="button" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black h-12 flex-1 shadow-lg shadow-teal-200" onClick={handleSelesai} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Menyimpan..." : "Ya, Sudah Kembali"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatalKembaliDialog({ id, invoice }: { id: number, invoice: string }) {
  const [open, setOpen] = useState(false);
  const updateMut = useUpdateShipment();

  const handleFail = () => {
    updateMut.mutate({
      id,
      invoiceReturned: false,
      returnedDate: null,
    }, {
      onSuccess: () => setOpen(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-full md:w-auto px-4 rounded-xl text-amber-600 hover:bg-amber-50 font-bold gap-2 transition-all">
          <RotateCcw className="w-4 h-4" /> Batal Kembali
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-amber-600 text-white">
          <DialogTitle className="text-xl font-black flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-md">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            Batal Faktur Kembali
          </DialogTitle>
        </DialogHeader>
        <div className="p-8 space-y-4 bg-white">
          <p className="text-slate-700 font-medium tracking-tight">Batalkan status kembali untuk faktur <strong className="text-slate-900 font-black">{invoice}</strong>?</p>
          <p className="text-sm text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-100 font-medium">
            Faktur ini akan kembali masuk ke antrean <strong>Belum Kembali</strong>.
          </p>
        </div>
        <DialogFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-2 bg-white">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold h-12 flex-1">Kembali</Button>
          <Button type="button" className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black h-12 flex-1 shadow-lg shadow-amber-200" onClick={handleFail} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Memproses..." : "Ya, Batalkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatalFakturDialog({ id, invoice }: { id: number, invoice: string }) {
  const [open, setOpen] = useState(false);
  const updateMut = useUpdateShipment();

  const handleBatalFaktur = () => {
    updateMut.mutate({
      id,
      invoiceProcessed: false,
    }, {
      onSuccess: () => setOpen(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-full md:w-auto px-4 rounded-xl text-rose-600 hover:bg-rose-50 font-bold gap-2 transition-all" data-testid={`btn-batal-faktur-${id}`}>
          <RotateCcw className="w-4 h-4" /> Batal Faktur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-rose-600 text-white">
          <DialogTitle className="text-xl font-black flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-md">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            Batal Proses Faktur
          </DialogTitle>
        </DialogHeader>
        <div className="p-8 space-y-4 bg-white">
          <p className="text-slate-700 font-medium tracking-tight">Batalkan proses faktur untuk nomor <strong className="text-slate-900 font-black">{invoice}</strong>?</p>
          <p className="text-sm text-rose-700 bg-rose-50 p-4 rounded-xl border border-rose-100 font-medium">
            Faktur ini akan kembali ke menu <strong>Riwayat/Terkirim</strong> dan dihapus dari daftar pengembalian.
          </p>
        </div>
        <DialogFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-2 bg-white">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold h-12 flex-1">Kembali</Button>
          <Button type="button" className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black h-12 flex-1 shadow-lg shadow-rose-200" onClick={handleBatalFaktur} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Memproses..." : "Ya, Batal Faktur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

