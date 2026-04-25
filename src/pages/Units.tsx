import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Home, Tag, CheckCircle2, Clock, ArrowLeft, Printer, FileDown, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Unit } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { UnitForm } from '../components/forms/UnitForm';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

const Units: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const GOLDEN_CANYON_ID = '28680951-0ab9-4722-a58c-6436a9401e42';

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchUnits(), fetchProjects()]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchUnits = async () => {
    try {
      const [standardUnits, priceListItems] = await Promise.all([
        api.get('units', 'select=*&order=unit_number.asc'),
        api.get('price_list_items', 'select=*')
      ]);

      const processedUnits = (standardUnits || []).map((u: any) => {
        if (u.project_id === GOLDEN_CANYON_ID) {
          const pli = (priceListItems || []).find((p: any) => p.unit_id === u.id);
          if (pli) {
            return {
              ...u,
              unit_number: `${pli.blok} - ${pli.unit}`,
              type: pli.tipe,
              price: pli.harga_jual,
              luas_tanah: pli.luas_tanah,
              luas_bangunan: pli.luas_bangunan,
              category: pli.category,
              cluster: pli.cluster
            };
          }
        }
        return u;
      });

      const existingUnitIds = processedUnits.map((u: any) => u.id);
      const orphanPli = (priceListItems || []).filter((pli: any) => !existingUnitIds.includes(pli.unit_id));
      
      const finalUnits = [
        ...processedUnits,
        ...orphanPli.map((pli: any) => ({
          id: pli.id, // Use PLI ID for the record itself
          unit_id: pli.unit_id,
          isOrphan: true,
          project_id: pli.project_id,
          unit_number: `${pli.blok} - ${pli.unit}`,
          type: pli.tipe,
          price: pli.harga_jual,
          status: pli.status,
          luas_tanah: pli.luas_tanah,
          luas_bangunan: pli.luas_bangunan,
          category: pli.category,
          cluster: pli.cluster
        }))
      ];

      setUnits(finalUnits);
    } catch (error: any) {
      console.error('❌ UNITS FETCH FAILED:', error);
      throw error;
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await api.get('projects', 'select=id,name');
      setProjects(data || []);
    } catch (error: any) {
      console.error('❌ PROJECTS FETCH FAILED:', error);
      throw error;
    }
  };

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Proyek Umum';
  };

  const filteredUnits = units.filter(u => 
    u.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setSelectedUnit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (unit: any) => {
    setSelectedUnit(unit);
    setIsModalOpen(true);
  };

  const handleDelete = async (unit: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus unit ${unit.unit_number}?`)) return;
    
    try {
      setLoading(true);
      if (unit.isOrphan) {
        // If it only exists in price list, delete from there
        await api.delete('price_list_items', unit.id);
      } else {
        // Standard unit deletion
        await api.delete('units', unit.id);
      }
      fetchUnits();
    } catch (error: any) {
      alert('Gagal menghapus unit: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchUnits();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('units-report');
    if (!element) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Stok-Unit-${new Date().toLocaleDateString()}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div id="units-report" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Unit Properti</h1>
            {error && <p className="text-red-500 text-xs font-mono">Error: {error}</p>}
            <p className="text-slate-500">Manajemen stok unit dan sinkronisasi Price List</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} isLoading={isExporting} className="flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            <span>PDF</span>
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Unit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-indigo-50 rounded-lg"><Home className="w-5 h-5 text-indigo-600" /></div>
          <div><p className="text-xs text-slate-500 font-medium">Total Unit</p><p className="text-lg font-bold text-slate-900">{units.length}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-slate-500 font-medium">Tersedia</p><p className="text-lg font-bold text-slate-900">{units.filter(u => u.status === 'available').length}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-amber-50 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-slate-500 font-medium">Booked</p><p className="text-lg font-bold text-slate-900">{units.filter(u => u.status === 'booked').length}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-slate-50 rounded-lg"><Tag className="w-5 h-5 text-slate-600" /></div>
          <div><p className="text-xs text-slate-500 font-medium">Terjual</p><p className="text-lg font-bold text-slate-900">{units.filter(u => u.status === 'sold').length}</p></div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari nomor unit..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filter</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">No. Unit</th>
                <th className="px-6 py-3 font-semibold">Proyek</th>
                <th className="px-6 py-3 font-semibold">Tipe / Kategori</th>
                <th className="px-6 py-3 font-semibold">LT / LB</th>
                <th className="px-6 py-3 font-semibold">Harga</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 animate-pulse">Memuat data unit...</td></tr>
              ) : filteredUnits.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500">Belum ada unit properti.</td></tr>
              ) : (
                filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{unit.unit_number}</div>
                      {unit.cluster && <div className="text-[10px] text-indigo-600 font-bold uppercase">{unit.cluster}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{getProjectName(unit.project_id)}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{unit.type}</div>
                      {unit.category && <div className="text-[10px] text-slate-400 uppercase">{unit.category}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {unit.luas_tanah ? `${unit.luas_tanah} / ${unit.luas_bangunan}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-slate-900">{formatCurrency(unit.price)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        unit.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                        unit.status === 'booked' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                      )}>
                        {unit.status === 'available' ? 'Tersedia' : unit.status === 'booked' ? 'Booked' : 'Terjual'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(unit)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(unit)} className="text-rose-500 hover:bg-rose-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedUnit ? 'Edit Unit' : 'Tambah Unit'} size="lg">
        <UnitForm projects={projects} onSuccess={handleSuccess} onCancel={() => setIsModalOpen(false)} initialData={selectedUnit} />
      </Modal>
    </div>
  );
};

export default Units;
