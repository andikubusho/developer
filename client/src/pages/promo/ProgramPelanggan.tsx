import { useState, useMemo } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { CustomerSearchSelect } from "@/components/promo/CustomerSearchSelect";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, Search, Trash2, Loader2, 
  Target, Award, Package, User, Building2, Calendar, ClipboardList, Info, Star, Scissors,
  TrendingUp, RefreshCw, Trophy, ArrowRight, ArrowLeft, CheckCircle2, History, Edit
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useBranch } from "@/hooks/use-branch";
import { useCustomers } from "@/hooks/use-customers";
import { usePermissions } from "@/hooks/use-permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";


type ProgramType = 'paket' | 'cashback' | 'cutting' | 'point';

export default function ProgramPelanggan() {
  const { toast } = useToast();
  const { selectedBranchId } = useBranch();
  const { can } = usePermissions();
  const { data: customers = [], isLoading: loadCust } = useCustomers();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("SEMUA");
  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState<ProgramType>('paket');
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    referensiId: "",
    brandCode: "", // Added brandCode to formData
  });

  // Fetch Brands for dropdown
  const { data: brands = [] } = useQuery<any[]>({
    queryKey: ["/api/promo/brands", selectedBranchId],
    queryFn: async () => {
      const res = await fetch(`/api/promo/brands?branchId=${selectedBranchId}`);
      if (!res.ok) throw new Error("Gagal mengambil merek");
      return res.json();
    },
    enabled: !!selectedBranchId
  });

  // Fetch Pelanggan Programs (Enrollment)
  const { data: myPrograms = [], isLoading: loadMyProgs } = useQuery<any[]>({
    queryKey: ["/api/pelanggan-program", { pelangganId: selectedCustomerId, branchId: selectedBranchId }],
    queryFn: async () => {
      const res = await fetch(`/api/pelanggan-program?pelangganId=${selectedCustomerId}&branchId=${selectedBranchId}`);
      if (!res.ok) throw new Error("Gagal mengambil program");
      return res.json();
    },
    enabled: !!selectedCustomerId
  });

  // Fetch Summary Recap
  const { data: recap, isLoading: loadRecap, refetch: refetchRecap } = useQuery<any>({
    queryKey: ["/api/pelanggan-program/recap", { pelangganId: selectedCustomerId, branchId: selectedBranchId, brandCode: selectedBrand }],
    queryFn: async () => {
      const res = await fetch(`/api/pelanggan-program/recap/${selectedCustomerId}?branchId=${selectedBranchId}&brandCode=${selectedBrand}`);
      if (!res.ok) throw new Error("Gagal mengambil rekap program");
      return res.json();
    },
    enabled: !!selectedCustomerId
  });

  const { data: globalSummary = [], isLoading: loadGlobalSummary } = useQuery<any[]>({
    queryKey: ["/api/pelanggan-program/global-summary", { branchId: selectedBranchId }],
    queryFn: async () => {
      const res = await fetch(`/api/pelanggan-program/global-summary?branchId=${selectedBranchId}`);
      if (!res.ok) throw new Error("Gagal mengambil ringkasan global");
      return res.json();
    },
    enabled: !!selectedBranchId
  });

  // Principal Program Registrations
  const { data: principalRegistrations = [], isLoading: loadPrincipalRegs } = useQuery<any[]>({
    queryKey: ["/api/pelanggan-program-principal", { branchId: selectedBranchId, pelangganId: selectedCustomerId }],
    queryFn: async () => {
      const url = selectedCustomerId 
        ? `/api/pelanggan-program-principal?pelangganId=${selectedCustomerId}`
        : `/api/pelanggan-program-principal?branchId=${selectedBranchId}`;
      const res = await apiRequest("GET", url);
      return await res.json();
    },
    enabled: !!selectedCustomerId || !!selectedBranchId
  });

  // Master Principal Programs
  const { data: principalProgramsMaster = [] } = useQuery<any[]>({
    queryKey: ["/api/promo/masters/principal-program", selectedBranchId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/promo/masters/principal-program?branchId=${selectedBranchId}`);
      return await res.json();
    },
    enabled: !!selectedBranchId
  });


  // Master Data Fetching
  const { data: masters_paket = [] } = useQuery<any[]>({
    queryKey: ["/api/promo/masters/paket", selectedBranchId],
    queryFn: async () => {
      const res = await fetch(`/api/promo/masters/paket?branchId=${selectedBranchId}`);
      if (!res.ok) throw new Error("Gagal mengambil master paket");
      return res.json();
    },
    enabled: openModal && modalType === 'paket'
  });
  const { data: masters_cashback = [] } = useQuery<any[]>({
    queryKey: ["/api/promo/masters/cashback", selectedBranchId],
    queryFn: async () => {
      const res = await fetch(`/api/promo/masters/cashback?branchId=${selectedBranchId}`);
      if (!res.ok) throw new Error("Gagal mengambil master cashback");
      return res.json();
    },
    enabled: openModal && modalType === 'cashback'
  });
  const { data: masters_cutting = [] } = useQuery<any[]>({
    queryKey: ["/api/promo/masters/cutting", selectedBranchId],
    queryFn: async () => {
      const res = await fetch(`/api/promo/masters/cutting?branchId=${selectedBranchId}`);
      if (!res.ok) throw new Error("Gagal mengambil master cutting");
      return res.json();
    },
    enabled: openModal && modalType === 'cutting'
  });
  const { data: masters_point = [] } = useQuery<any[]>({
    queryKey: ["/api/promo/masters/point", selectedBranchId],
    queryFn: async () => {
      const res = await fetch(`/api/promo/masters/point?branchId=${selectedBranchId}`);
      if (!res.ok) throw new Error("Gagal mengambil master point");
      return res.json();
    },
    enabled: openModal && modalType === 'point'
  });

  const activeMaster = useMemo(() => {
    let base = [];
    if (modalType === 'paket') base = masters_paket;
    else if (modalType === 'cashback') base = masters_cashback;
    else if (modalType === 'cutting') base = masters_cutting;
    else if (modalType === 'point') base = masters_point;
    
    // Filter by selected brand in modal or main
    const brandToFilter = formData.brandCode || selectedBrand;
    if (brandToFilter && brandToFilter !== "SEMUA") {
      return base.filter(m => m.brandCode === brandToFilter || m.brandCode === "SEMUA" || !m.brandCode);
    }
    return base;
  }, [modalType, masters_paket, masters_cashback, masters_cutting, masters_point, formData.brandCode, selectedBrand]);

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("[ProgramPelanggan] Submitting payload:", data);
      const res = await apiRequest("POST", "/api/pelanggan-program", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Program berhasil didaftarkan" });
      queryClient.invalidateQueries({ queryKey: ["/api/pelanggan-program"] });
      setOpenModal(false);
      setFormData({
        brandCode: "",
        referensiId: "",
      });
    },
    onError: (err: Error) => {
      console.error("[ProgramPelanggan] Registration error:", err);
      // Try to parse the error message if it's from apiRequest (formatted as "status: message")
      let errorMessage = err.message;
      if (errorMessage.includes(": ")) {
        const parts = errorMessage.split(": ");
        if (parts.length > 1) {
          try {
            // Try to parse as JSON if it's a Zod error or detailed JSON
            const detail = JSON.parse(parts.slice(1).join(": "));
            errorMessage = detail.message || (detail.issues ? "Data tidak valid" : errorMessage);
          } catch {
            errorMessage = parts.slice(1).join(": ");
          }
        }
      }
      
      toast({ 
        title: "Gagal", 
        description: errorMessage || "Terjadi kesalahan saat mendaftar program", 
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/pelanggan-program/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pelanggan-program"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pelanggan-program/recap"] });
      toast({ title: "Dihapus", description: "Program telah dihapus dari pelanggan" });
    },
    onError: (err: Error) => {
      let errorMessage = err.message;
      if (errorMessage.includes(": ")) {
        errorMessage = errorMessage.split(": ").slice(1).join(": ");
      }
      toast({ 
        title: "Gagal Menghapus", 
        description: errorMessage || "Terjadi kesalahan saat menghapus program", 
        variant: "destructive" 
      });
    }
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number, [key: string]: any }) => {
      await apiRequest("PATCH", `/api/pelanggan-program/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pelanggan-program"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pelanggan-program/recap"] });
      toast({ title: "Berhasil Diperbarui", description: "Status program telah diubah" });
    }
  });

  const addPrincipalMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/pelanggan-program-principal", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Pelanggan berhasil didaftarkan ke Program Principal" });
      queryClient.invalidateQueries({ queryKey: ["/api/pelanggan-program-principal"] });
      setOpenPrincipalModal(false);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    }
  });

  const deletePrincipalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/pelanggan-program-principal/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pelanggan-program-principal"] });
      toast({ title: "Berhasil", description: "Pendaftaran Principal dihapus" });
    }
  });

  const [openPrincipalModal, setOpenPrincipalModal] = useState(false);
  const [newPrincipalProgId, setNewPrincipalProgId] = useState("");
  const [newPrincipalCustId, setNewPrincipalCustId] = useState("");

  const handleAddClick = (type: ProgramType) => {
    if (!selectedCustomerId) {
       toast({ title: "Pilih Pelanggan", description: "Silakan pilih pelanggan terlebih dahulu", variant: "destructive" });
       return;
    }
    setEditingProgramId(null);
    setModalType(type);
    setFormData({ referensiId: "", brandCode: selectedBrand }); // Default to current brand
    setOpenModal(true);
  };

  const handleEditClick = (p: any) => {
    setEditingProgramId(p.id);
    setModalType(p.jenisProgram as ProgramType);
    setFormData({ referensiId: p.referensiId?.toString() || "", brandCode: p.brandCode || "" });
    setOpenModal(true);
  };

  const currentCustomer = customers.find(c => c.id.toString() === selectedCustomerId);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] pb-12 overflow-x-hidden">
      {/* Premium Header Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 md:rounded-b-[4rem] rounded-b-[2rem] -z-10 shadow-2xl overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[100%] bg-indigo-500/10 rounded-full blur-[80px]" />
         <div className="absolute bottom-0 right-0 w-1/3 h-1/2 bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="pt-8 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-white mb-10">
           <div className="space-y-2">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                    <ClipboardList className="w-8 h-8 text-indigo-400" />
                 </div>
                 <div>
                    <h1 className="text-3xl font-black tracking-tight leading-none drop-shadow-md">Program Pelanggan</h1>
                    <p className="text-indigo-200/80 text-xs font-bold uppercase tracking-widest mt-1">Manajemen Partisipasi Promo Terpusat</p>
                 </div>
              </div>
           </div>

           <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
             {/* Dropdown Pilih Pelanggan */}
             <div className="w-full md:w-[350px]">
                <Card className="border-none shadow-2xl bg-white/10 backdrop-blur-xl border border-white/20">
                   <CardContent className="p-4 space-y-3">
                      <Label className="text-[10px] font-black uppercase text-indigo-200 tracking-wider">1. Pilih Pelanggan</Label>
                      <CustomerSearchSelect 
                         customers={customers || []}
                         value={selectedCustomerId}
                         onValueChange={setSelectedCustomerId}
                         placeholder="Cari nama atau kode..."
                         className="h-12 bg-white/90 border-none text-slate-800 font-bold rounded-xl shadow-inner"
                      />
                   </CardContent>
                </Card>
             </div>

           </div>
        </div>

        {!selectedCustomerId ? (
           <div className="space-y-10">
              <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-700">
                 <CardHeader className="p-8 pb-4">
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-sm"><TrendingUp className="w-6 h-6" /></div>
                          <div>
                             <CardTitle className="text-lg font-black tracking-tight uppercase">Daftar Pelanggan Terdaftar Program</CardTitle>
                             <CardDescription className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Ringkasan partisipasi program promo aktif</CardDescription>
                          </div>
                       </div>
                    </div>
                 </CardHeader>
                 <CardContent className="p-0">
                    {loadGlobalSummary ? (
                       <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Memuat Data...</span>
                       </div>
                    ) : globalSummary.length === 0 ? (
                       <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Belum ada pelanggan terdaftar pada program apapun</div>
                    ) : (
                       <div className="overflow-x-auto">
                          <Table>
                             <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-none">
                                   <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 pl-8">Pelanggan</TableHead>
                                   <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 text-center">Jumlah Program</TableHead>
                                   <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 text-right pr-8">Terakhir Diperbarui</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {globalSummary.map((s) => (
                                   <TableRow key={s.pelangganId} className="hover:bg-indigo-50/30 transition-colors border-slate-50 group cursor-pointer" onClick={() => setSelectedCustomerId(s.pelangganId.toString())}>
                                      <TableCell className="pl-8">
                                         <div className="flex flex-col">
                                            <span className="font-black text-slate-700 group-hover:text-indigo-600">{s.pelangganNama}</span>
                                            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-tighter">KODE: {s.pelangganKode}</span>
                                         </div>
                                      </TableCell>
                                      <TableCell className="text-center">
                                         <Badge className="bg-indigo-100 text-indigo-700 border-none rounded-lg font-black text-[11px] h-8 px-4 inline-flex items-center justify-center min-w-[3rem]">
                                            {s.programCount}
                                         </Badge>
                                      </TableCell>
                                      <TableCell className="text-right pr-8">
                                         <div className="flex flex-col items-end">
                                            <span className="text-xs font-bold text-slate-600">{format(new Date(s.lastUpdate), "dd/MM/yyyy")}</span>
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">UPDATE TERAKHIR</span>
                                         </div>
                                      </TableCell>
                                   </TableRow>
                                ))}
                             </TableBody>
                          </Table>
                       </div>
                    )}
                 </CardContent>
              </Card>
           </div>
        ) : (
          <Tabs defaultValue="settings" className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
             {/* Info Sidebar */}
             <div className="md:col-span-4 space-y-6">
                <Button 
                   onClick={() => setSelectedCustomerId("")} 
                   variant="ghost" 
                   className="w-full justify-start h-12 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-widest rounded-[1.5rem] shadow-sm border border-white/10 mb-2 transition-all active:scale-95"
                >
                   <ArrowLeft className="w-4 h-4 mr-3" />
                   Kembali ke Daftar Global
                </Button>
                <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden group">
                   <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white">
                      <div className="flex items-center gap-2 mb-4">
                         <div className="p-2 bg-white/20 rounded-lg"><Building2 className="w-4 h-4" /></div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Profil Pelanggan</span>
                      </div>
                      <h3 className="text-2xl font-black tracking-tight leading-none mb-1">{currentCustomer?.name}</h3>
                      <p className="font-mono text-xs text-indigo-200 font-bold">Kode: {currentCustomer?.code}</p>
                   </div>
                   <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-slate-50">
                         <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-slate-300" />
                            <span className="text-xs font-bold text-slate-500">Tipe Harga</span>
                         </div>
                         <Badge variant="outline" className="rounded-lg bg-indigo-50 text-indigo-700 border-none font-black text-[10px] uppercase">
                            {currentCustomer?.priceType}
                         </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2">
                         <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-slate-300" />
                            <span className="text-xs font-bold text-slate-500">Total Program</span>
                         </div>
                         <span className="text-lg font-black text-slate-800">
                            {myPrograms.filter((p: any) => p.status === 'aktif').length + principalRegistrations.filter((r: any) => String(r.pelangganId) === String(selectedCustomerId)).length}
                         </span>
                      </div>
                   </CardContent>
                </Card>

                <TabsList className="flex flex-col h-auto bg-white/50 backdrop-blur-md p-2 rounded-[2rem] border border-white/20 shadow-xl space-y-1">
                   <TabsTrigger value="settings" className="w-full justify-start gap-3 h-14 rounded-2xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-lg transition-all">
                      <ClipboardList className="w-4 h-4" />
                      Pengaturan Program
                   </TabsTrigger>
                   <TabsTrigger value="recap" className="w-full justify-start gap-3 h-14 rounded-2xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white shadow-none data-[state=active]:shadow-lg transition-all">
                      <TrendingUp className="w-4 h-4" />
                      Rekap Progress
                   </TabsTrigger>
                </TabsList>

                {/* Legend / Quick Help */}
                <Card className="border-none shadow-sm bg-slate-900 border border-slate-800 rounded-[2rem] p-6 text-white space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Kapasitas Program</h4>
                   <p className="text-xs text-slate-400 leading-relaxed">Pelanggan dapat mengikuti berbagai program secara bersamaan, sistem akan otomatis menghitung keuntungan berdasarkan jenis program yang aktif.</p>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
                         <Package className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                         <span className="text-[9px] font-black uppercase tracking-tighter block">PAKET</span>
                      </div>
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
                         <Award className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                         <span className="text-[9px] font-black uppercase tracking-tighter block">CASHBACK</span>
                      </div>
                   </div>
                </Card>
             </div>

             {/* Program List Main Area */}
             <div className="md:col-span-8">
                <TabsContent value="settings" className="space-y-6 mt-0">
                  {(['paket', 'cashback', 'cutting', 'point'] as ProgramType[]).map(type => {
                     const progs = myPrograms.filter(p => p.jenisProgram === type);
                     const typeConfig = {
                        paket: { label: 'PROGRAM PAKET', icon: Package, color: 'from-amber-500 to-orange-600', text: 'text-amber-600', bg: 'bg-amber-50', addLabel: 'TAMBAH PAKET' },
                        cashback: { label: 'PROGRAM CASHBACK', icon: Award, color: 'from-blue-500 to-indigo-600', text: 'text-blue-600', bg: 'bg-blue-50', addLabel: 'TAMBAH CASHBACK' },
                        cutting: { label: 'PROGRAM CUTTING', icon: Scissors, color: 'from-fuchsia-500 to-purple-600', text: 'text-fuchsia-600', bg: 'bg-fuchsia-50', addLabel: 'TAMBAH LABEL' },
                        point: { label: 'PROGRAM POINT', icon: Star, color: 'from-yellow-400 to-orange-400', text: 'text-yellow-600', bg: 'bg-yellow-50', addLabel: 'TAMBAH POINT' }
                     }[type];

                     return (
                        <Card key={type} className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden mb-6 last:mb-0">
                           <div className="px-6 py-4 flex justify-between items-center border-b border-slate-50">
                              <div className="flex items-center gap-3">
                                 <div className={`p-2 rounded-xl bg-gradient-to-tr ${typeConfig.color} shadow-lg shadow-indigo-100`}>
                                    <typeConfig.icon className="w-4 h-4 text-white" />
                                 </div>
                                 <h4 className="text-xs font-black tracking-widest text-slate-400 uppercase">{typeConfig.label}</h4>
                              </div>
                              <Button 
                                 onClick={() => handleAddClick(type)}
                                 size="sm" 
                                 className={`rounded-xl font-black text-[10px] tracking-wider h-9 gap-2 shadow-lg shadow-slate-100 border-none transition-all active:scale-95 bg-slate-900 hover:bg-slate-800 text-white`}
                              >
                                 <PlusCircle className="w-4 h-4" /> {typeConfig.addLabel}
                              </Button>
                           </div>
                           <CardContent className="p-0">
                              {progs.length === 0 ? (
                                 <div className="py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Belum ada program {type} aktif</div>
                              ) : (
                                 <Table>
                                    <TableHeader className="bg-slate-50/50">
                                       <TableRow className="border-none">
                                          <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 pl-6">ID Program</TableHead>
                                          <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10">Tgl Mulai</TableHead>
                                          <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10">Status</TableHead>
                                          <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 text-right pr-6">Aksi</TableHead>
                                       </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                       {progs.map(p => (
                                          <TableRow key={p.id} className="hover:bg-slate-50/50 group border-slate-50">
                                             <TableCell className="pl-6">
                                                <div className="flex flex-col gap-1 mt-1">
                                                   <span className="font-black text-slate-700 leading-tight block">{p.programName || `REF: ${p.referensiId}`}</span>
                                                   <div className="flex items-center gap-2">
                                                      <Badge className="bg-indigo-100/80 text-indigo-700 border-none rounded-md font-black text-[9px] uppercase tracking-tighter shadow-none px-1.5 py-0 h-4">{p.brandCode || "UMUM"}</Badge>
                                                      <span className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase font-bold">#PRG-{p.id}</span>
                                                   </div>
                                                </div>
                                             </TableCell>
                                             <TableCell>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                   <Calendar className="w-3 h-3" />
                                                   {format(new Date(p.tglMulai), "dd/MM/yyyy")}
                                                </div>
                                             </TableCell>
                                             <TableCell>
                                                <Badge className={`${p.status === 'aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} hover:bg-emerald-100 border-none rounded-lg font-black text-[9px] uppercase tracking-tighter`}>
                                                   {p.status}
                                                </Badge>
                                             </TableCell>
                                             <TableCell className="text-right pr-6">
                                                <div className="flex justify-end gap-1">
                                                   <Button 
                                                     variant="ghost" 
                                                     size="icon" 
                                                     className="h-8 w-8 text-slate-500 hover:text-indigo-600 transition-colors"
                                                     title="Ubah Status"
                                                     onClick={() => {
                                                        const newStatus = p.status === 'aktif' ? 'nonaktif' : 'aktif';
                                                        editMutation.mutate({ id: p.id, status: newStatus });
                                                     }}
                                                   >
                                                      <RefreshCw className="w-4 h-4" />
                                                   </Button>
                                                   <Button 
                                                     variant="ghost" 
                                                     size="icon" 
                                                     className="h-8 w-8 text-slate-500 hover:text-amber-500 transition-colors"
                                                     title="Edit Program"
                                                     onClick={() => handleEditClick(p)}
                                                   >
                                                      <Edit className="w-4 h-4" />
                                                   </Button>
                                                   <Button 
                                                     variant="ghost" 
                                                     size="icon" 
                                                     className="h-8 w-8 text-slate-500 hover:text-rose-500 transition-colors"
                                                     onClick={() => {
                                                        if (window.confirm(`Hapus program: ${p.programName}?`)) {
                                                           deleteMutation.mutate(p.id);
                                                        }
                                                     }}
                                                   >
                                                      <Trash2 className="w-4 h-4" />
                                                   </Button>
                                                </div>
                                             </TableCell>
                                          </TableRow>
                                       ))}
                                    </TableBody>
                                 </Table>
                              )}
                           </CardContent>
                        </Card>
                     );
                  })}

                  {/* PROGRAM PRINCIPAL SECTION (Integrated into Settings) */}
                  <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
                     <CardHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-slate-50">
                        <div className="flex items-center gap-3 text-slate-800">
                           <div className="p-2 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 shadow-lg">
                              <Building2 className="w-4 h-4 text-white" />
                           </div>
                           <h4 className="text-xs font-black tracking-widest text-slate-400 uppercase">PROGRAM PRINCIPAL</h4>
                        </div>
                        <Dialog open={openPrincipalModal} onOpenChange={setOpenPrincipalModal}>
                           <DialogTrigger asChild>
                             <Button 
                               size="sm"
                               className="rounded-xl font-black text-[10px] tracking-wider h-9 gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
                               onClick={() => {
                                 setNewPrincipalCustId(selectedCustomerId);
                                 setNewPrincipalProgId("");
                               }}
                             >
                               <PlusCircle className="w-4 h-4" /> TAMBAH PRINCIPAL
                             </Button>
                           </DialogTrigger>
                           <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                              <div className="bg-slate-900 p-8 text-white">
                                 <DialogHeader>
                                    <DialogTitle className="text-2xl font-black uppercase">Daftarkan Program Principal</DialogTitle>
                                    <DialogDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Pilih program utama dari merek principal</DialogDescription>
                                 </DialogHeader>
                              </div>
                              <div className="p-8 space-y-6 bg-white">
                                 <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">1. Pilih Program Principal</Label>
                                    <Select value={newPrincipalProgId} onValueChange={setNewPrincipalProgId}>
                                       <SelectTrigger className="h-14 bg-slate-50 border-none font-bold rounded-2xl shadow-inner">
                                          <SelectValue placeholder="--- PILIH PROGRAM ---" />
                                       </SelectTrigger>
                                       <SelectContent className="rounded-2xl shadow-2xl border-none">
                                          {principalProgramsMaster.map(p => (
                                             <SelectItem key={p.id} value={p.id.toString()} className="hover:bg-indigo-50 focus:bg-indigo-50 transition-colors py-4">
                                               <div className="flex flex-col gap-0.5">
                                                 <span className="font-black text-slate-800 text-sm">{p.nama || 'NAMA PROGRAM BELUM DISET'}</span>
                                                 <div className="flex items-center gap-2">
                                                   <Badge className="bg-slate-100 text-slate-500 border-none rounded-md px-1.5 py-0 h-4 font-black text-[9px] uppercase tracking-tighter">
                                                     {p.principal?.nama || 'N/A'}
                                                   </Badge>
                                                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight italic">
                                                     Brand: {p.brandCode || 'N/A'}
                                                   </span>
                                                 </div>
                                               </div>
                                             </SelectItem>
                                          ))}
                                       </SelectContent>
                                    </Select>
                                 </div>
                                 <Button 
                                   className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-lg"
                                   disabled={!newPrincipalProgId || addPrincipalMutation.isPending}
                                   onClick={() => {
                                      if (!selectedBranchId) {
                                         toast({ title: "Cabang Belum Dipilih", description: "Silakan pilih cabang terlebih dahulu", variant: "destructive" });
                                         return;
                                      }
                                      addPrincipalMutation.mutate({ 
                                         pelangganId: Number(selectedCustomerId), 
                                         programPrincipalId: Number(newPrincipalProgId),
                                         branchId: Number(selectedBranchId)
                                      });
                                   }}
                                 >
                                   {addPrincipalMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                   Konfirmasi Pendaftaran
                                 </Button>
                              </div>
                           </DialogContent>
                        </Dialog>
                     </CardHeader>
                     <CardContent className="p-0">
                        {loadPrincipalRegs ? (
                          <div className="py-20 flex flex-col items-center justify-center gap-3">
                             <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                             <span className="text-[10px] font-black text-slate-400 uppercase">Memuat Pendaftaran...</span>
                          </div>
                        ) : principalRegistrations.filter(r => String(r.pelangganId) === selectedCustomerId).length === 0 ? (
                          <div className="py-12 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Belum ada pendaftaran principal untuk pelanggan ini</div>
                        ) : (
                          <Table>
                             <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-none">
                                   <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 pl-6">Program</TableHead>
                                   <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 text-center">Principal</TableHead>
                                   <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 text-center">Merek</TableHead>
                                   <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10">Status</TableHead>
                                   <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 pr-6 text-right">Aksi</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {principalRegistrations.filter(r => r.pelangganId != null && String(r.pelangganId) === String(selectedCustomerId)).map(r => (
                                   <TableRow key={r.id} className="hover:bg-indigo-50/20 border-slate-50 group">
                                      <TableCell className="pl-6">
                                         <div className="flex flex-col">
                                            <span className="font-black text-slate-700 group-hover:text-indigo-600">{r.program?.nama}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">PRG-ID: {r.programPrincipalId}</span>
                                         </div>
                                      </TableCell>
                                      <TableCell className="text-center">
                                         <span className="font-black text-slate-600 text-xs">{r.program?.principal?.nama || 'N/A'}</span>
                                      </TableCell>
                                      <TableCell className="text-center">
                                         <Badge className="bg-slate-100 text-slate-600 border-none rounded-lg font-black text-[9px] uppercase">{r.program?.brandCode || 'N/A'}</Badge>
                                      </TableCell>
                                      <TableCell>
                                         <Badge className="bg-emerald-100 text-emerald-700 border-none rounded-lg font-black text-[9px] uppercase tracking-tighter">AKTIF</Badge>
                                      </TableCell>
                                      <TableCell className="pr-6 text-right">
                                         <Button 
                                           variant="ghost" 
                                           size="icon" 
                                           className="text-slate-400 hover:text-red-500 transition-colors"
                                           onClick={() => {
                                             if (window.confirm("Hapus pendaftaran program principal ini?")) {
                                               deletePrincipalMutation.mutate(r.id);
                                             }
                                           }}
                                         >
                                           <Trash2 className="w-5 h-5" />
                                         </Button>
                                      </TableCell>
                                   </TableRow>
                                ))}
                             </TableBody>
                          </Table>
                        )}
                     </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recap" className="space-y-6 mt-0">
                   {loadRecap ? (
                      <Card className="border-none py-24 flex flex-col items-center justify-center space-y-4 rounded-[2rem] bg-white">
                         <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                         <p className="text-xs font-black uppercase tracking-widest text-slate-400">Menyusun Rekapitulasi...</p>
                      </Card>
                   ) : (
                      <>
                        {/* Point & Cashback Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {/* Points Card */}
                           <Card className="border-none shadow-premium bg-gradient-to-br from-indigo-600 to-indigo-900 text-white rounded-[2rem] overflow-hidden group">
                              <CardContent className="p-8 space-y-6">
                                 <div className="flex justify-between items-start">
                                    <div className="p-3 bg-white/10 rounded-2xl"><Star className="w-6 h-6 text-yellow-400" /></div>
                                    <Badge className="bg-white/10 text-white border-none rounded-lg font-black text-[9px] uppercase tracking-tighter">LOYAITY POINTS</Badge>
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Saldo Poin Saat Ini</p>
                                    <h3 className="text-5xl font-black tracking-tighter">{Number(recap?.points?.saldoPoin || 0).toLocaleString()}</h3>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                    <div>
                                       <p className="text-[9px] font-black uppercase text-indigo-300 opacity-70">Total Didapat</p>
                                       <p className="text-sm font-black">{Number(recap?.points?.totalDiperoleh || 0).toLocaleString()}</p>
                                    </div>
                                    <div>
                                       <p className="text-[9px] font-black uppercase text-indigo-300 opacity-70">Total Ditukar</p>
                                       <p className="text-sm font-black">{Number(recap?.points?.totalDitukar || 0).toLocaleString()}</p>
                                    </div>
                                 </div>
                              </CardContent>
                           </Card>

                           {/* Cashback Card */}
                           <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden border border-slate-100">
                              <CardHeader className="p-8 pb-4">
                                 <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                       <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Award className="w-6 h-6" /></div>
                                       <CardTitle className="text-lg font-black tracking-tight">CASHBACK</CardTitle>
                                    </div>
                                 </div>
                              </CardHeader>
                              <CardContent className="p-8 pt-0 space-y-4">
                                 {recap?.cashback?.length === 0 ? (
                                    <div className="py-8 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Belum ada perolehan cashback</div>
                                 ) : (
                                    recap?.cashback?.map((cb: any, idx: number) => (
                                       <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-blue-50 transition-colors">
                                          <div>
                                             <p className="text-xs font-black text-slate-700 group-hover:text-blue-700">{cb.nama}</p>
                                             <p className="text-[10px] text-slate-400 font-bold uppercase">{cb.countTransactions} Transaksi</p>
                                          </div>
                                          <div className="text-right">
                                             <p className="text-sm font-black text-slate-800">Rp {Number(cb.totalNilai || 0).toLocaleString()}</p>
                                          </div>
                                       </div>
                                    ))
                                 )}
                              </CardContent>
                           </Card>
                        </div>

                        {/* Cutting Progress */}
                        <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
                           <CardHeader className="p-8 pb-4 border-b border-slate-50">
                              <div className="flex items-center gap-3">
                                 <div className="p-3 bg-fuchsia-50 rounded-2xl text-fuchsia-600"><Scissors className="w-6 h-6" /></div>
                                 <CardTitle className="text-lg font-black tracking-tight uppercase tracking-widest">Progress Cutting Label</CardTitle>
                              </div>
                           </CardHeader>
                           <CardContent className="p-0">
                              {recap?.cutting?.length === 0 ? (
                                 <div className="py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Belum ada progress label</div>
                              ) : (
                                 <Table>
                                    <TableHeader className="bg-slate-50/50">
                                       <TableRow className="border-none">
                                          <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 pl-8">Program</TableHead>
                                          <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 text-center">Total Label</TableHead>
                                          <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 text-center">Nilai / Label</TableHead>
                                          <TableHead className="font-black text-[10px] text-slate-400 uppercase h-10 text-right pr-8">Total Nilai</TableHead>
                                       </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                       {recap?.cutting?.map((c: any) => (
                                          <TableRow key={c.id} className="hover:bg-fuchsia-50/30 transition-colors border-slate-50">
                                             <TableCell className="pl-8 font-black text-slate-700">{c.nama}</TableCell>
                                             <TableCell className="text-center font-bold text-slate-600">{c.totalLabel} Pcs</TableCell>
                                             <TableCell className="text-center font-mono text-xs text-slate-400 whitespace-nowrap">Rp {Number(c.nilaiPerLabel).toLocaleString()}</TableCell>
                                             <TableCell className="text-right pr-8">
                                                <div className="flex flex-col items-end">
                                                   <span className="font-black text-slate-800">Rp {Number(c.totalNilai).toLocaleString()}</span>
                                                   <Badge className={`${c.statusCair === 'sudah' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} border-none rounded-lg font-black text-[8px] uppercase h-4 px-1`}>
                                                      {c.statusCair === 'sudah' ? 'SUDAH CAIR' : 'BELUM CAIR'}
                                                   </Badge>
                                                </div>
                                             </TableCell>
                                          </TableRow>
                                       ))}
                                    </TableBody>
                                 </Table>
                              )}
                           </CardContent>
                        </Card>

                        {/* Paket Progress - High Impact Visuals */}
                        <div className="space-y-6">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 shadow-sm"><Package className="w-6 h-6" /></div>
                                 <h2 className="text-xl font-black tracking-tight text-slate-800">PROGRESS PAKET</h2>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => refetchRecap()} disabled={loadRecap} className="font-bold text-xs gap-2 rounded-xl h-10">
                                <RefreshCw className={`w-3 h-3 ${loadRecap ? 'animate-spin' : ''}`} /> Refresh
                              </Button>
                           </div>

                           {recap?.pakets?.length === 0 ? (
                              <Card className="border-none py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px] rounded-[2rem] bg-white">Belum ada progress paket berjalan</Card>
                           ) : (
                              <div className="grid grid-cols-1 gap-6">
                                 {recap?.pakets?.map((p: any) => {
                                    const percent = Math.min(100, p.targetValue ? (p.progressValue / p.targetValue) * 100 : 100);
                                    
                                    return (
                                       <Card key={p.id} className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-300">
                                          <div className="p-8">
                                             <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                                                <div className="space-y-2">
                                                   <div className="flex items-center gap-2">
                                                      <Badge className="bg-amber-100 text-amber-700 border-none rounded-lg font-black text-[9px] uppercase tracking-tighter">PAKET AKTIF</Badge>
                                                      <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{p.periodeStart ? `${format(new Date(p.periodeStart), "dd/MM/yyyy")} - ${format(new Date(p.periodeEnd), "dd/MM/yyyy")}` : ""}</span>
                                                   </div>
                                                   <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{p.paket?.nama}</h3>
                                                   <p className="text-xs text-slate-400 font-bold">Basis Perhitungan: <span className="uppercase text-slate-600">{p.paket?.basisType}</span></p>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                   <div className="text-right">
                                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tier Saat Ini</p>
                                                      <div className="flex items-center justify-end gap-2">
                                                         {p.currentTier ? (
                                                            <div className="flex items-center gap-2">
                                                               <Trophy className="w-5 h-5 text-yellow-500" />
                                                               <span className="text-3xl font-black text-slate-800">#{p.currentTier.urutanTier}</span>
                                                            </div>
                                                         ) : (
                                                            <span className="text-3xl font-black text-slate-300 tracking-tighter uppercase italic">Belum Capai</span>
                                                         )}
                                                      </div>
                                                   </div>
                                                   <div className="h-12 w-[1px] bg-slate-100 hidden md:block" />
                                                   <div className="text-right min-w-[120px]">
                                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Capaian</p>
                                                      <span className="text-2xl font-black text-indigo-600">{p.progressValue?.toLocaleString()}</span>
                                                      <span className="text-xs text-slate-400 font-bold ml-1 uppercase">{p.paket?.basisType}</span>
                                                   </div>
                                                </div>
                                             </div>

                                             <div className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                   <div className="flex items-center gap-2">
                                                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Progress Ke Target Berikutnya</p>
                                                   </div>
                                                   <p className="text-[10px] font-black text-slate-700">
                                                      {p.targetValue ? `${percent.toFixed(1)}%` : "SUDAH TIER MAKSIMAL"}
                                                   </p>
                                                </div>
                                                <Progress value={percent} className="h-4 rounded-full bg-slate-100 shadow-inner overflow-hidden">
                                                   <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" style={{ width: `${percent}%` }} />
                                                </Progress>
                                                <div className="flex justify-between items-start pt-2">
                                                   <div className="text-[10px] font-black text-slate-400 uppercase italic">
                                                      Mulai: {p.paket?.basisType === 'qty' ? '0 Pcs' : 'Rp 0'}
                                                   </div>
                                                   {p.nextTier ? (
                                                      <div className="text-right">
                                                         <div className="flex items-center gap-1 justify-end text-amber-600 font-black text-[11px]">
                                                            <ArrowRight className="w-3 h-3" />
                                                            Kurang {(p.targetValue - p.progressValue).toLocaleString()} {p.paket?.basisType?.toUpperCase()}
                                                         </div>
                                                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Untuk Mencapai Tier #{p.nextTier.urutanTier}</p>
                                                      </div>
                                                   ) : (
                                                      <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px]">
                                                         <CheckCircle2 className="w-4 h-4" /> REWARD TERTINGGI TERCAPAI
                                                      </div>
                                                   )}
                                                </div>
                                             </div>

                                             {/* Reward info */}
                                             {p.currentTier && (
                                                <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                                   <div className="flex items-center gap-3">
                                                      <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm"><CheckCircle2 className="w-4 h-4" /></div>
                                                      <div>
                                                         <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Keuntungan Tier #{p.currentTier.urutanTier}</p>
                                                         <p className="text-xs font-bold text-slate-600">Reward: {p.currentTier.rewardDesc || 'N/A'}</p>
                                                      </div>
                                                   </div>
                                                   <Badge className="bg-emerald-600 text-white border-none rounded-lg font-black text-[9px] uppercase">TERCAPAI</Badge>
                                                </div>
                                             )}
                                          </div>
                                       </Card>
                                    );
                                 })}
                              </div>
                           )}
                        </div>
                      </>
                   )}
                </TabsContent>
             </div>
          </Tabs>

        )}
      </div>


      {/* Modal Tambah Program */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
         <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 text-white">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight uppercase">
                     {editingProgramId ? 'EDIT' : 'DAFTARKAN'} PROGRAM {modalType.toUpperCase()}
                  </DialogTitle>
                  <DialogDescription className="text-indigo-100 font-bold text-[10px] uppercase tracking-widest">
                     Lengkapi detail partisipasi promo pelanggan
                  </DialogDescription>
               </DialogHeader>
            </div>

            <div className="p-8 bg-white space-y-6">
               <div className="space-y-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">LANGKAH 1: PILIH MEREK (OPSIONAL)</Label>
                     <Select 
                        value={formData.brandCode} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, brandCode: v, referensiId: "" }))}
                     >
                        <SelectTrigger className="h-12 bg-slate-50 border-none font-bold rounded-xl shadow-inner">
                           <SelectValue placeholder="--- SEMUA MEREK ---" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                           <SelectItem value="SEMUA" className="font-bold">SEMUA MEREK</SelectItem>
                           {brands.map(b => (
                              <SelectItem key={b.name} value={b.name} className="font-bold uppercase">{b.name}</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">LANGKAH 2: PILIH PROGRAM {modalType.toUpperCase()}</Label>
                     <Select 
                        value={formData.referensiId} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, referensiId: v }))}
                     >
                        <SelectTrigger className="h-12 bg-slate-50 border-none font-bold rounded-xl shadow-inner">
                           <SelectValue placeholder={`--- PILIH MASTER ${modalType.toUpperCase()} ---`} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl max-h-[300px]">
                           {activeMaster.length === 0 ? (
                              <div className="p-4 text-center text-xs font-bold text-slate-400 italic">Tidak ada master {modalType} untuk merek ini</div>
                           ) : (
                              activeMaster.map(m => (
                                 <SelectItem key={m.id} value={m.id.toString()} className="font-bold py-3 border-b border-slate-50 last:border-none">
                                    <div className="flex flex-col">
                                       <span>{m.nama || m.namaProgram}</span>
                                       <span className="text-[10px] text-indigo-500 font-mono uppercase">#{m.id} | {m.brandCode || "UMUM"}</span>
                                    </div>
                                 </SelectItem>
                              ))
                           )}
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <DialogFooter className="pt-4">
                  <Button 
                     onClick={() => {
                        if (!formData.referensiId) {
                           toast({ title: "Pilih Program", description: "Silakan pilih master program terlebih dahulu", variant: "destructive" });
                           return;
                        }
                        const payload = {
                           pelangganId: parseInt(selectedCustomerId),
                           jenisProgram: modalType,
                           referensiId: parseInt(formData.referensiId),
                           branchId: selectedBranchId,
                           brandCode: formData.brandCode || "SEMUA"
                        };
                        
                        if (editingProgramId) {
                          editMutation.mutate({ id: editingProgramId, ...payload });
                        } else {
                          addMutation.mutate(payload);
                        }
                     }} 
                     disabled={addMutation.isPending || editMutation.isPending}
                     className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95"
                  >
                     {(addMutation.isPending || editMutation.isPending) ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingProgramId ? 'SIMPAN PERUBAHAN' : 'DAFTARKAN SEKARANG')}
                  </Button>
               </DialogFooter>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
