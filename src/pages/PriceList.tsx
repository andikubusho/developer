import React, { useState, useEffect } from 'react';
import { FileText, Printer, ArrowLeft, Trash2, Plus, Percent, Edit2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { PriceListItem, Sale, Project } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { PriceItemForm } from '../components/forms/PriceItemForm';
import jsPDF from 'jspdf';
import logoProyek from '../assets/logo-proyek.png';
import { api } from '../lib/api';

const PriceList: React.FC = () => {
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
      
      // Fetch items and sales to determine SOLD status
      const [items, sales] = await Promise.all([
        api.get('price_list_items', `select=*&project_id=eq.${selectedProjectId}&order=created_at.asc`),
        api.get('sales', 'select=unit_id')
      ]);

      const itemsWithStatus = (items || []).map((item: PriceListItem) => {
        const hasSale = (sales || []).some((sale: Sale) => sale.unit_id === item.unit_id);
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

  const handleSubmitItem = async (data: any) => {
    try {
      setLoading(true);
      const payload = {
        project_id: selectedProjectId,
        ...data,
      };

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

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus unit ini?')) return;
    try {
      setLoading(true);
      await api.delete('price_list_items', id);
      await fetchPriceItems();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMassUpdate = async () => {
    if (!confirm(`Apakah Anda yakin ingin menaikkan harga ${selectedItems.length} unit sebesar ${updatePercent}%?`)) return;
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
      alert(`Gagal update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const activeProject = projects.find(p => p.id === selectedProjectId);
    const projectName = activeProject?.name || 'Proyek';
    const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns
    
    pdf.setFontSize(18);
    pdf.text(`DAFTAR HARGA - ${projectName.toUpperCase()}`, 148, 20, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 148, 28, { align: 'center' });
    
    let y = 40;
    pdf.setFontSize(7);
    pdf.setFillColor(30, 41, 59); // Slate-900
    pdf.rect(10, y, 277, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    
    pdf.text('BLOK', 12, y + 6);
    pdf.text('UNIT', 25, y + 6);
    pdf.text('TIPE', 40, y + 6);
    pdf.text('LT', 75, y + 6);
    pdf.text('LB', 85, y + 6);
    pdf.text('BOOKING', 95, y + 6);
    pdf.text('UANG MUKA', 120, y + 6);
    pdf.text('ANGS 5TH', 150, y + 6);
    pdf.text('ANGS 10TH', 180, y + 6);
    pdf.text('ANGS 15TH', 210, y + 6);
    pdf.text('HARGA JUAL', 245, y + 6);
    
    y += 15;
    pdf.setTextColor(0, 0, 0);

    ['Ruko', 'Rumah'].forEach(cat => {
      const catItems = priceItems.filter(i => i.category === cat);
      if (catItems.length === 0) return;

      pdf.setFont(undefined, 'bold');
      pdf.setFillColor(241, 245, 249);
      pdf.rect(10, y - 4, 277, 6, 'F');
      pdf.text(cat.toUpperCase(), 12, y);
      y += 8;
      pdf.setFont(undefined, 'normal');

      catItems.forEach(item => {
        if (y > 185) { pdf.addPage(); y = 20; }
        const calc = calculateKPR(item);
        
        pdf.text(item.blok, 12, y);
        pdf.text(item.unit, 25, y);
        pdf.text(item.tipe, 40, y);
        pdf.text(item.luas_tanah.toString(), 75, y);
        pdf.text(item.luas_bangunan.toString(), 85, y);
        
        if (item.status === 'sold') {
          pdf.setTextColor(150, 150, 150);
          pdf.text('S O L D', 150, y, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
        } else {
          pdf.text(formatCurrency(item.booking_fee), 95, y);
          pdf.text(formatCurrency(calc.uang_muka_kpr), 120, y);
          pdf.text(formatCurrency(calc.angsuran_5), 150, y);
          pdf.text(formatCurrency(calc.angsuran_10), 180, y);
          pdf.text(formatCurrency(calc.angsuran_15), 210, y);
          pdf.text(formatCurrency(item.harga_jual), 245, y);
        }
        
        pdf.setDrawColor(241, 245, 249);
        pdf.line(10, y + 2, 287, y + 2);
        y += 7;
      });
      y += 5;
    });

    pdf.save(`Price-List-${projectName}.pdf`);
  };

  return (
    <div id="price-list-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-6">
            <img src={logoProyek} alt="Logo" className="h-12 w-auto object-contain hidden sm:block" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Price List {projects.find(p => p.id === selectedProjectId)?.name}</h1>
              <p className="text-slate-500">Manajemen harga unit properti</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-lg border-slate-200 text-sm bg-white px-4 py-2"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => setIsUpdateModalOpen(true)}><Percent className="w-4 h-4 mr-2" />Update Harga</Button>
          <Button variant="outline" onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}><Plus className="w-4 h-4 mr-2" />Tambah Unit</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Cetak Layar</Button>
          <Button onClick={generatePDF}><FileText className="w-4 h-4 mr-2" />Export PDF</Button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, .sidebar, .no-print, button, select, .flex-wrap, .flex-col {
            display: none !important;
          }
          #price-list-container {
            margin: 0 !important;
            padding: 0 !important;
          }
          .Card {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
          table {
            width: 100% !important;
            font-size: 8pt !important;
          }
          th, td {
            padding: 4px 8px !important;
          }
          .bg-slate-900 {
            background-color: #000 !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact;
          }
          .bg-slate-800 {
            background-color: #333 !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact;
          }
          .bg-slate-50 {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}} />

      <Card className="p-0 overflow-hidden border-none shadow-premium rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-black">
                <th rowSpan={2} className="px-4 py-4 text-center border-r border-slate-800">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700" checked={selectedItems.length === priceItems.length && priceItems.length > 0} onChange={(e) => setSelectedItems(e.target.checked ? priceItems.map(i => i.id) : [])} />
                </th>
                <th rowSpan={2} className="px-6 py-4 border-r border-slate-800">Blok</th>
                <th rowSpan={2} className="px-4 py-4 border-r border-slate-800">Unit</th>
                <th rowSpan={2} className="px-6 py-4 border-r border-slate-800">Tipe</th>
                <th colSpan={2} className="px-4 py-2 text-center border-b border-r border-slate-800">Luas (m2)</th>
                <th rowSpan={2} className="px-6 py-4 border-r border-slate-800">Booking Fee</th>
                <th rowSpan={2} className="px-6 py-4 border-r border-slate-800 text-center">Uang Muka</th>
                <th colSpan={3} className="px-4 py-2 text-center border-b border-r border-slate-800">Angsuran KPR</th>
                <th rowSpan={2} className="px-6 py-4 border-r border-slate-800 text-right">Harga Jual (Rp)</th>
                <th rowSpan={2} className="px-4 py-4 text-center">Aksi</th>
              </tr>
              <tr className="bg-slate-800 text-slate-300 text-[9px] uppercase tracking-wider font-bold">
                <th className="px-4 py-2 text-center border-r border-slate-700">Tanah</th>
                <th className="px-4 py-2 text-center border-r border-slate-700">Bangunan</th>
                <th className="px-4 py-2 text-center border-r border-slate-700">5 Tahun</th>
                <th className="px-4 py-2 text-center border-r border-slate-700">10 Tahun</th>
                <th className="px-4 py-2 text-center border-r border-slate-700">15 Tahun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={13} className="px-6 py-20 text-center text-slate-400 font-medium">Memuat data price list...</td></tr>
              ) : priceItems.length === 0 ? (
                <tr><td colSpan={13} className="px-6 py-20 text-center text-slate-500 font-medium">Belum ada data unit untuk proyek ini.</td></tr>
              ) : (
                ['Ruko', 'Rumah'].map((cat) => {
                  const catItems = priceItems.filter(i => i.category === cat);
                  if (catItems.length === 0) return null;
                  
                  return (
                    <React.Fragment key={cat}>
                      <tr className="bg-slate-50">
                        <td colSpan={13} className="px-6 py-3 text-sm font-black text-slate-900 uppercase tracking-widest border-y border-slate-200">
                          {cat}
                        </td>
                      </tr>
                      {catItems.map((item) => {
                        const calc = calculateKPR(item);
                        const isSold = item.status === 'sold';
                        
                        return (
                          <tr key={item.id} className={cn(
                            "hover:bg-slate-50 transition-colors group",
                            isSold && "bg-slate-50/50"
                          )}>
                            <td className="px-4 py-4 text-center border-r border-slate-50">
                              <input type="checkbox" className="rounded" checked={selectedItems.includes(item.id)} onChange={(e) => setSelectedItems(e.target.checked ? [...selectedItems, item.id] : selectedItems.filter(id => id !== item.id))} />
                            </td>
                            <td className="px-6 py-4 text-sm font-black text-slate-900 border-r border-slate-50 uppercase">{item.blok}</td>
                            <td className="px-4 py-4 text-sm font-bold text-slate-600 border-r border-slate-50">{item.unit}</td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-600 border-r border-slate-50">{item.tipe}</td>
                            <td className="px-4 py-4 text-sm text-center text-slate-600 border-r border-slate-50">{item.luas_tanah}</td>
                            <td className="px-4 py-4 text-sm text-center text-slate-600 border-r border-slate-50">{item.luas_bangunan}</td>
                            
                            {isSold ? (
                              <td colSpan={6} className="px-6 py-4 text-center bg-slate-100/50">
                                <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">S O L D</span>
                              </td>
                            ) : (
                              <>
                                <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-50">{formatCurrency(item.booking_fee)}</td>
                                <td className="px-6 py-4 text-sm text-center border-r border-slate-50">
                                  <p className="font-bold text-slate-900">{formatCurrency(calc.uang_muka_kpr)}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">DP {item.dp_percentage * 100}%</p>
                                </td>
                                <td className="px-4 py-4 text-xs text-center border-r border-slate-50 font-bold text-indigo-600">{formatCurrency(calc.angsuran_5)}</td>
                                <td className="px-4 py-4 text-xs text-center border-r border-slate-50 font-bold text-indigo-600">{formatCurrency(calc.angsuran_10)}</td>
                                <td className="px-4 py-4 text-xs text-center border-r border-slate-50 font-bold text-indigo-600">{formatCurrency(calc.angsuran_15)}</td>
                                <td className="px-6 py-4 text-sm font-black text-slate-900 text-right border-r border-slate-50">{formatCurrency(item.harga_jual)}</td>
                              </>
                            )}
                            
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }} className="p-2 h-auto hover:bg-white shadow-sm border border-slate-100"><Edit2 className="w-4 h-4 text-indigo-600" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)} className="p-2 h-auto hover:bg-white shadow-sm border border-slate-100"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isItemModalOpen} onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }} title={editingItem ? "Edit Unit" : "Tambah Unit Baru"}>
        <PriceItemForm 
          initialData={editingItem || undefined}
          availableTypes={Array.from(new Set(priceItems.map(i => i.tipe))).filter(Boolean)}
          onSubmit={handleSubmitItem}
          onCancel={() => { setIsItemModalOpen(false); setEditingItem(null); }}
          loading={loading}
        />
      </Modal>

      <Modal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} title="Update Harga Massal">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Menaikkan harga untuk {selectedItems.length} unit yang dipilih.</p>
          <Input type="number" label="Persentase Kenaikan (%)" value={updatePercent} onChange={(e) => setUpdatePercent(parseFloat(e.target.value) || 0)} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>Batal</Button>
            <Button onClick={handleMassUpdate} disabled={selectedItems.length === 0} isLoading={loading}>Apply Kenaikan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PriceList;
