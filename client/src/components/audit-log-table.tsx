import { useQuery } from "@tanstack/react-query";
import { AuditLogWithUser } from "@shared/schema";
import { useBranch } from "@/hooks/use-branch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, User as UserIcon } from "lucide-react";

interface AuditLogTableProps {
  limit?: number;
}

export function AuditLogTable({ limit }: AuditLogTableProps) {
  const { selectedBranch } = useBranch();
  const { data: logs, isLoading } = useQuery<AuditLogWithUser[]>({
    queryKey: ["/api/audit-logs", selectedBranch?.id],
    queryFn: async () => {
      const url = selectedBranch?.id ? `/api/audit-logs?branchId=${selectedBranch.id}` : "/api/audit-logs";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    }
  });

  const displayLogs = limit ? logs?.slice(0, limit) : logs;

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
    <div className="rounded-xl border border-slate-100 overflow-x-auto bg-white">
      <Table className="min-w-[600px]">
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
                <TableCell colSpan={4} className="h-16 bg-slate-50/10" />
              </TableRow>
            ))
          ) : !displayLogs || displayLogs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-slate-400">
                Tidak ada data log yang ditemukan.
              </TableCell>
            </TableRow>
          ) : (
            displayLogs.map((log) => (
              <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                <TableCell className="font-medium text-slate-500 text-sm py-4">
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {format(new Date(log.timestamp), "dd MMM, HH:mm", { locale: id })}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <UserIcon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-xs leading-none">{log.user?.displayName || "System"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getActionBadge(log.action)}
                </TableCell>
                <TableCell className="text-xs text-slate-600 max-w-xs line-clamp-2 leading-tight py-4">
                  {log.details}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
