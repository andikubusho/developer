import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { FileText, Printer, ArrowLeft, Trash2, Plus, Percent, Edit2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { PriceListItem, Project } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { PriceItemForm } from '../components/forms/PriceItemForm';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logoProyek from '../assets/logo-proyek.png';
import logoPerusahaan from '../assets/logo-perusahaan.png';
import { api } from '../lib/api';

const PriceList: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
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
      const data = await api.get('projects', 'select=*&active=eq.true');
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
      const [items, unitsData] = await Promise.all([
        api.get('price_list_items', `select=*&project_id=eq.${selectedProjectId}&order=created_at.asc`),
        api.get('units', `select=unit_number,type,luas_tanah,luas_bangunan,price,status,is_blocking&project_id=eq.${selectedProjectId}`)
      ]);

      const parseUnitNum = (raw: string): [string, string] => {
        if (!raw) return ['', ''];
        // Remove all spaces and dashes for normalized matching
        const clean = raw.toLowerCase().replace(/[\s-]+/g, '');
        const match = clean.match(/^([a-z]+)(\d+)$/);
        if (match) return [match[1], match[2]];
        
        // Fallback to original split logic if not simple alphanumeric
        const parts = raw.split(/[\s-]+/).filter(Boolean);
        if (parts.length >= 2) return [parts[0].toLowerCase(), parts[parts.length - 1].toLowerCase()];
        return [raw.toLowerCase(), ''];
      };

      const unitStatusMap: Record<string, { status: string; isBlocking: boolean }> = {};
      (unitsData || []).forEach((u: any) => {
        const [blok, unitNum] = parseUnitNum(u.unit_number || '');
        if (blok && unitNum) {
          // Store both original and a "clean" version of the blok name
          unitStatusMap[`${blok}|${unitNum}`] = { status: u.status, isBlocking: !!u.is_blocking };
          // Handle common typos like "easth" instead of "east"
          const fuzzyBlok = blok.replace(/h$/, ''); 
          if (fuzzyBlok !== blok) {
            unitStatusMap[`${fuzzyBlok}|${unitNum}`] = { status: u.status, isBlocking: !!u.is_blocking };
          }
        }
      });

      const itemsWithStatus = (items || []).map((item: PriceListItem) => {
        const blok = (item.blok || '').toLowerCase();
        const unit = (item.unit || '').toLowerCase();
        const key = `${blok}|${unit}`;
        const unitData = unitStatusMap[key];

        return {
          ...item,
          status: (unitData?.status === 'sold' || unitData?.isBlocking) ? 'sold' : 'available'
        };
      });

      // Blocked units that have no price_list_item entry — still show as SOLD
      const existingKeys = new Set(itemsWithStatus.map((i: any) => {
        return `${(i.blok || '').toLowerCase()}|${(i.unit || '').toLowerCase()}`;
      }));
      const missingBlocked: any[] = (unitsData || [])
        .filter((u: any) => u.is_blocking)
        .map((u: any) => {
          const [blok, unitNum] = parseUnitNum(u.unit_number || '');
          return { blok, unitNum };
        })
        .filter(({ blok, unitNum }) => blok && unitNum && !existingKeys.has(`${blok}|${unitNum}`))
        .map(({ blok, unitNum }) => {
          // Find the original unit data to fill details
          const unitEntry = (unitsData || []).find((u: any) => {
            const [b, n] = parseUnitNum(u.unit_number || '');
            return b === blok && n === unitNum;
          });
          return {
            id: `blocked-${blok}-${unitNum}`,
            project_id: selectedProjectId,
            blok: blok.toUpperCase(),
            unit: unitNum,
            tipe: unitEntry?.type || '',
            luas_tanah: unitEntry?.luas_tanah || 0,
            luas_bangunan: unitEntry?.luas_bangunan || 0,
            harga_jual: unitEntry?.price || 0,
            booking_fee: 0,
            category: unitEntry?.category || 'RUMAH',
            status: 'sold',
          };
        });

      setPriceItems([...itemsWithStatus, ...missingBlocked]);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPR = (item: PriceListItem) => {
    const activeProject = projects.find(p => p.id === selectedProjectId);
    const settings = activeProject?.settings || { bunga_flat: 0.0493, dp_percentage: 0.20, booking_fee: 15000000 };
    
    const dp_percentage = item.category === 'Ruko' ? 0.20 : 0.10;
    const booking_fee = item.booking_fee || settings.booking_fee;
    const dp_amount = item.harga_jual * dp_percentage;
    const plafond_kpr = item.harga_jual - dp_amount;
    
    const calculateAngsuran = (tahun: number) => {
      if (plafond_kpr <= 0) return 0;
      return Math.ceil((plafond_kpr * (1 + (settings.bunga_flat || 0.0493) * tahun)) / (tahun * 12));
    };

    return {
      dp_percentage,
      dp_amount,
      plafond_kpr,
      angsuran_5: calculateAngsuran(5),
      angsuran_10: calculateAngsuran(10),
      angsuran_15: calculateAngsuran(15),
    };
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('price-list-print-content');
    if (!element) return;
    
    try {
      setLoading(true);
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const projectName = projects.find(p => p.id === selectedProjectId)?.name || 'Proyek';
      pdf.save(`Price-List-${projectName}-${new Date().toLocaleDateString('id-ID')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF. Silakan coba fitur Cetak (Print to PDF) sebagai alternatif.');
    } finally {
      setLoading(false);
    }
  };

  const getGroupedItems = () => {
    const categories = Array.from(new Set(priceItems.map(i => i.category))).filter(Boolean);
    const result: any[] = [];
    categories.forEach(cat => {
      const catItems = priceItems.filter(i => i.category === cat);
      if (catItems.length === 0) return;
      const groupsByBlok: any = {};
      catItems.forEach(item => {
        if (!groupsByBlok[item.blok]) groupsByBlok[item.blok] = [];
        groupsByBlok[item.blok].push(item);
      });
      const catGroups: any[] = [];
      Object.keys(groupsByBlok).forEach(blok => {
        const items = groupsByBlok[blok].sort((a: any, b: any) => (parseInt(a.unit) || 0) - (parseInt(b.unit) || 0));
        const mergedInBlok: any[] = [];
        let currentGroup: any[] = [];
        items.forEach((item: any, idx: number) => {
          if (idx === 0) { currentGroup = [item]; } else {
            const prev = items[idx - 1];
            const isMatch = item.tipe === prev.tipe && item.luas_tanah === prev.luas_tanah && item.luas_bangunan === prev.luas_bangunan && item.harga_jual === prev.harga_jual && item.status === prev.status;
            if (isMatch) { currentGroup.push(item); } else { mergedInBlok.push(currentGroup); currentGroup = [item]; }
          }
          if (idx === items.length - 1) { mergedInBlok.push(currentGroup); }
        });
        catGroups.push({ blok, groups: mergedInBlok });
      });
      result.push({ category: cat, bloks: catGroups });
    });
    return result;
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus unit ini?')) return;
    try {
      setLoading(true);
      await api.delete('price_list_items', id);
      await fetchPriceItems();
    } catch (error: any) {
      console.error('Error deleting item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMassUpdate = async () => {
    if (!confirm(`Update harga ${selectedItems.length} unit?`)) return;
    try {
      setLoading(true);
      for (const id of selectedItems) {
        const item = priceItems.find(i => i.id === id);
        if (item) {
          const newPrice = Math.round(item.harga_jual * (1 + updatePercent / 100));
          await api.update('price_list_items', id, { harga_jual: newPrice });
        }
      }
      await fetchPriceItems();
      setIsUpdateModalOpen(false);
      setSelectedItems([]);
    } catch (error: any) {
      console.error('Mass update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitItem = async (data: any) => {
    // Check for duplicates (Blok and Unit must be unique within the project)
    const isDuplicate = priceItems.some(item => 
      item.blok.toLowerCase() === data.blok.toLowerCase() && 
      item.unit.toLowerCase() === data.unit.toLowerCase() &&
      (!editingItem || item.id !== editingItem.id)
    );

    if (isDuplicate) {
      alert(`PERINGATAN: Unit dengan Blok "${data.blok}" dan Nomor "${data.unit}" sudah ada dalam Price List. Gunakan Blok/Unit lain atau edit data yang sudah ada.`);
      return;
    }

    try {
      setLoading(true);
      const payload = { project_id: selectedProjectId, ...data };
      if (editingItem) {
        await api.update('price_list_items', editingItem.id, payload);
      } else {
        await api.insert('price_list_items', {
          ...payload,
          unit_id: `unit-${data.blok.toLowerCase()}-${data.unit.toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
          status: 'available'
        });
      }
      await fetchPriceItems();
      setIsItemModalOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error('Error saving item:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="price-list-container" className="space-y-6 print:p-0 print:m-0">
      
      {/* ─── SCREEN UI: Modern App View (REVERTED TO ORIGINAL) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print px-4 pt-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-1 sm:p-2 h-auto">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-text-primary tracking-tight">Price List</h1>
            <p className="text-[10px] sm:text-sm text-text-secondary font-medium uppercase tracking-widest">{projects.find(p => p.id === selectedProjectId)?.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-xl border-white/40 text-[10px] sm:text-sm bg-white px-2 sm:px-4 py-1.5 sm:py-2 flex-1 sm:flex-none"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-[9px] sm:text-xs h-9 px-2" onClick={() => setIsUpdateModalOpen(true)}><Percent className="w-3 h-3 mr-1" />Update</Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-[9px] sm:text-xs h-9 px-2" onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}><Plus className="w-3 h-3 mr-1" />Unit</Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-[9px] sm:text-xs h-9 px-2" onClick={handleExportPDF}><FileText className="w-3 h-3 mr-1" />Export PDF</Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-[9px] sm:text-xs h-9 px-2" onClick={() => window.print()}><Printer className="w-3 h-3 mr-1" />Cetak</Button>
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-premium rounded-xl no-print mx-4">
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
              <THead>
                <TR className="bg-accent-dark text-white text-[8px] uppercase tracking-wider font-black">
                  <TH rowSpan={2} className="px-1 py-3 text-center border-r border-white/40 w-6">
                    <input type="checkbox" className="rounded bg-accent-dark/80 border-white/40 w-3 h-3" checked={selectedItems.length === priceItems.length && priceItems.length > 0} onChange={(e) => setSelectedItems(e.target.checked ? priceItems.map(i => i.id) : [])} />
                  </TH>
                  <TH rowSpan={2} className="px-2 py-3 border-r border-white/40">Unit</TH>
                  <TH rowSpan={2} className="px-2 py-3 border-r border-white/40 hidden sm:table-cell">Tipe</TH>
                  <TH colSpan={2} className="px-1 py-1.5 text-center border-b border-r border-white/40 hidden md:table-cell">Luas</TH>
                  <TH rowSpan={2} className="px-2 py-3 border-r border-white/40 hidden lg:table-cell">Booking</TH>
                  <TH rowSpan={2} className="px-2 py-3 border-r border-white/40 text-center hidden md:table-cell">DP</TH>
                  <TH colSpan={3} className="px-1 py-1.5 text-center border-b border-r border-white/40 hidden xl:table-cell">KPR</TH>
                  <TH rowSpan={2} className="px-2 py-3 border-r border-white/40 text-right">Harga Jual</TH>
                  <TH rowSpan={2} className="px-1 py-3 text-center w-8">Aksi</TH>
                </TR>
                <TR className="bg-accent-dark/80 text-text-muted text-[7px] uppercase tracking-tighter font-bold">
                  <TH className="px-1 py-1.5 text-center border-r border-white/40 hidden md:table-cell">Tnh</TH>
                  <TH className="px-1 py-1.5 text-center border-r border-white/40 hidden md:table-cell">Bgn</TH>
                  <TH className="px-1 py-1.5 text-center border-r border-white/40 hidden xl:table-cell">5 Th</TH>
                  <TH className="px-1 py-1.5 text-center border-r border-white/40 hidden xl:table-cell">10 Th</TH>
                  <TH className="px-1 py-1.5 text-center border-r border-white/40 hidden xl:table-cell">15 Th</TH>
                </TR>
              </THead>
              <TBody>
                {Array.from(new Set(priceItems.map(i => i.category))).filter(Boolean).map((cat) => {
                  const catItems = priceItems.filter(i => i.category === cat);
                  if (catItems.length === 0) return null;
                  return (
                    <React.Fragment key={cat}>
                      <TR className="bg-white/30">
                        <TD colSpan={13} className="px-3 py-1.5 text-[9px] font-black text-text-primary uppercase tracking-widest border-y border-white/40">{cat}</TD>
                      </TR>
                      {catItems.map((item) => {
                        const calc = calculateKPR(item);
                        const isSold = item.status === 'sold';
                        return (
                          <TR key={item.id} className={cn("transition-colors group text-[9px]", isSold ? "bg-slate-100/80 opacity-80" : "hover:bg-white/30")}>
                            <TD className="px-1 py-2 text-center border-r border-white/20"><input type="checkbox" className="rounded w-3 h-3" checked={selectedItems.includes(item.id)} onChange={(e) => setSelectedItems(e.target.checked ? [...selectedItems, item.id] : selectedItems.filter(id => id !== item.id))} /></TD>
                            <TD className={cn("px-2 py-2 font-black border-r border-white/20 uppercase whitespace-nowrap", isSold ? "text-slate-400 line-through" : "text-text-primary")}>
                              {item.blok}-{item.unit}
                              <div className="sm:hidden text-[7px] font-medium text-text-secondary">{item.tipe}</div>
                            </TD>
                            <TD className="px-2 py-2 font-medium text-text-secondary border-r border-white/20 truncate max-w-[60px] hidden sm:table-cell">{item.tipe}</TD>
                            <TD className="px-1 py-2 text-center text-text-secondary border-r border-white/20 hidden md:table-cell">{item.luas_tanah}</TD>
                            <TD className="px-1 py-2 text-center text-text-secondary border-r border-white/20 hidden md:table-cell">{item.luas_bangunan}</TD>
                            {isSold ? (
                              <TD colSpan={6} className="px-4 py-2 text-center bg-red-50/60">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-[9px] font-black uppercase tracking-widest">SOLD OUT</span>
                              </TD>
                            ) : (
                              <>
                                <TD className="px-2 py-2 text-text-secondary border-r border-white/20 whitespace-nowrap hidden lg:table-cell">{formatCurrency(item.booking_fee)}</TD>
                                <TD className="px-2 py-2 text-center border-r border-white/20 whitespace-nowrap hidden md:table-cell"><p className="font-bold text-text-primary leading-tight">{formatCurrency(calc.dp_amount)}</p></TD>
                                <TD className="px-1 py-2 text-center border-r border-white/20 font-bold text-accent-dark whitespace-nowrap hidden xl:table-cell">{formatCurrency(calc.angsuran_5)}</TD>
                                <TD className="px-1 py-2 text-center border-r border-white/20 font-bold text-accent-dark whitespace-nowrap hidden xl:table-cell">{formatCurrency(calc.angsuran_10)}</TD>
                                <TD className="px-1 py-2 text-center border-r border-white/20 font-bold text-accent-dark whitespace-nowrap hidden xl:table-cell">{formatCurrency(calc.angsuran_15)}</TD>
                                <TD className="px-2 py-2 font-black text-text-primary text-right border-r border-white/20 whitespace-nowrap">{formatCurrency(item.harga_jual)}</TD>
                              </>
                            )}
                            <TD className="px-1 py-2">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }} className="p-1 h-auto hover:bg-white shadow-glass border border-white/40"><Edit2 className="w-2.5 h-2.5 text-accent-dark" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)} className="p-1 h-auto hover:bg-white shadow-glass border border-white/40"><Trash2 className="w-2.5 h-2.5 text-red-500" /></Button>
                              </div>
                            </TD>
                          </TR>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </TBody>
            </Table>
        </div>
      </Card>

      {/* ─── PRINT UI: Official Document Style (PORTRAIT, WITH HEADER) ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 1cm; padding: 0; -webkit-print-color-adjust: exact; font-family: 'Inter', sans-serif; background: white !important; }
          .no-print { display: none !important; }
          
          .doc-header { display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1.5px solid black; }
          .doc-title-block { text-align: center; }
          
          .price-table { width: 100% !important; border: 1.5px solid black !important; border-collapse: collapse !important; margin-bottom: 15px; table-layout: auto; }
          .price-table th, .price-table td { border: 1px solid black !important; padding: 3px 5px !important; color: black !important; font-size: 7pt !important; line-height: 1.1; }
          .price-table th { font-weight: 900 !important; text-transform: uppercase; background: #f8fafc !important; text-align: center !important; font-size: 7.5pt !important; }
          .price-table .sub-header th { font-size: 6.5pt !important; }
          
          .sold-cell { background-color: #e2e8f0 !important; color: #475569 !important; font-weight: 900 !important; letter-spacing: 1em !important; text-align: center !important; text-transform: uppercase !important; font-size: 7.5pt !important; padding-left: 1em !important; }
          
          .doc-footer { margin-top: 12px; font-size: 7pt !important; line-height: 1.2; display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; border-top: 1.5px solid black; padding-top: 8px; page-break-inside: avoid; }
          .bank-info-grid { display: grid; grid-template-columns: 50px 100px 1fr; gap: 2px; margin-top: 5px; font-weight: bold; }
          .print-block { display: block !important; }
        }
      `}} />

      <div id="price-list-print-content" className="hidden print-block bg-white p-8" style={{ width: '210mm' }}>
        {/* Header Section (Restored) */}
        <div className="doc-header">
          <div className="flex-1">
             <img src={logoPerusahaan} alt="Logo Perusahaan" className="h-10 w-auto object-contain" />
          </div>
          <div className="doc-title-block flex flex-col items-center">
            <img src={logoProyek} alt="Logo Proyek" className="h-14 w-auto object-contain" />
          </div>
          <div className="flex-1 flex justify-end">
            <div className="text-[6.5pt] text-right font-bold">
              <p>DAFTAR HARGA JUAL UNIT</p>
              <p>{projects.find(p => p.id === selectedProjectId)?.name.toUpperCase()}</p>
              <p>Per Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        </div>

        {getGroupedItems().map((catGroup) => (
          <div key={catGroup.category} className="mb-6">
            <h3 className="text-[10pt] font-black mb-2 uppercase tracking-widest text-black">{catGroup.category}</h3>
            <table className="price-table">
              <thead>
                <tr>
                  <th rowSpan={2}>Blok</th>
                  <th rowSpan={2}>Unit</th>
                  <th rowSpan={2}>Tipe</th>
                  <th colSpan={2}>Luas (m2)</th>
                  <th rowSpan={2}>Booking Fee</th>
                  <th rowSpan={2}>Uang Muka</th>
                  <th colSpan={3}>Angsuran KPR</th>
                  <th rowSpan={2}>Harga Jual (Rp)</th>
                </tr>
                <tr className="sub-header">
                  <th>Tanah</th>
                  <th>Bgn</th>
                  <th>5 Thn</th>
                  <th>10 Thn</th>
                  <th>15 Thn</th>
                </tr>
              </thead>
              <tbody>
                {catGroup.bloks.map((blokGroup: any) => {
                  const totalRowsInBlok = blokGroup.groups.length;
                  return blokGroup.groups.map((group: any[], gIdx: number) => {
                    const item = group[0];
                    const calc = calculateKPR(item);
                    const isSold = item.status === 'sold';
                    const unitRange = group.length > 1 ? `${group[0].unit}-${group[group.length - 1].unit}` : item.unit;
                    return (
                      <tr key={`${catGroup.category}-${blokGroup.blok}-${gIdx}`}>
                        {gIdx === 0 && <td rowSpan={totalRowsInBlok} className="text-center font-black uppercase align-middle bg-gray-50/50">{blokGroup.blok}</td>}
                        <td className="text-center font-bold">{unitRange}</td>
                        <td className="text-center font-medium">{item.tipe}</td>
                        <td className="text-center">{item.luas_tanah}</td>
                        <td className="text-center">{item.luas_bangunan}</td>
                        {isSold ? (
                          <td colSpan={6} className="sold-cell">S O L D</td>
                        ) : (
                          <>
                            <td className="text-right">{item.booking_fee.toLocaleString('id-ID')}</td>
                            <td className="text-right font-black">{calc.dp_amount.toLocaleString('id-ID')}</td>
                            <td className="text-right">{calc.angsuran_5.toLocaleString('id-ID')}</td>
                            <td className="text-right">{calc.angsuran_10.toLocaleString('id-ID')}</td>
                            <td className="text-right">{calc.angsuran_15.toLocaleString('id-ID')}</td>
                            <td className="text-right font-black whitespace-nowrap">{item.harga_jual.toLocaleString('id-ID')}</td>
                          </>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        ))}

        <div className="doc-footer">
          <div className="space-y-2">
            <div>
              <h4 className="font-black uppercase mb-0.5 text-[6.5pt]">Harga Sudah Termasuk :</h4>
              <ol className="list-decimal list-inside font-bold text-[6pt] grid grid-cols-2 gap-x-4">
                <li>Ijin Mendirikan Bangunan (IMB)</li>
                <li>Penyambungan Listrik & Air</li>
                <li>Akta Jual Beli & Balik Nama</li>
                <li>Biaya Keamanan & Lingkungan</li>
              </ol>
            </div>
            <div className="pt-1">
              <p className="italic font-bold mb-0.5 leading-tight text-[5.5pt]">Pembayaran sah bila melalui kasir pusat atau No. Rekening Bank :</p>
              <div className="bank-info-grid text-[6pt]">
                <span>BCA</span><span>045-068-1008</span><span>PT. Abadi Lestari Mandiri</span>
                <span>Mandiri</span><span>112-000-748-1042</span><span>PT. Abadi Lestari Mandiri</span>
                <span>BNI</span><span>020-568-0823</span><span>PT. Abadi Lestari Mandiri</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <h4 className="font-black uppercase mb-0.5 text-[6.5pt]">Harga Belum Termasuk :</h4>
              <ul className="list-disc list-inside font-bold text-[6pt]">
                <li>PBB</li>
                <li>Biaya KPR & Provisi Bank</li>
              </ul>
            </div>
            <div className="pt-2 space-y-0.5 font-black text-[6pt]">
              <p>2. Harga sewaktu-waktu dapat berubah tanpa pemberitahuan</p>
              <p>3. Harga Berlaku per 1 Maret 2026</p>
              <p className="pt-2 text-right italic font-normal text-[5.5pt]">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isItemModalOpen} onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }} title={editingItem ? "Edit Unit" : "Tambah Unit Baru"}>
        <PriceItemForm initialData={editingItem || undefined} availableTypes={Array.from(new Set(priceItems.map(i => i.tipe))).filter(Boolean)} projectId={selectedProjectId} onSubmit={handleSubmitItem} onCancel={() => { setIsItemModalOpen(false); setEditingItem(null); }} loading={loading} />
      </Modal>

      <Modal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} title="Update Harga Massal">
        <div className="p-6 space-y-4">
          <Input type="number" label="Persentase Kenaikan (%)" value={updatePercent} onChange={(e) => setUpdatePercent(parseFloat(e.target.value) || 0)} />
          <Button onClick={handleMassUpdate} className="w-full bg-accent-dark mt-4">Apply Update</Button>
        </div>
      </Modal>
    </div>
  );
};

export default PriceList;
