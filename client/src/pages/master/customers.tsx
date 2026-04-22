import { useState, useRef, useMemo } from "react";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/use-customers";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

import { usePermissions } from "@/hooks/use-permissions";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Phone, Download, Monitor, FileSpreadsheet, FileText, MapPin, Building2, AlertCircle, Info, CheckCircle2, ArrowLeft, Search, RotateCcw, Upload, LayoutGrid, List } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { useBranch } from "@/hooks/use-branch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Controller } from "react-hook-form";
import { useSettings } from "@/hooks/use-settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { selectedBranch, branches } = useBranch();
  const { data: customers = [], isLoading } = useCustomers();
  const { can } = usePermissions();
  const { t } = useSettings();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [openPreview, setOpenPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const filtered = useMemo(() => {
    return customers
      .filter(c => 
        c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
        c.code?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.phone?.includes(debouncedSearch)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, debouncedSearch]);

  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const displayedItems = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleExportExcel = () => {
    const dataToExport = filtered.map((c, index) => ({
      "No": index + 1,
      "Kode": c.code,
      "Nama Pelanggan": c.name,
      "Telepon": c.phone || "-",
      "Alamat": c.address || "-",
      "Kota": c.city || "-",
      "Jenis Harga": c.priceType === 'wholesale' ? 'Grosir' : c.priceType === 'semi_wholesale' ? 'Semi Grosir' : 'Retail'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Pelanggan");
    XLSX.writeFile(wb, `laporan-pelanggan-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(16);
    doc.text("Daftar Pelanggan", 14, 20);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);

    const tableColumn = ["Kode", "Nama Pelanggan", "No Telp", "Alamat", "Kota", "Tipe Harga"];
    const tableData = filtered.map(c => [
      c.code || "-",
      c.name,
      c.phone || "-",
      c.address,
      c.city || "-",
      c.priceType === 'wholesale' ? 'Grosir' : c.priceType === 'semi_wholesale' ? 'Semi' : 'Retail'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [tableColumn],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 }, // Kode
        2: { cellWidth: 35 }, // No Telp
        5: { cellWidth: 30 }, // Tipe Harga
      }
    });

    doc.save(`daftar-pelanggan-${format(new Date(), "yyyyMMdd")}.pdf`);
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
          <title>Cetak Daftar Pelanggan</title>
          <style>
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { font-family: 'Inter', sans-serif; color: #334155; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #f1f5f9 !important; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
              th, td { border: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; font-size: 10px; }
              .header { margin-bottom: 30px; border-bottom: 2px solid #334155; padding-bottom: 10px; }
              .header h1 { margin: 0; font-size: 24px; color: #1e293b; }
              .header p { margin: 5px 0 0; font-size: 12px; color: #64748b; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daftar Pelanggan</h1>
            <p>Dicetak pada: ${format(new Date(), "dd MMMM yyyy, HH:mm", { locale: id })}</p>
          </div>
          ${printContent}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownloadTemplate = () => {
    const data = [
      { 
        "Kode": "CUST-001",
        "Nama Pelanggan": "Toko Berkah Jaya", 
        "Telepon": "081234567890", 
        "Alamat": "Jl. Merdeka No. 12", 
        "Kota": "Jakarta",
        "Jenis Harga": "Retail" 
      },
      { 
        "Kode": "CUST-002",
        "Nama Pelanggan": "Grosir Maju Mapan", 
        "Telepon": "08987654321", 
        "Alamat": "Kawasan Industri Blok C", 
        "Kota": "Surabaya",
        "Jenis Harga": "Grosir" 
      }
    ];
    // Use explicit header to guarantee order
    const ws = XLSX.utils.json_to_sheet(data, { 
      header: ["Kode", "Nama Pelanggan", "Telepon", "Alamat", "Kota", "Jenis Harga"] 
    });
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Master Pelanggan");
    XLSX.writeFile(wb, "template-pelanggan-v2.xlsx");
  };

  return (
    <>
      <div className="relative min-h-[calc(100vh-5rem)] pb-12 overflow-x-hidden">
        {/* Super App Header: Blue/Indigo Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] md:w-full h-[220px] md:h-[240px] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 md:rounded-b-[3rem] rounded-b-[20%] -z-10 shadow-2xl overflow-hidden text-white">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[100%] bg-white/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-20%] right-[-5%] w-[40%] h-[70%] bg-blue-300/10 rounded-full blur-[60px]" />
        </div>

        <div className="pt-4 md:pt-8 px-2 sm:px-4 max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white mb-6 px-2 md:px-4">
            <div className="flex items-center gap-3">
               <button onClick={() => window.history.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ArrowLeft className="w-6 h-6" />
               </button>
               <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight leading-none drop-shadow-md">
                   {t('page_master_customers_title', 'Master Pelanggan')}
                </h1>
                <p className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">
                   {t('page_master_customers_desc', 'Database Klien & Manajemen Area')}
                </p>
                {selectedBranch?.name && (
                  <Badge className="mt-2 bg-white/20 hover:bg-white/30 text-white border-white/20 font-bold backdrop-blur-sm shadow-sm px-3 py-1 text-[10px] rounded-full flex gap-1 items-center w-fit">
                    <Building2 className="w-3 h-3" />
                    Cabang: {selectedBranch.name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {(isAdmin || can("master_pelanggan", "export") || can("master_pelanggan", "print")) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-sm rounded-xl px-4 w-[calc(50%-4px)] xs:w-auto">
                        <Download className="w-4 h-4" />
                        <span className="font-bold text-xs xs:text-sm">Export</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-xl border-slate-100 p-2">
                      {(isAdmin || can("master_pelanggan", "print")) && (
                        <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer p-3 rounded-xl hover:bg-slate-50">
                          <Monitor className="w-4 h-4 text-slate-400" /> <span className="font-bold text-sm text-slate-700">Print Layar</span>
                        </DropdownMenuItem>
                      )}
                      {(isAdmin || can("master_pelanggan", "export")) && (
                        <>
                          <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer p-3 rounded-xl hover:bg-slate-50">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> <span className="font-bold text-sm text-emerald-700">Export Excel</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer p-3 rounded-xl hover:bg-slate-50">
                            <FileText className="w-4 h-4 text-rose-500" /> <span className="font-bold text-sm text-rose-700">Export PDF</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {(isAdmin || can("master_pelanggan", "export") || can("master_pelanggan", "print") || can("master_pelanggan", "input")) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-sm rounded-xl px-4 w-[calc(50%-4px)] xs:w-auto"
                    onClick={() => setSearch("")}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="font-bold whitespace-nowrap text-xs xs:text-sm">Reset</span>
                  </Button>
                )}

                {can("master_pelanggan", "input") && (
                  <Button onClick={handleDownloadTemplate} variant="outline" size="sm" className="h-9 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-sm rounded-xl px-4 w-full xs:w-auto">
                    <FileSpreadsheet className="w-4 h-4 text-blue-200" />
                    <span className="font-bold text-xs xs:text-sm font-mono">Template Excel</span>
                  </Button>
                )}
              </div>

              {can("master_pelanggan", "input") && (
                 <div className="bg-white p-1.5 rounded-2xl shadow-xl flex gap-1.5 w-full xs:w-auto mt-2 xs:mt-0">
                    <div className="flex-1 xs:flex-none">
                      <BulkImportDialog />
                    </div>
                    <div className="flex-1 xs:flex-none">
                      <CustomerDialog />
                    </div>
                 </div>
              )}
            </div>
          </div>

          {/* Search Card */}
          <div className="mt-8 mb-6">
               <Card className="border-none shadow-premium bg-white/95 backdrop-blur-md overflow-hidden rounded-2xl border border-white/20">
                  <CardContent className="p-4 flex items-center gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                        <Input 
                          placeholder="Cari pelanggan berdasarkan nama, telepon, atau alamat..." 
                          className="h-12 pl-12 bg-slate-50/50 border-slate-100 focus:ring-indigo-500 rounded-xl font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium transition-all"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                  </CardContent>
               </Card>
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block bg-white rounded-xl shadow-premium border border-slate-100 overflow-hidden mb-8">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none">
                  <TableHead className="w-[120px] font-black text-slate-400 text-[10px] uppercase tracking-wider">Kode</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider">Pelanggan</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider">Kontak</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider">Cabang</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider">Jenis Harga</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider">Alamat</TableHead>
                  <TableHead className="text-right font-black text-slate-400 text-[10px] uppercase tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                      <span className="text-sm text-slate-400 font-bold">Sinkronisasi data...</span>
                    </div>
                  </TableCell></TableRow>
                ) : displayedItems.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Data tidak ditemukan
                  </TableCell></TableRow>
                ) : (
                  displayedItems.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-slate-50/50 transition-colors group border-slate-50">
                      <TableCell>
                        <div className="font-mono text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-center border border-indigo-100/50">
                          {customer.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-800">{customer.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">ID: #{customer.id}</div>
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <div className="flex items-center text-xs font-bold text-slate-600">
                             <Phone className="w-3 h-3 mr-2 text-indigo-400" /> {customer.phone}
                          </div>
                        ) : <span className="text-slate-300">-</span>}
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                          {branches.find(b => b.id === customer.branchId)?.name || "Global"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "rounded-lg font-black text-[9px] uppercase tracking-tighter border-none",
                          customer.priceType === 'wholesale' ? 'bg-amber-50 text-amber-600' : 
                          customer.priceType === 'semi_wholesale' ? 'bg-indigo-50 text-indigo-600' :
                          'bg-emerald-50 text-emerald-600'
                        )}>
                          {customer.priceType === 'wholesale' ? 'Grosir' : customer.priceType === 'semi_wholesale' ? 'Semi Grosir' : 'Retail'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-slate-500 font-bold group-hover:text-slate-700 transition-colors" title={customer.address}>
                        {customer.address}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          {can("master_pelanggan", "edit") && <CustomerDialog customer={customer} />}
                          {can("master_pelanggan", "delete") && <DeleteCustomerButton id={customer.id} name={customer.name} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="py-4 border-t border-slate-100 flex items-center justify-between px-6 bg-slate-50/30 rounded-b-[2rem] mb-12 hidden md:flex">
              <p className="text-xs text-slate-500 font-medium">
                Menampilkan <span className="font-bold text-slate-700">{(page - 1) * itemsPerPage + 1}</span> hingga <span className="font-bold text-slate-700">{Math.min(page * itemsPerPage, filtered.length)}</span> dari <span className="font-bold text-slate-700">{filtered.length}</span> entri
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

          {/* Mobile View - Cards */}
          <div className="md:hidden space-y-4">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200">
                 <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                 <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Memuat...</span>
              </div>
            ) : displayedItems.length === 0 ? (
              <div className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
                 <Monitor className="h-16 w-16 mx-auto mb-4 opacity-10 text-slate-400" />
                 <p className="font-black text-slate-800 uppercase tracking-tight">Belum ada pelanggan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {displayedItems.map((customer) => (
                  <div key={customer.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="font-mono text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50">
                            {customer.code}
                          </div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID #{customer.id}</div>
                        </div>
                        <h3 className="font-black text-slate-800 leading-none mb-2">{customer.name}</h3>
                        <div className="flex gap-2">
                           <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 rounded-lg font-bold text-[9px] uppercase tracking-tighter">
                            {branches.find(b => b.id === customer.branchId)?.name || "Global"}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            "rounded-lg font-black text-[9px] uppercase tracking-tighter border-none",
                            customer.priceType === 'wholesale' ? 'bg-amber-50 text-amber-600' : 
                            customer.priceType === 'semi_wholesale' ? 'bg-indigo-50 text-indigo-600' :
                            'bg-emerald-50 text-emerald-600'
                          )}>
                            {customer.priceType === 'wholesale' ? 'Grosir' : customer.priceType === 'semi_wholesale' ? 'Semi' : 'Retail'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                         {can("master_pelanggan", "edit") && <CustomerDialog customer={customer} />}
                         {can("master_pelanggan", "delete") && <DeleteCustomerButton id={customer.id} name={customer.name} />}
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-slate-50">
                      {customer.phone && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                            <Phone className="w-3 h-3 text-indigo-500" />
                          </div>
                          <span className="text-xs font-black text-slate-600">{customer.phone}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                          <MapPin className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-xs text-slate-500 font-bold line-clamp-2 leading-relaxed">{customer.address || "Tidak ada alamat detail"}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
          </div>
        </div>
      </div>

      <Dialog open={openPreview} onOpenChange={setOpenPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto rounded-[2rem] border-none shadow-2xl p-0">
          <div className="bg-indigo-600 h-2 w-full" />
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-black text-slate-800 tracking-tight">Preview Cetak Laporan</DialogTitle>
              <DialogDescription className="text-slate-500 font-bold">Pratinjau laporan master pelanggan sebelum dicetak secara fisik.</DialogDescription>
            </DialogHeader>
            <div ref={printRef} className="p-8 bg-white border rounded-3xl mb-8">
              <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none mb-2">Master Pelanggan</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Unit Bisnis: Monitor Gudang Ferio</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Generated At</p>
                  <p className="text-xs font-black text-slate-800">{format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                </div>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-3 bg-slate-900 text-white text-[10px] font-black uppercase text-left rounded-tl-xl">ID</th>
                    <th className="px-4 py-3 bg-slate-900 text-white text-[10px] font-black uppercase text-left">Nama Pelanggan</th>
                    <th className="px-4 py-3 bg-slate-900 text-white text-[10px] font-black uppercase text-left">Telepon</th>
                    <th className="px-4 py-3 bg-slate-900 text-white text-[10px] font-black uppercase text-left">Cabang</th>
                    <th className="px-4 py-3 bg-slate-900 text-white text-[10px] font-black uppercase text-left">Harga</th>
                    <th className="px-4 py-3 bg-slate-900 text-white text-[10px] font-black uppercase text-left rounded-tr-xl">Alamat</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-3 border-b text-[10px] text-slate-400 font-black">#{c.id}</td>
                      <td className="px-4 py-3 border-b font-bold text-xs">{c.name}</td>
                      <td className="px-4 py-3 border-b font-mono text-xs">{c.phone || "-"}</td>
                      <td className="px-4 py-3 border-b text-[10px] font-bold text-slate-500 uppercase">{branches.find(b => b.id === c.branchId)?.name || "Global"}</td>
                      <td className="px-4 py-3 border-b text-[10px] font-black uppercase text-indigo-600">
                        {c.priceType === 'wholesale' ? 'Grosir' : c.priceType === 'semi_wholesale' ? 'Semi' : 'Retail'}
                      </td>
                      <td className="px-4 py-3 border-b text-xs text-slate-500">{c.address || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter className="gap-3">
              <Button variant="ghost" onClick={() => setOpenPreview(false)} className="rounded-xl font-bold h-12 px-8">Tutup</Button>
              <Button onClick={doPrint} className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black h-12 px-8 shadow-xl shadow-slate-200">
                <Monitor className="w-5 h-5 mr-3" /> Cetak Sekarang
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CustomerDialog({ customer }: { customer?: Customer }) {
  const [open, setOpen] = useState(false);
  const { selectedBranch, branches } = useBranch();
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  
  const isEdit = !!customer;

  const form = useForm<z.infer<typeof insertCustomerSchema>>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      code: customer?.code || "",
      name: customer?.name || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
      branchId: customer?.branchId || selectedBranch?.id || null,
      priceType: customer?.priceType || "retail",
    },
  });

  const onSubmit = (data: z.infer<typeof insertCustomerSchema>) => {
    if (isEdit) {
      updateMut.mutate({ id: customer.id, ...data }, { onSuccess: () => setOpen(false) });
    } else {
      createMut.mutate(data, { onSuccess: () => { setOpen(false); form.reset(); } });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-lg transition-all active:scale-90 focus:outline-none focus:ring-0"><Edit2 className="h-4 w-4" /></Button>
        ) : (
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 transition-all active:scale-95 font-black rounded-xl h-9 px-4 focus:outline-none focus:ring-0"><Plus className="w-4 h-4 mr-2" /> Tambah Pelanggan</Button>
        )}
      </DialogTrigger>
    <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-slate-50/50 backdrop-blur-xl">
      <div className="h-32 bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-24 h-24 bg-indigo-400/20 rounded-full blur-xl" />
        
        <DialogHeader className="relative z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Building2 className="w-5 h-5 text-white" />
             </div>
             <div>
                <DialogTitle className="text-3xl font-black tracking-tight drop-shadow-sm">
                  {isEdit ? "Edit Pelanggan" : "Pelanggan Baru"}
                </DialogTitle>
                <DialogDescription className="text-indigo-100 font-bold opacity-90">
                  {isEdit ? "Perbarui informasi klien di database." : "Daftarkan klien baru ke dalam sistem."}
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>
      </div>

      <div className="p-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
               <div className="space-y-2 col-span-1">
                <Label htmlFor="code" className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                  Kode
                </Label>
                <Input 
                  id="code" 
                  {...form.register("code")} 
                  placeholder="CUST-001" 
                  className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-mono font-bold focus:ring-indigo-500 transition-all" 
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                  <Building2 className="w-3 h-3" /> Nama Pelanggan
                </Label>
                <Input 
                  id="name" 
                  {...form.register("name")} 
                  placeholder="Contoh: Toko Maju Jaya" 
                  className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-bold focus:ring-indigo-500 transition-all" 
                />
              </div>
            </div>
            {(form.formState.errors.code || form.formState.errors.name) && (
              <div className="flex flex-col gap-1 px-1">
                {form.formState.errors.code && <p className="text-[10px] text-rose-500 font-bold">{form.formState.errors.code.message}</p>}
                {form.formState.errors.name && <p className="text-[10px] text-rose-500 font-bold">{form.formState.errors.name.message}</p>}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                <Phone className="w-3 h-3" /> Nomor Telepon / WhatsApp
              </Label>
              <Input 
                id="phone" 
                {...form.register("phone")} 
                placeholder="0812xxxx" 
                className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-mono font-bold focus:ring-indigo-500 transition-all" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch" className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                  <Monitor className="w-3 h-3" /> Cabang Asal
                </Label>
                <Controller
                  control={form.control}
                  name="branchId"
                  render={({ field }: { field: any }) => (
                    <Select 
                      onValueChange={(val) => field.onChange(val === "null" ? null : parseInt(val))} 
                      value={field.value?.toString() || "null"}
                    >
                      <SelectTrigger className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-bold focus:ring-indigo-500 transition-all">
                        <SelectValue placeholder="Cabang" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id.toString()} className="rounded-xl font-bold">{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priceType" className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                   <Info className="w-3 h-3" /> Kategori Harga
                </Label>
                <Controller
                  control={form.control}
                  name="priceType"
                  render={({ field }: { field: any }) => (
                    <Select onValueChange={field.onChange} value={field.value || "retail"}>
                      <SelectTrigger className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-bold focus:ring-indigo-500 transition-all">
                        <SelectValue placeholder="Jenis Harga" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                        <SelectItem value="retail" className="rounded-xl font-bold text-emerald-600">Harga Retail</SelectItem>
                        <SelectItem value="semi_wholesale" className="rounded-xl font-bold text-indigo-600">Harga Semi Grosir</SelectItem>
                        <SelectItem value="wholesale" className="rounded-xl font-bold text-amber-600">Harga Grosir</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                <MapPin className="w-3 h-3" /> Alamat Pengiriman
              </Label>
              <Textarea 
                id="address" 
                {...form.register("address")} 
                placeholder="Nama jalan, RT/RW, Kota, Kode Pos..." 
                rows={3} 
                className="border-slate-100 bg-white shadow-sm rounded-2xl font-bold p-4 focus:ring-indigo-500 transition-all min-h-[100px]" 
              />
              {form.formState.errors.address && <p className="text-[10px] text-rose-500 font-bold px-1">{form.formState.errors.address.message}</p>}
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-slate-100 items-center justify-end gap-3 sm:flex-row flex-col-reverse">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setOpen(false)} 
                className="h-12 w-full sm:w-auto rounded-2xl font-bold text-slate-500 hover:bg-slate-100 px-6"
            >
                Batal
            </Button>
            <Button 
                type="submit" 
                disabled={isPending} 
                className="h-12 w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white rounded-2xl font-black px-10 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Simpan Data</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </div>
    </DialogContent>
    </Dialog>
  );
}

function DeleteCustomerButton({ id, name }: { id: number, name: string }) {
  const [open, setOpen] = useState(false);
  const deleteMut = useDeleteCustomer();

  const handleConfirm = () => {
    deleteMut.mutate(id, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all active:scale-90 focus:outline-none focus:ring-0"><Trash2 className="h-4 w-4" /></Button>
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
                    <DialogTitle className="text-2xl font-black tracking-tight drop-shadow-sm">Hapus Pelanggan</DialogTitle>
                    <DialogDescription className="text-rose-100 font-bold opacity-90">Konfirmasi penghapusan data klien.</DialogDescription>
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
                       Apakah Anda yakin ingin menghapus data pelanggan <br/>
                       <span className="text-slate-900 text-lg underline decoration-rose-200 decoration-4 underline-offset-4">{name}</span>?
                    </p>
                    <div className="mt-4 px-4 py-3 bg-rose-50/50 border border-rose-100 rounded-2xl flex gap-3 text-left">
                       <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                       <p className="text-[10px] text-rose-500 font-black uppercase leading-tight tracking-wider">
                          Tindakan ini bersifat permanen dan akan menghapus riwayat data terkait pelanggan ini di sistem.
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
  const createMut = useCreateCustomer();
  const { selectedBranch, branches } = useBranch();
  const [importBranchId, setImportBranchId] = useState<number | null>(selectedBranch?.id || (branches.length > 0 ? branches[0].id : null));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
        toast({ title: "Gagal", description: "Format file tidak didukung", variant: "destructive" });
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

        // Try to handle both formats:
        // 1. Kode | Nama | Telepon | Alamat | Kota | Jenis Harga
        // 2. Nama | Telepon | Alamat | Jenis Harga
        const parts = cleanLine.split(/\t|;/).map(p => p.trim());
        
        if (parts.length >= 6) {
          return {
            code: parts[0] || `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: parts[1] || "Tanpa Nama",
            phone: parts[2] || "",
            address: parts[3] || "",
            city: parts[4] || "",
            priceType: (parts[5] || "retail").toLowerCase().includes("semi") 
              ? "semi_wholesale" 
              : ((parts[5] || "").toLowerCase().includes("grosir") || (parts[5] || "").toLowerCase().includes("wholesale")) 
                ? "wholesale" 
                : "retail",
            branchId: importBranchId
          };
        } else if (parts.length >= 4) {
          // Fallback legacy format
          return {
            code: `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: parts[0] || "Tanpa Nama",
            phone: parts[1] || "",
            address: parts[2] || "",
            priceType: (parts[3] || "retail").toLowerCase().includes("semi") 
              ? "semi_wholesale" 
              : ((parts[3] || "").toLowerCase().includes("grosir") || (parts[3] || "").toLowerCase().includes("wholesale")) 
                ? "wholesale" 
                : "retail",
            branchId: importBranchId
          };
        }
        return null;
      }).filter(Boolean);
    } else if (fileData.length > 0) {
      itemsToImport = fileData.map((row: any) => {
        const r: Record<string, any> = {};
        Object.keys(row).forEach(k => {
          r[k.trim().toLowerCase()] = row[k];
        });

        const getVal = (keys: string[]) => {
          for (const k of keys) {
            const val = r[k.toLowerCase()];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              return String(val).trim();
            }
          }
          return null;
        };

        const rawPriceType = (getVal(["Jenis Harga", "priceType", "Price Type", "Harga"]) || "retail").toLowerCase();

        return {
          code: getVal(["Kode", "code", "Customer Code", "ID"]) || `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: getVal(["Nama Pelanggan", "Nama", "name", "Customer Name"]) || "Tanpa Nama",
          phone: getVal(["Telepon", "phone", "Phone", "No Telp"]) || "",
          address: getVal(["Alamat", "address", "Address"]) || "",
          city: getVal(["Kota", "city", "City"]) || "",
          priceType: rawPriceType.includes("semi") 
            ? "semi_wholesale" 
            : (rawPriceType.includes("grosir") || rawPriceType.includes("wholesale")) 
              ? "wholesale" 
              : "retail",
          branchId: importBranchId
        };
      });
    }

    return itemsToImport.filter(item => item && item.name);
  }, [pasteData, fileData, importBranchId]);

  const handleImport = async () => {
    if (previewItems.length > 0) {
      try {
        for (const item of previewItems) {
          await createMut.mutateAsync(item);
        }
        toast({ title: "Berhasil", description: `${previewItems.length} pelanggan berhasil diimpor` });
        setOpen(false); 
        setPasteData(""); 
        setFileData([]); 
        setFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        toast({ title: "Gagal", description: "Terjadi kesalahan saat mengimpor data", variant: "destructive" });
      }
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
                <DialogTitle className="text-3xl font-black tracking-tight drop-shadow-sm">Bulk Import Pelanggan</DialogTitle>
                <DialogDescription className="text-slate-400 font-bold opacity-90">Impor massal data pelanggan via Excel atau Copy-Paste.</DialogDescription>
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
                   <SelectItem value="null" className="rounded-xl font-bold">Semua Cabang (Global)</SelectItem>
                   {branches.map((b) => (
                     <SelectItem key={b.id} value={b.id.toString()} className="rounded-xl font-bold">{b.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter px-1 flex items-center gap-1">
                 <Info className="w-3 h-3 text-indigo-400" /> Pelanggan otomatis masuk ke cabang terpilih.
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
              placeholder="Nama Pelanggan [tab] No Telp [tab] Alamat [tab] Jenis Harga..." 
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
                  <p>1. Nama &bull; 2. No Telp &bull; 3. Alamat &bull; 4. Jenis Harga (Grosir/Semi/Retail)</p>
               </div>
            </div>
          </div>

          {previewItems.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                   Pratinjau {previewItems.length} Pelanggan
                </Label>
              </div>
              <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-premium bg-white">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none">
                      <TableHead className="h-10 text-[9px] font-black uppercase text-slate-400 tracking-wider">Pelanggan</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-slate-400 tracking-wider">Kontak</TableHead>
                      <TableHead className="h-10 text-[9px] font-black uppercase text-slate-400 tracking-wider text-right">Tipe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewItems.slice(0, 3).map((item, idx) => (
                      <TableRow key={idx} className="border-slate-50">
                        <TableCell className="py-3">
                           <div className="font-bold text-slate-800 text-[11px] truncate max-w-[200px]">{item.name}</div>
                           <div className="text-[9px] text-slate-400 truncate max-w-[200px] font-medium">{item.address}</div>
                        </TableCell>
                        <TableCell className="py-3 text-xs font-bold text-slate-600">
                           {item.phone || "-"}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                           <Badge variant="outline" className={cn(
                             "rounded-lg font-black text-[9px] uppercase tracking-tighter border-none px-2",
                             item.priceType === 'wholesale' ? 'bg-amber-50 text-amber-600' : 
                             item.priceType === 'semi_wholesale' ? 'bg-indigo-50 text-indigo-600' :
                             'bg-emerald-50 text-emerald-600'
                           )}>
                             {item.priceType === 'wholesale' ? 'Grosir' : item.priceType === 'semi_wholesale' ? 'Semi' : 'Retail'}
                           </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {previewItems.length > 3 && (
                      <TableRow className="border-none bg-slate-50/30">
                        <TableCell colSpan={3} className="py-2 text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">
                          ... +{previewItems.length - 3} PELANGGAN LAINNYA
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
            disabled={createMut.isPending || previewItems.length === 0}
            className="h-14 w-full sm:w-auto min-w-[200px] bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white rounded-2xl font-black shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {createMut.isPending ? (
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
