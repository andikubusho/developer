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
        const items = groupsByBlok[blok].sort((a: any, b: any) => {
          const numA = parseInt(a.unit) || 0;
          const numB = parseInt(b.unit) || 0;
          return numA - numB;
        });

        const mergedInBlok: any[] = [];
        let currentGroup: any[] = [];

        items.forEach((item: any, idx: number) => {
          if (idx === 0) {
            currentGroup = [item];
          } else {
            const prev = items[idx - 1];
            const isMatch = item.tipe === prev.tipe && 
                           item.luas_tanah === prev.luas_tanah && 
                           item.luas_bangunan === prev.luas_bangunan && 
                           item.harga_jual === prev.harga_jual &&
                           item.status === prev.status;

            if (isMatch) {
              currentGroup.push(item);
            } else {
              mergedInBlok.push(currentGroup);
              currentGroup = [item];
            }
          }
          if (idx === items.length - 1) {
            mergedInBlok.push(currentGroup);
          }
        });

        catGroups.push({ blok, groups: mergedInBlok });
      });

      result.push({ category: cat, bloks: catGroups });
    });

    return result;
  };

  return (
    <div id="price-list-container" className="space-y-6 print:p-0 print:m-0">
      {/* ON-SCREEN UI - Modern Style */}
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

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block mb-8 pt-8 px-8">
        <div className="relative text-center pb-4">
          <img src={logoPerusahaan} alt="Logo" className="absolute top-0 right-0 h-16 w-auto" />
          <div className="flex flex-col items-center">
            <img src={logoProyek} alt="Logo" className="h-20 w-auto mb-4" />
            <h1 className="text-3xl font-black uppercase tracking-tight leading-none text-black">DAFTAR HARGA UNIT</h1>
            <h2 className="text-2xl font-bold uppercase tracking-[0.2em] text-black mt-1">GOLDEN CANYON</h2>
            <p className="text-sm font-bold mt-2 text-black uppercase">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="mt-6 border-b-[3px] border-black w-full"></div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0; /* This helps remove browser headers/footers */
          }
          body {
            margin: 1.5cm; /* Re-add margin to body to keep content away from edge */
            -webkit-print-color-adjust: exact;
          }
          #price-list-container, #price-list-container * { visibility: visible !important; }
          #price-list-container {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: white !important;
          }
          .no-print, .action-column { display: none !important; }
          
          /* Classic Table Style for Print */
          .price-table { 
            width: 100% !important; 
            border: 2px solid black !important; 
            border-collapse: collapse !important;
          }
          .price-table th, .price-table td { 
            border: 1.5px solid black !important; 
            padding: 4px 6px !important; 
            color: black !important; 
            font-size: 7.5pt !important;
            line-height: 1.2 !important;
          }
          .price-table thead tr { background: white !important; }
          .price-table .cat-row { background: #f3f4f6 !important; }
          
          /* SOLD styling to match screenshot */
          .sold-row-cell {
            background-color: #e5e7eb !important;
            color: #1f2937 !important;
            font-weight: 900 !important;
            letter-spacing: 1.5em !important;
            text-align: center !important;
            text-transform: uppercase !important;
            font-size: 8pt !important;
          }

          /* Footer compaction */
          .print-footer { 
            margin-top: 30px !important;
            padding-top: 15px !important;
            border-top: 2px solid black !important;
          }
        }
      `}} />

      {/* MODERN ON-SCREEN TABLE WRAPPED IN CARD */}
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
                              <td className="px-3 py-2 text-center border-r border-slate-50"><p className="font-bold text-slate-900 leading-tight">{formatCurrency(calc.uang_muka_kpr)}</p></td>
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

      {/* PRINT-ONLY CLASSIC TABLE WITH MERGING */}
      <div className="hidden print:block">
        <table className="price-table">
          <thead>
            <tr className="font-black uppercase">
              <th rowSpan={2}>Blok</th>
              <th rowSpan={2}>Unit</th>
              <th rowSpan={2}>Tipe</th>
              <th colSpan={2}>Luas (m2)</th>
              <th rowSpan={2}>Booking Fee</th>
              <th rowSpan={2}>Uang Muka</th>
              <th colSpan={3}>Angsuran KPR</th>
              <th rowSpan={2} className="text-right whitespace-nowrap">Harga Jual (Rp)</th>
            </tr>
            <tr className="font-bold uppercase text-[7px]">
              <th>Tanah</th>
              <th>Bgn</th>
              <th>5 Tahun</th>
              <th>10 Tahun</th>
              <th>15 Tahun</th>
            </tr>
          </thead>
          <tbody className="font-bold">
            {getGroupedItems().map((catGroup) => (
              <React.Fragment key={catGroup.category}>
                <tr className="cat-row"><td colSpan={11} className="font-black uppercase tracking-widest">{catGroup.category}</td></tr>
                {catGroup.bloks.map((blokGroup: any) => {
                  const totalRowsInBlok = blokGroup.groups.length;
                  return blokGroup.groups.map((group: any[], gIdx: number) => {
                    const item = group[0];
                    const calc = calculateKPR(item);
                    const isSold = item.status === 'sold';
                    const unitRange = group.length > 1 ? `${group[0].unit}-${group[group.length - 1].unit}` : item.unit;

                    return (
                      <tr key={`${catGroup.category}-${blokGroup.blok}-${gIdx}`}>
                        {gIdx === 0 && (
                          <td rowSpan={totalRowsInBlok} className="text-center font-black uppercase align-middle bg-white">{blokGroup.blok}</td>
                        )}
                        <td className="text-center whitespace-nowrap">{unitRange}</td>
                        <td className="text-center">{item.tipe}</td>
                        <td className="text-center">{item.luas_tanah}</td>
                        <td className="text-center">{item.luas_bangunan}</td>
                        
                        {isSold ? (
                          <td colSpan={6} className="sold-row-cell">S O L D</td>
                        ) : (
                          <>
                            <td className="text-center whitespace-nowrap">{formatCurrency(item.booking_fee)}</td>
                            <td className="text-center">
                              <div>{formatCurrency(calc.uang_muka_kpr)}</div>
                              <div className="text-[6px] font-normal uppercase">DP {Math.round((item.dp_percentage || 0.1) * 100)}%</div>
                            </td>
                            <td className="text-center text-indigo-800 font-black">{formatCurrency(calc.angsuran_5)}</td>
                            <td className="text-center text-indigo-800 font-black">{formatCurrency(calc.angsuran_10)}</td>
                            <td className="text-center text-indigo-800 font-black">{formatCurrency(calc.angsuran_15)}</td>
                            <td className="text-right font-black whitespace-nowrap">{formatCurrency(item.harga_jual)}</td>
                          </>
                        )}
                      </tr>
                    );
                  });
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* PRINT-ONLY FOOTER */}
      <div className="hidden print:grid print-footer grid-cols-2 gap-8 text-[9px] font-bold">
        <div className="space-y-3">
          <div>
            <h3 className="underline uppercase mb-0.5">Harga Sudah Termasuk :</h3>
            <ol className="list-decimal list-inside leading-tight">
              <li>Izin Mendirikan Bangunan ( IMB )</li>
              <li>Biaya Penyambungan Listrik & Air</li>
              <li>Akta Jual Beli & Biaya Balik Nama</li>
              <li>Biaya Keamanan & Lingkungan</li>
            </ol>
          </div>
          <div className="text-[8px] leading-tight">
            <p className="mb-1 italic">1. Pembayaran sah melalui kasir atau Rekening Bank :</p>
            <div className="grid grid-cols-[60px_1fr_1fr] gap-x-2">
              <span>BCA</span><span>045-068-1008</span><span>PT. Abadi Lestari Mandiri</span>
              <span>Mandiri</span><span>112-000-748-1042</span><span>PT. Abadi Lestari Mandiri</span>
              <span>BNI</span><span>020-568-0823</span><span>PT. Abadi Lestari Mandiri</span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <h3 className="underline uppercase mb-0.5">Harga Belum Termasuk :</h3>
            <ol className="list-decimal list-inside">
              <li>PBB</li>
              <li>Biaya KPR</li>
            </ol>
          </div>
          <div className="pt-4 text-[8px] italic text-slate-500 leading-tight">
            <p>2. Harga dapat berubah sewaktu-waktu</p>
            <p>3. Harga Berlaku per 1 Maret 2026</p>
          </div>
        </div>
      </div>

      <Modal isOpen={isItemModalOpen} onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }} title={editingItem ? "Edit Unit" : "Tambah Unit Baru"}>
        <PriceItemForm 
          initialData={editingItem || undefined} 
          availableTypes={Array.from(new Set(priceItems.map(i => i.tipe))).filter(Boolean)} 
          projectId={selectedProjectId}
          onSubmit={handleSubmitItem} 
          onCancel={() => { setIsItemModalOpen(false); setEditingItem(null); }} 
          loading={loading} 
        />
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
