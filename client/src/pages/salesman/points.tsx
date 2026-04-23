import { useState, useMemo } from "react";
import { useSalesCustomers } from "@/hooks/use-sales-customers";
import { usePoints, useEarnPoints, useRedeemPoints, type PointLog } from "@/hooks/use-points";
import { useBranch } from "@/hooks/use-branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, Plus, Minus, History, Download, FileSpreadsheet, FileText, Printer, Star, Wallet, ArrowUpRight, ArrowDownRight, User } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn, safeFormat } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

export default function PointsPage() {
  const { selectedBranchId } = useBranch();
  const { data: customers = [], isLoading: loadingCustomers } = useSalesCustomers(selectedBranchId || undefined);
  const { can } = usePermissions();
  
  const [search, setSearch] = useState("");
  const [selectedCustomerCode, setSelectedCustomerCode] = useState<string | null>(null);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.code === selectedCustomerCode),
    [customers, selectedCustomerCode]
  );

  const { data: pointsData, isLoading: loadingPoints } = usePoints(selectedCustomerCode || undefined, selectedBranchId || undefined);
  const logs = pointsData?.logs || [];
  const totalPoint = pointsData?.totalPoint || 0;

  const filteredCustomers = useMemo(() => 
    customers.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.code?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => (b.totalPoint || 0) - (a.totalPoint || 0)),
    [customers, search]
  );

  const handleExportExcel = () => {
    if (!selectedCustomer) {
      // Export summary of all customers
      const data = filteredCustomers.map((c, i) => ({
        "No": i + 1,
        "Kode": c.code,
        "Nama Pelanggan": c.name,
        "Total Poin": c.totalPoint || 0
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Poin");
      XLSX.writeFile(wb, `rekap-poin-${format(new Date(), "yyyyMMdd")}.xlsx`);
    } else {
      // Export history for selected customer
      const data = logs.map((l, i) => ({
        "No": i + 1,
        "Tanggal": format(new Date(l.createdAt), "dd/MM/yyyy HH:mm"),
        "Tipe": l.type === "earn" ? "Penambahan" : "Penukaran",
        "Poin": l.type === "earn" ? l.point : -l.point
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `History ${selectedCustomer.name}`);
      XLSX.writeFile(wb, `history-poin-${selectedCustomer.code}-${format(new Date(), "yyyyMMdd")}.xlsx`);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    if (!selectedCustomer) {
      doc.text("Rekapitulasi Poin Toko", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [["No", "Kode", "Nama Pelanggan", "Total Poin"]],
        body: filteredCustomers.map((c, i) => [i + 1, c.code, c.name, c.totalPoint || 0])
      });
    } else {
      doc.text(`Riwayat Poin: ${selectedCustomer.name}`, 14, 15);
      doc.text(`Kode: ${selectedCustomer.code} | Total Poin: ${totalPoint}`, 14, 22);
      autoTable(doc, {
        startY: 28,
        head: [["No", "Tanggal", "Tipe", "Poin"]],
        body: logs.map((l, i) => [
          i + 1, 
          format(new Date(l.createdAt), "dd/MM/yyyy HH:mm"),
          l.type === "earn" ? "Penambahan" : "Penukaran",
          l.type === "earn" ? `+${l.point}` : `-${l.point}`
        ])
      });
    }
    doc.save(`laporan-poin-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  return (
    <>
      <div className="relative mb-8 -mt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-black tracking-tight text-slate-900">Point Toko</h1>
            <p className="text-muted-foreground font-medium">Kelola sistem loyalitas dan penukaran poin pelanggan.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-11 gap-2 flex-1 md:flex-none bg-white border-slate-200 hover:bg-slate-50 transition-all font-bold rounded-xl shadow-sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-11 gap-2 flex-1 md:flex-none bg-white border-slate-200 hover:bg-slate-50 transition-all font-bold rounded-xl shadow-sm">
              <FileText className="w-4 h-4 text-rose-500" />
              <span>PDF</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Customer List Sidebar */}
          <Card className="lg:col-span-4 h-fit border-none shadow-premium bg-slate-50/50">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari pelanggan..." 
                  className="pl-9 bg-white border-slate-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              {loadingCustomers ? (
                <div className="p-8 text-center text-muted-foreground">Memuat data...</div>
              ) : (
                <div className="flex flex-col">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomerCode(customer.code)}
                      className={`flex items-center justify-between p-4 text-left transition-all hover:bg-white group relative ${
                        selectedCustomerCode === customer.code 
                          ? "bg-white shadow-sm" 
                          : "border-b border-slate-100"
                      }`}
                    >
                      {selectedCustomerCode === customer.code && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          selectedCustomerCode === customer.code ? "bg-blue-600 text-white" : "bg-white text-slate-500 border border-slate-200"
                        }`}>
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-sm">
                            {customer.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {customer.code}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-700 flex items-center justify-end gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {customer.totalPoint || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Points</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Point Details & History */}
          <div className="lg:col-span-8 space-y-6">
            {!selectedCustomer ? (
              <Card className="h-[400px] flex flex-col items-center justify-center border-dashed border-2 bg-slate-50/30">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                  <User className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-600">Pilih Pelanggan</h3>
                <p className="text-sm text-slate-400">Pilih pelanggan di samping untuk melihat riwayat poin.</p>
              </Card>
            ) : (
              <>
                {/* Points Summary Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-none shadow-premium overflow-hidden group bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <Wallet className="w-16 h-16" />
                    </div>
                    <CardContent className="p-6">
                      <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mb-2">Sisa Saldo Poin</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black">{totalPoint}</span>
                        <span className="text-sm font-medium opacity-80 text-indigo-100">pts</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-premium bg-emerald-50/50">
                    <CardContent className="p-6">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Total Earned</p>
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                        <span className="text-2xl font-bold text-emerald-700">
                          {logs.filter(l => l.type === 'earn').reduce((sum, l) => sum + l.point, 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-premium bg-rose-50/50">
                    <CardContent className="p-6">
                      <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Total Redeemed</p>
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="w-5 h-5 text-rose-500" />
                        <span className="text-2xl font-bold text-rose-700">
                          {logs.filter(l => l.type === 'redeem').reduce((sum, l) => sum + l.point, 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Actions */}
                <Card className="border-none shadow-premium">
                  <CardContent className="p-6 flex flex-wrap gap-4">
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="font-bold text-slate-900">{selectedCustomer.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{selectedCustomer.code}</p>
                    </div>
                    <div className="flex gap-2">
                      <PointActionDialog 
                        type="earn" 
                        customerCode={selectedCustomer.code} 
                        customerName={selectedCustomer.name} 
                      />
                      <PointActionDialog 
                        type="redeem" 
                        customerCode={selectedCustomer.code} 
                        customerName={selectedCustomer.name} 
                        currentPoints={totalPoint}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* History Table */}
                <Card className="border-none shadow-premium">
                  <CardHeader className="border-b border-slate-50 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-lg">Riwayat Point</CardTitle>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-emerald-600 text-white border-none font-black text-xs px-3 py-1 shadow-lg shadow-emerald-100 flex gap-2 items-center">
                          <span className="opacity-70 uppercase tracking-tighter text-[9px]">Saldo Akhir:</span>
                          <span className="text-sm">{totalPoint}</span>
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px] border-slate-200 text-slate-400">
                          {logs.length} Transactions
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead className="w-[180px]">Tanggal</TableHead>
                          <TableHead>Tipe</TableHead>
                          <TableHead className="text-right">Point</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingPoints ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-12">Memuat riwayat...</TableCell></TableRow>
                        ) : logs.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">Belum ada riwayat poin.</TableCell></TableRow>
                        ) : (
                          logs.map((log) => (
                            <TableRow key={log.id} className="hover:bg-slate-50/30 transition-colors">
                              <TableCell className="text-sm font-medium text-slate-600">
                                {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm", { locale: idLocale })}
                              </TableCell>
                              <TableCell>
                                <Badge variant={log.type === 'earn' ? 'default' : 'destructive'} className={`
                                  ${log.type === 'earn' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-100'}
                                  border-none font-bold text-[10px] uppercase tracking-wider
                                `}>
                                  {log.type === 'earn' ? 'EARN' : 'REDEEM'}
                                </Badge>
                              </TableCell>
                              <TableCell className={`text-right font-black ${log.type === 'earn' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {log.type === 'earn' ? `+${log.point}` : `-${log.point}`}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                        {logs.length > 0 && (
                          <TableRow className="bg-slate-50/80 border-t-2 border-slate-100 hover:bg-slate-50/80">
                            <TableCell colSpan={2} className="text-right py-4">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Saldo Poin Akhir</span>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <span className="text-xl font-black text-slate-900">{totalPoint}</span>
                              <span className="text-[10px] font-bold text-slate-400 ml-1">pts</span>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function PointActionDialog({ type, customerCode, customerName, currentPoints = 0 }: { 
  type: "earn" | "redeem", 
  customerCode: string, 
  customerName: string,
  currentPoints?: number
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const earnMut = useEarnPoints();
  const redeemMut = useRedeemPoints();
  const { selectedBranchId } = useBranch();

  const isPending = earnMut.isPending || redeemMut.isPending;

  const handleSubmit = () => {
    const p = parseInt(amount);
    if (isNaN(p) || p <= 0) return;

    if (type === "redeem" && p > currentPoints) {
      alert("Poin tidak cukup!");
      return;
    }

    const mut = type === "earn" ? earnMut : redeemMut;
    mut.mutate({ customerCode, point: p, branchId: selectedBranchId! }, {
      onSuccess: () => {
        setOpen(false);
        setAmount("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={type === "earn" ? "default" : "outline"} 
          className={`gap-2 ${type === "earn" ? "bg-blue-600 hover:bg-blue-700" : "border-rose-200 text-rose-600 hover:bg-rose-50"}`}
        >
          {type === "earn" ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          {type === "earn" ? "Tambah Point" : "Tukar Point"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl bg-white">
        <div className={cn(
          "h-32 relative overflow-hidden flex items-center px-6",
          type === "earn" ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-rose-500 to-pink-600"
        )}>
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
              {type === "earn" ? <ArrowUpRight className="w-6 h-6 text-white" /> : <ArrowDownRight className="w-6 h-6 text-white" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-white leading-tight">
                {type === "earn" ? "Tambah Point" : "Tukar Point"}
              </DialogTitle>
              <DialogDescription className="text-white/80 text-xs font-medium mt-0.5">
                {customerName}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {type === "redeem" && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center shadow-inner">
              <div className="flex items-center gap-2 text-slate-500">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Saldo Saat Ini</span>
              </div>
              <span className="font-black text-slate-900 text-lg">{currentPoints} <span className="text-[10px] text-slate-400">pts</span></span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Jumlah Poin yang {type === "earn" ? "Diberikan" : "Ditukarkan"}
            </Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-focus-within:bg-blue-100 group-focus-within:text-blue-600 transition-colors">
                <Star className="w-4 h-4" />
              </div>
              <Input 
                id="amount" 
                type="number" 
                placeholder="0" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-14 h-14 rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-blue-500/10 transition-all font-black text-xl shadow-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 flex gap-2">
          <Button 
            variant="ghost" 
            onClick={() => setOpen(false)}
            className="flex-1 rounded-xl font-bold text-slate-400"
          >
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isPending || !amount}
            className={cn(
              "flex-[2] h-12 rounded-xl font-black shadow-lg transition-all active:scale-95",
              type === 'earn' 
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
            )}
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses...</span>
              </div>
            ) : (
              <span>Konfirmasi {type === "earn" ? "Tambah" : "Tukar"}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
