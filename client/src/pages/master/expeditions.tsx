import { useState, useRef } from "react";

import { useExpeditions, useCreateExpedition, useUpdateExpedition, useDeleteExpedition } from "@/hooks/use-expeditions";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Download, Monitor, ChevronDown, FileSpreadsheet, FileText, ArrowLeft, Search, RotateCcw, Building2, Package, CheckCircle2, AlertCircle, Info, CircleDot } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExpeditionSchema, type Expedition, type Branch } from "@shared/schema";
import { useBranch } from "@/hooks/use-branch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Expeditions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { selectedBranch, branches } = useBranch();
  const { data: expeditions = [], isLoading } = useExpeditions(selectedBranch?.id);
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [openPreview, setOpenPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const filtered = expeditions
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleExportExcel = () => {
    const dataToExport = filtered.map((e, index) => ({
      "No": index + 1,
      "ID": e.id,
      "Nama Ekspedisi": e.name,
      "Status": e.active ? "Aktif" : "Non-aktif"
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Ekspedisi");
    XLSX.writeFile(wb, `laporan-ekspedisi-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Laporan Master Ekspedisi", 14, 16);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 23);
    
    const tableData = filtered.map((e, index) => [
      index + 1,
      e.id,
      e.name,
      e.active ? "Aktif" : "Non-aktif"
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["No", "ID", "Nama Ekspedisi", "Status"]],
      body: tableData,
      headStyles: { fillColor: [51, 65, 85] }
    });
    
    doc.save(`laporan-ekspedisi-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const handlePrint = () => {
    setOpenPreview(true);
  };

  const doPrint = () => {
    const printContent = printRef.current?.innerHTML;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win || !printContent) return;
    win.document.write(`
      <html>
        <head>
          <title>Laporan Master Ekspedisi</title>
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
      <div className="relative min-h-[calc(100vh-5rem)] pb-12 overflow-x-hidden">
        {/* Super App Header: Blue/Indigo Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] md:w-full h-[220px] md:h-[240px] bg-gradient-to-br from-indigo-600 via-blue-600 to-emerald-600 md:rounded-b-[3rem] rounded-b-[20%] -z-10 shadow-2xl overflow-hidden text-white">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[100%] bg-white/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-20%] right-[-5%] w-[40%] h-[70%] bg-blue-300/10 rounded-full blur-[60px]" />
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
                   Master Ekspedisi
                </h1>
                <p className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">
                   Manajemen Pengiriman & Logistik
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
              {(isAdmin || can("master_ekspedisi", "export") || can("master_ekspedisi", "print")) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-sm rounded-xl px-4 w-[calc(50%-4px)] xs:w-auto">
                      <Download className="w-4 h-4" />
                      <span className="font-bold text-xs xs:text-sm">Export</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-xl border-slate-100 p-2">
                    {(isAdmin || can("master_ekspedisi", "print")) && (
                      <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer p-3 rounded-xl hover:bg-slate-50">
                        <Monitor className="w-4 h-4 text-slate-400" /> <span className="font-bold text-sm text-slate-700">Print Layar</span>
                      </DropdownMenuItem>
                    )}
                    {(isAdmin || can("master_ekspedisi", "export")) && (
                      <>
                        <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer p-3 rounded-xl hover:bg-slate-50">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> <span className="font-bold text-sm text-emerald-700">Export Excel</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer p-3 rounded-xl hover:bg-slate-50">
                          <FileText className="w-4 h-4 text-rose-500" /> <span className="font-bold text-sm text-rose-700">Export PDF</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {(isAdmin || can("master_ekspedisi", "export") || can("master_ekspedisi", "print") || can("master_ekspedisi", "input")) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-sm rounded-xl px-4 w-[calc(50%-4px)] xs:w-auto"
                  onClick={() => setSearch("")}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="font-bold whitespace-nowrap text-xs xs:text-sm">Reset</span>
                </Button>
              )}

              {can("master_ekspedisi", "input") && (
                 <div className="bg-white p-1 rounded-xl shadow-xl flex gap-1 w-full xs:w-auto mt-2 xs:mt-0">
                    <div className="flex-1 xs:flex-none">
                      <ExpeditionDialog />
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
                          placeholder="Cari ekspedisi berdasarkan nama..." 
                          className="h-12 pl-12 bg-slate-50/50 border-slate-100 focus:ring-indigo-500 rounded-xl font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium transition-all"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                  </CardContent>
               </Card>
          </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-premium border border-slate-100 overflow-hidden mb-8">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-none">
              <TableHead className="w-[80px] font-black text-slate-400 text-[10px] uppercase tracking-wider pl-6">ID</TableHead>
              <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider">Ekspedisi</TableHead>
              <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider">Cabang</TableHead>
              <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-right font-black text-slate-400 text-[10px] uppercase tracking-wider pr-6">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-sm text-slate-400 font-bold">Sinkronisasi data...</span>
                </div>
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">
                Data tidak ditemukan
              </TableCell></TableRow>
            ) : (
              filtered.map((exp) => (
                <TableRow key={exp.id} className="hover:bg-slate-50/50 transition-colors group border-slate-50">
                  <TableCell className="font-mono text-xs font-black text-slate-400 pl-6">#{exp.id}</TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                       <CircleDot className="w-3 h-3 text-indigo-400" />
                       {exp.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-full">
                      {branches.find((b: Branch) => b.id === exp.branchId)?.name || "Global"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "rounded-lg font-black text-[9px] uppercase tracking-tighter border-none px-2",
                      exp.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                    )}>
                      {exp.active ? 'Aktif' : 'Non-aktif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      {can("master_ekspedisi", "edit") && <ExpeditionDialog expedition={exp} />}
                      {can("master_ekspedisi", "delete") && <DeleteExpeditionButton id={exp.id} name={exp.name} />}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200">
             <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
             <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Memuat...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
             <Monitor className="h-16 w-16 mx-auto mb-4 opacity-10 text-slate-400" />
             <p className="font-black text-slate-800 uppercase tracking-tight">Belum ada ekspedisi</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((exp) => (
              <div key={exp.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-[100px] -z-10" />
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">ID Ekspedisi #{exp.id}</div>
                    <h3 className="font-black text-slate-800 leading-none mb-2">{exp.name}</h3>
                    <div className="flex gap-2">
                       <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 rounded-lg font-bold text-[9px] uppercase tracking-tighter">
                        {branches.find((b: Branch) => b.id === exp.branchId)?.name || "Global"}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        "rounded-lg font-black text-[9px] uppercase tracking-tighter border-none px-2",
                        exp.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      )}>
                        {exp.active ? 'Aktif' : 'Off'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                     {can("master_ekspedisi", "edit") && <ExpeditionDialog expedition={exp} />}
                     {can("master_ekspedisi", "delete") && <DeleteExpeditionButton id={exp.id} name={exp.name} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </div>
      </div>

      <Dialog open={openPreview} onOpenChange={setOpenPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview Cetak Laporan</DialogTitle>
            <DialogDescription>Pratinjau laporan sebelum dicetak.</DialogDescription>
          </DialogHeader>
          <div ref={printRef} className="p-4">
            <h2 className="text-xl font-bold mb-1">Laporan Master Ekspedisi</h2>
            <p className="text-sm text-muted-foreground mb-4">Dicetak: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-700 text-white">
                  <th className="px-3 py-2 text-left w-[80px]">ID</th>
                  <th className="px-3 py-2 text-left">Nama Ekspedisi</th>
                  <th className="px-3 py-2 text-left w-[120px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2">#{e.id}</td>
                    <td className="px-3 py-2 font-medium">{e.name}</td>
                    <td className="px-3 py-2">
                      {e.active ? "Aktif" : "Non-aktif"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenPreview(false)}>Tutup</Button>
            <Button onClick={doPrint} className="bg-blue-600 hover:bg-blue-700">
              <Monitor className="w-4 h-4 mr-2" /> Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExpeditionDialog({ expedition }: { expedition?: Expedition }) {
  const { selectedBranch, branches } = useBranch();
  const [open, setOpen] = useState(false);
  const createMut = useCreateExpedition();
  const updateMut = useUpdateExpedition();
  
  const isEdit = !!expedition;

  const form = useForm<z.infer<typeof insertExpeditionSchema>>({
    resolver: zodResolver(insertExpeditionSchema),
    defaultValues: {
      name: expedition?.name || "",
      active: expedition ? expedition.active : true,
      branchId: expedition?.branchId || selectedBranch?.id || null,
    },
  });

  const onSubmit = (data: z.infer<typeof insertExpeditionSchema>) => {
    if (isEdit) {
      updateMut.mutate({ id: expedition.id, ...data }, { onSuccess: () => setOpen(false) });
    } else {
      createMut.mutate(data, { onSuccess: () => { setOpen(false); form.reset(); } });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all active:scale-90 focus:outline-none focus:ring-0"><Edit2 className="h-4 w-4" /></Button>
        ) : (
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 transition-all active:scale-95 font-black rounded-xl h-9 px-4 focus:outline-none focus:ring-0"><Plus className="w-4 h-4 mr-2" /> Tambah Ekspedisi</Button>
        )}
      </DialogTrigger>
    <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-slate-50/50 backdrop-blur-xl font-display">
      <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-24 h-24 bg-blue-400/20 rounded-full blur-xl" />
        
        <DialogHeader className="relative z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <CircleDot className="w-5 h-5 text-white" />
             </div>
             <div>
                <DialogTitle className="text-3xl font-black tracking-tight drop-shadow-sm">
                  {isEdit ? "Edit Ekspedisi" : "Ekspedisi Baru"}
                </DialogTitle>
                <DialogDescription className="text-blue-100 font-bold opacity-90">
                  {isEdit ? "Perbarui informasi penyedia logistik." : "Daftarkan penyedia logistik ke dalam sistem."}
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>
      </div>

      <div className="p-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                <Package className="w-3 h-3" /> Nama Ekspedisi
              </Label>
              <Input 
                id="name" 
                {...form.register("name")} 
                placeholder="Contoh: JNE / J&T / Sicepat" 
                className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-bold focus:ring-blue-500 transition-all" 
              />
              {form.formState.errors.name && <p className="text-[10px] text-rose-500 font-bold px-1">{form.formState.errors.name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="branch" className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 px-1">
                <Building2 className="w-3 h-3" /> Cabang Pengelola
              </Label>
              <Controller
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <Select 
                    onValueChange={(val) => field.onChange(val === "null" ? null : parseInt(val))} 
                    value={field.value?.toString() || "null"}
                  >
                    <SelectTrigger className="h-12 border-slate-100 bg-white shadow-sm rounded-2xl font-bold focus:ring-blue-500 transition-all">
                      <SelectValue placeholder="Pilih Cabang" />
                    </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 shadow-xl overflow-hidden p-2">
                        {branches.map((branch) => (
                          <SelectItem 
                            key={branch.id} 
                            value={branch.id.toString()}
                            className="rounded-xl py-3 font-bold px-4 focus:bg-indigo-50 focus:text-indigo-600 transition-colors"
                          >
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex items-center gap-4 pt-4 px-1">
              <Controller
                control={form.control}
                name="active"
                render={({ field }) => (
                  <Switch 
                    id="active" 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                    className="data-[state=checked]:bg-emerald-500"
                  />
                )}
              />
              <div>
                <Label htmlFor="active" className="text-sm font-black text-slate-700">Aktif beroperasi</Label>
                <p className="text-[10px] text-slate-400 font-bold">Matikan ini jika ekspedisi sedang tidak melayani pengiriman.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-slate-100 items-center justify-end gap-3 sm:flex-row flex-col-reverse">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setOpen(false)} 
                className="h-12 w-full sm:w-auto rounded-xl font-bold text-slate-500 hover:bg-slate-100 px-6"
            >
                Batal
            </Button>
            <Button 
                type="submit" 
                disabled={isPending} 
                className="h-12 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl font-black px-10 shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Simpan Data</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </div>
    </DialogContent>
    </Dialog>
  );
}

function DeleteExpeditionButton({ id, name }: { id: number, name: string }) {
  const [open, setOpen] = useState(false);
  const deleteMut = useDeleteExpedition();

  const handleConfirm = () => {
    deleteMut.mutate(id, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all active:scale-90 focus:outline-none focus:ring-0"><Trash2 className="h-4 w-4" /></Button>
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
                    <DialogTitle className="text-2xl font-black tracking-tight drop-shadow-sm">Hapus Ekspedisi</DialogTitle>
                    <DialogDescription className="text-rose-100 font-bold opacity-90">Konfirmasi penghapusan penyedia logistik.</DialogDescription>
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
                       Apakah Anda yakin ingin menghapus ekspedisi <br/>
                       <span className="text-slate-900 text-lg underline decoration-rose-200 decoration-4 underline-offset-4">{name}</span>?
                    </p>
                    <div className="mt-4 px-4 py-3 bg-rose-50/50 border border-rose-100 rounded-2xl flex gap-3 text-left">
                       <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                       <p className="text-[10px] text-rose-500 font-black uppercase leading-tight tracking-wider">
                          Tindakan ini bersifat permanen dan akan menghapus riwayat data terkait ekspedisi ini.
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
                onClick={handleConfirm} 
                disabled={deleteMut.isPending} 
                className="h-12 w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black px-8 shadow-lg shadow-rose-100 transition-all active:scale-95 flex items-center gap-2"
              >
                {deleteMut.isPending ? (
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
