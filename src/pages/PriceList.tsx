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

  const generatePDF = () => {
    const activeProject = projects.find(p => p.id === selectedProjectId);
    const projectName = activeProject?.name || 'Proyek';
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setFontSize(18);
    pdf.text(`DAFTAR HARGA - ${projectName.toUpperCase()}`, 105, 20, { align: 'center' });
    pdf.save(`Price-List-${projectName}.pdf`);
  };

  const getGroupedItems = () => {
    const categories = ['Ruko', 'Rumah'];
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Price List {projects.find(p => p.id === selectedProjectId)?.name}</h1>
            <p className="text-slate-500 text-sm">Manajemen harga dan simulasi KPR</p>
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
          <Button variant="outline" size="sm" onClick={() => setIsUpdateModalOpen(true)}><Percent className="w-4 h-4 mr-2" />Update Harga</Button>
          <Button variant="outline" size="sm" onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}><Plus className="w-4 h-4 mr-2" />Tambah Unit</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Cetak Layar</Button>
          <Button size="sm" onClick={generatePDF}><FileText className="w-4 h-4 mr-2" />Export PDF</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-premium rounded-2xl no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[9px] uppercase tracking-wider font-black">
                <th rowSpan={2} className="px-2 py-3 text-center border-r border-slate-800 w-8">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 w-3 h-3" checked={selectedItems.length === priceItems.length && priceItems.length > 0} onChange={(e) => setSelectedItems(e.target.checked ? priceItems.map(i => i.id) : [])} />
                </th>
                <th rowSpan={2} className="px-3 py-3 border-r border-slate-800">Blok</th>
                <th rowSpan={2} className="px-2 py-3 border-r border-slate-800">Unit</th>
                <th rowSpan={2} className="px-3 py-3 border-r border-slate-800">Tipe</th>
                <th colSpan={2} className="px-2 py-1.5 text-center border-b border-r border-slate-800">Luas</th>
                <th rowSpan={2} className="px-3 py-3 border-r border-slate-800">Booking</th>
                <th rowSpan={2} className="px-3 py-3 border-r border-slate-800 text-center">Uang Muka</th>
                <th colSpan={3} className="px-2 py-1.5 text-center border-b border-r border-slate-800">Angsuran KPR</th>
                <th rowSpan={2} className="px-3 py-3 border-r border-slate-800 text-right">Harga Jual</th>
                <th rowSpan={2} className="px-2 py-3 text-center w-12">Aksi</th>
              </tr>
              <tr className="bg-slate-800 text-slate-300 text-[8px] uppercase tracking-tighter font-bold">
                <th className="px-2 py-1.5 text-center border-r border-slate-700">Tnh</th>
                <th className="px-2 py-1.5 text-center border-r border-slate-700">Bgn</th>
                <th className="px-2 py-1.5 text-center border-r border-slate-700">5 Th</th>
                <th className="px-2 py-1.5 text-center border-r border-slate-700">10 Th</th>
                <th className="px-2 py-1.5 text-center border-r border-slate-700">15 Th</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {['Ruko', 'Rumah'].map((cat) => {
                const catItems = priceItems.filter(i => i.category === cat);
                if (catItems.length === 0) return null;
                return (
                  <React.Fragment key={cat}>
                    <tr className="bg-slate-50">
                      <td colSpan={13} className="px-4 py-2 text-[10px] font-black text-slate-900 uppercase tracking-widest border-y border-slate-200">{cat}</td>
                    </tr>
                    {catItems.map((item) => {
                      const calc = calculateKPR(item);
                      const isSold = item.status === 'sold';
                      return (
                        <tr key={item.id} className={cn("hover:bg-slate-50 transition-colors group text-[10px]", isSold && "bg-slate-50/50")}>
                          <td className="px-2 py-2 text-center border-r border-slate-50"><input type="checkbox" className="rounded w-3 h-3" checked={selectedItems.includes(item.id)} onChange={(e) => setSelectedItems(e.target.checked ? [...selectedItems, item.id] : selectedItems.filter(id => id !== item.id))} /></td>
                          <td className="px-3 py-2 font-black text-slate-900 border-r border-slate-50 uppercase">{item.blok}</td>
                          <td className="px-2 py-2 font-bold text-slate-600 border-r border-slate-50">{item.unit}</td>
                          <td className="px-3 py-2 font-medium text-slate-600 border-r border-slate-50 truncate max-w-[80px]">{item.tipe}</td>
                          <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-50">{item.luas_tanah}</td>
                          <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-50">{item.luas_bangunan}</td>
                          {isSold ? (
                            <td colSpan={6} className="px-6 py-2 text-center bg-slate-100/50"><span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">S O L D</span></td>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-slate-600 border-r border-slate-50">{formatCurrency(item.booking_fee)}</td>
                              <td className="px-3 py-2 text-center border-r border-slate-50"><p className="font-bold text-slate-900 leading-tight">{formatCurrency(calc.dp_amount)}</p></td>
                              <td className="px-2 py-2 text-center border-r border-slate-50 font-bold text-indigo-600">{formatCurrency(calc.angsuran_5)}</td>
                              <td className="px-2 py-2 text-center border-r border-slate-50 font-bold text-indigo-600">{formatCurrency(calc.angsuran_10)}</td>
                              <td className="px-2 py-2 text-center border-r border-slate-50 font-bold text-indigo-600">{formatCurrency(calc.angsuran_15)}</td>
                              <td className="px-3 py-2 font-black text-slate-900 text-right border-r border-slate-50">{formatCurrency(item.harga_jual)}</td>
                            </>
                          )}
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }} className="p-1 h-auto hover:bg-white shadow-sm border border-slate-100"><Edit2 className="w-3 h-3 text-indigo-600" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)} className="p-1 h-auto hover:bg-white shadow-sm border border-slate-100"><Trash2 className="w-3 h-3 text-red-500" /></Button>
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
      </Card>

      {/* ─── PRINT UI: Official Document Style (FROM IMAGE 2) ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 1cm 1.5cm; -webkit-print-color-adjust: exact; font-family: 'Inter', sans-serif; background: white !important; }
          .no-print { display: none !important; }
          
          .doc-header { display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .doc-title-block { text-align: center; flex: 1; }
          
          .price-table { width: 100% !important; border: 1.5px solid black !important; border-collapse: collapse !important; margin-bottom: 15px; }
          .price-table th, .price-table td { border: 1px solid black !important; padding: 3px 4px !important; color: black !important; font-size: 7pt !important; line-height: 1.1; }
          .price-table th { font-weight: 900 !important; text-transform: uppercase; background: #fff !important; }
          .price-table .sub-header th { font-size: 6pt !important; }
          
          .sold-cell { background-color: #f3f4f6 !important; color: #000 !important; font-weight: 900 !important; letter-spacing: 0.8em !important; text-align: center !important; text-transform: uppercase !important; font-size: 6.5pt !important; }
          
          .doc-footer { margin-top: 20px; font-size: 7.5pt !important; line-height: 1.3; }
          .bank-info-grid { display: grid; grid-template-cols: 50px 100px 1fr; gap: 2px; margin-top: 5px; font-weight: bold; }
          .print-block { display: block !important; }
        }
      `}} />

      <div className="hidden print-block">
        {/* Header Section */}
        <div className="doc-header flex justify-between items-end mb-8 border-b-2 border-black pb-4">
          <div className="flex-1">
            {/* Kosong untuk keseimbangan atau bisa diisi info kontak kecil */}
          </div>
          <div className="doc-title-block text-center flex-1 flex flex-col items-center">
            <img src={logoProyek} alt="Logo Proyek" className="h-16 w-auto object-contain mb-2" />
            <h1 className="text-3xl font-black text-black uppercase leading-tight tracking-tighter">GOLDEN CANYON</h1>
          </div>
          <div className="flex-1 flex items-center justify-end gap-3">
            <div className="text-right">
              <h2 className="text-sm font-black text-black leading-none uppercase">ABADI LESTARI LAND</h2>
            </div>
            <img src={logoPerusahaan} alt="Logo Perusahaan" className="h-14 w-auto object-contain" />
          </div>
        </div>

        {getGroupedItems().map((catGroup) => (
          <div key={catGroup.category} className="mb-8">
            <h3 className="text-sm font-black mb-2 uppercase tracking-widest text-slate-800">{catGroup.category}</h3>
            <table className="price-table">
              <thead>
                <tr>
                  <th rowSpan={2}>Blok</th><th rowSpan={2}>Unit</th><th rowSpan={2}>Tipe</th>
                  <th colSpan={2}>Luas (m2)</th><th rowSpan={2}>Booking Fee</th>
                  <th rowSpan={2}>Uang Muka {catGroup.category === 'Ruko' ? '20%' : '10%'}</th>
                  <th colSpan={3}>Angsuran KPR</th><th rowSpan={2}>Harga Jual (Rp)</th>
                </tr>
                <tr className="sub-header">
                  <th>Tanah</th><th>Bangunan</th><th>5 Tahun</th><th>10 Tahun</th><th>15 Tahun</th>
                </tr>
              </thead>
              <tbody>
                {catGroup.bloks.map((blokGroup: any) => {
                  const totalRows = blokGroup.groups.length;
                  return blokGroup.groups.map((group: any[], gIdx: number) => {
                    const item = group[0];
                    const calc = calculateKPR(item);
                    const isSold = item.status === 'sold';
                    const unitRange = group.length > 1 ? `${group[0].unit}-${group[group.length - 1].unit}` : item.unit;
                    return (
                      <tr key={`${catGroup.category}-${blokGroup.blok}-${gIdx}`}>
                        {gIdx === 0 && <td rowSpan={totalRows} className="text-center font-black uppercase align-middle">{blokGroup.blok}</td>}
                        <td className="text-center font-medium">{unitRange}</td>
                        <td className="text-center">{item.tipe}</td>
                        <td className="text-center">{item.luas_tanah}</td>
                        <td className="text-center">{item.luas_bangunan}</td>
                        {isSold ? <td colSpan={5} className="sold-cell">S O L D</td> : (
                          <>
                            <td className="text-center">{item.booking_fee.toLocaleString('id-ID')}</td>
                            <td className="text-center font-bold">{calc.dp_amount.toLocaleString('id-ID')}</td>
                            <td className="text-center">{calc.angsuran_5.toLocaleString('id-ID')}</td>
                            <td className="text-center">{calc.angsuran_10.toLocaleString('id-ID')}</td>
                            <td className="text-center">{calc.angsuran_15.toLocaleString('id-ID')}</td>
                          </>
                        )}
                        <td className="text-right font-black whitespace-nowrap">{item.harga_jual.toLocaleString('id-ID')}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        ))}

        <div className="doc-footer grid grid-cols-2 gap-12 text-[8pt] border-t-2 border-black pt-4">
          <div className="space-y-4">
            <div><h4 className="font-black uppercase mb-1">Harga Sudah Termasuk :</h4><ol className="list-decimal list-inside font-medium"><li>IMB</li><li>Listrik & Air</li><li>AJB & BBN</li><li>Lingkungan</li></ol></div>
            <div className="pt-2"><p className="italic font-bold mb-1 leading-tight text-[7pt]">1. Pembayaran sah melalui kasir atau Bank :</p>
              <div className="bank-info-grid">
                <span>BCA</span><span>045-068-1008</span><span>PT. Abadi Lestari Mandiri</span>
                <span>Mandiri</span><span>112-000-748-1042</span><span>PT. Abadi Lestari Mandiri</span>
                <span>BNI</span><span>020-568-0823</span><span>PT. Abadi Lestari Mandiri</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div><h4 className="font-black uppercase mb-1">Harga Belum Termasuk :</h4><ol className="list-decimal list-inside font-medium"><li>PBB</li><li>Biaya KPR</li></ol></div>
            <div className="pt-8 space-y-1 font-bold">
              <p>2. Harga dapat berubah sewaktu-waktu</p><p>3. Harga Berlaku per 1 Maret 2026</p>
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
          <Button onClick={handleMassUpdate} className="w-full bg-indigo-600 mt-4">Apply Update</Button>
        </div>
      </Modal>
    </div>
  );
};

export default PriceList;
