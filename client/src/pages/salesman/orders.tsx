import { useState, useRef, useMemo, useEffect, useDeferredValue } from "react";
import { useOrders, useCreateOrder, useUpdateOrder, useDeleteOrder } from "@/hooks/use-orders";
import { useItems } from "@/hooks/use-items";
import { useSalesCustomers as useCustomers } from "@/hooks/use-sales-customers";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useActiveTax } from "@/hooks/use-taxes";
import { usePermissions } from "@/hooks/use-permissions";
import { useGlobalPeriod } from "@/hooks/use-global-period";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useBranch } from "@/hooks/use-branch";
import { OrderWithItems } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Check, ChevronsUpDown, Package, Eye, Edit, Trash2, FileText, Plus, Search, Download, Monitor, ChevronDown, FileSpreadsheet, Calendar, User, Store, MapPin, Truck, ClipboardList, ReceiptText, Printer, X, CheckCircle2, ArrowLeft } from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const generateOrderPDF = (order: OrderWithItems) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text("SURAT ORDER", 105, 15, { align: "center" });
  
  doc.setFontSize(10);
  doc.text(`ID Order: #${order.id}`, 20, 25);
  doc.text(`Tanggal: ${format(new Date(order.date), "dd MMMM yyyy", { locale: idLocale })}`, 20, 30);
  doc.text(`Salesman: ${order.salesman?.displayName || "-"}`, 20, 35);
  
  doc.text(`Pelanggan: ${order.shopName}`, 120, 25);
  doc.text(`Kota: ${order.city}`, 120, 30);
  doc.text(`Ekspedisi: ${order.expeditionName}`, 120, 35);
  
  // Items Table
  const tableData = order.items.map(item => {
    const ppnRate = parseFloat(order.ppnRate || "0");
    const ppnAmount = Math.round(item.total * (ppnRate / 100));
    return [
      item.itemCode,
      item.itemName,
      item.qty.toString(),
      new Intl.NumberFormat("id-ID").format(item.price),
      item.discount || "0",
      new Intl.NumberFormat("id-ID").format(item.total),
      new Intl.NumberFormat("id-ID").format(ppnAmount),
      new Intl.NumberFormat("id-ID").format(item.total + ppnAmount),
    ];
  });
  
  autoTable(doc, {
    startY: 45,
    head: [['Kode', 'Nama Barang', 'Qty', 'Harga', 'Disc', 'Subtotal', `PPN`, 'Netto']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, // indigo-600
  });
  
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(14);
  doc.text(`TOTAL AKHIR: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(order.totalAmount)}`, 200, finalY, { align: "right" });

  if (order.notes) {
    const notesY = finalY + 15;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Keterangan Catatan:", 20, notesY);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const splitNotes = doc.splitTextToSize(order.notes, 170);
    doc.text(splitNotes, 20, notesY + 6);
  }
  
  doc.save(`order-${order.id}-${order.shopName}.pdf`);
};

