import { useQuery } from "@tanstack/react-query";
import { AuditLogWithUser } from "@shared/schema";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  History, 
  User as UserIcon, 
  Activity, 
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { useBranch } from "@/hooks/use-branch";

export default function AuditLogsPage() {
  const { selectedBranch } = useBranch();
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("ALL");
  
  const [page, setPage] = useState(1);
  const limit = 20;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeStartDate, setActiveStartDate] = useState("");
  const [activeEndDate, setActiveEndDate] = useState("");

  useEffect(() => {
    setPage(1);
  }, [search, filterAction, activeStartDate, activeEndDate]);

  const { data: result, isLoading } = useQuery<{ data: AuditLogWithUser[], total: number, pages: number }>({
    queryKey: ["/api/audit-logs/paginated", selectedBranch?.id, page, search, filterAction, activeStartDate, activeEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch?.id) params.append("branchId", selectedBranch.id.toString());
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);
      if (filterAction !== "ALL") params.append("action", filterAction);
      if (activeStartDate) params.append("startDate", activeStartDate);
      if (activeEndDate) params.append("endDate", activeEndDate);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    }
  });

  const filteredLogs = result?.data || [];
  const totalData = result?.total || 0;
  const totalPages = result?.pages || 0;

  const handleApplyFilter = () => {
    setActiveStartDate(startDate);
    setActiveEndDate(endDate);
  };

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
    setActiveStartDate("");
    setActiveEndDate("");
    setSearch("");
    setFilterAction("ALL");
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN": return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">LOGIN</Badge>;
      case "LOGOUT": return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">LOGOUT</Badge>;
      case "CREATE": return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">CREATE</Badge>;
      case "UPDATE": return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">UPDATE</Badge>;
      case "DELETE": return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">DELETE</Badge>;
      case "STATUS_UPDATE": return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">STATUS</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <>
      <div className="relative mb-8 -mt-2">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl blur-xl opacity-20 animate-pulse" />
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/20 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner group transition-transform hover:scale-105">
                <History className="h-8 w-8 sm:h-9 sm:w-9 text-slate-100 animate-in zoom-in duration-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Log Aktivitas</h1>
                  <div className="px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-widest">
                    Admin
                  </div>
                </div>
                <p className="text-slate-400 text-sm sm:text-base font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-ping" />
                  Pantau riwayat login dan perubahan data
                </p>
              </div>
            </div>
            
            <div className="flex flex-col xl:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center justify-between xl:justify-start gap-2 w-full xl:w-auto bg-white/5 p-1.5 rounded-xl border border-white/10 shadow-inner">
                 <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                   <Input 
                     type="date"
                     value={startDate}
                     onChange={(e) => setStartDate(e.target.value)}
                     className="h-9 w-32 sm:w-36 bg-transparent border-none text-white text-xs sm:text-sm placeholder:text-white/40 focus:ring-1 focus:ring-white/20 transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                   />
                   <span className="text-white/40 text-xs">-</span>
                   <Input 
                     type="date"
                     value={endDate}
                     onChange={(e) => setEndDate(e.target.value)}
                     className="h-9 w-32 sm:w-36 bg-transparent border-none text-white text-xs sm:text-sm placeholder:text-white/40 focus:ring-1 focus:ring-white/20 transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                   />
                 </div>
                 <div className="flex items-center gap-1 shrink-0 px-1">
                   <Button onClick={handleApplyFilter} size="sm" variant="secondary" className="h-8 px-3 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 text-white border border-white/10">
                     Terapkan
                   </Button>
                   {(activeStartDate || activeEndDate || search || filterAction !== "ALL") && (
                     <Button onClick={handleResetFilter} size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-white/70 hover:text-white hover:bg-white/10 shrink-0">
                       <X className="h-4 w-4" />
                     </Button>
                   )}
                 </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto mt-2 xl:mt-0">
                <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                <Input 
                  placeholder="Cari user atau aktivitas..." 
                  className="pl-10 h-11 bg-white/10 backdrop-blur-md border border-white/10 text-white placeholder:text-white/40 focus:bg-white/20 transition-all rounded-xl w-full sm:w-[240px] font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-11 w-full sm:w-40 bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all rounded-xl font-medium shadow-inner">
                  <Filter className="h-4 w-4 mr-2 text-slate-300" />
                  <SelectValue placeholder="Semua Aksi" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                  <SelectItem value="ALL">Semua Aksi</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="STATUS_UPDATE">Status</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <Card className="rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100/60 bg-slate-50/50 p-6">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-lg font-black text-slate-700 flex items-center gap-2">
                <Activity className="h-5 w-5 text-slate-400" />
                Daftar Riwayat
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-xl border-none overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-48 font-semibold text-slate-600">Waktu</TableHead>
                    <TableHead className="font-semibold text-slate-600">User</TableHead>
                    <TableHead className="w-32 font-semibold text-slate-600">Aksi</TableHead>
                    <TableHead className="font-semibold text-slate-600">Detail Aktivitas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell colSpan={4} className="h-16 bg-slate-50/20" />
                      </TableRow>
                    ))
                  ) : filteredLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-slate-400">
                        Tidak ada data log yang ditemukan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs?.map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                        <TableCell className="font-medium text-slate-500 text-sm py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {format(new Date(log.timestamp), "dd MMM yyyy, HH:mm:ss", { locale: id })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                              <UserIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-700 text-sm leading-none">{log.user?.displayName || "System"}</p>
                              <p className="text-xs text-slate-400 mt-1">@{log.user?.username || "system"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getActionBadge(log.action)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 max-w-md truncate">
                          {log.details}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100/60 bg-slate-50/30 px-6 py-4 gap-4">
                <div className="text-sm font-medium text-slate-500 flex items-center gap-2 text-center sm:text-left">
                  <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-700 shadow-sm shrink-0">{page}</span>
                  dari {totalPages} Halaman
                  <span className="text-slate-300 mx-1 hidden sm:inline">|</span>
                  <span className="hidden sm:inline">Total {totalData.toLocaleString()} Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 bg-white hover:bg-slate-50 border-slate-200 text-slate-600 font-medium"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 bg-white hover:bg-slate-50 border-slate-200 text-slate-600 font-medium"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Selanjutnya
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
