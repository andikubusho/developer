
import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Customer {
  id: number | string;
  name: string;
  code?: string;
}

interface CustomerSearchSelectProps {
  customers: Customer[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  allowAll?: boolean;
}

export function CustomerSearchSelect({
  customers,
  value,
  onValueChange,
  placeholder = "Pilih pelanggan...",
  emptyMessage = "Pelanggan tidak ditemukan.",
  className,
  allowAll = false,
}: CustomerSearchSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCustomer = React.useMemo(() => {
    if (value === "all" && allowAll) return { id: "all", name: "Semua Pelanggan" };
    return customers.find((c) => c.id.toString() === value);
  }, [customers, value, allowAll]);

  const displayCustomers = React.useMemo(() => {
    const list = [...customers];
    if (allowAll) {
      list.unshift({ id: "all", name: "Semua Pelanggan", code: "ALL" });
    }
    return list;
  }, [customers, allowAll]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-11 px-3 font-semibold", className)}
        >
          <span className="truncate">
            {selectedCustomer ? (
              <span className="flex items-center gap-2 text-slate-800">
                {selectedCustomer.name}
                {selectedCustomer.code && selectedCustomer.code !== "ALL" && (
                  <span className="text-[10px] text-slate-400 font-mono">({selectedCustomer.code})</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari nama atau kode pelanggan..." className="h-10 text-xs" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {displayCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`${customer.name} ${customer.code || ""}`}
                  onSelect={() => {
                    onValueChange(customer.id.toString());
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-2 text-xs font-bold"
                >
                  <div className="flex flex-col">
                    <span className="uppercase">{customer.name}</span>
                    {customer.code && customer.code !== "ALL" && (
                      <span className="text-[10px] text-indigo-500 font-mono">{customer.code}</span>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === customer.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
