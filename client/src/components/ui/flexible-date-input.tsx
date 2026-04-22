
import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { id } from "date-fns/locale";

interface FlexibleDateInputProps {
  value: string | Date; // Internal state usually "yyyy-MM-dd" or Date object
  onChange: (value: any) => void;
  className?: string;
  disabled?: boolean;
}

export function FlexibleDateInput({ value, onChange, className, disabled }: FlexibleDateInputProps) {
  const [inputValue, setInputValue] = React.useState("");

  // Convert incoming value to "DD/MM/YYYY" for display
  React.useEffect(() => {
    if (value) {
      const d = value instanceof Date ? value : new Date(value);
      if (isValid(d)) {
        setInputValue(format(d, "dd/MM/yyyy"));
      }
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ""); // Keep only digits
    
    // Apply Mask: DD/MM/YYYY
    let masked = "";
    if (val.length > 0) {
      masked += val.substring(0, 2);
      if (val.length > 2) {
        masked += "/" + val.substring(2, 4);
        if (val.length > 4) {
          masked += "/" + val.substring(4, 8);
        }
      }
    }
    
    setInputValue(masked);

    // If complete (10 chars including slashes), try to parse and update parent
    if (masked.length === 10) {
      const parsed = parse(masked, "dd/MM/yyyy", new Date(), { locale: id });
      if (isValid(parsed)) {
        // Match parent's expectation (Date or String)
        if (value instanceof Date) {
          onChange(parsed);
        } else {
          onChange(format(parsed, "yyyy-MM-dd"));
        }
      }
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      if (value instanceof Date) {
        onChange(date);
      } else {
        onChange(format(date, "yyyy-MM-dd"));
      }
      setInputValue(format(date, "dd/MM/yyyy"));
    }
  };

  return (
    <div className={cn("flex gap-2 items-center", className)}>
      <div className="relative flex-1">
        <Input
          placeholder="DD/MM/YYYY"
          value={inputValue}
          onChange={handleInputChange}
          maxLength={10}
          className="h-11 rounded-xl bg-white border-slate-200 font-bold placeholder:font-normal"
          disabled={disabled}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 pointer-events-none uppercase tracking-tighter">
          Ketik Manual
        </div>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl bg-white border-slate-200 text-slate-400 hover:text-indigo-600 shadow-sm"
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="end">
          <Calendar
            mode="single"
            selected={value ? (value instanceof Date ? value : new Date(value)) : undefined}
            onSelect={handleCalendarSelect}
            initialFocus
            locale={id}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
