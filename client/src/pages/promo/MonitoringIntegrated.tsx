
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, RefreshCw, Trophy, Target, ArrowRight, CheckCircle2, 
  Ticket, Coins, Tag, Search, TrendingUp, Users, DollarSign,
  ChevronRight, Info, History as HistoryIcon, Star, Scissors, Package,
  AlertTriangle, Bell, Mail, MessageSquare, Send, 
  Filter, SortAsc, LayoutGrid, ListFilter, X
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useBranch } from "@/hooks/use-branch";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';

import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function MonitoringPromo() {
  const { selectedBranchId } = useBranch();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("REVENUE_DESC");
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");
  const [openDetail, setOpenDetail] = useState(false);

  // Reminder State
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<any>(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const [bulkReminderOpen, setBulkReminderOpen] = useState(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState<string[]>([]);
  const [modalFilterStatus, setModalFilterStatus] = useState<string>("ALL");

  
  const { data: monitoring, isLoading, refetch, isFetching } = useQuery<any[]>({
    queryKey: ["/api/promo/monitoring", { branchId: selectedBranchId }],
    queryFn: async () => {
       const res = await fetch(`/api/promo/monitoring?branchId=${selectedBranchId}`);
       if (!res.ok) throw new Error("Gagal mengambil data monitoring");
       return res.json();
    },
    enabled: !!selectedBranchId
  });

  const { data: details = [], isLoading: loadingDetail } = useQuery<any[]>({
    queryKey: ["/api/promo/monitoring", selectedCustomerId, { branchId: selectedBranchId }],
    queryFn: async () => {
       if (!selectedCustomerId) return [];
       const res = await fetch(`/api/promo/monitoring/${selectedCustomerId}?branchId=${selectedBranchId}`);
       if (!res.ok) throw new Error("Gagal mengambil detail transaksi");
       return res.json();
    },
    enabled: !!selectedCustomerId && openDetail
  });

  const filteredData = useMemo(() => {
    if (!monitoring) return [];
    
    let result = monitoring.filter(item => 
      ((item.pelangganNama?.toLowerCase() || "").includes(search.toLowerCase()) ||
       (item.customerCode?.toLowerCase() || "").includes(search.toLowerCase()))
    );

    // Apply Status Filter
    if (filterStatus !== "ALL") {
      if (filterStatus === "EARNED") {
        result = result.filter(item => item.totalReward > 0);
      } else {
        result = result.filter(item => item.customerStatus === filterStatus);
      }
    }

    // Apply Promo Type Filter
    if (filterType !== "ALL") {
      result = result.filter(item => 
        item.activePromos?.some((p: any) => p.type === filterType)
      );
    }

    // Apply Sorting
    result.sort((a, b) => {
      if (sortBy === "REVENUE_DESC") return b.totalOmzet - a.totalOmzet;
      if (sortBy === "REVENUE_ASC") return a.totalOmzet - b.totalOmzet;
      if (sortBy === "PROGRESS_ASC") {
        const minA = a.activePromos?.length > 0 ? Math.min(...a.activePromos.map((p: any) => p.progressPercent)) : 100;
        const minB = b.activePromos?.length > 0 ? Math.min(...b.activePromos.map((p: any) => p.progressPercent)) : 100;
        return minA - minB;
      }
      return 0;
    });

    return result;
  }, [monitoring, search, filterStatus, filterType, sortBy]);

  const stats = useMemo(() => {
    if (!monitoring) return { totalOmzet: 0, totalReward: 0, countFaktur: 0, avgReward: 0, needReminder: 0, safe: 0, onTrack: 0, warning: 0, critical: 0, hangus: 0, expired: 0 };
    
    let safe = 0, onTrack = 0, warning = 0, critical = 0, hangus = 0, expired = 0;
    const totals = monitoring.reduce((acc, curr) => {
      const s = curr.customerStatus?.toUpperCase();
      if (s === 'SAFE') safe++;
      else if (s === 'ON TRACK') onTrack++;
      else if (s === 'WARNING') warning++;
      else if (s === 'CRITICAL') critical++;
      else if (s === 'HANGUS') hangus++;
      else if (s === 'EXPIRED') expired++;

      return {
        totalOmzet: acc.totalOmzet + (Number(curr.totalOmzet) || 0),
        totalReward: acc.totalReward + (Number(curr.totalReward) || 0),
        countFaktur: acc.countFaktur + (Number(curr.countFaktur) || 0),
        needReminder: acc.needReminder + (s === 'WARNING' || s === 'CRITICAL' ? 1 : 0)
      };
    }, { totalOmzet: 0, totalReward: 0, countFaktur: 0, needReminder: 0 });
    
    return {
      ...totals,
      safe, onTrack, warning, critical, hangus, expired,
      avgReward: totals.totalOmzet > 0 ? (totals.totalReward / totals.totalOmzet) * 100 : 0
    };
  }, [monitoring]);

  const handleOpenReminder = (customer: any) => {
    const promo = customer.activePromos?.find((p: any) => p.status === 'WARNING' || p.status === 'CRITICAL') || customer.activePromos?.[0];
    if (!promo) return;

    setReminderTarget(customer);
    const isQty = promo.basisType === 'qty';
    const unitPrefix = isQty ? "" : "Rp ";
    const unitSuffix = isQty ? " Qty" : "";
    const progressText = typeof promo.progressPercent === 'number' ? promo.progressPercent.toFixed(1) : "0";
    const msg = `Halo ${customer.pelangganNama}, promo ${promo.name} Anda saat ini mencapai ${progressText}%. Kurang ${unitPrefix}${(promo.remainingValue ?? 0).toLocaleString()}${unitSuffix} lagi untuk mencapai target. Sisa ${promo.daysLeft} hari lagi di bulan ini. Semangat!`;
    setReminderMessage(msg);
    setReminderOpen(true);
  };

  const sendReminder = () => {
    toast({
      title: "Reminder Terkirim",
      description: `Pesan telah dikirim ke ${reminderTarget.pelangganNama}`,
    });
    setReminderOpen(false);
  };


  const chartData = useMemo(() => {
    if (!monitoring) return [];
    return [...monitoring]
      .sort((a, b) => (b.totalOmzet || 0) - (a.totalOmzet || 0))
      .slice(0, 8)
      .map(m => ({
        name: (m.pelangganNama || "??").split(' ')[0],
        omzet: m.totalOmzet || 0,
        reward: m.totalReward || 0,
        percent: (m.totalOmzet || 0) > 0 ? Math.min(100, ((m.totalReward || 0) / (m.totalOmzet || 1)) * 500) : 0 
      }));
  }, [monitoring]);

  const reminderRecap = useMemo(() => {
    if (!monitoring) return [];
    const rows: any[] = [];
    monitoring.forEach(entry => {
      entry.activePromos?.forEach((promo: any) => {
        // Tampilkan hanya WARNING atau CRITICAL
        if (promo.status === 'WARNING' || promo.status === 'CRITICAL') {
          rows.push({
            id: `${entry.id}-${promo.id}`,
            pelangganId: entry.pelangganId,
            pelangganNama: entry.pelangganNama,
            customerCode: entry.customerCode,
            promoName: promo.name,
            type: promo.type,
            progress: promo.progressPercent,
            currentValue: promo.currentValue,
            targetValue: promo.targetValue,
            remainingValue: promo.remainingValue,
            daysLeft: promo.daysLeft,
            status: promo.status,
            basisType: promo.basisType || 'rp'
          });
        }
      });
    });
    return rows;
  }, [monitoring]);

  const filteredRecap = useMemo(() => {
    if (modalFilterStatus === "ALL") return reminderRecap;
    return reminderRecap.filter(r => r.status === modalFilterStatus);
  }, [reminderRecap, modalFilterStatus]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[80vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="text-muted-foreground animate-pulse font-medium">Menyusun Dashboard Premium...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 md:p-8 space-y-8 bg-slate-50/30 min-h-screen">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 to-blue-500 bg-clip-text text-transparent">
              Monitoring Promo Terpadu
            </h1>
            <p className="text-slate-500 mt-1 font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Omni-Channel Reward Tracking System
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-64 md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input 
                placeholder="Cari Nama atau Kode Pelanggan..." 
                className="pl-10 bg-white border-2 border-slate-100 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl shadow-sm transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button 
               onClick={() => refetch()} 
               disabled={isFetching}
               className="p-3 rounded-xl bg-white border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 shadow-sm transition-all active:scale-95"
            >
              <RefreshCw className={`h-5 w-5 text-indigo-600 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* QUICK STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
          {[
            { label: "Total Omzet", value: `Rp ${(stats.totalOmzet ?? 0).toLocaleString()}`, icon: DollarSign, sub: "Seluruh Transaksi", color: "from-indigo-600 to-blue-700" },
            { label: "Total Reward", value: `Rp ${(stats.totalReward ?? 0).toLocaleString()}`, icon: Ticket, sub: "Cashback/Diskon", color: "from-emerald-500 to-teal-600" },
            { label: "Reminder", value: `${stats.needReminder ?? 0} PLG`, icon: Bell, sub: `${stats.critical} CRITICAL | ${stats.warning} WARNING`, color: "from-rose-500 to-red-600", pulse: stats.needReminder > 0 },
            { label: "Status Sehat", value: `${(stats.safe ?? 0) + (stats.onTrack ?? 0)} PLG`, icon: Target, sub: `${stats.safe} SAFE | ${stats.onTrack} ON TRACK`, color: "from-blue-500 to-indigo-600" },
            { label: "Hangus / Expired", value: `${(stats.hangus ?? 0) + (stats.expired ?? 0)} PLG`, icon: HistoryIcon, sub: `${stats.hangus} HANGUS | ${stats.expired} EXPIRED`, color: "from-slate-500 to-slate-700" }
          ].map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i}
            >
              <Card className="border-none shadow-lg overflow-hidden group">
                <CardContent className="p-0">
                  <div className={`p-6 bg-gradient-to-br ${stat.color} text-white relative`}>
                    <stat.icon className={`absolute right-4 top-4 h-12 w-12 opacity-20 group-hover:scale-110 transition-transform ${stat.pulse ? 'animate-pulse' : ''}`} />
                    <p className="text-xs font-medium opacity-80 uppercase tracking-wider">{stat.label}</p>
                    <h3 className="text-xl font-bold mt-1">{stat.value}</h3>
                    <p className="text-[10px] mt-2 opacity-70 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {stat.sub}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CHART SECTION */}
          <Card className="lg:col-span-1 border-none shadow-xl bg-white rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Progress Top 8
              </CardTitle>
              <CardDescription>Peringkat omzet transaksi tertinggi</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                      <RechartsTooltip 
                        cursor={{ fill: 'transparent' }} 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-2 border rounded shadow-lg text-[10px]">
                                <p className="font-bold">{payload[0].payload.name}</p>
                                <p className="text-indigo-600">Progress: {Number(payload[0].value || 0).toLocaleString()}</p>
                                <p className="text-slate-400">Target: {Number(payload[0].payload.target || 0).toLocaleString()}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="omzet" radius={[0, 4, 4, 0]} barSize={20}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={'#6366f1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 italic text-sm">
                     <Target className="h-10 w-10 mb-2 opacity-20" />
                     Belum ada progress paket
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CUSTOMER GRID */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                Daftar Pelanggan 
                <Badge variant="outline" className="bg-white">{filteredData.length}</Badge>
              </h2>
              
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 bg-white rounded-lg">
                      <Filter className="h-3.5 w-3.5" />
                      Status: {filterStatus}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFilterStatus("ALL")}>Semua Status</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("SAFE")} className="text-emerald-600 font-medium">🟢 SAFE</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("ON TRACK")} className="text-blue-600 font-medium">🔵 ON TRACK</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("WARNING")} className="text-amber-600 font-medium">🟡 WARNING</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("CRITICAL")} className="text-rose-600 font-medium">🔴 CRITICAL</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("HANGUS")} className="text-orange-600 font-medium">🟠 HANGUS</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("EXPIRED")} className="text-slate-500 font-medium">⚫ EXPIRED</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 bg-white rounded-lg">
                      <SortAsc className="h-3.5 w-3.5" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Urutkan Berdasarkan</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy("REVENUE_DESC")}>Omzet Tertinggi</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("REVENUE_ASC")}>Omzet Terendah</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("PROGRESS_ASC")}>Progress Terendah (⚠️)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  size="sm" 
                  variant="default"
                  disabled={stats.needReminder === 0}
                  className="h-8 gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4"
                  onClick={() => setBulkReminderOpen(true)}
                >
                  <Bell className="h-3.5 w-3.5" />
                  Reminder Semua
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 px-2 mb-2">
               <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /> <span className="text-[10px] font-bold text-slate-500 uppercase">SAFE (100%)</span></div>
               <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /> <span className="text-[10px] font-bold text-slate-500 uppercase">ON TRACK (Tepat Waktu)</span></div>
               <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /> <span className="text-[10px] font-bold text-slate-500 uppercase">WARNING (Tertinggal)</span></div>
               <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500" /> <span className="text-[10px] font-bold text-slate-500 uppercase">CRITICAL (Jauh Tertinggal)</span></div>
               <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-orange-500" /> <span className="text-[10px] font-bold text-slate-500 uppercase">HANGUS (Tidak Tercapai)</span></div>
               <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-slate-400" /> <span className="text-[10px] font-bold text-slate-500 uppercase">EXPIRED (Selesai)</span></div>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <AnimatePresence mode="popLayout">
                {filteredData.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200"
                  >
                    <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">Pelanggan tidak ditemukan</p>
                  </motion.div>
                ) : (
                  filteredData.map((entry, idx) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      key={entry.id}
                      className="mb-4"
                    >
                      <Card 
                        className={`border-l-4 shadow-md hover:shadow-xl transition-all group bg-white overflow-hidden ${
                          entry.customerStatus === 'CRITICAL' ? 'border-rose-500' : 
                          entry.customerStatus === 'WARNING' ? 'border-amber-500' : 
                          entry.customerStatus === 'HANGUS' ? 'border-orange-500' :
                          entry.customerStatus === 'SAFE' ? 'border-emerald-500' :
                          'border-blue-500'
                        }`}
                      >
                        <CardContent className="p-4 flex flex-col gap-4">
                          <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* PROFILE & BASIC INFO */}
                            <div 
                              className="flex items-center gap-4 w-full md:w-[250px] cursor-pointer"
                              onClick={() => {
                                setSelectedCustomerId(entry.pelangganId);
                                setSelectedCustomerName(entry.pelangganNama);
                                setOpenDetail(true);
                              }}
                            >
                              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-white shadow-inner ${
                                entry.customerStatus === 'CRITICAL' ? 'bg-rose-500' : 
                                entry.customerStatus === 'WARNING' ? 'bg-amber-500' : 
                                entry.customerStatus === 'ON TRACK' ? 'bg-blue-500' :
                                entry.customerStatus === 'EXPIRED' ? 'bg-slate-400' :
                                'bg-emerald-500'
                              }`}>
                                {(entry.pelangganNama || "??").substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-extrabold text-slate-800 truncate uppercase text-sm leading-tight">{entry.pelangganNama}</span>
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 self-start px-1.5 rounded mt-0.5">{entry.customerCode}</span>
                                <div className="flex items-center gap-2 mt-1">
                                   <div className={`h-1.5 w-1.5 rounded-full ${
                                      entry.customerStatus === 'CRITICAL' ? 'bg-rose-500 animate-pulse' : 
                                      entry.customerStatus === 'WARNING' ? 'bg-amber-500' : 
                                      entry.customerStatus === 'ON TRACK' ? 'bg-blue-500' :
                                      entry.customerStatus === 'EXPIRED' ? 'bg-slate-400' :
                                      'bg-emerald-500'
                                   }`} />
                                   <span className={`text-[10px] font-black uppercase ${
                                      entry.customerStatus === 'CRITICAL' ? 'text-rose-600' : 
                                      entry.customerStatus === 'WARNING' ? 'text-amber-600' : 
                                      entry.customerStatus === 'ON TRACK' ? 'text-blue-600' :
                                      entry.customerStatus === 'EXPIRED' ? 'text-slate-500' :
                                      'text-emerald-600'
                                   }`}>{entry.customerStatus === 'ON TRACK' ? 'ON TRACK 🔵' : entry.customerStatus === 'EXPIRED' ? 'EXPIRED ⚫' : entry.customerStatus}</span>
                                </div>
                              </div>
                            </div>

                            {/* TRANSACTIONAL STATS (CENTER) */}
                            <div className="flex-1 w-full flex items-center justify-around py-2 px-0 md:px-4 border-y md:border-y-0 md:border-x border-slate-50 gap-2">
                              <div className="flex flex-col items-center text-center">
                                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Omzet</span>
                                 <span className="text-xs font-black text-slate-800">Rp {(entry.totalOmzet ?? 0).toLocaleString()}</span>
                              </div>
                              <div className="h-6 w-px bg-slate-50 hidden md:block" />
                               <div className="flex flex-col items-center text-center">
                                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Reward</span>
                                  <span className="text-xs font-black text-emerald-600">Rp {(entry.totalReward ?? 0).toLocaleString()}</span>
                               </div>
                              <div className="h-6 w-px bg-slate-50 hidden md:block" />
                              <div className="flex flex-col items-center text-center">
                                 <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Faktur</span>
                                 <span className="text-xs font-black text-indigo-600">{entry.countFaktur} Inv</span>
                              </div>
                            </div>

                            {/* ACTIONS (RIGHT) */}
                            <div className="w-full md:w-[150px] flex items-center justify-end gap-2 shrink-0">
                               {(entry.customerStatus === 'WARNING' || entry.customerStatus === 'CRITICAL') && (
                                 <Button 
                                   size="sm" 
                                   variant="ghost" 
                                   className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                                   onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenReminder(entry);
                                   }}
                                 >
                                   <Bell className="h-4 w-4" />
                                 </Button>
                               )}
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="h-8 gap-2 text-[10px] font-bold border-slate-200"
                                 onClick={() => {
                                    setSelectedCustomerId(entry.pelangganId);
                                    setSelectedCustomerName(entry.pelangganNama);
                                    setOpenDetail(true);
                                 }}
                               >
                                 DETAIL <ChevronRight className="h-3 w-3" />
                               </Button>
                            </div>
                          </div>

                          {/* PROMO PROGRESS BARS */}
                          {entry.activePromos && entry.activePromos.length > 0 && (
                            <div className="pt-2 border-t border-slate-50 space-y-3">
                              {entry.activePromos.map((p: any, pIdx: number) => (
                                <div key={pIdx} className="space-y-1.5">
                                  <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5 leading-none">
                                        {p.type === 'Cashback' ? <Coins className="h-3 w-3 text-emerald-500" /> : 
                                         p.type === 'Paket' ? <Package className="h-3 w-3 text-purple-500" /> : 
                                         <Star className="h-3 w-3 text-amber-500" />}
                                        {p.name}
                                        <ArrowRight className="h-2.5 w-2.5 text-slate-300" />
                                        <span className="text-indigo-600">{typeof p.progressPercent === 'number' ? p.progressPercent.toFixed(0) : "0"}%</span>
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-medium mt-1">
                                        {p.basisType === 'qty' ? '' : 'Rp '}{(p.currentValue ?? 0).toLocaleString()}{p.basisType === 'qty' ? ' Qty' : ''} / 
                                        {p.basisType === 'qty' ? '' : 'Rp '}{(p.targetValue ?? 0).toLocaleString()}{p.basisType === 'qty' ? ' Qty' : ''} • 
                                        <span className="text-rose-500 font-bold ml-1">Kurang {p.basisType === 'qty' ? '' : 'Rp '}{(p.remainingValue ?? 0).toLocaleString()}{p.basisType === 'qty' ? ' Qty' : ''}</span>
                                      </span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                                       p.status === 'EXPIRED' ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100'
                                    }`}>
                                       {p.status === 'EXPIRED' ? <HistoryIcon className="h-2.5 w-2.5 text-slate-400" /> : <Info className="h-2.5 w-2.5 text-slate-400" />}
                                       <span className={`text-[9px] font-bold ${p.status === 'EXPIRED' ? 'text-slate-500' : 'text-slate-500'}`}>
                                          {p.status === 'EXPIRED' ? 'Periode Berakhir' : p.daysLeft === 0 ? 'Hari Ini Terakhir' : `Sisa ${p.daysLeft} hari`}
                                       </span>
                                    </div>
                                  </div>
                                  <Progress 
                                    value={p.progressPercent} 
                                    className="h-1.5 bg-slate-100" 
                                    indicatorClassName={`${
                                      p.status === 'CRITICAL' ? 'bg-rose-500' : 
                                      p.status === 'WARNING' ? 'bg-amber-500' : 
                                      p.status === 'HANGUS' ? 'bg-orange-500' :
                                      p.status === 'ON TRACK' ? 'bg-blue-500' :
                                      p.status === 'EXPIRED' ? 'bg-slate-400' :
                                      'bg-emerald-500'
                                    }`}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </ScrollArea>
          </div>
        </div>
      </div>

      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <HistoryIcon className="h-6 w-6" />
              Detail Transaksi Pelanggan
            </DialogTitle>
            <DialogDescription className="text-white/80 font-medium">
              Menampilkan riwayat faktur dan rincian reward untuk <span className="text-white font-bold underline decoration-indigo-300 underline-offset-4">{selectedCustomerName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-0">
            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                <p className="text-slate-400 animate-pulse font-medium">Mengambil riwayat transaksi...</p>
              </div>
            ) : details.length === 0 ? (
              <div className="text-center py-20">
                <Info className="h-12 w-12 text-slate-100 mx-auto mb-4" />
                <p className="text-slate-400 italic">Belum ada transaksi di periode ini.</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="font-bold text-slate-600">No. Faktur</TableHead>
                        <TableHead className="font-bold text-slate-600">Tanggal</TableHead>
                        <TableHead className="font-bold text-slate-600 text-right">Omzet</TableHead>
                        <TableHead className="font-bold text-slate-600 text-right">Total Reward</TableHead>
                        <TableHead className="font-bold text-slate-600">Rincian Reward</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.map((t) => (
                        <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-bold text-slate-700">{t.noFaktur}</TableCell>
                          <TableCell className="text-slate-500 text-xs">
                            {t.tglFaktur ? format(new Date(t.tglFaktur), "dd/MM/yyyy") : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {t.basisType === 'point' ? (
                              <span className="text-blue-600 font-bold">{t.qty?.toLocaleString()} Qty</span>
                            ) : (
                              <span>Rp {Number(t.nilaiFaktur || 0).toLocaleString()}</span>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-black ${t.id.startsWith('cr_') && t.totalReward === 0 ? 'text-amber-500 bg-amber-50/30' : 'text-emerald-600 bg-emerald-50/30'}`}>
                            {t.totalReward > 0 ? `Rp ${t.totalReward.toLocaleString()}` : (t.id.startsWith('cr_') ? 'ON PROGRESS' : 'Rp 0')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                               {(t.rewardItems && t.rewardItems.length > 0) ? (
                                 t.rewardItems.map((ri: any, idx: number) => (
                                   <Badge key={idx} variant="outline" className={`text-[9px] gap-1 px-1.5 py-0 h-5 shadow-sm ${
                                     ri.type === 'cashback' || ri.type === 'manual' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                     ri.type === 'point' ? 'bg-blue-600 border-blue-600 text-white font-bold' :
                                     ri.type === 'cutting' ? 'bg-orange-50 border-orange-100 text-orange-600' :
                                     ri.type === 'paket' ? 'bg-purple-600 border-purple-600 text-white font-bold' :
                                     'bg-slate-50 border-slate-100 text-slate-600'
                                   }`}>
                                     {ri.type === 'cashback' || ri.type === 'manual' ? <Coins className="h-2.5 w-2.5" /> :
                                      ri.type === 'point' ? <Star className="h-2.5 w-2.5" /> :
                                      ri.type === 'cutting' ? <Scissors className="h-2.5 w-2.5" /> :
                                      <Package className="h-2.5 w-2.5" />}
                                     {ri.type === 'paket' ? `PROGRAM PAKET ${ri.value.toLocaleString()} (${ri.desc})` : 
                                      ri.type === 'point' ? `${ri.name}` :
                                      `${ri.name}: ${ri.value.toLocaleString()} ${ri.desc ? `(${ri.desc})` : ''}`}
                                   </Badge>
                                 ))
                               ) : (
                                 <span className="text-[10px] text-slate-300 italic">Otomatis Terhitung</span>
                               )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* REMINDER MODAL */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-rose-500" />
              Kirim Reminder Promo
            </DialogTitle>
            <DialogDescription>
              Pesan reminder akan disiapkan untuk <strong>{reminderTarget?.pelangganNama}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <textarea 
               className="w-full h-32 p-3 text-sm border rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
               value={reminderMessage}
               onChange={(e) => setReminderMessage(e.target.value)}
            />
            
            <div className="flex flex-col gap-2">
               <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                  window.open(`https://wa.me/${reminderTarget?.phone || ''}?text=${encodeURIComponent(reminderMessage)}`, '_blank');
                  sendReminder();
               }}>
                 <MessageSquare className="h-4 w-4" />
                 Kirim via WhatsApp
               </Button>
               <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={sendReminder}>
                 <Mail className="h-4 w-4" />
                 Kirim via Email
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* BULK REMINDER MODAL (FULLSCREEN RECAP) */}
      <Dialog open={bulkReminderOpen} onOpenChange={(open) => {
        setBulkReminderOpen(open);
        if (!open) setSelectedReminderIds([]);
      }}>
        <DialogContent className="max-w-none w-screen h-screen m-0 rounded-none overflow-hidden flex flex-col p-8 border-none bg-slate-50">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-rose-600 rounded-3xl shadow-lg shadow-rose-200">
                <Bell className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-800">Daftar Promo Belum Tercapai</h1>
                <p className="text-slate-500 font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> 
                  Rekapan pelanggan dengan status WARNING atau CRITICAL periode bulan berjalan
                </p>
              </div>
            </div>
            <Button 
               variant="outline" 
               size="icon" 
               className="rounded-2xl border-2 h-12 w-12 hover:bg-rose-50 hover:text-rose-600 transition-all"
               onClick={() => setBulkReminderOpen(false)}
            >
               <X className="h-6 w-6" />
            </Button>
          </div>

          {/* INTERNAL FILTERS */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <Tabs value={modalFilterStatus} onValueChange={setModalFilterStatus} className="w-full md:w-auto">
               <TabsList className="bg-slate-100 p-1 rounded-xl">
                 <TabsTrigger value="ALL" className="rounded-lg font-bold px-6">SEMUA ({reminderRecap.length})</TabsTrigger>
                 <TabsTrigger value="ON TRACK" className="rounded-lg font-bold px-6 text-blue-600">🔵 ON TRACK (0)</TabsTrigger>
                 <TabsTrigger value="WARNING" className="rounded-lg font-bold px-6 text-amber-600">🟡 WARNING ({reminderRecap.filter(r => r.status === 'WARNING').length})</TabsTrigger>
                 <TabsTrigger value="CRITICAL" className="rounded-lg font-bold px-6 text-rose-600">🔴 CRITICAL ({reminderRecap.filter(r => r.status === 'CRITICAL').length})</TabsTrigger>
               </TabsList>
            </Tabs>

            <div className="flex items-center gap-4">
               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Terpilih: {selectedReminderIds.length} PLG</span>
               <Button 
                variant="outline" 
                size="sm" 
                className="h-9 font-bold bg-slate-50 text-slate-600 border-none"
                onClick={() => {
                  if (selectedReminderIds.length === filteredRecap.length) {
                    setSelectedReminderIds([]);
                  } else {
                    setSelectedReminderIds(filteredRecap.map(r => r.id));
                  }
                }}
               >
                 {selectedReminderIds.length === filteredRecap.length ? 'Bersihkan Pilihan' : 'Pilih Semua di Filter'}
               </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="rounded-3xl border border-slate-100 shadow-xl overflow-hidden bg-white">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <Table>
                  <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="font-extrabold text-slate-500 uppercase text-[11px] tracking-widest py-5">Nama Toko / Pelanggan</TableHead>
                      <TableHead className="font-extrabold text-slate-500 uppercase text-[11px] tracking-widest">Program Promo</TableHead>
                      <TableHead className="font-extrabold text-slate-500 uppercase text-[11px] tracking-widest">Progress</TableHead>
                      <TableHead className="font-extrabold text-slate-500 uppercase text-[11px] tracking-widest text-right">Kekurangan</TableHead>
                      <TableHead className="font-extrabold text-slate-500 uppercase text-[11px] tracking-widest text-center">Sisa</TableHead>
                      <TableHead className="font-extrabold text-slate-500 uppercase text-[11px] tracking-widest text-right pr-8">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecap.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-64 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-30">
                            <Target className="h-16 w-16" />
                            <p className="text-xl font-bold italic">Tidak ada data untuk filter ini.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecap.map((row) => (
                        <TableRow 
                          key={row.id} 
                          className={`group hover:bg-slate-50/80 transition-colors border-b border-slate-50 ${selectedReminderIds.includes(row.id) ? 'bg-indigo-50/30' : ''}`}
                        >
                          <TableCell className="pl-6">
                            <Checkbox 
                              checked={selectedReminderIds.includes(row.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedReminderIds(prev => [...prev, row.id]);
                                } else {
                                  setSelectedReminderIds(prev => prev.filter(id => id !== row.id));
                                }
                              }}
                              className="h-5 w-5 border-2 rounded-md"
                            />
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-800 text-sm uppercase leading-tight">{row.pelangganNama}</span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 self-start px-1.5 rounded mt-1">{row.customerCode}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                               <div className={`p-1.5 rounded-lg ${
                                 row.type === 'Cashback' ? 'bg-emerald-100 text-emerald-600' : 
                                 row.type === 'Paket' ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'
                               }`}>
                                  {row.type === 'Cashback' ? <Coins className="h-3 w-3" /> : 
                                   row.type === 'Paket' ? <Package className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-[11px] font-black text-slate-600 uppercase">{row.promoName}</span>
                                 <span className="text-[9px] font-bold text-slate-400">{row.type}</span>
                               </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5 min-w-[140px]">
                              <div className="flex justify-between items-end">
                                <span className="text-[12px] font-black text-indigo-700">{row.progress.toFixed(1)}%</span>
                                <span className="text-[9px] font-bold text-slate-400">Target: {row.basisType === 'qty' ? `${row.targetValue.toLocaleString()} Qty` : `Rp ${row.targetValue.toLocaleString()}`}</span>
                              </div>
                              <Progress 
                                value={row.progress} 
                                className="h-2 bg-slate-100" 
                                indicatorClassName={`${
                                  row.status === 'CRITICAL' ? 'bg-rose-500' : 
                                  row.status === 'WARNING' ? 'bg-amber-500' : 
                                  row.status === 'ON TRACK' ? 'bg-blue-500' : 
                                  row.status === 'EXPIRED' ? 'bg-slate-400' : 
                                  'bg-emerald-500'
                                }`} 
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                             <div className="flex flex-col">
                               <span className="text-xs font-black text-rose-600">
                                 {row.basisType === 'qty' ? `${row.remainingValue.toLocaleString()} Qty` : `Rp ${row.remainingValue.toLocaleString()}`}
                               </span>
                               <span className="text-[9px] font-bold text-slate-400 uppercase">Kekurangan</span>
                             </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className={`inline-flex flex-col items-center px-3 py-1 rounded-xl min-w-[100px] ${
                              row.daysLeft < 0 ? 'bg-rose-50' : 
                              row.daysLeft === 0 ? 'bg-amber-50' : 'bg-slate-100'
                            }`}>
                               <span className={`text-[10px] font-black uppercase leading-none ${
                                 row.daysLeft < 0 ? 'text-rose-600' : 
                                 row.daysLeft === 0 ? 'text-amber-600' : 'text-slate-700'
                               }`}>
                                 {row.daysLeft < 0 ? 'Periode Berakhir' : 
                                  row.daysLeft === 0 ? 'Hari Ini Terakhir' : `Sisa ${row.daysLeft} Hari`}
                               </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <Badge className={`rounded-lg px-3 py-1 font-black text-[10px] tracking-widest ${
                              row.status === 'CRITICAL' ? 'bg-rose-500 hover:bg-rose-600' : 
                              row.status === 'WARNING' ? 'bg-amber-500 hover:bg-amber-600' : 
                              row.status === 'ON TRACK' ? 'bg-blue-500 hover:bg-blue-600' :
                              row.status === 'EXPIRED' ? 'bg-slate-400 hover:bg-slate-500 text-white' :
                              'bg-emerald-500 hover:bg-emerald-600'
                            }`}>
                              {row.status === 'ON TRACK' ? 'ON TRACK 🔵' : row.status === 'EXPIRED' ? 'EXPIRED ⚫' : row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>

          <div className="pt-8 flex justify-between items-center mt-auto border-t border-slate-200">
            <div className="flex gap-10">
               <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total Pelanggan</span>
                  <span className="text-2xl font-black text-slate-800 leading-none">
                    {new Set(reminderRecap.map(r => r.pelangganId)).size} <span className="text-xs uppercase text-slate-400">Toko</span>
                  </span>
               </div>
               <div className="flex flex-col gap-0.5 border-l border-slate-200 pl-10">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total Item Promo</span>
                  <span className="text-2xl font-black text-rose-600 leading-none">
                    {reminderRecap.length} <span className="text-xs uppercase text-slate-400">Programs</span>
                  </span>
               </div>
               <div className="flex flex-col gap-0.5 border-l border-slate-200 pl-10">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Peringatan Kritis</span>
                  <span className="text-2xl font-black text-rose-500 leading-none animate-pulse">
                    {reminderRecap.filter(r => r.status === 'CRITICAL').length} <span className="text-xs uppercase text-slate-400">Cases</span>
                  </span>
               </div>
            </div>
             
             <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="rounded-2xl border-2 h-14 px-10 font-black text-slate-600 hover:bg-white hover:border-slate-300 transition-all text-lg shadow-sm" 
                  onClick={() => setBulkReminderOpen(false)}
                >
                   TUTUP
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
