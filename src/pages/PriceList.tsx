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
    
    // Determine DP Percentage based on Category (Ruko 20%, Rumah 10% as per screenshot)
    const dp_percentage = item.category === 'Ruko' ? 0.20 : 0.10;
    const booking_fee = item.booking_fee || settings.booking_fee;
    const dp_amount = item.harga_jual * dp_percentage;
    const plafond_kpr = item.harga_jual - dp_amount;
    
    const calculateAngsuran = (tahun: number) => {
      if (plafond_kpr <= 0) return 0;
      // Formula: (Plafond * (1 + (Bunga * Tahun))) / (Tahun * 12)
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
        const items = groupsByBlok[blok].sort((a: any, b: any) => {
          const numA = parseInt(a.unit) || 0;
          const numB = parseInt(b.unit) || 0;
          return numA - numB;
        });

        // Group units by identical specs (Unit Range merging)
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
    <div id="price-list-container" className="space-y-6 print:p-0 print:m-0 bg-white min-h-screen">
      {/* ON-SCREEN ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print p-6 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Management Price List</h1>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">GOLDEN CANYON • DOCUMENT CONTROL</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-xl border-slate-200 text-sm bg-white px-4 py-2 font-bold shadow-sm"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => setIsUpdateModalOpen(true)}><Percent className="w-4 h-4 mr-2" />Update</Button>
          <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}><Plus className="w-4 h-4 mr-2" />Tambah</Button>
          <Button size="sm" className="rounded-xl font-bold bg-slate-900" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Cetak Dokumen</Button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 1cm 1.5cm; -webkit-print-color-adjust: exact; font-family: 'Inter', sans-serif; }
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
        }
      `}} />

      {/* DOCUMENT VIEW (Used for both Screen and Print) */}
      <div className="max-w-[1000px] mx-auto p-4 md:p-8 lg:p-12 print:p-0">
        
        {/* Header Section (Exactly like image 2) */}
        <div className="doc-header flex justify-between items-center mb-6">
          <div className="w-32">
             <img src={logoProyek} alt="Golden Canyon" className="h-16 w-auto object-contain" />
          </div>
          <div className="doc-title-block text-center">
             <h1 className="text-2xl font-black tracking-tighter text-black uppercase leading-none">GOLDEN CANYON</h1>
          </div>
          <div className="w-32 flex justify-end">
             <img src={logoPerusahaan} alt="Abadi Lestari Land" className="h-14 w-auto object-contain" />
          </div>
        </div>

        {/* Dynamic Tables Based on Category */}
        {getGroupedItems().map((catGroup) => (
          <div key={catGroup.category} className="mb-8">
            <h3 className="text-sm font-black mb-2 uppercase tracking-widest text-slate-800">{catGroup.category}</h3>
            <table className="price-table w-full border-[1.5px] border-black border-collapse">
              <thead>
                <tr className="bg-white">
                  <th rowSpan={2} className="w-10">Blok</th>
                  <th rowSpan={2} className="w-12">Unit</th>
                  <th rowSpan={2} className="w-20">Tipe</th>
                  <th colSpan={2} className="w-24">Luas (m2)</th>
                  <th rowSpan={2} className="w-24">Booking Fee</th>
                  <th rowSpan={2} className="w-28">Uang Muka {catGroup.category === 'Ruko' ? '20%' : '10%'}</th>
                  <th colSpan={3}>Angsuran KPR</th>
                  <th rowSpan={2} className="w-32">Harga Jual (Rp)</th>
                </tr>
                <tr className="sub-header bg-white">
                  <th className="w-12">Tanah</th>
                  <th className="w-12">Bangunan</th>
                  <th className="w-20">5 Tahun</th>
                  <th className="w-20">10 Tahun</th>
                  <th className="w-20">15 Tahun</th>
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
                      <tr key={`${catGroup.category}-${blokGroup.blok}-${gIdx}`} className="bg-white">
                        {/* Merged Block Column */}
                        {gIdx === 0 && (
                          <td rowSpan={totalRows} className="text-center font-black uppercase border-black align-middle">{blokGroup.blok}</td>
                        )}
                        <td className="text-center font-medium border-black">{unitRange}</td>
                        <td className="text-center border-black">{item.tipe}</td>
                        <td className="text-center border-black">{item.luas_tanah}</td>
                        <td className="text-center border-black">{item.luas_bangunan}</td>
                        
                        {isSold ? (
                          <td colSpan={5} className="sold-cell border-black">S O L D</td>
                        ) : (
                          <>
                            <td className="text-center border-black">{item.booking_fee.toLocaleString('id-ID')}</td>
                            <td className="text-center border-black font-bold">{calc.dp_amount.toLocaleString('id-ID')}</td>
                            <td className="text-center border-black">{calc.angsuran_5.toLocaleString('id-ID')}</td>
                            <td className="text-center border-black">{calc.angsuran_10.toLocaleString('id-ID')}</td>
                            <td className="text-center border-black">{calc.angsuran_15.toLocaleString('id-ID')}</td>
                          </>
                        )}
                        <td className="text-right font-black border-black whitespace-nowrap">{item.harga_jual.toLocaleString('id-ID')}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* Footer Section (Exactly like image 2) */}
        <div className="doc-footer grid grid-cols-2 gap-12 text-[8pt] border-t-2 border-black pt-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-black uppercase mb-1">Harga Sudah Termasuk :</h4>
              <ol className="list-decimal list-inside space-y-0.5 font-medium">
                <li>Izin Mendirikan Bangunan ( IMB )</li>
                <li>Biaya Penyambungan Listrik & Air</li>
                <li>Akta Jual Beli & Biaya Balik Nama</li>
                <li>Biaya Keamanan & Lingkungan</li>
              </ol>
            </div>
            
            <div className="pt-2">
              <p className="italic font-bold mb-1 leading-tight">1. Pembayaran booking fee maupun uang muka dianggap sah bila melalui kasir kantor pusat dan menerima kuitansi asli yang berstempel perusahaan, atau ke No. Rekening Bank :</p>
              <div className="bank-info-grid">
                <span>BCA</span><span>045-068-1008</span><span>PT. Abadi Lestari Mandiri</span>
                <span>Mandiri</span><span>112-000-748-1042</span><span>PT. Abadi Lestari Mandiri</span>
                <span>BNI</span><span>020-568-0823</span><span>PT. Abadi Lestari Mandiri</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-black uppercase mb-1">Harga Belum Termasuk :</h4>
              <ol className="list-decimal list-inside space-y-0.5 font-medium">
                <li>PBB</li>
                <li>Biaya KPR</li>
              </ol>
            </div>

            <div className="pt-8 space-y-1 font-bold">
              <p>2. Harga sewaktu-waktu dapat berubah tanpa pemberitahuan terlebih dahulu</p>
              <p>3. Harga Berlaku per 1 Maret 2026</p>
            </div>
          </div>
        </div>

      </div>

      {/* CRUD Modals */}
      <Modal isOpen={isItemModalOpen} onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }} title={editingItem ? "Edit Unit" : "Tambah Unit Baru"}>
        <PriceItemForm 
          initialData={editingItem || undefined} 
          availableTypes={Array.from(new Set(priceItems.map(i => i.tipe))).filter(Boolean)} 
          projectId={selectedProjectId}
          onSubmit={async (data) => {
            try {
              setLoading(true);
              const payload = { project_id: selectedProjectId, ...data };
              if (editingItem) {
                await api.update('price_list_items', editingItem.id, payload);
              } else {
                await api.insert('price_list_items', { ...payload, status: 'available', unit_id: `unit-${Math.random().toString(36).substr(2, 4)}` });
              }
              await fetchPriceItems();
              setIsItemModalOpen(false);
              setEditingItem(null);
            } catch (error) { console.error(error); } finally { setLoading(false); }
          }} 
          onCancel={() => { setIsItemModalOpen(false); setEditingItem(null); }} 
          loading={loading} 
        />
      </Modal>

      <Modal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} title="Update Harga Massal">
        <div className="p-6 space-y-4 text-center">
          <p className="text-sm font-bold text-slate-600">Fitur update harga massal akan menaikkan harga jual seluruh unit terpilih berdasarkan persentase.</p>
          <Input type="number" label="Persentase Kenaikan (%)" value={updatePercent} onChange={(e) => setUpdatePercent(parseFloat(e.target.value) || 0)} />
          <Button onClick={() => alert('Fitur mass update diaktifkan')} className="w-full bg-indigo-600 mt-4">Apply Update</Button>
        </div>
      </Modal>
    </div>
  );
};

export default PriceList;
