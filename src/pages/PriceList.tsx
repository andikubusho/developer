import React, { useState, useEffect } from 'react';
import { FileText, Upload, Printer, ArrowLeft, Trash2, Download, Table, Archive, Plus, Percent, CheckCircle2, XCircle, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { MarketingDocument, PriceListItem, Sale, Project } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { getMockData, saveMockData } from '../lib/storage';
import { PriceItemForm } from '../components/forms/PriceItemForm';
import jsPDF from 'jspdf';
import logoPerusahaan from '../assets/logo-perusahaan.png';
import logoProyek from '../assets/logo-proyek.png';

// Konstanta Global
const BANK_ACCOUNTS = {
  bca:     { number: '545-068-1008',       name: 'PT. Abadi Lestari Mandiri' },
  mandiri: { number: '132-050-768-0162',   name: 'PT. Abadi Lestari Mandiri' },
  bni:     { number: '820-568-0822',       name: 'PT. Abadi Lestari Mandiri' },
};

const PriceList: React.FC = () => {
  const { isMockMode, setDivision } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [priceItems, setPriceItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceListItem | null>(null);
  const [updatePercent, setUpdatePercent] = useState<number>(5);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchPriceItems();
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      if (isMockMode) {
        const defaultProjects: Project[] = [
          {
            id: 'proj-gc',
            name: 'Golden Canyon',
            developer: 'PT. Abadi Lestari Mandiri',
            location: 'Tasikmalaya',
            description: 'Hunian Mewah Modern',
            total_units: 50,
            status: 'ongoing',
            active: true,
            settings: { bunga_flat: 0.08, dp_percentage: 0.20, booking_fee: 15000000 },
            created_at: new Date().toISOString()
          },
          {
            id: 'proj-ga',
            name: 'Griya Asri',
            developer: 'PT. Abadi Lestari Mandiri',
            location: 'Ciamis',
            description: 'Perumahan Subsidi Berkualitas',
            total_units: 100,
            status: 'ongoing',
            active: true,
            settings: { bunga_flat: 0.10, dp_percentage: 0.10, booking_fee: 5000000 },
            created_at: new Date().toISOString()
          }
        ];
        setProjects(defaultProjects);
        setSelectedProjectId(defaultProjects[0].id);
        return;
      }

      const { data } = await supabase.from('projects').select('*').eq('active', true);
      if (data && data.length > 0) {
        setProjects(data);
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchPriceItems = async () => {
    if (!selectedProjectId) return;
    try {
      setLoading(true);
      
      let items: PriceListItem[] = [];
      let sales: Sale[] = [];

      if (isMockMode) {
        const defaultItems: PriceListItem[] = [
          // Golden Canyon
          { id: '1', unit_id: 'unit-gc-01', project_id: 'proj-gc', category: 'Ruko', blok: 'GC', unit: '01', tipe: 'Grand', luas_tanah: 95, luas_bangunan: 125, harga_jual: 1470375000, booking_fee: 15000000, dp_percentage: 0.20, status: 'available', created_at: new Date().toISOString() },
          { id: '2', unit_id: 'unit-gc-02', project_id: 'proj-gc', category: 'Ruko', blok: 'GC', unit: '02-17', tipe: 'Grand', luas_tanah: 68, luas_bangunan: 125, harga_jual: 1331775000, booking_fee: 15000000, dp_percentage: 0.20, status: 'available', created_at: new Date().toISOString() },
          // Griya Asri
          { id: '101', unit_id: 'unit-ga-a1', project_id: 'proj-ga', category: 'Rumah', cluster: 'East', blok: 'A', unit: '01', tipe: 'Subsidi', luas_tanah: 60, luas_bangunan: 36, harga_jual: 162000000, booking_fee: 1000000, dp_percentage: 0.10, status: 'available', created_at: new Date().toISOString() },
        ];
        items = getMockData<PriceListItem>('price_list_items', defaultItems)
          .filter(i => i.project_id === selectedProjectId);
        sales = getMockData<Sale>('sales', []);
      } else {
        const { data: itemsData } = await supabase
          .from('price_list_items')
          .select('*')
          .eq('project_id', selectedProjectId)
          .order('created_at', { ascending: true });
        
        const { data: salesData } = await supabase.from('sales').select('*');
        items = itemsData || [];
        sales = salesData || [];
      }

      // Auto-SOLD Logic
      const itemsWithStatus = items.map(item => {
        const hasSale = sales.some(sale => sale.unit_id === item.unit_id);
        return {
          ...item,
          status: hasSale ? 'sold' : 'available'
        };
      });

      setPriceItems(itemsWithStatus);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPR = (item: PriceListItem) => {
    const activeProject = projects.find(p => p.id === selectedProjectId);
    const settings = activeProject?.settings || { bunga_flat: 0.08, dp_percentage: 0.20, booking_fee: 15000000 };
    
    const dp_amount = item.harga_jual * item.dp_percentage;
    const uang_muka_kpr = dp_amount - item.booking_fee;
    const plafond_kpr = item.harga_jual - dp_amount;
    
    const calculateAngsuran = (tahun: number) => {
      if (plafond_kpr <= 0) return 0;
      return (plafond_kpr * (1 + settings.bunga_flat * tahun)) / (tahun * 12);
    };

    return {
      dp_amount,
      uang_muka_kpr,
      plafond_kpr,
      angsuran_5: calculateAngsuran(5),
      angsuran_10: calculateAngsuran(10),
      angsuran_15: calculateAngsuran(15),
    };
  };

  const handleUpdatePrice = (id: string, newPrice: number) => {
    const updatedItems = priceItems.map(item => 
      item.id === id ? { ...item, harga_jual: newPrice } : item
    );
    setPriceItems(updatedItems);
    if (isMockMode) {
      const allItems = getMockData<PriceListItem>('price_list_items', []);
      const updatedAll = allItems.map(i => i.id === id ? { ...i, harga_jual: newPrice } : i);
      saveMockData('price_list_items', updatedAll);
    }
  };

  const handleSubmitItem = async (data: any) => {
    try {
      setLoading(true);
      const newItem: PriceListItem = {
        id: editingItem?.id || Math.random().toString(36).substr(2, 9),
        unit_id: editingItem?.unit_id || `unit-${data.blok.toLowerCase()}-${data.unit.toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
        project_id: selectedProjectId,
        ...data,
        status: editingItem?.status || 'available',
        created_at: editingItem?.created_at || new Date().toISOString()
      };

      if (isMockMode) {
        const allItems = getMockData<PriceListItem>('price_list_items', []);
        let updatedItems;
        if (editingItem) {
          updatedItems = allItems.map(i => i.id === editingItem.id ? newItem : i);
        } else {
          updatedItems = [newItem, ...allItems];
        }
        saveMockData('price_list_items', updatedItems);
      } else {
        if (editingItem) {
          await supabase.from('price_list_items').update(newItem).eq('id', editingItem.id);
        } else {
          await supabase.from('price_list_items').insert([newItem]);
        }
      }
      
      fetchPriceItems();
      setIsItemModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus unit ini?')) return;
    try {
      if (isMockMode) {
        const allItems = getMockData<PriceListItem>('price_list_items', []);
        const updated = allItems.filter(i => i.id !== id);
        saveMockData('price_list_items', updated);
      } else {
        await supabase.from('price_list_items').delete().eq('id', id);
      }
      fetchPriceItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleMassUpdate = () => {
    const updatedItems = priceItems.map(item => {
      if (selectedItems.includes(item.id)) {
        return { ...item, harga_jual: Math.round(item.harga_jual * (1 + updatePercent / 100)) };
      }
      return item;
    });
    setPriceItems(updatedItems);
    if (isMockMode) saveMockData('price_list_items', updatedItems);
    setIsUpdateModalOpen(false);
    setSelectedItems([]);
  };

  const generatePDF = () => {
    const activeProject = projects.find(p => p.id === selectedProjectId);
    const projectName = activeProject?.name || 'Golden Canyon';
    const settings = activeProject?.settings || { bunga_flat: 0.08, dp_percentage: 0.20, booking_fee: 15000000 };

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    // 1. Header Section with Logos
    // Company Logo (Top Right)
    try {
      pdf.addImage(logoPerusahaan, 'PNG', pageWidth - 35, 10, 25, 10);
    } catch (e) {
      console.warn('Could not add company logo to PDF', e);
    }

    // Project Logo (Center)
    try {
      pdf.addImage(logoProyek, 'PNG', (pageWidth - 40) / 2, 20, 40, 15);
    } catch (e) {
      pdf.setFontSize(18);
      pdf.setTextColor(20, 50, 50);
      pdf.text(projectName.toUpperCase(), pageWidth / 2, 25, { align: 'center' });
    }
    
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PRICE LIST', pageWidth / 2, 38, { align: 'center' });

    // 2. Table Header Setup
    let y = 40;
    pdf.setFontSize(7);
    pdf.setDrawColor(200);
    pdf.setLineWidth(0.1);

    const drawTableHeader = (startY: number) => {
      // Background for header
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, startY, contentWidth, 12, 'F');
      pdf.rect(margin, startY, contentWidth, 12, 'S');

      // Vertical lines and labels
      const cols = [
        { label: 'Blok', w: 12 },
        { label: 'Unit', w: 12 },
        { label: 'Tipe', w: 20 },
        { label: 'Luas (m2)', w: 25 }, // Sub-cols: LT (12.5), LB (12.5)
        { label: 'Booking Fee', w: 20 },
        { label: 'Uang Muka', w: 22 },
        { label: 'Angsuran KPR (Estimasi)', w: 54 }, // Sub-cols: 5, 10, 15 (18 each)
        { label: 'Harga Jual', w: 25 }
      ];

      let currX = margin;
      
      // First Level Headers
      pdf.text('Blok', currX + 2, startY + 7.5); currX += 12;
      pdf.line(currX, startY, currX, startY + 12);
      
      pdf.text('Unit', currX + 2, startY + 7.5); currX += 12;
      pdf.line(currX, startY, currX, startY + 12);
      
      pdf.text('Tipe', currX + 2, startY + 7.5); currX += 20;
      pdf.line(currX, startY, currX, startY + 12);
      
      // Luas (Double Column)
      pdf.text('Luas (m2)', currX + 6, startY + 4);
      pdf.line(currX, startY + 6, currX + 25, startY + 6);
      pdf.text('LT', currX + 4, startY + 10);
      pdf.line(currX + 12.5, startY + 6, currX + 12.5, startY + 12);
      pdf.text('LB', currX + 16, startY + 10);
      currX += 25;
      pdf.line(currX, startY, currX, startY + 12);
      
      pdf.text('Booking Fee', currX + 2, startY + 7.5); currX += 20;
      pdf.line(currX, startY, currX, startY + 12);
      
      pdf.text('Uang Muka', currX + 2, startY + 7.5); currX += 22;
      pdf.line(currX, startY, currX, startY + 12);

      // Angsuran (Triple Column)
      pdf.text('Angsuran KPR (Bunga Flat 8%)', currX + 15, startY + 4);
      pdf.line(currX, startY + 6, currX + 54, startY + 6);
      pdf.text('5 Thn', currX + 4, startY + 10);
      pdf.line(currX + 18, startY + 6, currX + 18, startY + 12);
      pdf.text('10 Thn', currX + 21, startY + 10);
      pdf.line(currX + 36, startY + 6, currX + 36, startY + 12);
      pdf.text('15 Thn', currX + 39, startY + 10);
      currX += 54;
      pdf.line(currX, startY, currX, startY + 12);
      
      pdf.text('Harga Jual', currX + 4, startY + 7.5);
    };

    drawTableHeader(y);
    y += 12;

    // 3. Rows
    pdf.setFont('helvetica', 'normal');
    priceItems.forEach((item) => {
      // Check page break
      if (y > 250) {
        pdf.addPage();
        y = 20;
        drawTableHeader(y);
        y += 12;
      }

      const calc = calculateKPR(item);
      
      pdf.rect(margin, y, contentWidth, 8, 'S');
      
      let currX = margin;
      pdf.text(item.blok, currX + 2, y + 5.5); currX += 12;
      pdf.line(currX, y, currX, y + 8);
      
      pdf.text(item.unit, currX + 2, y + 5.5); currX += 12;
      pdf.line(currX, y, currX, y + 8);
      
      pdf.text(item.tipe, currX + 2, y + 5.5); currX += 20;
      pdf.line(currX, y, currX, y + 8);
      
      pdf.text(item.luas_tanah.toString(), currX + 4, y + 5.5); 
      pdf.line(currX + 12.5, y, currX + 12.5, y + 8);
      pdf.text(item.luas_bangunan.toString(), currX + 16, y + 5.5); currX += 25;
      pdf.line(currX, y, currX, y + 8);

      if (item.status === 'sold') {
        pdf.setFillColor(254, 242, 242);
        pdf.rect(currX, y + 0.1, contentWidth - (currX - margin), 7.8, 'F');
        pdf.setTextColor(220, 38, 38);
        pdf.setFont('helvetica', 'bold');
        pdf.text('S O L D', currX + (contentWidth - (currX - margin)) / 2, y + 5.5, { align: 'center' });
        pdf.setTextColor(0);
        pdf.setFont('helvetica', 'normal');
      } else {
        pdf.text(formatCurrency(item.booking_fee).replace('Rp', ''), currX + 2, y + 5.5); currX += 20;
        pdf.line(currX, y, currX, y + 8);
        
        pdf.text(formatCurrency(calc.uang_muka_kpr).replace('Rp', ''), currX + 2, y + 5.5); currX += 22;
        pdf.line(currX, y, currX, y + 8);
        
        pdf.text(formatCurrency(calc.angsuran_5).replace('Rp', ''), currX + 2, y + 5.5); 
        pdf.line(currX + 18, y, currX + 18, y + 8);
        pdf.text(formatCurrency(calc.angsuran_10).replace('Rp', ''), currX + 20, y + 5.5); 
        pdf.line(currX + 36, y, currX + 36, y + 8);
        pdf.text(formatCurrency(calc.angsuran_15).replace('Rp', ''), currX + 38, y + 5.5); currX += 54;
        pdf.line(currX, y, currX, y + 8);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(formatCurrency(item.harga_jual).replace('Rp', ''), currX + 2, y + 5.5);
        pdf.setFont('helvetica', 'normal');
      }
      
      y += 8;
    });

    // 4. Footer Section
    y += 10;
    if (y > 240) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HARGA SUDAH TERMASUK:', margin, y);
    pdf.setFont('helvetica', 'normal');
    const includes = [
      '1. Izin Mendirikan Bangunan (IMB)',
      '2. Biaya Penyambungan Listrik & Air',
      '3. Akta Jual Beli & Biaya Balik Nama',
      '4. Biaya Keamanan & Lingkungan'
    ];
    includes.forEach((text, i) => pdf.text(text, margin, y + 5 + (i * 4)));

    pdf.setFont('helvetica', 'bold');
    pdf.text('HARGA BELUM TERMASUK:', margin + 100, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text('1. PBB', margin + 100, y + 5);
    pdf.text('2. Biaya KPR', margin + 100, y + 9);

    y += 25;
    pdf.setFontSize(7);
    pdf.text('Pembayaran booking fee maupun uang muka dianggap sah bila melalui kasir kantor pusat dan menerima kuitansi asli, atau ke No. Rekening Bank:', margin, y);
    
    y += 5;
    const banks = [
      { name: 'BCA', no: '545-068-1008', owner: 'PT. Abadi Lestari Mandiri' },
      { name: 'Mandiri', no: '132-050-768-0162', owner: 'PT. Abadi Lestari Mandiri' },
      { name: 'BNI', no: '820-568-0822', owner: 'PT. Abadi Lestari Mandiri' }
    ];
    banks.forEach((bank, i) => {
      pdf.text(`${bank.name.padEnd(8)} : ${bank.no.padEnd(20)} ${bank.owner}`, margin + 5, y + (i * 4));
    });

    y += 15;
    pdf.setFont('helvetica', 'italic');
    pdf.text('* Harga sewaktu-waktu dapat berubah tanpa pemberitahuan terlebih dahulu', margin, y);
    pdf.text(`* Harga Berlaku per ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, y + 4);

    pdf.save(`Price-List-${projectName.replace(/\s+/g, '-')}-${new Date().toLocaleDateString('id-ID')}.pdf`);
  };

  return (
    <div id="price-list-container" className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: portrait; 
            margin: 5mm !important; 
          }
          body {
            background: white !important;
          }
          .print-hidden {
            display: none !important;
          }
          #price-list-container {
            margin: 0 !important;
            padding: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 4px !important;
            font-size: 8px !important;
          }
        }
      `}} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print-hidden">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDivision(null)}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-6">
            <img src={logoProyek} alt="Logo Proyek" className="h-16 w-auto object-contain" />
            <div className="h-12 w-px bg-slate-200" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Price List {projects.find(p => p.id === selectedProjectId)?.name}
              </h1>
              <p className="text-slate-500">Manajemen harga unit properti</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print-hidden">
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-lg border-slate-200 text-sm focus:ring-primary focus:border-primary bg-white px-4 py-2"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <>
            <Button variant="outline" onClick={() => setIsUpdateModalOpen(true)}>
              <Percent className="w-4 h-4 mr-2" />
              Update Harga
            </Button>
            <Button variant="outline" onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Unit
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Cetak Layar
            </Button>
            <Button onClick={generatePDF}>
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </>
        </div>
      </div>

      <div className="hidden print:block text-center mb-8">
        <h1 className="text-xl font-bold text-slate-900 uppercase">
          Price List {projects.find(p => p.id === selectedProjectId)?.name}
        </h1>
        <p className="text-xs text-slate-500 mt-1">Abadi Lestari Mandiri • Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p>
      </div>

      {/* Content */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold text-center border-r print-hidden">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300"
                      checked={selectedItems.length === priceItems.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedItems(priceItems.map(i => i.id));
                        else setSelectedItems([]);
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold border-r">Blok</th>
                  <th className="px-4 py-3 font-semibold border-r">Unit</th>
                  <th className="px-4 py-3 font-semibold border-r">Tipe</th>
                  <th className="px-4 py-3 font-semibold text-center border-r" colSpan={2}>Luas (m2)</th>
                  <th className="px-4 py-3 font-semibold border-r">Booking Fee</th>
                  <th className="px-4 py-3 font-semibold text-center border-r" colSpan={3}>Angsuran KPR (Estimasi)</th>
                  <th className="px-4 py-3 font-semibold border-r">Uang Muka</th>
                  <th className="px-4 py-3 font-semibold border-r">Harga Jual (Rp)</th>
                  <th className="px-4 py-3 font-semibold">Aksi</th>
                </tr>
                <tr className="bg-slate-50/50 text-slate-400 text-[9px] uppercase border-b">
                  <th className="border-r print-hidden"></th>
                  <th className="border-r"></th>
                  <th className="border-r"></th>
                  <th className="border-r"></th>
                  <th className="px-2 py-2 text-center border-r">Tnh</th>
                  <th className="px-2 py-2 text-center border-r">Bgn</th>
                  <th className="border-r"></th>
                  <th className="px-2 py-2 text-center border-r">5 Thn</th>
                  <th className="px-2 py-2 text-center border-r">10 Thn</th>
                  <th className="px-2 py-2 text-center border-r">15 Thn</th>
                  <th className="border-r"></th>
                  <th className="border-r"></th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priceItems.map((item) => {
                  const calc = calculateKPR(item);
                  return (
                    <tr key={item.id} className={cn(
                      "hover:bg-slate-50 transition-colors group",
                      item.status === 'sold' && "bg-slate-50/50"
                    )}>
                      <td className="px-4 py-3 text-center border-r print-hidden">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedItems([...selectedItems, item.id]);
                            else setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900 border-r">{item.blok}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 border-r">{item.unit}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 border-r">{item.tipe}</td>
                      <td className="px-2 py-3 text-xs text-center text-slate-600 border-r">{item.luas_tanah}</td>
                      <td className="px-2 py-3 text-xs text-center text-slate-600 border-r">{item.luas_bangunan}</td>
                      
                      {item.status === 'sold' ? (
                        <td colSpan={6} className="px-4 py-3 text-center relative overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center bg-red-50/30">
                            <span className="text-xl font-black text-red-100 tracking-[1em] select-none opacity-50">S O L D</span>
                          </div>
                          <span className="relative z-10 text-xs font-bold text-red-600">UNIT TERJUAL</span>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-xs text-slate-600 border-r">{formatCurrency(item.booking_fee)}</td>
                          <td className="px-2 py-3 text-[11px] text-slate-600 border-r">{formatCurrency(calc.angsuran_5)}</td>
                          <td className="px-2 py-3 text-[11px] text-slate-600 border-r">{formatCurrency(calc.angsuran_10)}</td>
                          <td className="px-2 py-3 text-[11px] text-slate-600 border-r">{formatCurrency(calc.angsuran_15)}</td>
                          <td className="px-4 py-3 text-xs font-medium text-amber-700 border-r bg-amber-50/30">{formatCurrency(calc.uang_muka_kpr)}</td>
                          <td className="px-4 py-3 text-sm font-bold text-primary border-r">{formatCurrency(item.harga_jual)}</td>
                        </>
                      )}
                      
                      <td className="px-4 py-3 print-hidden">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setEditingItem(item);
                              setIsItemModalOpen(true);
                            }}
                            className="p-1 h-auto text-slate-400 hover:text-primary"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 h-auto text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      </Card>

      {/* Modal Tambah/Edit Item */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "Edit Unit" : "Tambah Unit Baru"}
      >
        <PriceItemForm 
          initialData={editingItem || undefined}
          availableTypes={Array.from(new Set(priceItems.map(i => i.tipe))).filter(Boolean)}
          onSubmit={handleSubmitItem}
          onCancel={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
          loading={loading}
        />
      </Modal>

      {/* Modal Update Harga Massal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Update Harga Massal"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Menaikkan harga untuk {selectedItems.length} unit yang dipilih.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Persentase Kenaikan (%)</label>
            <div className="relative">
              <Input 
                type="number"
                value={updatePercent}
                onChange={(e) => setUpdatePercent(parseFloat(e.target.value) || 0)}
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Percent className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-800 font-medium">Preview Kenaikan:</p>
            <div className="mt-2 space-y-1">
              {selectedItems.slice(0, 5).map(id => {
                const item = priceItems.find(i => i.id === id);
                if (!item) return null;
                const newPrice = Math.round(item.harga_jual * (1 + updatePercent / 100));
                return (
                  <div key={id} className="flex justify-between text-[10px] py-1 border-b border-amber-200/50 last:border-0">
                    <span className="text-slate-600">{item.blok} {item.unit}</span>
                    <span className="font-bold text-amber-900">
                      {formatCurrency(item.harga_jual)} → <span className="text-emerald-600">{formatCurrency(newPrice)}</span>
                    </span>
                  </div>
                );
              })}
              {selectedItems.length > 5 && <p className="text-[10px] text-amber-600 text-center mt-2">...dan {selectedItems.length - 5} unit lainnya</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>Batal</Button>
            <Button 
              onClick={handleMassUpdate} 
              disabled={selectedItems.length === 0}
            >
              Apply Kenaikan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PriceList;
