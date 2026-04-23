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
import logoPerusahaan from '../assets/logo-perusahaan.png';
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
    const settings = activeProject?.settings || { bunga_flat: 0.0493, dp_percentage: 0.20, booking_fee: 15000000 };
    
    const dp_percentage = item.dp_percentage || settings.dp_percentage;
    const booking_fee = item.booking_fee || settings.booking_fee;
    const dp_amount = item.harga_jual * dp_percentage;
    const uang_muka_kpr = dp_amount - booking_fee;
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

  const generatePDF = () => {
    const activeProject = projects.find(p => p.id === selectedProjectId);
    const projectName = activeProject?.name || 'Proyek';
    const pdf = new jsPDF('l', 'mm', 'a4');
    pdf.setFontSize(18);
    pdf.text(`DAFTAR HARGA - ${projectName.toUpperCase()}`, 148, 20, { align: 'center' });
    pdf.save(`Price-List-${projectName}.pdf`);
  };

  return (
    <div id="price-list-container" className="bg-white p-4 md:p-12 min-h-screen text-black">
      {/* Top Controls - Hidden on Print */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print border-b border-slate-100 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-slate-900">Price List Editor</h1>
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
          <Button variant="outline" size="sm" onClick={() => setIsUpdateModalOpen(true)}><Percent className="w-4 h-4 mr-2" />Update Harga</Button>
          <Button variant="outline" size="sm" onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}><Plus className="w-4 h-4 mr-2" />Tambah Unit</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Cetak Layar</Button>
          <Button size="sm" onClick={generatePDF}><FileText className="w-4 h-4 mr-2" />Export PDF</Button>
        </div>
      </div>

      {/* Target Style Header */}
      <div className="relative mb-12 text-center pt-8">
        <img src={logoPerusahaan} alt="Logo" className="absolute top-0 right-0 h-14 w-auto grayscale brightness-0" />
        <div className="inline-block border-b-2 border-black pb-4">
          <img src={logoProyek} alt="Logo" className="h-16 w-auto mx-auto mb-2" />
          <h1 className="text-3xl font-black uppercase tracking-tighter">Golden Canyon</h1>
        </div>
        <div className="mt-4 text-sm font-bold uppercase tracking-widest">
          {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          #price-list-container, #price-list-container * { visibility: visible !important; }
          #price-list-container {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            display: block !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          table { width: 100% !important; border: 1.5px solid black !important; }
          th, td { border: 1px solid black !important; padding: 4px !important; color: black !important; font-size: 8pt !important; }
          .action-column { display: none !important; }
          .bg-slate-50 { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
        }
      `}} />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-[1.5px] border-black">
          <thead>
            <tr className="bg-white text-[10px] font-black uppercase">
              <th rowSpan={2} className="p-2 border border-black no-print"><input type="checkbox" checked={selectedItems.length === priceItems.length && priceItems.length > 0} onChange={(e) => setSelectedItems(e.target.checked ? priceItems.map(i => i.id) : [])} /></th>
              <th rowSpan={2} className="p-2 border border-black">Blok</th>
              <th rowSpan={2} className="p-2 border border-black">Unit</th>
              <th rowSpan={2} className="p-2 border border-black">Tipe</th>
              <th colSpan={2} className="p-1 border border-black">Luas (m2)</th>
              <th rowSpan={2} className="p-2 border border-black">Booking Fee</th>
              <th rowSpan={2} className="p-2 border border-black">Uang Muka 20%</th>
              <th colSpan={3} className="p-1 border border-black">Angsuran KPR</th>
              <th rowSpan={2} className="p-2 border border-black text-right">Harga Jual (Rp)</th>
              <th rowSpan={2} className="p-2 border border-black action-column no-print">Aksi</th>
            </tr>
            <tr className="bg-white text-[9px] font-bold uppercase">
              <th className="p-1 border border-black">Tanah</th>
              <th className="p-1 border border-black">Bangunan</th>
              <th className="p-1 border border-black">5 Tahun</th>
              <th className="p-1 border border-black">10 Tahun</th>
              <th className="p-1 border border-black">15 Tahun</th>
            </tr>
          </thead>
          <tbody className="text-[10px] font-bold">
            {['Ruko', 'Rumah'].map((cat) => {
              const catItems = priceItems.filter(i => i.category === cat);
              if (catItems.length === 0) return null;
              return (
                <React.Fragment key={cat}>
                  <tr className="bg-slate-50">
                    <td colSpan={13} className="p-2 border border-black font-black uppercase tracking-widest">{cat}</td>
                  </tr>
                  {catItems.map((item) => {
                    const calc = calculateKPR(item);
                    const isSold = item.status === 'sold';
                    return (
                      <tr key={item.id}>
                        <td className="p-2 border border-black text-center no-print"><input type="checkbox" checked={selectedItems.includes(item.id)} onChange={(e) => setSelectedItems(e.target.checked ? [...selectedItems, item.id] : selectedItems.filter(id => id !== item.id))} /></td>
                        <td className="p-2 border border-black text-center uppercase">{item.blok}</td>
                        <td className="p-2 border border-black text-center">{item.unit}</td>
                        <td className="p-2 border border-black text-center">{item.tipe}</td>
                        <td className="p-2 border border-black text-center">{item.luas_tanah}</td>
                        <td className="p-2 border border-black text-center">{item.luas_bangunan}</td>
                        {isSold ? (
                          <td colSpan={6} className="p-2 border border-black text-center tracking-[1em] text-slate-400">S O L D</td>
                        ) : (
                          <>
                            <td className="p-2 border border-black text-center">{formatCurrency(item.booking_fee)}</td>
                            <td className="p-2 border border-black text-center">{formatCurrency(calc.uang_muka_kpr)}</td>
                            <td className="p-2 border border-black text-center text-blue-800">{formatCurrency(calc.angsuran_5)}</td>
                            <td className="p-2 border border-black text-center text-blue-800">{formatCurrency(calc.angsuran_10)}</td>
                            <td className="p-2 border border-black text-center text-blue-800">{formatCurrency(calc.angsuran_15)}</td>
                            <td className="p-2 border border-black text-right">{formatCurrency(item.harga_jual)}</td>
                          </>
                        )}
                        <td className="p-2 border border-black text-center action-column no-print">
                          <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }} className="p-1 h-auto"><Edit2 className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)} className="p-1 h-auto text-red-500"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-8 mt-12 text-[10px] font-bold border-t-[1.5px] border-black pt-8">
        <div className="space-y-4">
          <div>
            <h3 className="underline uppercase mb-1">Harga Sudah Termasuk :</h3>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Izin Mendirikan Bangunan ( IMB )</li>
              <li>Biaya Penyambungan Listrik & Air</li>
              <li>Akta Jual Beli & Biaya Balik Nama</li>
              <li>Biaya Keamanan & Lingkungan</li>
            </ol>
          </div>
          <div className="pt-4 text-[9px] leading-relaxed">
            <p className="mb-2 italic">1. Pembayaran booking fee maupun uang muka dianggap sah bila melalui kasir kantor pusat dan menerima kuitansi asli yang berstempel perusahaan, atau ke No. Rekening Bank :</p>
            <div className="grid grid-cols-[80px_1fr_1fr] gap-x-4">
              <span>BCA</span><span>045-068-1008</span><span>PT. Abadi Lestari Mandiri</span>
              <span>Mandiri</span><span>112-000-748-1042</span><span>PT. Abadi Lestari Mandiri</span>
              <span>BNI</span><span>020-568-0823</span><span>PT. Abadi Lestari Mandiri</span>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="underline uppercase mb-1">Harga Belum Termasuk :</h3>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>PBB</li>
              <li>Biaya KPR</li>
            </ol>
          </div>
          <div className="pt-12 text-[9px] italic text-slate-500">
            <p>2. Harga sewaktu-waktu dapat berubah tanpa pemberitahuan terlebih dahulu</p>
            <p>3. Harga Berlaku per 1 Maret 2026</p>
          </div>
        </div>
      </div>

      <Modal isOpen={isItemModalOpen} onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }} title={editingItem ? "Edit Unit" : "Tambah Unit Baru"}>
        <PriceItemForm initialData={editingItem || undefined} availableTypes={Array.from(new Set(priceItems.map(i => i.tipe))).filter(Boolean)} onSubmit={handleSubmitItem} onCancel={() => { setIsItemModalOpen(false); setEditingItem(null); }} loading={loading} />
      </Modal>

      <Modal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} title="Update Harga Massal">
        <div className="space-y-4">
          <p className="text-sm">Menaikkan harga untuk {selectedItems.length} unit.</p>
          <Input type="number" label="Persentase Kenaikan (%)" value={updatePercent} onChange={(e) => setUpdatePercent(parseFloat(e.target.value) || 0)} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>Batal</Button>
            <Button onClick={handleMassUpdate} disabled={selectedItems.length === 0} isLoading={loading}>Apply</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PriceList;
