import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Branch, insertBranchSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Building2,
  Search,
  Loader2,
  ArrowLeft,
  RotateCcw,
  MapPin,
  ShieldCheck,
  Info,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

import { cn } from "@/lib/utils";

export default function BranchesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { can } = usePermissions();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm({
    resolver: zodResolver(insertBranchSchema),
    defaultValues: {
      name: "",
      usePpn: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; usePpn?: boolean }) => {
      const res = await apiRequest("POST", "/api/branches", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Berhasil", description: "Cabang berhasil ditambahkan" });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Gagal", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; usePpn?: boolean } }) => {
      const res = await apiRequest("PUT", `/api/branches/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Berhasil", description: "Cabang berhasil diperbarui" });
      setIsOpen(false);
      setEditingBranch(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Gagal", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Berhasil", description: "Cabang berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Gagal", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: { name: string; usePpn?: boolean }) => {
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const startEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsOpen(true);
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="relative min-h-[calc(100vh-5rem)] pb-12 overflow-x-hidden">
        {/* Super App Header: Orange/Rose Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] md:w-full h-[220px] md:h-[240px] bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600 md:rounded-b-[3rem] rounded-b-[20%] -z-10 shadow-2xl overflow-hidden text-white">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[100%] bg-white/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-20%] right-[-5%] w-[40%] h-[70%] bg-orange-300/10 rounded-full blur-[60px]" />
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
                   Master Cabang
                </h1>
                <p className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">
                   Manajemen Lokasi Operasional
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {(isAdmin || can("master_cabang", "input")) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-10 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-sm rounded-xl px-4 transition-all active:scale-95 w-[calc(50%-4px)] xs:w-auto"
                  onClick={() => setSearchTerm("")}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="font-bold whitespace-nowrap text-xs xs:text-sm">Reset</span>
                </Button>
              )}

              <div className="bg-white p-1 rounded-xl shadow-xl flex gap-1 w-full xs:w-auto mt-2 xs:mt-0">
                {(isAdmin || can("master_cabang", "input")) && (
                  <div className="flex-1 xs:flex-none">
                    <BranchDialog 
                      isOpen={isOpen} 
                      onOpenChange={setIsOpen} 
                      editingBranch={editingBranch} 
                      setEditingBranch={setEditingBranch}
                      onSubmit={onSubmit}
                      isPending={createMutation.isPending || updateMutation.isPending}
                      form={form}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search Card */}
          <div className="mt-8 mb-6">
               <Card className="border-none shadow-premium bg-white/95 backdrop-blur-md overflow-hidden rounded-2xl border border-white/20">
                  <CardContent className="p-4 flex items-center gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                        <Input 
                          placeholder="Cari cabang berdasarkan nama..." 
                          className="h-12 pl-12 bg-slate-50/50 border-slate-100 focus:ring-orange-500 rounded-xl font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium transition-all"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                  </CardContent>
               </Card>
          </div>

          {/* Table / List View */}
          <div className="hidden md:block bg-white rounded-xl shadow-premium border border-slate-100 overflow-hidden mb-8">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none">
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider h-14 pl-6">Nama Cabang</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider h-14">ID Internal</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider h-14">Pengaturan PPN</TableHead>
                  <TableHead className="text-right font-black text-slate-400 text-[10px] uppercase tracking-wider h-14 pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin" />
                        <span className="text-sm text-slate-400 font-bold tracking-widest uppercase">Memuat data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredBranches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                      Tidak ada cabang ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBranches.map((branch) => (
                    <TableRow key={branch.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                      <TableCell className="font-bold text-slate-800 py-4 pl-6">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black">
                               <Building2 className="w-5 h-5" />
                            </div>
                            {branch.name}
                         </div>
                      </TableCell>
                      <TableCell className="py-4">
                         <Badge variant="outline" className="bg-slate-50 border-slate-200 font-mono font-bold text-[10px] uppercase px-3 py-1 rounded-lg">
                            #{branch.id.toString().padStart(3, '0')}
                         </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                         {branch.usePpn ? (
                           <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-tighter">
                              <ShieldCheck className="w-3 h-3" />
                              Menggunakan PPN
                           </div>
                         ) : (
                           <div className="inline-flex items-center gap-2 bg-slate-50 text-slate-400 px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-tighter">
                              <Info className="w-3 h-3" />
                              Non-PPN
                           </div>
                         )}
                      </TableCell>
                      <TableCell className="text-right py-4 pr-6">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            {(isAdmin || can("master_cabang", "edit")) && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => startEdit(branch)}
                                className="h-10 w-10 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl active:scale-90 transition-all"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {(isAdmin || can("master_cabang", "delete")) && (
                              <DeleteBranchAction 
                                branch={branch} 
                                onDelete={() => deleteMutation.mutate(branch.id)}
                                isPending={deleteMutation.isPending}
                              />
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View - Cards */}
          <div className="md:hidden grid grid-cols-1 gap-4 p-4">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="h-10 w-10 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin mb-4" />
                <span className="text-sm text-slate-400 font-bold tracking-widest uppercase">Memuat...</span>
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 opacity-10 text-slate-400" />
                <p className="font-black text-slate-800 uppercase tracking-tight">Belum ada data cabang</p>
              </div>
            ) : (
              filteredBranches.map((branch) => (
                <div key={branch.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group transition-all active:scale-[0.98]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50/50 rounded-bl-[100px] -z-10" />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                         <MapPin className="w-3 h-3" /> Cabang Aktif
                      </div>
                      <h3 className="font-black text-xl text-slate-800 leading-tight mb-3">{branch.name}</h3>
                      <div className="flex flex-wrap gap-2">
                         <div className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 px-3 py-1 rounded-xl font-mono font-black text-[10px] shadow-sm ring-1 ring-orange-100">
                           ID: {branch.id.toString().padStart(3, '0')}
                         </div>
                         {branch.usePpn ? (
                           <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-xl px-3 py-1">
                             PPN Aktif
                           </Badge>
                         ) : (
                           <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-100 font-black text-[10px] uppercase tracking-tighter rounded-xl px-3 py-1">
                             Non-PPN
                           </Badge>
                         )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {(isAdmin || can("master_cabang", "edit")) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => startEdit(branch)}
                          className="h-10 w-10 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl transition-all shadow-sm bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {(isAdmin || can("master_cabang", "delete")) && (
                        <DeleteBranchAction 
                          branch={branch} 
                          onDelete={() => deleteMutation.mutate(branch.id)}
                          isPending={deleteMutation.isPending}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function BranchDialog({ isOpen, onOpenChange, editingBranch, setEditingBranch, onSubmit, isPending, form }: any) {
  useEffect(() => {
    if (editingBranch) {
      form.reset({
        name: editingBranch.name,
        usePpn: editingBranch.usePpn,
      });
    } else {
      form.reset({
        name: "",
        usePpn: false,
      });
    }
  }, [editingBranch, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-100 transition-all active:scale-95 font-black rounded-xl h-10 px-6 focus:outline-none focus:ring-0">
          <Plus className="mr-2 h-5 w-5" />
          Tambah Cabang
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-slate-50/50 backdrop-blur-xl font-display">
        <div className="h-32 bg-gradient-to-br from-orange-500 to-rose-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-[-10%] left-[-5%] w-24 h-24 bg-rose-400/20 rounded-full blur-xl" />
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <Building2 className="w-5 h-5 text-white" />
               </div>
               <div>
                  <DialogTitle className="text-3xl font-black tracking-tight drop-shadow-sm">
                    {editingBranch ? "Edit Cabang" : "Cabang Baru"}
                  </DialogTitle>
                  <DialogDescription className="text-orange-100 font-bold opacity-90">
                    {editingBranch ? "Perbarui informasi operasional." : "Tambahkan titik distribusi baru."}
                  </DialogDescription>
               </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                      <Building2 className="w-3 h-3" /> Nama Cabang
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Contoh: Jakarta Timur" 
                        {...field} 
                        className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-bold focus:ring-orange-500 transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="usePpn"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                         <ShieldCheck className="w-4 h-4 text-emerald-500" />
                         Gunakan PPN
                      </FormLabel>
                      <FormDescription className="text-[10px] font-bold text-slate-400">
                        Aktifkan jika cabang ini menerapkan PPN pada transaksi
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-12 rounded-2xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all uppercase tracking-widest text-[10px]"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="flex-[2] h-12 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-700 hover:to-rose-700 text-white rounded-2xl font-black shadow-lg shadow-orange-200 uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center justify-center"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                  Simpan Cabang
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBranchAction({ branch, onDelete, isPending }: any) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl active:scale-90 transition-all shadow-sm bg-rose-50 md:bg-transparent"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-w-[400px]">
        <div className="bg-rose-50 p-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
               <div className="w-14 h-14 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-200">
                  <Trash2 className="w-7 h-7 text-white" />
               </div>
            </div>
            <AlertDialogTitle className="text-2xl font-black text-slate-900 leading-tight mb-2">
               Hapus Cabang?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-bold text-sm">
               Anda akan menghapus <span className="text-rose-600 italic">"{branch.name}"</span>. 
               Data yang sudah dihapus tidak dapat dikembalikan.
            </AlertDialogDescription>
        </div>
        <AlertDialogFooter className="p-6 bg-white flex flex-row gap-3">
          <AlertDialogCancel className="flex-1 h-12 rounded-2xl font-black border-slate-100 text-slate-400 uppercase tracking-widest text-[10px] mt-0">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onDelete}
            className="flex-1 h-12 rounded-2xl font-black bg-rose-600 hover:bg-rose-700 text-white uppercase tracking-widest text-[10px] transition-all active:scale-95"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
