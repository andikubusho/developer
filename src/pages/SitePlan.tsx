import React, { useState, useEffect } from 'react';
import { Map, Upload, Printer, ArrowLeft, Trash2, Download, ZoomIn, ZoomOut, Maximize2, Info, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { MarketingDocument, Unit } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

// Path to the master plan image
const MASTER_PLAN_IMG = '/src/assets/siteplan/golden-canyon.png';

const SitePlan: React.FC = () => {
  const { setDivision } = useAuth();
  const [docs, setDocs] = useState<MarketingDocument[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'interactive' | 'documents'>('interactive');
  const [zoom, setZoom] = useState(0.8);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const GOLDEN_CANYON_ID = '28680951-0ab9-4722-a58c-6436a9401e42';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docData, unitData] = await Promise.all([
        api.get('marketing_documents', 'select=*&type=eq.siteplan&order=id.desc'),
        api.get('units', `project_id=eq.${GOLDEN_CANYON_ID}&order=unit_number.asc`)
      ]);
      setDocs(docData || []);
      setUnits(unitData || []);
    } catch (error) {
      console.error('Error fetching siteplan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUnitTypeColor = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('onyx')) return '#FEF9C3'; // Light Yellow
    if (t.includes('bronze')) return '#FFEDD5'; // Light Orange
    if (t.includes('ruby')) return '#FDE68A'; // Tan/Amber
    if (t.includes('copper')) return '#FB923C'; // Orange
    if (t.includes('black')) return '#92400E'; // Brown
    return '#E2E8F0';
  };

  const getStatusOverlay = (status: string) => {
    switch (status) {
      case 'sold': return 'bg-rose-600/80 text-white';
      case 'booked': return 'bg-amber-500/80 text-white';
      default: return '';
    }
  };

  // Improved layout based on the provided Master Plan image
  const renderInteractiveMap = () => {
    return (
      <div className="relative inline-block origin-top-left transition-transform duration-300" style={{ transform: `scale(${zoom})` }}>
        {/* Background Image */}
        <img 
          src={MASTER_PLAN_IMG} 
          alt="Master Plan" 
          className="max-w-none opacity-40 grayscale"
          style={{ width: '1200px' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/1200x800/f8fafc/cbd5e1?text=Master+Plan+Golden+Canyon';
          }}
        />

        {/* Interactive Layer */}
        <div className="absolute inset-0">
          {units.map((unit) => {
            const [blok, num] = unit.unit_number.split('/');
            let x = 0, y = 0, rotate = 0;

            // Mapping logic based on clusters visible in the image
            if (blok === 'North' || blok === 'N') {
              const i = parseInt(num) || 0;
              x = 240 + i * 26;
              y = 780 - i * 26;
              rotate = -45;
            } else if (blok === 'East' || blok === 'E') {
              const i = parseInt(num) || 0;
              x = 650;
              y = 100 + i * 45;
            } else if (blok === 'South' || blok === 'S') {
              const i = parseInt(num) || 0;
              x = 300 + i * 40;
              y = 820;
            } else if (blok === 'GC') {
              const i = parseInt(num) || 0;
              x = 550 + (i % 10) * 35;
              y = 550 + Math.floor(i / 10) * 45;
            }

            return (
              <div 
                key={unit.id}
                onClick={() => setSelectedUnit(unit)}
                className={cn(
                  "absolute w-8 h-12 border border-slate-400 cursor-pointer transition-all hover:scale-110 hover:z-20 shadow-sm flex flex-col items-center justify-center text-[8px] font-black group",
                  unit.status === 'sold' ? "ring-2 ring-rose-500" : "hover:ring-2 hover:ring-indigo-500"
                )}
                style={{ 
                  left: `${x}px`, 
                  top: `${y}px`, 
                  transform: `rotate(${rotate}deg)`,
                  backgroundColor: getUnitTypeColor(unit.type)
                }}
              >
                <div className="z-10">{num}</div>
                {unit.status !== 'available' && (
                  <div className={cn("absolute inset-0 flex items-center justify-center uppercase text-[6px]", getStatusOverlay(unit.status))}>
                    {unit.status === 'sold' ? 'SOLD' : 'BKD'}
                  </div>
                )}
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-30">
                  {unit.unit_number} - {unit.type}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) return;
    try {
      setLoading(true);
      await api.delete('marketing_documents', id);
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting doc:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Siteplan Golden Canyon</h1>
              <p className="text-slate-500 text-sm font-medium">Visualisasi real-time stok unit Master Plan</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setViewMode('interactive')}
              className={cn("px-4 py-1.5 text-sm font-bold rounded-lg transition-all", viewMode === 'interactive' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-600 hover:bg-slate-50")}
            >
              Master Plan
            </button>
            <button 
              onClick={() => setViewMode('documents')}
              className={cn("px-4 py-1.5 text-sm font-bold rounded-lg transition-all", viewMode === 'documents' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-600 hover:bg-slate-50")}
            >
              Arsip PDF
            </button>
          </div>
        </div>

        {viewMode === 'interactive' ? (
          <div className="flex-1 relative bg-slate-50 rounded-[2.5rem] border-2 border-slate-200 overflow-hidden shadow-inner">
            {/* Toolbar */}
            <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
              <div className="flex bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 p-1.5 shadow-xl">
                <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))} className="h-9 w-9 rounded-xl">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <div className="w-px h-4 bg-slate-200 self-center mx-1" />
                <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.3))} className="h-9 w-9 rounded-xl">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <div className="w-px h-4 bg-slate-200 self-center mx-1" />
                <Button variant="ghost" size="sm" onClick={() => setZoom(0.8)} className="h-9 w-9 rounded-xl">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md p-5 rounded-[2rem] border border-slate-200 shadow-xl z-10 w-48">
              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Tipe Unit</h4>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { name: 'Onyx Canyon', color: '#FEF9C3' },
                  { name: 'Bronze Canyon', color: '#FFEDD5' },
                  { name: 'Ruby Canyon', color: '#FDE68A' },
                  { name: 'Copper Canyon', color: '#FB923C' },
                  { name: 'Black Canyon', color: '#92400E' }
                ].map(l => (
                  <div key={l.name} className="flex items-center gap-3 group">
                    <div className="w-4 h-4 rounded-md border border-slate-300 shadow-sm transition-transform group-hover:scale-125" style={{ backgroundColor: l.color }} />
                    <span className="text-[10px] font-bold text-slate-700 tracking-tight">{l.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Map Canvas */}
            <div className="w-full h-full overflow-auto cursor-grab active:cursor-grabbing p-24 scrollbar-hide bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:32px_32px]">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="font-bold">Sinkronisasi Master Plan...</p>
                </div>
              ) : renderInteractiveMap()}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pr-2">
            {docs.map((doc) => (
              <Card key={doc.id} className="p-4 group hover:border-indigo-600 transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-600 transition-colors">
                    <Map className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-bold text-slate-900 truncate">{doc.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-bold">Uploaded {formatDate(doc.created_at)}</p>
                    <div className="flex items-center gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1"><Download className="w-3 h-3 mr-2" />Save</Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(doc.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            <Card className="p-4 border-2 border-dashed flex flex-col items-center justify-center min-h-[140px] cursor-pointer hover:bg-slate-50" onClick={() => setIsModalOpen(true)}>
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-600">Upload New Plan</p>
            </Card>
          </div>
        )}
      </div>

      {/* Info Sidebar */}
      <div className="w-80 flex flex-col gap-6">
        <Card className="p-6 flex-1 flex flex-col bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-sm">
          {selectedUnit ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedUnit.unit_number}</h3>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Status Unit</p>
                </div>
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                  selectedUnit.status === 'available' ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" :
                  selectedUnit.status === 'booked' ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200" : "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                )}>
                  {selectedUnit.status}
                </div>
              </div>

              <div className="aspect-video bg-slate-950 rounded-3xl flex items-center justify-center text-white overflow-hidden relative shadow-2xl">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <Map className="w-10 h-10 mb-2 text-indigo-400" />
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Preview Layout</span>
                </div>
                <div className="absolute bottom-3 left-3 flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Estimasi Harga</p>
                  <p className="text-xl font-black text-indigo-600">{formatCurrency(selectedUnit.price)}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[8px] text-slate-400 font-black uppercase mb-1">Tipe</p>
                    <p className="text-xs font-bold text-slate-900">{selectedUnit.type}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[8px] text-slate-400 font-black uppercase mb-1">Blok</p>
                    <p className="text-xs font-bold text-slate-900">{selectedUnit.unit_number.split('/')[0]}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                {selectedUnit.status === 'available' && (
                  <Button className="w-full py-4 text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 rounded-2xl">
                    Mulai Transaksi <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                <Button variant="outline" className="w-full py-4 text-xs font-black uppercase tracking-widest border-2 rounded-2xl hover:bg-slate-50 transition-all">
                  Kirim via WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Map className="w-8 h-8 text-slate-200" />
              </div>
              <h3 className="font-black text-slate-700 uppercase text-[10px] tracking-widest mb-3">Pilih Unit di Peta</h3>
              <p className="text-[10px] leading-relaxed text-slate-400 font-medium">Klik pada nomor unit di Master Plan untuk melihat detail spesifikasi, harga, dan ketersediaan real-time.</p>
            </div>
          )}
        </Card>

        {/* Stats Card */}
        <Card className="p-6 bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Ringkasan Stok</span>
            <Info className="w-4 h-4 text-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-6 relative z-10">
            <div>
              <p className="text-3xl font-black">{units.filter(u => u.status === 'available').length}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <p className="text-[9px] font-bold uppercase text-slate-400">Ready</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-rose-500">{units.filter(u => u.status === 'sold').length}</p>
              <div className="flex items-center gap-1.5 mt-1 justify-end">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                <p className="text-[9px] font-bold uppercase text-slate-400">Sold</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Dokumen Siteplan">
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-[3rem] hover:border-indigo-600 transition-all cursor-pointer group">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-50 transition-colors">
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Pilih File Master Plan</h3>
          <p className="text-sm text-slate-500 mt-2 font-medium">Format PDF atau Image (Maks 10MB)</p>
        </div>
      </Modal>
    </div>
  );
};

export default SitePlan;
