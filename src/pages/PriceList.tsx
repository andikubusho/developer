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
    const pdf = new jsPDF('p', 'mm', 'a4');
    // Simplified PDF for stability
    pdf.setFontSize(16);
    pdf.text(`PRICE LIST - ${projectName.toUpperCase()}`, 105, 20, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 105, 28, { align: 'center' });
    
    // Add table content...
    let y = 40;
    pdf.setFontSize(8);
    pdf.text('BLOK', 10, y);
    pdf.text('UNIT', 25, y);
    pdf.text('TIPE', 40, y);
    pdf.text('HARGA JUAL', 70, y);
    pdf.text('ANGSURAN 10TH', 110, y);
    pdf.line(10, y+2, 200, y+2);
    y += 8;

    priceItems.forEach(item => {
      if (y > 270) { pdf.addPage(); y = 20; }
      const calc = calculateKPR(item);
      pdf.text(item.blok, 10, y);
      pdf.text(item.unit, 25, y);
      pdf.text(item.tipe, 40, y);
      pdf.text(formatCurrency(item.harga_jual), 70, y);
      pdf.text(formatCurrency(calc.angsuran_10), 110, y);
      y += 6;
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
          <Button onClick={generatePDF}><FileText className="w-4 h-4 mr-2" />Export PDF</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3 text-center border-r">
                  <input type="checkbox" checked={selectedItems.length === priceItems.length && priceItems.length > 0} onChange={(e) => setSelectedItems(e.target.checked ? priceItems.map(i => i.id) : [])} />
                </th>
                <th className="px-4 py-3 border-r">Blok</th>
                <th className="px-4 py-3 border-r">Unit</th>
                <th className="px-4 py-3 border-r">Tipe</th>
                <th className="px-4 py-3 text-center border-r">LT/LB</th>
                <th className="px-4 py-3 border-r">Harga Jual</th>
                <th className="px-4 py-3 border-r text-center">Angsuran 10Th</th>
                <th className="px-4 py-3 border-r text-center">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-slate-400">Memuat data...</td></tr>
              ) : priceItems.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-slate-500">Belum ada data unit.</td></tr>
              ) : (
                priceItems.map((item) => {
                  const calc = calculateKPR(item);
                  return (
                    <tr key={item.id} className={cn("hover:bg-slate-50 transition-colors", item.status === 'sold' && "bg-slate-50/50")}>
                      <td className="px-4 py-3 text-center border-r">
                        <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={(e) => setSelectedItems(e.target.checked ? [...selectedItems, item.id] : selectedItems.filter(id => id !== item.id))} />
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900 border-r">{item.blok}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 border-r">{item.unit}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 border-r">{item.tipe}</td>
                      <td className="px-4 py-3 text-xs text-center text-slate-600 border-r">{item.luas_tanah}/{item.luas_bangunan}</td>
                      <td className="px-4 py-3 text-sm font-bold text-primary border-r">{formatCurrency(item.harga_jual)}</td>
                      <td className="px-4 py-3 text-xs text-center border-r font-medium text-indigo-600">{formatCurrency(calc.angsuran_10)}</td>
                      <td className="px-4 py-3 text-center border-r">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", item.status === 'sold' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>
                          {item.status === 'sold' ? 'Sold' : 'Available'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }} className="p-1 h-auto"><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)} className="p-1 h-auto text-red-400"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
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
