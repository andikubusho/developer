import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Role, insertRoleSchema, MENU_KEYS } from "@shared/schema";
import { usePermissions } from "@/hooks/use-permissions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  Loader2,
  ShieldCheck,
  Check,
  X,
  ChevronRight,
  ArrowLeft,
  Users
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/Card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/use-branch";

const DASHBOARD_OPTIONS = [
  { id: "gudang", label: "Dashboard Gudang" },
  { id: "sales", label: "Dashboard Sales" },
  { id: "principal", label: "Dashboard Principal" },
  { id: "promo_terintegrasi", label: "Dashboard Promo Terintegrasi" },
  { id: "sistem", label: "Dashboard Sistem" },
];

export default function RolesPage() {
  const { selectedBranch } = useBranch();
  const [isOpen, setIsOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { can } = usePermissions();

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles", selectedBranch?.id],
    queryFn: async () => {
      const url = selectedBranch?.id ? `/api/roles?branchId=${selectedBranch.id}` : "/api/roles";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    }
  });

  const form = useForm({
    resolver: zodResolver(insertRoleSchema),
    defaultValues: {
      name: "",
      authorizedDashboards: ["gudang"],
      permissions: {},
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/roles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Berhasil", description: "Role berhasil ditambahkan" });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/roles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Berhasil", description: "Role berhasil diperbarui" });
      setIsOpen(false);
      setEditingRole(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Berhasil", description: "Role berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      branchId: selectedBranch?.id || data.branchId
    };
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const startEdit = (role: Role) => {
    setEditingRole(role);
    form.reset({
      name: role.name,
      authorizedDashboards: (role.authorizedDashboards as string[]) || ["gudang"],
      permissions: (role.permissions as any) || {},
    });
    setIsOpen(true);
  };

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative min-h-[calc(100vh-5rem)] pb-12 bg-[#f8fafc]">
      {/* Super App Header: Sticky Solid Gradient Background */}
      <div id="promo-header-container" className="sticky top-0 z-30 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 shadow-2xl overflow-hidden mb-6 md:rounded-b-[3rem] rounded-b-[2rem]">
        {/* Decorative Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[100%] bg-white/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-20%] right-[-5%] w-[40%] h-[70%] bg-indigo-300/10 rounded-full blur-[60px]" />
        
        <div className="pt-4 md:pt-14 pb-4 md:pb-16 px-2 sm:px-4 max-w-7xl mx-auto relative z-10">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white px-2 md:px-4">
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => window.history.back()} 
                 className="p-2 hover:bg-white/10 rounded-full transition-colors"
               >
                  <ArrowLeft className="w-6 h-6" />
               </button>
               <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight leading-none drop-shadow-md">
                  Manajemen Role
                </h1>
                <p className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">
                  Atur Template Hak Akses & Dashboard
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) {
                  setEditingRole(null);
                  form.reset();
                }
              }}>
                {can("manajemen_role", "input") && (
                  <DialogTrigger asChild>
                    <Button className="h-11 px-6 bg-white text-indigo-600 hover:bg-white hover:scale-105 transition-transform shadow-lg font-bold rounded-xl border-none">
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah Role
                    </Button>
                  </DialogTrigger>
                )}
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">

              <div className="h-32 bg-gradient-to-br from-indigo-500 to-violet-600 relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute top-6 left-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                    {editingRole ? <Pencil className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black text-white leading-tight">
                      {editingRole ? "Edit Role" : "Tambah Role Baru"}
                    </DialogTitle>
                    <DialogDescription className="text-indigo-50 font-medium opacity-90">
                      Atur nama role, akses dashboard, dan detail hak akses menu.
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-slate-700">Nama Role</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Contoh: Admin Sales, Gudang Utama, dll" 
                              {...field} 
                              className="rounded-xl h-11 border-slate-200 focus:border-primary focus:ring-primary/20 transition-all font-medium"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Tabs defaultValue="dashboards" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 rounded-xl h-12 p-1 bg-slate-100 mb-4">
                        <TabsTrigger value="dashboards" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-xs">
                          Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="menus" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-xs">
                          Hak Akses Menu
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="dashboards" className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {DASHBOARD_OPTIONS.map((opt) => (
                            <FormField
                              key={opt.id}
                              control={form.control}
                              name="authorizedDashboards"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-xl border p-4 hover:bg-slate-50 transition-colors cursor-pointer border-slate-100">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(opt.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, opt.id])
                                          : field.onChange(field.value?.filter((value: string) => value !== opt.id));
                                      }}
                                      className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                    />
                                  </FormControl>
                                  <FormLabel className="font-medium text-slate-700 cursor-pointer flex-1">
                                    {opt.label}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormDescription>User dengan role ini dapat memilih dashboard yang dicentang di atas saat login.</FormDescription>
                      </TabsContent>

                      <TabsContent value="menus" className="pt-2">
                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 grid grid-cols-9 gap-2">
                            <div className="col-span-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Menu</div>
                            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">View</div>
                            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Create</div>
                            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Edit</div>
                            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Delete</div>
                            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Print</div>
                            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Export</div>
                          </div>
                          <ScrollArea className="h-[450px]">
                            <div className="divide-y divide-slate-100">
                              {/* Grouped Menus */}
                              {Object.entries(
                                MENU_KEYS.reduce((acc, menu) => {
                                  if (!acc[menu.group]) acc[menu.group] = [];
                                  acc[menu.group].push(menu);
                                  return acc;
                                }, {} as Record<string, any[]>)
                              ).map(([group, menus]) => (
                                <div key={group}>
                                  <div className="bg-slate-50/50 px-4 py-2 font-bold text-[11px] text-indigo-600 uppercase tracking-widest border-y border-slate-100">
                                    {group}
                                  </div>
                                  {menus.map((menu) => (
                                    <div key={menu.key} className="px-4 py-2 grid grid-cols-9 gap-2 items-center hover:bg-slate-50/50 transition-colors">
                                      <div className="col-span-3">
                                        <div className="font-semibold text-slate-800 text-xs leading-tight">{menu.label}</div>
                                        <div className="text-[9px] text-slate-400 font-mono tracking-tight uppercase truncate">{menu.key}</div>
                                      </div>
                                      
                                      {/* View Checkbox */}
                                      <div className="flex justify-center">
                                        {menu.capabilities.view && (
                                          <FormField
                                            control={form.control}
                                            // @ts-ignore
                                            name={`permissions.${menu.key}.view`}
                                            render={({ field }) => (
                                              <Checkbox 
                                                checked={!!field.value} 
                                                onCheckedChange={field.onChange} 
                                                className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                              />
                                            )}
                                          />
                                        )}
                                      </div>

                                      {/* Create Checkbox */}
                                      <div className="flex justify-center">
                                        {menu.capabilities.create && (
                                          <FormField
                                            control={form.control}
                                            // @ts-ignore
                                            name={`permissions.${menu.key}.input`}
                                            render={({ field }) => (
                                              <Checkbox 
                                                checked={!!field.value} 
                                                onCheckedChange={field.onChange}
                                                className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                              />
                                            )}
                                          />
                                        )}
                                      </div>

                                      {/* Edit Checkbox */}
                                      <div className="flex justify-center">
                                        {menu.capabilities.edit && (
                                          <FormField
                                            control={form.control}
                                            // @ts-ignore
                                            name={`permissions.${menu.key}.edit`}
                                            render={({ field }) => (
                                              <Checkbox 
                                                checked={!!field.value} 
                                                onCheckedChange={field.onChange}
                                                className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                              />
                                            )}
                                          />
                                        )}
                                      </div>

                                      {/* Delete Checkbox */}
                                      <div className="flex justify-center">
                                        {menu.capabilities.delete && (
                                          <FormField
                                            control={form.control}
                                            // @ts-ignore
                                            name={`permissions.${menu.key}.delete`}
                                            render={({ field }) => (
                                              <Checkbox 
                                                checked={!!field.value} 
                                                onCheckedChange={field.onChange}
                                                className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                              />
                                            )}
                                          />
                                        )}
                                      </div>

                                      {/* Print Checkbox */}
                                      <div className="flex justify-center">
                                        {menu.capabilities.print && (
                                          <FormField
                                            control={form.control}
                                            // @ts-ignore
                                            name={`permissions.${menu.key}.print`}
                                            render={({ field }) => (
                                              <Checkbox 
                                                checked={!!field.value} 
                                                onCheckedChange={field.onChange}
                                                className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                              />
                                            )}
                                          />
                                        )}
                                      </div>

                                      {/* Export Checkbox */}
                                      <div className="flex justify-center">
                                        {menu.capabilities.export && (
                                          <FormField
                                            control={form.control}
                                            // @ts-ignore
                                            name={`permissions.${menu.key}.export`}
                                            render={({ field }) => (
                                              <Checkbox 
                                                checked={!!field.value} 
                                                onCheckedChange={field.onChange}
                                                className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                              />
                                            )}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>

                          </ScrollArea>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100 gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setIsOpen(false)}
                      className="rounded-xl font-semibold"
                    >
                      Batal
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-primary text-white rounded-xl px-10 font-semibold hover:bg-primary/90 transition-all active:scale-95"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {(createMutation.isPending || updateMutation.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Simpan Role
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
            </div>
          </div>
        </div>
      </div>

        <Card className="border-slate-200/60 subtle-shadow rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 bg-white/50 pb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl bg-slate-50 border-slate-200/60 focus:bg-white focus:ring-primary/10 transition-all h-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                <p className="font-medium animate-pulse">Memuat data role...</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-slate-50/30">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                  <ShieldCheck className="h-10 w-10 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-500 text-lg">Tidak ada role ditemukan</p>
                <p className="text-sm">Klik "Tambah Role" untuk membuat template hak akses baru.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 animate-in slide-in-from-bottom-2 duration-300">
                {filteredRoles.map((role) => (
                  <div key={role.id} className="group flex items-center justify-between p-5 hover:bg-slate-50/80 transition-all duration-200">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 subtle-shadow">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-700 transition-colors">
                          {role.name}
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {((role.authorizedDashboards as string[]) || []).map(db => (
                            <Badge key={db} variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold text-[9px] px-2 h-5 uppercase tracking-wider">
                              {db.replace('_', ' ')}
                            </Badge>
                          ))}
                          <Badge variant="outline" className="border-indigo-100 text-indigo-400 font-bold text-[9px] px-2 h-5 uppercase tracking-wider">
                            {Object.keys(role.permissions || {}).length} Menus
                          </Badge>
                          <Badge variant="outline" className="border-emerald-100 text-emerald-500 font-bold text-[9px] px-2 h-5 uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />
                            {(role as any).userCount || 0} Users
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pr-2">
                      {can("manajemen_role", "edit") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(role)}
                          className="h-10 w-10 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-slate-400"
                        >
                          <Pencil className="h-4.5 w-4.5" />
                        </Button>
                      )}
                      {can("manajemen_role", "delete") && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors text-slate-400"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl border-slate-200 shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-bold font-display text-slate-900">Hapus Role?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-500">
                                Apakah Anda yakin ingin menghapus role <span className="font-bold text-slate-900">"{role.name}"</span>? 
                                User yang menggunakan role ini mungkin akan kehilangan akses ke beberapa fitur.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
                              <AlertDialogCancel className="rounded-xl font-semibold">Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(role.id)}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all active:scale-95 px-6 h-10"
                              >
                                Ya, Hapus Role
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