export default function OrdersPage() {
  const { user } = useAuth();
  const username = user?.username?.toLowerCase() || '';
  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = !!(
    user?.authorizedDashboards?.some(d => ['admin', 'superadmin', 'root'].includes(d.toLowerCase())) || 
    username.includes('admin') || 
    username.includes('super') || 
    username.includes('root') || 
    userRole.includes('admin') || 
    userRole.includes('super') ||
    userRole.includes('root')
  );
  const isSalesman = !!user?.authorizedDashboards?.includes('salesman');
  const isSalesRole = user?.role?.toLowerCase() === 'sales';
  const shouldFilterBySalesman = isSalesRole && !isAdmin;

  const [, setLocation] = useLocation();
  const { can } = usePermissions();
  const { toast } = useToast();
  const { selectedBranch } = useBranch();
  const branchUsePpn = selectedBranch?.usePpn ?? false;
  const [filters, setFilters] = useState({
    shopName: "",
    region: "",
    date: "",
    itemQuery: "",
    status: "semua"
  });
  
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  
  const { startDate: globalStartDate, endDate: globalEndDate, isCurrentMonth, globalMonth, globalYear } = useGlobalPeriod();
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const { data: { orders = [], total: totalOrders = 0 } = {}, isLoading } = useOrders({ 
    branchId: selectedBranch?.id,
    shopName: debouncedFilters.shopName,
    region: debouncedFilters.region,
    date: debouncedFilters.date,
    salesmanId: shouldFilterBySalesman ? user?.id : undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    startDate: globalStartDate.toISOString(),
    endDate: globalEndDate.toISOString()
  });
  const createMut = useCreateOrder();
  const updateMut = useUpdateOrder();
  const deleteMut = useDeleteOrder();
  const { data: activeTax } = useActiveTax(selectedBranch?.id);

  const [openPreview, setOpenPreview] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [editingOrder, setEditingOrder] = useState<OrderWithItems | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithItems | null>(null);
  const [printingOrder, setPrintingOrder] = useState<OrderWithItems | null>(null);
  
  const printRef = useRef<HTMLDivElement>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchItem = !filters.itemQuery || order.items.some(item => 
        item.itemName.toLowerCase().includes(filters.itemQuery.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(filters.itemQuery.toLowerCase())
      );
      const matchStatus = filters.status === "semua" || order.status === filters.status;
      return matchItem && matchStatus;
    });
  }, [orders, filters.itemQuery, filters.status]);

  // Handle deep link query parameters (?viewOrder=ID or ?printOrder=ID)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewOrderId = params.get("viewOrder");
    const printOrderId = params.get("printOrder");
    
    if (orders.length > 0) {
      if (viewOrderId) {
        console.log("Deep link (view) detected for order:", viewOrderId);
        const order = orders.find(o => o.id.toString() === viewOrderId);
        if (order) {
          setEditingOrder(order);
          setDialogMode("view");
          setDialogOpen(true);
        }
      } else if (printOrderId) {
        console.log("Deep link (print) detected for order:", printOrderId);
        const order = orders.find(o => o.id.toString() === printOrderId);
        if (order) {
          handlePrintIndividual(order);
        }
      }
      
      // Clean up URL to prevent re-triggering on refresh
      if (viewOrderId || printOrderId) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [orders]);

  const handlePrintIndividual = (order: OrderWithItems) => {
    setPrintingOrder(order);
    // Wait for the printable area to render then trigger print
    // Increased timeout to ensure React rendering is committed on slower browsers
    setTimeout(() => {
      window.print();
      // Keep state for longer after dialog opens to ensure background doesn't vanish prematurely
      setTimeout(() => setPrintingOrder(null), 2000);
    }, 500);
  };

  const handleExportExcel = () => {
    const data = filteredOrders.flatMap(order => {
      const ppnRate = parseFloat(order.ppnRate || "0");
      return order.items.map(item => {
        const ppnItem = Math.round(item.total * (ppnRate / 100));
        return {
          "No Order": order.id,
          "Tanggal": format(new Date(order.date), "dd/MM/yyyy"),
          "Salesman": order.salesman?.displayName || "-",
          "Nama Toko": order.shopName,
          "Kota": order.city,
          "Ekspedisi": order.expeditionName,
          "Kode Barang": item.itemCode,
          "Nama Barang": item.itemName,
          "Qty": item.qty,
          "Harga": item.price,
          "Disc": item.discount,
          "Subtotal": item.total,
           "PPN": ppnItem,
           "Netto": item.total + ppnItem,
           "Total Order": order.totalAmount,
           "Status": order.status
         };
      });
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Surat Order");
    XLSX.writeFile(wb, `surat-order-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const { t } = useSettings();

  return (
    <>
      <div className="relative min-h-[calc(100vh-5rem)] pb-12 bg-[#f8fafc]">

        {/* Super App Header: Sticky Solid Gradient Background */}
        <div id="promo-header-container" className="sticky top-0 z-30 bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 shadow-2xl overflow-hidden mb-6 md:rounded-b-[3rem] rounded-b-[2rem]">
          {/* Decorative Elements */}
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[100%] bg-white/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-[-20%] right-[-5%] w-[40%] h-[70%] bg-amber-300/10 rounded-full blur-[60px]" />
          
          <div className="pt-4 md:pt-14 pb-4 md:pb-16 px-2 sm:px-4 max-w-7xl mx-auto relative z-10">
            {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2 md:gap-3">
            Surat Order 
            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[10px] md:text-xs">
              {isAdmin ? "Admin View" : "Sales"}
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Kelola data pesanan masuk dari toko dan pelanggan.</p>
        </div>


      </div>

      {!isCurrentMonth && (
        <div className={cn(
          "mb-6 px-4 py-3 rounded-2xl border flex items-center justify-center text-xs sm:text-sm font-bold tracking-wide shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full transition-all duration-500",
          "bg-amber-500/80 text-white border-amber-400 backdrop-blur-xl animate-pulse ring-2 ring-amber-400/50"
        )}>
          <Calendar className="w-4 h-4 mr-2 text-white" />
          Anda sedang melihat data historis: {months[globalMonth]} {globalYear}
        </div>
      )}

      {/* Main Content Card */}
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white px-2 md:px-4">
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setLocation("/salesman")} 
                   className="p-2 hover:bg-white/10 rounded-full transition-colors"
                 >
                    <ArrowLeft className="w-6 h-6" />
                 </button>
                 <div>
                  <h1 className="text-xl md:text-3xl font-black tracking-tight leading-none drop-shadow-md">
                    {t('page_input_order_title', 'Input Surat Order')}
                  </h1>
                  <p className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">
                    {t('page_input_order_desc', 'Kelola pesanan barang dari pelanggan dengan cepat.')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {(can("surat_order", "export") || can("surat_order", "print")) && (
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-sm rounded-xl px-4">
                          <Download className="w-4 h-4" />
                          <span className="font-bold">Export</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 w-48">
                        {can("surat_order", "print") && (
                          <DropdownMenuItem onClick={() => setOpenPreview(true)} className="rounded-xl py-3 font-bold cursor-pointer gap-3">
                            <Monitor className="w-4 h-4 text-slate-400" />
                            <span>Print Layar</span>
                          </DropdownMenuItem>
                        )}
                        {can("surat_order", "export") && (
                          <DropdownMenuItem onClick={handleExportExcel} className="rounded-xl py-3 font-bold cursor-pointer gap-3">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                            <span>Excel</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                
                {can("surat_order", "input") && (
                  <div className="flex-1 md:flex-none">
                    <Button 
                      className="w-full bg-white text-orange-600 hover:bg-orange-50 h-10 rounded-xl font-black shadow-lg shadow-orange-900/20 gap-2 border-none active:scale-95 transition-all"
                      onClick={() => {
                        setEditingOrder(null);
                        setDialogMode("create");
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="w-5 h-5 shrink-0" /> 
                      <span>Buat Surat Order</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Statistics Card */}
        <div className="max-w-7xl mx-auto px-1 sm:px-4 -mt-10 mb-8 relative z-20">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-orange-100/50 overflow-hidden">
            <CardContent className="p-4 sm:p-6 bg-white flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                <Input 
                  placeholder="Cari toko atau wilayah..." 
                  className="h-14 pl-14 pr-6 rounded-2xl border-slate-100 bg-slate-50/50 font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-orange-50 transition-all text-lg"
                  value={filters.shopName}
                  onChange={(e) => setFilters({ ...filters, shopName: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 w-full md:w-auto overflow-x-auto scrollbar-hide">
                 <div className="px-5 py-1.5 border-r border-slate-200 shrink-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
                    <p className="text-xl font-black text-orange-600 leading-none">{orders.length}</p>
                 </div>
                 <div className="px-5 py-1.5 shrink-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Terfilter</p>
                    <p className="text-xl font-black text-amber-500 leading-none">{filteredOrders.length}</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>


      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-none ring-1 ring-slate-100 font-display">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Hapus Surat Order?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-500">
              Tindakan ini tidak dapat dibatalkan. Pesanan untuk <span className="font-bold text-slate-900">{orderToDelete?.shopName}</span> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold h-11 border-slate-200">Batal</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold h-11"
              onClick={() => orderToDelete && deleteMut.mutate(orderToDelete.id, { onSuccess: () => setOrderToDelete(null) })}
            >
              Hapus Pesanan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="rounded-[2rem] border-none shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden bg-white/90 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardContent className="p-0">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px] font-display">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Cari Toko..." 
                className="pl-10 h-11 bg-white border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all"
                value={filters.shopName}
                onChange={(e) => setFilters({ ...filters, shopName: e.target.value })}
              />
            </div>
            <div className="relative flex-1 min-w-[200px] font-display">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Cari Wilayah/Kota..." 
                className="pl-10 h-11 bg-white border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all"
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
              />
            </div>
            <div className="relative w-48 font-display">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                type="date"
                className="pl-10 h-11 bg-white border-slate-200 rounded-xl font-bold shadow-sm"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
            <div className="w-48 font-display">
              <Select value={filters.status} onValueChange={(val) => setFilters({ ...filters, status: val })}>
                <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl font-black shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl font-bold">
                  <SelectItem value="semua">Semua Status</SelectItem>
                  <SelectItem value="menunggu">🔄 Menunggu</SelectItem>
                  <SelectItem value="diterima">✅ Diterima</SelectItem>
                  <SelectItem value="sudah di print">🖨️ Sudah di Print</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                <TableRow>
                  <TableHead className="w-24 font-black text-slate-500 uppercase text-[10px] tracking-wider px-6">ID Order</TableHead>
                  <TableHead className="w-32 font-black text-slate-500 uppercase text-[10px] tracking-wider">Tanggal</TableHead>
                  <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-wider">Pelanggan</TableHead>
                  <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-wider">Lokasi</TableHead>
                  <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-wider">Ekspedisi</TableHead>
                  <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-wider">Keterangan</TableHead>
                  <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-wider">Salesman</TableHead>
                  <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-wider text-center">Status</TableHead>
                    <TableHead className="text-right font-black text-slate-500 uppercase text-[10px] tracking-wider pr-6">Total</TableHead>
                    <TableHead className="text-right font-black text-slate-500 uppercase text-[10px] tracking-wider pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-20">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-400 font-bold uppercase text-[10px]">Memuat data...</p>
                        </div>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-20">
                        <div className="flex flex-col items-center gap-2 grayscale opacity-50">
                            <Package className="w-12 h-12 text-slate-300" />
                            <p className="text-slate-400 font-bold uppercase text-[10px]">Tidak ada data order</p>
                        </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className="hover:bg-slate-50/50 cursor-pointer group transition-colors border-slate-50"
                      onDoubleClick={async () => {
                        if (order.status === "menunggu") {
                          try {
                            await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status: "diterima" });
                            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                          } catch (err) {}
                        }
                        setEditingOrder(order);
                        setDialogMode("view");
                        setDialogOpen(true);
                      }}
                    >
                      <TableCell className="px-6 font-mono font-black text-orange-600">#{order.id}</TableCell>
                      <TableCell className="text-[11px] font-bold text-slate-500">{format(new Date(order.date), "dd MMM yyyy", { locale: idLocale })}</TableCell>
                      <TableCell>
                        <div className="font-black text-slate-900 text-sm">{order.shopName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.city}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-white border-slate-200 font-black text-[9px] uppercase text-slate-500 rounded-md">
                          {order.expeditionName}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-[11px] font-medium text-slate-400">
                        {order.notes || "-"}
                      </TableCell>
                       <TableCell className="text-[11px] font-bold text-slate-500">{order.salesman?.displayName || "-"}</TableCell>
                       <TableCell className="text-center">
                         <Badge 
                           variant="outline" 
                           className={cn(
                             "font-black text-[9px] uppercase rounded-full px-3 py-1 border-none shadow-sm mx-auto",
                             order.status === "menunggu" && "bg-amber-100 text-amber-700",
                             order.status === "diterima" && "bg-orange-100 text-orange-700",
                             order.status === "sudah di print" && "bg-emerald-100 text-emerald-700"
                           )}
                         >
                           {order.status === "menunggu" && "Menunggu"}
                           {order.status === "diterima" && "Diterima"}
                           {order.status === "sudah di print" && "Printed"}
                         </Badge>
                       </TableCell>
                       <TableCell className="text-right px-6 font-mono font-black text-orange-700 text-sm">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(order.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-2">
                          {can("surat_order", "view") && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (order.status === "menunggu") {
                                  try {
                                    await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status: "diterima" });
                                    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                                  } catch (err) {}
                                }
                                setEditingOrder(order);
                                setDialogMode("view");
                                setDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {can("surat_order", "print") && (
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-slate-200 bg-white font-display">
                                <DropdownMenuItem 
                                  className="font-bold text-slate-700 cursor-pointer py-2.5"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    console.log(`[Orders] Print requested for order ${order.id}`);
                                    try {
                                      if (order.status === "menunggu" || order.status === "diterima") {
                                        console.log(`[Orders] Updating status to 'sudah di print'...`);
                                        await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status: "sudah di print" });
                                        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                                      }
                                      handlePrintIndividual(order); 
                                    } catch (err) {
                                      console.error(`[Orders] Print status update failed:`, err);
                                      toast({
                                        title: "Catatan",
                                        description: "Status tidak dapat diperbarui, tetapi tetap mencoba mencetak...",
                                        variant: "destructive"
                                      });
                                      handlePrintIndividual(order);
                                    }
                                  }}
                                >
                                  <Printer className="w-4 h-4 mr-2" /> Cetak (Printer)
                                </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="font-bold text-slate-700 cursor-pointer py-2.5"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        if (order.status === "menunggu" || order.status === "diterima") {
                                          await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status: "sudah di print" });
                                          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                                        }
                                        generateOrderPDF(order);
                                      } catch (err) {
                                        generateOrderPDF(order);
                                      }
                                    }}
                                  >
                                  <Download className="w-4 h-4 mr-2 text-blue-600" /> Unduh PDF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          <div className="flex items-center gap-1 border-l pl-2 border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                            {can("surat_order", "edit") && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingOrder(order);
                                  setDialogMode("edit");
                                  setDialogOpen(true);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {can("surat_order", "delete") && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToDelete(order);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {isLoading ? (
               <div className="text-center py-12 text-slate-400 font-bold uppercase text-[10px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">Memuat data...</div>
            ) : filteredOrders.length === 0 ? (
               <div className="text-center py-12 text-slate-400 font-bold uppercase text-[10px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 italic">Tidak ada data order</div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4 active:scale-[0.98] transition-all" onClick={async () => { 
                  if (order.status === "menunggu") {
                    try {
                       await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status: "diterima" });
                       queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                    } catch (err) {}
                  }
                  setEditingOrder(order); 
                  setDialogMode("view"); 
                  setDialogOpen(true); 
                }}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                         <span className="font-mono font-black text-orange-600 text-[11px] bg-orange-50 px-2 py-0.5 rounded-full">#{order.id}</span>
                         <span className="font-black text-slate-400 text-[9px] uppercase tracking-tighter">{format(new Date(order.date), "dd/MM/yy")}</span>
                      </div>
                      <h3 className="font-black text-slate-900 truncate pr-4 text-base tracking-tight">{order.shopName}</h3>
                    </div>
                    <Badge 
                       variant="outline" 
                       className={cn(
                         "font-black text-[9px] uppercase rounded-full px-3 py-1 border-none shadow-sm",
                         order.status === "menunggu" && "bg-amber-100 text-amber-700",
                         order.status === "diterima" && "bg-orange-100 text-orange-700",
                         order.status === "sudah di print" && "bg-emerald-100 text-emerald-700"
                       )}
                     >
                       {order.status === "menunggu" && "Wait"}
                       {order.status === "diterima" && "OK"}
                       {order.status === "sudah di print" && "Print"}
                     </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-50">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Lokasi</p>
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-500" /> {order.city}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Salesman</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{order.salesman?.displayName || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 -mx-5 -mb-5 p-4 mt-2 rounded-b-3xl">
                    <div className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5" />
                        {order.expeditionName}
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-black text-orange-600 text-[15px]">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(order.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalOrders > pageSize && (
        <div className="mt-8 flex justify-center print:hidden">
          <Pagination>
            <PaginationContent className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-xl px-2 py-1.5 font-display">
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  className={cn("rounded-xl h-10 w-10 p-0 flex items-center justify-center transition-all", page === 1 ? "pointer-events-none opacity-20" : "cursor-pointer hover:bg-orange-50 hover:text-orange-600")}
                />
              </PaginationItem>
              
              <div className="px-6 flex items-center gap-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Hal {page} <span className="mx-1">/</span> {Math.ceil(totalOrders / pageSize)}
                </span>
                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-none font-black text-[10px] rounded-lg">
                  {totalOrders} Record
                </Badge>
              </div>

              <PaginationItem>
                <PaginationNext 
                  onClick={() => setPage(p => Math.min(Math.ceil(totalOrders / pageSize), p + 1))}
                  className={cn("rounded-xl h-10 w-10 p-0 flex items-center justify-center transition-all", page >= Math.ceil(totalOrders / pageSize) ? "pointer-events-none opacity-20" : "cursor-pointer hover:bg-orange-50 hover:text-orange-600")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Printable Area for Single Order */}
      <div id="section-to-print" className={cn("hidden print:block fixed inset-0 bg-white z-[9999] p-[1cm] print:static", !printingOrder && "print:hidden")}>
        {printingOrder ? <OrderPrintLayout order={printingOrder} activeTax={activeTax} branchUsePpn={branchUsePpn} branchName={selectedBranch?.name || "Monitor Gudang Ferio"} /> : null}
      </div>


      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #section-to-print, #section-to-print * { visibility: visible !important; }
          #section-to-print {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 1.3cm 1cm 0.5cm 1cm !important;
            background: white !important;
            z-index: 99999 !important;
            box-sizing: border-box !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: auto; margin: 0; }
        }
      `}</style>
      
      <OrderFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        mode={dialogMode} 
        initialData={editingOrder} 
        onPrint={handlePrintIndividual}
        branchUsePpn={branchUsePpn}
      />

      <PrintPreviewDialog 
        open={openPreview}
        onOpenChange={setOpenPreview}
        orders={filteredOrders}
        printRef={printRef}
      />
      </div>
    </>
  );
}


// Separate component for printing a single order
function OrderPrintLayout({ order, activeTax, branchUsePpn, branchName }: { order: OrderWithItems, activeTax: any, branchUsePpn: boolean, branchName: string }) {
  const ppnRate = branchUsePpn && activeTax ? parseFloat(activeTax.rate as unknown as string) : 0;
  const subtotal = order.items.reduce((sum, item) => sum + item.total, 0);
  const ppnTotal = branchUsePpn ? Math.round(subtotal * (ppnRate / 100)) : 0;

  return (
    <div className="max-w-full mx-auto bg-white p-4 font-mono text-black border border-black leading-tight text-[10px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-2 border-b border-black pb-1">
        <div>
          <h1 className="text-base font-bold uppercase tracking-tight leading-none">SURAT ORDER</h1>
          <p className="font-bold text-[8px] mt-0.5">ORD-#{order.id} | {format(new Date(order.date), "dd/MM/yy")}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase text-black">{branchName}</div>
        </div>
      </div>

      {/* Info Section */}
      <div className="grid grid-cols-2 gap-2 mb-2 border-b border-black pb-1">
        <div>
          <div className="uppercase font-bold underline mb-0.5 text-[8px]">DITUJUKAN KEPADA:</div>
          <div className="font-bold uppercase text-black text-[9px] leading-none">{order.shopName}</div>
          <p className="text-[8px] text-slate-800">{order.city} {order.region && ` - ${order.region}`}</p>
        </div>
        <div className="text-right">
          <div className="uppercase font-bold underline mb-0.5 text-[8px]">INFO PENGIRIMAN:</div>
          <div className="text-[8px] text-slate-800">Sales: <span className="font-bold text-black">{order.salesman?.displayName || "N/A"}</span></div>
          <div className="text-[8px] text-slate-800 mt-0.5">Ekspedisi: <span className="font-bold text-black">{order.expeditionName || "-"}</span></div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-2 text-[10px]">
        <thead>
          <tr className="border-b border-black bg-slate-50">
            <th className="py-0.5 text-left uppercase w-[35px] px-1 font-bold">Kode</th>
            <th className="py-0.5 text-left uppercase px-1 font-bold">Barang</th>
            <th className="py-0.5 text-center uppercase w-[25px] font-bold">Qty</th>
            <th className="py-0.5 text-right uppercase w-[55px] font-bold">Harga</th>
            <th className="py-0.5 text-right uppercase w-[30px] font-bold">Disc</th>
            <th className="py-0.5 text-right uppercase w-[60px] px-1 font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-black">
              <td className="py-0.5 font-bold px-1">{item.itemCode}</td>
              <td className="py-0.5 px-1">{item.itemName}</td>
              <td className="py-0.5 text-center font-bold">{item.qty}</td>
              <td className="py-0.5 text-right">{new Intl.NumberFormat("id-ID").format(item.price)}</td>
              <td className="py-0.5 text-right">{item.discount || "0"}%</td>
              <td className="py-0.5 text-right font-bold px-1">{new Intl.NumberFormat("id-ID").format(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="flex justify-end mb-2">
        <div className="w-[180px] border border-black p-1 bg-slate-50 font-bold">
          <div className="flex justify-between font-black text-[10px] text-black whitespace-nowrap gap-2">
            <span className="uppercase">Netto / Total:</span>
            <span>{new Intl.NumberFormat("id-ID").format(order.finalTotal)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-4 px-2 py-2 border-l-4 border-slate-200 bg-slate-50/50 rounded-r-lg">
          <div className="uppercase font-bold text-[8px] text-slate-500 tracking-wider">Keterangan / Catatan Order:</div>
          <p className="text-[9px] text-slate-800 leading-snug italic font-bold mt-0.5">{order.notes}</p>
        </div>
      )}
      
      {/* Signature */}
      <div className="flex justify-between px-2">
        <div className="text-center w-[80px]">
          <div className="mb-6 uppercase font-bold underline text-[7px] text-slate-500">Hormat Kami,</div>
          <div className="border-t border-black pt-0.5 px-1 font-bold text-[8px] uppercase">( {order.salesman?.displayName || "ADMIN"} )</div>
        </div>
        <div className="text-center w-[80px]">
          <div className="mb-6 uppercase font-bold underline text-[7px] text-slate-500">Penerima,</div>
          <div className="border-t border-black pt-0.5 px-1 font-bold text-[8px] uppercase">( {order.shopName} )</div>
        </div>
      </div>
    </div>
  );
}

interface OrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "view";
  initialData?: OrderWithItems | null;
  onPrint?: (order: OrderWithItems) => void;
  branchUsePpn?: boolean;
}

function OrderFormDialog({ open, onOpenChange, mode, initialData, onPrint, branchUsePpn = false }: OrderFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedBranch } = useBranch();
  const { data: itemsData } = useItems({ branchId: selectedBranch?.id, all: true });
  const items = Array.isArray(itemsData) ? itemsData : itemsData?.items || [];
  const { data: customers = [] } = useCustomers(selectedBranch?.id);
  const { data: activeTax } = useActiveTax(selectedBranch?.id);
  const createMut = useCreateOrder();
  const updateMut = useUpdateOrder();

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [openCustomerCombo, setOpenCustomerCombo] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [openPopovers, setOpenPopovers] = useState<Record<number, boolean>>({});
  const [openMobilePopovers, setOpenMobilePopovers] = useState<Record<number, boolean>>({});
  const [formData, setFormData] = useState({
    shopName: "",
    city: "",
    region: "",
    expeditionName: "",
    notes: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const deferredItemSearch = useDeferredValue(itemSearch);

  const filteredItems = useMemo(() => {
    if (!deferredItemSearch) return items.slice(0, 50);
    const search = deferredItemSearch.toLowerCase();
    return items
      .filter(i => i.code.toLowerCase().includes(search) || i.name.toLowerCase().includes(search))
      .slice(0, 50);
  }, [items, deferredItemSearch]);

  const ppnRate = activeTax ? parseFloat(activeTax.rate as unknown as string) : 0;

  useEffect(() => {
    if (open) {
      if (mode !== "create" && initialData) {
        // Automatic status update to 'diterima' if current status is 'menunggu'
        if (mode === "view" && initialData.status === "menunggu") {
          apiRequest("PATCH", `/api/orders/${initialData.id}/status`, { status: "diterima" })
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
            })
            .catch(err => console.error("[OrderFormDialog] Auto-receive failed:", err));
        }

        setFormData({
          shopName: initialData.shopName,
          city: initialData.city,
          region: initialData.region || "",
          expeditionName: initialData.expeditionName,
          notes: (initialData as any).notes || "",
          date: format(new Date(initialData.date), "yyyy-MM-dd"),
        });
        setOrderItems(initialData.items.map(item => ({
          ...item,
          total: item.total || (item.qty * item.price)
        })));
        const cust = customers.find(c => c.name === initialData.shopName);
        setSelectedCustomer(cust || null);
      } else {
        setFormData({
          shopName: "",
          city: "",
          region: "",
          expeditionName: "",
          notes: "",
          date: format(new Date(), "yyyy-MM-dd"),
        });
        setOrderItems([]);
        setSelectedCustomer(null);
      }
    }
  }, [open, mode, initialData, customers]);

  const calculateItemTotal = (qty: number, price: number, discountStr: string) => {
    let base = (qty || 0) * (price || 0);
    if (!discountStr) return base;
    const parts = discountStr.toString().split("+");
    for (const part of parts) {
      const d = parseFloat(part.trim());
      if (!isNaN(d) && d > 0) {
        base = base - (base * (d / 100));
      }
    }
    return Math.round(base);
  };

  const handleCustomerChange = (customerIdStr: string) => {
    const cust = customers.find(c => c.id.toString() === customerIdStr);
    setSelectedCustomer(cust);
    if (cust) {
      setFormData(prev => ({
        ...prev,
        shopName: cust.name,
        city: (cust as any).city || prev.city
      }));
      
      const newItems = orderItems.map(item => {
        if (!item.itemCode) return item;
        const catalogItem = items.find(i => i.code === item.itemCode);
        if (!catalogItem) return item;
        
        const newPrice = cust.priceType === 'wholesale' 
          ? catalogItem.wholesalePrice 
          : cust.priceType === 'semi_wholesale' 
            ? catalogItem.semiWholesalePrice 
            : catalogItem.retailPrice;
        const newTotal = calculateItemTotal(item.qty, newPrice, item.discount);
        return { ...item, price: newPrice, total: newTotal };
      });
      setOrderItems(newItems);
    }
  };

  const totalOrder = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  }, [orderItems]);

  const ppnAmount = useMemo(() => {
    if (!branchUsePpn || ppnRate === 0) return 0;
    return orderItems.reduce((sum, item) => sum + Math.round(item.total * (ppnRate / 100)), 0);
  }, [orderItems, ppnRate, branchUsePpn]);

  const finalTotal = useMemo(() => {
    return totalOrder + ppnAmount;
  }, [totalOrder, ppnAmount]);

  const addItem = () => {
    setOrderItems([...orderItems, { itemCode: "", itemName: "", qty: 1, discount: "", price: 0, total: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;

    if (field === "itemCode") {
      const selected = items.find(i => i.code === value);
      if (selected) {
        newItems[index].itemName = selected.name;
        newItems[index].price = selectedCustomer?.priceType === 'wholesale' 
          ? selected.wholesalePrice 
          : selectedCustomer?.priceType === 'semi_wholesale' 
            ? selected.semiWholesalePrice 
            : selected.retailPrice;
      }
    }

    if (["qty", "price", "discount", "itemCode"].includes(field)) {
      newItems[index].total = calculateItemTotal(
        newItems[index].qty,
        newItems[index].price,
        newItems[index].discount
      );
    }

    setOrderItems(newItems);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const onSubmit = () => {
    if (!formData.shopName || !formData.city || !formData.expeditionName) {
      toast({ title: "Gagal", description: "Mohon lengkapi data toko dan pengiriman", variant: "destructive" });
      return;
    }
    if (orderItems.length === 0) {
      toast({ title: "Gagal", description: "Mohon tambahkan minimal satu barang", variant: "destructive" });
      return;
    }

    const payload = {
      order: {
        ...formData,
        ppnRate: ppnRate.toString(),
        totalAmount: totalOrder,
        ppnAmount,
        finalTotal,
        date: new Date(formData.date),
        branchId: selectedBranch?.id,
        customerCode: selectedCustomer?.code,
      },
      items: orderItems,
    };

    if (mode === "edit" && initialData) {
      updateMut.mutate({ id: initialData.id, ...payload }, {
        onSuccess: () => {
          onOpenChange(false);
          toast({ title: "Berhasil", description: "Surat order berhasil diperbarui" });
        }
      });
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          onOpenChange(false);
          setOrderItems([]);
          toast({ title: "Berhasil", description: "Surat order berhasil disimpan" });
        }
      });
    }
  };

  const isView = mode === "view";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border-none ring-1 ring-slate-100">
        <DialogHeader className="p-8 bg-slate-900 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/10 rounded-xl">
              {isView ? <Eye className="h-6 w-6" /> : mode === "edit" ? <Edit className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {isView ? `Detail Surat Order #${initialData?.id}` : mode === "edit" ? `Edit Surat Order #${initialData?.id}` : "Input Surat Order Baru"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300 font-medium">
            {isView ? "Informasi lengkap mengenai detail pesanan barang." : "Lengkapi formulir pesanan barang di bawah ini."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Nama Salesman</Label>
              <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-100 rounded-xl text-slate-500 font-bold">
                <User className="h-4 w-4 mr-2 opacity-60" />
                {initialData?.salesman?.displayName || user?.displayName}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Tanggal Order</Label>
              <Input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                disabled={isView}
                className="h-11 border-slate-200 rounded-xl font-bold" 
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Ekspedisi</Label>
              <Input 
                placeholder="Contoh: JNE / Anteraja" 
                value={formData.expeditionName}
                onChange={(e) => setFormData({ ...formData, expeditionName: e.target.value })}
                disabled={isView}
                className="h-11 border-slate-200 rounded-xl font-bold" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Pelanggan (Toko)</Label>
              <Popover modal={true} open={openCustomerCombo && !isView} onOpenChange={setOpenCustomerCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={isView}
                    className="w-full justify-between bg-white h-11 border-slate-200 rounded-xl font-bold text-left px-3 hover:bg-slate-50 disabled:opacity-100 disabled:bg-slate-50"
                  >
                    {selectedCustomer
                      ? <span className="truncate">{selectedCustomer.name} {selectedCustomer.priceType === 'wholesale' ? '(Grosir)' : selectedCustomer.priceType === 'semi_wholesale' ? '(Semi Grosir)' : '(Retail)'}</span>
                      : formData.shopName || "Pilih Pelanggan..."}
                    {!isView && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                  </Button>
                </PopoverTrigger>
                {!isView && (
                  <PopoverContent className="w-[calc(100vw-2rem)] md:w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cari pelanggan..." className="h-11" />
                      <CommandEmpty>Pelanggan tidak ditemukan.</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-auto p-2">
                        {customers.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.name} ${c.priceType === 'wholesale' ? '(Grosir)' : c.priceType === 'semi_wholesale' ? '(Semi Grosir)' : '(Retail)'}`}
                            onSelect={() => {
                              handleCustomerChange(c.id.toString());
                              setOpenCustomerCombo(false);
                            }}
                            className="rounded-lg py-3 px-4 cursor-pointer"
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedCustomer?.id === c.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{c.name}</span>
                              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500">
                                {c.priceType === 'wholesale' ? 'Grosir' : c.priceType === 'semi_wholesale' ? 'Semi Grosir' : 'Retail'} • {(c as any).city || 'No City'}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                )}
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Kota</Label>
              <Input 
                placeholder="Masukkan kota" 
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={isView}
                className="h-11 border-slate-200 rounded-xl font-bold" 
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-indigo-500 pl-3">Daftar Barang Pesanan</h3>
              {!isView && (
                <Button type="button" onClick={addItem} size="sm" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold">
                  <Plus className="w-4 h-4 mr-1" /> Tambah Baris
                </Button>
              )}
            </div>

            {/* Desktop View Table */}
            <div className="hidden md:block border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
              <Table>
                <TableHeader className="bg-[hsl(var(--table-header-soft))]">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[40px] font-bold text-[10px] uppercase tracking-wider text-slate-500 text-center">No.</TableHead>
                    <TableHead className="min-w-[280px] font-bold text-[10px] uppercase tracking-wider text-slate-500">Barang</TableHead>
                    <TableHead className="w-[100px] font-bold text-[10px] uppercase tracking-wider text-slate-500 text-center">Qty</TableHead>
                    <TableHead className="w-[160px] font-bold text-[10px] uppercase tracking-wider text-slate-500 text-right">Harga</TableHead>
                    <TableHead className="w-[100px] font-bold text-[10px] uppercase tracking-wider text-slate-500 text-center">Disc (%)</TableHead>
                    <TableHead className="min-w-[120px] font-bold text-[10px] uppercase tracking-wider text-slate-500 text-right">Subtotal</TableHead>
                    {branchUsePpn && <TableHead className="min-w-[120px] font-bold text-[10px] uppercase tracking-wider text-amber-600 text-right">PPN ({ppnRate}%)</TableHead>}
                    {branchUsePpn && <TableHead className="min-w-[120px] font-bold text-[10px] uppercase tracking-wider text-indigo-600 text-right">Netto</TableHead>}
                    {!isView && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isView ? (branchUsePpn ? 9 : 7) : (branchUsePpn ? 10 : 8)} className="text-center py-12 text-slate-400 font-medium italic">
                        Belum ada barang dalam pesanan. Klik "Tambah Baris" untuk memulai.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orderItems.map((oi, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/30 border-slate-50 transition-colors">
                        <TableCell className="text-center font-mono text-[10px] font-bold text-slate-400">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="py-3">
                          {isView ? (
                            <div className="space-y-0.5">
                              <div className="text-[11px] font-bold text-slate-800 leading-tight">{oi.itemName}</div>
                              <div className="text-[9px] font-black text-indigo-500 font-mono tracking-tighter uppercase">{oi.itemCode}</div>
                            </div>
                          ) : (
                            <Popover 
                              modal={true} 
                              open={openPopovers[idx] || false} 
                              onOpenChange={(val) => setOpenPopovers(prev => ({ ...prev, [idx]: val }))}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full h-10 justify-between bg-white rounded-xl border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-left px-3 transition-all"
                                >
                                  <span className="truncate text-[11px] font-bold text-slate-700">
                                    {oi.itemName || "Pilih Barang..."}
                                  </span>
                                  <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[450px] p-0 shadow-2xl border-slate-100 rounded-2xl bg-[hsl(var(--menu-bg-soft))]" align="start">
                                <Command className="rounded-2xl">
                                  <CommandInput 
                                    placeholder="Cari kode atau nama barang..." 
                                    className="h-12 border-none focus:ring-0 font-medium" 
                                    onValueChange={setItemSearch}
                                  />
                                  <CommandEmpty className="py-6 text-sm text-slate-400 text-center font-medium">Barang tidak ditemukan.</CommandEmpty>
                                  <CommandGroup className="max-h-[350px] overflow-auto p-2">
                                    {filteredItems.map((i) => (
                                      <CommandItem
                                        key={i.code}
                                        value={`${i.code} ${i.name}`}
                                        onSelect={() => {
                                          updateItem(idx, "itemCode", i.code);
                                          setOpenPopovers(prev => ({ ...prev, [idx]: false }));
                                          // Auto focus to quantity
                                          setTimeout(() => {
                                            const el = document.getElementById(`qty-desktop-${idx}`);
                                            if (el) el.focus();
                                          }, 100);
                                        }}
                                        className="rounded-xl py-2.5 px-4 cursor-pointer hover:bg-slate-50 aria-selected:bg-indigo-50 transition-colors"
                                      >
                                        <div className="flex items-center gap-3 w-full">
                                          <div className={cn(
                                            "flex items-center justify-center h-5 w-5 rounded-full border border-slate-200 shrink-0",
                                            oi.itemCode === i.code ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white"
                                          )}>
                                            {oi.itemCode === i.code && <Check className="h-3 w-3" />}
                                          </div>
                                          <div className="flex flex-col min-w-0 flex-1">
                                            <span className="font-bold text-slate-900 text-[12px] leading-tight truncate">{i.name}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[10px] font-mono font-black text-indigo-500 uppercase tracking-tighter">{i.code}</span>
                                              <span className="text-slate-300">•</span>
                                              <span className="text-[10px] font-bold text-slate-400">
                                                {new Intl.NumberFormat("id-ID").format(
                                                  selectedCustomer?.priceType === 'wholesale' 
                                                    ? i.wholesalePrice 
                                                    : selectedCustomer?.priceType === 'semi_wholesale' 
                                                      ? i.semiWholesalePrice 
                                                      : i.retailPrice
                                                )}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            id={`qty-desktop-${idx}`}
                            type="number" 
                            min="1" 
                            value={oi.qty} 
                            onChange={(e) => updateItem(idx, "qty", parseInt(e.target.value))}
                            disabled={isView}
                            className="h-10 min-w-[70px] px-2 text-center rounded-xl font-bold border-slate-200 focus:border-indigo-400 focus:ring-indigo-100 transition-all text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative min-w-[140px]">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">Rp</span>
                            <Input 
                              type="text" 
                              value={oi.price ? new Intl.NumberFormat("id-ID").format(oi.price) : ""} 
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                updateItem(idx, "price", val ? parseInt(val) : 0);
                              }}
                              disabled={isView}
                              className="h-10 pl-6 pr-2 text-right font-mono font-bold text-[11px] bg-slate-50/50 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-100 transition-all w-full"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="text" 
                            placeholder="0"
                            value={oi.discount} 
                            onChange={(e) => updateItem(idx, "discount", e.target.value)}
                            disabled={isView}
                            className="h-10 min-w-[70px] text-center font-mono font-bold text-[11px] border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-100 transition-all"
                          />
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <div className="text-[11px] font-mono font-bold text-slate-700">
                            {new Intl.NumberFormat("id-ID").format(oi.total)}
                          </div>
                        </TableCell>
                        {branchUsePpn && (
                          <TableCell className="text-right py-3 bg-amber-50/20">
                            <div className="text-[10px] font-mono font-bold text-amber-600">
                              {new Intl.NumberFormat("id-ID").format(Math.round(oi.total * (ppnRate / 100)))}
                            </div>
                          </TableCell>
                        )}
                        {branchUsePpn && (
                          <TableCell className="text-right py-3 bg-indigo-50/20">
                            <div className="text-[11px] font-mono font-bold text-indigo-700">
                              {new Intl.NumberFormat("id-ID").format(oi.total + Math.round(oi.total * (ppnRate / 100)))}
                            </div>
                          </TableCell>
                        )}
                        {!isView && (
                          <TableCell className="text-center pr-4">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeItem(idx)} 
                              className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View Cards */}
            <div className="md:hidden space-y-4">
              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-medium italic border rounded-2xl bg-slate-50/50">
                  Belum ada barang. Klik "Tambah Baris".
                </div>
              ) : (
                orderItems.map((oi, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">Item #{idx + 1}</span>
                      {!isView && (
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Pilih Barang</Label>
                        {isView ? (
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <div className="text-sm font-bold text-slate-800 leading-tight">{oi.itemName}</div>
                            <div className="text-[10px] font-black text-indigo-500 font-mono tracking-tighter uppercase mt-0.5">{oi.itemCode}</div>
                          </div>
                        ) : (
                          <Popover 
                            modal={true}
                            open={openMobilePopovers[idx] || false}
                            onOpenChange={(val) => setOpenMobilePopovers(prev => ({ ...prev, [idx]: val }))}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full h-11 justify-between bg-white rounded-xl border-slate-200 hover:border-indigo-300 text-left px-3 shadow-none"
                              >
                                <span className="truncate text-sm font-bold text-slate-700">
                                  {oi.itemName || "Pilih Barang..."}
                                </span>
                                <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 text-slate-400" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[calc(100vw-3rem)] max-w-sm p-0 shadow-2xl border-slate-100 rounded-2xl bg-[hsl(var(--menu-bg-soft))]" align="start">
                              <Command className="rounded-2xl">
                                <CommandInput 
                                  placeholder="Cari kode atau nama barang..." 
                                  className="h-12 border-none focus:ring-0 font-medium" 
                                  onValueChange={setItemSearch}
                                />
                                <CommandEmpty className="py-6 text-sm text-slate-400 text-center font-medium">Barang tidak ditemukan.</CommandEmpty>
                                <CommandGroup className="max-h-[300px] overflow-auto p-2">
                                  {filteredItems.map((i) => (
                                    <CommandItem
                                      key={i.code}
                                      value={`${i.code} ${i.name}`}
                                      onSelect={() => {
                                        updateItem(idx, "itemCode", i.code);
                                        setOpenMobilePopovers(prev => ({ ...prev, [idx]: false }));
                                        // Auto focus to quantity mobile
                                        setTimeout(() => {
                                          const el = document.getElementById(`qty-mobile-${idx}`);
                                          if (el) el.focus();
                                        }, 100);
                                      }}
                                      className="rounded-xl py-3 px-4 cursor-pointer hover:bg-slate-50 aria-selected:bg-indigo-50 transition-colors"
                                    >
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-slate-900 text-xs leading-tight truncate">{i.name}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[9px] font-mono font-black text-indigo-500 uppercase tracking-tighter">{i.code}</span>
                                          <span className="text-slate-300">•</span>
                                          <span className="text-[9px] font-bold text-slate-400">
                                            {new Intl.NumberFormat("id-ID").format(selectedCustomer?.priceType === 'wholesale' ? i.wholesalePrice : i.retailPrice)}
                                          </span>
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Jumlah (Qty)</Label>
                          <Input 
                            id={`qty-mobile-${idx}`}
                            type="number" 
                            min="1" 
                            value={oi.qty} 
                            onChange={(e) => updateItem(idx, "qty", parseInt(e.target.value))}
                            disabled={isView}
                            className="h-11 rounded-xl font-bold border-slate-200 text-center shadow-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Diskon (%)</Label>
                          <Input 
                            type="text" 
                            placeholder="0"
                            value={oi.discount || "0"} 
                            onChange={(e) => updateItem(idx, "discount", e.target.value)}
                            disabled={isView}
                            className="h-11 text-center font-mono font-bold border-slate-200 rounded-xl shadow-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Harga Satuan</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                          <Input 
                            type="text" 
                            value={oi.price ? new Intl.NumberFormat("id-ID").format(oi.price) : ""} 
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              updateItem(idx, "price", val ? parseInt(val) : 0);
                            }}
                            disabled={isView}
                            className="h-11 pl-8 text-right font-mono font-bold text-sm bg-slate-50/50 border-slate-200 rounded-xl shadow-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-50 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter px-1">
                        <span>Subtotal</span>
                        <span className="text-slate-900 font-mono text-xs">{new Intl.NumberFormat("id-ID").format(oi.total)}</span>
                      </div>
                      {branchUsePpn && (
                        <>
                          <div className="flex justify-between items-center text-[9px] font-black text-amber-500/70 uppercase tracking-tighter px-1">
                            <span>PPN ({ppnRate}%)</span>
                            <span className="font-mono text-xs">{new Intl.NumberFormat("id-ID").format(Math.round(oi.total * (ppnRate / 100)))}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-black text-indigo-600 uppercase tracking-tighter px-1 pt-1">
                            <span>Total Netto</span>
                            <span className="font-mono text-sm">{new Intl.NumberFormat("id-ID").format(oi.total + Math.round(oi.total * (ppnRate / 100)))}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start pt-6 gap-6">
            {/* Notes Field */}
            <div className="flex-1 w-full space-y-2">
              <Label className="font-bold text-slate-700 uppercase text-[10px] tracking-widest pl-1">Keterangan / Catatan Order</Label>
              <Textarea 
                placeholder="Contoh: Barang titipan, kirim sore hari, dll..." 
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={isView}
                className="min-h-[100px] rounded-[1.5rem] border-slate-200 focus:ring-indigo-500/20 bg-white/50 backdrop-blur-sm p-4 font-medium resize-none shadow-sm"
              />
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-[2rem] min-w-[380px] w-full md:w-auto shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-indigo-300/30"></div>
              <div className="relative space-y-4">
                <div className="flex justify-between items-center px-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-indigo-400">Total Tagihan</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Sudah termasuk PPN (jika ada)</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-3xl font-black font-mono text-indigo-700 tracking-tighter">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(finalTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="py-6 px-10 bg-white border-t border-slate-100 flex items-center justify-between mt-0 select-none">
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="h-12 px-8 rounded-2xl font-bold border-slate-200 text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
            >
              <X className="w-4 h-4 mr-2" />
              {isView ? "Tutup" : "Batal"}
            </Button>
            {isView && initialData && (
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  className="h-12 px-6 rounded-2xl font-bold border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all active:scale-95"
                  onClick={async () => {
                    try {
                      const curStatus = initialData.status?.toLowerCase();
                      if (curStatus === "menunggu" || curStatus === "diterima") {
                        await apiRequest("PATCH", `/api/orders/${initialData.id}/status`, { status: "sudah di print" });
                        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                      }
                      if (onPrint) onPrint(initialData);
                    } catch (err) {
                      console.error("[OrdersDialog] Print update failed:", err);
                      toast({ 
                        title: "Catatan", 
                        description: "Status tidak dapat diperbarui, tetapi tetap mencoba mencetak...", 
                        variant: "destructive" 
                      });
                      if (onPrint) onPrint(initialData);
                    }
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" /> Cetak
                </Button>
                <Button 
                  variant="outline"
                  className="h-12 px-6 rounded-2xl font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-all active:scale-95"
                  onClick={async () => {
                    try {
                      const curStatus = initialData.status?.toLowerCase();
                      if (curStatus === "menunggu" || curStatus === "diterima") {
                        await apiRequest("PATCH", `/api/orders/${initialData.id}/status`, { status: "sudah di print" });
                        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                      }
                      generateOrderPDF(initialData);
                    } catch (err) {
                      generateOrderPDF(initialData);
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
              </div>
            )}
          </div>
          {!isView && (
            <Button 
              onClick={onSubmit} 
              disabled={createMut.isPending || updateMut.isPending}
              className="h-12 px-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] active:shadow-md"
            >
              {(createMut.isPending || updateMut.isPending) ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Menyimpan...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{mode === "edit" ? "Perbarui Order" : "Simpan Surat Order"}</span>
                </div>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function PrintPreviewDialog({ open, onOpenChange, orders, printRef }: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void, 
  orders: any[],
  printRef: React.RefObject<HTMLDivElement>
}) {
  const handlePrintLayar = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0 rounded-[2rem] overflow-hidden border-none shadow-2xl bg-white/95 backdrop-blur-xl">
        <DialogHeader className="p-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl">
                <Monitor className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">Pratinjau Cetak Layar</DialogTitle>
                <DialogDescription className="text-slate-400 font-bold">Review data pesanan sebelum dicetak ke printer.</DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-white/10 border-white/20 text-white font-black px-4 py-1.5 rounded-xl uppercase tracking-widest text-[10px]">
                {orders.length} Records
              </Badge>
              <Button onClick={handlePrintLayar} className="bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl h-12 px-8 shadow-lg shadow-orange-900/20 gap-2 border-none active:scale-95 transition-all">
                <Printer className="w-5 h-5" /> Cetak Sekarang
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-10 bg-slate-50/50">
          <div ref={printRef} className="bg-white p-12 shadow-2xl rounded-3xl mx-auto max-w-[21cm] min-h-[29.7cm] border border-slate-100">
             <div className="flex justify-between items-center mb-10 border-b-2 border-slate-900 pb-6">
                <div className="flex items-center gap-4">
                   <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center">
                      <ClipboardList className="text-white w-10 h-10" />
                   </div>
                   <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-1">Daftar Surat Order</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Monitor Gudang Ferio • Laporan Sistem</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Tanggal Cetak</p>
                   <p className="text-lg font-black text-slate-900 leading-none">{format(new Date(), "dd MMMM yyyy", { locale: idLocale })}</p>
                </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full border-collapse">
                 <thead>
                   <tr className="bg-slate-900 text-white">
                     <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border border-slate-800 w-12">No</th>
                     <th className="py-4 px-4 text-left text-[10px] font-black uppercase tracking-widest border border-slate-800 w-24">ID</th>
                     <th className="py-4 px-4 text-left text-[10px] font-black uppercase tracking-widest border border-slate-800">Pelanggan</th>
                     <th className="py-4 px-4 text-left text-[10px] font-black uppercase tracking-widest border border-slate-800">Kota</th>
                     <th className="py-4 px-4 text-left text-[10px] font-black uppercase tracking-widest border border-slate-800">Keterangan</th>
                     <th className="py-4 px-4 text-left text-[10px] font-black uppercase tracking-widest border border-slate-800">Salesman</th>
                     <th className="py-4 px-4 text-right text-[10px] font-black uppercase tracking-widest border border-slate-800">Total</th>
                   </tr>
                 </thead>
                 <tbody>
                   {orders.map((order, idx) => (
                     <tr key={order.id} className="border-b border-slate-100 last:border-slate-900">
                       <td className="py-4 px-4 text-center font-bold text-slate-500 text-xs border border-slate-100">{idx + 1}</td>
                       <td className="py-4 px-4 font-black text-orange-600 text-xs border border-slate-100">#{order.id}</td>
                       <td className="py-4 px-4 font-bold text-slate-900 text-xs border border-slate-100">{order.shopName}</td>
                       <td className="py-4 px-4 font-medium text-slate-500 text-xs border border-slate-100">{order.city}</td>
                       <td className="py-4 px-4 font-medium text-slate-400 text-[10px] border border-slate-100 italic">{order.notes || "-"}</td>
                       <td className="py-4 px-4 font-medium text-slate-500 text-xs border border-slate-100">{order.salesman?.displayName || "-"}</td>
                       <td className="py-4 px-4 text-right font-black text-slate-900 text-xs border border-slate-100">
                         {new Intl.NumberFormat("id-ID").format(order.totalAmount)}
                       </td>
                     </tr>
                   ))}
                   <tr className="bg-slate-50 font-bold">
                     <td colSpan={5} className="py-4 px-6 text-right text-[10px] font-black uppercase text-slate-400 border border-slate-200">TOTAL KELOMPOK</td>
                     <td className="py-4 px-4 text-right font-black text-orange-600 text-sm border border-slate-200">
                       {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(orders.reduce((sum, o) => sum + o.totalAmount, 0))}
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>

             <div className="mt-12 pt-12 border-t flex justify-between items-start text-slate-400">
                <div className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                   * Laporan ini dihasilkan secara otomatis oleh sistem.<br/>
                   * Seluruh data yang ditampilkan sesuai dengan filter layar saat ini.
                </div>
                <div className="text-right flex flex-col items-end">
                   <div className="w-48 h-px bg-slate-200 mb-2"></div>
                   <p className="text-[10px] font-black text-slate-900 uppercase">Administrator Sistem</p>
                </div>
             </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-white border-t border-slate-100 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold h-12 px-8">Tutup Pratinjau</Button>
        </DialogFooter>
      </DialogContent>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #promo-header-container, button, .dialog-footer { display: none !important; }
          .dialog-content { border: none !important; box-shadow: none !important; }
          div[ref] { visibility: visible !important; position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; width: 100% !important; }
          div[ref] * { visibility: visible !important; }
        }
      `}</style>
    </Dialog>
  );
}
