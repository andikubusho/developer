import { useState, useRef, useMemo, useEffect } from "react";
import { useItems, useCreateItem, useUpdateItem, useDeleteItem, useBulkCreateItem, useDeleteItemsByBranch, type PaginatedItems } from "@/hooks/use-items";
import { usePermissions } from "@/hooks/use-permissions";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  ArrowLeft, Plus, Edit2, Trash2, Package, Download, Monitor, ChevronDown, 
  FileSpreadsheet, FileText, Search, Upload, Building2, ChevronLeft, ChevronRight, 
  AlertTriangle, LayoutGrid, List, CheckCircle2, AlertCircle, Info 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertItemSchema, type Item } from "@shared/schema";
import { useBranch } from "@/hooks/use-branch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Controller } from "react-hook-form";
import { useSettings } from "@/hooks/use-settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/hooks/use-auth";

export default function ItemsPage() {
  const { selectedBranchId, branches } = useBranch();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const { t } = useSettings();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: paginatedData, isLoading } = useItems({ 
    branchId: selectedBranchId || undefined, 
    page, 
    limit, 
    search: debouncedSearch 
  });

  const { data: allItemsData, isLoading: isAllLoading } = useItems({
    branchId: selectedBranchId || undefined,
    search: debouncedSearch,
    all: true
  });
  
  const deleteByBranch = useDeleteItemsByBranch();
  const { can } = usePermissions();
  const canDelete = isAdmin || can("master_barang", "delete");

  const { items = [], total = 0, pages = 0 } = (paginatedData as PaginatedItems) || {};
  const allItems = Array.isArray(allItemsData) ? allItemsData : [];
  const itemsData = paginatedData as PaginatedItems;

  useEffect(() => {
    setPage(1);
  }, [selectedBranchId, debouncedSearch]);

  const handleExportExcel = () => {
    if (isAllLoading) return;
    const dataToExport = allItems.map((item, index) => ({
      "No": index + 1,
      "Kode Barang": item.code,
      "Nama Barang": item.name,
      "Kode Brand": item.brandCode,
      "Harga Grosir": item.wholesalePrice,
      "Harga Semi Grosir": item.semiWholesalePrice,
      "Harga Retail": item.retailPrice
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Barang");
    XLSX.writeFile(wb, `master-barang-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const handleExportPDF = () => {
    if (isAllLoading) return;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });
    
    doc.setFontSize(16);
    doc.text("Laporan Master Barang", doc.internal.pageSize.getWidth() / 2, 16, { align: "center" });
    doc.setFontSize(10);
    const selectedBranch = branches.find(b => b.id === selectedBranchId);
    doc.text(`Cabang: ${selectedBranch?.name || "-"}`, 14, 23);
    doc.text(`Tanggal: ${format(new Date(), "PPpp")}`, doc.internal.pageSize.getWidth() - 14, 23, { align: "right" });
    
    const tableData = allItems.map((item, index) => [
      index + 1,
      item.code,
      item.name,
      item.brandCode,
      new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.wholesalePrice),
      new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.semiWholesalePrice),
      new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.retailPrice)
    ]);

    autoTable(doc, {
      startY: 32,
      head: [["No", "Kode", "Nama Barang", "Brand", "Grosir", "Semi", "Retail"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { fontStyle: "bold", cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { halign: "center", fontStyle: "bold", cellWidth: 25 },
        4: { halign: "right", cellWidth: 'wrap' },
        5: { halign: "right", cellWidth: 'wrap' },
        6: { halign: "right", cellWidth: 'wrap' }
      }
    });
    
    doc.save(`master-barang-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const handleDownloadTemplate = () => {
    const data = [
      {
        "Kode Barang": "CONTOH-001",
        "Nama Barang": "Barang Contoh A",
        "Kode Brand": "BRD-01",
        "Harga Grosir": 50000,
        "Harga Semi Grosir": 55000,
        "Harga Retail": 60000,
        "Stock": 100
      },
      {
        "Kode Barang": "CONTOH-002",
        "Nama Barang": "Barang Contoh B",
        "Kode Brand": "BRD-02",
        "Harga Grosir": 75000,
        "Harga Semi Grosir": 80000,
        "Harga Retail": 85000,
        "Stock": 50
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Upload");
    XLSX.writeFile(wb, "template-upload-barang.xlsx");
  };

  return (
    <div className="space-y-6">
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 pt-8 pb-24 px-4 md:px-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse" />
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-2xl -ml-10 -mb-10" />
           
           <div className="max-w-7xl mx-auto relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shadow-inner">
                       <Package className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-sm px-3 py-0.5 rounded-full font-black text-[10px] tracking-widest uppercase">
                       {total} ITEMS TOTAL
                    </Badge>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-md">
                    {t("Master Barang", "Master Barang")}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {(isAdmin || can("master_barang", "input")) && <BulkImportDialog />}
                    {(isAdmin || can("master_barang", "export")) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button disabled={isAllLoading} variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-2xl h-12 px-6 font-bold shadow-lg backdrop-blur-sm transition-all group flex-1 xs:flex-none">
                            <Download className={cn("w-5 h-5 mr-2", isAllLoading ? "animate-spin" : "group-hover:bounce")} />
                            {isAllLoading ? "Loading..." : "Export"}
                            <ChevronDown className="ml-2 w-4 h-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-2xl">
                           <DropdownMenuItem onClick={handleExportExcel} className="rounded-xl p-3 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 group">
                              <FileSpreadsheet className="w-5 h-5 mr-3 text-emerald-600 transition-transform" />
                              <div className="flex flex-col">
                                 <span className="font-bold text-slate-700">Excel</span>
                                 <span className="text-[10px] text-slate-400">Export ke .xlsx</span>
                              </div>
                           </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportPDF} className="rounded-xl p-3 cursor-pointer hover:bg-rose-50 focus:bg-rose-50 group mt-1">
                               <FileText className="w-5 h-5 mr-3 text-rose-600 transition-transform" />
                               <div className="flex flex-col">
                                  <span className="font-bold text-slate-700">PDF Document</span>
                                  <span className="text-[10px] text-slate-400">Format siap cetak</span>
                               </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDownloadTemplate} className="rounded-xl p-3 cursor-pointer hover:bg-amber-50 focus:bg-amber-50 group mt-1">
                               <Download className="w-5 h-5 mr-3 text-amber-600 transition-transform" />
                               <div className="flex flex-col">
                                  <span className="font-bold text-slate-700">Download Template</span>
                                  <span className="text-[10px] text-slate-400">Template upload Excel</span>
                               </div>
                            </DropdownMenuItem>
                         </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-white border-none rounded-2xl h-12 px-6 font-black shadow-lg shadow-rose-900/20 active:scale-95 transition-all flex-1 xs:flex-none">
                            <Trash2 className="w-5 h-5 mr-2" />
                            Hapus
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                          <div className="bg-rose-600 p-8 text-white">
                             <AlertDialogHeader>
                               <div className="flex items-center gap-3 mb-2">
                                  <AlertTriangle className="w-8 h-8 text-rose-200" />
                                  <AlertDialogTitle className="text-3xl font-black tracking-tight">Hapus Data?</AlertDialogTitle>
                               </div>
                               <AlertDialogDescription className="text-rose-100 font-bold opacity-90 text-base leading-relaxed">
                                  Operasi ini akan menghapus semua barang di cabang ini secara permanen.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                          </div>
                          <div className="p-8 bg-white">
                             <AlertDialogFooter className="gap-3">
                               <AlertDialogCancel className="h-14 rounded-2xl font-bold text-slate-400 border-none hover:bg-slate-50">Batal</AlertDialogCancel>
                               <AlertDialogAction onClick={() => deleteByBranch.mutate(selectedBranchId!)} className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black px-10 shadow-xl">
                                  Hapus Sekarang
                               </AlertDialogAction>
                             </AlertDialogFooter>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {(isAdmin || can("master_barang", "input")) && (
                    <div className="w-full xs:w-auto">
                      <ItemDialog />
                    </div>
                  )}
                </div>
              </div>
           </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 mb-8 relative z-20">
           <Card className="border-none shadow-2xl shadow-indigo-200/50 rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
              <CardContent className="p-4 md:p-6">
                 <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 transition-colors group-focus-within:text-indigo-600" />
                      <Input
                        placeholder="Cari nama barang atau kode..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-16 pl-14 pr-6 bg-slate-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-3xl font-bold text-lg transition-all"
                      />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto h-16 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm items-center">
                       <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-12 w-12 rounded-2xl">
                          <List className={cn("w-5 h-5", viewMode === 'list' ? "text-indigo-600" : "text-slate-400")} />
                       </Button>
                       <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="h-12 w-12 rounded-2xl">
                          <LayoutGrid className={cn("w-5 h-5", viewMode === 'grid' ? "text-indigo-600" : "text-slate-400")} />
                       </Button>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-slate-200 rounded-[2.5rem]" />
              ))}
            </div>
          ) : viewMode === 'list' ? (
             <>
              <div className="hidden md:block overflow-hidden rounded-[2.5rem] border border-slate-100 shadow-xl bg-white">
                 <Table>
                   <TableHeader>
                     <TableRow className="border-none hover:bg-transparent bg-slate-50/50 h-16">
                       <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] w-[150px]">Kode</TableHead>
                       <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Nama Barang</TableHead>
                       <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-center">Brand</TableHead>
                       <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right">Grosir</TableHead>
                       <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right">Semi</TableHead>
                       <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right pr-8">Retail</TableHead>
                       <TableHead className="w-[100px]"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {items.length === 0 ? (
                       <TableRow><TableCell colSpan={7} className="h-80 text-center text-slate-300 font-bold">Tidak ada data</TableCell></TableRow>
                     ) : (
                       items.map((item) => (
                         <TableRow key={item.id} className="group border-slate-50 hover:bg-indigo-50/20 transition-all">
                           <TableCell className="pl-8 py-4">
                              <div className="font-mono text-[11px] font-black text-slate-400 bg-slate-100 py-1 px-2.5 rounded-lg w-fit leading-none">
                                 {item.code}
                              </div>
                           </TableCell>
                           <TableCell className="py-4">
                              <div className="flex flex-col">
                                 <span className="font-bold text-slate-800 text-sm uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{item.name}</span>
                              </div>
                           </TableCell>
                           <TableCell className="py-4 text-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-50 rounded px-2 py-0.5 border border-slate-100">{item.brandCode}</span>
                           </TableCell>
                           <TableCell className="py-4 text-right">
                              <span className="font-mono text-xs font-semibold text-slate-500">
                                 {new Intl.NumberFormat("id-ID").format(item.wholesalePrice)}
                              </span>
                           </TableCell>
                           <TableCell className="py-4 text-right">
                              <span className="font-mono text-xs font-semibold text-indigo-400">
                                 {new Intl.NumberFormat("id-ID").format(item.semiWholesalePrice)}
                              </span>
                           </TableCell>
                           <TableCell className="py-4 text-right pr-8">
                              <span className="font-mono text-sm font-bold text-indigo-600">
                                 {new Intl.NumberFormat("id-ID").format(item.retailPrice)}
                              </span>
                           </TableCell>
                             <div className="flex items-center justify-end gap-2 text-right pr-4 opacity-0 group-hover:opacity-100 transition-all">
                                {(isAdmin || can("master_barang", "edit")) && <ItemDialog item={item} />}
                                {(isAdmin || can("master_barang", "delete")) && <DeleteItemButton id={item.id} name={item.name} />}
                             </div>
                         </TableRow>
                       ))
                     )}
                   </TableBody>
                 </Table>
              </div>

              {/* Mobile List View */}
              <div className="md:hidden space-y-3">
                {items.length === 0 ? (
                  <Card className="p-12 text-center rounded-[2rem] border-dashed border-slate-200">
                    <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Tidak ada data barang</p>
                  </Card>
                ) : (
                  items.map((item) => (
                    <Card key={item.id} className="border-none shadow-premium rounded-2xl overflow-hidden bg-white active:scale-[0.98] transition-all">
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase font-mono">{item.code}</span>
                              {item.brandCode && <span className="text-[9px] font-black text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">{item.brandCode}</span>}
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm leading-tight uppercase line-clamp-2">{item.name}</h3>
                          </div>
                          <div className="flex items-center gap-1 ml-4 pt-1">
                             {(isAdmin || can("master_barang", "edit")) && <ItemDialog item={item} />}
                             {(isAdmin || can("master_barang", "delete")) && <DeleteItemButton id={item.id} name={item.name} />}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50">
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Grosir</span>
                              <span className="text-[10px] font-bold text-slate-600 font-mono">
                                 {new Intl.NumberFormat("id-ID").format(item.wholesalePrice)}
                              </span>
                           </div>
                           <div className="flex flex-col items-center">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Semi</span>
                              <span className="text-[10px] font-bold text-indigo-500 font-mono">
                                 {new Intl.NumberFormat("id-ID").format(item.semiWholesalePrice)}
                              </span>
                           </div>
                           <div className="flex flex-col items-end text-right">
                              <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest mb-1 text-right">Retail</span>
                              <span className="text-[10px] font-bold text-indigo-700 font-mono">
                                 {new Intl.NumberFormat("id-ID").format(item.retailPrice)}
                              </span>
                           </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
             </>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {items.map((item) => (
                 <Card key={item.id} className="border-none shadow-xl rounded-[2.5rem] overflow-hidden group hover:ring-2 hover:ring-indigo-500/20 transition-all">
                    <div className="p-8">
                       <div className="flex justify-between items-start mb-6">
                          <div className="font-mono text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">{item.code}</div>
                          <div className="flex items-center gap-1">
                             {(isAdmin || can("master_barang", "edit")) && <ItemDialog item={item} />}
                             {(isAdmin || can("master_barang", "delete")) && <DeleteItemButton id={item.id} name={item.name} />}
                          </div>
                       </div>
                       <h3 className="text-2xl font-black text-slate-800 leading-none uppercase tracking-tighter mb-4 line-clamp-2 min-h-[3rem]">{item.name}</h3>
                       <div className="space-y-2">
                          <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grosir / Semi</span>
                             <span className="font-mono text-[11px] font-bold text-slate-600">
                                {new Intl.NumberFormat("id-ID").format(item.wholesalePrice)} / {new Intl.NumberFormat("id-ID").format(item.semiWholesalePrice)}
                             </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/30">
                             <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Retail</span>
                             <span className="font-mono text-lg font-black text-indigo-600">Rp {new Intl.NumberFormat("id-ID").format(item.retailPrice)}</span>
                          </div>
                       </div>
                    </div>
                 </Card>
               ))}
             </div>
          )}

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-12 border-t border-slate-100 mt-12">
             <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-400">Baris:</span>
                <Select value={limit.toString()} onValueChange={(val) => { setLimit(parseInt(val)); setPage(1); }}>
                   <SelectTrigger className="w-24 h-12 bg-white border-slate-100 rounded-2xl font-bold"><SelectValue /></SelectTrigger>
                   <SelectContent className="rounded-2xl shadow-xl">{[10, 20, 50, 100].map(val => (<SelectItem key={val} value={val.toString()} className="font-bold">{val}</SelectItem>))}</SelectContent>
                </Select>
             </div>

             <div className="flex items-center gap-2">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)} className="h-12 w-12 rounded-2xl bg-white border-slate-100"><ChevronLeft className="w-5 h-5"/></Button>
                <div className="flex items-center gap-2 px-4 h-12 bg-white border border-slate-100 rounded-2xl">
                   <span className="text-sm font-black text-indigo-600 px-3 py-1 bg-indigo-50 rounded-lg">{page}</span>
                   <span className="text-sm font-bold text-slate-300">/</span>
                   <span className="text-sm font-black text-slate-700">{itemsData?.pages || 1}</span>
                </div>
                <Button variant="outline" disabled={page >= (itemsData?.pages || 1)} onClick={() => setPage(page + 1)} className="h-12 w-12 rounded-2xl bg-white border-slate-100"><ChevronRight className="w-5 h-5"/></Button>
             </div>
          </div>
        </div>
      </div>
  );
}

function ItemDialog({ item }: { item?: Item }) {
  const [open, setOpen] = useState(false);
  const createMut = useCreateItem();
  const updateMut = useUpdateItem();
  const isEdit = !!item;
  const { t } = useSettings();
  const { selectedBranchId, branches } = useBranch();

  const form = useForm<z.infer<typeof insertItemSchema>>({
    resolver: zodResolver(insertItemSchema),
    defaultValues: {
      code: item?.code || "",
      name: item?.name || "",
      brandCode: item?.brandCode || "",
      wholesalePrice: item?.wholesalePrice || 0,
      semiWholesalePrice: item?.semiWholesalePrice || 0,
      retailPrice: item?.retailPrice || 0,
      branchId: item?.branchId || null,
    },
  });

  const onSubmit = (data: z.infer<typeof insertItemSchema>) => {
    if (isEdit) {
      updateMut.mutate({ id: item.id, ...data }, { onSuccess: () => setOpen(false) });
    } else {
      createMut.mutate(data, { onSuccess: () => { setOpen(false); form.reset(); } });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (!isEdit && open && selectedBranchId) {
      form.setValue("branchId", selectedBranchId);
    }
  }, [isEdit, open, selectedBranchId, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-lg transition-all active:scale-90">
            <Edit2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 transition-all active:scale-95 font-black rounded-xl h-10 px-6">
            <Plus className="w-4 h-4 mr-2" /> <span>Tambah Barang</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-slate-50/50 backdrop-blur-xl">
        <div className="h-32 bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative flex items-center">
          <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <DialogHeader className="relative z-10 flex-1">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner">
                    <Package className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <DialogTitle className="text-3xl font-black tracking-tight drop-shadow-sm">{isEdit ? "Edit Barang" : "Barang Baru"}</DialogTitle>
                    <DialogDescription className="text-indigo-100 font-bold opacity-80">{isEdit ? "Perbarui informasi produk." : "Tambahkan produk baru."}</DialogDescription>
                 </div>
              </div>
          </DialogHeader>
        </div>

        <div className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                    <Monitor className="w-3 h-3" /> Kode Produk
                  </Label>
                  <Input id="code" {...form.register("code")} placeholder="SEM-001" className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-mono uppercase font-black focus:ring-indigo-500 transition-all" />
                  {form.formState.errors.code && <p className="text-[10px] text-rose-500 font-bold px-1">{form.formState.errors.code.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandCode" className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                    <Info className="w-3 h-3" /> Brand / Merk
                  </Label>
                  <Input id="brandCode" {...form.register("brandCode")} placeholder="Merk" className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-bold uppercase focus:ring-indigo-500 transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                  <Package className="w-3 h-3" /> Nama Lengkap Barang
                </Label>
                <Input id="name" {...form.register("name")} placeholder="..." className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-bold focus:ring-indigo-500 transition-all" />
                {form.formState.errors.name && <p className="text-[10px] text-rose-500 font-bold px-1">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                  <Building2 className="w-3 h-3" /> Cabang Penempatan
                </Label>
                <Controller
                  control={form.control}
                  name="branchId"
                  render={({ field }: { field: any }) => (
                    <Select onValueChange={(val) => field.onChange(val === "null" ? null : parseInt(val))} value={field.value?.toString() || "null"}>
                      <SelectTrigger className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-bold focus:ring-indigo-500 transition-all"><SelectValue placeholder="Pilih Cabang" /></SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-xl">
                        <SelectItem value="null" className="font-bold">Semua Cabang (Global)</SelectItem>
                        {branches.map((b) => (<SelectItem key={b.id} value={b.id.toString()} className="font-bold">{b.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="bg-white/50 border border-slate-100 p-6 rounded-[2.5rem] shadow-inner space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-400 text-center block leading-none">Grosir</Label>
                    <Controller
                      control={form.control}
                      name="wholesalePrice"
                      render={({ field }: { field: any }) => (
                        <Input 
                          placeholder="0" 
                          value={field.value ? new Intl.NumberFormat("id-ID").format(field.value) : ""} 
                          onChange={(e) => field.onChange(parseInt(e.target.value.replace(/\D/g, "")) || 0)}
                          className="h-11 border-slate-100 bg-white shadow-sm rounded-xl font-mono text-center text-xs font-bold focus:ring-indigo-500" 
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-400 text-center block leading-none">Semi</Label>
                    <Controller
                      control={form.control}
                      name="semiWholesalePrice"
                      render={({ field }: { field: any }) => (
                        <Input 
                          placeholder="0" 
                          value={field.value ? new Intl.NumberFormat("id-ID").format(field.value) : ""} 
                          onChange={(e) => field.onChange(parseInt(e.target.value.replace(/\D/g, "")) || 0)}
                          className="h-11 border-slate-100 bg-white shadow-sm rounded-xl font-mono text-center text-xs font-bold focus:ring-indigo-500" 
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-indigo-500 text-center block leading-none">Retail</Label>
                    <Controller
                      control={form.control}
                      name="retailPrice"
                      render={({ field }: { field: any }) => (
                        <Input 
                          placeholder="0" 
                          value={field.value ? new Intl.NumberFormat("id-ID").format(field.value) : ""} 
                          onChange={(e) => field.onChange(parseInt(e.target.value.replace(/\D/g, "")) || 0)}
                          className="h-11 border-indigo-100 bg-indigo-50/30 shadow-sm rounded-xl font-mono text-center text-xs font-black text-indigo-700" 
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-slate-100 items-center justify-end gap-3 sm:flex-row flex-col-reverse">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 w-full sm:w-auto rounded-2xl font-bold text-slate-500 px-6">Batal</Button>
              <Button type="submit" disabled={isPending} className="h-12 w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-2xl font-black px-10 shadow-lg transition-all active:scale-95 flex items-center gap-2">
                {isPending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Simpan Data</span>}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function DeleteItemButton({ id, name }: { id: number, name: string }) {
  const [open, setOpen] = useState(false);
  const deleteMut = useDeleteItem();

  const handleConfirm = () => {
    deleteMut.mutate(id, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-slate-50/50 backdrop-blur-xl">
         <div className="h-32 bg-gradient-to-br from-rose-600 to-rose-700 p-8 text-white relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-[-10%] left-[-5%] w-24 h-24 bg-rose-400/20 rounded-full blur-xl" />
            
            <DialogHeader className="relative z-10">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <Trash2 className="w-5 h-5 text-white" />
                 </div>
                 <div>
                    <DialogTitle className="text-2xl font-black tracking-tight drop-shadow-sm">Hapus Barang</DialogTitle>
                    <DialogDescription className="text-rose-100 font-bold opacity-90">Konfirmasi penghapusan data produk.</DialogDescription>
                 </div>
              </div>
            </DialogHeader>
         </div>

         <div className="p-8">
            <div className="mb-8">
              <div className="flex flex-col items-center text-center gap-4 py-4">
                 <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                 </div>
                 <div>
                    <p className="font-bold text-slate-600 leading-relaxed">
                       Apakah Anda yakin ingin menghapus barang <br/>
                       <span className="text-slate-900 text-lg underline decoration-rose-200 decoration-4 underline-offset-4">{name}</span>?
                    </p>
                    <div className="mt-4 px-4 py-3 bg-rose-50/50 border border-rose-100 rounded-2xl flex gap-3 text-left">
                       <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                       <p className="text-[10px] text-rose-500 font-black uppercase leading-tight tracking-wider">
                          Tindakan ini bersifat permanen dan akan menghapus data produk ini dari inventori pusat.
                       </p>
                    </div>
                 </div>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:flex-row flex-col-reverse">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setOpen(false)} 
                className="h-12 w-full sm:w-auto rounded-xl font-bold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleConfirm} 
                disabled={deleteMut.isPending} 
                className="h-12 w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black px-8 shadow-lg shadow-rose-100 transition-all active:scale-95 flex items-center gap-2"
              >
                {deleteMut.isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Permanen</span>
                  </>
                )}
              </Button>
            </DialogFooter>
         </div>
      </DialogContent>
    </Dialog>
  );
}
function BulkImportDialog() {
  const [open, setOpen] = useState(false);
  const [pasteData, setPasteData] = useState("");
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const { mutate: bulkCreate, isPending } = useBulkCreateItem();
  const { selectedBranchId, branches } = useBranch();
  // Default to the first branch if currently in Global view to force a branch selection
  const [importBranchId, setImportBranchId] = useState<number | null>(selectedBranchId || (branches.length > 0 ? branches[0].id : null));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync import branch when dialog opens, but avoid null if possible
  useEffect(() => {
    if (open && selectedBranchId) {
      setImportBranchId(selectedBranchId);
    } else if (open && !importBranchId && branches.length > 0) {
      setImportBranchId(branches[0].id);
    }
  }, [open, selectedBranchId, branches]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setFileData(data);
      } catch (err) {
        console.error("Gagal membaca file:", err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const previewItems = useMemo(() => {
    let itemsToImport: any[] = [];

    if (pasteData.trim()) {
      const lines = pasteData.trim().split("\n");
      itemsToImport = lines.map(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return null;

        const pricePattern = /(?:Rp\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/gi;
        const allMatches = Array.from(cleanLine.matchAll(pricePattern));
        const numericValues = allMatches.map(m => m[1].replace(/[^\d]/g, ""));
        const parts = cleanLine.split(/\t|;/).map(p => p.trim());
        
        if (parts.length >= 4) {
          const wholesale = parts[3].replace(/[^\d]/g, "");
          const semi = parts[4] ? parts[4].replace(/[^\d]/g, "") : wholesale;
          const retail = parts[5] ? parts[5].replace(/[^\d]/g, "") : (parts[4] || wholesale);
          
          return {
            code: parts[0].toUpperCase(),
            name: parts[1],
            brandCode: parts[2],
            wholesalePrice: parseInt(wholesale || "0"),
            semiWholesalePrice: parseInt(semi || wholesale || "0"),
            retailPrice: parseInt(retail || semi || "0")
          };
        }

        if (numericValues.length >= 1) {
          // Identify prices from the end of the line: Retail is last, then Semi, then Wholesale
          const retail = numericValues[numericValues.length - 1];
          const semi = numericValues.length >= 2 ? numericValues[numericValues.length - 2] : retail;
          const wholesale = numericValues.length >= 3 ? numericValues[numericValues.length - 3] : (numericValues.length >= 2 ? numericValues[numericValues.length - 2] : retail);

          let namePart = cleanLine;
          const matchesInReverse = [...allMatches].reverse();
          // Remove up to 3 numeric matches used as prices
          const usedMatches = matchesInReverse.slice(0, Math.min(3, numericValues.length));
          for (const m of usedMatches) {
            const index = namePart.lastIndexOf(m[0]);
            if (index !== -1) namePart = namePart.substring(0, index).trim();
          }
          const words = namePart.split(/\s+/).filter(Boolean);
          const code = words[0]?.toUpperCase() || "";
          const brandCode = words.length > 2 ? words[words.length - 1] : "GENERIC";
          const name = words.length > 2 ? words.slice(1, words.length - 1).join(" ") : words.slice(1).join(" ") || "Tanpa Nama";

          return {
            code, name, brandCode,
            wholesalePrice: parseInt(wholesale),
            semiWholesalePrice: parseInt(semi),
            retailPrice: parseInt(retail)
          };
        }
        return null;
      }).filter(Boolean);
    } else if (fileData.length > 0) {
      itemsToImport = fileData.map((row: any) => {
        // Create a normalized object with trimmed, lowercase keys
        const r: Record<string, any> = {};
        Object.keys(row).forEach(k => {
          r[k.trim().toLowerCase()] = row[k];
        });

        const getVal = (keys: string[], numeric = false) => {
          for (const k of keys) {
            const val = r[k.toLowerCase()];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              const strVal = String(val).trim();
              return numeric ? strVal.replace(/[^\d]/g, "") : strVal;
            }
          }
          return null;
        };

        const rawRetail = getVal(["Harga Retail", "Harga Ret", "Retail", "retail", "Harga Jual", "Jual"], true);
        const rawSemi = getVal(["Harga Semi Grosir", "Harga Ser", "Semi Grosir", "semi", "Semi"], true);
        const rawWholesale = getVal(["Harga Grosir", "Harga Gro", "Grosir", "grosir", "Harga", "Price", "price"], true);

        // Logical fallback chain: stay independent if possible
        const wholesale = rawWholesale || rawSemi || rawRetail || "0";
        const semi = rawSemi || wholesale;
        const retail = rawRetail || semi;
        
        const branchName = (getVal(["Cabang", "Branch"]) || "").toLowerCase();
        const branch = branches.find(b => b.name.toLowerCase() === branchName);
        
        return {
          code: (getVal(["Kode Barang", "Kode Bara", "Kode", "code"]) || "").toUpperCase(),
          name: getVal(["Nama Barang", "Nama", "name"]) || "Tanpa Nama",
          brandCode: getVal(["Brand/Merk", "Brand", "brand", "Merk", "merk", "Kode Brand"]) || "GENERIC",
          wholesalePrice: parseInt(wholesale || "0"),
          semiWholesalePrice: parseInt(semi || wholesale || "0"),
          retailPrice: parseInt(retail || semi || "0"),
          branchId: branch?.id || null
        };
      });
    }

    return itemsToImport.filter(item => item && item.code && item.name).map(item => ({ 
      ...item, 
      branchId: item.branchId || importBranchId 
    }));
  }, [pasteData, fileData, importBranchId, branches]);

  const handleImport = () => {
    if (previewItems.length > 0) {
      bulkCreate(previewItems, { 
        onSuccess: () => { 
          setOpen(false); 
          setPasteData(""); 
          setFileData([]); 
          setFileName("");
          if (fileInputRef.current) fileInputRef.current.value = "";
        } 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-white rounded-xl font-bold shadow-sm border-slate-200">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span className="hidden md:inline">Import Data</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px] w-[95vw] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-slate-50/50 backdrop-blur-xl">
        <div className="h-36 bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-5%] w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/10 rounded-[1.5rem] backdrop-blur-md shadow-inner">
                <FileSpreadsheet className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black tracking-tight drop-shadow-sm">Bulk Import Barang</DialogTitle>
                <DialogDescription className="text-slate-400 font-bold opacity-90">Impor massal data inventori via Excel atau Copy-Paste.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                 <Building2 className="h-3 w-3" /> Cabang Tujuan
               </Label>
               <Select 
                 onValueChange={(val) => setImportBranchId(val === "null" ? null : parseInt(val))} 
                 value={importBranchId?.toString() || "null"}
               >
                 <SelectTrigger className="h-12 bg-white border-slate-100 shadow-sm rounded-2xl font-bold focus:ring-indigo-500 transition-all">
                   <SelectValue placeholder="Pilih Cabang" />
                 </SelectTrigger>
                 <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                   {branches.map((b) => (
                     <SelectItem key={b.id} value={b.id.toString()} className="rounded-xl font-bold">{b.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter px-1 flex items-center gap-1">
                 <Info className="w-3 h-3 text-indigo-400" /> Item otomatis masuk ke cabang terpilih.
               </p>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                 <Upload className="h-4 w-4 text-emerald-600" /> Upload Excel
              </Label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-[2rem] p-6 text-center cursor-pointer transition-all group flex flex-col items-center justify-center min-h-[100px]",
                  fileName ? "border-emerald-300 bg-emerald-50/20" : "border-slate-100 bg-white group-hover:border-indigo-400 group-hover:bg-indigo-50/30"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload} 
                />
                {fileName ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                    <p className="text-xs font-black text-slate-800 truncate max-w-[200px]">{fileName}</p>
                    <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mt-1">Siap Impor</p>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="h-8 w-8 text-slate-300 mb-2 group-hover:scale-110 transition-transform group-hover:text-indigo-400" />
                    <p className="text-xs font-bold text-slate-500 group-hover:text-indigo-600">Klik / Tarik Excel</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Metode Copy-Paste</Label>
               {pasteData && <button onClick={() => setPasteData("")} className="text-[10px] font-black text-rose-500 uppercase hover:underline">Hapus Data</button>}
            </div>
            <Textarea 
              placeholder="Kode Barang [tab] Nama Barang [tab] Brand [tab] Harga..." 
              className="min-h-[150px] rounded-[2rem] border-slate-100 bg-white shadow-sm font-mono text-xs focus:ring-indigo-500 p-6"
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              disabled={!!fileName}
            />
            <div className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl flex gap-3">
               <div className="p-2 bg-indigo-100 rounded-xl h-fit">
                  <Monitor className="w-4 h-4 text-indigo-600" />
               </div>
               <div className="text-[10px] text-indigo-700 leading-relaxed font-bold">
                  <p className="uppercase tracking-widest mb-1 text-indigo-900 border-none">Urutan Kolom:</p>
                  <p>1. Kode &bull; 2. Nama &bull; 3. Brand &bull; 4. Harga Grosir &bull; 5. Semi &bull; 6. Retail</p>
               </div>
            </div>
          </div>

          {previewItems.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                   Pratinjau {previewItems.length} Produk
                </Label>
              </div>
              <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-premium bg-white">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none">
                      <TableHead className="h-10 text-[9px] font-black uppercase text-slate-400 tracking-wider">Nama</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-slate-400 tracking-wider text-right">Grosir</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-slate-400 tracking-wider text-right">Retail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewItems.slice(0, 3).map((item, idx) => (
                      <TableRow key={idx} className="border-slate-50">
                        <TableCell className="py-3">
                           <div className="font-bold text-slate-800 text-[11px] truncate max-w-[200px]">{item.name}</div>
                           <div className="text-[9px] font-black text-indigo-500">{item.code}</div>
                        </TableCell>
                        <TableCell className="py-3 text-right font-mono text-[10px] font-bold text-slate-600">
                           {new Intl.NumberFormat("id-ID").format(item.wholesalePrice)}
                        </TableCell>
                        <TableCell className="py-3 text-right font-mono text-[10px] font-black text-indigo-600">
                           {new Intl.NumberFormat("id-ID").format(item.retailPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {previewItems.length > 3 && (
                      <TableRow className="border-none bg-slate-50/30">
                        <TableCell colSpan={3} className="py-2 text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">
                          ... +{previewItems.length - 3} PRODUK LAINNYA
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-8 border-t border-slate-50 items-center justify-end gap-3 sm:flex-row flex-col-reverse">
          <Button 
            variant="ghost" 
            onClick={() => setOpen(false)} 
            className="h-12 w-full sm:w-auto rounded-2xl font-bold text-slate-400 hover:bg-slate-100"
          >
            Batal
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isPending || (!pasteData.trim() && !fileData.length)}
            className="h-14 w-full sm:w-auto min-w-[200px] bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white rounded-2xl font-black shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {isPending ? (
               <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengimpor...</span>
               </>
            ) : (
               <>
                  <Upload className="w-5 h-5 text-emerald-400" />
                  <span>Mulai Impor Sekarang</span>
               </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
