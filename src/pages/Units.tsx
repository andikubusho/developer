import React, { useEffect, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Home, Tag, CheckCircle2, Clock, ArrowLeft, Printer, FileDown, Trash2, Edit } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Unit } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { formatCurrency, formatNumber, cn, formatDate } from '../lib/utils';
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
      pdf.save(`Stok-Unit-${formatDate(new Date()).replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div id="units-report" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-1 sm:p-2 h-auto">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-text-primary tracking-tight">Unit Properti</h1>
            <p className="text-[10px] sm:text-sm text-text-secondary font-medium uppercase tracking-widest">Stok & Status</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm h-9 px-2 sm:px-3">
            <Printer className="w-3.5 h-3.5 sm:w-4 h-4" />
            <span>Cetak</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} isLoading={isExporting} className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm h-9 px-2 sm:px-3">
            <FileDown className="w-3.5 h-3.5 sm:w-4 h-4" />
            <span>PDF</span>
          </Button>
          <Button size="sm" className="w-full sm:w-auto rounded-xl text-[10px] sm:text-sm py-3 h-9" onClick={handleAdd}>
            <Plus className="w-3.5 h-3.5 sm:w-4 h-4 mr-1 sm:mr-2" />
            Tambah Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4">
          <div className="p-1.5 sm:p-2 bg-accent-lavender/20 rounded-lg sm:rounded-xl"><Home className="w-4 h-4 sm:w-5 sm:h-5 text-accent-dark" /></div>
          <div><p className="text-[9px] sm:text-xs text-text-secondary font-black uppercase tracking-widest">Total</p><p className="text-sm sm:text-lg font-black text-text-primary">{units.length}</p></div>
        </Card>
        <Card className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4">
          <div><p className="text-[9px] sm:text-xs text-text-secondary font-black uppercase tracking-widest">Ready</p><p className="text-sm sm:text-lg font-black text-text-primary">{units.filter(u => u.status === 'available' && !u.is_blocking).length}</p></div>
        </Card>
        <Card className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4">
          <div className="p-1.5 sm:p-2 bg-rose-50 rounded-lg sm:rounded-xl"><Filter className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" /></div>
          <div><p className="text-[9px] sm:text-xs text-text-secondary font-black uppercase tracking-widest">Blocked</p><p className="text-sm sm:text-lg font-black text-text-primary">{units.filter(u => u.is_blocking).length}</p></div>
        </Card>
        <Card className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4">
          <div className="p-1.5 sm:p-2 bg-amber-50 rounded-lg sm:rounded-xl"><Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /></div>
          <div><p className="text-[9px] sm:text-xs text-text-secondary font-black uppercase tracking-widest">Booked</p><p className="text-sm sm:text-lg font-black text-text-primary">{units.filter(u => u.status === 'booked').length}</p></div>
        </Card>
        <Card className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4">
          <div className="p-1.5 sm:p-2 bg-white/30 rounded-lg sm:rounded-xl"><Tag className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary" /></div>
          <div><p className="text-[9px] sm:text-xs text-text-secondary font-black uppercase tracking-widest">Sold</p><p className="text-sm sm:text-lg font-black text-text-primary">{units.filter(u => u.status === 'sold').length}</p></div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Cari nomor unit..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filter</Button>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
              <THead>
                <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                  <TH className="px-3 py-3 font-black">Unit</TH>
                  <TH className="px-3 py-3 font-black">Tipe</TH>
                  <TH className="px-3 py-3 font-black hidden sm:table-cell">LT/LB</TH>
                  <TH className="px-3 py-3 font-black">Status</TH>
                  <TH className="px-3 py-3 font-black text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR><TD colSpan={7} className="px-3 py-10 text-center text-text-muted animate-pulse">Memuat...</TD></TR>
                ) : filteredUnits.length === 0 ? (
                  <TR><TD colSpan={7} className="px-3 py-10 text-center text-text-secondary text-sm">Tidak ada data.</TD></TR>
                ) : (
                  filteredUnits.map((unit) => (
                    <TR key={unit.id} className="hover:bg-white/30 transition-colors">
                      <TD className="px-3 py-4">
                        <div className="font-black text-text-primary text-[11px] whitespace-nowrap">{unit.unit_number}</div>
                        {unit.cluster && <div className="text-[9px] text-accent-dark font-black uppercase whitespace-nowrap">{unit.cluster}</div>}
                      </TD>
                      <TD className="px-3 py-4">
                        <div className="text-[11px] font-black text-text-primary whitespace-nowrap">{unit.type}</div>
                        <div className="md:hidden text-[9px] text-text-muted uppercase whitespace-nowrap truncate max-w-[80px]">{getProjectName(unit.project_id)}</div>
                      </TD>
                      <TD className="px-3 py-4 text-[10px] text-text-secondary hidden sm:table-cell whitespace-nowrap">
                        {unit.luas_tanah ? `${unit.luas_tanah} / ${unit.luas_bangunan}` : '-'}
                      </TD>
                      <TD className="px-3 py-4">
                        <div className="flex flex-wrap gap-1">
                          <span className={cn(
                            'inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest',
                            unit.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                            unit.status === 'booked' ? 'bg-amber-50 text-amber-700' : 'bg-white/40 text-text-primary'
                          )}>
                            {unit.status === 'available' ? 'Ready' : unit.status === 'booked' ? 'Booked' : 'Sold'}
                          </span>
                          {unit.is_blocking && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-100">
                              Blocked
                            </span>
                          )}
                        </div>
                      </TD>
                      <TD className="px-3 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(unit)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => handleDelete(unit)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedUnit ? 'Edit Unit' : 'Tambah Unit'} size="lg">
        <UnitForm projects={projects} onSuccess={handleSuccess} onCancel={() => setIsModalOpen(false)} initialData={selectedUnit} />
      </Modal>
    </div>
  );
};

export default Units;
