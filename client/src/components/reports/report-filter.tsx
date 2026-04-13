import { useState, useEffect } from "react";
import { useCustomers } from "@/hooks/use-customers";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search, RotateCcw, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ReportFilterProps {
  onFilter: (filters: {
    startDate: Date | undefined;
    endDate: Date | undefined;
    customerId?: number;
    customerCode?: string;
    salesmanId?: number;
    merekId?: number;
  }) => void;
  showSalesman?: boolean;
  showCustomer?: boolean;
  showBrand?: boolean;
}

export function ReportFilter({ onFilter, showSalesman = true, showCustomer = true, showBrand = true }: ReportFilterProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [customerId, setCustomerId] = useState<string>("all");
  const [salesmanId, setSalesmanId] = useState<string>("all");
  const [merekId, setMerekId] = useState<string>("all");
  const [openCustomer, setOpenCustomer] = useState(false);

  const { data: customers = [] } = useCustomers();
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    }
  });
  const { data: brands = [] } = useQuery<any[]>({
    queryKey: ["/api/brands"],
    queryFn: async () => {
      const res = await fetch("/api/brands");
      if (!res.ok) throw new Error("Gagal mengambil merek");
      return res.json();
    }
  });

  const salesmen = users.filter((u: any) => u.authorizedDashboards?.includes("salesman"));

  const handleApply = () => {
    const selectedCustomer = customers.find(c => c.id.toString() === customerId);
    onFilter({
      startDate,
      endDate,
      customerId: customerId === "all" ? undefined : parseInt(customerId),
      customerCode: selectedCustomer?.code,
      salesmanId: salesmanId === "all" ? undefined : parseInt(salesmanId),
      merekId: merekId === "all" ? undefined : parseInt(merekId),
    });
  };

  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setCustomerId("all");
    setSalesmanId("all");
    setMerekId("all");
    onFilter({ startDate: undefined, endDate: undefined });
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Rentang Tanggal</Label>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 rounded-xl", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yy", { locale: id }) : "Mulai"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-slate-200">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={id} />
              </PopoverContent>
            </Popover>
            <span className="text-slate-400 font-bold">-</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 rounded-xl", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yy", { locale: id }) : "Selesai"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-slate-200">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={id} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Customer Select (Searchable) */}
        {showCustomer && (
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Toko / Pelanggan</Label>
            <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCustomer}
                  className="w-full justify-between h-10 rounded-xl font-normal border-slate-200"
                >
                  <span className="truncate">
                    {customerId === "all" 
                      ? "Semua Toko" 
                      : customers.find((c) => c.id.toString() === customerId)?.name || "Pilih Toko..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 rounded-xl border-slate-200 shadow-xl overflow-hidden">
                <Command className="border-none">
                  <CommandInput placeholder="Cari nama toko..." className="h-10" />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>Toko tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setCustomerId("all");
                          setOpenCustomer(false);
                        }}
                        className="font-bold text-primary cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            customerId === "all" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Semua Toko
                      </CommandItem>
                      {customers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            setCustomerId(c.id.toString());
                            setOpenCustomer(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              customerId === c.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Salesman Select */}
        {showSalesman && (
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Salesman</Label>
            <Select value={salesmanId} onValueChange={setSalesmanId}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Semua Sales" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-xl overflow-hidden">
                <SelectItem value="all" className="font-bold text-primary">Semua Sales</SelectItem>
                {salesmen.map((s: any) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Brand Select */}
        {showBrand && (
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Merek / Brand</Label>
            <Select value={merekId} onValueChange={setMerekId}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Semua Merek" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-xl overflow-hidden">
                <SelectItem value="all" className="font-bold text-primary">Semua Merek</SelectItem>
                {brands.map((b: any) => (
                  <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-end gap-2 lg:col-span-1">
          <Button 
            onClick={handleApply}
            className="flex-1 h-10 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary/90 transition-all active:scale-95"
          >
            <Search className="h-4 w-4 mr-2" />
            Terapkan
          </Button>
          <Button 
            variant="outline"
            onClick={handleReset}
            className="h-10 w-10 p-0 border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
