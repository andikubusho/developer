import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { format, parse, isValid } from "date-fns"
import { id } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeFormat(dateStr: string | Date | null | undefined, formatStr: string = "dd MMM yyyy, HH:mm") {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Invalid Date";
  return format(date, formatStr, { locale: id });
}

export const parseIndonesiaDate = (dateStr: string) => {
  if (!dateStr) return "";
  
  // Jika sudah ISO string (mengandung T dan Z), kembalikan apa adanya
  if (dateStr.includes('T') && dateStr.includes('Z')) return dateStr;
  
  try {
    // Trim spasi dan coba parse format DD/MM/YYYY
    const cleanDate = dateStr.trim();
    const parsedDate = parse(cleanDate, 'dd/MM/yyyy', new Date());
    
    if (isValid(parsedDate)) {
      return parsedDate.toISOString();
    }
    
    // Coba fallback ke native Date jika parse gagal tapi string tampak seperti tanggal
    const nativeDate = new Date(cleanDate);
    if (isValid(nativeDate)) return nativeDate.toISOString();
    
    return dateStr; // Fallback terakhir
  } catch (err) {
    return dateStr;
  }
};

export const formatIndonesiaDate = (date: string | Date | null | undefined) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
};

export const formatRibuan = (value: string | number | null | undefined) => {
  if (value === undefined || value === null || value === "") return "";
  const angka = value.toString().replace(/\./g, "").replace(/\D/g, "");
  if (!angka) return "";
  return angka.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const parseRibuan = (value: string) => {
  return value.replace(/\./g, "");
};

