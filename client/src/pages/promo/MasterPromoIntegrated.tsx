import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/Card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, Search, Trash2, Edit, Loader2, Calendar, 
  Target, Award, Package, Eye, Gift
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatIndonesiaDate, parseIndonesiaDate, formatRibuan, parseRibuan } from "@/lib/utils";
import { format } from "date-fns";

import { id as idLocale } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/use-branch";
import { Switch } from "@/components/ui/switch";
import { 
  usePrincipals, 
  useCreatePrincipal, 
  useUpdatePrincipal, 
  useDeletePrincipal 
} from "@/hooks/use-principals";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";


export default function MasterPromoIntegrated() {
  const { toast } = useToast();
  const { selectedBranchId } = useBranch();
  const [openPaket, setOpenPaket] = useState(false);

  const [editingPaketId, setEditingPaketId] = useState<number | null>(null);
  
  const [openCashback, setOpenCashback] = useState(false);
  const [editingCashbackId, setEditingCashbackId] = useState<number | null>(null);
  
  const [openCutting, setOpenCutting] = useState(false);
  const [editingCuttingId, setEditingCuttingId] = useState<number | null>(null);

  const [openPoint, setOpenPoint] = useState(false);
  const [editingPointId, setEditingPointId] = useState<number | null>(null);

  const [openPrincipal, setOpenPrincipal] = useState(false);
  const [editingPrincipalId, setEditingPrincipalId] = useState<number | null>(null);

  const [viewOnly, setViewOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'semua' | 'aktif' | 'nonaktif'>('semua');
  const [selectedBrand, setSelectedBrand] = useState<string>("SEMUA");

  // --- QUERIES ---
  const { data: brands = [] } = useQuery<any[]>({
    queryKey: ["/api/promo/brands", selectedBranchId],
    queryFn: async () => {
      const res = await fetch(`/api/promo/brands?branchId=${selectedBranchId}`);
      if (!res.ok) throw new Error("Gagal mengambil merek");
      return res.json();
    },
    enabled: !!selectedBranchId
  });

  const { data: pakets, isLoading: loadPaket } = useQuery<any[]>({
     queryKey: ["/api/promo/masters/paket", { branchId: selectedBranchId, brandCode: selectedBrand }],
     queryFn: async () => {
       const res = await fetch(`/api/promo/masters/paket?branchId=${selectedBranchId}&brandCode=${selectedBrand}`);
       if (!res.ok) throw new Error("Gagal mengambil paket");
       return res.json();
     },
     enabled: !!selectedBranchId
  });

  const { data: cashbacks, isLoading: loadCashback } = useQuery<any[]>({
     queryKey: ["/api/promo/masters/cashback", { branchId: selectedBranchId, brandCode: selectedBrand }],
     queryFn: async () => {
       const res = await fetch(`/api/promo/masters/cashback?branchId=${selectedBranchId}&brandCode=${selectedBrand}`);
       if (!res.ok) throw new Error("Gagal mengambil cashback");
       return res.json();
     },
     enabled: !!selectedBranchId
  });

  const { data: cuttings, isLoading: loadCutting } = useQuery<any[]>({
     queryKey: ["/api/promo/masters/cutting", { branchId: selectedBranchId, brandCode: selectedBrand }],
     queryFn: async () => {
       const res = await fetch(`/api/promo/masters/cutting?branchId=${selectedBranchId}&brandCode=${selectedBrand}`);
       if (!res.ok) throw new Error("Gagal mengambil cutting");
       return res.json();
     },
     enabled: !!selectedBranchId
  });

  const { data: points, isLoading: loadPoint } = useQuery<any[]>({
     queryKey: ["/api/promo/masters/point-hadiah", { branchId: selectedBranchId }],
     queryFn: async () => {
       const res = await fetch(`/api/promo/masters/point-hadiah?branchId=${selectedBranchId}`);
       if (!res.ok) throw new Error("Gagal mengambil point");
       return res.json();
     },
     enabled: !!selectedBranchId
  });

  const { data: principalList = [] } = usePrincipals(selectedBranchId || undefined);

  const { data: principalPrograms, isLoading: loadPrincipalProgram } = useQuery<any[]>({
     queryKey: ["/api/promo/masters/principal-program", { branchId: selectedBranchId, brandCode: selectedBrand }],
     queryFn: async () => {
       const res = await fetch(`/api/promo/masters/principal-program?branchId=${selectedBranchId}&brandCode=${selectedBrand}`);
       if (!res.ok) throw new Error("Gagal mengambil program principal");
       return res.json();
     },
     enabled: !!selectedBranchId
  });

  const [newPaket, setNewPaket] = useState({
    nama: "",
    brandCode: "SEMUA",
    periodeBulan: 1,
    startDate: format(new Date(), "dd/MM/yyyy"),
    endDate: format(new Date(), "dd/MM/yyyy"),
    basisType: "qty",
    siklus: "per_bulan" as "per_bulan" | "per_3_bulan" | "per_6_bulan" | "per_tahun",
    status: "aktif" as "aktif" | "nonaktif"
  });

  const [newCashback, setNewCashback] = useState({
    nama: "",
    brandCode: "SEMUA",
    tipeCashback: "persen" as "persen" | "tetap",
    nilai: 0,
    tipeSyarat: "tanpa_syarat" as "tanpa_syarat" | "bersyarat",
    minTransaksi: 0,
    maksCashback: 0,
    masaBerlakuMulai: format(new Date(), "dd/MM/yyyy"),
    masaBerlakuSelesai: format(new Date(), "dd/MM/yyyy"),
    siklus: "per_bulan" as "per_bulan" | "per_3_bulan" | "per_6_bulan" | "per_tahun",
    status: "aktif" as "aktif" | "nonaktif"
  });

  const [newCutting, setNewCutting] = useState({
    nama: "",
    brandCode: "SEMUA",
    nilaiPerLabel: 0,
    status: "aktif" as "aktif" | "nonaktif"
  });

  const [newPoint, setNewPoint] = useState({
    namaProgram: "",
    brandCode: "SEMUA",
    tanggalMulai: format(new Date(), "dd/MM/yyyy"),
    tanggalSelesai: format(new Date(), "dd/MM/yyyy"),
    status: "aktif" as "aktif" | "nonaktif"
  });

  const [newPrincipal, setNewPrincipal] = useState({
    nama: "",
    principalId: 0,
    brandCode: "SEMUA",
    basisType: "qty" as "qty" | "nilai",
    startDate: format(new Date(), "dd/MM/yyyy"),
    endDate: format(new Date(), "dd/MM/yyyy"),
    periodeBulan: 1,
    siklus: "per_bulan" as "per_bulan" | "per_3_bulan" | "per_6_bulan" | "per_tahun",
    status: "aktif" as "aktif" | "nonaktif"
  });

  const [tiers, setTiers] = useState<any[]>([]);
  const [principalTiers, setPrincipalTiers] = useState<any[]>([]);
  const [pointRules, setPointRules] = useState<any[]>([]);
  const [pointRewards, setPointRewards] = useState<any[]>([]);

  // Toggle State
  const [confirmToggle, setConfirmToggle] = useState<{
    open: boolean;
    type: 'paket' | 'cashback' | 'cutting' | 'point' | 'principal';
    id: number;
    name: string;
    targetStatus: 'aktif' | 'nonaktif';
  }>({ open: false, type: 'paket', id: 0, name: "", targetStatus: 'aktif' });

  const mutToggleStatus = useMutation({
    mutationFn: async ({ type, id, status }: { type: string, id: number, status: string }) => {
      let endpoint = "";
      if (type === 'paket') endpoint = `/api/promo/masters/paket/${id}`;
      else if (type === 'cashback') endpoint = `/api/promo/masters/cashback/${id}`;
      else if (type === 'cutting') endpoint = `/api/promo/masters/cutting/${id}`;
      else if (type === 'point') endpoint = `/api/promo/masters/point-hadiah/${id}`;
      else if (type === 'principal') endpoint = `/api/promo/masters/principal-program/${id}`;
      
      const method = (type === 'point' || type === 'principal') ? "PUT" : "PATCH";
      
      if (type === 'point') {
        const existing = (points as any[])?.find(p => p.id === id);
        return await apiRequest(method, endpoint, { ...existing, status });
      }
      if (type === 'principal') {
        const existing = (principalPrograms as any[])?.find((p: any) => p.id === id);
        return await apiRequest(method, endpoint, { ...existing, status });
      }
      
      return await apiRequest(method, endpoint, { status });
    },
    onSuccess: (_, variables) => {
      const { type } = variables;
      if (type === 'paket') queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/paket"] });
      else if (type === 'cashback') queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/cashback"] });
      else if (type === 'cutting') queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/cutting"] });
      else if (type === 'point') queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/point-hadiah"] });
      else if (type === 'principal') queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/principal-program"] });
      
      toast({ title: "Status Diperbarui", description: `Promo berhasil ${variables.status === 'aktif' ? 'diaktifkan' : 'dinonaktifkan'}` });
    },
    onError: (err: any) => {
      toast({ title: "Gagal Update Status", description: err.message, variant: "destructive" });
    }
  });

  const handleToggle = (type: string, id: number, name: string, currentStatus: string) => {
    const targetStatus = currentStatus === 'aktif' ? 'nonaktif' : 'aktif';
    if (targetStatus === 'nonaktif') {
      setConfirmToggle({ open: true, type: type as any, id, name, targetStatus });
    } else {
      mutToggleStatus.mutate({ type, id, status: 'aktif' });
    }
  };

  const handleEditPrincipal = (p: any, viewOnlyMode = false) => {
     setEditingPrincipalId(p.id);
     setViewOnly(viewOnlyMode);
     setNewPrincipal({
        nama: p.nama,
        principalId: p.principalId,
        brandCode: p.brandCode || "SEMUA",
        basisType: p.basisType,
        startDate: format(new Date(p.startDate), "dd/MM/yyyy"),
        endDate: format(new Date(p.endDate || p.startDate), "dd/MM/yyyy"),
        periodeBulan: p.periodeBulan || 1,
        siklus: p.siklus || "per_bulan",
        status: p.status
     });
     setPrincipalTiers(p.tiers || []);
     setOpenPrincipal(true);
  };

  const mutDeletePaket = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/promo/masters/paket/${id}?branchId=${selectedBranchId}`),
    onMutate: () => {
      toast({ title: "Menghapus...", description: "Sedang mencoba menghapus data paket..." });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/paket"] });
      toast({ title: "Berhasil", description: "Master Paket berhasil dihapus" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: "Gagal menghapus paket: " + err.message, variant: "destructive" });
    }
  });

  const mutDeleteCashback = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/promo/masters/cashback/${id}?branchId=${selectedBranchId}`),
    onMutate: () => {
      toast({ title: "Menghapus...", description: "Sedang mencoba menghapus data cashback..." });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/cashback"] });
      toast({ title: "Berhasil", description: "Master Cashback berhasil dihapus" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: "Gagal menghapus cashback: " + err.message, variant: "destructive" });
    }
  });

  const mutDeleteCutting = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/promo/masters/cutting/${id}?branchId=${selectedBranchId}`),
    onMutate: () => {
      toast({ title: "Menghapus...", description: "Sedang mencoba menghapus data cutting..." });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/cutting"] });
      toast({ title: "Berhasil", description: "Master Cutting berhasil dihapus" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: "Gagal menghapus cutting: " + err.message, variant: "destructive" });
    }
  });

  const mutDeletePoint = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/promo/masters/point-hadiah/${id}?branchId=${selectedBranchId}`),
    onMutate: () => {
      toast({ title: "Menghapus...", description: "Sedang mencoba menghapus data program poin..." });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/point-hadiah"] });
      toast({ title: "Berhasil", description: "Master Poin berhasil dihapus" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: "Gagal menghapus poin: " + err.message, variant: "destructive" });
    }
  });

  const mutDeletePrincipalProgram = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/promo/masters/principal-program/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/principal-program"] });
      toast({ title: "Berhasil", description: "Program Principal berhasil dihapus" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: "Gagal menghapus program: " + err.message, variant: "destructive" });
    }
  });

  const mutPaket = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        startDate: parseIndonesiaDate(data.startDate),
        endDate: parseIndonesiaDate(data.endDate),
        branchId: selectedBranchId
      };
      if (editingPaketId) {
        return await apiRequest("PATCH", `/api/promo/masters/paket/${editingPaketId}`, payload);
      }
      return await apiRequest("POST", "/api/promo/masters/paket", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/paket"] });
      setOpenPaket(false);
      setEditingPaketId(null);
      setViewOnly(false);
      toast({ title: "Berhasil", description: "Master Paket berhasil disimpan" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: "Gagal menyimpan paket: " + err.message, variant: "destructive" });
    }
  });

  const mutCashback = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        masaBerlakuMulai: parseIndonesiaDate(data.masaBerlakuMulai),
        masaBerlakuSelesai: parseIndonesiaDate(data.masaBerlakuSelesai),
        branchId: selectedBranchId
      };
      if (editingCashbackId) {
        return await apiRequest("PATCH", `/api/promo/masters/cashback/${editingCashbackId}`, payload);
      }
      return await apiRequest("POST", "/api/promo/masters/cashback", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/cashback"] });
      setOpenCashback(false);
      setEditingCashbackId(null);
      setViewOnly(false);
      toast({ title: "Berhasil", description: "Master Cashback berhasil disimpan" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: "Gagal menyimpan cashback: " + err.message, variant: "destructive" });
    }
  });

  const mutCutting = useMutation({
    mutationFn: async (data: any) => {
      if (editingCuttingId) {
        return await apiRequest("PATCH", `/api/promo/masters/cutting/${editingCuttingId}`, { ...data, branchId: selectedBranchId });
      }
      return await apiRequest("POST", "/api/promo/masters/cutting", { ...data, branchId: selectedBranchId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/cutting"] });
      setOpenCutting(false);
      setEditingCuttingId(null);
      setViewOnly(false);
      toast({ title: "Berhasil", description: "Master Cutting Label berhasil disimpan" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: "Gagal menyimpan cutting: " + err.message, variant: "destructive" });
    }
  });

  const mutPoint = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        tanggalMulai: parseIndonesiaDate(data.tanggalMulai),
        tanggalSelesai: parseIndonesiaDate(data.tanggalSelesai),
        branchId: selectedBranchId
      };
      if (editingPointId) {
        return await apiRequest("PUT", `/api/promo/masters/point-hadiah/${editingPointId}`, payload);
      }
      return await apiRequest("POST", "/api/promo/masters/point-hadiah", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/point-hadiah"] });
      setOpenPoint(false);
      setEditingPointId(null);
      setViewOnly(false);
      toast({ title: "Berhasil", description: "Master Poin Hadiah berhasil disimpan" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: "Gagal menyimpan program poin: " + err.message, variant: "destructive" });
    }
  });

  const mutPrincipalProgram = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        startDate: parseIndonesiaDate(data.startDate),
        endDate: parseIndonesiaDate(data.endDate),
        branchId: selectedBranchId
      };
      if (editingPrincipalId) {
        return await apiRequest("PUT", `/api/promo/masters/principal-program/${editingPrincipalId}`, payload);
      }
      return await apiRequest("POST", "/api/promo/masters/principal-program", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/masters/principal-program"] });
      setOpenPrincipal(false);
      setEditingPrincipalId(null);
      setViewOnly(false);
      toast({ title: "Berhasil", description: "Program Principal berhasil disimpan" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: "Gagal menyimpan program: " + err.message, variant: "destructive" });
    }
  });

  const handleEditPaket = (p: any, viewOnlyMode = false) => {
     setEditingPaketId(p.id);
     setViewOnly(viewOnlyMode);
     setNewPaket({
        nama: p.nama,
        brandCode: p.brandCode || "SEMUA",
        periodeBulan: p.periodeBulan || 1,
        startDate: format(new Date(p.startDate), "dd/MM/yyyy"),
        endDate: format(new Date(p.endDate || p.startDate), "dd/MM/yyyy"),
        basisType: p.basisType,
        siklus: p.siklus || "per_bulan",
        status: p.status
     });
     setTiers(p.tiers || []);
     setOpenPaket(true);
  };

  const handleEditCashback = (c: any, viewOnlyMode = false) => {
     setEditingCashbackId(c.id);
     setViewOnly(viewOnlyMode);
     setNewCashback({
        nama: c.nama,
        brandCode: c.brandCode || "SEMUA",
        tipeCashback: c.tipeCashback,
        nilai: parseFloat(c.nilai),
        tipeSyarat: c.tipeSyarat || "tanpa_syarat",
        minTransaksi: parseFloat(c.minTransaksi),
        maksCashback: parseFloat(c.maksCashback || 0),
        masaBerlakuMulai: c.masaBerlakuMulai ? format(new Date(c.masaBerlakuMulai), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy"),
        masaBerlakuSelesai: c.masaBerlakuSelesai ? format(new Date(c.masaBerlakuSelesai), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy"),
        siklus: c.siklus || "per_bulan",
        status: c.status
     });
     setOpenCashback(true);
  };

  const handleEditCutting = (c: any, viewOnlyMode = false) => {
     setEditingCuttingId(c.id);
     setViewOnly(viewOnlyMode);
     setNewCutting({
        nama: c.nama,
        brandCode: c.brandCode || "SEMUA",
        nilaiPerLabel: parseFloat(c.nilaiPerLabel),
        status: c.status
     });
     setOpenCutting(true);
  };

  const handleEditPoint = (p: any, viewOnlyMode = false) => {
     setEditingPointId(p.id);
     setViewOnly(viewOnlyMode);
     setNewPoint({
        namaProgram: p.namaProgram,
        brandCode: p.brandCode || "SEMUA",
        tanggalMulai: format(new Date(p.tanggalMulai), "dd/MM/yyyy"),
        tanggalSelesai: format(new Date(p.tanggalSelesai), "dd/MM/yyyy"),
        status: p.status
     });
     setPointRules(p.rules || []);
     setPointRewards(p.rewards || []);
     setOpenPoint(true);
  };

  const toIDR = (val: any) => {
    return formatRibuan(val);
  };

  const fromIDR = (val: string) => {
    return Number(parseRibuan(val)) || 0;
  };

  const filterByStatus = (items: any[] | undefined) => {
    if (!items) return [];
    if (statusFilter === 'semua') return items;
    return items.filter(i => i.status === statusFilter);
  };

  const StatusFilterBar = () => (
    <div className="flex items-center gap-2 px-8 py-3 border-b bg-slate-50/80">
      <span className="text-[10px] font-black text-slate-400 uppercase mr-2">Filter Status:</span>
      {(['semua', 'aktif', 'nonaktif'] as const).map(s => (
        <button
          key={s}
          onClick={() => setStatusFilter(s)}
          className={`px-4 py-1.5 rounded-full text-xs font-black uppercase transition-all ${
            statusFilter === s
              ? s === 'aktif' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                : s === 'nonaktif' ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                : 'bg-slate-700 text-white shadow-lg shadow-slate-200'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          {s === 'semua' ? 'Semua' : s === 'aktif' ? '● Aktif' : '○ Non-Aktif'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 min-h-screen bg-slate-50/50">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border-2 border-blue-50 shadow-sm">
        <div className="space-y-1">
           <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
             <Package className="h-10 w-10 text-blue-600" />
             MASTER PROMO INTEGRATED
           </h2>
           <p className="text-slate-500 font-medium italic">Manajemen program promo, reward, dan paket tiering</p>
        </div>

        <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-800 uppercase px-1">Filter Merek Utama</span>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                 <SelectTrigger className="w-[300px] h-11 rounded-xl bg-white border-blue-200 font-black text-blue-900 shadow-sm">
                    <SelectValue placeholder="PILIH MEREK" />
                 </SelectTrigger>
                 <SelectContent className="rounded-xl">
                    <SelectItem value="SEMUA" className="font-bold">-- TAMPILKAN SEMUA MEREK --</SelectItem>
                    {brands?.map(b => (
                       <SelectItem key={b.name} value={b.name} className="font-medium">{b.name}</SelectItem>
                    ))}
                 </SelectContent>
              </Select>
           </div>
           <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-white border border-blue-100 hover:bg-blue-100" onClick={() => { setSelectedBrand("SEMUA"); }}>
              <Search className="h-5 w-5 text-blue-600" />
           </Button>
        </div>
      </div>

      <Tabs defaultValue="paket" className="space-y-6">
        <TabsList className="bg-white p-1 border rounded-2xl shadow-sm h-14">
           <TabsTrigger value="paket" className="rounded-xl px-4 font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full text-xs">PROGRAM PAKET</TabsTrigger>
           <TabsTrigger value="cashback" className="rounded-xl px-4 font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white h-full text-xs">CASHBACK</TabsTrigger>
           <TabsTrigger value="cutting" className="rounded-xl px-4 font-black data-[state=active]:bg-amber-600 data-[state=active]:text-white h-full text-xs">CUTTING LABEL</TabsTrigger>
           <TabsTrigger value="point" className="rounded-xl px-4 font-black data-[state=active]:bg-purple-600 data-[state=active]:text-white h-full text-xs">POIN HADIAH</TabsTrigger>
           <TabsTrigger value="principal" className="rounded-xl px-4 font-black data-[state=active]:bg-slate-700 data-[state=active]:text-white h-full text-xs">PROGRAM PRINCIPAL</TabsTrigger>
        </TabsList>

        {/* --- TAB MASTER PAKET --- */}
        <TabsContent value="paket">
           <Card className="shadow-xl border-2 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-gradient-to-r from-slate-100 to-white px-8 py-6 flex flex-row justify-between items-center border-b">
                 <div>
                    <CardTitle className="text-xl font-black text-slate-800">Program Paket Program (Tiering)</CardTitle>
                    <CardDescription className="text-slate-500 font-medium italic">Setting program berbasis kuantitas/nilai dalam periode tertentu</CardDescription>
                 </div>
                 <Dialog open={openPaket} onOpenChange={(v) => {
                    if (!v) { setEditingPaketId(null); setViewOnly(false); }
                    setOpenPaket(v);
                 }}>
                    <DialogTrigger asChild>
                       <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl h-12 px-6 font-bold flex gap-2" onClick={() => {
                          setNewPaket({ nama: "", brandCode: "SEMUA", periodeBulan: 1, startDate: format(new Date(), "dd/MM/yyyy"), endDate: format(new Date(), "dd/MM/yyyy"), basisType: "qty", siklus: "per_bulan", status: "aktif" });
                          setTiers([{ urutanTier: 1, minValue: 0, rewardType: "cash", rewardPercent: 0, rewardValue: 0, rewardDesc: "" }]);
                       }}>
                          <PlusCircle className="h-6 w-6" /> BUAT PAKET BARU
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
                       <DialogHeader><DialogTitle className="text-2xl font-black">{viewOnly ? "DETAIL PAKET" : editingPaketId ? "EDIT MASTER PAKET" : "KONFIGURASI MASTER PAKET"}</DialogTitle></DialogHeader>
                       <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-6 border-b">
                          <div className="space-y-2 col-span-2">
                             <Label className="font-bold text-slate-700">Nama Program Paket</Label>
                             <Input className="rounded-lg h-12" disabled={viewOnly} value={newPaket.nama} onChange={e => setNewPaket({...newPaket, nama: e.target.value})} placeholder="Contoh: Paket Semester I 2024" />
                          </div>
                          <div className="space-y-2">
                             <Label className="font-bold text-slate-700">Pilih Master Merek (Brand)</Label>
                             <Select disabled={viewOnly} value={newPaket.brandCode} onValueChange={v => setNewPaket({...newPaket, brandCode: v})}>
                                <SelectTrigger className="rounded-lg h-12 font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                   <SelectItem value="SEMUA">-- SEMUA MEREK --</SelectItem>
                                   {brands?.map(b => (
                                      <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                                   ))}
                                </SelectContent>
                             </Select>
                          </div>
                          <div className="space-y-2">
                             <Label className="font-bold text-slate-700">Siklus Perhitungan</Label>
                             <Select disabled={viewOnly} value={newPaket.siklus} onValueChange={(v: any) => setNewPaket({...newPaket, siklus: v})}>
                                <SelectTrigger className="rounded-lg h-12 font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                   <SelectItem value="per_bulan">Setiap Bulan</SelectItem>
                                   <SelectItem value="per_3_bulan">Setiap 3 Bulan (Quarter)</SelectItem>
                                   <SelectItem value="per_6_bulan">Setiap 6 Bulan (Semester)</SelectItem>
                                   <SelectItem value="per_tahun">Tahunan (Yearly)</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>
                          <div className="space-y-2">
                             <Label className="font-bold text-slate-700">Tanggal Selesai Berlaku</Label>
                             <Input className="rounded-lg h-12" disabled={viewOnly} type="text" placeholder="DD/MM/YYYY" maxLength={10} value={newPaket.endDate} onChange={e => setNewPaket({...newPaket, endDate: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <Label className="font-bold text-slate-700">Tanggal Mulai Berlaku</Label>
                             <Input className="rounded-lg h-12" disabled={viewOnly} type="text" placeholder="DD/MM/YYYY" maxLength={10} value={newPaket.startDate} onChange={e => setNewPaket({...newPaket, startDate: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <Label className="font-bold text-slate-700">Basis Target</Label>
                             <Select disabled={viewOnly} value={newPaket.basisType} onValueChange={v => setNewPaket({...newPaket, basisType: v})}>
                                <SelectTrigger className="rounded-lg h-12 font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="qty">Berdasarkan JUMLAH (Qty)</SelectItem><SelectItem value="nilai">Berdasarkan NILAI (Rupiah)</SelectItem></SelectContent>
                             </Select>
                          </div>
                       </div>
                       <div className="py-6 space-y-4">
                          <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl border-l-8 border-blue-600">
                             <h4 className="font-black text-sm uppercase text-slate-800">Pengaturan Level (Tiering)</h4>
                             {!viewOnly && <Button variant="default" size="sm" className="bg-blue-600 rounded-lg" onClick={() => setTiers([...tiers, { urutanTier: tiers.length + 1, minValue: 0, rewardType: "cash", rewardPercent: 0, rewardValue: 0, rewardDesc: "" }])}>+ Tambah Level</Button>}
                          </div>
                          {tiers.map((t, idx) => (
                             <div key={idx} className="flex gap-2 items-end p-4 border rounded-2xl bg-slate-50/50 shadow-sm relative group">
                                <div className="w-10 text-center bg-slate-200 rounded-lg p-2 font-black text-slate-700 text-sm">{t.urutanTier}</div>
                                <div className="flex-1 space-y-1">
                                  <Label className="text-[10px] font-bold">Min Target ({newPaket.basisType === 'qty' ? 'Qty' : 'Rp'})</Label>
                                  <Input type="text" disabled={viewOnly} className="h-10 rounded-lg font-bold" value={toIDR(t.minValue)} onChange={e => { const n = [...tiers]; n[idx].minValue = fromIDR(e.target.value); setTiers(n); }} />
                                </div>
                                <div className="flex-1 space-y-1">
                                   <Label className="text-[10px] font-bold">Jenis Reward</Label>
                                   <Select disabled={viewOnly} value={t.rewardType} onValueChange={v => { const n = [...tiers]; n[idx].rewardType = v; setTiers(n); }}>
                                      <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                         <SelectItem value="cash">Uang Tunai</SelectItem>
                                         <SelectItem value="percent">Persentase (%)</SelectItem>
                                         <SelectItem value="barang">Barang/Hadiah</SelectItem>
                                         <SelectItem value="tour">Tour/Wisata</SelectItem>
                                      </SelectContent>
                                   </Select>
                                </div>
                                {t.rewardType === 'percent' ? (
                                  <div className="w-24 space-y-1">
                                    <Label className="text-[10px] font-bold">Nilai (%)</Label>
                                    <Input type="number" disabled={viewOnly} className="h-10 rounded-lg text-center font-bold text-blue-600 border-blue-200" value={t.rewardPercent} onChange={e => { const n = [...tiers]; n[idx].rewardPercent = parseFloat(e.target.value) || 0; setTiers(n); }} />
                                  </div>
                                ) : (
                                  <div className="w-32 space-y-1">
                                    <Label className="text-[10px] font-bold">Nilai (Rp)</Label>
                                    <Input type="text" disabled={viewOnly} className="h-10 rounded-lg font-bold text-emerald-600 border-emerald-200" value={toIDR(t.rewardValue)} onChange={e => { const n = [...tiers]; n[idx].rewardValue = fromIDR(e.target.value); setTiers(n); }} />
                                  </div>
                                )}
                                <div className="flex-[1.5] space-y-1">
                                   <Label className="text-[10px] font-bold">Deskripsi Hadiah</Label>
                                   <Input disabled={viewOnly} className="h-10 rounded-lg" value={t.rewardDesc} onChange={e => { const n = [...tiers]; n[idx].rewardDesc = e.target.value; setTiers(n); }} placeholder="Cth: Emas 5 Gr" />
                                </div>
                                {!viewOnly && idx > 0 && <Button variant="ghost" className="h-10 px-2 text-red-500 hover:bg-red-50" onClick={() => setTiers(tiers.filter((_, i) => i !== idx))}><Trash2 className="h-5 w-5"/></Button>}
                             </div>
                          ))}
                       </div>
                       <DialogFooter className="bg-slate-50 p-6 -mx-6 -mb-6 mt-6 rounded-b-3xl border-t">
                          <Button variant="outline" className="rounded-xl h-12 px-8" onClick={() => { setOpenPaket(false); setEditingPaketId(null); setViewOnly(false); }}>{viewOnly ? "TUTUP" : "BATAL"}</Button>
                          {!viewOnly && (
                             <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl h-12 px-8 font-black shadow-lg" onClick={() => mutPaket.mutate({...newPaket, startDate: parseIndonesiaDate(newPaket.startDate), endDate: parseIndonesiaDate(newPaket.endDate), tiers})} disabled={mutPaket.isPending}>
                                {mutPaket.isPending ? <Loader2 className="animate-spin" /> : editingPaketId ? "UPDATE MASTER PAKET" : "SIMPAN MASTER PAKET"}
                             </Button>
                          )}
                       </DialogFooter>
                    </DialogContent>
                 </Dialog>
              </CardHeader>
              <StatusFilterBar />
              <CardContent className="p-0">
                 {loadPaket ? <div className="p-20 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div> : (
                   <Table>
                      <TableHeader className="bg-slate-50 font-black uppercase text-[10px]">
                         <TableRow><TableHead>Nama Paket</TableHead><TableHead>Merek</TableHead><TableHead>Basis</TableHead><TableHead>Siklus</TableHead><TableHead>Masa Berlaku</TableHead><TableHead>Level</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                         {filterByStatus(pakets)?.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-20 text-slate-400">Belum ada paket yang dibuat.</TableCell></TableRow>}
                         {filterByStatus(pakets)?.map(p => (
                            <TableRow key={p.id} className={`hover:bg-slate-50 transition-colors ${p.status === 'nonaktif' ? 'opacity-60' : ''}`}>
                               <TableCell>
                                 <div className="font-bold text-slate-700">{p.nama}</div>
                                 {p.status === 'nonaktif' && p.tanggalNonaktif && (
                                   <div className="text-[10px] text-red-400 font-medium mt-0.5">Dinonaktifkan {format(new Date(p.tanggalNonaktif), "dd MMM yyyy HH:mm", { locale: idLocale })}</div>
                                 )}
                               </TableCell>
                               <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">{p.brandCode || "SEMUA"}</Badge></TableCell>
                                <TableCell className="capitalize">{p.basisType}</TableCell>
                                <TableCell className="font-bold text-center text-blue-600">{p.periodeBulan || 1} Bln</TableCell>
                               <TableCell className="whitespace-nowrap">
                                   <div className="flex items-center gap-1 font-bold text-slate-600">
                                     <Calendar className="h-3 w-3 text-emerald-500" /> {format(new Date(p.startDate), "dd/MM/yyyy")} - {format(new Date(p.endDate || p.startDate), "dd/MM/yyyy")}
                                   </div>
                               </TableCell>
                               <TableCell><Badge variant="outline">{p.tiers?.length || 0} Level</Badge></TableCell>
                               <TableCell>
                                 <div className="flex items-center gap-2">
                                   <Switch 
                                      checked={p.status === 'aktif'} 
                                      onCheckedChange={() => handleToggle('paket', p.id, p.nama, p.status)} 
                                   />
                                   <Badge variant={p.status === 'aktif' ? 'default' : 'destructive'} className={p.status === 'aktif' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}>{p.status.toUpperCase()}</Badge>
                                 </div>
                               </TableCell>
                               <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleEditPaket(p, true)} title="View Detail"><Eye className="h-4 w-4"/></Button>
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => handleEditPaket(p)} title="Edit Paket"><Edit className="h-4 w-4"/></Button>
                                     <Button variant="ghost" size="icon" className="h-9 w-9 text-red-600 bg-red-50 hover:bg-red-100" onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (window.confirm("Hapus master paket ini?")) {
                                           mutDeletePaket.mutate(p.id);
                                        }
                                     }} title="Hapus Paket"><Trash2 className="h-4 w-4 pointer-events-none"/></Button>
                                  </div>
                               </TableCell>
                            </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                 )}
              </CardContent>
           </Card>
        </TabsContent>

         <TabsContent value="cashback">
           <Card className="shadow-xl border-2 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-gradient-to-r from-slate-100 to-white px-8 py-6 flex flex-row justify-between items-center border-b">
                 <div>
                    <CardTitle className="text-xl font-black text-slate-800">Master Cashback</CardTitle>
                    <CardDescription className="text-slate-500 font-medium italic">Setting operasional cashback per transaksi</CardDescription>
                 </div>
                 <Dialog open={openCashback} onOpenChange={(v) => {
                    if (!v) { setEditingCashbackId(null); setViewOnly(false); }
                    setOpenCashback(v);
                 }}>
                    <DialogTrigger asChild>
                       <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl h-12 px-6 font-bold flex gap-2" onClick={() => {
                          setNewCashback({ 
                            nama: "", 
                            brandCode: "SEMUA", 
                            tipeCashback: "persen", 
                            nilai: 0, 
                            tipeSyarat: "tanpa_syarat",
                            minTransaksi: 0, 
                            maksCashback: 0, 
                            masaBerlakuMulai: format(new Date(), "dd/MM/yyyy"),
                            masaBerlakuSelesai: format(new Date(), "dd/MM/yyyy"),
                            siklus: "per_bulan",
                            status: "aktif" 
                          });
                       }}>
                          <PlusCircle className="h-6 w-6" /> BUAT CASHBACK
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl rounded-3xl">
                       <DialogHeader><DialogTitle className="text-2xl font-black">{viewOnly ? "DETAIL CASHBACK" : editingCashbackId ? "EDIT CASHBACK" : "KONFIGURASI CASHBACK"}</DialogTitle></DialogHeader>
                       <div className="space-y-4 py-4">
                          <div className="space-y-2">
                             <Label className="font-bold">Nama Program Cashback</Label>
                             <Input disabled={viewOnly} value={newCashback.nama} onChange={e => setNewCashback({...newCashback, nama: e.target.value})} placeholder="Cth: Cashback Spesial Lebaran" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold">Pilih Merek</Label>
                                <Select disabled={viewOnly} value={newCashback.brandCode} onValueChange={v => setNewCashback({...newCashback, brandCode: v})}>
                                   <SelectTrigger><SelectValue /></SelectTrigger>
                                   <SelectContent>
                                      <SelectItem value="SEMUA">-- SEMUA MEREK --</SelectItem>
                                      {brands?.map(b => (
                                         <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                                      ))}
                                   </SelectContent>
                                </Select>
                             </div>
                            <div className="space-y-2">
                                <Label className="font-bold">Tipe Cashback</Label>
                                <Select disabled={viewOnly} value={newCashback.tipeCashback} onValueChange={(v: any) => setNewCashback({...newCashback, tipeCashback: v})}>
                                   <SelectTrigger><SelectValue /></SelectTrigger>
                                   <SelectContent><SelectItem value="persen">Persentase (%)</SelectItem><SelectItem value="tetap">Nilai Tetap (Rp)</SelectItem></SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-2">
                                <Label className="font-bold">Nilai {newCashback.tipeCashback === 'persen' ? '(%)' : '(Rp)'}</Label>
                                <Input type="text" disabled={viewOnly} value={newCashback.tipeCashback === 'persen' ? newCashback.nilai : toIDR(newCashback.nilai)} onChange={e => setNewCashback({...newCashback, nilai: newCashback.tipeCashback === 'persen' ? parseFloat(e.target.value) || 0 : fromIDR(e.target.value)})} />
                             </div>
                             <div className="space-y-2">
                                <Label className="font-bold">Tipe Syarat</Label>
                                <Select disabled={viewOnly} value={newCashback.tipeSyarat} onValueChange={(v: any) => setNewCashback({...newCashback, tipeSyarat: v})}>
                                   <SelectTrigger><SelectValue /></SelectTrigger>
                                   <SelectContent>
                                      <SelectItem value="tanpa_syarat">Tanpa Syarat (Per Faktur)</SelectItem>
                                      <SelectItem value="bersyarat">Bersyarat (Akumulasi Bulanan)</SelectItem>
                                   </SelectContent>
                                </Select>
                             </div>
                                  {newCashback.tipeSyarat === "bersyarat" ? (
                                <>
                                   <div className="space-y-2 col-span-2">
                                     <Label className="font-bold">Siklus Akumulasi</Label>
                                     <Select disabled={viewOnly} value={newCashback.siklus} onValueChange={(v: any) => setNewCashback({...newCashback, siklus: v})}>
                                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                           <SelectItem value="per_bulan">Akumulasi Bulanan</SelectItem>
                                           <SelectItem value="per_3_bulan">Akumulasi 3 Bulan</SelectItem>
                                           <SelectItem value="per_6_bulan">Akumulasi 6 Bulan</SelectItem>
                                           <SelectItem value="per_tahun">Akumulasi Tahunan</SelectItem>
                                        </SelectContent>
                                     </Select>
                                  </div>
                                  <div className="space-y-2">
                                     <Label className="font-bold">Target Transaksi (Rp)</Label>
                                     <Input type="text" disabled={viewOnly} value={toIDR(newCashback.minTransaksi)} onChange={e => setNewCashback({...newCashback, minTransaksi: fromIDR(e.target.value)})} />
                                  </div>
                                 <div className="space-y-2">
                                    <Label className="font-bold">Mulai Berlaku</Label>
                                    <Input type="text" placeholder="DD/MM/YYYY" maxLength={10} disabled={viewOnly} value={newCashback.masaBerlakuMulai} onChange={e => setNewCashback({...newCashback, masaBerlakuMulai: e.target.value})} />
                                 </div>
                                 <div className="space-y-2">
                                    <Label className="font-bold">Sampai Dengan</Label>
                                    <Input type="text" placeholder="DD/MM/YYYY" maxLength={10} disabled={viewOnly} value={newCashback.masaBerlakuSelesai} onChange={e => setNewCashback({...newCashback, masaBerlakuSelesai: e.target.value})} />
                                 </div>
                               </>
                             ) : (
                               <div className="space-y-2">
                                  <Label className="font-bold">Min. Per Faktur (Rp)</Label>
                                  <Input type="text" disabled={viewOnly} value={toIDR(newCashback.minTransaksi)} onChange={e => setNewCashback({...newCashback, minTransaksi: fromIDR(e.target.value)})} />
                               </div>
                             )}
                             <div className="space-y-2">
                                <Label className="font-bold">Batas Maksimal Cashback (Rp)</Label>
                                <Input type="text" disabled={viewOnly} value={toIDR(newCashback.maksCashback)} onChange={e => setNewCashback({...newCashback, maksCashback: fromIDR(e.target.value)})} />
                             </div>
                          </div>
                       </div>
                       <DialogFooter>
                          <Button variant="outline" onClick={() => setOpenCashback(false)}>{viewOnly ? "TUTUP" : "BATAL"}</Button>
                          {!viewOnly && <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => mutCashback.mutate({...newCashback, masaBerlakuMulai: parseIndonesiaDate(newCashback.masaBerlakuMulai), masaBerlakuSelesai: parseIndonesiaDate(newCashback.masaBerlakuSelesai)})} disabled={mutCashback.isPending}>SIMPAN</Button>}
                       </DialogFooter>
                    </DialogContent>
                 </Dialog>
              </CardHeader>
              <StatusFilterBar />
              <CardContent className="p-0">
                 {loadCashback ? <div className="p-20 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div> : (
                   <Table>
                      <TableHeader className="bg-slate-50 font-black uppercase text-[10px]">
                         <TableRow><TableHead>Nama</TableHead><TableHead>Merek</TableHead><TableHead>Tipe</TableHead><TableHead>Nilai</TableHead><TableHead>Min. Transaksi</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterByStatus(cashbacks)?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400">Belum ada cashback yang dibuat.</TableCell></TableRow>}
                        {filterByStatus(cashbacks)?.map(c => (
                           <TableRow key={c.id} className={`hover:bg-slate-50 transition-colors ${c.status === 'nonaktif' ? 'opacity-60' : ''}`}>
                              <TableCell>
                                <div className="font-bold">{c.nama}</div>
                                {c.status === 'nonaktif' && c.tanggalNonaktif && (
                                  <div className="text-[10px] text-red-400 font-medium mt-0.5">Dinonaktifkan {format(new Date(c.tanggalNonaktif), "dd MMM yyyy HH:mm", { locale: idLocale })}</div>
                                )}
                              </TableCell>
                              <TableCell><Badge variant="outline">{c.brandCode || "SEMUA"}</Badge></TableCell>
                              <TableCell className="capitalize">{c.tipeCashback}</TableCell>
                              <TableCell>{c.tipeCashback === 'persen' ? `${c.nilai}%` : `Rp ${toIDR(c.nilai)}`}</TableCell>
                              <TableCell>Rp {toIDR(c.minTransaksi)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch 
                                     checked={c.status === 'aktif'} 
                                     onCheckedChange={() => handleToggle('cashback', c.id, c.nama, c.status)} 
                                  />
                                  <Badge variant={c.status === 'aktif' ? 'default' : 'destructive'} className={c.status === 'aktif' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}>{c.status.toUpperCase()}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                 <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" className="text-blue-600" onClick={() => handleEditCashback(c, true)}><Eye className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" className="text-amber-600" onClick={() => handleEditCashback(c)}><Edit className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" className="text-red-600" onClick={() => {
                                       if(window.confirm("Hapus master cashback ini?")) {
                                          mutDeleteCashback.mutate(c.id);
                                       }
                                    }}><Trash2 className="h-4 w-4"/></Button>
                                 </div>
                              </TableCell>
                           </TableRow>
                        ))}
                      </TableBody>
                   </Table>
                 )}
              </CardContent>
           </Card>
         </TabsContent>

         <TabsContent value="cutting">
           <Card className="shadow-xl border-2 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-gradient-to-r from-slate-100 to-white px-8 py-6 flex flex-row justify-between items-center border-b">
                 <div>
                    <CardTitle className="text-xl font-black text-slate-800">Master Cutting Label</CardTitle>
                    <CardDescription className="text-slate-500 font-medium italic">Setting nilai per label potong untuk program brand</CardDescription>
                 </div>
                 <Dialog open={openCutting} onOpenChange={(v) => {
                    if (!v) { setEditingCuttingId(null); setViewOnly(false); }
                    setOpenCutting(v);
                 }}>
                    <DialogTrigger asChild>
                       <Button className="rounded-2xl bg-amber-600 hover:bg-amber-700 shadow-xl h-12 px-6 font-bold flex gap-2" onClick={() => {
                          setNewCutting({ nama: "", brandCode: "SEMUA", nilaiPerLabel: 0, status: "aktif" });
                       }}>
                          <PlusCircle className="h-6 w-6" /> BUAT CUTTING
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl rounded-3xl">
                       <DialogHeader><DialogTitle className="text-2xl font-black">{viewOnly ? "DETAIL CUTTING" : editingCuttingId ? "EDIT CUTTING" : "KONFIGURASI CUTTING"}</DialogTitle></DialogHeader>
                       <div className="space-y-4 py-4">
                          <div className="space-y-2">
                             <Label className="font-bold">Nama Program Cutting</Label>
                             <Input disabled={viewOnly} value={newCutting.nama} onChange={e => setNewCutting({...newCutting, nama: e.target.value})} placeholder="Cth: Cutting Label Brand A" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold">Pilih Merek</Label>
                                <Select disabled={viewOnly} value={newCutting.brandCode} onValueChange={v => setNewCutting({...newCutting, brandCode: v})}>
                                   <SelectTrigger><SelectValue /></SelectTrigger>
                                   <SelectContent>
                                      <SelectItem value="SEMUA">-- SEMUA MEREK --</SelectItem>
                                      {brands?.map(b => (
                                         <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                                      ))}
                                   </SelectContent>
                                </Select>
                             </div>
                            <div className="space-y-2">
                                <Label className="font-bold">Nilai Per Label (Rp)</Label>
                                <Input type="text" disabled={viewOnly} value={toIDR(newCutting.nilaiPerLabel)} onChange={e => setNewCutting({...newCutting, nilaiPerLabel: fromIDR(e.target.value)})} />
                             </div>
                          </div>
                       </div>
                       <DialogFooter>
                          <Button variant="outline" onClick={() => setOpenCutting(false)}>{viewOnly ? "TUTUP" : "BATAL"}</Button>
                          {!viewOnly && <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => mutCutting.mutate(newCutting)} disabled={mutCutting.isPending}>SIMPAN</Button>}
                       </DialogFooter>
                    </DialogContent>
                 </Dialog>
              </CardHeader>
              <StatusFilterBar />
              <CardContent className="p-0">
                 {loadCutting ? <div className="p-20 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-amber-600" /></div> : (
                   <Table>
                      <TableHeader className="bg-slate-50 font-black uppercase text-[10px]">
                         <TableRow><TableHead>Nama</TableHead><TableHead>Merek</TableHead><TableHead>Nilai Per Label</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterByStatus(cuttings)?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400">Belum ada cutting label yang dibuat.</TableCell></TableRow>}
                        {filterByStatus(cuttings)?.map(c => (
                           <TableRow key={c.id} className={`hover:bg-slate-50 transition-colors ${c.status === 'nonaktif' ? 'opacity-60' : ''}`}>
                              <TableCell>
                                <div className="font-bold">{c.nama}</div>
                                {c.status === 'nonaktif' && c.tanggalNonaktif && (
                                  <div className="text-[10px] text-red-400 font-medium mt-0.5">Dinonaktifkan {format(new Date(c.tanggalNonaktif), "dd MMM yyyy HH:mm", { locale: idLocale })}</div>
                                )}
                              </TableCell>
                              <TableCell><Badge variant="outline">{c.brandCode || "SEMUA"}</Badge></TableCell>
                              <TableCell>Rp {toIDR(c.nilaiPerLabel)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch 
                                     checked={c.status === 'aktif'} 
                                     onCheckedChange={() => handleToggle('cutting', c.id, c.nama, c.status)} 
                                  />
                                  <Badge variant={c.status === 'aktif' ? 'default' : 'destructive'} className={c.status === 'aktif' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}>{c.status.toUpperCase()}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                 <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" className="text-blue-600" onClick={() => handleEditCutting(c, true)}><Eye className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" className="text-amber-600" onClick={() => handleEditCutting(c)}><Edit className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" className="text-red-600" onClick={() => {
                                       if(window.confirm("Hapus master cutting ini?")) {
                                          mutDeleteCutting.mutate(c.id);
                                       }
                                    }}><Trash2 className="h-4 w-4"/></Button>
                                 </div>
                              </TableCell>
                           </TableRow>
                        ))}
                      </TableBody>
                   </Table>
                 )}
              </CardContent>
           </Card>
         </TabsContent>

          <TabsContent value="point">
             <Card className="shadow-xl border-2 rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-gradient-to-r from-slate-100 to-white px-8 py-6 flex flex-row justify-between items-center border-b">
                   <div>
                      <CardTitle className="text-xl font-black text-slate-800">Master Poin Hadiah</CardTitle>
                      <CardDescription className="text-slate-500 font-medium italic">Aturan perolehan poin dan katalog penukaran hadiah</CardDescription>
                   </div>
                   <Dialog open={openPoint} onOpenChange={(v) => {
                      if (!v) { setEditingPointId(null); setViewOnly(false); }
                      setOpenPoint(v);
                   }}>
                      <DialogTrigger asChild>
                         <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-xl gap-2 h-12 px-6" onClick={() => {
                            setEditingPointId(null);
                            setViewOnly(false);
                            setNewPoint({ namaProgram: "", brandCode: "SEMUA", tanggalMulai: format(new Date(), "dd/MM/yyyy"), tanggalSelesai: format(new Date(), "dd/MM/yyyy"), status: "aktif" });
                            setPointRules([]);
                            setPointRewards([]);
                         }}>
                            <PlusCircle className="h-6 w-6" /> BUAT PROGRAM POIN
                         </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
                        <div className="bg-purple-600 p-8 text-white">
                           <DialogHeader>
                              <DialogTitle className="text-3xl font-black flex items-center gap-3 uppercase tracking-tight text-white">
                                 <Award className="h-8 w-8" />
                                 {viewOnly ? "DETAIL PROGRAM POIN" : editingPointId ? "EDIT PROGRAM POIN" : "KONFIGURASI POIN HADIAH"}
                              </DialogTitle>
                           </DialogHeader>
                        </div>
                        
                        <div className="p-8 space-y-8 bg-white">
                           {/* Info Dasar */}
                           <div className="grid grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                              <div className="space-y-2 col-span-2">
                                 <Label className="font-black text-slate-700 uppercase text-xs tracking-widest">Nama Program</Label>
                                 <Input className="rounded-xl h-12 font-bold focus:ring-purple-500" disabled={viewOnly} value={newPoint.namaProgram} onChange={e => setNewPoint({...newPoint, namaProgram: e.target.value})} placeholder="Contoh: Loyalty Point 2024" />
                              </div>
                              <div className="space-y-2">
                                 <Label className="font-black text-slate-700 uppercase text-xs tracking-widest">Master Merek</Label>
                                 <Select disabled={viewOnly} value={newPoint.brandCode} onValueChange={v => setNewPoint({...newPoint, brandCode: v})}>
                                    <SelectTrigger className="rounded-xl h-12 font-bold"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                       <SelectItem value="SEMUA">-- SEMUA MEREK --</SelectItem>
                                       {brands?.map(b => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                 </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <Label className="font-black text-slate-700 uppercase text-xs tracking-widest text">Mulai</Label>
                                    <Input type="text" placeholder="DD/MM/YYYY" maxLength={10} className="rounded-xl h-12 font-bold" disabled={viewOnly} value={newPoint.tanggalMulai} onChange={e => setNewPoint({...newPoint, tanggalMulai: e.target.value})} />
                                 </div>
                                 <div className="space-y-2">
                                    <Label className="font-black text-slate-700 uppercase text-xs tracking-widest">Selesai</Label>
                                    <Input type="text" placeholder="DD/MM/YYYY" maxLength={10} className="rounded-xl h-12 font-bold" disabled={viewOnly} value={newPoint.tanggalSelesai} onChange={e => setNewPoint({...newPoint, tanggalSelesai: e.target.value})} />
                                 </div>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Rules */}
                              <div className="space-y-4">
                                 <div className="flex justify-between items-center bg-purple-50 p-4 rounded-xl border-l-8 border-purple-600">
                                    <h4 className="font-black text-sm uppercase text-purple-900 flex items-center gap-2"><Target className="h-4 w-4" /> Aturan Perolehan</h4>
                                    {!viewOnly && <Button variant="default" size="sm" className="bg-purple-600 rounded-lg h-8" onClick={() => setPointRules([...pointRules, { tipe: "nominal", nilaiKonversi: 1000000, poinDihasilkan: 1 }])}>+ Aturan</Button>}
                                 </div>
                                 <div className="space-y-3">
                                    {pointRules.map((rule, idx) => (
                                       <div key={idx} className="flex gap-2 items-end p-4 border-2 rounded-2xl bg-white shadow-sm hover:border-purple-200 transition-colors">
                                          <div className="flex-1 space-y-1">
                                             <Label className="text-[10px] font-black text-slate-400 uppercase">Input {rule.tipe === 'nominal' ? 'Rp' : 'Qty'}</Label>
                                             <Input type="text" disabled={viewOnly} className="h-10 rounded-lg font-black text-purple-700" value={toIDR(rule.nilaiKonversi)} onChange={e => { const n = [...pointRules]; n[idx].nilaiKonversi = fromIDR(e.target.value); setPointRules(n); }} />
                                          </div>
                                          <div className="w-20 space-y-1 text-center font-bold text-slate-400 pb-2"> = </div>
                                          <div className="w-24 space-y-1">
                                             <Label className="text-[10px] font-black text-slate-400 uppercase text-center">Poin</Label>
                                             <Input type="number" disabled={viewOnly} className="h-10 rounded-lg font-black text-center text-emerald-600" value={rule.poinDihasilkan} onChange={e => { const n = [...pointRules]; n[idx].poinDihasilkan = parseInt(e.target.value); setPointRules(n); }} />
                                          </div>
                                          {!viewOnly && <Button variant="ghost" className="h-10 px-2 text-red-500" onClick={() => setPointRules(pointRules.filter((_, i) => i !== idx))}><Trash2 className="h-5 w-5"/></Button>}
                                       </div>
                                    ))}
                                    {pointRules.length === 0 && <div className="text-center py-8 border-2 border-dashed rounded-2xl text-slate-400 font-medium">Belum ada aturan dibuat</div>}
                                 </div>
                              </div>

                              {/* Rewards */}
                              <div className="space-y-4">
                                 <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border-l-8 border-emerald-600">
                                    <h4 className="font-black text-sm uppercase text-emerald-900 flex items-center gap-2"><Gift className="h-4 w-4" /> Katalog Hadiah</h4>
                                    {!viewOnly && <Button variant="default" size="sm" className="bg-emerald-600 rounded-lg h-8" onClick={() => setPointRewards([...pointRewards, { namaHadiah: "", pointDibutuhkan: 10, stok: 99, keterangan: "" }])}>+ Hadiah</Button>}
                                 </div>
                                 <div className="space-y-3">
                                    {pointRewards.map((rw, idx) => (
                                       <div key={idx} className="p-4 border-2 rounded-2xl bg-white shadow-sm hover:border-emerald-200 transition-colors space-y-3">
                                          <div className="flex gap-3">
                                             <div className="flex-1 space-y-1">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase">Nama Hadiah</Label>
                                                <Input disabled={viewOnly} className="h-10 rounded-lg font-bold" value={rw.namaHadiah} onChange={e => { const n = [...pointRewards]; n[idx].namaHadiah = e.target.value; setPointRewards(n); }} placeholder="Cth: Voucher 50k" />
                                             </div>
                                             <div className="w-24 space-y-1">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase">Poin</Label>
                                                <Input type="number" disabled={viewOnly} className="h-10 rounded-lg font-black text-center text-amber-600 border-amber-200" value={rw.pointDibutuhkan} onChange={e => { const n = [...pointRewards]; n[idx].pointDibutuhkan = parseInt(e.target.value); setPointRewards(n); }} />
                                             </div>
                                             {!viewOnly && <Button variant="ghost" className="h-10 px-2 mt-4 text-red-500" onClick={() => setPointRewards(pointRewards.filter((_, i) => i !== idx))}><Trash2 className="h-5 w-5"/></Button>}
                                          </div>
                                       </div>
                                    ))}
                                    {pointRewards.length === 0 && <div className="text-center py-8 border-2 border-dashed rounded-2xl text-slate-400 font-medium">Belum ada katalog hadiah</div>}
                                 </div>
                              </div>
                           </div>
                        </div>

                         <DialogFooter className="bg-slate-50 p-6 rounded-b-3xl border-t gap-3">
                            <Button variant="outline" className="rounded-xl h-12 px-8 font-bold" onClick={() => setOpenPoint(false)}>{viewOnly ? "TUTUP" : "BATAL"}</Button>
                            {!viewOnly && (
                               <Button className="bg-purple-600 hover:bg-purple-700 rounded-xl h-12 px-12 font-black shadow-lg shadow-purple-200" 
                                       onClick={() => mutPoint.mutate({...newPoint, rules: pointRules, rewards: pointRewards})} 
                                       disabled={mutPoint.isPending}>
                                  {mutPoint.isPending ? <Loader2 className="animate-spin" /> : editingPointId ? "UPDATE PROGRAM" : "SIMPAN PROGRAM"}
                               </Button>
                            )}
                         </DialogFooter>
                      </DialogContent>
                   </Dialog>
                </CardHeader>
                <StatusFilterBar />
                <CardContent className="p-0">
                   {loadPoint ? <div className="p-20 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-purple-600" /></div> : (
                     <Table>
                        <TableHeader className="bg-slate-50 font-black uppercase text-[10px] tracking-widest text-slate-500">
                           <TableRow>
                             <TableHead className="pl-8">Nama Program</TableHead>
                             <TableHead>Merek</TableHead>
                             <TableHead>Ringkasan Aturan</TableHead>
                             <TableHead>Katalog</TableHead>
                             <TableHead>Periode</TableHead>
                             <TableHead>Status</TableHead>
                             <TableHead className="text-right pr-8">Aksi</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByStatus(points)?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400">Belum ada program poin.</TableCell></TableRow>}
                          {filterByStatus(points)?.map(p => (
                             <TableRow key={p.id} className={`hover:bg-purple-50/30 transition-colors group ${p.status === 'nonaktif' ? 'opacity-60' : ''}`}>
                                <TableCell className="pl-8">
                                  <div className="font-bold text-slate-700">{p.namaProgram}</div>
                                  {p.status === 'nonaktif' && p.tanggalNonaktif && (
                                    <div className="text-[10px] text-red-400 font-medium mt-0.5">Dinonaktifkan {format(new Date(p.tanggalNonaktif), "dd MMM yyyy HH:mm", { locale: idLocale })}</div>
                                  )}
                                </TableCell>
                                <TableCell><Badge variant="outline" className="bg-white text-purple-600 border-purple-200 font-bold">{p.brandCode || "SEMUA"}</Badge></TableCell>
                                <TableCell>
                                   <div className="flex flex-col gap-1">
                                      {p.rules?.slice(0, 1).map((r: any, i: number) => (
                                         <span key={i} className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                            • {r.tipe === 'nominal' ? `Rp ${toIDR(r.nilaiKonversi)}` : `${r.nilaiKonversi} Pcs`} = {r.poinDihasilkan} Pts
                                         </span>
                                      ))}
                                      {p.rules?.length > 1 && <span className="text-[9px] text-purple-500 font-black">+{p.rules.length - 1} Lainnya</span>}
                                   </div>
                                </TableCell>
                                <TableCell>
                                   <div className="flex items-center gap-1 font-black text-emerald-600 text-xs">
                                      <Gift className="h-3 w-3" /> {p.rewards?.length || 0} Item
                                   </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap font-bold text-slate-600 text-xs">
                                   {format(new Date(p.tanggalMulai), "dd/MM/yyyy")} - {format(new Date(p.tanggalSelesai), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Switch 
                                       checked={p.status === 'aktif'} 
                                       onCheckedChange={() => handleToggle('point', p.id, p.namaProgram, p.status)} 
                                    />
                                    <Badge variant={p.status === 'aktif' ? 'default' : 'destructive'} className={p.status === 'aktif' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}>{p.status.toUpperCase()}</Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleEditPoint(p, true)}><Eye className="h-4 w-4"/></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:bg-purple-50" onClick={() => handleEditPoint(p)}><Edit className="h-4 w-4"/></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => { if(window.confirm("Hapus program poin ini?")) mutDeletePoint.mutate(p.id); }}><Trash2 className="h-4 w-4"/></Button>
                                   </div>
                                </TableCell>
                             </TableRow>
                          ))}
                        </TableBody>
                     </Table>
                   )}
                </CardContent>
             </Card>
           </TabsContent>

          <TabsContent value="principal">
             <Card className="shadow-xl border-2 rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-gradient-to-r from-slate-100 to-white px-8 py-6 flex flex-row justify-between items-center border-b">
                   <div>
                      <CardTitle className="text-xl font-black text-slate-800">Program Principal</CardTitle>
                      <CardDescription className="text-slate-500 font-medium italic">Manajemen program promo bersama principal/pabrik</CardDescription>
                   </div>
                   <Dialog open={openPrincipal} onOpenChange={(v) => { if (!v) { setEditingPrincipalId(null); setViewOnly(false); } setOpenPrincipal(v); }}>
                      <DialogTrigger asChild>
                         <Button className="bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl gap-2 h-12 px-6" onClick={() => {
                            setNewPrincipal({ nama: "", principalId: 0, brandCode: "SEMUA", basisType: "qty", startDate: format(new Date(), "dd/MM/yyyy"), endDate: format(new Date(), "dd/MM/yyyy"), periodeBulan: 1, siklus: "per_bulan", status: "aktif" });
                            setPrincipalTiers([{ urutanTier: 1, minValue: 0, rewardType: "cash", rewardValueCompany: 0, rewardValuePrincipal: 0, rewardPerusahaanPercent: 0, rewardPrincipalPercent: 0, rewardBarangCompany: "", rewardBarangPrincipal: "" }]);
                         }}>
                            <PlusCircle className="h-6 w-6" /> TAMBAH PROGRAM PRINCIPAL
                         </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
                        <div className="bg-slate-700 p-8 text-white">
                           <DialogHeader>
                              <DialogTitle className="text-3xl font-black flex items-center gap-3 uppercase tracking-tight text-white italic">
                                 <Package className="h-8 w-8" />
                                 {viewOnly ? "DETAIL PROGRAM PRINCIPAL" : editingPrincipalId ? "EDIT PROGRAM PRINCIPAL" : "KONFIGURASI PROGRAM PRINCIPAL"}
                              </DialogTitle>
                           </DialogHeader>
                        </div>
                        <div className="p-8 space-y-8 bg-white">
                           <div className="grid grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                              <div className="space-y-2 col-span-2">
                                 <Label className="font-black text-slate-700 uppercase text-xs tracking-widest">Nama Program Principal</Label>
                                 <Input className="rounded-xl h-12 font-bold focus:ring-slate-500" disabled={viewOnly} value={newPrincipal.nama} onChange={e => setNewPrincipal({...newPrincipal, nama: e.target.value})} placeholder="Contoh: Program Loyalitas Principal A" />
                              </div>
                              <div className="space-y-2">
                                <Label className="font-black text-slate-700 uppercase text-xs tracking-widest">Pilih Principal</Label>
                                <Select disabled={viewOnly} value={newPrincipal.principalId.toString()} onValueChange={v => setNewPrincipal({...newPrincipal, principalId: parseInt(v)})}>
                                   <SelectTrigger className="rounded-xl h-12 font-bold"><SelectValue placeholder="Pilih Principal" /></SelectTrigger>
                                   <SelectContent>
                                      {principalList?.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.nama}</SelectItem>)}
                                   </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="font-black text-slate-700 uppercase text-xs tracking-widest">Master Merek</Label>
                                <Select disabled={viewOnly} value={newPrincipal.brandCode} onValueChange={v => setNewPrincipal({...newPrincipal, brandCode: v})}>
                                   <SelectTrigger className="rounded-xl h-12 font-bold"><SelectValue /></SelectTrigger>
                                   <SelectContent>
                                      <SelectItem value="SEMUA">-- SEMUA MEREK --</SelectItem>
                                      {brands?.map(b => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}
                                   </SelectContent>
                                </Select>
                              </div>
                               <div className="space-y-2">
                                <Label className="font-black text-slate-700 uppercase text-xs tracking-widest">Basis Target</Label>
                                <Select disabled={viewOnly} value={newPrincipal.basisType} onValueChange={(v: any) => setNewPrincipal({...newPrincipal, basisType: v})}>
                                   <SelectTrigger className="rounded-xl h-12 font-bold"><SelectValue /></SelectTrigger>
                                   <SelectContent><SelectItem value="qty">Berdasarkan Qty</SelectItem><SelectItem value="nilai">Berdasarkan Omzet (Rp)</SelectItem></SelectContent>
                                </Select>
                              </div>
                                                             <div className="space-y-2">
                                 <Label className="font-black text-slate-700 uppercase text-xs tracking-widest">Siklus Perhitungan</Label>
                                 <Select disabled={viewOnly} value={newPrincipal.siklus} onValueChange={(v: any) => setNewPrincipal({...newPrincipal, siklus: v})}>
                                    <SelectTrigger className="rounded-xl h-12 font-bold"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                       <SelectItem value="per_bulan">Setiap Bulan</SelectItem>
                                       <SelectItem value="per_3_bulan">Setiap 3 Bulan (Quarter)</SelectItem>
                                       <SelectItem value="per_6_bulan">Setiap 6 Bulan (Semester)</SelectItem>
                                       <SelectItem value="per_tahun">Tahunan (Yearly)</SelectItem>
                                    </SelectContent>
                                 </Select>
                               </div>
                              <div className="space-y-2">
                                <Label className="font-black text-slate-700 uppercase text-xs tracking-widest">Mulai</Label>
                                <Input type="text" placeholder="DD/MM/YYYY" maxLength={10} className="rounded-xl h-12 font-bold" disabled={viewOnly} value={newPrincipal.startDate} onChange={e => setNewPrincipal({...newPrincipal, startDate: e.target.value})} />
                              </div>
                              <div className="space-y-2">
                                <Label className="font-black text-slate-700 uppercase text-xs tracking-widest">Selesai</Label>
                                <Input type="text" placeholder="DD/MM/YYYY" maxLength={10} className="rounded-xl h-12 font-bold" disabled={viewOnly} value={newPrincipal.endDate} onChange={e => setNewPrincipal({...newPrincipal, endDate: e.target.value})} />
                              </div>
                           </div>

                           <div className="space-y-4">
                              <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl border-l-8 border-slate-700">
                                 <h4 className="font-black text-sm uppercase text-slate-900 flex items-center gap-2"><Target className="h-4 w-4" /> Pengaturan Level & Reward Split</h4>
                                                                   {!viewOnly && <Button variant="default" size="sm" className="bg-slate-700 rounded-lg h-10" onClick={() => setPrincipalTiers([...principalTiers, { urutanTier: principalTiers.length + 1, minValue: 0, rewardPerusahaanType: "uang_tunai", rewardPrincipalType: "uang_tunai", rewardPerusahaanValue: 0, rewardPrincipalValue: 0, rewardPerusahaanPercent: 0, rewardPrincipalPercent: 0, rewardPerusahaanDesc: "", rewardPrincipalDesc: "" }])}>+ Tambah Level</Button>}
                              </div>
                              <div className="space-y-4">
                                 {principalTiers.map((t, idx) => (
                                    <div key={idx} className="p-6 border-2 rounded-2xl bg-white shadow-md hover:border-slate-300 transition-all space-y-4 relative">
                                       <div className="flex items-center justify-between border-b pb-4">
                                          <div className="flex items-center gap-3">
                                             <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm">#{t.urutanTier}</div>
                                             <div className="flex flex-col">
                                                <Label className="text-[10px] font-black uppercase text-slate-400">Min Target ({newPrincipal.basisType === 'qty' ? 'Qty' : 'Rp'})</Label>
                                                <Input type="text" className="h-10 w-48 rounded-lg font-black text-slate-800 text-lg border-none focus-visible:ring-0 p-0" value={toIDR(t.minValue)} onChange={e => { const n = [...principalTiers]; n[idx].minValue = fromIDR(e.target.value); setPrincipalTiers(n); }} disabled={viewOnly} />
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                             <Label className="font-black uppercase text-xs text-slate-400">Jenis Reward:</Label>
                                             <Select disabled={viewOnly} value={t.rewardPerusahaanType || t.rewardType} onValueChange={v => { const n = [...principalTiers]; n[idx].rewardPerusahaanType = v; n[idx].rewardPrincipalType = v; n[idx].rewardType = v; setPrincipalTiers(n); }}>
                                                <SelectTrigger className="w-36 h-10 rounded-lg font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                   <SelectItem value="uang_tunai">Uang Tunai (Rp)</SelectItem>
                                                   <SelectItem value="percent">Persentase (%)</SelectItem>
                                                   <SelectItem value="barang">Barang / Wisata</SelectItem>
                                                </SelectContent>
                                             </Select>
                                             {!viewOnly && principalTiers.length > 1 && <Button variant="ghost" className="text-red-500 rounded-full h-10 w-10 p-0 hover:bg-red-50" onClick={() => setPrincipalTiers(principalTiers.filter((_, i) => i !== idx))}><Trash2 className="h-5 w-5"/></Button>}
                                          </div>
                                       </div>

                                       <div className="grid grid-cols-2 gap-8 pt-2">
                                          {/* REWARD PERUSAHAAN */}
                                          <div className="space-y-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                                             <h5 className="text-[10px] font-black text-blue-700 uppercase tracking-tighter">Reward Unit/Perusahaan</h5>
                                             {t.rewardPerusahaanType === 'uang_tunai' ? (
                                                <div className="space-y-2">
                                                   <Label className="text-xs font-bold text-slate-500">Nilai Tunai (Rp)</Label>
                                                   <Input type="text" className="h-10 rounded-lg font-black text-blue-600 bg-white" value={toIDR(t.rewardPerusahaanValue)} onChange={e => { const n = [...principalTiers]; n[idx].rewardPerusahaanValue = fromIDR(e.target.value); setPrincipalTiers(n); }} disabled={viewOnly} />
                                                </div>
                                             ) : t.rewardPerusahaanType === 'percent' ? (
                                                <div className="space-y-2">
                                                   <Label className="text-xs font-bold text-slate-500">Persentase (%)</Label>
                                                   <Input type="number" step="0.01" className="h-10 rounded-lg font-black text-blue-600 bg-white" value={t.rewardPerusahaanPercent} onChange={e => { const n = [...principalTiers]; n[idx].rewardPerusahaanPercent = parseFloat(e.target.value); setPrincipalTiers(n); }} disabled={viewOnly} />
                                                </div>
                                             ) : (
                                                <div className="space-y-2">
                                                   <Label className="text-xs font-bold text-slate-500">Deskripsi Barang/Hadiah</Label>
                                                   <Input className="h-10 rounded-lg font-bold bg-white" value={t.rewardPerusahaanDesc} onChange={e => { const n = [...principalTiers]; n[idx].rewardPerusahaanDesc = e.target.value; setPrincipalTiers(n); }} placeholder="Contoh: Logam Mulia 1gr" disabled={viewOnly} />
                                                </div>
                                             )}
                                          </div>

                                          {/* REWARD PRINCIPAL */}
                                          <div className="space-y-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                             <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">Reward Principal</h5>
                                             {t.rewardPrincipalType === 'uang_tunai' ? (
                                                <div className="space-y-2">
                                                   <Label className="text-xs font-bold text-slate-500">Nilai Tunai (Rp)</Label>
                                                   <Input type="text" className="h-10 rounded-lg font-black text-emerald-600 bg-white" value={toIDR(t.rewardPrincipalValue)} onChange={e => { const n = [...principalTiers]; n[idx].rewardPrincipalValue = fromIDR(e.target.value); setPrincipalTiers(n); }} disabled={viewOnly} />
                                                </div>
                                             ) : t.rewardPrincipalType === 'percent' ? (
                                                <div className="space-y-2">
                                                   <Label className="text-xs font-bold text-slate-500">Persentase (%)</Label>
                                                   <Input type="number" step="0.01" className="h-10 rounded-lg font-black text-emerald-600 bg-white" value={t.rewardPrincipalPercent} onChange={e => { const n = [...principalTiers]; n[idx].rewardPrincipalPercent = parseFloat(e.target.value); setPrincipalTiers(n); }} disabled={viewOnly} />
                                                </div>
                                             ) : (
                                                <div className="space-y-2">
                                                   <Label className="text-xs font-bold text-slate-500">Deskripsi Hadiah (Principal)</Label>
                                                   <Input className="h-10 rounded-lg font-bold bg-white" value={t.rewardPrincipalDesc} onChange={e => { const n = [...principalTiers]; n[idx].rewardPrincipalDesc = e.target.value; setPrincipalTiers(n); }} placeholder="Contoh: Tiket Liburan" disabled={viewOnly} />
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                        <DialogFooter className="bg-slate-50 p-6 rounded-b-3xl border-t gap-3">
                           <Button variant="outline" className="rounded-xl h-12 px-8 font-bold" onClick={() => setOpenPrincipal(false)}>{viewOnly ? "TUTUP" : "BATAL"}</Button>
                           {!viewOnly && (
                              <Button className="bg-slate-800 hover:bg-slate-900 rounded-xl h-12 px-12 font-black shadow-lg" 
                                                                             onClick={() => {
                                          const mappedTiers = principalTiers.map(t => ({
                                             ...t,
                                             minValue: String(t.minValue),
                                             rewardPerusahaanValue: String(t.rewardPerusahaanValue || 0),
                                             rewardPrincipalValue: String(t.rewardPrincipalValue || 0),
                                             rewardPerusahaanPercent: String(t.rewardPerusahaanPercent || 0),
                                             rewardPrincipalPercent: String(t.rewardPrincipalPercent || 0)
                                          }));
                                          mutPrincipalProgram.mutate({...newPrincipal, tiers: mappedTiers});
                                       }} 
                                      disabled={mutPrincipalProgram.isPending}>
                                 {mutPrincipalProgram.isPending ? <Loader2 className="animate-spin" /> : editingPrincipalId ? "UPDATE PROGRAM" : "SIMPAN PROGRAM"}
                              </Button>
                           )}
                        </DialogFooter>
                      </DialogContent>
                   </Dialog>
                </CardHeader>
                <StatusFilterBar />
                <CardContent className="p-0">
                   {loadPrincipalProgram ? <div className="p-20 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-slate-600" /></div> : (
                     <Table>
                        <TableHeader className="bg-slate-50 font-black uppercase text-[10px] tracking-widest text-slate-500">
                           <TableRow>
                             <TableHead className="pl-8">Nama Program</TableHead>
                             <TableHead>Principal</TableHead>
                             <TableHead>Merek</TableHead>
                             <TableHead>Basis</TableHead>
                             <TableHead>Periode</TableHead>
                             <TableHead>Tier</TableHead>
                             <TableHead>Status</TableHead>
                             <TableHead className="text-right pr-8">Aksi</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByStatus(principalPrograms)?.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-20 text-slate-400">Belum ada program principal.</TableCell></TableRow>}
                          {filterByStatus(principalPrograms)?.map(p => (
                             <TableRow key={p.id} className={`hover:bg-slate-50 transition-colors group ${p.status === 'nonaktif' ? 'opacity-60' : ''}`}>
                                <TableCell className="pl-8">
                                  <div className="font-bold text-slate-700">{p.nama}</div>
                                  {p.status === 'nonaktif' && p.tanggalNonaktif && (
                                    <div className="text-[10px] text-red-400 font-medium mt-0.5">Dinonaktifkan {format(new Date(p.tanggalNonaktif), "dd MMM yyyy HH:mm", { locale: idLocale })}</div>
                                  )}
                                </TableCell>
                                <TableCell><div className="font-medium text-slate-600">{p.principal?.nama || "Unknown"}</div></TableCell>
                                <TableCell><Badge variant="outline" className="bg-white text-slate-600 font-bold">{p.brandCode || "SEMUA"}</Badge></TableCell>
                                <TableCell className="capitalize text-xs font-bold text-slate-500">{p.basisType}</TableCell>
                                <TableCell className="whitespace-nowrap font-bold text-slate-600 text-xs">
                                   {format(new Date(p.startDate), "dd/MM/yyyy")} - {format(new Date(p.endDate || p.startDate), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell><Badge variant="secondary" className="bg-slate-100 text-slate-600">{p.tiers?.length || 0} Level</Badge></TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Switch 
                                       checked={p.status === 'aktif'} 
                                       onCheckedChange={() => handleToggle('principal', p.id, p.nama, p.status)} 
                                    />
                                    <Badge variant={p.status === 'aktif' ? 'default' : 'destructive'} className={p.status === 'aktif' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}>{p.status.toUpperCase()}</Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleEditPrincipal(p, true)}><Eye className="h-4 w-4"/></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => handleEditPrincipal(p)}><Edit className="h-4 w-4"/></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => { if(window.confirm("Hapus program principal ini?")) mutDeletePrincipalProgram.mutate(p.id); }}><Trash2 className="h-4 w-4"/></Button>
                                   </div>
                                </TableCell>
                             </TableRow>
                          ))}
                        </TableBody>
                     </Table>
                   )}
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      {/* GLOBAL CONFIRMATION DIALOG */}
      <AlertDialog open={confirmToggle.open} onOpenChange={(v) => setConfirmToggle(prev => ({ ...prev, open: v }))}>
        <AlertDialogContent className="rounded-3xl border-2 border-red-100 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-red-600 flex items-center gap-2">
              <Trash2 className="h-6 w-6" /> KONFIRMASI NONAKTIF
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium py-2">
              Apakah yakin menonaktifkan promo <span className="font-black text-slate-800">[{confirmToggle.name}]</span>? 
              <br/><br/>
              <span className="bg-red-50 p-2 rounded-lg text-red-700 block border border-red-100">
                Promo ini akan otomatis <span className="font-bold underline">TIDAK BERLAKU</span> untuk semua pelanggan yang terdaftar.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 mt-4 rounded-b-3xl flex gap-2">
            <AlertDialogCancel className="rounded-xl font-bold flex-1">BATAL</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 rounded-xl font-black flex-1 text-white border-none"
              onClick={() => {
                mutToggleStatus.mutate({ 
                  type: confirmToggle.type, 
                  id: confirmToggle.id, 
                  status: confirmToggle.targetStatus 
                });
                setConfirmToggle(prev => ({ ...prev, open: false }));
              }}
            >
              YA, NONAKTIFKAN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
