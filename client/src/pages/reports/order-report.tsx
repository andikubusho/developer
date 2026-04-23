import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportLayout } from "@/components/reports/report-layout";
import { ReportFilter } from "@/components/reports/report-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ShoppingCart, CheckCircle2, AlertCircle, TrendingUp, User, Globe, Calendar, Hash, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn, safeFormat } from "@/lib/utils";
import { useBranch } from "@/hooks/use-branch";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { useGlobalPeriod } from "@/hooks/use-global-period";

export default function OrderReport() {
  const [filters, setFilters] = useState<any>({});
  const { selectedBranchId } = useBranch();
  const { can } = usePermissions();
  const { user: authUser } = useAuth();
  const username = authUser?.username?.toLowerCase() || '';
  const userRole = authUser?.role?.toLowerCase() || '';
  const isAdmin = !!(
    authUser?.authorizedDashboards?.some(d => ['admin', 'superadmin', 'root'].includes(d.toLowerCase())) || 
    username.includes('admin') || 
    username.includes('super') || 
    username.includes('root') || 
    userRole.includes('admin') || 
    userRole.includes('super') ||
    userRole.includes('root')
  );
  const isSalesman = !!authUser?.authorizedDashboards?.includes('salesman');
  const isSalesRole = authUser?.role?.toLowerCase() === 'sales';
  const shouldFilterBySalesman = isSalesRole && !isAdmin;

  const canExport = can("laporan_surat_order", "export");
  const canPrint = can("laporan_surat_order", "print");

  const { startDate: globalStartDate, endDate: globalEndDate, isCurrentMonth, globalMonth, globalYear } = useGlobalPeriod();
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/orders", filters, globalStartDate, globalEndDate, selectedBranchId, shouldFilterBySalesman ? authUser?.id : null],
    queryFn: async () => {
      const params = new URLSearchParams();
      // If local filter is active, use it. Otherwise, use global bounds.
      if (filters.startDate || globalStartDate) params.append("startDate", (filters.startDate || globalStartDate).toISOString());
      if (filters.endDate || globalEndDate) params.append("endDate", (filters.endDate || globalEndDate).toISOString());
      
      if (filters.customerId) params.append("customerId", filters.customerId.toString());
      
      if (shouldFilterBySalesman) {
        params.append("salesmanId", authUser?.id.toString() || "");
      } else if (filters.salesmanId) {
        params.append("salesmanId", filters.salesmanId.toString());
      }

      if (selectedBranchId) params.append("branchId", selectedBranchId.toString());
      
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data");
      return res.json();
    }
  });

  const orders = data?.orders || [];

  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  React.useEffect(() => {
    setPage(1);
  }, [filters]);

  const totalItems = orders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedOrders = useMemo(() => {
    return orders.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [orders, page]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      amount: orders.reduce((sum: number, o: any) => sum + Number(o.finalTotal || 0), 0),
      pending: orders.filter((o: any) => o.status === "PENDING").length,
      processed: orders.filter((o: any) => o.status === "PROSES").length,
    };
  }, [orders]);

  // Group by Customer for totals
  const groupedOrders = useMemo(() => {
    const groups: Record<string, any[]> = {};
    paginatedOrders.forEach((o: any) => {
      const name = o.shopName || "Tanpa Nama";
      if (!groups[name]) groups[name] = [];
      groups[name].push(o);
    });
    return groups;
  }, [paginatedOrders]);

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(orders.map((o: any) => ({
      "No. Order": o.invoiceNumber,
      "Tgl Order": format(new Date(o.date), "dd/MM/yyyy"),
      "Toko": o.shopName,
      "Salesman": o.salesman?.displayName || "-",
      "Total": o.finalTotal,
      "Status": o.status,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Surat Order");
    XLSX.writeFile(workbook, `laporan-order-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text("Laporan Surat Order", 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${filters.startDate ? format(filters.startDate, "dd/MM/yyyy") : "-"} s/d ${filters.endDate ? format(filters.endDate, "dd/MM/yyyy") : "-"}`, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [["No. Order", "Tgl", "Toko", "Salesman", "Total", "Status"]],
      body: orders.map((o: any) => [
        o.invoiceNumber,
        format(new Date(o.date), "dd/MM/yy"),
        o.shopName,
        o.salesman?.displayName || "-",
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(o.finalTotal || 0),
        o.status,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
      styles: { fontSize: 8 }
    });
    doc.save(`laporan-order-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const summaryCards = [
    { label: "Total Order", value: stats.total, icon: ShoppingCart, color: "bg-blue-500" },
    { label: "Total Nominal", value: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(stats.amount), icon: TrendingUp, color: "bg-emerald-500" },
    { label: "Sedang Proses", value: stats.processed, icon: CheckCircle2, color: "bg-indigo-500" },
    { label: "Belum Diproses", value: stats.pending, icon: AlertCircle, color: "bg-rose-500" },
  ];

  return (
    <ReportLayout 
      title="Laporan Surat Order" 
      subtitle="Monitoring Data Pemesanan dari Pelanggan"
      summaryCards={summaryCards}
      onExportExcel={canExport ? handleExportExcel : undefined}
      onExportPDF={canExport ? handleExportPDF : undefined}
      onPrint={canPrint ? () => window.print() : undefined}
    >
      <div className="space-y-6">
        <ReportFilter onFilter={setFilters} showSalesman={!shouldFilterBySalesman} showBrand={false} />

        {!isCurrentMonth && (
          <div className={cn(
            "px-4 py-3 rounded-2xl border flex items-center justify-center text-xs sm:text-sm font-bold tracking-wide shadow-md w-full transition-all duration-500",
            "bg-amber-500/80 text-white border-amber-400 backdrop-blur-xl animate-pulse ring-2 ring-amber-400/50"
          )}>
            <Calendar className="w-4 h-4 mr-2 text-white" />
            Anda sedang melihat data historis: {months[globalMonth]} {globalYear}
          </div>
        )}

        {/* Desktop View Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto no-horizontal-scroll">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-slate-500 text-[10px] md:text-xs">No</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[120px] text-[10px] md:text-xs">No. Order</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[100px] text-[10px] md:text-xs">Tgl Order</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[150px] text-[10px] md:text-xs">Salesman</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[180px] text-[10px] md:text-xs">Toko / Region</TableHead>
                    <TableHead className="font-bold text-slate-500 text-right min-w-[120px] text-[10px] md:text-xs">Total Amount</TableHead>
                    <TableHead className="font-bold text-slate-500 min-w-[100px] text-[10px] md:text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400">Loading data...</TableCell>
                    </TableRow>
                  ) : Object.keys(groupedOrders).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400">Tidak ada data ditemukan</TableCell>
                    </TableRow>
                  ) : Object.entries(groupedOrders).map(([shopName, items], gIdx) => (
                    <React.Fragment key={`group-f-${gIdx}-${shopName}`}>
                      <TableRow key={`header-${gIdx}`} className="bg-slate-50/40">
                        <TableCell colSpan={7} className="py-2.5 px-4 border-l-4 border-primary/40">
                           <div className="flex items-center gap-2">
                              <span className="font-black text-slate-700 uppercase tracking-wider text-xs">{shopName}</span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100/80 px-2.5 py-1 rounded-full ml-auto">{items.length} Order</span>
                           </div>
                        </TableCell>
                      </TableRow>
                      {items.map((o, idx) => (
                        <TableRow key={`row-${o.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="text-center text-slate-300 font-medium text-xs">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-slate-800 text-xs">{o.invoiceNumber}</TableCell>
                          <TableCell className="text-slate-500 text-xs">
                             <div className="flex items-center gap-1.5 font-medium">
                                <Calendar className="h-3 w-3 opacity-50" />
                                {safeFormat(o.date, "dd/MM/yyyy")}
                             </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 uppercase border border-slate-200">
                                {o.salesman?.displayName?.charAt(0) || "S"}
                              </div>
                              <span className="font-bold text-slate-600 text-xs">{o.salesman?.displayName || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                             <div className="flex flex-col">
                                <span className="font-bold text-slate-700 text-xs">{o.shopName}</span>
                                <div className="flex items-center gap-1 text-[9px] text-slate-400 font-black uppercase tracking-tight">
                                   <Globe className="h-2.5 w-2.5" />
                                   {o.region || "No Region"}
                                </div>
                             </div>
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-700 tracking-tighter text-xs">
                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(o.finalTotal || 0)}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide border",
                              o.status === "SELESAI" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              o.status === "PENDING" ? "bg-rose-50 text-rose-600 border-rose-100" :
                              "bg-indigo-50 text-indigo-600 border-indigo-100"
                            )}>
                              {o.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t border-slate-100 bg-slate-50/20" key={`footer-${gIdx}`}>
                        <TableCell colSpan={5} className="text-right font-bold text-slate-400 uppercase text-[9px] tracking-widest pl-4">Subtotal {shopName}</TableCell>
                        <TableCell className="font-black text-slate-800 text-right pr-4 tracking-tighter text-sm">
                           {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(items.reduce((sum, item) => sum + Number(item.finalTotal || 0), 0))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                  {orders.length > 0 && (
                    <TableRow className="bg-slate-100/50 border-t-2 border-slate-200">
                      <TableCell colSpan={5} className="text-right font-black uppercase text-xs tracking-[0.2em] py-5 text-slate-500">Grand Total Rekapitulasi</TableCell>
                      <TableCell className="font-black text-xl py-5 text-right tracking-tighter pr-4 text-primary">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(stats.amount)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
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
                  <span className="hidden sm:inline">Total {totalItems.toLocaleString()} Data</span>
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

        {/* Mobile View Cards */}
        <div className="md:hidden space-y-8 pb-10">
           {isLoading ? (
              <div className="text-center py-10 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Memuat data pesanan...</div>
           ) : Object.keys(groupedOrders).length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold uppercase text-[10px] tracking-widest italic border-2 border-dashed rounded-3xl">Tidak ada order ditemukan</div>
           ) : (
              <>
                 {Object.entries(groupedOrders).map(([shopName, items], gIdx) => (
                    <div key={`mobile-group-${gIdx}-${shopName}`} className="space-y-4">
                       <div className="flex items-center gap-2 px-2">
                          <h3 className="font-black text-[10px] text-slate-500 uppercase tracking-widest pl-3 border-l-2 border-primary/50 leading-none py-1">{shopName}</h3>
                          <div className="flex-1 h-px bg-slate-100/60" />
                          <Badge variant="outline" className="text-[9px] font-black border-slate-200 bg-slate-50 text-slate-400">{items.length} Order</Badge>
                       </div>
                       
                       <div className="space-y-4 px-1">
                          {items.map((o, idx) => (
                             <Card key={`card-${o.id}-${idx}`} className="border-slate-100 shadow-sm rounded-2xl overflow-hidden active:scale-[0.99] transition-transform">
                                <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                   <div className="flex items-center gap-2">
                                      <Hash className="w-3 h-3 text-slate-400" />
                                      <span className="text-[10px] font-bold font-mono text-slate-500">{o.invoiceNumber}</span>
                                   </div>
                                   <Badge className={cn(
                                      "text-[8px] font-black uppercase px-2 h-4",
                                      o.status === "SELESAI" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                      o.status === "PENDING" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                      "bg-indigo-50 text-indigo-600 border-indigo-100"
                                   )}>
                                      {o.status}
                                   </Badge>
                                </div>
                                <CardContent className="p-4 space-y-4">
                                   <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-3">
                                         <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                            <User className="w-5 h-5" />
                                         </div>
                                         <div className="space-y-0.5">
                                            <div className="font-bold text-slate-700 text-xs">{o.salesman?.displayName || "-"}</div>
                                            <div className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Salesman</div>
                                         </div>
                                      </div>
                                      <div className="text-right flex flex-col items-end">
                                         <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-0.5">
                                            <Calendar className="w-3 h-3" />
                                            {safeFormat(o.date, "dd MMM yyyy")}
                                         </div>
                                         <div className="flex items-center gap-1 text-[8px] font-black text-slate-300 uppercase italic">
                                            <Globe className="w-2.5 h-2.5" />
                                            {o.region || "No Region"}
                                         </div>
                                      </div>
                                   </div>
                                   
                                   <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                                      <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Total Tagihan</div>
                                      <div className="text-lg font-black text-slate-800 tracking-tighter">
                                         {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(o.finalTotal || 0)}
                                      </div>
                                   </div>
                                </CardContent>
                             </Card>
                          ))}
                       </div>
                    </div>
                 ))}
                 
                 {/* Grand Total - Card based, no fixed/sticky black bar */}
                 <div className="px-1 pt-6">
                    <Card className="bg-white border-2 border-primary/10 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
                       <div className="flex flex-col items-center gap-4 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                             <TrendingUp className="w-6 h-6" />
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">Grand Total Rekapitulasi</p>
                             <h4 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(stats.amount)}
                             </h4>
                             <p className="text-[10px] text-slate-400 mt-3 font-bold">{orders.length} Transaksi Pesanan</p>
                          </div>
                       </div>
                    </Card>
                 </div>
                 
                 {/* Mobile Pagination */}
                 {totalPages > 0 && (
                   <div className="flex flex-col items-center justify-center pt-8 pb-4 gap-4">
                     <div className="text-xs font-bold text-slate-400">
                       Halaman <span className="text-slate-700">{page}</span> dari {totalPages}
                     </div>
                     <div className="flex items-center gap-3">
                       <Button
                         variant="outline"
                         size="sm"
                         className="h-10 bg-white border-slate-200 text-slate-600 font-medium rounded-xl"
                         onClick={() => setPage(p => Math.max(1, p - 1))}
                         disabled={page === 1}
                       >
                         <ChevronLeft className="h-4 w-4 mr-1" />
                         Prev
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         className="h-10 bg-white border-slate-200 text-slate-600 font-medium rounded-xl"
                         onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                         disabled={page === totalPages}
                       >
                         Next
                         <ChevronRight className="h-4 w-4 ml-1" />
                       </Button>
                     </div>
                   </div>
                 )}
              </>
           )}
        </div>
      </div>
    </ReportLayout>
  );
}
