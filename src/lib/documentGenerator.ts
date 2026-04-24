import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { Sale } from "../types";
import { formatCurrency } from "./utils";

// Helper for Indonesian Terbilang (Numbers to Words)
const terbilang = (nilai: number): string => {
  const bilangan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  if (nilai < 12) return " " + bilangan[nilai];
  if (nilai < 20) return terbilang(nilai - 10) + " Belas";
  if (nilai < 100) return terbilang(Math.floor(nilai / 10)) + " Puluh" + terbilang(nilai % 10);
  if (nilai < 200) return " Seratus" + terbilang(nilai - 100);
  if (nilai < 1000) return terbilang(Math.floor(nilai / 100)) + " Ratus" + terbilang(nilai % 100);
  if (nilai < 2000) return " Seribu" + terbilang(nilai - 1000);
  if (nilai < 1000000) return terbilang(Math.floor(nilai / 1000)) + " Ribu" + terbilang(nilai % 1000);
  if (nilai < 1000000000) return terbilang(Math.floor(nilai / 1000000)) + " Juta" + terbilang(nilai % 1000000);
  return "";
};

export const generateWordDocument = async (sale: Sale, templateBlob: Blob, filename: string) => {
  try {
    const reader = new FileReader();
    const content = await new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(templateBlob);
    });

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    // ENHANCED DATA MAPPING for Agrements (Perjanjian)
    const dataMapping = {
      // Konsumen
      nama_konsumen: sale.customer?.full_name || "",
      nik_konsumen: (sale.customer as any)?.nik || "",
      alamat_konsumen: (sale.customer as any)?.address || "",
      telp_konsumen: (sale.customer as any)?.phone || "",
      email_konsumen: (sale.customer as any)?.email || "",

      // Proyek & Unit
      nama_proyek: sale.unit?.project?.name || "Golden Canyon",
      blok_unit: sale.unit?.unit_number?.split('-')[0] || "",
      nomor_unit: sale.unit?.unit_number?.split('-')[1] || sale.unit?.unit_number || "",
      tipe_unit: (sale.unit as any)?.tipe || "",
      luas_tanah: (sale.unit as any)?.luas_tanah || "",
      luas_bangunan: (sale.unit as any)?.luas_bangunan || "",

      // Finansial
      harga_jual: formatCurrency(sale.final_price),
      harga_terbilang: terbilang(sale.final_price) + " Rupiah",
      booking_fee: formatCurrency(sale.booking_fee || 0),
      booking_fee_terbilang: terbilang(sale.booking_fee || 0) + " Rupiah",
      dp_amount: formatCurrency((sale as any).dp_amount || 0),
      dp_terbilang: terbilang((sale as any).dp_amount || 0) + " Rupiah",
      sisa_pelunasan: formatCurrency(sale.final_price - (sale.booking_fee || 0) - ((sale as any).dp_amount || 0)),
      
      // Metode Bayar
      metode_bayar: sale.payment_method === 'cash' ? 'CASH KERAS' : sale.payment_method === 'installment' ? 'CASH BERTAHAP' : 'KPR',
      
      // Marketing & Tanggal
      nama_marketing: (sale.marketing as any)?.name || (sale.marketing as any)?.full_name || "Internal",
      tanggal_hari_ini: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      tanggal_transaksi: sale.sale_date ? new Date(sale.sale_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-",
      
      // Jadwal Cicilan (Looping support in Word using {{#installments}} ... {{/installments}})
      installments: (sale as any).installments?.map((inst: any, index: number) => ({
        no: index + 1,
        tgl: inst.due_date ? new Date(inst.due_date).toLocaleDateString('id-ID') : "-",
        nilai: formatCurrency(inst.amount || 0)
      })) || []
    };

    doc.render(dataMapping);
    const out = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    saveAs(out, `${filename}.docx`);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
