import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CustomerSearchSelect } from "@/components/promo/CustomerSearchSelect";
import { Loader2, Calculator, Save, AlertTriangle, CheckCircle2, Trash2, Edit, Eye, Printer, Award, TrendingUp, Gift, Zap, AlertCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatIndonesiaDate, parseIndonesiaDate, formatRibuan, parseRibuan } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useBranch } from "@/hooks/use-branch";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function TransaksiIntegrated() {
  const { toast } = useToast();
  const { selectedBranchId } = useBranch();
  const { can } = usePermissions();
  const [pelangganId, setPelangganId] = useState<string>("");

  const [noFaktur, setNoFaktur] = useState("");
  const [tglFaktur, setTglFaktur] = useState(format(new Date(), "dd/MM/yyyy"));
  const [qty, setQty] = useState<string>("");
  const [nilaiFaktur, setNilaiFaktur] = useState<string>("");
  const [brandCode, setBrandCode] = useState<string>("");
  
  const [preview, setPreview] = useState<any>(null);
  const [isCalculated, setIsCalculated] = useState(false);
  const [editTransactionId, setEditTransactionId] = useState<number | null>(null);
  const [viewTransaction, setViewTransaction] = useState<any>(null);
  const [viewTransactionPrint, setViewTransactionPrint] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [selectedPrograms, setSelectedPrograms] = useState<Array<{ id: number; jenisProgram: string; programName: string; checked: boolean }>>([]); 

  const hasActivePromo = useMemo(() => {
    if (!preview) return false;
    return (
      (preview.cashbacks && preview.cashbacks.length > 0) ||
      (preview.pakets && preview.pakets.length > 0) ||
      (preview.principalPrograms && preview.principalPrograms.length > 0) ||
      (preview.point && preview.point.peroleh > 0) ||
      (preview.cutting && preview.cutting.length > 0)
    );
  }, [preview]);

  // Fix 5 — resetCalc() terpusat
  const resetCalc = () => {
    setIsCalculated(false);
    setPreview(null);
  };

  const toggleProgramSelection = useCallback((referensiId: number, jenisProgram: string) => {
    setSelectedPrograms(prev => prev.map(p => 
      (p.id === referensiId && p.jenisProgram === jenisProgram) 
        ? { ...p, checked: !p.checked }
        : p
    ));
    resetCalc(); // Reset calculation when selection changes
  }, []);

  const checkedPrograms = useMemo(() => selectedPrograms.filter(p => p.checked), [selectedPrograms]);
  const hasCheckedPrograms = checkedPrograms.length > 0;

  const { data: pelanggan } = useQuery<any[]>({
    queryKey: ["/api/sales-customers", { branchId: selectedBranchId }],
    queryFn: async () => {
       const res = await fetch(`/api/sales-customers?branchId=${selectedBranchId}`);
       if (!res.ok) throw new Error("Gagal mengambil data pelanggan");
       return res.json();
    },
    enabled: !!selectedBranchId
  });

  const { data: brands = [] } = useQuery<any[]>({
    queryKey: ["/api/promo/brands", { branchId: selectedBranchId }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/promo/brands?branchId=${selectedBranchId}`);
      return await res.json();
    },
    enabled: !!selectedBranchId
  });

  // Query to fetch active programs for selected customer & brand
  const { data: activePrograms, isLoading: loadingPrograms } = useQuery<any[]>({
    queryKey: ['/api/pelanggan-program', pelangganId, selectedBranchId, brandCode],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pelanggan-program?pelangganId=${pelangganId}&branchId=${selectedBranchId}&brandCode=${brandCode}`);
      return await res.json();
    },
    enabled: !!pelangganId && !!brandCode
  });

  // Auto-populate selectedPrograms whenever activePrograms changes
  useEffect(() => {
    if (activePrograms && activePrograms.length > 0) {
      const aktif = activePrograms.filter((p: any) => p.status === 'aktif');
      setSelectedPrograms(aktif.map((p: any) => ({
        id: p.referensiId,
        jenisProgram: p.jenisProgram,
        programName: p.programName || `${p.jenisProgram} #${p.referensiId}`,
        checked: true
      })));
    } else {
      setSelectedPrograms([]);
    }
  }, [activePrograms]);


  const calculateMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        tglFaktur: parseIndonesiaDate(data.tglFaktur),
        selectedPrograms: data.selectedPrograms
      };
      const res = await apiRequest("POST", "/api/promo/calculate", payload);
      return res.json();
    },
    onSuccess: (data) => {
      setPreview(data);
      setIsCalculated(true);
      toast({ title: "Kalkulasi Berhasil", description: "Silakan periksa preview hasil promo." });
    },
    onError: (err: any) => {
      toast({ 
        title: "Kalkulasi Gagal", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const endpoint = editTransactionId ? `/api/promo/transactions/${editTransactionId}` : "/api/promo/save-transaction";
      const method = editTransactionId ? "PUT" : "POST";
      const res = await apiRequest(method, endpoint, {
        pelangganId: parseInt(pelangganId),
        noFaktur,
        tglFaktur: parseIndonesiaDate(tglFaktur),
        qty: parseInt(qty),
        nilaiFaktur: parseFloat(parseRibuan(nilaiFaktur)),
        brandCode,
        branchId: selectedBranchId,
        selectedPrograms: checkedPrograms.map(p => ({ id: p.id, jenisProgram: p.jenisProgram }))
      });
      return res.json();
    },
    onSuccess: () => {
      setEditTransactionId(null);
      setPreview(null);
      setIsCalculated(false);
      setNoFaktur("");
      setQty("");
      setNilaiFaktur("");
      toast({ title: "Tersimpan", description: "Transaksi berhasil diperbarui/disimpan secara atomik." });
      queryClient.invalidateQueries({ queryKey: ["/api/promo/transactions", { branchId: selectedBranchId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/promo/monitoring"] });
    },
    onError: (err: any) => {
      toast({ 
        title: "Gagal Menyimpan", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<any[]>({
    queryKey: ["/api/promo/transactions", { branchId: selectedBranchId }],
    queryFn: async () => {
       const res = await apiRequest("GET", `/api/promo/transactions?branchId=${selectedBranchId}`);
       return res.json();
    },
    enabled: !!selectedBranchId
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/promo/transactions/${id}`);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/transactions", { branchId: selectedBranchId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/promo/monitoring", { branchId: selectedBranchId }] });
      toast({ 
        title: "Terhapus", 
        description: data.message || "Transaksi promo telah dihapus." 
      });
    },
    onError: (err: any) => {
       toast({ title: "Gagal Menghapus", description: err.message, variant: "destructive" });
    }
  });

  const handleCalculate = () => {
    if (!pelangganId || !noFaktur || !qty || !nilaiFaktur) {
      toast({ title: "Data Belum Lengkap", description: "Mohon isi semua field input.", variant: "destructive" });
      return;
    }
    calculateMutation.mutate({
      pelangganId: parseInt(pelangganId),
      noFaktur,
      qty: parseInt(qty),
      nilaiFaktur: parseFloat(parseRibuan(nilaiFaktur)),
      tglFaktur,
      brandCode,
      branchId: selectedBranchId,
      selectedPrograms: checkedPrograms.map(p => ({ id: p.id, jenisProgram: p.jenisProgram }))
    });
  };

  const handleSave = () => {
    if (!isCalculated || !preview) {
       toast({ title: "Perhatian", description: "Silakan kalkulasi preview terlebih dahulu.", variant: "destructive" });
       return;
    }
    saveMutation.mutate();
  };

  const handleEdit = (t: any) => {
    setEditTransactionId(t.id);
    setPelangganId(t.pelangganId.toString());
    setBrandCode(t.brandCode || "");
    setNoFaktur(t.noFaktur);
    if (t.tglFaktur) setTglFaktur(format(new Date(t.tglFaktur), "dd/MM/yyyy"));
    setQty(t.qty.toString());
    setNilaiFaktur(formatRibuan(t.nilaiFaktur.toString()));
    resetCalc();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Input Transaksi Promo</h1>
        <p className="text-muted-foreground">Sistem Manajemen Promo Terintegrasi (Ferio System)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* INPUT FORM */}
        <Card className="shadow-lg border-2">
          <CardHeader>
            <CardTitle>Data Transaksi</CardTitle>
            <CardDescription>Input data dari faktur sistem lama</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Pelanggan</Label>
              <CustomerSearchSelect 
                customers={pelanggan || []}
                value={pelangganId}
                onValueChange={(v) => { 
                  setPelangganId(v); 
                  resetCalc(); 
                }}
                placeholder="Cari nama atau kode pelanggan..."
                className="border-slate-200 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Merek Produk (WAJIB)</Label>
              <Select value={brandCode} onValueChange={(v) => { setBrandCode(v); resetCalc(); }}>
                <SelectTrigger className="h-11 shadow-sm border-slate-200 bg-indigo-50/30 border-indigo-100">
                  <SelectValue placeholder="--- Pilih Merek ---" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id || b.name} value={b.name} className="font-bold uppercase tracking-wide">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* START: Display Active Promo Programs */}
            {pelangganId && brandCode && (
              <div className="bg-slate-50 border border-slate-100 rounded-md p-3 text-sm">
                <p className="font-semibold text-slate-700 mb-2 text-xs uppercase tracking-wide">Promo Aktif Pelanggan ({brandCode}):</p>
                {loadingPrograms ? (
                  <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin"/> Memuat data...</div>
                ) : selectedPrograms.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPrograms.map((p, idx) => (
                      <label key={`${p.jenisProgram}-${p.id}-${idx}`} className="flex items-center gap-2 cursor-pointer group hover:bg-indigo-50/50 rounded-md px-2 py-1.5 transition-colors">
                        <Checkbox 
                          checked={p.checked}
                          onCheckedChange={() => toggleProgramSelection(p.id, p.jenisProgram)}
                          className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                        <Badge variant="outline" className={`text-xs font-bold uppercase px-1.5 py-0.5 ${
                          p.jenisProgram === 'cutting' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          p.jenisProgram === 'principal' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          p.jenisProgram === 'cashback' ? 'bg-green-50 text-green-700 border-green-200' :
                          p.jenisProgram === 'paket' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          p.jenisProgram === 'point' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {p.jenisProgram}
                        </Badge>
                        <span className={`text-sm font-medium transition-colors ${p.checked ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                          {p.programName}
                        </span>
                      </label>
                    ))}
                    {!hasCheckedPrograms && (
                      <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Pilih minimal satu program untuk kalkulasi
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-xs">Tidak ada program aktif yang terdaftar untuk kombinasi ini.</p>
                )}
              </div>
            )}
            {/* END: Display Active Promo Programs */}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nomor Faktur</Label>
                <Input 
                  placeholder="Contoh: INV-001" 
                  value={noFaktur} 
                  onChange={(e) => { setNoFaktur(e.target.value); resetCalc(); }}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Faktur</Label>
                <Input 
                  type="text" placeholder="DD/MM/YYYY" maxLength={10} 
                  value={tglFaktur} 
                  onChange={(e) => { setTglFaktur(e.target.value); resetCalc(); }}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jumlah Barang (Qty)</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={qty} 
                  onChange={(e) => { setQty(e.target.value); resetCalc(); }}
                />
              </div>
              <div className="space-y-2">
                <Label>Nilai Faktur (Rp)</Label>
                <Input 
                  type="text" 
                  placeholder="0" 
                  value={nilaiFaktur} 
                  onChange={(e) => { setNilaiFaktur(formatRibuan(e.target.value)); resetCalc(); }}
                />
              </div>
            </div>

            <Button 
              className="w-full mt-4 h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50"
              onClick={handleCalculate}
              disabled={calculateMutation.isPending || !hasCheckedPrograms}
              title={!hasCheckedPrograms ? 'Pilih minimal satu program promo' : ''}
            >
              {calculateMutation.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-5 w-5" />
              )}
              Kalkulasi & Preview
            </Button>
          </CardContent>
        </Card>

        {/* PREVIEW PANEL */}
        <Card className={`shadow-lg border-2 transition-all ${isCalculated ? 'border-green-500 bg-green-50/10' : 'border-dashed'}`}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Preview Hasil Promo</CardTitle>
                <CardDescription>Reward otomatis berdasarkan data faktur</CardDescription>
              </div>
              {isCalculated && <CheckCircle2 className="h-8 w-8 text-green-500" />}
            </div>
          </CardHeader>
          <CardContent>
            {calculateMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 opacity-50" />
                <p className="font-medium">Menghitung reward otomatis...</p>
              </div>
            ) : !isCalculated ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
                <Calculator className="h-12 w-12 opacity-20" />
                <p>Klik tombol Kalkulasi untuk melihat hasil.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(!preview || !hasActivePromo) ? (
                  <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <AlertTriangle className="h-10 w-10 text-amber-500 opacity-50 mb-3" />
                    <p className="text-center font-bold text-slate-600">Tidak Ada Promo Terdeteksi</p>
                    <p className="text-xs text-muted-foreground text-center px-6 mt-1 text-red-600 font-bold">
                      Tidak ada promo aktif untuk merek ini. Transaksi tidak dapat disimpan.
                    </p>
                    <Button variant="link" className="mt-2 text-blue-600" onClick={() => window.location.href='/promo/integrated/pelanggan'}>
                      Kelola Program Pelanggan →
                    </Button>
                  </div>
                ) : (
                  <>
                {/* CASHBACK */}
                {preview.cashbacks?.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 border-b pb-1 flex items-center gap-2">
                       <Zap className="h-4 w-4 text-amber-500" /> Cashback
                    </h3>
                    {preview.cashbacks.map((c: any) => (
                      <div key={c.id} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden transition-all hover:border-slate-300 group">
                        {c.isReached && <div className="absolute top-0 right-0 h-16 w-16 -mr-8 -mt-8 bg-green-500 rotate-45 flex items-end justify-center pb-1"><CheckCircle2 className="h-4 w-4 text-white -rotate-45 mb-1" /></div>}
                        
                        <div className="flex justify-between items-start pr-4">
                           <div className="space-y-0.5">
                              <div className="text-sm font-bold text-slate-800 leading-tight">{c.nama}</div>
                              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                                {c.tipeSyarat === 'bersyarat' ? 'Akumulasi Bulanan' : 'Per Transaksi'}
                              </div>
                           </div>
                           <div className="text-right">
                              <div className={`text-md font-black tracking-tight ${c.isReached ? 'text-green-600' : 'text-slate-400 opacity-60 line-through'}`}>
                                Rp {c.nilai.toLocaleString()}
                              </div>
                              {c.persenReward && <div className="text-[10px] font-bold text-green-500/80 bg-green-50 px-1.5 py-0.5 rounded-full inline-block">{c.persenReward}% Reward</div>}
                           </div>
                        </div>

                        {c.tipeSyarat === 'bersyarat' && (
                          <div className="space-y-2">
                             <div className="flex justify-between items-end text-[10px]">
                                <div className="font-bold text-slate-500">Progress Transaksi</div>
                                <div className={`font-black ${c.isReached ? 'text-green-600' : 'text-amber-600'}`}>
                                   Rp {c.akumulasiBulanIni.toLocaleString()} / Rp {c.minTransaksi.toLocaleString()}
                                </div>
                             </div>
                             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                <div 
                                   className={`h-full transition-all duration-1000 ease-out rounded-full ${c.isReached ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                                   style={{ width: `${Math.min(100, (c.akumulasiBulanIni / c.minTransaksi) * 100)}%` }}
                                />
                             </div>
                             {!c.isReached ? (
                               <div className="flex items-center gap-1.5 bg-amber-50 p-2 rounded-lg border border-amber-100/50 group-hover:bg-amber-100/30 transition-colors">
                                  <AlertCircle className="h-3 w-3 text-amber-500" />
                                  <span className="text-[10px] font-bold text-amber-700 tracking-tight leading-none italic">Belum mencapai minimum transaksi bulan ini</span>
                               </div>
                             ) : (
                               <div className="flex items-center gap-1.5 bg-green-50 p-2 rounded-lg border border-green-100/50 group-hover:bg-green-100/30 transition-colors">
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  <span className="text-[10px] font-bold text-green-700 tracking-tight leading-none italic">Target tercapai! Reward sudah dikalkulasi.</span>
                               </div>
                             )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* CUTTING */}
                {preview.cutting?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cutting Label</h3>
                    {preview.cutting.map((c: any) => (
                      <div key={c.id} className="p-3 bg-white rounded-lg border shadow-sm space-y-1">
                        <div className="flex justify-between">
                          <span>{c.nama}</span>
                          <span className="font-bold text-blue-600">Rp {c.total.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.qty} label × Rp {c.nilaiPerLabel.toLocaleString()}
                        </div>
                        <Separator className="my-1" />
                        <div className="text-xs text-muted-foreground flex justify-between">
                           <span>Akumulasi setelah ini:</span>
                           <span className="font-semibold text-foreground">{c.akumulasiBaruLabel} label / Rp {c.akumulasiBaruNilai.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* POINT */}
                {preview.point && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Loyalty Points</h3>
                    <div className="p-3 bg-white rounded-lg border shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Poin Diperoleh:</span>
                        <Badge variant="secondary" className="text-md py-1 px-3">+{preview.point.peroleh} Poin</Badge>
                      </div>
                      {preview.point.achievedReward && (
                        <div className="p-2.5 bg-yellow-50 border-2 border-yellow-200 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-500 shadow-sm border-dashed">
                          <div className="p-2 bg-yellow-200 rounded-full animate-pulse">
                            <Gift className="h-5 w-5 text-yellow-700" />
                          </div>
                          <div>
                            <div className="text-[10px] text-yellow-600 font-black uppercase tracking-tighter">Hadiah Baru Tercapai!</div>
                            <div className="text-sm font-black text-yellow-800 tracking-tight leading-none">{preview.point.achievedReward}</div>
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground flex justify-between">
                         <span>Saldo Poin baru:</span>
                         <span className="font-semibold text-foreground">{preview.point.saldoBaru} Poin</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* PAKET */}
                {preview.pakets?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Paket Program (Tier)</h3>
                    {preview.pakets.map((p: any) => (
                      <div key={p.id} className={`p-3 rounded-lg border shadow-sm space-y-3 ${p.warning ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-sm">{p.nama}</span>
                            <div className="text-xs text-muted-foreground">Basis: {p.basisType.toUpperCase()}</div>
                          </div>
                          {p.warning ? (
                            <Badge variant="destructive" className="flex gap-1">
                              <AlertTriangle className="h-3 w-3" /> Diluar Periode
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-600">Aktif</Badge>
                          )}
                        </div>

                        {p.warning && <p className="text-xs text-red-600 font-medium italic">{p.warning}</p>}

                        <div className="grid grid-cols-3 gap-2 text-center">
                           <div className="flex flex-col p-1 bg-gray-50 rounded">
                              <span className="text-[10px] text-muted-foreground">Lama</span>
                              <span className="text-xs font-semibold">{p.progressLama.toLocaleString()}</span>
                           </div>
                           <div className="flex flex-col p-1 bg-blue-50 rounded">
                              <span className="text-[10px] text-blue-600">Input</span>
                              <span className="text-xs font-bold text-blue-700">+{p.transaksiIni.toLocaleString()}</span>
                           </div>
                           <div className="flex flex-col p-1 bg-green-50 rounded">
                              <span className="text-[10px] text-green-600">Baru</span>
                              <span className="text-xs font-bold text-green-700">{p.progressBaru.toLocaleString()}</span>
                           </div>
                        </div>

                        {p.tier ? (
                          <div className="relative p-3 bg-gradient-to-br from-indigo-50 to-white rounded-lg border-2 border-indigo-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-500">
                             {/* Badge Status */}
                             <div className="absolute top-0 right-0">
                                <div className={`text-white text-[8px] font-black px-2 py-1 uppercase tracking-tighter rounded-bl-sm shadow-sm ${(p as any).rewardTersedia > 0 ? 'bg-green-600' : 'bg-slate-500'}`}>
                                   {(p as any).rewardTersedia > 0 ? 'SIAP DICAIRKAN ✅' : 'SUDAH DIKLAIM ✔'}
                                </div>
                             </div>
                             
                             {/* Header: Level Badge */}
                             <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-indigo-100 rounded-full">
                                   <Award className="h-4 w-4 text-indigo-700" />
                                </div>
                                <div>
                                   <span className="text-xs text-indigo-700 font-black uppercase tracking-tight">Level {p.tier.urutan} Tercapai!</span>
                                   {p.tier.rewardDesc && (
                                     <div className="text-[10px] text-slate-500">{p.tier.rewardDesc}</div>
                                   )}
                                </div>
                             </div>

                             {/* Rincian Perhitungan Detail */}
                             <div className="bg-white rounded-md border border-indigo-100 p-2.5 space-y-1.5">
                                <div className="text-[9px] text-indigo-600 font-black uppercase tracking-widest mb-1">Rincian Perhitungan</div>
                                
                                {/* Baris 1: Total Omzet */}
                                <div className="flex justify-between items-center text-[11px]">
                                   <span className="text-slate-500">Total Omzet Akumulasi</span>
                                   <span className="font-bold text-slate-800">Rp {(p.progressBaruValue || 0).toLocaleString()}</span>
                                </div>

                                {/* Baris 2: Tier & Persen */}
                                <div className="flex justify-between items-center text-[11px]">
                                   <span className="text-slate-500">Tier Tercapai</span>
                                   <span className="font-bold text-indigo-700">
                                     Level {p.tier.urutan} 
                                     {p.tier.rewardType === 'percent' && ` (${p.tier.rewardValue}%)`}
                                     {p.tier.rewardType === 'cash' && ` (Cash)`}
                                   </span>
                                </div>

                                {/* Baris 3: Rumus Perhitungan */}
                                {p.tier.rewardType === 'percent' && (
                                  <div className="flex justify-between items-center text-[11px] bg-indigo-50/50 rounded px-1.5 py-1 -mx-1">
                                     <span className="text-indigo-600 font-medium">Rumus: Omzet × {p.tier.rewardValue}%</span>
                                     <span className="font-black text-indigo-700">
                                       = Rp {((p as any).totalRewardCalculated || 0).toLocaleString()}
                                     </span>
                                  </div>
                                )}
                                {p.tier.rewardType === 'cash' && (
                                  <div className="flex justify-between items-center text-[11px] bg-indigo-50/50 rounded px-1.5 py-1 -mx-1">
                                     <span className="text-indigo-600 font-medium">Reward Tetap (Cash)</span>
                                     <span className="font-black text-indigo-700">
                                       = Rp {((p as any).totalRewardCalculated || 0).toLocaleString()}
                                     </span>
                                  </div>
                                )}

                                {/* Separator */}
                                <div className="border-t border-dashed border-slate-200 my-1" />

                                {/* Baris 4: Total Reward Dihitung */}
                                <div className="flex justify-between items-center text-[11px]">
                                   <span className="text-slate-500">Total Reward Dihitung</span>
                                   <span className="font-bold text-slate-800">Rp {((p as any).totalRewardCalculated || 0).toLocaleString()}</span>
                                </div>

                                {/* Baris 5: Sudah Diklaim (jika ada) */}
                                {(p as any).totalRewardClaimed > 0 && (
                                  <div className="flex justify-between items-center text-[11px]">
                                     <span className="text-red-500">Sudah Diklaim</span>
                                     <span className="font-bold text-red-600">- Rp {((p as any).totalRewardClaimed || 0).toLocaleString()}</span>
                                  </div>
                                )}

                                {/* Separator */}
                                <div className="border-t border-slate-200 my-1" />

                                {/* Baris 6: Reward Tersedia (BESAR) */}
                                <div className="flex justify-between items-center">
                                   <span className="text-xs font-bold text-green-700 uppercase">Reward Tersedia</span>
                                   <span className="text-lg font-black text-green-700 tracking-tight">
                                     Rp {((p as any).rewardTersedia || 0).toLocaleString()}
                                   </span>
                                </div>
                             </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50/50 rounded-lg border border-dashed border-slate-300 text-center flex flex-col items-center gap-1">
                             <div className="p-1.5 bg-slate-100 rounded-full">
                                <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                             </div>
                             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Belum mencapai tier terendah</span>
                             <span className="text-[9px] text-slate-400">Terus tingkatkan transaksi untuk meraih reward!</span>
                          </div>
                        )}

                        {p.targetBerikutnya && (
                           <div className="text-[10px] flex justify-between px-1">
                              <span>Target ke-Tier Berikutnya ({p.targetBerikutnya.minValue.toLocaleString()}):</span>
                              <span className="font-bold text-orange-600">Kurang {p.targetBerikutnya.selisih.toLocaleString()}</span>
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                 {/* PROGRAM PRINCIPAL */}
                 {preview.principalPrograms?.length > 0 && (
                   <div className="space-y-4">
                     <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 border-b pb-1 flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-700" /> Program Principal
                     </h3>
                     {preview.principalPrograms.map((p: any) => (
                       <div key={p.id} className={`p-4 rounded-3xl border-2 shadow-sm space-y-4 bg-white transition-all hover:border-slate-300 ${p.warning ? 'border-red-200 bg-red-50/30' : ''}`}>
                         <div className="flex justify-between items-start">
                           <div>
                             <div className="font-black text-slate-900 leading-tight">{p.nama}</div>
                             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1 flex items-center gap-1">
                                <Badge variant="outline" className="text-[8px] h-4 py-0 font-black">{p.principalName}</Badge>
                                <span>Basis: {p.basisType.toUpperCase()}</span>
                             </div>
                           </div>
                           {p.warning ? (
                             <Badge variant="destructive" className="flex gap-1 animate-pulse rounded-lg">
                               <AlertTriangle className="h-3 w-3" /> Diluar Periode
                             </Badge>
                           ) : (
                             <Badge className="bg-slate-800 rounded-lg">AKTIF</Badge>
                           )}
                         </div>

                         <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                               <span className="text-[9px] font-black text-slate-400 uppercase">Akum. Lama</span>
                               <span className="text-xs font-black text-slate-700">{p.progressLama.toLocaleString()}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center">
                               <span className="text-[9px] font-black text-indigo-400 uppercase">Input Faktur</span>
                               <span className="text-xs font-black text-indigo-700">+{p.transaksiIni.toLocaleString()}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center">
                               <span className="text-[9px] font-black text-emerald-400 uppercase">Total Baru</span>
                               <span className="text-xs font-black text-emerald-700">{p.progressBaru.toLocaleString()}</span>
                            </div>
                         </div>

                         {p.tier ? (
                           <div className="space-y-3 p-4 rounded-2xl bg-slate-900 text-white shadow-xl animate-in zoom-in-95 duration-300">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                   <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center font-black text-xs italic">#{p.tier.urutan}</div>
                                   <span className="text-xs font-black uppercase tracking-tight text-white/90 italic">Reward Level Tercapai!</span>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
                                   <div className="text-[8px] font-black text-blue-300 uppercase tracking-tighter mb-1">Porsi Perusahaan</div>
                                   <div className="text-xs font-black">
                                      {p.tier.rewardPerusahaan.value > 0 && `Rp ${p.tier.rewardPerusahaan.value.toLocaleString('id-ID')}`}
                                      {p.tier.rewardPerusahaan.value > 0 && p.tier.rewardPerusahaan.desc && ' / '}
                                      {p.tier.rewardPerusahaan.desc}
                                   </div>
                                </div>
                                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                                   <div className="text-[8px] font-black text-emerald-300 uppercase tracking-tighter mb-1">Porsi Principal</div>
                                   <div className="text-xs font-black">
                                      {p.tier.rewardPrincipal.value > 0 && `Rp ${p.tier.rewardPrincipal.value.toLocaleString('id-ID')}`}
                                      {p.tier.rewardPrincipal.value > 0 && p.tier.rewardPrincipal.desc && ' / '}
                                      {p.tier.rewardPrincipal.desc}
                                   </div>
                                </div>
                             </div>
                             
                             {p.tier.totalRewardCalculated > 0 && (
                               <div className="mt-3 p-2 rounded-xl bg-white/10 border border-white/5 flex items-center justify-between">
                                 <span className="text-[10px] font-black uppercase text-white/50 tracking-widest pl-2">Total Reward</span>
                                 <span className="text-sm font-black text-white bg-white/20 px-3 py-1 rounded-lg">
                                   Rp {p.tier.totalRewardCalculated.toLocaleString('id-ID')}
                                 </span>
                               </div>
                             )}
                           </div>
                         ) : (
                           <div className="p-3 bg-slate-100/50 rounded-2xl border border-dashed border-slate-300 text-center flex flex-col items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Belum mencapai tier minimal</span>
                              {p.targetBerikutnya && (
                                <span className="text-[9px] text-slate-400 font-black">Butuh {p.targetBerikutnya.selisih.toLocaleString()} {p.basisType === 'qty' ? 'Qty' : 'Rp'} lagi untuk Tier 1</span>
                              )}
                           </div>
                         )}

                         {p.tier && p.targetBerikutnya && (
                           <div className="text-[10px] flex justify-between px-2 pt-2 border-t font-black text-slate-400 italic">
                             <span>Tier Berikutnya ({p.targetBerikutnya.minValue.toLocaleString()}):</span>
                             <span className="text-orange-500">Kurang {p.targetBerikutnya.selisih.toLocaleString()} lagi</span>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 )}

                  </>
                )}

                <Button 
                  className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg mt-4"
                  onClick={handleSave}
                  disabled={saveMutation.isPending || (isCalculated && !hasActivePromo)}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  {editTransactionId ? "Perbarui Transaksi (Atomik)" : "Verifikasi & Simpan (Atomik)"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TRANSACTION LIST */}
      <Card className="shadow-lg border-2 mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Riwayat Transaksi Promo (Integrated)</CardTitle>
            <CardDescription>Daftar transaksi promo terbaru di cabang ini</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/promo/transactions"] })}>
             Perbarui Data
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-bold">Tgl / No Faktur</th>
                  <th className="p-3 text-left font-bold w-[25%]">Pelanggan</th>
                  <th className="p-3 text-left font-bold">Merek</th>
                  <th className="p-3 text-left font-bold w-[25%]">Program Aktif</th>
                  <th className="p-3 text-right font-bold">Qty</th>
                  <th className="p-3 text-right font-bold w-[12%]">Nilai Faktur</th>
                  <th className="p-3 text-center font-bold">Hadiah</th>
                  <th className="p-3 text-center font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y relative">
                {isLoadingTransactions ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto" /></td></tr>
                ) : transactions?.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Tidak ada transaksi yang cocok.</td></tr>
                ) : (
                  transactions?.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-3">
                        <div className="font-bold">{t.tglFaktur ? format(new Date(t.tglFaktur), "dd/MM/yyyy") : "-"}</div>
                        <div className="text-xs text-muted-foreground uppercase font-mono">{t.noFaktur}</div>
                      </td>
                      <td className="p-3 text-xs font-bold uppercase">{t.pelangganName}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-black border-indigo-200 text-indigo-700 bg-indigo-50 uppercase text-[9px]">
                          {t.brandCode || 'FERIO'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          {t.activePromoArr && t.activePromoArr.length > 0 ? (
                             t.activePromoArr.map((prog: string, i: number) => (
                               <Badge key={i} variant="outline" className="text-[8px] bg-slate-50 leading-tight whitespace-normal text-left" title={prog}>
                                 {prog}
                               </Badge>
                             ))
                          ) : (
                             <p className="text-[10px] text-muted-foreground">{t.activePromoStr || "-"}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">{t.qty}</td>
                      <td className="p-3 text-right font-mono">Rp {parseFloat(t.nilaiFaktur).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {t.rewards?.cashback > 0 && (
                            <Badge className="bg-emerald-600 text-[9px] h-5 px-1.5 font-bold shadow-sm">
                              Rp {t.rewards.cashback.toLocaleString('id-ID')}
                            </Badge>
                          )}
                          {t.rewards?.points > 0 && (
                            <Badge className="bg-blue-600 text-[9px] h-5 px-1.5 font-bold shadow-sm">
                              {t.rewards.points} Pts
                            </Badge>
                          )}
                          {t.rewards?.paket && (
                            <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[9px] h-5 px-1.5 font-bold shadow-sm">
                              {t.rewards.paket.calculatedValue > 0 ? 
                                `Rp ${t.rewards.paket.calculatedValue.toLocaleString('id-ID')}` : 
                                `+${t.rewards.paket.qty || 0} Qty`}
                            </Badge>
                          )}
                          {t.rewards?.cutting > 0 && (
                            <Badge className="bg-purple-600 text-[9px] h-5 px-1.5 font-bold shadow-sm">
                              Rp {t.rewards.cutting.toLocaleString('id-ID')}
                            </Badge>
                          )}
                          {t.rewards?.principal > 0 && (
                            <Badge className="bg-indigo-600 text-[9px] h-5 px-1.5 font-bold shadow-sm">
                              Rp {t.rewards.principal.toLocaleString('id-ID')}
                            </Badge>
                          )}
                          {(!t.rewards || (!t.rewards.cashback && !t.rewards.points && !t.rewards.paket && !t.rewards.cutting && !t.rewards.principal)) && (
                            <span className="text-[10px] text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-100 transition-opacity">
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100" onClick={() => setViewTransaction(t)} title="Lihat Detail">
                             <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 transition-colors" onClick={() => handleEdit(t)} title="Edit Transaksi">
                             <Edit className="h-4 w-4" />
                          </Button>
                          {can("input_transaksi_promo", "print") && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 transition-colors" title="Cetak Bukti" onClick={() => setViewTransactionPrint(t)}>
                               <Printer className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-500 hover:text-red-600 transition-colors" 
                            disabled={deleteTransactionMutation.isPending}
                            onClick={() => { 
                              setDeleteConfirm({ open: true, id: t.id });
                            }} 
                            title="Hapus Transaksi"
                          >
                             {deleteTransactionMutation.isPending ? (
                               <Loader2 className="h-4 w-4 animate-spin" />
                             ) : (
                               <Trash2 className="h-4 w-4" />
                             )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* VIEW DIALOG */}
      <Dialog open={!!viewTransaction} onOpenChange={(open) => { if(!open) setViewTransaction(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>Rincian informasi faktur yang direkam dalam sistem promo.</DialogDescription>
          </DialogHeader>
          {viewTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="font-semibold text-muted-foreground">No Faktur</div>
                <div className="uppercase font-medium border-b pb-1">{viewTransaction.noFaktur}</div>
                <div className="font-semibold text-muted-foreground">Tanggal Faktur</div>
                <div className="font-medium border-b pb-1">{format(new Date(viewTransaction.tglFaktur), "dd/MM/yyyy")}</div>
                <div className="font-semibold text-muted-foreground">Pelanggan</div>
                <div className="uppercase font-medium border-b pb-1">{viewTransaction.pelangganName}</div>
                <div className="font-semibold text-muted-foreground">Merek Terkait</div>
                <div className="font-medium border-b pb-1">
                   <Badge variant="secondary" className="uppercase bg-indigo-50 text-indigo-700">{viewTransaction.brandCode || 'FERIO'}</Badge>
                </div>
                <div className="font-semibold text-muted-foreground">Program Aktif (Saat Ini)</div>
                <div className="font-medium border-b pb-1 text-xs italic text-slate-500">
                   {viewTransaction.activePromoStr}
                </div>
                <div className="font-semibold text-muted-foreground">Qty Diterima</div>
                <div className="font-large font-bold border-b pb-1">{viewTransaction.qty} item</div>
                <div className="font-semibold text-muted-foreground">Nilai Faktur</div>
                <div className="font-large font-bold text-green-700">Rp {Number(viewTransaction.nilaiFaktur).toLocaleString()}</div>
              </div>
              
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Hadiah yang Diperoleh</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Cashback (Tunai)</span>
                    <span className="font-bold text-emerald-600">Rp {(viewTransaction.rewards?.cashback || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm pt-1 border-t border-dashed">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Loyalty Points</span>
                      <span className="font-bold text-blue-600">{viewTransaction.rewards?.points || 0} Pts</span>
                    </div>
                    {viewTransaction.rewards?.pointGift && (
                      <div className="flex justify-between items-center bg-yellow-50 p-1.5 rounded border border-yellow-200 mt-0.5">
                        <span className="text-[10px] font-black text-yellow-700 uppercase">Hadiah Tercapai:</span>
                        <span className="text-xs font-black text-yellow-800">{viewTransaction.rewards.pointGift}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Cutting Label</span>
                    <span className="font-bold text-purple-600">Rp {(viewTransaction.rewards?.labels || 0).toLocaleString()}</span>
                  </div>
                  {viewTransaction.rewards?.paket && (
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed">
                      <span className="text-muted-foreground italic text-xs">Kontribusi Paket (Progres)</span>
                      <span className="font-bold text-orange-600 text-xs text-right">
                        {viewTransaction.rewards.paket.calculatedValue !== undefined && viewTransaction.rewards.paket.calculatedValue > 0 ? (
                           `Rp ${viewTransaction.rewards.paket.calculatedValue.toLocaleString()}`
                        ) : (
                           `+${viewTransaction.rewards.paket.qty ? `${viewTransaction.rewards.paket.qty} Qty` : `Rp ${viewTransaction.rewards.paket.nilai?.toLocaleString() || '0'}`}`
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* DELETE TRANSACTION CONFIRMATION */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(v) => setDeleteConfirm(prev => ({ ...prev, open: v }))}>
        <AlertDialogContent className="rounded-3xl border-2 border-red-100 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-red-600 flex items-center gap-2">
              <Trash2 className="h-6 w-6" /> HAPUS TRANSAKSI?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium py-2">
              Apakah yakin ingin menghapus transaksi ini secara permanen?
              <br/><br/>
              <span className="bg-amber-50 p-3 rounded-xl text-amber-800 block border border-amber-100 text-xs">
                <AlertTriangle className="h-4 w-4 inline mr-2 mb-1" />
                <strong>PENTING</strong>: Seluruh progres promo (Cashback, Paket, Poin, dll) yang terkait dengan transaksi ini akan <strong>DIHITUNG ULANG</strong> secara otomatis untuk menjaga akurasi data.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 mt-4 rounded-b-3xl flex gap-2">
            <AlertDialogCancel className="rounded-xl font-bold flex-1 border-slate-200">BATAL</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 rounded-xl font-black flex-1 text-white border-none shadow-lg shadow-red-200"
              onClick={() => {
                if (deleteConfirm.id) {
                  deleteTransactionMutation.mutate(deleteConfirm.id);
                }
                setDeleteConfirm({ open: false, id: null });
              }}
            >
              YA, HAPUS SEKARANG
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PRINT PREVIEW DIALOG */}
      <Dialog open={!!viewTransactionPrint} onOpenChange={(v) => !v && setViewTransactionPrint(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none bg-slate-100/50">
          <div className="sticky top-0 bg-white/80 backdrop-blur-md p-4 border-b flex justify-between items-center z-10 no-print">
             <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                   <Printer className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                   <h3 className="font-black text-slate-800 leading-none">Pratinjau Cetak</h3>
                   <p className="text-xs text-muted-foreground mt-1">Bukti Pencapaian Program Promo</p>
                </div>
             </div>
             <div className="flex gap-2">
                <Button variant="outline" onClick={() => setViewTransactionPrint(null)}>Tutup</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => window.print()}>
                   <Printer className="mr-2 h-4 w-4" /> CETAK SEKARANG
                </Button>
             </div>
          </div>

          <div className="p-8 flex justify-center bg-slate-200/30">
            {/* THE ACTUAL DOCUMENT */}
            <div id="print-document" className="bg-white w-[210mm] min-h-[297mm] p-[20mm] shadow-xl border rounded-sm text-slate-900 font-serif leading-tight">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tighter text-blue-900">FERIO</h1>
                  <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500">Premium Furniture Hardware</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-black uppercase text-slate-900">BUKTI PENCAPAIAN PROGRAM PROMO</h2>
                  <div className="text-[11px] font-sans font-medium text-slate-600">
                    No: <span className="font-bold text-slate-900">{viewTransactionPrint?.noFaktur}</span> | Tgl Cetak: {format(new Date(), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
              </div>

              {/* Section 1 - Info Transaksi */}
              <div className="mb-8">
                <h3 className="text-xs font-black uppercase tracking-widest bg-slate-100 px-2 py-1 mb-3 border-l-4 border-slate-900 font-sans">Section 1: Informasi Transaksi</h3>
                <div className="grid grid-cols-2 gap-y-2 text-[13px]">
                  <div className="flex"><span className="w-32 font-bold text-slate-500 font-sans">No. Faktur</span> <span className="font-black">: {viewTransactionPrint?.noFaktur}</span></div>
                  <div className="flex"><span className="w-32 font-bold text-slate-500 font-sans">Tanggal</span> <span className="font-medium">: {viewTransactionPrint?.tglFaktur ? format(new Date(viewTransactionPrint.tglFaktur), "dd MMMM yyyy", { locale: id }) : '-'}</span></div>
                  <div className="flex"><span className="w-32 font-bold text-slate-500 font-sans">Nama Pelanggan</span> <span className="font-black">: {viewTransactionPrint?.pelangganName}</span></div>
                  <div className="flex"><span className="w-32 font-bold text-slate-500 font-sans">Merek</span> <span className="font-medium">: {viewTransactionPrint?.brandCode}</span></div>
                  <div className="flex"><span className="w-32 font-bold text-slate-500 font-sans">Quantity</span> <span className="font-black text-blue-700">: {viewTransactionPrint?.qty} pcs</span></div>
                  <div className="flex"><span className="w-32 font-bold text-slate-500 font-sans">Nilai Faktur</span> <span className="font-black text-emerald-700">: Rp {viewTransactionPrint?.nilaiFaktur ? parseInt(viewTransactionPrint.nilaiFaktur).toLocaleString('id-ID') : '0'}</span></div>
                </div>
              </div>

              {/* Section 2 - Detail Program & Reward */}
              <div className="mb-12">
                <h3 className="text-xs font-black uppercase tracking-widest bg-slate-100 px-2 py-1 mb-3 border-l-4 border-slate-900 font-sans">Section 2: Detail Program & Reward</h3>
                <div className="border-2 border-slate-100 rounded-xl overflow-hidden">
                   <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="bg-slate-50 border-b font-sans uppercase text-[10px] font-bold text-slate-500">
                          <th className="p-3">Nama Program</th>
                          <th className="p-3">Jenis Reward</th>
                          <th className="p-3 text-right">Nilai / Detail Reward</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Number(viewTransactionPrint?.rewards?.cashback) > 0 && (
                          <tr className="border-b italic">
                            <td className="p-3 font-bold">{viewTransactionPrint.activePromoStr.split(',').find((s:string) => s.includes('CASHBACK')) || 'Cashback Program'}</td>
                            <td className="p-3">Cashback Tunai</td>
                            <td className="p-3 text-right font-black text-emerald-700">Rp {viewTransactionPrint.rewards.cashback.toLocaleString('id-ID')}</td>
                          </tr>
                        )}
                        {Number(viewTransactionPrint?.rewards?.points) > 0 && (
                          <tr className="border-b italic">
                            <td className="p-3 font-bold">{viewTransactionPrint.activePromoStr.split(',').find((s:string) => s.includes('POINT')) || 'Loyalty Point'}</td>
                            <td className="p-3">Loyalty Point</td>
                            <td className="p-3 text-right font-black text-blue-700">{viewTransactionPrint.rewards.points} Pts</td>
                          </tr>
                        )}
                        {viewTransactionPrint?.rewards?.pointGift && (
                          <tr className="border-b italic">
                            <td className="p-3 font-bold">Reward Poin Tercapai</td>
                            <td className="p-3">Hadiah Barang</td>
                            <td className="p-3 text-right font-black text-indigo-700">{viewTransactionPrint.rewards.pointGift}</td>
                          </tr>
                        )}
                        {Number(viewTransactionPrint?.rewards?.labels) > 0 && (
                          <tr className="border-b italic">
                            <td className="p-3 font-bold">{viewTransactionPrint.activePromoStr.split(',').find((s:string) => s.includes('CUTTING')) || 'Cutting Program'}</td>
                            <td className="p-3">Potongan Label ({viewTransactionPrint.rewards.labelsQty} pcs)</td>
                            <td className="p-3 text-right font-black text-rose-700">Rp {viewTransactionPrint.rewards.labels.toLocaleString('id-ID')}</td>
                          </tr>
                        )}
                        {viewTransactionPrint?.rewards?.paket && (
                          <tr className="border-b italic">
                            <td className="p-3 font-bold">{viewTransactionPrint.activePromoStr.split(',').find((s:string) => s.includes('PAKET')) || 'Program Paket'}</td>
                            <td className="p-3">Paket Tier Reward</td>
                            <td className="p-3 text-right font-black text-amber-700">
                               {Number(viewTransactionPrint.rewards.paket.calculatedValue) ? `Rp ${Number(viewTransactionPrint.rewards.paket.calculatedValue).toLocaleString('id-ID')}` : 'Progres Terhitung'}
                            </td>
                          </tr>
                        )}
                        {viewTransactionPrint?.rewards?.principal && (
                          <tr className="border-b italic">
                            <td className="p-3 font-bold">{viewTransactionPrint.activePromoStr.split(',').find((s:string) => s.includes('PRINCIPAL')) || 'Program Principal'}</td>
                            <td className="p-3">Principal Reward Share</td>
                            <td className="p-3 text-right font-black text-cyan-700">
                               {Number(viewTransactionPrint.rewards.principal.calculatedValue) ? `Rp ${Number(viewTransactionPrint.rewards.principal.calculatedValue).toLocaleString('id-ID')}` : 'Progres Terhitung'}
                            </td>
                          </tr>
                        )}
                        {!Object.values(viewTransactionPrint?.rewards || {}).some(v => {
                           if (v && typeof v === 'number' && v > 0) return true;
                           if (v && typeof v === 'object' && Object.keys(v).length > 0) return true;
                           return false;
                        }) && (
                           <tr>
                             <td className="p-6 text-center text-slate-400 italic font-sans" colSpan={3}>Tidak ada rincian reward moneter pada transaksi ini.</td>
                           </tr>
                        )}
                      </tbody>
                   </table>
                </div>
              </div>

              {/* Section 3 - Signature */}
              <div className="grid grid-cols-3 gap-8 mt-12 font-sans">
                 <div className="text-center">
                    <p className="text-[10px] font-bold uppercase mb-16 text-slate-500">Penerima/Pelanggan,</p>
                    <div className="border-b border-slate-900 w-full mb-1"></div>
                    <p className="text-[11px] font-black">{viewTransactionPrint?.pelangganName}</p>
                    <p className="text-[9px] text-slate-400 italic">Tgl: ........................</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] font-bold uppercase mb-16 text-slate-500">Sales Representative,</p>
                    <div className="border-b border-slate-900 w-full mb-1"></div>
                    <p className="text-[11px] font-black underline decoration-dotted decoration-slate-300">................................</p>
                    <p className="text-[9px] text-slate-400 italic">Tgl: ........................</p>
                 </div>
                 <div className="text-center relative">
                    <p className="text-[10px] font-bold uppercase mb-4 text-slate-500">Sales Supervisor,</p>
                    <div className="border-2 border-slate-200 rounded-lg p-2 mb-4 flex flex-col items-start gap-1">
                       <div className="flex items-center gap-2"><div className="w-3 h-3 border border-slate-400"></div> <span className="text-[9px] font-bold">Disetujui</span></div>
                       <div className="flex items-center gap-2"><div className="w-3 h-3 border border-slate-400"></div> <span className="text-[9px] font-bold">Tidak Disetujui</span></div>
                    </div>
                    <div className="border-b border-slate-900 w-full mb-1"></div>
                    <p className="text-[11px] font-black">STAMP / CAP</p>
                    <p className="text-[9px] text-slate-400 italic">Tgl: ........................</p>
                 </div>
              </div>

              {/* Footer */}
              <div className="mt-20 pt-4 border-t border-slate-100 text-[9px] text-slate-400 font-sans flex justify-between italic">
                 <p>Dokumen ini merupakan bukti resmi pencapaian program promo yang bersifat rahasia.</p>
                 <p>Sistem Monitor Gudang v2.5 | {format(new Date(), "yyyy")}</p>
              </div>

            </div>
          </div>
          
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              /* 1. Global Reset */
              html, body { 
                margin: 0 !important; 
                padding: 0 !important; 
                height: 100% !important;
                width: 100% !important;
                overflow: visible !important;
                background: white !important; 
              }
              
              /* 2. Hide everything else with extreme prejudice */
              body > *:not([role="dialog"]),
              [data-radix-portal] > *:not([role="role"]),
              .no-print { 
                display: none !important; 
              }

              /* 3. Force the Dialog to behave like a top-level page */
              div[role="dialog"] {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                min-height: 100% !important;
                transform: none !important;
                background: white !important;
                border: none !important;
                box-shadow: none !important;
                display: block !important;
                z-index: 9999 !important;
                overflow: visible !important;
              }

              /* 4. The Document itself */
              #print-document { 
                visibility: visible !important;
                display: block !important;
                position: relative !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10mm 15mm !important; /* Standard print padding */
                box-sizing: border-box !important;
              }
              
              #print-document * { visibility: visible !important; }
              
              @page { 
                size: A4; 
                margin: 0 !important; 
              }

              /* Fix for Radix Dialog Overlay that might still show up */
              div[data-state="open"] {
                background: transparent !important;
              }
            }
          `}} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
