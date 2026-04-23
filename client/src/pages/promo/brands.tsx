import { useQuery, useMutation } from "@tanstack/react-query";
import { PromoBrand, InsertPromoBrand } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPromoBrandSchema } from "@shared/schema";
import { Form, FormControl,FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Bookmark, Shield } from "lucide-react";
import { useBranch } from "@/hooks/use-branch";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

export default function PromoBrands() {
  const { toast } = useToast();
  const { can } = usePermissions();
  const { selectedBranch } = useBranch();

  if (!can(["promo_toko", "master_merek_promo"], "view")) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="p-4 bg-red-50 rounded-full text-red-500">
            <Shield className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Akses Ditolak</h1>
          <p className="text-slate-500 text-center max-w-sm font-medium">
            Anda tidak memiliki izin untuk melihat halaman Master Merek Promo. 
            Silakan hubungi administrator untuk mendapatkan akses.
          </p>
          <Button onClick={() => window.history.back()} variant="outline" className="mt-4 border-slate-200">
            Kembali Ke Sebelumnya
          </Button>
        </div>
      </>
    );
  }
  
  const { data: brands = [], isLoading } = useQuery<PromoBrand[]>({
    queryKey: ["/api/promo/brands", selectedBranch?.id],
    queryFn: async () => {
      const url = `/api/promo/brands?branchId=${selectedBranch?.id}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch brands");
      return res.json();
    }
  });

  const form = useForm<InsertPromoBrand>({
    resolver: zodResolver(insertPromoBrandSchema),
    defaultValues: {
      name: "",
      branchId: selectedBranch?.id || null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPromoBrand) => {
      const res = await apiRequest("POST", "/api/promo/brands", {
        ...data,
        branchId: selectedBranch?.id || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/brands"] });
      toast({ title: "Berhasil", description: "Merek berhasil ditambahkan" });
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/promo/brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo/brands"] });
      toast({ title: "Berhasil", description: "Merek berhasil dihapus" });
    },
  });

  return (
    <>
      <div className="relative mb-8 -mt-2">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl blur-xl opacity-20 animate-pulse" />
        <div className="relative bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/20">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner group transition-transform hover:scale-105">
                <Bookmark className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-in zoom-in duration-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Master Merek</h1>
                  <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">
                    Promo
                  </div>
                </div>
                <p className="text-pink-50/80 text-sm sm:text-base font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-200 animate-ping" />
                  Kelola daftar merek untuk promo toko
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card className="h-fit rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                 <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center">
                   <Plus className="w-4 h-4 text-pink-600" />
                 </div>
                 Tambah Merek Baru
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-slate-700 uppercase tracking-widest">Nama Merek</FormLabel>
                        <FormControl>
                          <Input className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-pink-500/30 focus-visible:border-pink-500 transition-all font-medium text-slate-800" placeholder="Contoh: Ferio, Blum, dll" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {can(["promo_toko", "master_merek_promo"], "input") ? (
                    <Button type="submit" className="w-full h-12 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black shadow-lg shadow-pink-200 gap-2 transition-all mt-6" disabled={createMutation.isPending}>
                       <Plus className="h-4 w-4" />
                       {createMutation.isPending ? "Menyimpan..." : "Simpan Merek"}
                    </Button>
                  ) : (
                    <Button disabled className="w-full h-12 rounded-xl opacity-50 cursor-not-allowed mt-6">
                      Tidak Ada Akses Input
                    </Button>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                 <Table>
                   <TableHeader className="bg-slate-50/50">
                     <TableRow className="hover:bg-transparent border-slate-100">
                       <TableHead className="font-bold text-slate-800 py-3 md:py-5 pl-4 md:pl-8">Nama Merek</TableHead>
                       <TableHead className="w-[80px] md:w-[100px] text-right font-bold text-slate-800 pr-4 md:pr-8">Aksi</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {isLoading ? (
                       Array.from({ length: 3 }).map((_, i) => (
                         <TableRow key={i}>
                           <TableCell className="pl-4 md:pl-8 py-3 md:py-5"><div className="h-8 bg-slate-100 animate-pulse rounded-lg w-1/2" /></TableCell>
                           <TableCell className="pr-4 md:pr-8 py-3 md:py-5"><div className="h-8 bg-slate-100 animate-pulse rounded-lg w-10 ml-auto" /></TableCell>
                         </TableRow>
                       ))
                     ) : brands.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={2} className="text-center py-20">
                            <Bookmark className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium italic">Belum ada data merek.</p>
                         </TableCell>
                       </TableRow>
                     ) : (
                       brands.map((brand) => (
                         <TableRow key={brand.id} className="hover:bg-slate-50/50 transition-colors border-slate-100/50 group">
                           <TableCell className="font-black text-slate-700 text-base md:text-lg uppercase tracking-tight py-3 md:py-4 pl-4 md:pl-8 group-hover:text-pink-600 transition-colors">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100 shrink-0">
                                  <Bookmark className="w-4 h-4" />
                               </div>
                               <span className="truncate">{brand.name}</span>
                            </div>
                           </TableCell>
                           <TableCell className="text-right py-3 md:py-4 pr-4 md:pr-8">
                             {can(["promo_toko", "master_merek_promo"], "delete") && (
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="w-10 h-10 rounded-xl text-rose-500 hover:text-white hover:bg-rose-500 transition-all opacity-100 md:opacity-0 group-hover:opacity-100 ml-auto"
                                 onClick={(e) => {
                                   if (window.confirm("Hapus merek ini?")) {
                                     deleteMutation.mutate(brand.id);
                                   }
                                 }}
                                 disabled={deleteMutation.isPending}
                               >
                                 <Trash2 className="h-5 w-5" />
                               </Button>
                             )}
                           </TableCell>
                         </TableRow>
                       ))
                     )}
                   </TableBody>
                 </Table>
              </div>
            </CardContent>
          </Card>
        </div>
    </>
  );
}
