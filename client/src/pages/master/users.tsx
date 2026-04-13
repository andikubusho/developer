import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { UserPlus, Pencil, Trash2, Eye, EyeOff, ShieldCheck, Shield, Download, Monitor, ChevronDown, FileSpreadsheet, FileText, ArrowLeft, Search, User, Plus, AlertCircle, Building2, MapPin } from "lucide-react";
import { MENU_KEYS, type UserPermission } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { type Branch, type Role } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranch } from "@/hooks/use-branch";
import { Controller } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";

type SafeUser = { 
  id: number; 
  username: string; 
  displayName: string; 
  branchId: number | null;
  accessibleBranchIds: number[];
  authorizedDashboards: string[];
  role?: string | null;
  roleId?: number | null;
};

// Define default capabilities for all menus
const DEFAULT_CAPS = { view: true, input: true, edit: true, delete: true, export: true, print: true };

// Specific overrides for menus that don't support certain actions
const CAPABILITY_OVERRIDES: Record<string, Partial<typeof DEFAULT_CAPS>> = {
  packing: { input: false, delete: false },
  siap_kirim: { input: false, delete: false },
  terkirim: { input: false, delete: false },
  pop_up_notif_so: { input: false, edit: false, delete: false, export: false, print: false },
  laporan_pengiriman: { input: false, edit: false, delete: false },
  laporan_surat_order: { input: false, edit: false, delete: false },
  laporan_promo: { input: false, edit: false, delete: false },
  dashboard: { input: false, edit: false, delete: false, export: false, print: false },
  dashboard_admin: { input: false, edit: false, delete: false, export: false, print: false },
  audit_logs: { input: false, edit: false, delete: false },
};

export const MENU_CAPABILITIES: Record<string, typeof DEFAULT_CAPS> = MENU_KEYS.reduce((acc, menu) => ({
  ...acc,
  [menu.key]: { ...DEFAULT_CAPS, ...(CAPABILITY_OVERRIDES[menu.key] || {}) }
}), {});

const ROLE_PRESETS: Record<string, { authorizedDashboards: string[], permissions: Record<string, any> }> = {
  SUPERADMIN: {
    authorizedDashboards: ["salesman", "admin", "gudang", "promo_toko"],
    permissions: MENU_KEYS.reduce((acc, menu) => ({
      ...acc,
      [menu.key]: { view: true, input: true, edit: true, delete: true, export: true, print: true }
    }), {})
  },
  ADMIN: {
    authorizedDashboards: ["admin", "gudang", "salesman", "promo_toko"],
    permissions: MENU_KEYS.reduce((acc, menu) => {
      const isSystem = ["manajemen_pengguna", "manajemen_role", "audit_logs"].includes(menu.key);
      return {
        ...acc,
        [menu.key]: { 
          view: true, 
          input: true, 
          edit: true, 
          delete: true, 
          export: true, 
          print: true 
        }
      };
    }, {})
  },
  SALES: {
    authorizedDashboards: ["salesman"],
    permissions: {
      surat_order: { view: true, input: true, edit: true, delete: true, export: true, print: true },
      master_barang: { view: true, input: false, edit: false, delete: false, export: true, print: true },
      master_customer_sales: { view: true, input: true, edit: true, delete: false, export: true, print: true },
      laporan_surat_order: { view: true, input: false, edit: false, delete: false, export: true, print: true },
      cek_stock: { view: true, input: false, edit: false, delete: false, export: false, print: false },
    }
  },
  GUDANG: {
    authorizedDashboards: ["gudang"],
    permissions: {
      input_pengiriman: { view: true, input: true, edit: false, delete: true, export: true, print: true },
      packing: { view: true, input: false, edit: true, delete: false, export: false, print: true },
      siap_kirim: { view: true, input: false, edit: true, delete: false, export: false, print: true },
      terkirim: { view: true, input: false, edit: true, delete: false, export: false, print: true },
      pengembalian: { view: true, input: false, edit: false, delete: false, export: true, print: true },
      laporan_pengiriman: { view: true, input: false, edit: false, delete: false, export: true, print: true },
    }
  }
};

const DASHBOARD_SECTIONS = [
  {
    title: "Administrasi & Sistem",
    menus: ["dashboard", "dashboard_admin", "audit_logs", "manajemen_pengguna", "manajemen_role", "master_cabang", "master_ppn", "pengaturan_teks"]
  },
  {
    title: "Data Master & Inventori",
    menus: ["master_barang", "master_pelanggan", "master_customer_sales", "master_ekspedisi", "master_toko", "master_user", "master_role", "cek_stock"]
  },
  {
    title: "Operasional Gudang & Kirim",
    menus: ["input_pengiriman", "pengiriman", "packing", "siap_kirim", "terkirim", "pengembalian"]
  },
  {
    title: "Ekosistem Promo Terintegrasi",
    menus: ["buat_promo", "transaksi_promo", "monitoring_promo", "pencairan_promo", "master_data_promo", "master_promo_integrated", "master_merek", "master_principal", "klaim_principal", "master_promo_principal", "program_principal", "program_pelanggan", "program_pelanggan"]
  },
  {
    title: "Penjualan & Laporan",
    menus: ["surat_order", "laporan", "laporan_pengiriman", "laporan_surat_order", "laporan_promo"]
  },
  {
    title: "Fitur Tambahan & Notif",
    menus: ["pop_up_notif_so", "loyalty_points", "cutting_label", "promo_toko", "input_promo_toko", "master_promo_toko", "manajemen_promo_dashboard", "konfirmasi_pembayaran_promo", "master_toko_promo"]
  }
];

