import { useState, useEffect } from "react";
import { type Tax, insertTaxSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, ReceiptText, Search, Loader2, Percent, ArrowLeft, RotateCcw, Building2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

import { useTaxes, useCreateTax, useUpdateTax, useDeleteTax } from "@/hooks/use-taxes";
import { usePermissions } from "@/hooks/use-permissions";
import { useBranch } from "@/hooks/use-branch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export default function TaxesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { selectedBranch, branches } = useBranch();
  const { data: taxes = [], isLoading } = useTaxes(selectedBranch?.id);
  const { can } = usePermissions();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const startEdit = (tax: Tax) => {
    setEditingTax(tax);
    setIsOpen(true);
  };

  const filteredTaxes = taxes.filter((t) => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="relative min-h-[calc(100vh-5rem)] pb-12 overflow-x-hidden">
        {/* Super App Header: Violet/Indigo Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] md:w-full h-[220px] md:h-[240px] bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 md:rounded-b-[3rem] rounded-b-[20%] -z-10 shadow-2xl overflow-hidden text-white">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[100%] bg-white/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-20%] right-[-5%] w-[40%] h-[70%] bg-purple-300/10 rounded-full blur-[60px]" />
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
                   Master PPN
                </h1>
                <p className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">
                   Manajemen Persentase Pajak
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
              {(isAdmin || can("master_ppn", "input")) && (
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

              {(isAdmin || can("master_ppn", "input")) && (
                 <div className="bg-white p-1 rounded-xl shadow-xl flex gap-1 w-full xs:w-auto mt-2 xs:mt-0">
                    <div className="flex-1 xs:flex-none">
                      <TaxDialog isOpen={isOpen} onOpenChange={setIsOpen} editingTax={editingTax} setEditingTax={setEditingTax} />
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
                          placeholder="Cari PPN berdasarkan nama..." 
                          className="h-12 pl-12 bg-slate-50/50 border-slate-100 focus:ring-indigo-500 rounded-xl font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium transition-all"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                  </CardContent>
               </Card>
          </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl shadow-premium border border-slate-100 overflow-hidden mb-8">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none">
                <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider h-14 pl-6">Nama Pajak</TableHead>
                <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider h-14">Cabang</TableHead>
                <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider h-14">Persentase</TableHead>
                <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider h-14">Status</TableHead>
                <TableHead className="text-right font-black text-slate-400 text-[10px] uppercase tracking-wider h-14 pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                      <span className="text-sm text-slate-400 font-bold tracking-widest uppercase">Sinkronisasi data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTaxes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Tidak ada data pajak ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filteredTaxes.map((tax) => (
                  <TableRow key={tax.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                    <TableCell className="font-bold text-slate-800 py-4 pl-6">{tax.name}</TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="bg-slate-50 border-slate-200 font-bold text-[10px] uppercase px-2 py-1 rounded-lg">
                        {branches.find(b => b.id === tax.branchId)?.name || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                       <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl font-mono font-black text-sm">
                          <Percent className="w-3 h-3" />
                          {tax.rate}%
                       </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={cn(
                        "rounded-lg font-black text-[9px] uppercase tracking-tighter border-none px-2",
                        tax.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      )}>
                        {tax.isActive ? 'Aktif' : 'Non-aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-4 pr-6">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        {(isAdmin || can("master_ppn", "edit")) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => startEdit(tax)}
                            className="h-10 w-10 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl active:scale-90 transition-all"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {(isAdmin || can("master_ppn", "delete")) && (
                          <DeleteTaxButton tax={tax} />
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
                  <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <span className="text-sm text-slate-400 font-bold tracking-widest uppercase">Memuat...</span>
                </div>
              ) : filteredTaxes.length === 0 ? (
                <div className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
                  <Percent className="h-16 w-16 mx-auto mb-4 opacity-10 text-slate-400" />
                  <p className="font-black text-slate-800 uppercase tracking-tight">Belum ada data pajak</p>
                </div>
              ) : (
                filteredTaxes.map((tax) => (
                  <div key={tax.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group transition-all active:scale-[0.98]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50/50 rounded-bl-[100px] -z-10" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Pajak Aktif</div>
                        <h3 className="font-black text-slate-800 leading-none mb-3">{tax.name}</h3>
                        <div className="flex flex-wrap gap-2">
                           <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl font-mono font-black text-sm shadow-sm ring-1 ring-indigo-100">
                             <Percent className="w-3 h-3" />
                             {tax.rate}%
                           </div>
                           <Badge variant="outline" className={cn(
                             "rounded-lg font-black text-[9px] uppercase tracking-tighter border-none px-2 py-1",
                             tax.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                           )}>
                             {tax.isActive ? 'Aktif' : 'Non-Aktif'}
                           </Badge>
                        </div>
                        <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                           <Building2 className="w-3 h-3" />
                           {branches.find(b => b.id === tax.branchId)?.name || "-"}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {(isAdmin || can("master_ppn", "edit")) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => startEdit(tax)}
                            className="h-10 w-10 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl transition-all shadow-sm bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {(isAdmin || can("master_ppn", "delete")) && (
                          <DeleteTaxButton tax={tax} />
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

function TaxDialog({ isOpen, onOpenChange, editingTax, setEditingTax }: { 
  isOpen: boolean, 
  onOpenChange: (open: boolean) => void,
  editingTax: Tax | null,
  setEditingTax: (tax: Tax | null) => void
}) {
  const { selectedBranch, branches } = useBranch();
  const createMutation = useCreateTax();
  const updateMutation = useUpdateTax();

  const form = useForm({
    resolver: zodResolver(insertTaxSchema),
    defaultValues: {
      name: editingTax?.name || "PPN",
      rate: editingTax?.rate || "11",
      isActive: editingTax?.isActive ?? true,
      branchId: editingTax?.branchId || selectedBranch?.id || branches[0]?.id || undefined,
    },
  });

  // Re-sync form when editingTax changes
  useEffect(() => {
    if (editingTax) {
      form.reset({
        name: editingTax.name,
        rate: editingTax.rate.toString(),
        isActive: editingTax.isActive,
        branchId: editingTax.branchId || undefined,
      });
    } else {
      form.reset({
        name: "PPN",
        rate: "11",
        isActive: true,
        branchId: selectedBranch?.id || branches[0]?.id || undefined,
      });
    }
  }, [editingTax, form, selectedBranch, branches]);

  const onSubmit = async (data: any) => {
    try {
      const submitData = {
        ...data,
        rate: data.rate.toString()
      };
      
      if (editingTax) {
        await updateMutation.mutateAsync({ id: editingTax.id, ...submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      onOpenChange(false);
      setEditingTax(null);
    } catch (e) {}
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 transition-all active:scale-95 font-black rounded-xl h-10 px-6 focus:outline-none focus:ring-0">
          <Plus className="mr-2 h-5 w-5" />
          Tambah PPN
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-slate-50/50 backdrop-blur-xl font-display">
        <div className="h-32 bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-white relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-[-10%] left-[-5%] w-24 h-24 bg-violet-400/20 rounded-full blur-xl" />
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <Percent className="w-5 h-5 text-white" />
               </div>
               <div>
                  <DialogTitle className="text-3xl font-black tracking-tight drop-shadow-sm">
                    {editingTax ? "Edit PPN" : "PPN Baru"}
                  </DialogTitle>
                  <DialogDescription className="text-violet-100 font-bold opacity-90">
                    {editingTax ? "Perbarui persentase pajak." : "Atur kebijakan pajak baru."}
                  </DialogDescription>
               </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                        <ReceiptText className="w-3 h-3" /> Nama Pajak
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="PPN 11%" 
                          {...field} 
                          className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-bold focus:ring-violet-500 transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                       <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                        <Percent className="w-3 h-3" /> Persen (%)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.1"
                          placeholder="11" 
                          {...field} 
                          className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-black font-mono focus:ring-violet-500 transition-all text-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                      <Building2 className="w-3 h-3" /> Cabang Terkait
                    </FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(parseInt(val))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-bold focus:ring-violet-500 transition-all">
                          <SelectValue placeholder="Pilih Cabang" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id.toString()} className="font-bold">
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-3xl bg-slate-100/50 p-5 shadow-inner border border-white/50">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-black text-slate-700">Status Aktif</FormLabel>
                      <p className="text-[10px] text-slate-400 font-bold leading-tight">Gunakan sebagai pajak default di SO</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-emerald-500 scale-125"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-6 border-t border-slate-100 items-center justify-end gap-3 sm:flex-row flex-col-reverse">
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => onOpenChange(false)} 
                    className="h-12 w-full sm:w-auto rounded-xl font-bold text-slate-500 hover:bg-slate-100 px-6"
                >
                    Batal
                </Button>
                <Button 
                    type="submit" 
                    disabled={isPending} 
                    className="h-12 w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white rounded-xl font-black px-10 shadow-lg shadow-violet-100 transition-all active:scale-95 flex items-center gap-2"
                >
                  {isPending ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Simpan Pajak</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTaxButton({ tax }: { tax: Tax }) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteTax();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl active:scale-90 transition-all shadow-sm bg-rose-50 md:bg-transparent"
        >
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
                    <DialogTitle className="text-2xl font-black tracking-tight drop-shadow-sm">Hapus PPN</DialogTitle>
                    <DialogDescription className="text-rose-100 font-bold opacity-90">Konfirmasi penghapusan data pajak.</DialogDescription>
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
                       Apakah Anda yakin ingin menghapus pajak <br/>
                       <span className="text-slate-900 text-lg underline decoration-rose-200 decoration-4 underline-offset-4">{tax.name} ({tax.rate}%)</span>?
                    </p>
                    <div className="mt-4 px-4 py-3 bg-rose-50/50 border border-rose-100 rounded-2xl flex gap-3 text-left">
                       <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                       <p className="text-[10px] text-rose-500 font-black uppercase leading-tight tracking-wider">
                          Pajak yang sudah dihapus tidak dapat dipulihkan dan dapat mempengaruhi perhitungan data lama.
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
                onClick={() => deleteMutation.mutate(tax.id, { onSuccess: () => setOpen(false) })} 
                disabled={deleteMutation.isPending} 
                className="h-12 w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black px-8 shadow-lg shadow-rose-100 transition-all active:scale-95 flex items-center gap-2"
              >
                {deleteMutation.isPending ? (
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
