import { useEffect } from "react";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useBranch } from "@/hooks/use-branch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LayoutDashboard, Users, Truck, ShoppingBag, ShieldCheck, Building2, MapPin, ChevronDown, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function RoleSelection() {
  const { user } = useAuth();
  const { mutate: logout } = useLogout();
  const [, setLocation] = useLocation();
  const { branches, selectedBranchId, setSelectedBranchId, selectedBranch } = useBranch();

  const dashboards = [
    {
      id: "salesman",
      title: "Salesman",
      description: "Kelola pesanan, pelanggan, dan target penjualan",
      icon: ShoppingBag,
      color: "bg-blue-500",
      textColor: "text-blue-500",
      path: "/salesman",
    },
    {
      id: "admin",
      title: "Administrator",
      description: "Manajemen sistem, pengguna, dan data master",
      icon: ShieldCheck,
      color: "bg-purple-500",
      textColor: "text-purple-500",
      path: "/admin",
    },
    {
      id: "gudang",
      title: "Gudang & Pengiriman",
      description: "Monitor stok, packing, dan status pengiriman",
      icon: Truck,
      color: "bg-orange-500",
      textColor: "text-orange-500",
      path: "/gudang",
    },
    {
      id: "promo_toko",
      title: "Promo Toko",
      description: "Input dan pantau promo toko yang sedang berlangsung",
      icon: ShoppingBag,
      color: "bg-pink-500",
      textColor: "text-pink-500",
      path: "/promo",
    },
  ];

  const { can } = usePermissions();

  const authorizedDashboards = dashboards.filter((d) => {
    const isBasicAuth = user?.authorizedDashboards?.includes(d.id);
    if (d.id === "admin") {
      return isBasicAuth || can("manajemen_pengguna", "view") || user?.id === 1;
    }
    if (user?.id === 1) return true;
    return isBasicAuth;
  });

  // Auto-navigate ONLY if they have exactly one branch. 
  // If they have more, let them choose.
  useEffect(() => {
    if (branches.length === 1 && selectedBranchId) {
      setLocation("/");
    }
  }, [branches.length, selectedBranchId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-indigo-50">
      <div className="max-w-md w-full">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center mb-10"
        >
          <div className="mx-auto w-20 h-20 bg-white rounded-3xl shadow-xl shadow-indigo-100 flex items-center justify-center mb-6">
             <Building2 className="w-10 h-10 text-indigo-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            Pilih <span className="text-indigo-600">Cabang</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-[280px] mx-auto">
            Tentukan lokasi unit cabang utama sebelum masuk ke aplikasi utama.
          </p>
        </motion.div>

        {branches.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-none shadow-2xl shadow-indigo-100/50 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-xl">
               <CardContent className="p-8">
                 <div className="space-y-6">
                    <Select 
                      value={selectedBranchId?.toString()} 
                      onValueChange={(val) => {
                         setSelectedBranchId(parseInt(val));
                         setLocation("/");
                      }}
                    >
                      <SelectTrigger className="w-full h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-700 focus:ring-indigo-500 focus:border-indigo-500 text-base">
                        <SelectValue placeholder="Ketuk untuk memilih cabang..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id.toString()} className="rounded-lg py-3.5 font-bold cursor-pointer transition-colors focus:bg-indigo-50 focus:text-indigo-700">
                            Cabang {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button 
                      onClick={() => logout()}
                      variant="ghost" 
                      className="w-full text-slate-400 hover:text-red-500 hover:bg-red-50 font-bold rounded-xl h-12"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Kembali / Logout
                    </Button>
                 </div>
               </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="text-center bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
             <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-red-400" />
             </div>
             <p className="font-bold text-slate-700 mb-6">Anda tidak memiliki akses ke cabang mana pun.</p>
             <Button onClick={() => logout()} className="bg-slate-900 rounded-xl px-8">Logout</Button>
          </div>
        )}
        
        <div className="mt-12 text-center text-slate-400 text-[11px] uppercase tracking-widest font-bold">
          Super App Engine &copy; 2026
        </div>
      </div>
    </div>
  );
}