function useUsers(branchId?: number) {
  return useQuery<SafeUser[]>({
    queryKey: ["/api/users", branchId],
    queryFn: async () => {
      const url = branchId ? `/api/users?branchId=${branchId}` : "/api/users";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    }
  });
}

function useRoles(branchId?: number) {
  return useQuery<Role[]>({
    queryKey: ["/api/roles", branchId],
    queryFn: async () => {
      const url = branchId ? `/api/roles?branchId=${branchId}` : "/api/roles";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    }
  });
}

function useCreateUser() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { username: string; displayName: string; password: string; branchId?: number; accessibleBranchIds?: number[]; authorizedDashboards?: string[]; role?: string; roleId?: number | null; permissions?: any[] }) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const user = await res.json();

      // If permissions are provided with the preset, save them
      if (data.permissions && data.permissions.length > 0) {
        await apiRequest("PUT", `/api/users/${user.id}/permissions`, { 
          permissions: data.permissions, 
          authorizedDashboards: data.authorizedDashboards 
        });
      }

      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: "Pengguna baru berhasil ditambahkan" });
    },
    onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });
}

function useUpdateUser() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; displayName?: string; username?: string; password?: string; branchId?: number | null; accessibleBranchIds?: number[]; authorizedDashboards?: string[]; role?: string | null; roleId?: number | null }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (updated: SafeUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Berhasil", description: `Data ${updated.displayName} berhasil diperbarui` });
    },
    onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });
}

function useDeleteUser() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: "Pengguna berhasil dihapus" });
    },
    onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });
}

function PasswordInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10"
      />
      <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("GUDANG");
  const [accessibleBranchIds, setAccessibleBranchIds] = useState<number[]>([]);
  const [authorizedDashboards, setAuthorizedDashboards] = useState<string[]>(["gudang"]);
  const [roleId, setRoleId] = useState<number | null>(null);
  const createMut = useCreateUser();
  const { selectedBranch, branches } = useBranch();
  const { data: roles = [] } = useRoles(selectedBranch?.id);

  const reset = () => { 
    setUsername("");
    setDisplayName(""); 
    setPassword(""); 
    setRole("GUDANG");
    setRoleId(null);
    setAccessibleBranchIds([]);
    setAuthorizedDashboards(["gudang"]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let permissions: any[] = [];
    let dashboards = authorizedDashboards;

    if (roleId) {
      const selectedRole = roles.find(r => r.id === roleId);
      if (selectedRole) {
        dashboards = selectedRole.authorizedDashboards as string[];
        const perms = selectedRole.permissions as any;
        permissions = MENU_KEYS.map(m => ({
          menuKey: m.key,
          canView: perms[m.key]?.view || false,
          canInput: perms[m.key]?.input || false,
          canEdit: perms[m.key]?.edit || false,
          canDelete: perms[m.key]?.delete || false,
          canExport: perms[m.key]?.export || false,
          canPrint: perms[m.key]?.print || false,
        }));
      }
    } else {
      const preset = ROLE_PRESETS[role];
      dashboards = preset.authorizedDashboards;
      permissions = MENU_KEYS.map(m => ({
        menuKey: m.key,
        canView: preset.permissions[m.key]?.view || false,
        canInput: preset.permissions[m.key]?.input || false,
        canEdit: preset.permissions[m.key]?.edit || false,
        canDelete: preset.permissions[m.key]?.delete || false,
        canExport: preset.permissions[m.key]?.export || false,
        canPrint: preset.permissions[m.key]?.print || false,
      }));
    }

    createMut.mutate({ 
      username: username.trim(), 
      displayName: displayName.trim(), 
      password,
      role,
      roleId,
      accessibleBranchIds,
      authorizedDashboards: dashboards,
      permissions
    }, {
      onSuccess: () => { setOpen(false); reset(); }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-white hover:bg-slate-50 text-indigo-600 font-black rounded-xl h-10 px-4 shadow-sm border border-indigo-100 transition-all active:scale-95">
          <UserPlus className="h-4 w-4 mr-2" /> Tambah Pengguna
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-indigo-600 h-2 w-full" />
        <div className="p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-black tracking-tight text-slate-800">Pengguna Baru</DialogTitle>
            <DialogDescription className="font-bold text-slate-400 text-sm">Daftarkan akun personel baru ke sistem.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nama Lengkap Personel</Label>
                <Input placeholder="Contoh: Budi Santoso" value={displayName} onChange={e => setDisplayName(e.target.value)} disabled={createMut.isPending} className="h-12 border-slate-100 bg-slate-50/50 rounded-2xl font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Username Sistem</Label>
                <div className="relative">
                   <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <Input placeholder="budi123" value={username} onChange={e => setUsername(e.target.value)} disabled={createMut.isPending} className="h-12 pl-11 border-slate-100 bg-slate-50/50 rounded-2xl font-mono font-bold" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Password Keamanan</Label>
                <PasswordInput value={password} onChange={setPassword} placeholder="Minimal 6 karakter" disabled={createMut.isPending} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Role Kendali (Akses)</Label>
                <Select 
                  value={roleId ? `role-${roleId}` : role} 
                  onValueChange={(val) => {
                    if (val.startsWith("role-")) {
                      const id = parseInt(val.replace("role-", ""));
                      setRoleId(id);
                      const r = roles.find(x => x.id === id);
                      if (r) {
                        setRole(r.name);
                        setAuthorizedDashboards(r.authorizedDashboards as string[]);
                      }
                    } else {
                      setRoleId(null);
                      setRole(val);
                      if (ROLE_PRESETS[val]) {
                        setAuthorizedDashboards(ROLE_PRESETS[val].authorizedDashboards);
                      }
                    }
                  }} 
                  disabled={createMut.isPending}
                >
                  <SelectTrigger className="h-12 border-slate-100 bg-slate-50/50 rounded-2xl font-bold">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                    {roles.map(r => (
                      <SelectItem key={r.id} value={`role-${r.id}`} className="rounded-xl">{r.name}</SelectItem>
                    ))}
                    {Object.keys(ROLE_PRESETS).map(pk => (
                      <SelectItem key={pk} value={pk} className="rounded-xl">{pk} (Preset)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2"><Building2 className="w-3 h-3" /> Cabang Yang Dapat Diakses</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border border-slate-100 rounded-[1.5rem] bg-slate-50/30 max-h-32 overflow-y-auto scrollbar-hide">
                  {branches.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 hover:bg-white p-1 rounded-lg transition-colors">
                      <Checkbox 
                        id={`branch-new-${b.id}`}
                        checked={accessibleBranchIds.includes(b.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setAccessibleBranchIds([...accessibleBranchIds, b.id]);
                          else setAccessibleBranchIds(accessibleBranchIds.filter(id => id !== b.id));
                        }}
                        className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                      />
                      <label htmlFor={`branch-new-${b.id}`} className="text-[11px] font-bold text-slate-600 leading-none cursor-pointer">
                        {b.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-50 mt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => { setOpen(false); reset(); }} className="h-12 rounded-2xl font-bold">Batal</Button>
              <Button type="submit" disabled={createMut.isPending || !username.trim() || !displayName.trim() || !password} className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black px-8 shadow-lg shadow-indigo-100 transition-all">
                {createMut.isPending ? "Menyimpan..." : "Daftarkan User"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user }: { user: SafeUser }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user.role || "");
  const [roleId, setRoleId] = useState<number | null>(user.roleId || null);
  const [accessibleBranchIds, setAccessibleBranchIds] = useState<number[]>(user.accessibleBranchIds || []);
  const [authorizedDashboards, setAuthorizedDashboards] = useState<string[]>(user.authorizedDashboards || ["gudang"]);

  const { selectedBranch, branches } = useBranch();
  const { data: roles = [] } = useRoles(selectedBranch?.id);
  const updateMut = useUpdateUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { displayName, username };
    if (password.trim()) data.password = password;
    data.role = role || null;
    data.roleId = roleId || null;
    
    if (roleId) {
      const selectedRole = roles.find(r => r.id === roleId);
      if (selectedRole) {
        data.authorizedDashboards = selectedRole.authorizedDashboards;
      }
    } else if (role && ROLE_PRESETS[role]) {
      data.authorizedDashboards = ROLE_PRESETS[role].authorizedDashboards;
    }
    data.accessibleBranchIds = accessibleBranchIds;
    updateMut.mutate({ id: user.id, ...data }, { onSuccess: () => { setOpen(false); setPassword(""); } });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setUsername(user.username); setDisplayName(user.displayName); setPassword(""); setAccessibleBranchIds(user.accessibleBranchIds || []); setAuthorizedDashboards(user.authorizedDashboards || ["gudang"]); } }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-lg transition-all active:scale-90 focus:outline-none focus:ring-0">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-indigo-600 h-2 w-full" />
        <div className="p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-black tracking-tight text-slate-800">Edit Profil</DialogTitle>
            <DialogDescription className="font-bold text-slate-400 text-sm">Perbarui informasi dasar dan hak akses user.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nama Lengkap</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} disabled={updateMut.isPending} className="h-12 border-slate-100 bg-slate-50/50 rounded-2xl font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Username</Label>
                <Input value={username} onChange={e => setUsername(e.target.value)} disabled={updateMut.isPending} className="h-12 border-slate-100 bg-slate-50/50 rounded-2xl font-mono font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Password <span className="text-slate-300 font-bold lowercase italic">(biarkan kosong jika tidak diubah)</span></Label>
                <PasswordInput value={password} onChange={setPassword} placeholder="Minimal 6 karakter" disabled={updateMut.isPending} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Role Kendali</Label>
                <Select 
                  value={roleId ? `role-${roleId}` : role} 
                  onValueChange={(val) => {
                    if (val.startsWith("role-")) {
                      const id = parseInt(val.replace("role-", ""));
                      setRoleId(id);
                      const r = roles.find(x => x.id === id);
                      if (r) {
                        setRole(r.name);
                        setAuthorizedDashboards(r.authorizedDashboards as string[]);
                      }
                    } else {
                      setRoleId(null);
                      setRole(val);
                      if (ROLE_PRESETS[val]) {
                        setAuthorizedDashboards(ROLE_PRESETS[val].authorizedDashboards);
                      }
                    }
                  }} 
                  disabled={updateMut.isPending}
                >
                  <SelectTrigger className="h-12 border-slate-100 bg-slate-50/50 rounded-2xl font-bold">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                    {roles.map(r => (
                      <SelectItem key={r.id} value={`role-${r.id}`} className="rounded-xl">{r.name}</SelectItem>
                    ))}
                    {Object.keys(ROLE_PRESETS).map(pk => (
                      <SelectItem key={pk} value={pk} className="rounded-xl">{pk} (Preset)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2"><Building2 className="w-3 h-3" /> Cabang Akses</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border border-slate-100 rounded-[1.5rem] bg-slate-50/30 max-h-32 overflow-y-auto scrollbar-hide">
                  {branches.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 hover:bg-white p-1 rounded-lg transition-colors">
                      <Checkbox 
                        id={`branch-edit-${b.id}`}
                        checked={accessibleBranchIds.includes(b.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setAccessibleBranchIds([...accessibleBranchIds, b.id]);
                          else setAccessibleBranchIds(accessibleBranchIds.filter(id => id !== b.id));
                        }}
                        className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                      />
                      <label htmlFor={`branch-edit-${b.id}`} className="text-[11px] font-bold text-slate-600 leading-none cursor-pointer">
                        {b.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-50 mt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 rounded-2xl font-bold">Batal</Button>
              <Button type="submit" disabled={updateMut.isPending || !username.trim() || !displayName.trim()} className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black px-8 shadow-lg shadow-indigo-100 transition-all">
                {updateMut.isPending ? "Menyimpan..." : "Update Data"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ user, currentUserId }: { user: SafeUser; currentUserId: number }) {
  const [open, setOpen] = useState(false);
  const deleteMut = useDeleteUser();
  const isSelf = user.id === currentUserId;

  const handleConfirm = () => {
    deleteMut.mutate(user.id, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all active:scale-90 focus:outline-none focus:ring-0" disabled={isSelf}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
         <div className="bg-rose-500 h-2 w-full" />
         <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black text-rose-600 tracking-tight flex items-center gap-3">
                <AlertCircle className="w-6 h-6" /> Hapus Pengguna
              </DialogTitle>
            </DialogHeader>
            <div className="mb-8">
              <p className="font-bold text-slate-600 leading-relaxed text-sm">Nonaktifkan akses <span className="text-slate-900 underline">{user.displayName}</span> selamanya?</p>
              <p className="text-[10px] text-rose-400 font-bold uppercase mt-4 bg-rose-50 p-3 rounded-xl">⚠️ Tindakan ini bersifat permanen dan user tidak akan bisa login kembali.</p>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">Batal</Button>
              <Button type="button" variant="destructive" onClick={handleConfirm} disabled={deleteMut.isPending} className="rounded-xl font-black px-6 bg-rose-600 hover:bg-rose-700">
                {deleteMut.isPending ? "Menghapus..." : "Ya, Hapus Akun"}
              </Button>
            </DialogFooter>
         </div>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDialog({ user }: { user: SafeUser }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const isAdmin = user.id === 1;

  const { data: permissions = [], isLoading } = useQuery<UserPermission[]>({
    queryKey: [`/api/users/${user.id}/permissions`],
    enabled: open && !isAdmin,
  });

  const { data: roles = [] } = useRoles();
  const userRole = roles.find(r => r.id === user.roleId);

  const [localPerms, setLocalPerms] = useState<Record<string, { canView: boolean, canInput: boolean, canEdit: boolean, canDelete: boolean, canExport: boolean, canPrint: boolean }>>({}); 
  const [authorizedDashboards, setAuthorizedDashboards] = useState<string[]>(user.authorizedDashboards || ["gudang"]);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!open) {
      hasInitialized.current = false;
      return;
    }

    if (isLoading) return;

    if (!hasInitialized.current) {
      const map: Record<string, { canView: boolean, canInput: boolean, canEdit: boolean, canDelete: boolean, canExport: boolean, canPrint: boolean }> = {};
      if (permissions.length > 0) {
        MENU_KEYS.forEach(m => {
          const p = permissions.find(x => x.menuKey === m.key);
          map[m.key] = {
            canView: p ? (p.canView ?? true) : false,
            canInput: p ? p.canInput : false,
            canEdit: p ? p.canEdit : false,
            canDelete: p ? p.canDelete : false,
            canExport: p ? (p.canExport ?? true) : false,
            canPrint: p ? (p.canPrint ?? true) : false,
          };
        });
      } else {
        MENU_KEYS.forEach(m => {
          map[m.key] = { canView: false, canInput: false, canEdit: false, canDelete: false, canExport: false, canPrint: false };
        });
      }
      setLocalPerms(map);
      setAuthorizedDashboards(user.authorizedDashboards || ["gudang"]);
      hasInitialized.current = true;
    }
  }, [permissions, open, isLoading, user.authorizedDashboards]);

  const updateMut = useMutation({
    mutationFn: async (data: { permissions: any[], authorizedDashboards: string[] }) => {
      await apiRequest("PUT", `/api/users/${user.id}/permissions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/permissions`] });
      toast({ title: "Berhasil", description: "Hak akses berhasil diperbarui" });
      setOpen(false);
    },
    onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const detachRoleMut = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/users/${user.id}`, { 
        roleId: null, 
        role: null 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/permissions`] });
      toast({ title: "Berhasil", description: "Role berhasil dilepas. Sekarang Anda dapat mengatur izin manual." });
      setOpen(false); // Close dialog after detaching role
    },
    onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const handleToggle = (menuKey: string, field: "canView" | "canInput" | "canEdit" | "canDelete" | "canExport" | "canPrint", value: boolean) => {
    setLocalPerms(prev => ({
      ...prev,
      [menuKey]: {
        ...prev[menuKey],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    const payload = MENU_KEYS.map(m => ({
      menuKey: m.key,
      ...localPerms[m.key]
    }));
    updateMut.mutate({ 
      permissions: payload, 
      authorizedDashboards 
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-white hover:bg-amber-500 rounded-lg transition-all active:scale-90 focus:outline-none focus:ring-0">
          <Shield className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-amber-500 h-2 w-full shrink-0" />
        <div className="p-8 flex-1 overflow-hidden flex flex-col">
          <DialogHeader className="mb-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black tracking-tight text-slate-800">Otoritas User</DialogTitle>
                <DialogDescription className="font-bold text-slate-400 text-sm">Sesuaikan hak akses spesifik untuk <span className="text-slate-900">{user.displayName}</span>.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-hide space-y-8 pb-8">
            {isAdmin ? (
              <div className="py-20 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 no-default-hover-elevate font-black px-6 py-2 rounded-xl text-xs uppercase tracking-widest">Full Access (Root Administrator)</Badge>
                <p className="text-sm font-bold text-slate-400 mt-6 max-w-xs mx-auto leading-relaxed">User root memiliki kendali mutlak atas seluruh sistem tanpa pengecualian.</p>
              </div>
            ) : userRole ? (
              <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Role Terikat Aktif</p>
                      <p className="text-lg font-black text-slate-800 uppercase tracking-tight">{userRole.name}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => detachRoleMut.mutate()}
                    disabled={detachRoleMut.isPending}
                    className="rounded-xl border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    {detachRoleMut.isPending ? "Melepas..." : "Lepas Role & Edit Manual"}
                  </Button>
                </div>
                <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
                  Seluruh hak akses di bawah ini diatur secara otomatis melalui <span className="text-indigo-600 font-black">Manajemen Role</span>. 
                  Anda tidak dapat mengubahnya di sini kecuali Role dilepaskan terlebih dahulu.
                </p>
              </div>
            ) : isLoading ? (
              <div className="py-20 text-center space-y-4">
                 <div className="h-10 w-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
                 <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Izin...</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Modul Dashboard Aktif</Label>
                  <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-4", userRole && "opacity-50 pointer-events-none")}>
                    {[
                      { id: "salesman", label: "Salesman", icon: Monitor },
                      { id: "admin", label: "Admin", icon: ShieldCheck },
                      { id: "gudang", label: "Gudang", icon: Building2 },
                      { id: "promo_toko", label: "Promo", icon: UserPlus },
                    ].map((d) => {
                      const isActive = authorizedDashboards.includes(d.id);
                      return (
                        <div 
                          key={d.id} 
                          onClick={() => {
                            if (isActive) setAuthorizedDashboards(authorizedDashboards.filter(id => id !== d.id));
                            else setAuthorizedDashboards([...authorizedDashboards, d.id]);
                          }}
                          className={cn(
                            "group cursor-pointer p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden",
                            isActive 
                              ? "bg-amber-50 border-amber-200 shadow-sm" 
                              : "bg-white border-slate-100 hover:border-slate-200"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center mb-3 transition-colors",
                            isActive ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-400"
                          )}>
                            <d.icon className="w-4 h-4" />
                          </div>
                          <span className={cn(
                            "text-xs font-black uppercase tracking-tight",
                            isActive ? "text-amber-700" : "text-slate-400"
                          )}>{d.label}</span>
                          <div className="absolute top-3 right-3">
                             <Checkbox 
                               checked={isActive} 
                               onCheckedChange={() => {
                                 if (isActive) setAuthorizedDashboards(authorizedDashboards.filter(id => id !== d.id));
                                 else setAuthorizedDashboards([...authorizedDashboards, d.id]);
                               }}
                               className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                             />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Detail Hak Akses Menu</Label>
                  <div className={cn("space-y-10", userRole && "opacity-50 pointer-events-none")}>
                    {DASHBOARD_SECTIONS.map((section) => (
                      <div key={section.title} className="space-y-4">
                        <div className="flex items-center gap-3">
                           <div className="h-1 w-8 bg-amber-500 rounded-full" />
                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{section.title}</h3>
                        </div>
                        <div className="rounded-[2rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
                          <Table>
                            <TableHeader className="bg-slate-50/80">
                              <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="font-black text-[10px] uppercase text-slate-400 h-10 px-6">Fitur</TableHead>
                                <TableHead className="text-center w-12 font-black text-[10px] uppercase text-slate-400 h-10">View</TableHead>
                                <TableHead className="text-center w-12 font-black text-[10px] uppercase text-slate-400 h-10">Add</TableHead>
                                <TableHead className="text-center w-12 font-black text-[10px] uppercase text-slate-400 h-10">Edit</TableHead>
                                <TableHead className="text-center w-12 font-black text-[10px] uppercase text-slate-400 h-10">Del</TableHead>
                                <TableHead className="text-center w-12 font-black text-[10px] uppercase text-slate-400 h-10">Exp</TableHead>
                                <TableHead className="text-center w-12 font-black text-[10px] uppercase text-slate-400 h-10">Prt</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {MENU_KEYS.filter(m => section.menus.includes(m.key)).map((menu) => (
                                <TableRow key={menu.key} className="hover:bg-amber-50/30 transition-colors border-slate-50">
                                  <TableCell className="font-bold text-xs text-slate-600 py-4 px-6">{menu.label}</TableCell>
                                  <TableCell className="text-center py-2">
                                    {MENU_CAPABILITIES[menu.key]?.view ? (
                                      <Checkbox 
                                        checked={localPerms[menu.key]?.canView || false} 
                                        onCheckedChange={(checked) => handleToggle(menu.key, "canView", checked === true)}
                                        className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                      />
                                    ) : <span className="text-[8px] text-slate-200 font-bold">—</span>}
                                  </TableCell>
                                  <TableCell className="text-center py-2">
                                    {MENU_CAPABILITIES[menu.key]?.input ? (
                                      <Checkbox 
                                        checked={localPerms[menu.key]?.canInput || false} 
                                        onCheckedChange={(checked) => handleToggle(menu.key, "canInput", checked === true)}
                                        className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                      />
                                    ) : <span className="text-[8px] text-slate-200 font-bold">—</span>}
                                  </TableCell>
                                  <TableCell className="text-center py-2">
                                    {MENU_CAPABILITIES[menu.key]?.edit ? (
                                      <Checkbox 
                                        checked={localPerms[menu.key]?.canEdit || false} 
                                        onCheckedChange={(checked) => handleToggle(menu.key, "canEdit", checked === true)}
                                        className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                      />
                                    ) : <span className="text-[8px] text-slate-200 font-bold">—</span>}
                                  </TableCell>
                                  <TableCell className="text-center py-2">
                                    {MENU_CAPABILITIES[menu.key]?.delete ? (
                                      <Checkbox 
                                        checked={localPerms[menu.key]?.canDelete || false} 
                                        onCheckedChange={(checked) => handleToggle(menu.key, "canDelete", checked === true)}
                                        className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                      />
                                    ) : <span className="text-[8px] text-slate-200 font-bold">—</span>}
                                  </TableCell>
                                  <TableCell className="text-center py-2">
                                    {MENU_CAPABILITIES[menu.key]?.export ? (
                                      <Checkbox 
                                        checked={localPerms[menu.key]?.canExport || false} 
                                        onCheckedChange={(checked) => handleToggle(menu.key, "canExport", checked === true)}
                                        className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                      />
                                    ) : <span className="text-[8px] text-slate-200 font-bold">—</span>}
                                  </TableCell>
                                  <TableCell className="text-center py-2">
                                    {MENU_CAPABILITIES[menu.key]?.print ? (
                                      <Checkbox 
                                        checked={localPerms[menu.key]?.canPrint || false} 
                                        onCheckedChange={(checked) => handleToggle(menu.key, "canPrint", checked === true)}
                                        className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 rounded"
                                      />
                                    ) : <span className="text-[8px] text-slate-200 font-bold">—</span>}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="shrink-0 pt-6 border-t border-slate-50 gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 rounded-2xl font-bold">Batal</Button>
            {!isAdmin && (
              <Button onClick={handleSave} disabled={updateMut.isPending} className="h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black px-10 shadow-lg shadow-amber-100 transition-all">
                {updateMut.isPending ? "Menyimpan Paksa..." : "Simpan Hak Akses"}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const { selectedBranch } = useBranch();
  const { data: users = [], isLoading } = useUsers(selectedBranch?.id);
  const { data: roles = [] } = useRoles(selectedBranch?.id);
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();
  const { branches } = useBranch();
  const [location, setLocation] = useLocation();
  const { settings } = useSettings();
  
  const [search, setSearch] = useState("");
  const [openPreview, setOpenPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const isAdminPath = location.startsWith("/admin");
  const isAdmin = currentUser?.id === 1;

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const usersByBranch = filteredUsers.reduce((acc, user) => {
    const bid = user.branchId || -1;
    if (!acc[bid]) acc[bid] = [];
    acc[bid].push(user);
    return acc;
  }, {} as Record<number, SafeUser[]>);

  const sortedBranchIds = Object.keys(usersByBranch)
    .map(Number)
    .sort((a, b) => {
      if (a === -1) return -1;
      if (b === -1) return 1;
      const nameA = branches.find(br => br.id === a)?.name || "";
      const nameB = branches.find(br => br.id === b)?.name || "";
      return nameA.localeCompare(nameB);
    });

  const handleExportExcel = () => {
    const dataToExport = users.map((u, index) => ({
      "No": index + 1,
      "ID": u.id,
      "Nama Lengkap": u.displayName,
      "Username": u.username,
      "Status": "Aktif"
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Manajemen Pengguna");
    XLSX.writeFile(wb, `manajemen-pengguna-${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Laporan Manajemen Pengguna", 14, 16);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 23);
    
    const tableData = users.map((u, index) => [
      index + 1,
      u.id,
      u.displayName,
      u.username,
      "Aktif"
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["No", "ID", "Nama Lengkap", "Username", "Status"]],
      body: tableData,
      headStyles: { fillColor: [51, 65, 85], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 20 },
        4: { cellWidth: 20 }
      }
    });
    
    doc.save(`manajemen-pengguna-${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
  };

  const handlePrint = () => setOpenPreview(true);

  const doPrint = () => {
    const printContent = printRef.current?.innerHTML;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win || !printContent) return;
    win.document.write(`
      <html>
        <head>
          <title>Laporan Manajemen Pengguna</title>
          <style>
            body { font-family: sans-serif; font-size: 12px; color: #111; }
            h2 { margin-bottom: 4px; }
            p { margin: 0 0 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #334155; color: #fff; padding: 6px 10px; text-align: left; font-size: 11px; }
            td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
            tr:nth-child(even) td { background: #f9fafb; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <>
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
                   onClick={() => setLocation(isAdminPath ? "/admin" : "/master")}
                   className="p-2 hover:bg-white/10 rounded-full transition-colors"
                 >
                    <ArrowLeft className="w-6 h-6" />
                 </button>
                 <div>
                  <h1 className="text-xl md:text-3xl font-black tracking-tight leading-none drop-shadow-md">
                    {isAdminPath ? "Manajemen Pengguna" : settings?.masterUserTitle || "Hak Akses"}
                  </h1>
                  <p className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">
                    {isAdminPath ? "Kelola Profil & Hak Akses Personel" : settings?.masterUserDescription || "Kelola kredensial tim Anda."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {(isAdmin || can("manajemen_pengguna", "export")) && (
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-sm rounded-xl px-4">
                          <Download className="w-4 h-4" />
                          <span className="font-bold">Export</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 w-48">
                        <DropdownMenuItem onClick={handlePrint} className="rounded-xl py-3 font-bold cursor-pointer gap-3">
                          <Monitor className="w-4 h-4 text-slate-400" />
                          <span>Print Layar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportExcel} className="rounded-xl py-3 font-bold cursor-pointer gap-3">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                          <span>Excel</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF} className="rounded-xl py-3 font-bold cursor-pointer gap-3">
                          <FileText className="w-4 h-4 text-rose-500" />
                          <span>PDF</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                {isAdminPath && (isAdmin || can("manajemen_pengguna", "input")) && (
                  <div className="flex-1 md:flex-none">
                    <AddUserDialog />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Statistics Card */}
        <div className="max-w-7xl mx-auto px-1 sm:px-4 -mt-10 mb-8 relative z-20">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-indigo-100/50 overflow-hidden">
            <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 bg-white">
              <div className="relative flex-1 w-full group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <Input 
                  placeholder="Cari nama atau username..." 
                  className="h-14 pl-14 pr-6 rounded-2xl border-slate-100 bg-slate-50/50 font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all text-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                 <div className="px-6 py-2 border-r border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Aktif</p>
                    <p className="text-2xl font-black text-indigo-600 leading-none">{users.length}</p>
                 </div>
                 <div className="px-6 py-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Hasil Filter</p>
                    <p className="text-2xl font-black text-blue-500 leading-none">{filteredUsers.length}</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-1 sm:px-4 space-y-4 pb-20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-slate-50">
               <div className="h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Menyinkronkan Personel...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2.5rem] shadow-sm border border-slate-50">
               <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                  <Search className="h-10 w-10" />
               </div>
               <p className="text-slate-900 font-black text-xl mb-2">Tidak ditemukan</p>
               <p className="text-slate-400 font-bold max-w-xs mx-auto text-sm">Coba kata kunci lain untuk menemukan personel yang Anda cari.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="w-20 pl-8 font-black text-[10px] uppercase text-slate-400 h-14">#</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-slate-400 h-14">Pimpinan / Personel</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-slate-400 h-14">Kredensial</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-slate-400 h-14">Cabang Akses</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-slate-400 h-14">Status</TableHead>
                      <TableHead className="text-right pr-8 font-black text-[10px] uppercase text-slate-400 h-14">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBranchIds.map((branchId) => (
                      <React.Fragment key={branchId}>
                        <TableRow className="bg-slate-100/30 border-none hover:bg-slate-100/30">
                          <TableCell colSpan={6} className="py-2 px-8">
                             <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                  {branchId === -1 ? "Belum Diatur / Pusat" : branches.find(b => b.id === branchId)?.name || "Cabang Tidak Dikenal"}
                                </span>
                                <div className="h-px flex-1 bg-slate-200/50 ml-2" />
                             </div>
                          </TableCell>
                        </TableRow>
                        {usersByBranch[branchId].map((user, idx) => (
                          <TableRow key={user.id} className="group hover:bg-slate-50 transition-colors border-slate-50">
                            <TableCell className="pl-8 text-slate-300 font-black text-sm">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-4 py-2">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg shadow-sm">
                                   {user.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                   <div className="flex items-center gap-2">
                                     <p className="font-black text-slate-800 tracking-tight">{user.displayName}</p>
                                     {user.id === currentUser?.id && (
                                       <Badge className="bg-green-100 text-green-700 hover:bg-green-100 font-black text-[9px] uppercase tracking-tighter px-2 h-5 rounded-full border-none">Saya</Badge>
                                     )}
                                   </div>
                                   <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                     {user.roleId ? roles.find(r => r.id === user.roleId)?.name : user.role || "PERSONEL"}
                                   </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                               <div className="flex items-center gap-2 bg-slate-50 w-fit px-3 py-1.5 rounded-xl border border-slate-100">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-mono text-xs font-bold text-slate-600">@{user.username}</span>
                               </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {user.accessibleBranchIds?.length > 0 ? (
                                   user.accessibleBranchIds.slice(0, 2).map(bid => (
                                     <Badge key={bid} variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-500 px-2 h-6 rounded-lg bg-white whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
                                       {branches.find(b => b.id === bid)?.name}
                                     </Badge>
                                   ))
                                ) : (
                                   <Badge variant="outline" className="text-[10px] font-bold border-dashed border-slate-200 text-slate-400 px-2 h-6 rounded-lg bg-slate-50 underline decoration-slate-200 underline-offset-2">Pusat</Badge>
                                )}
                                {user.accessibleBranchIds?.length > 2 && <span className="text-[10px] font-black text-slate-300">+{user.accessibleBranchIds.length - 2}</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                               <div className="flex items-center gap-1.5 text-[10px] font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-full w-fit border border-green-100 shadow-sm shadow-green-50">
                                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                  ACTIVE
                               </div>
                            </TableCell>
                            <TableCell className="text-right pr-8">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(isAdmin || can("manajemen_pengguna", "edit")) && <PermissionsDialog user={user} />}
                                {isAdminPath && (isAdmin || can("manajemen_pengguna", "edit")) && <EditUserDialog user={user} />}
                                {isAdminPath && (isAdmin || can("manajemen_pengguna", "delete")) && <DeleteUserDialog user={user} currentUserId={currentUser?.id ?? -1} />}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View / Smaller Screens Card Layout */}
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedBranchIds.map((branchId) => (
                  <div key={branchId} className="space-y-4">
                    <div className="flex items-center gap-3 px-4 pt-4">
                       <Building2 className="w-4 h-4 text-indigo-500" />
                       <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                         {branchId === 0 ? "Global / Superadmin" : branches.find(b => b.id === branchId)?.name || "Cabang Tidak Dikenal"}
                       </h4>
                       <div className="h-px flex-1 bg-slate-100" />
                       <Badge variant="secondary" className="bg-slate-100 text-slate-400 border-none font-black text-[9px] h-5 rounded-full">
                         {usersByBranch[branchId].length}
                       </Badge>
                    </div>
                    {usersByBranch[branchId].map((user) => (
                      <div key={user.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 space-y-5 relative overflow-hidden group active:scale-95 transition-all">
                        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <ShieldCheck className="w-12 h-12 text-slate-50 -rotate-12" />
                        </div>
                        <div className="flex justify-between items-start relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-[1.25rem] bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-100">
                              {user.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-black text-slate-800 tracking-tight text-lg">{user.displayName}</h3>
                                {user.id === currentUser?.id && (
                                  <Badge className="bg-green-100 text-green-700 border-none font-black text-[8px] h-4 rounded-full px-1.5 uppercase">Anda</Badge>
                                )}
                              </div>
                              <p className="font-mono text-xs font-bold text-slate-400 tracking-tight">@{user.username}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3 relative z-10">
                           <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-none font-black text-[9px] uppercase tracking-wider py-1 px-3 rounded-xl shadow-sm shadow-indigo-50">
                                {user.roleId ? roles.find(r => r.id === user.roleId)?.name : user.role || "PERSONEL"}
                              </Badge>
                           </div>
                           
                           <div className="flex flex-wrap gap-1.5">
                              {user.accessibleBranchIds?.length > 0 ? (
                                 user.accessibleBranchIds.slice(0, 3).map(bid => (
                                   <div key={bid} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                      <MapPin className="w-2.5 h-2.5 text-slate-300" />
                                      <span className="text-[9px] font-bold text-slate-500">{branches.find(b => b.id === bid)?.name}</span>
                                   </div>
                                 ))
                              ) : (
                                 <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 border-dashed">
                                    <Building2 className="w-2.5 h-2.5 text-slate-300" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Akses Global</span>
                                 </div>
                              )}
                              {user.accessibleBranchIds?.length > 3 && (
                                <div className="h-5 w-5 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                   <span className="text-[9px] font-black text-indigo-400">+{user.accessibleBranchIds.length - 3}</span>
                                </div>
                              )}
                           </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 relative z-10">
                           <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Aktif</span>
                           </div>
                           <div className="flex gap-1">
                              {(isAdmin || can("manajemen_pengguna", "edit")) && <PermissionsDialog user={user} />}
                              {isAdminPath && (isAdmin || can("manajemen_pengguna", "edit")) && <EditUserDialog user={user} />}
                              {isAdminPath && (isAdmin || can("manajemen_pengguna", "delete")) && <DeleteUserDialog user={user} currentUserId={currentUser?.id ?? -1} />}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Print Preview Dialog */}
        <Dialog open={openPreview} onOpenChange={setOpenPreview}>
          <DialogContent className="max-w-5xl h-[90vh] flex flex-col rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-indigo-600 h-2 w-full shrink-0" />
            <div className="p-8 flex-1 overflow-hidden flex flex-col">
              <DialogHeader className="mb-6 shrink-0">
                <DialogTitle className="text-3xl font-black tracking-tight flex items-center gap-3">
                   <Monitor className="w-8 h-8 text-indigo-600" /> Preview Laporan
                </DialogTitle>
                <DialogDescription className="font-bold text-slate-400 font-premium">Versi cetak daftar manajemen pengguna sistem.</DialogDescription>
              </DialogHeader>
              <div 
                ref={printRef} 
                className="flex-1 overflow-y-auto pr-2 border border-slate-100 rounded-[1.5rem] bg-white p-8 mb-6 shadow-inner"
              >
                <div className="mb-8 border-b-2 border-slate-900 pb-4 flex justify-between items-end">
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Manajemen Pengguna</h2>
                      <p className="text-xs font-bold text-slate-500 mt-1">Sistem Pemantauan Gudang Ferio</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Tanggal Cetak</p>
                      <p className="text-xs font-bold text-slate-900">{format(new Date(), "dd/MM/yyyy HH:mm", { locale: idLocale })}</p>
                   </div>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="px-4 py-3 text-left w-16 font-black text-[10px] uppercase">ID</th>
                      <th className="px-4 py-3 text-left font-black text-[10px] uppercase">Nama Lengkap</th>
                      <th className="px-4 py-3 text-left font-black text-[10px] uppercase">Username</th>
                      <th className="px-4 py-3 text-left w-32 font-black text-[10px] uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} className={cn("border-b border-slate-100", i % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                        <td className="px-4 py-3 text-xs font-bold text-slate-400 italic">#{u.id}</td>
                        <td className="px-4 py-3 text-xs font-black text-slate-800">{u.displayName}</td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-500">@{u.username}</td>
                        <td className="px-4 py-3 text-xs font-black text-green-600">AKTIF</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DialogFooter className="shrink-0 gap-2 border-t border-slate-50 pt-6">
                <Button variant="ghost" onClick={() => setOpenPreview(false)} className="h-12 rounded-2xl font-bold">Tutup Preview</Button>
                <Button onClick={doPrint} className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black px-12 shadow-lg shadow-indigo-100">
                  <Monitor className="w-5 h-5 mr-3" /> Konfirmasi Cetak
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
