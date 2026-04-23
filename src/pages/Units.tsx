import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Home, Tag, CheckCircle2, Clock, ArrowLeft, Printer, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabase';
import { Unit } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/Input';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { UnitForm } from '../components/forms/UnitForm';
import { useAuth } from '../contexts/AuthContext';
import { getMockData } from '../lib/storage';

const Units: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchUnits();
    fetchProjects();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      
      if (isMockMode) {
        const defaultUnits: any[] = [
          {
            id: '1',
            project_id: '1',
            unit_number: 'A-01',
            type: 'Tipe 36/72',
            price: 350000000,
            status: 'available',
            project: { name: 'Griya Asri Residence' },
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            project_id: '1',
            unit_number: 'A-02',
            type: 'Tipe 36/72',
            price: 350000000,
            status: 'booked',
            project: { name: 'Griya Asri Residence' },
            created_at: new Date().toISOString(),
          }
        ];
        setUnits(getMockData<Unit>('units', defaultUnits));
        return;
      }

      const { data, error } = await supabase
        .from('units')
        .select('*, project:projects(name)')
        .order('unit_number', { ascending: true });

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = units.filter(u => 
    u.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.project?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const fetchProjects = async () => {
    if (isMockMode) {
      setProjects([{ id: '1', name: 'Griya Asri Residence' }, { id: '2', name: 'Grand Emerald City' }]);
      return;
    }
    const { data } = await supabase.from('projects').select('id, name');
    setProjects(data || []);
  };

  const handleAdd = () => {
    setSelectedUnit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsModalOpen(true);
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
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Daftar-Unit-Properti-${new Date().toLocaleDateString('id-ID')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal mengekspor PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div id="units-report" className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: landscape; 
            margin: 5mm !important; 
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
          }
          .print-no-shadow {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
        }
      `}} />

      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold text-slate-900 uppercase">Daftar Stok Unit Properti - Abadi Lestari Mandiri</h1>
        <p className="text-xs text-slate-500 mt-1">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              localStorage.removeItem('user_division');
              setDivision(null);
            }}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Unit Properti</h1>
            <p className="text-slate-500">Daftar semua unit di setiap proyek</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Cetak</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            isLoading={isExporting}
            className="flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Unit
          </Button>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedUnit ? 'Edit Unit' : 'Tambah Unit'}
        size="lg"
      >
        <UnitForm 
          projects={projects}
          onSuccess={handleSuccess} 
          onCancel={() => setIsModalOpen(false)} 
          initialData={selectedUnit} 
        />
      </Modal>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Home className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Unit</p>
            <p className="text-lg font-bold text-slate-900">{formatNumber(units.length)}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tersedia</p>
            <p className="text-lg font-bold text-slate-900">{formatNumber(units.filter(u => u.status === 'available').length)}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Booked</p>
            <p className="text-lg font-bold text-slate-900">{formatNumber(units.filter(u => u.status === 'booked').length)}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-slate-50 rounded-lg">
            <Tag className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Terjual</p>
            <p className="text-lg font-bold text-slate-900">{formatNumber(units.filter(u => u.status === 'sold').length)}</p>
          </div>
        </Card>
      </div>

      <Card className="p-0 print-no-shadow">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 print:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari unit atau proyek..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">No. Unit</th>
                <th className="px-6 py-3 font-semibold">Proyek</th>
                <th className="px-6 py-3 font-semibold">Tipe</th>
                <th className="px-6 py-3 font-semibold">Harga</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada unit ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{unit.unit_number}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{unit.project?.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{unit.type}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatCurrency(unit.price)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        unit.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                        unit.status === 'booked' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      )}>
                        {unit.status === 'available' ? 'Tersedia' :
                         unit.status === 'booked' ? 'Booked' : 'Terjual'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right print:hidden">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(unit)}>Edit</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
      </Card>
    </div>
  );
};

export default Units;



