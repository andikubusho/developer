import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useItems, useBulkUpdateStock, useStockLastUpdate } from "@/hooks/use-items";
import { useBranch } from "@/hooks/use-branch";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { 
  Search, 
  Package, 
  RefreshCw, 
  FileSpreadsheet, 
  Printer, 
  FileText, 
  Upload,
  Building2,
  ChevronLeft,
  ChevronRight,
  Monitor,
  ChevronDown,
  RotateCcw,
  Download,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const LAST_UPDATE_KEY = "monitor_gudang_stock_last_update";

export default function StockPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 50;

  const { selectedBranchId, selectedBranch, branches } = useBranch();
  
  // Fetch real last update from database
  const { data: lastUpdateData } = useStockLastUpdate(selectedBranchId || undefined);
  const lastUpdate = lastUpdateData?.lastUpdate ? new Date(lastUpdateData.lastUpdate) : null;

  const { data: paginatedData, isLoading } = useItems({ 
    branchId: selectedBranchId || undefined, 
    page, 
    limit, 
    search: debouncedSearch,
    stockStatus: stockFilter
  });

  const items = (paginatedData as any)?.items || [];
  const total = (paginatedData as any)?.total || 0;
  const totalPages = (paginatedData as any)?.pages || 0;


  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [stockFilter, debouncedSearch, selectedBranchId]);

  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <>
      <div className="relative mb-8 -mt-2">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl blur-xl opacity-20 animate-pulse" />
        <div className="relative bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/20">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner group transition-transform hover:scale-105">
                <Package className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-in zoom-in duration-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Monitoring Stok</h1>
                  <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">
                    Sales
                  </div>
                </div>
                <p className="text-orange-50/80 text-sm sm:text-base font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-200 animate-ping" />
                  Pantau ketersediaan & update stok barang
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-[10px] font-bold text-orange-200 uppercase tracking-widest opacity-70">Cabang Aktif</span>
                <span className="text-white font-black text-sm">{selectedBranch?.name || "-"}</span>
              </div>
              
              {(isAdmin || can("master_barang", "export") || can("master_barang", "print")) && (
                <PrintStockDialog 
                  branchId={selectedBranchId || undefined}
                  search={search}
                  branchName={selectedBranch?.name || "-"} 
                />
              )}
              <BulkUpdateStockDialog 
                items={items.slice(0, 50)} // Pass some items as template context
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="group relative overflow-hidden bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-orange-200/40 transition-all hover:-translate-y-1">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="w-16 h-16 text-orange-600" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100 shadow-inner">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Item Berbeda</p>
              <p className="text-3xl font-black text-slate-900 leading-none mt-1">{total}</p>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-emerald-200/40 transition-all hover:-translate-y-1">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Building2 className="w-16 h-16 text-emerald-600" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gudang / Cabang</p>
              <p className="text-xl font-black text-slate-900 mt-1 truncate">{selectedBranch?.name || "-"}</p>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-blue-200/40 transition-all hover:-translate-y-1">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <RefreshCw className="w-16 h-16 text-blue-600" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner">
              <RefreshCw className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Update Terakhir</p>
              <div className="mt-1">
                <p className="text-xl font-black text-slate-900 leading-none flex items-baseline gap-1">
                  {lastUpdate ? format(lastUpdate, "HH:mm") : "--:--"}
                  <span className="text-[10px] font-bold text-slate-400 uppercase">WIB</span>
                </p>
                <p className="text-[11px] font-black text-slate-500 mt-1 uppercase tracking-tighter">
                  {lastUpdate ? format(lastUpdate, "dd MMMM yyyy", { locale: id }) : "Belum ada update"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col md:flex-row gap-4 items-stretch relative group">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
          </div>
          <Input 
            placeholder="Cari kode atau nama barang..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-14 pl-12 bg-white border-slate-200 rounded-2xl shadow-sm focus-visible:ring-orange-500/20 focus-visible:border-orange-500 transition-all font-medium text-slate-700 w-full"
          />
          {total > 0 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-tighter hidden sm:block">
              {total} barang tersedia
            </div>
          )}
        </div>
      </div>

      {/* Stock Filter Buttons & Reset */}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="flex bg-white p-1.5 rounded-2xl border-2 border-slate-100 shadow-sm gap-1.5">
          <Button
            variant={stockFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStockFilter("all")}
            className={`h-10 px-4 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${
              stockFilter === "all" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600" : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            Semua
          </Button>
          <Button
            variant={stockFilter === "ready" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStockFilter("ready")}
            className={`h-10 px-4 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${
              stockFilter === "ready" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600" : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            Ada Stok
          </Button>
          <Button
            variant={stockFilter === "empty" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStockFilter("empty")}
            className={`h-10 px-4 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${
              stockFilter === "empty" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600" : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            Kosong
          </Button>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { setSearch(""); setStockFilter("all"); }}
          className="h-13 gap-2 bg-white border-slate-100 text-slate-500 hover:bg-slate-50 shadow-sm rounded-2xl px-5 transition-all active:scale-95 border-2 border-dashed hover:border-orange-300 hover:text-orange-600"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="font-bold whitespace-nowrap uppercase tracking-wider text-[10px]">Reset</span>
        </Button>

        {stockFilter !== "all" && (
          <span className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest animate-in fade-in slide-in-from-left-2 duration-300">
            {total.toLocaleString()} barang ditemukan
          </span>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-12">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="w-16 text-center font-bold text-slate-400 text-[10px] uppercase tracking-widest pl-6">No</TableHead>
              <TableHead className="font-bold text-slate-800 py-5">Barang</TableHead>
              <TableHead className="font-bold text-slate-800">Brand</TableHead>
              <TableHead className="text-center font-bold text-slate-800">Stock</TableHead>
              <TableHead className="text-right font-bold text-slate-800">Harga Grosir</TableHead>
              <TableHead className="text-right font-bold text-slate-800">Semi Grosir</TableHead>
              <TableHead className="text-right font-bold text-slate-800 pr-6">Retail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7} className="py-8"><div className="h-10 bg-slate-100 animate-pulse rounded-xl w-full" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-20 text-center text-slate-400 font-medium italic">Data tidak ditemukan</TableCell>
              </TableRow>
            ) : (
              items.map((item: any, idx: number) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors border-slate-100/50 group">
                  <TableCell className="text-center pl-6">
                     <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      {(page - 1) * limit + idx + 1}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-xs border border-white shadow-sm">
                        {item.code.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 group-hover:text-orange-600 transition-colors leading-tight">{item.name}</div>
                        <div className="font-mono text-[10px] font-black text-orange-600 mt-1">{item.code}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-slate-100 text-slate-500 border border-slate-200">
                      {item.brandCode}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center min-w-[50px] px-3 py-1.5 rounded-xl text-xs font-black border",
                      item.stock > 10 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      item.stock > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-rose-50 text-rose-700 border-rose-100'
                    )}>
                      {item.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-black text-slate-900 text-sm">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.wholesalePrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-black text-indigo-600 text-sm">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.semiWholesalePrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-black text-emerald-600 text-sm pr-6">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.retailPrice)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination in Desktop */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Halaman <span className="text-slate-900">{page}</span> dari <span className="text-slate-900">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="rounded-xl h-10 px-4 font-bold border border-slate-200 bg-white shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                className="rounded-xl h-10 px-4 font-bold border border-slate-200 bg-white shadow-sm"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4 mb-20">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-[2rem]" />
          ))
        ) : items.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-200 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Data stok tidak ditemukan</p>
          </div>
        ) : (
          items.map((item: any) => (
            <div key={item.id} className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50 hover:border-orange-200 transition-all active:scale-[0.98]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400 font-black text-xs border border-slate-100">
                    {item.code.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 leading-tight line-clamp-1">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100/50">
                        {item.code}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.brandCode}</span>
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter border",
                  item.stock > 10 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                  item.stock > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                  'bg-rose-50 text-rose-700 border-rose-100'
                )}>
                  {item.stock} Stok
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Grosir</span>
                  <span className="text-[11px] font-bold text-slate-900 mt-1">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.wholesalePrice)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-indigo-500">Semi</span>
                  <span className="text-[11px] font-bold text-indigo-600 mt-1">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.semiWholesalePrice)}
                  </span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">Retail</span>
                  <span className="text-[11px] font-bold text-emerald-600 mt-1">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.retailPrice)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 py-4">
             <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="rounded-xl h-12 flex-1 font-bold border border-slate-200 bg-white shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Prev
              </Button>
              <div className="text-[10px] font-black text-slate-500 bg-white px-4 h-12 flex items-center rounded-xl border border-slate-200">
                {page} / {totalPages}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                className="rounded-xl h-12 flex-1 font-bold border border-slate-200 bg-white shadow-sm"
              >
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
          </div>
        )}
      </div>
    </>
  );
}

function BulkUpdateStockDialog({ items: templateItems }: { items: any[] }) {
  const [open, setOpen] = useState(false);
  const [pasteData, setPasteData] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const { mutateAsync: bulkUpdateAsync, isPending } = useBulkUpdateStock();
  const { selectedBranchId, branches } = useBranch();
  const [importBranchId, setImportBranchId] = useState<number | null>(selectedBranchId || (branches.length > 0 ? branches[0].id : null));
  const [fileData, setFileData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const data = templateItems.length > 0 ? templateItems.map(item => ({
      "Kode Barang": item.code,
      "Nama Barang": item.name,
      "Stok": ""
    })) : [
      { "Kode Barang": "CONTOH-001", "Nama Barang": "Barang Contoh A", "Stok": "100" },
      { "Kode": "CONTOH-001", "Stok": "100" },
      { "Kode": "CONTOH-002", "Stok": "50" }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok");
    XLSX.writeFile(wb, "template_update_stok.xlsx");
  };

  const handleImport = async () => {
    if (importBranchId === null) {
      setStatus("Silakan pilih cabang target terlebih dahulu.");
      return;
    }

    let itemsToUpdate: any[] = [];

    // Prioritaskan data dari file jika ada
    if (fileData && fileData.length > 0) {
      itemsToUpdate = fileData;
    } else if (pasteData.trim()) {
      const lines = pasteData.trim().split("\n");
      itemsToUpdate = lines.map(line => {
        const parts = line.split(/\t|;/).map(p => p.trim());
        if (parts.length >= 2) {
          return {
            code: parts[0].toUpperCase(),
            stock: parseInt(parts[1].replace(/[^\d]/g, "") || "0"),
            branchId: importBranchId
          };
        }
        return null;
      }).filter((item): item is { code: string; stock: number; branchId: number } => item !== null);
    }

    if (itemsToUpdate.length > 0) {
      try {
        const CHUNK_SIZE = 25; // Diperkecil lagi agar tidak 503
        let totalUpdated = 0;
        const totalItems = itemsToUpdate.length;

        for (let i = 0; i < totalItems; i += CHUNK_SIZE) {
          const chunk = itemsToUpdate.slice(i, i + CHUNK_SIZE);
          setStatus(`Sedang mengupdate ${totalUpdated} / ${totalItems} item...`);
          await bulkUpdateAsync(chunk);
          totalUpdated += chunk.length;
          
          // Tambahkan sedikit jeda agar tidak di-block oleh firewall/rate-limit
          if (i + CHUNK_SIZE < totalItems) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        setStatus(`Berhasil mengupdate ${totalItems} item!`);
        setTimeout(() => {
          setOpen(false); 
          setPasteData(""); 
          setFileName("");
          setFileData(null);
          setStatus("");
          if (fileInputRef.current) fileInputRef.current.value = "";
        }, 1000);
      } catch (err: any) {
        console.error("Gagal update stok:", err);
        let errorMsg = err.message || "Koneksi terputus";
        if (errorMsg.includes("{")) {
          try {
            const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf("{")));
            errorMsg = parsed.message || errorMsg;
          } catch (e) {}
        }
        setStatus("Gagal: " + errorMsg);
      }
    } else {
      setStatus("Tidak ada data valid untuk diupdate.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (importBranchId === null) {
      setStatus("Pilih cabang target sebelum upload file.");
      e.target.value = "";
      return;
    }

    setFileName(file.name);
    setStatus("Membaca file...");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(ws);
        
        if (json.length === 0) {
          setStatus("File Excel kosong.");
          return;
        }

        const prepared = json.map(row => {
          const r: Record<string, any> = {};
          Object.keys(row).forEach(k => r[k.trim().toLowerCase()] = row[k]);
          
          // Pencarian header yang lebih fleksibel
          const codeKey = Object.keys(r).find(k => k.includes("kode") || k.includes("code"));
          const stockKey = Object.keys(r).find(k => k.includes("stok") || k.includes("stock") || k.includes("qty") || k.includes("jumlah"));
          
          const code = codeKey ? String(r[codeKey] || "").trim().toUpperCase() : "";
          const stockVal = stockKey ? String(r[stockKey] || "0") : "0";
          const stock = parseInt(stockVal.replace(/[^\d]/g, "") || "0");
          
          if (code) return { code, stock, branchId: importBranchId };
          return null;
        }).filter((item): item is { code: string; stock: number; branchId: number } => item !== null);

        if (prepared.length > 0) {
          setFileData(prepared);
          setStatus(`Berhasil membaca ${prepared.length} item. Klik 'Update Sekarang' untuk memproses.`);
        } else {
          setStatus("Format header salah. Pastikan kolom memiliki judul 'Kode' dan 'Stok'.");
        }
      } catch (err) {
        console.error("Gagal membaca file:", err);
        setStatus("Gagal membaca file Excel/CSV.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl font-bold bg-white shadow-sm gap-2 flex-1 md:flex-none h-11">
          <RefreshCw className={cn("w-4 h-4 text-primary", isPending && "animate-spin")} />
          <span>Update Stock</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
             <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-md">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            Update Stok Masal
          </DialogTitle>
          <DialogDescription className="text-orange-50/80 font-medium ml-15">
            Input stok barang dalam jumlah banyak sekaligus via Excel atau Paste.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6 bg-white">
          <div className="space-y-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <Label className="text-sm font-bold text-primary flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Pilih Cabang Target
            </Label>
            <Select 
              onValueChange={(val) => setImportBranchId(parseInt(val))} 
              value={importBranchId?.toString()}
            >
              <SelectTrigger className="h-11 bg-white border-primary/20 rounded-xl font-bold">
                <SelectValue placeholder="Pilih Cabang" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-700">Paste dari Excel (Kode [tab] Stock)</Label>
            <Textarea 
              placeholder="Contoh:&#10;SEM-001	50&#10;CAT-002	120"
              className="min-h-[150px] rounded-2xl border-slate-200 font-mono text-xs"
              value={pasteData}
              onChange={(e) => {
                setPasteData(e.target.value);
                if (e.target.value) setStatus("");
              }}
              disabled={!!fileName}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-slate-400">
              <span className="bg-white px-3">Atau Upload File</span>
            </div>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group relative overflow-hidden"
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            <div className="absolute top-2 right-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-slate-50 border border-slate-100 hover:bg-primary hover:text-white transition-all gap-1.5 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadTemplate();
                }}
              >
                <Download className="w-3 h-3" />
                Template
              </Button>
            </div>
            <Upload className={cn("h-8 w-8 mx-auto mb-2 transition-transform group-hover:scale-110", fileName ? "text-primary" : "text-slate-300")} />
            <div className="flex flex-col items-center gap-1">
              <p className={cn("text-sm font-bold", fileName ? "text-primary uppercase tracking-tight" : "text-slate-600")}>
                {fileName || "Klik untuk upload Excel/CSV"}
              </p>
              {fileName && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-6 text-[10px] font-black uppercase text-rose-500 hover:text-rose-600 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFileName("");
                    setFileData(null);
                    setStatus("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="w-3 h-3 mr-1" /> Hapus File
                </Button>
              )}
            </div>
          </div>
          
          {status && (
            <div className={cn(
              "p-3 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-1",
              status.includes("Gagal") || status.includes("Terjadi") || status.includes("tidak sesuai")
                ? "bg-rose-50 border-rose-100 text-rose-700" 
                : "bg-orange-50 border-orange-100 text-orange-700"
            )}>
              {isPending || status.includes("Membaca") ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
              )}
              <span className="text-xs font-black uppercase tracking-widest">{status}</span>
            </div>
          )}
        </div>

        <DialogFooter className="p-8 bg-slate-50 flex sm:justify-center gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">Batal</Button>
          <Button onClick={handleImport} disabled={isPending || (!pasteData && !fileName)} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black px-10 shadow-lg shadow-orange-200 h-12">
            {isPending ? "Memproses..." : "Update Sekarang"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrintStockDialog({ branchId, search, branchName }: { branchId?: number, search: string, branchName: string }) {
  const [open, setOpen] = useState(false);
  const [selectedPrices, setSelectedPrices] = useState<string[]>(["wholesalePrice", "semiWholesalePrice", "retailPrice"]);
  const [printStockFilter, setPrintStockFilter] = useState<"all" | "ready" | "empty">("all");
  
  const { data: allItems, isLoading } = useItems({ 
    branchId, 
    search, 
    all: true 
  });

  const items = Array.isArray(allItems) ? allItems : [];

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (printStockFilter === "ready") return item.stock > 0;
      if (printStockFilter === "empty") return item.stock === 0;
      return true;
    });
  }, [items, printStockFilter]);

  const togglePrice = (price: string) => {
    setSelectedPrices(prev => prev.includes(price) ? prev.filter(p => p !== price) : [...prev, price]);
  };

  const doPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const priceLabels: Record<string, string> = {
      wholesalePrice: "Grosir",
      semiWholesalePrice: "Semi Grosir",
      retailPrice: "Retail"
    };

    const headerHtml = `
      <div style="text-align: center; margin-bottom: 20px; font-family: sans-serif;">
        <h2 style="margin: 0; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">DAFTAR STOK BARANG</h2>
        <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Cabang: <strong>${branchName}</strong> | Tanggal: ${format(new Date(), "dd MMMM yyyy", { locale: id })}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      </div>
    `;

    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; width: 40px;">No</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Kode</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;"> Nama Barang</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Brand</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">Stok</th>
            ${selectedPrices.map(p => `<th style="border: 1px solid #e2e8f0; padding: 10px; text-align: right; white-space: nowrap; min-width: 80px;">${priceLabels[p]}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${filteredItems.map((item, i) => `
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">${i + 1}</td>
              <td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: bold; font-family: monospace;">${item.code}</td>
              <td style="border: 1px solid #e2e8f0; padding: 8px;">${item.name}</td>
              <td style="border: 1px solid #e2e8f0; padding: 8px; font-size: 10px; font-weight: bold;">${item.brandCode}</td>
              <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-weight: bold;">${item.stock}</td>
              ${selectedPrices.map(p => `
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right; font-family: monospace; white-space: nowrap;">
                  ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format((item as any)[p])}
                </td>
              `).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Stok Barang - ${branchName}</title>
            <style>
              @media print {
                @page { size: portrait; margin: 1cm; }
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${headerHtml}
            ${tableHtml}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
    printWindow.document.close();
  };

  const doExportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    const priceLabels: Record<string, string> = {
      wholesalePrice: "Grosir",
      semiWholesalePrice: "Semi",
      retailPrice: "Retail"
    };

    doc.setFontSize(18);
    doc.text("LAPORAN STOK BARANG", doc.internal.pageSize.getWidth() / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Cabang: ${branchName} | Tanggal: ${format(new Date(), "PPpp", { locale: id })}`, doc.internal.pageSize.getWidth() / 2, 28, { align: "center" });

    const tableHeaders = ["No", "Kode", "Nama Barang", "Stock", ...selectedPrices.map(p => priceLabels[p])];
    const tableData = filteredItems.map((item, i) => [
      i + 1,
      item.code,
      item.name,
      item.stock,
      ...selectedPrices.map(p => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format((item as any)[p]))
    ]);

    autoTable(doc, {
      startY: 35,
      head: [tableHeaders],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { fontStyle: "bold", cellWidth: 25 },
        2: { cellWidth: 'auto' },
        3: { halign: "center", fontStyle: "bold", cellWidth: 15 },
        ...selectedPrices.reduce((acc, _, idx) => ({ 
          ...acc, 
          [4 + idx]: { halign: "right", cellWidth: 'wrap' } 
        }), {})
      }
    });

    doc.save(`Stok_Barang_${branchName}_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const doExportExcel = () => {
    const priceLabels: Record<string, string> = {
      wholesalePrice: "Harga Grosir",
      semiWholesalePrice: "Harga Semi Grosir",
      retailPrice: "Harga Retail"
    };

    const data = filteredItems.map(item => {
      const row: any = {
        "Kode": item.code,
        "Nama Barang": item.name,
        "Brand": item.brandCode,
        "Stok": item.stock
      };
      selectedPrices.forEach(p => {
        row[priceLabels[p]] = (item as any)[p];
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok Barang");
    XLSX.writeFile(wb, `Stok_Barang_${branchName}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl font-bold bg-white shadow-sm gap-2 flex-1 md:flex-none h-11">
          <Printer className="w-4 h-4 text-slate-600" />
          <span>Cetak Stok</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-slate-900 text-white">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
             <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-md">
              <Printer className="w-6 h-6 text-white" />
            </div>
            Cetak Data Stok
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium ml-15">
            Pilih filter stok dan jenis harga untuk laporan.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6 bg-white max-h-[60vh] overflow-y-auto">
          <div className="space-y-3 pb-2">
            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Filter Stok</Label>
            <RadioGroup 
              value={printStockFilter} 
              onValueChange={(val: "all" | "ready" | "empty") => setPrintStockFilter(val)}
              className="grid grid-cols-1 gap-2"
            >
              <div 
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all",
                  printStockFilter === "all" ? "bg-slate-100 border-slate-900 shadow-sm" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                )}
                onClick={() => setPrintStockFilter("all")}
              >
                <RadioGroupItem value="all" id="stock-all" className="data-[state=checked]:bg-slate-900 data-[state=checked]:text-white" />
                <Label htmlFor="stock-all" className="font-bold cursor-pointer flex-1">Semua Stok</Label>
              </div>
              <div 
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all",
                  printStockFilter === "ready" ? "bg-slate-100 border-slate-900 shadow-sm" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                )}
                onClick={() => setPrintStockFilter("ready")}
              >
                <RadioGroupItem value="ready" id="stock-ready" className="data-[state=checked]:bg-slate-900 data-[state=checked]:text-white" />
                <Label htmlFor="stock-ready" className="font-bold cursor-pointer flex-1">Ada Stok</Label>
              </div>
              <div 
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all",
                  printStockFilter === "empty" ? "bg-slate-100 border-slate-900 shadow-sm" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                )}
                onClick={() => setPrintStockFilter("empty")}
              >
                <RadioGroupItem value="empty" id="stock-empty" className="data-[state=checked]:bg-slate-900 data-[state=checked]:text-white" />
                <Label htmlFor="stock-empty" className="font-bold cursor-pointer flex-1">Kosong Stok</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Filter Harga</Label>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer transition-all hover:bg-slate-100">
                <Checkbox id="p-wholesale" checked={selectedPrices.includes("wholesalePrice")} onCheckedChange={() => togglePrice("wholesalePrice")} />
                <Label htmlFor="p-wholesale" className="font-bold cursor-pointer flex-1">Harga Grosir</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer transition-all hover:bg-slate-100">
                <Checkbox id="p-semi" checked={selectedPrices.includes("semiWholesalePrice")} onCheckedChange={() => togglePrice("semiWholesalePrice")} />
                <Label htmlFor="p-semi" className="font-bold cursor-pointer flex-1 font-mono text-violet-700">Harga Semi Grosir</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer transition-all hover:bg-slate-100">
                <Checkbox id="p-retail" checked={selectedPrices.includes("retailPrice")} onCheckedChange={() => togglePrice("retailPrice")} />
                <Label htmlFor="p-retail" className="font-bold cursor-pointer flex-1 font-mono text-emerald-700">Harga Retail</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-slate-50 grid grid-cols-1 gap-3">
          <Button 
            onClick={doPrint} 
            disabled={isLoading || filteredItems.length === 0}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black gap-2 h-14 shadow-xl"
          >
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Monitor className="w-5 h-5" />}
            {isLoading ? "Menyiapkan Data..." : `Cetak ke Layar (${filteredItems.length} Barang)`}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={doExportPDF} 
              disabled={isLoading || filteredItems.length === 0}
              variant="outline" 
              className="rounded-xl font-bold bg-white border-slate-200 gap-2 h-12"
            >
              <FileText className="w-4 h-4 text-rose-600" /> PDF
            </Button>
            <Button 
              onClick={doExportExcel} 
              disabled={isLoading || filteredItems.length === 0}
              variant="outline" 
              className="rounded-xl font-bold bg-white border-slate-200 gap-2 h-12"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
            </Button>
          </div>
          {filteredItems.length === 0 && !isLoading && (
            <p className="text-center text-[10px] text-rose-500 font-black uppercase tracking-widest mt-2">Tidak ada data untuk dicetak</p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
