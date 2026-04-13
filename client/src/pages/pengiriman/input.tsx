import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useExpeditions } from "@/hooks/use-expeditions";
import { useCustomers } from "@/hooks/use-customers";
import { useCreateShipment, useShipments, useDeleteShipment, useUpdateShipment } from "@/hooks/use-shipments";
import { useBranch } from "@/hooks/use-branch";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Search, X } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertShipmentSchema } from "@shared/schema";
import { z } from "zod";
import { PackageSearch, Clock, PackageCheck, Truck, Plus, Trash2, Pencil, MapPin, Receipt, Package, Download, ChevronDown, Monitor, FileSpreadsheet, FileText, Save, Bookmark } from "lucide-react";
import { useLocation } from "wouter";
import { format, isSameDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { type ShipmentWithRelations } from "@shared/schema";
import { safeFormat, cn } from "@/lib/utils";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

const formSchema = insertShipmentSchema.extend({
  customerId: z.coerce.number().min(1, "Pilih pelanggan"),
  expeditionId: z.coerce.number().min(1, "Pilih ekspedisi"),
  totalNotes: z.coerce.number().min(1, "Minimal 1 nota"),
  merekId: z.coerce.number().min(1, "Pilih merek"),
});

type FormValues = z.infer<typeof formSchema>;

function DeleteConfirmDialog({ shipment, onClose }: { shipment: ShipmentWithRelations; onClose: () => void }) {
  const deleteMut = useDeleteShipment();

  const handleDelete = () => {
    deleteMut.mutate(shipment.id, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white font-display">
        <div className="h-32 bg-gradient-to-br from-red-500 to-rose-600 relative overflow-hidden flex items-center px-8">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-white leading-tight">
                Hapus Data
              </DialogTitle>
              <DialogDescription className="text-red-50 text-xs font-medium opacity-90">
                Pengiriman akan dibatalkan
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-4">
          <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-4 text-[11px] space-y-2 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold uppercase tracking-wider">No Faktur</span>
              <span className="font-black text-slate-900">{shipment.invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Pelanggan</span>
              <span className="font-black text-slate-900 truncate max-w-[180px]">{shipment.customer?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Tujuan</span>
              <span className="font-black text-slate-900 truncate max-w-[180px]">{shipment.destination}</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium text-center px-2 leading-relaxed">
            Apakah Anda yakin ingin menghapus data pengiriman ini? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        <DialogFooter className="p-6 pt-0 flex gap-2 sm:justify-center">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 rounded-xl font-bold text-slate-400"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMut.isPending}
            onClick={handleDelete}
            className="flex-[2] h-12 rounded-xl font-black shadow-lg shadow-red-200 transition-all active:scale-95 bg-red-600 hover:bg-red-700"
          >
            {deleteMut.isPending ? "Menghapus..." : "Ya, Hapus Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditShipmentDialog({ shipment, activeExpeditions, sortedCustomers, brands, onClose }: { 
  shipment: ShipmentWithRelations; 
  activeExpeditions: any[]; 
  sortedCustomers: any[]; 
  brands: any[];
  onClose: () => void 
}) {
  const updateMut = useUpdateShipment();
  const { selectedBranchId } = useBranch();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: shipment.invoiceNumber,
      destination: shipment.destination,
      notes: shipment.notes || "",
      totalNotes: shipment.totalNotes,
      customerId: shipment.customerId,
      expeditionId: shipment.expeditionId,
      merekId: shipment.merekId || undefined,
    }
  });

  const onSubmit = (data: FormValues) => {
    updateMut.mutate({ 
      id: shipment.id, 
      ...data, 
      branchId: selectedBranchId || undefined 
    }, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white font-display">
        <div className="h-32 bg-gradient-to-br from-indigo-500 to-violet-600 relative overflow-hidden flex items-center px-8">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
              <Pencil className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-white leading-tight">
                Edit Data Pengiriman
              </DialogTitle>
              <DialogDescription className="text-indigo-50 text-xs font-medium opacity-90">
                Perbarui detail informasi pengiriman
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-invoiceNumber" className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Nomor Faktur</Label>
                <Input id="edit-invoiceNumber" {...form.register("invoiceNumber")} className="rounded-xl h-11 font-bold" />
                {form.formState.errors.invoiceNumber?.message && <p className="text-[10px] text-red-500 mt-1">{form.formState.errors.invoiceNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-totalNotes" className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Total Nota</Label>
                <Input id="edit-totalNotes" type="number" {...form.register("totalNotes")} className="rounded-xl h-11 font-bold" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Merek <span className="text-red-500">*</span></Label>
              <Controller
                control={form.control}
                name="merekId"
                render={({ field }) => {
                  const [open, setOpen] = useState(false);
                  const selected = brands.find(b => b.id === field.value);
                  return (
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between rounded-xl h-11 font-bold text-left px-3">
                          <span className="truncate">{selected ? selected.name : "Pilih merek..."}</span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl overflow-hidden shadow-2xl border-slate-200" align="start">
                        <Command>
                          <CommandInput placeholder="Cari merek..." className="h-11" />
                          <CommandList className="max-h-[200px]">
                            <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                            <CommandGroup>
                              {brands.map((b) => (
                                <CommandItem
                                  key={b.id}
                                  value={b.name}
                                  onSelect={() => { field.onChange(b.id); setOpen(false); }}
                                  className="py-2.5 px-4 font-bold text-sm"
                                >
                                  {b.name}
                                  <Check className={cn("ml-auto h-4 w-4 text-indigo-600", field.value === b.id ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                }}
              />
              {form.formState.errors.merekId?.message && <p className="text-[10px] text-red-500 mt-1">{form.formState.errors.merekId.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Pelanggan</Label>
                <Controller
                  control={form.control}
                  name="customerId"
                  render={({ field }) => {
                    const [open, setOpen] = useState(false);
                    const selected = sortedCustomers.find(c => c.id === field.value);
                    return (
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between rounded-xl h-11 font-bold text-left px-3">
                            <span className="truncate">{selected ? selected.name : "Pilih pelanggan..."}</span>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl overflow-hidden shadow-2xl border-slate-200" align="start">
                          <Command>
                            <CommandInput placeholder="Cari pelanggan..." className="h-11" />
                            <CommandList className="max-h-[200px]">
                              <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                              <CommandGroup>
                                {sortedCustomers.map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    value={`${c.name} ${c.code}`}
                                    onSelect={() => { field.onChange(c.id); setOpen(false); }}
                                    className="py-2.5 px-4 font-bold text-sm"
                                  >
                                    {c.name}
                                    <Check className={cn("ml-auto h-4 w-4 text-indigo-600", field.value === c.id ? "opacity-100" : "opacity-0")} />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Ekspedisi</Label>
                <Controller
                  control={form.control}
                  name="expeditionId"
                  render={({ field }) => {
                    const [open, setOpen] = useState(false);
                    const selected = activeExpeditions.find(e => e.id === field.value);
                    return (
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between rounded-xl h-11 font-bold text-left px-3">
                            <span className="truncate">{selected ? selected.name : "Pilih ekspedisi..."}</span>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl overflow-hidden shadow-2xl border-slate-200" align="start">
                          <Command>
                            <CommandInput placeholder="Cari ekspedisi..." className="h-11" />
                            <CommandList className="max-h-[200px]">
                              <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                              <CommandGroup>
                                {activeExpeditions.map((e) => (
                                  <CommandItem
                                    key={e.id}
                                    value={e.name}
                                    onSelect={() => { field.onChange(e.id); setOpen(false); }}
                                    className="py-2.5 px-4 font-bold text-sm"
                                  >
                                    {e.name}
                                    <Check className={cn("ml-auto h-4 w-4 text-indigo-600", field.value === e.id ? "opacity-100" : "opacity-0")} />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-destination" className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Tujuan</Label>
              <Input id="edit-destination" {...form.register("destination")} className="rounded-xl h-11 font-bold" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes" className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Keterangan</Label>
              <Textarea id="edit-notes" {...form.register("notes")} rows={2} className="rounded-xl p-4 resize-none" />
            </div>
          </div>

          <DialogFooter className="p-8 bg-slate-50/50 pt-4 flex gap-2">
            <Button variant="ghost" onClick={onClose} type="button" className="flex-1 rounded-xl font-bold text-slate-400">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={updateMut.isPending}
              className="flex-1 h-12 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              {updateMut.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function InputPengiriman() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { selectedBranchId } = useBranch();
  const { data: expeditions = [] } = useExpeditions(selectedBranchId || undefined);
  const { data: customers = [] } = useCustomers(selectedBranchId || undefined);
  const { data: brands = [] } = useQuery<any[]>({
    queryKey: ["/api/promo/brands", selectedBranchId],
    queryFn: async () => {
      const res = await fetch(`/api/promo/brands?branchId=${selectedBranchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedBranchId
  });
  const { can } = usePermissions();
  const createMut = useCreateShipment();
  const { t } = useSettings();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShipmentWithRelations | null>(null);
  const [editTarget, setEditTarget] = useState<ShipmentWithRelations | null>(null);
  const [openPreview, setOpenPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Filter States
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterInvoice, setFilterInvoice] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterBrand, setFilterBrand] = useState<string>("ALL");

  // Pagination State
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  // Server-side paginated query — only fetch MENUNGGU_VERIFIKASI to reduce egress
  const { data: { shipments = [], total: totalShipments = 0 } = {}, isLoading } = useShipments({
    limit: itemsPerPage,
    offset: (page - 1) * itemsPerPage,
    search: filterInvoice || filterCustomer || undefined,
    startDate: filterDate ? new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 0, 0, 0) : undefined,
    endDate: filterDate ? new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 23, 59, 59) : undefined,
    status: "MENUNGGU_VERIFIKASI",
  });

  const activeExpeditions = expeditions
    .filter(e => e.active)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const sortedCustomers = [...customers].sort((a, b) => a.name.localeCompare(b.name));

  const getStatusLabel = (s: ShipmentWithRelations) => {
    if (s.status === "MENUNGGU_VERIFIKASI") {
      return s.verificationDate ? "SEDANG DIPACKING" : "MENUNGGU PACKING";
    }
    if (s.status === "DALAM_PENGIRIMAN") {
      return "PROSES KIRIM";
    }
    return s.status.replace(/_/g, " ");
  };

  // Client-side priority sort (server returns by inputDate desc, we re-sort by status priority)
  const getStatusPriority = (s: ShipmentWithRelations) => {
    if (s.status === "MENUNGGU_VERIFIKASI" && !s.verificationDate) return 1; // MENUNGGU PACKING
    if (s.status === "MENUNGGU_VERIFIKASI" && s.verificationDate) return 2;  // SEDANG DIPACKING
    if (s.status === "SIAP_KIRIM") return 3;
    if (s.status === "DALAM_PENGIRIMAN") return 4;                           // PROSES KIRIM
    if (s.status === "TERKIRIM") return 5;
    return 99;
  };

  // Only show "MENUNGGU PACKING" (no verificationDate) + apply brand filter
  const displayedShipments = [...shipments]
    .filter((s) => {
      // Only show true "menunggu packing" — not yet started packing
      if (s.verificationDate) return false;
      // Brand filter is client-side only
      if (filterBrand !== "ALL" && String(s.merekId) !== filterBrand) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      return new Date(b.inputDate).getTime() - new Date(a.inputDate).getTime();
    });

  const totalPages = Math.ceil(totalShipments / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterDate, filterInvoice, filterCustomer, filterBrand]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: "",
      destination: "",
      notes: "",
      totalNotes: 1,
      merekId: undefined,
    }
  });

  const onSubmit = (data: FormValues) => {
    createMut.mutate({ ...data, branchId: selectedBranchId || undefined }, {
      onSuccess: () => {
        setShowForm(false);
        form.reset();
      }
    });
  };

  const resetFilters = () => {
    setFilterDate(undefined);
    setFilterInvoice("");
    setFilterCustomer("");
    setFilterBrand("ALL");
  };

  const handleExportExcel = () => {
    const dataToExport = displayedShipments.map((s, index) => ({
      "No": index + 1,
      "Tgl Input": format(new Date(s.inputDate), "dd MMM yyyy HH:mm", { locale: idLocale }),
      "No Faktur": s.invoiceNumber,
      "Pelanggan": s.customer?.name || "-",
      "Merek": s.brand?.name || "-",
      "Tujuan": s.destination,
      "Ekspedisi": s.expedition?.name || "-",
      "Resi": s.receiptNumber || "-",
      "Total Nota": s.totalNotes,
      "Total Box": s.totalBoxes || "-",
      "Status": getStatusLabel(s)
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Pengiriman");
    XLSX.writeFile(wb, `laporan-pengiriman-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Laporan Data Pengiriman", 14, 16);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 23);
    
    // Add applied filter info to PDF if any
    if (filterDate || filterInvoice || filterCustomer) {
       doc.text(`Filter Aktif: ${[
         filterDate ? `Tanggal: ${format(filterDate, "dd/MM/yyyy")}` : null,
         filterInvoice ? `Faktur: ${filterInvoice}` : null,
         filterCustomer ? `Pelanggan: ${filterCustomer}` : null,
       ].filter(Boolean).join(" | ")}`, 14, 28);
    }
    
    const tableData = displayedShipments.map((s, index) => [
      index + 1,
      format(new Date(s.inputDate), "dd/MM/yyyy HH:mm", { locale: idLocale }),
      s.invoiceNumber,
      s.customer?.name || "-",
      s.brand?.name || "-",
      s.destination,
      s.expedition?.name || "-",
      s.receiptNumber || "-",
      `${s.totalNotes} Nota`,
      getStatusLabel(s)
    ]);

    autoTable(doc, {
      startY: (filterDate || filterInvoice || filterCustomer) ? 33 : 28,
      head: [["No", "Tgl Input", "Faktur", "Pelanggan", "Merek", "Tujuan", "Ekspedisi", "Resi", "Muatan", "Status"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`laporan-pengiriman-${format(new Date(), "yyyyMMdd")}.pdf`);
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
          <title>Laporan Data Pengiriman</title>
          <style>
            body { font-family: sans-serif; font-size: 12px; color: #111; }
            h2 { margin-bottom: 4px; }
            p { margin: 0 0 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #2980b9; color: #fff; padding: 6px 10px; text-align: left; font-size: 11px; }
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
      <div className="relative min-h-[calc(100vh-5rem)] pb-12 overflow-x-hidden">
        {/* Super App Header background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] md:w-full h-[280px] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 md:rounded-b-[3rem] rounded-b-[20%] -z-10 shadow-xl overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[100%] bg-white/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[80%] bg-blue-300/10 rounded-full blur-[60px]" />
        </div>

        <div className="pt-6 md:pt-10 px-4 max-w-7xl mx-auto">
          {/* Page Heading Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-white mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                <PackageSearch className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight leading-none drop-shadow-md">
                  {t('page_input_pengiriman_title', 'Input Pengiriman')}
                </h1>
                <p className="text-white/80 text-xs md:text-sm font-medium mt-1">
                  {t('page_input_pengiriman_desc', 'Kelola dan input data pengiriman baru secara efisien.')}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {(isAdmin || can("input_pengiriman", "export") || can("input_pengiriman", "print")) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 md:flex-none gap-2 bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20 h-10 rounded-xl font-bold">
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                      <ChevronDown className="w-3 h-3 text-white/60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200">
                    {(isAdmin || can("input_pengiriman", "print")) && (
                      <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer py-2.5">
                        <Monitor className="w-4 h-4 text-slate-500" /> Print Layar
                      </DropdownMenuItem>
                    )}
                    {(isAdmin || can("input_pengiriman", "export")) && (
                      <>
                        <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer py-2.5">
                          <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer py-2.5">
                          <FileText className="w-4 h-4 text-red-500" /> Export PDF
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {can("input_pengiriman", "input") && (
                <div className="flex-1 md:flex-none">
                  <Button 
                    onClick={() => setShowForm(true)} 
                    className="w-full bg-white text-indigo-600 hover:bg-indigo-50 h-10 rounded-xl font-black shadow-lg shadow-indigo-900/20 gap-2 border-none active:scale-95 transition-all"
                  >
                    <Plus className="w-5 h-5" /> 
                    <span className="hidden sm:inline">Tambah Data</span>
                    <span className="sm:hidden">Input</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {showForm && (
              <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-top-4 duration-300">
                <Card className="border-none shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] rounded-[2rem] overflow-hidden bg-white/95 backdrop-blur-xl">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b pb-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-black tracking-tight text-slate-800">
                            Faktur Baru
                          </CardTitle>
                          <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Lengkapi Detail Transaksi
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} className="rounded-xl h-8 font-bold text-slate-400 hover:text-slate-600">
                          Batal
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-xl px-4 h-8 font-black" 
                          disabled={createMut.isPending}
                          onClick={form.handleSubmit(onSubmit)}
                        >
                          {createMut.isPending ? "Simpan..." : "Simpan Data"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 font-display">
                      <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Tanggal Input</Label>
                      <Input disabled value={format(new Date(), "dd MMMM yyyy", { locale: idLocale })} className="bg-slate-50/50 border-slate-100 rounded-xl h-11 font-medium" />
                    </div>
                    <div className="space-y-2 font-display">
                      <Label htmlFor="invoiceNumber" className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        Nomor Faktur / Invoice <span className="text-red-500">*</span>
                      </Label>
                      <Input id="invoiceNumber" {...form.register("invoiceNumber")} placeholder="INV-2024..." className="bg-white border-slate-200 rounded-xl h-11 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm font-bold" />
                      {form.formState.errors.invoiceNumber?.message && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> {form.formState.errors.invoiceNumber.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 font-display">
                      <Label htmlFor="totalNotes" className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Total Nota <span className="text-red-500">*</span></Label>
                      <Input id="totalNotes" type="number" inputMode="numeric" min="1" {...form.register("totalNotes")} className="bg-white border-slate-200 rounded-xl h-11 focus:ring-2 focus:ring-indigo-500/20 shadow-sm font-bold" />
                      {form.formState.errors.totalNotes?.message && <p className="text-[10px] text-red-500 font-bold mt-1">{form.formState.errors.totalNotes.message}</p>}
                    </div>
                    <div className="space-y-2 font-display">
                      <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Pelanggan <span className="text-red-500">*</span></Label>
                      <Controller
                        control={form.control}
                        name="customerId"
                        render={({ field }) => {
                          const [open, setOpen] = useState(false);
                          const selected = sortedCustomers.find(c => c.id === field.value);
                          
                          return (
                            <Popover open={open} onOpenChange={setOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={open}
                                  className="w-full justify-between bg-white border-slate-200 rounded-xl h-11 focus:ring-2 focus:ring-indigo-500/20 shadow-sm font-bold text-left px-3 hover:bg-slate-50 hover:text-slate-900"
                                >
                                  <span className="truncate">
                                    {selected ? selected.name : "Pilih pelanggan..."}
                                  </span>
                                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl overflow-hidden shadow-2xl border-slate-200" align="start">
                                <Command className="font-display">
                                  <CommandInput placeholder="Cari nama atau kode pelanggan..." className="h-11" />
                                  <CommandList className="max-h-[300px]">
                                    <CommandEmpty className="py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-50/50">Pelanggan tidak ditemukan.</CommandEmpty>
                                    <CommandGroup>
                                      {sortedCustomers.map((c) => (
                                        <CommandItem
                                          key={c.id}
                                          value={`${c.name} ${c.code}`}
                                          onSelect={() => {
                                            field.onChange(c.id);
                                            setOpen(false);
                                          }}
                                          className="py-3 px-4 flex items-center justify-between cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-600 rounded-lg m-1"
                                        >
                                          <div className="flex flex-col">
                                             <span className="font-bold text-sm leading-none mb-1">{c.name}</span>
                                             <span className="text-[10px] font-mono opacity-60">Kode: {c.code || "N/A"}</span>
                                          </div>
                                          <Check
                                            className={cn(
                                              "ml-auto h-4 w-4 text-indigo-600",
                                              field.value === c.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          );
                        }}
                      />
                      {form.formState.errors.customerId?.message && <p className="text-[10px] text-red-500 font-bold mt-1">{form.formState.errors.customerId.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2 font-display">
                    <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Merek <span className="text-red-500">*</span></Label>
                    <Controller
                      control={form.control}
                      name="merekId"
                      render={({ field }) => {
                        const [open, setOpen] = useState(false);
                        const selected = brands.find(b => b.id === field.value);
                        
                        return (
                          <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between bg-white border-slate-200 rounded-xl h-11 focus:ring-2 focus:ring-indigo-500/20 shadow-sm font-bold text-left px-3 hover:bg-slate-50 hover:text-slate-900"
                              >
                                <span className="truncate">
                                  {selected ? selected.name : "Pilih merek..."}
                                </span>
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl overflow-hidden shadow-2xl border-slate-200" align="start">
                              <Command className="font-display">
                                <CommandInput placeholder="Cari merek..." className="h-11" />
                                <CommandList className="max-h-[300px]">
                                  <CommandEmpty className="py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-50/50">Merek tidak ditemukan.</CommandEmpty>
                                  <CommandGroup>
                                    {brands.map((b) => (
                                      <CommandItem
                                        key={b.id}
                                        value={b.name}
                                        onSelect={() => {
                                          field.onChange(b.id);
                                          setOpen(false);
                                        }}
                                        className="py-3 px-4 flex items-center justify-between cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-600 rounded-lg m-1"
                                      >
                                        <span className="font-bold text-sm uppercase tracking-tight">{b.name}</span>
                                        <Check
                                          className={cn(
                                            "ml-auto h-4 w-4 text-indigo-600",
                                            field.value === b.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        );
                      }}
                    />
                    {form.formState.errors.merekId?.message && <p className="text-[10px] text-red-500 font-bold mt-1">{form.formState.errors.merekId.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 font-display">
                      <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Ekspedisi Pengiriman <span className="text-red-500">*</span></Label>
                      <Controller
                        control={form.control}
                        name="expeditionId"
                        render={({ field }) => {
                           const [open, setOpen] = useState(false);
                           const selected = activeExpeditions.find(e => e.id === field.value);
                           
                           return (
                             <Popover open={open} onOpenChange={setOpen}>
                               <PopoverTrigger asChild>
                                 <Button
                                   variant="outline"
                                   role="combobox"
                                   aria-expanded={open}
                                   className="w-full justify-between bg-white border-slate-200 rounded-xl h-11 focus:ring-2 focus:ring-indigo-500/20 shadow-sm font-bold text-left px-3 hover:bg-slate-50 hover:text-slate-900"
                                 >
                                   <span className="truncate">
                                     {selected ? selected.name : "Pilih ekspedisi..."}
                                   </span>
                                   <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                 </Button>
                               </PopoverTrigger>
                               <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl overflow-hidden shadow-2xl border-slate-200" align="start">
                                 <Command className="font-display">
                                   <CommandInput placeholder="Cari ekspedisi..." className="h-11" />
                                   <CommandList className="max-h-[300px]">
                                     <CommandEmpty className="py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-50/50">Ekspedisi tidak ditemukan.</CommandEmpty>
                                     <CommandGroup>
                                       {activeExpeditions.map((e) => (
                                         <CommandItem
                                           key={e.id}
                                           value={e.name}
                                           onSelect={() => {
                                             field.onChange(e.id);
                                             setOpen(false);
                                           }}
                                           className="py-3 px-4 flex items-center justify-between cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-600 rounded-lg m-1"
                                         >
                                           <span className="font-bold text-sm">{e.name}</span>
                                           <Check
                                             className={cn(
                                               "ml-auto h-4 w-4 text-indigo-600",
                                               field.value === e.id ? "opacity-100" : "opacity-0"
                                             )}
                                           />
                                         </CommandItem>
                                       ))}
                                     </CommandGroup>
                                   </CommandList>
                                 </Command>
                               </PopoverContent>
                             </Popover>
                           );
                        }}
                      />
                      {form.formState.errors.expeditionId?.message && <p className="text-[10px] text-red-500 font-bold mt-1">{form.formState.errors.expeditionId.message}</p>}
                    </div>

                    <div className="space-y-2 font-display">
                      <Label htmlFor="destination" className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Tujuan / Lokasi <span className="text-red-500">*</span></Label>
                      <Input id="destination" {...form.register("destination")} placeholder="Kota/Kabupaten tujuan..." className="bg-white border-slate-200 rounded-xl h-11 focus:ring-2 focus:ring-indigo-500/20 shadow-sm font-bold" />
                      {form.formState.errors.destination?.message && <p className="text-[10px] text-red-500 font-bold mt-1">{form.formState.errors.destination.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2 font-display">
                    <Label htmlFor="notes" className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Keterangan (Opsional)</Label>
                    <Textarea id="notes" {...form.register("notes")} placeholder="Catatan tambahan untuk gudang..." rows={3} className="bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 shadow-sm font-medium p-4 resize-none" />
                  </div>
                </CardContent>
              </form>
            </Card>
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Filter Section */}
          <div className="p-6 border-b bg-slate-50/30 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[200px] justify-start text-left font-normal bg-white h-10 border-slate-200",
                      !filterDate && "text-muted-foreground"
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4 text-slate-400" />
                    {filterDate ? format(filterDate, "dd MMM yyyy", { locale: idLocale }) : "Pilih tanggal..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={setFilterDate}
                    initialFocus
                    locale={idLocale}
                  />
                </PopoverContent>
              </Popover>

              <div className="relative flex-1">
                <Receipt className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="No. Faktur..."
                  className="pl-9 bg-white h-10 border-slate-200"
                  value={filterInvoice}
                  onChange={(e) => setFilterInvoice(e.target.value)}
                />
              </div>

              <div className="relative flex-1">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Pelanggan..."
                  className="pl-9 bg-white h-10 border-slate-200"
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-slate-400" />
                <select
                  className="bg-white h-10 border-slate-200 rounded-md text-sm px-2 focus:ring-2 focus:ring-indigo-500/20"
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                >
                  <option value="ALL">Semua Merek</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {(filterDate || filterInvoice || filterCustomer) && (
              <Button 
                variant="ghost" 
                onClick={resetFilters}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10 font-medium sm:self-end lg:self-center"
              >
                Hapus Semua Filter
              </Button>
            )}
          </div>
          {/* Desktop View: Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="py-5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">Tgl Input</TableHead>
                  <TableHead className="py-5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">No Faktur</TableHead>
                  <TableHead className="py-5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">Merek</TableHead>
                  <TableHead className="py-5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">Pelanggan & Tujuan</TableHead>
                  <TableHead className="py-5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">Ekspedisi & Resi</TableHead>
                  <TableHead className="py-5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">Detail Muatan</TableHead>
                  <TableHead className="py-5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="py-5 font-bold text-slate-800 text-[11px] uppercase tracking-wider text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : displayedShipments.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Belum ada data pengiriman.</TableCell></TableRow>
                ) : (
                  displayedShipments.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="py-4 text-xs text-muted-foreground">
                        {safeFormat(s.inputDate)}
                      </TableCell>
                      <TableCell className="py-4">
                        <p className={cn("text-[11px] font-black uppercase tracking-tight", isSameDay(new Date(s.inputDate), new Date()) ? "text-indigo-600" : "text-slate-900")}>
                          {s.invoiceNumber}
                        </p>
                      </TableCell>
                      <TableCell className="py-4 whitespace-nowrap">
                        {s.brand ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tighter">
                            {s.brand.name}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[9px] font-bold">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{s.customer?.name}</p>
                          <div className="flex items-start text-xs text-muted-foreground gap-1">
                            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{s.destination}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-primary" />
                            <span className="font-medium text-sm">{s.expedition?.name || "-"}</span>
                          </div>
                          {s.receiptNumber ? (
                            <div className="flex items-center text-xs text-muted-foreground gap-1">
                              <Receipt className="w-3 h-3" />
                              <span className="font-mono text-slate-600">{s.receiptNumber}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic pl-4">Belum ada resi</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <Receipt className="w-3 h-3 text-muted-foreground" />
                            <span><span className="font-medium text-foreground">{s.totalNotes}</span> Nota</span>
                          </div>
                          {(s.totalBoxes !== undefined && s.totalBoxes !== null) && (
                            <div className="flex items-center gap-1">
                              <Package className="w-3 h-3 text-muted-foreground" />
                              <span><span className="font-medium text-foreground">{s.totalBoxes}</span> Box/Koli</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded-full text-[10px] w-fit font-bold uppercase ${
                            s.status === "MENUNGGU_VERIFIKASI"
                              ? (s.verificationDate ? "bg-amber-100 text-orange-700" : "bg-orange-100 text-orange-700")
                              : s.status === "DALAM_PENGIRIMAN" ? "bg-blue-100 text-blue-700"
                              : s.status === "SIAP_KIRIM" ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {getStatusLabel(s)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <div className="flex justify-end gap-1">
                          {s.status === "MENUNGGU_VERIFIKASI" && !s.verificationDate && can("input_pengiriman", "edit") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              onClick={() => setEditTarget(s)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {s.status === "MENUNGGU_VERIFIKASI" && !s.verificationDate && can("input_pengiriman", "delete") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleteTarget(s)}
                              data-testid={`button-delete-${s.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
          {totalPages > 1 && (
            <div className="py-4 border-t border-slate-100 flex items-center justify-between px-6 bg-slate-50/30 rounded-b-[2rem] hidden md:flex">
              <p className="text-xs text-slate-500 font-medium">
                Menampilkan <span className="font-bold text-slate-700">{(page - 1) * itemsPerPage + 1}</span> hingga <span className="font-bold text-slate-700">{Math.min(page * itemsPerPage, totalShipments)}</span> dari <span className="font-bold text-slate-700">{totalShipments}</span> entri
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

          {/* Mobile View: Card Layout */}
          <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground bg-white rounded-xl border">Loading...</div>
            ) : displayedShipments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground bg-white rounded-xl border italic">Belum ada data pengiriman.</div>
            ) : (
              displayedShipments.map((s) => (
                <div key={s.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-4 font-sans">
                  <div className="flex justify-between items-start border-b pb-3">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        <span className={cn("text-[11px] font-black uppercase tracking-tight", isSameDay(new Date(s.inputDate), new Date()) ? "text-indigo-600" : "text-slate-900")}>
                          {s.invoiceNumber}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {safeFormat(s.inputDate)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {s.brand && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tighter">
                          {s.brand.name}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        s.status === "MENUNGGU_VERIFIKASI"
                          ? (s.verificationDate ? "bg-amber-100 text-orange-700" : "bg-orange-100 text-orange-700")
                          : s.status === "DALAM_PENGIRIMAN" ? "bg-blue-100 text-blue-700"
                          : s.status === "SIAP_KIRIM" ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {getStatusLabel(s)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2 text-left">
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground font-medium uppercase tracking-tighter text-[10px]">Pelanggan</p>
                        <p className="font-semibold text-slate-800 line-clamp-1">{s.customer?.name}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground font-medium uppercase tracking-tighter text-[10px]">Ekspedisi</p>
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Truck className="h-3 w-3 text-primary" />
                          <span className="truncate">{s.expedition?.name || "-"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-left">
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground font-medium uppercase tracking-tighter text-[10px]">Tujuan</p>
                        <div className="flex items-center gap-1 text-slate-600">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.destination}</span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground font-medium uppercase tracking-tighter text-[10px]">Resi / No. Pol</p>
                        <p className="font-mono text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-fit line-clamp-1">
                          {s.receiptNumber || "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-3 rounded-lg flex justify-between items-center text-xs border border-slate-100 shadow-inner">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-bold text-slate-700">{s.totalNotes} <span className="font-normal text-slate-500 uppercase text-[9px]">Nota</span></span>
                      </div>
                      {(s.totalBoxes !== undefined && s.totalBoxes !== null) && (
                        <div className="flex items-center gap-1.5 border-l pl-4 border-slate-200">
                          <Package className="h-3.5 w-3.5 text-blue-500" />
                          <span className="font-bold text-slate-700">{s.totalBoxes} <span className="font-normal text-slate-500 uppercase text-[9px]">Koli</span></span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {s.status === "MENUNGGU_VERIFIKASI" && !s.verificationDate && (
                        <>
                          {can("input_pengiriman", "edit") && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              onClick={() => setEditTarget(s)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {can("input_pengiriman", "delete") && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleteTarget(s)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Mobile Pagination Controls */}
          {totalPages > 1 && (
            <div className="md:hidden flex justify-center pb-8 pt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer bg-white"}
                    />
                  </PaginationItem>
                  <span className="text-xs font-bold text-slate-500 px-4">
                    Hal {page} dari {totalPages}
                  </span>
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer bg-white"}
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview Cetak Laporan</DialogTitle>
            <DialogDescription>Pratinjau laporan sebelum dicetak.</DialogDescription>
          </DialogHeader>
          <div ref={printRef} className="p-4">
            <h2 className="text-xl font-bold mb-1">Laporan Data Pengiriman</h2>
            <p className="text-sm text-muted-foreground mb-4">Dicetak: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#2980b9] text-white">
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
                {displayedShipments.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{safeFormat(s.inputDate, "dd/MM/yyyy HH:mm")}</td>
                    <td className="px-3 py-2 font-medium">{s.invoiceNumber}</td>
                    <td className="px-3 py-2">{s.customer?.name || "-"}</td>
                    <td className="px-3 py-2">{s.destination}</td>
                    <td className="px-3 py-2">{s.expedition?.name || "-"}</td>
                    <td className="px-3 py-2">{s.receiptNumber || "-"}</td>
                    <td className="px-3 py-2">{s.totalNotes} Nota</td>
                    <td className="px-3 py-2">{getStatusLabel(s)}</td>
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

      {deleteTarget && (
        <DeleteConfirmDialog
          shipment={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {editTarget && (
        <EditShipmentDialog
          shipment={editTarget}
          activeExpeditions={activeExpeditions}
          sortedCustomers={sortedCustomers}
          brands={brands}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
    </>
  );
}
