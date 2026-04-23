import React, { useState, useEffect } from 'react';
import { Map, Upload, Printer, ArrowLeft, Trash2, Download, ZoomIn, ZoomOut, Maximize2, Info, ChevronRight, Image as ImageIcon, LayoutGrid } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { MarketingDocument, Unit, Project } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

// Standard SVG Viewport for all Site Plans
const VIEWPORT_WIDTH = 1200;
const VIEWPORT_HEIGHT = 900;

const SitePlan: React.FC = () => {
  const { setDivision } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'interactive' | 'documents'>('interactive');
  const [zoom, setZoom] = useState(0.8);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectUnits();
    }
  }, [selectedProjectId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const projectData = await api.get('projects', 'select=*&order=name.asc');
      setProjects(projectData || []);
      if (projectData && projectData.length > 0) {
        // Set Golden Canyon as default if exists
        const gc = projectData.find((p: any) => p.name.toLowerCase().includes('golden canyon'));
        setSelectedProjectId(gc ? gc.id : projectData[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectUnits = async () => {
    try {
      setLoading(true);
      const unitData = await api.get('units', `project_id=eq.${selectedProjectId}&order=unit_number.asc`);
      setUnits(unitData || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async () => {
    const url = prompt('Masukkan URL Gambar Site Plan (JPG/PNG):');
    if (!url) return;
    try {
      setLoading(true);
      await api.update('projects', selectedProjectId, { site_plan_image_url: url });
      await fetchInitialData();
      setIsUploadModalOpen(false);
    } catch (error: any) {
      alert(`Gagal upload: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getUnitTypeColor = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('onyx')) return '#FEF9C3';
    if (t.includes('bronze')) return '#FFEDD5';
    if (t.includes('ruby')) return '#FDE68A';
    if (t.includes('copper')) return '#FB923C';
    if (t.includes('black')) return '#92400E';
    return '#F1F5F9';
  };

  const getStatusOverlay = (status: string) => {
    switch (status) {
      case 'sold': return 'bg-rose-600/90 text-white';
      case 'booked': return 'bg-amber-500/90 text-white';
      default: return '';
    }
  };

  const renderInteractiveMap = () => {
    return (
      <div className="relative inline-block origin-top-left transition-transform duration-300" style={{ transform: `scale(${zoom})` }}>
        {/* Background Image Layer */}
        {selectedProject?.site_plan_image_url ? (
          <img 
            src={selectedProject.site_plan_image_url} 
            alt="Site Plan Map" 
            className="max-w-none opacity-60"
            style={{ width: `${VIEWPORT_WIDTH}px`, height: `${VIEWPORT_HEIGHT}px`, objectFit: 'contain' }}
          />
        ) : (
          <div className="bg-slate-200/50 rounded-[3rem] flex flex-col items-center justify-center gap-4" style={{ width: `${VIEWPORT_WIDTH}px`, height: `${VIEWPORT_HEIGHT}px` }}>
            <ImageIcon className="w-20 h-20 text-slate-300" />
            <p className="text-slate-400 font-bold uppercase tracking-widest">Belum ada gambar Site Plan</p>
            <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(true)}>Upload Gambar Sekarang</Button>
          </div>
        )}

        {/* Interactive Unit Layer */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl font-black text-slate-100 uppercase pointer-events-none tracking-tighter opacity-10 whitespace-nowrap">
            {selectedProject?.name}
          </div>
          
          {units.map((unit: any) => {
            const hasCoords = unit.sp_x !== null && unit.sp_y !== null;
            if (!hasCoords) return null;

            const num = unit.unit_number.split('/')[1] || unit.unit_number;

            return (
              <div 
                key={unit.id}
                onClick={() => setSelectedUnit(unit)}
                className={cn(
                  "absolute w-8 h-11 border border-slate-400 cursor-pointer transition-all hover:scale-125 hover:z-50 shadow-md flex flex-col items-center justify-center text-[8px] font-black group overflow-hidden",
                  unit.status === 'sold' ? "ring-2 ring-rose-500" : "hover:ring-2 hover:ring-indigo-600"
                )}
                style={{ 
                  left: `${unit.sp_x}px`, 
                  top: `${unit.sp_y}px`, 
                  transform: `rotate(${unit.sp_rotation || 0}deg)`,
                  backgroundColor: getUnitTypeColor(unit.type)
                }}
              >
                <div className="z-10 text-slate-900 group-hover:scale-110 transition-transform">{num}</div>
                {unit.status !== 'available' && (
                  <div className={cn("absolute inset-0 flex items-center justify-center uppercase text-[7px] font-black tracking-tighter", getStatusOverlay(unit.status))}>
                    {unit.status === 'sold' ? 'SOLD' : 'BKD'}
                  </div>
                )}
                {/* Visual Tooltip */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-[100] shadow-2xl transition-all translate-y-2 group-hover:translate-y-0">
                  <div className="font-black uppercase tracking-widest">{unit.unit_number}</div>
                  <div className="text-[8px] opacity-60">{unit.type} - {formatCurrency(unit.price)}</div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 overflow-hidden">
      {/* Main Map View */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Header with Project Selector */}
        <div className="flex items-center justify-between bg-white p-4 rounded-[2rem] border-2 border-slate-100 shadow-sm">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="h-10 w-10 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Pilih Proyek</label>
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent border-none text-xl font-black text-slate-900 focus:ring-0 p-0 cursor-pointer hover:text-indigo-600 transition-colors"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button 
                onClick={() => setViewMode('interactive')}
                className={cn("flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all", viewMode === 'interactive' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-white/50")}
              >
                <Map className="w-4 h-4" /> Interactive
              </button>
              <button 
                onClick={() => setViewMode('documents')}
                className={cn("flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all", viewMode === 'documents' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-white/50")}
              >
                <Download className="w-4 h-4" /> Docs
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(true)} className="rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest">
              <Upload className="w-4 h-4 mr-2" /> Upload BG
            </Button>
          </div>
        </div>

        {/* Map Canvas */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden shadow-2xl group/canvas border-[12px] border-slate-800 rounded-[3.5rem]">
          {/* Legend - Floating Design */}
          <div className="absolute top-8 right-8 bg-slate-900/90 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl z-20 w-52 transition-all hover:scale-105">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="w-4 h-4 text-indigo-400" />
              <h4 className="text-[10px] font-black uppercase text-indigo-300 tracking-widest">Legenda Unit</h4>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { name: 'Onyx Canyon', color: '#FEF9C3' },
                { name: 'Bronze Canyon', color: '#FFEDD5' },
                { name: 'Ruby Canyon', color: '#FDE68A' },
                { name: 'Copper Canyon', color: '#FB923C' },
                { name: 'Black Canyon', color: '#92400E' }
              ].map(l => (
                <div key={l.name} className="flex items-center gap-3 group/item">
                  <div className="w-4 h-4 rounded-md border border-white/10 shadow-sm transition-transform group-hover/item:scale-110" style={{ backgroundColor: l.color }} />
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-tight">{l.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="absolute top-8 left-8 flex bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-2xl z-20">
            <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.min(prev + 0.1, 2.5))} className="h-10 w-10 rounded-xl text-white hover:bg-white/10">
              <ZoomIn className="w-5 h-5" />
            </Button>
            <div className="w-px h-6 bg-white/10 self-center mx-2" />
            <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.2))} className="h-10 w-10 rounded-xl text-white hover:bg-white/10">
              <ZoomOut className="w-5 h-5" />
            </Button>
            <div className="w-px h-6 bg-white/10 self-center mx-2" />
            <Button variant="ghost" size="sm" onClick={() => setZoom(0.8)} className="h-10 w-10 rounded-xl text-white hover:bg-white/10">
              <Maximize2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Locked Viewport Container */}
          <div className="w-full h-full overflow-auto cursor-grab active:cursor-grabbing scrollbar-hide bg-slate-950">
            <div className="flex items-center justify-center min-w-max min-h-max p-[200px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center text-indigo-400 gap-6">
                  <div className="w-16 h-16 border-4 border-indigo-900 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="font-black uppercase tracking-widest text-xs">Loading Master Plan...</p>
                </div>
              ) : renderInteractiveMap()}
            </div>
          </div>
        </div>
      </div>

      {/* Info Sidebar */}
      <div className="w-96 flex flex-col gap-6">
        <Card className="p-8 flex-1 flex flex-col bg-white border-2 border-slate-200 rounded-[3rem] shadow-sm relative overflow-hidden">
          {selectedUnit ? (
            <div className="space-y-8 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 leading-none">{selectedUnit.unit_number}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={cn("w-2 h-2 rounded-full", selectedUnit.status === 'available' ? 'bg-emerald-500' : 'bg-rose-500')} />
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{selectedUnit.status}</p>
                  </div>
                </div>
                <div className={cn(
                  "p-4 rounded-3xl text-xs font-black shadow-lg uppercase tracking-widest rotate-3",
                  selectedUnit.status === 'available' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                )}>
                  {selectedUnit.status === 'available' ? 'Tersedia' : 'Terjual'}
                </div>
              </div>

              <div className="aspect-[4/3] bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white overflow-hidden relative shadow-2xl ring-8 ring-slate-50">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm border border-indigo-400/20">
                    <Map className="w-10 h-10 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Unit Detail Preview</span>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 flex justify-between items-center group hover:bg-indigo-50 hover:border-indigo-100 transition-all">
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Harga Jual</p>
                    <p className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{formatCurrency(selectedUnit.price)}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-indigo-400" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Tipe Unit</p>
                    <p className="text-sm font-bold text-slate-800">{selectedUnit.type}</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Blok/Cluster</p>
                    <p className="text-sm font-bold text-slate-800">{selectedUnit.unit_number.split('/')[0]}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                {selectedUnit.status === 'available' && (
                  <Button className="w-full py-5 text-sm font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] rounded-3xl transform transition hover:-translate-y-1">
                    Buat Pesanan Baru
                  </Button>
                )}
                <Button variant="outline" className="w-full py-5 text-sm font-black uppercase tracking-widest border-2 rounded-3xl hover:bg-slate-50">
                  Unduh Spesifikasi PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
              <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center shadow-inner relative">
                <div className="absolute inset-0 bg-indigo-500/5 animate-ping rounded-[2rem]"></div>
                <Info className="w-10 h-10 text-slate-200 relative z-10" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase text-sm tracking-[0.2em] mb-4">Site Plan Explorer</h3>
                <p className="text-xs leading-relaxed text-slate-400 font-bold px-4">
                  Klik pada unit di peta untuk melihat detail spesifikasi, harga, dan ketersediaan stok secara real-time untuk proyek <span className="text-indigo-600">{selectedProject?.name}</span>.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Stats Section */}
        <Card className="p-8 bg-slate-950 text-white border-none shadow-2xl rounded-[3.5rem] relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/20 rounded-full blur-[80px] group-hover:bg-indigo-600/30 transition-all duration-700"></div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Ringkasan Unit</span>
            <div className="px-3 py-1 bg-white/5 rounded-full text-[8px] font-black uppercase border border-white/10 tracking-widest">Live Updates</div>
          </div>
          <div className="grid grid-cols-2 gap-8 relative z-10">
            <div className="space-y-1">
              <p className="text-4xl font-black text-white">{units.filter(u => u.status === 'available').length}</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Available</p>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-4xl font-black text-rose-500">{units.filter(u => u.status === 'sold').length}</p>
              <div className="flex items-center gap-2 justify-end">
                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Sold Out</p>
                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]"></div>
              </div>
            </div>
          </div>
          <div className="mt-8 h-1 bg-white/5 rounded-full overflow-hidden relative z-10">
            <div 
              className="h-full bg-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
              style={{ width: `${(units.filter(u => u.status === 'sold').length / (units.length || 1)) * 100}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Background Site Plan">
        <div className="p-12 text-center border-4 border-dashed border-slate-100 rounded-[4rem] hover:border-indigo-600/30 transition-all cursor-pointer group bg-slate-50/50" onClick={handleUploadImage}>
          <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:scale-110 transition-transform">
            <Upload className="w-10 h-10 text-indigo-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Ganti Gambar Background</h3>
          <p className="text-sm text-slate-500 font-medium px-8 leading-relaxed">Pilih file gambar denah master plan (JPG/PNG). Rekomendasi ukuran minimal 1200x900px untuk hasil terbaik.</p>
        </div>
      </Modal>
    </div>
  );
};

export default SitePlan;
