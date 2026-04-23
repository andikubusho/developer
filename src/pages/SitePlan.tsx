import React, { useState, useEffect } from 'react';
import { Map, Upload, Printer, ArrowLeft, Trash2, Download, ZoomIn, ZoomOut, Maximize2, Info, ChevronRight, Image as ImageIcon, LayoutGrid, X, Building2, Ruler, Lightbulb, Droplet } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { MarketingDocument, Unit, Project } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

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
  const [activeTab, setActiveTab] = useState<'info' | 'specs' | 'denah'>('info');

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar (JPG/PNG)');
      return;
    }

    try {
      setLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          await api.update('projects', selectedProjectId, { site_plan_image_url: base64String });
          await fetchInitialData();
          setIsUploadModalOpen(false);
        } catch (error: any) {
          alert(`Gagal menyimpan gambar: ${error.message}`);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      alert(`Gagal membaca file: ${error.message}`);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981'; // Emerald
      case 'booked': return '#F59E0B';    // Amber
      case 'sold': return '#EF4444';      // Red
      default: return '#94A3B8';           // Slate
    }
  };

  const renderInteractiveMap = () => {
    return (
      <div className="relative inline-block origin-top-left transition-transform duration-300" style={{ transform: `scale(${zoom})` }}>
        {selectedProject?.site_plan_image_url ? (
          <img 
            src={selectedProject.site_plan_image_url} 
            alt="Site Plan Map" 
            className="max-w-none"
            style={{ width: `${VIEWPORT_WIDTH}px`, height: `${VIEWPORT_HEIGHT}px`, objectFit: 'contain' }}
          />
        ) : (
          <div className="bg-slate-900 rounded-[3rem] flex flex-col items-center justify-center gap-6 border-4 border-dashed border-white/5" style={{ width: `${VIEWPORT_WIDTH}px`, height: `${VIEWPORT_HEIGHT}px` }}>
            <div className="w-24 h-24 bg-indigo-600/10 rounded-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-indigo-500" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-black uppercase tracking-[0.3em]">Master Plan Belum Di-upload</p>
              <p className="text-slate-500 text-xs font-bold px-12">Silakan klik tombol "Upload BG" di atas dan masukkan URL gambar denah hitam putih Anda.</p>
            </div>
          </div>
        )}

        <div className="absolute inset-0">
          {units.map((unit: any) => {
            const hasCoords = unit.sp_x !== null && unit.sp_y !== null;
            if (!hasCoords) return null;

            const num = unit.unit_number ? (unit.unit_number.split('/')[1] || unit.unit_number) : '?';

            const isRuko = unit.type === 'Ruko';

            return (
              <div 
                key={unit.id}
                onClick={() => { setSelectedUnit(unit); setActiveTab('info'); }}
                className={cn(
                  "absolute w-8 h-11 border-2 border-black/40 cursor-pointer transition-all hover:brightness-110 hover:z-50 shadow-md flex items-center justify-center overflow-hidden",
                  isRuko ? "bg-white" : "",
                  unit.status === 'sold' ? "ring-1 ring-red-600/50" : "hover:ring-2 hover:ring-white"
                )}
                style={{ 
                  left: `${unit.sp_x}px`, 
                  top: `${unit.sp_y}px`, 
                  transform: `rotate(${unit.sp_rotation || 0}deg)`,
                  backgroundColor: isRuko ? 'white' : getStatusColor(unit.status)
                }}
              >
                {/* Always Show Unit Number Label */}
                <div className={cn("text-[7px] font-black drop-shadow-md select-none", isRuko ? "text-slate-900" : "text-white")}>
                   {num}
                </div>

                {/* Status Overlay for Sold/Booked */}
                {unit.status !== 'available' && (
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center uppercase text-[6px] font-black tracking-tighter mix-blend-overlay opacity-40",
                    isRuko ? "text-red-600 opacity-100 mix-blend-normal bg-red-50/20" : ""
                  )}>
                    {unit.status === 'sold' ? 'SOLD' : 'BKD'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 overflow-hidden">
      {/* Main Map View */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Header - Clean Navigation */}
        <div className="flex items-center justify-between bg-slate-900 p-5 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="h-10 w-10 rounded-full text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="h-8 w-px bg-white/10" />
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent border-none text-lg font-black text-white focus:ring-0 p-0 cursor-pointer"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex bg-slate-800 p-1 rounded-2xl border border-white/5">
              <button 
                onClick={() => setViewMode('interactive')}
                className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", viewMode === 'interactive' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
              >
                Peta
              </button>
              <button 
                onClick={() => setViewMode('documents')}
                className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", viewMode === 'documents' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
              >
                Berkas
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(true)} className="rounded-2xl border-white/10 text-white hover:bg-white/5 font-black text-[10px] uppercase tracking-widest">
              <Upload className="w-4 h-4 mr-2" /> Upload BG
            </Button>
          </div>
        </div>

        {/* Map Canvas - Locked & Clean */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden shadow-2xl group/canvas border-[12px] border-slate-900 rounded-[3.5rem]">
          {/* Legend */}
          <div className="absolute bottom-8 left-8 bg-slate-900/90 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl z-20">
            <div className="flex gap-6">
              {[
                { name: 'Tersedia', color: '#10B981' },
                { name: 'Booked', color: '#F59E0B' },
                { name: 'Terjual', color: '#EF4444' }
              ].map(l => (
                <div key={l.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{l.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="absolute top-8 left-8 flex bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-2xl z-20">
            <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.min(prev + 0.1, 2.5))} className="h-10 w-10 rounded-xl text-white hover:bg-white/10"><ZoomIn className="w-5 h-5" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.2))} className="h-10 w-10 rounded-xl text-white hover:bg-white/10"><ZoomOut className="w-5 h-5" /></Button>
            <div className="w-px h-6 bg-white/10 self-center mx-2" />
            <Button variant="ghost" size="sm" onClick={() => setZoom(0.8)} className="h-10 w-10 rounded-xl text-white hover:bg-white/10"><Maximize2 className="w-5 h-5" /></Button>
          </div>

          <div className="w-full h-full overflow-auto cursor-grab active:cursor-grabbing scrollbar-hide bg-slate-950">
            <div className="flex items-center justify-center min-w-max min-h-max p-[200px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center text-indigo-500 gap-6">
                  <div className="w-16 h-16 border-4 border-indigo-900 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="font-black uppercase tracking-widest text-[10px]">Loading Master Plan...</p>
                </div>
              ) : renderInteractiveMap()}
            </div>
          </div>
        </div>
      </div>

      {/* Sikumbang Style Sidebar - High Detail */}
      <div className="w-[450px] flex flex-col gap-6">
        <Card className="flex-1 flex flex-col bg-slate-900 border border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden">
          {selectedUnit ? (
            <div className="flex flex-col h-full">
              {/* Top Banner / Image (Tampak Depan) */}
              <div className="relative h-48 bg-slate-800">
                <img 
                  src={`https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600&text=Unit+${selectedUnit.unit_number}`} 
                  alt="Unit View" 
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                <div className="absolute top-4 right-4">
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl",
                    selectedUnit.status === 'available' ? "bg-emerald-500 text-white" :
                    selectedUnit.status === 'booked' ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
                  )}>
                    {selectedUnit.status}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUnit(null)} 
                  className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sidebar Header Content */}
              <div className="px-8 pt-6 pb-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-3xl font-black text-white leading-none tracking-tighter">{selectedUnit.unit_number}</h3>
                  <span className="text-xl font-black text-indigo-400">{formatCurrency(selectedUnit.price)}</span>
                </div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">ID: {selectedUnit.id.split('-')[0].toUpperCase()}</p>
              </div>

              {/* Unified Scrollable Detail Content */}
              <div className="flex-1 overflow-auto p-8 scrollbar-hide space-y-8">
                {/* House Preview Section */}
                <div className="space-y-4">
                  <div className="aspect-video bg-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-white/5">
                    <img 
                      src={`https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600`} 
                      alt="Tampak Depan" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl text-[8px] font-black uppercase text-white tracking-widest border border-white/10">
                      Tampak Depan
                    </div>
                  </div>
                  
                  <div className="aspect-[4/3] bg-white rounded-[2.5rem] overflow-hidden shadow-xl flex items-center justify-center p-6 border border-white/5">
                    <img 
                      src={`https://placehold.co/600x400/ffffff/6366f1?text=Denah+Type+${selectedUnit.type}`} 
                      alt="Denah Rumah" 
                      className="max-w-full max-h-full object-contain"
                    />
                    <div className="absolute bottom-4 right-4 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-2xl text-[8px] font-black uppercase text-white tracking-widest border border-white/10">
                      Denah Ruang
                    </div>
                  </div>
                </div>

                {/* Key Specifications Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/5 transition-all hover:bg-white/10">
                    <Ruler className="w-5 h-5 text-indigo-400 mb-3" />
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Luas Tanah</p>
                    <p className="text-sm font-black text-white">120 m²</p>
                  </div>
                  <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/5 transition-all hover:bg-white/10">
                    <Building2 className="w-5 h-5 text-indigo-400 mb-3" />
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Luas Bangunan</p>
                    <p className="text-sm font-black text-white">45 m²</p>
                  </div>
                </div>

                {/* Technical Materials List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.3em]">Material Teknis</h4>
                    <div className="h-px flex-1 bg-white/5 ml-4" />
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Struktur', value: 'Beton Bertulang' },
                      { label: 'Pondasi', value: 'Batu Kali' },
                      { label: 'Dinding', value: 'Batu Bata, Plester, Aci' },
                      { label: 'Lantai', value: 'Granit 60x60' },
                      { label: 'Atap', value: 'Baja Ringan & Genteng Metal' },
                      { label: 'Plafon', value: 'Gypsum Rangka Hollow' },
                      { label: 'Sanitasi', value: 'Closet Duduk & Shower' },
                    ].map((spec, i) => (
                      <div key={i} className="flex justify-between p-5 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/[0.08] transition-all">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{spec.label}</span>
                        <span className="text-[11px] text-white font-black">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl transition-all group-hover:scale-150" />
                  <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mb-2 relative z-10">Harga Penawaran</p>
                  <p className="text-3xl font-black text-white tracking-tighter relative z-10">{formatCurrency(selectedUnit.price)}</p>
                  <div className="mt-6 flex items-center gap-2 text-[9px] font-black text-indigo-200 uppercase tracking-widest relative z-10">
                    <Info className="w-3 h-3" /> Termasuk PPN & Balik Nama
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-8 pt-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md">
                {selectedUnit.status === 'available' ? (
                  <Button className="w-full py-6 text-sm font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] rounded-[2rem] transform transition hover:-translate-y-1 active:scale-95">
                    Pesan Unit Sekarang <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <div className="w-full py-6 text-center bg-white/5 rounded-[2rem] border border-white/10">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status: Unit {selectedUnit.status}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 p-12">
              <div className="w-24 h-24 bg-indigo-600/10 rounded-[2.5rem] flex items-center justify-center relative">
                <Map className="w-10 h-10 text-indigo-400" />
                <div className="absolute inset-0 bg-indigo-500/5 animate-ping rounded-[2.5rem]" />
              </div>
              <div>
                <h3 className="font-black text-white uppercase text-sm tracking-[0.3em] mb-4">Sikumbang Explorer</h3>
                <p className="text-xs leading-relaxed text-slate-500 font-bold px-6">
                  Silakan pilih salah satu kavling pada peta untuk melihat spesifikasi teknis dan rincian harga unit secara detail.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Konfigurasi Master Plan">
        <div className="p-12 text-center border-4 border-dashed border-white/10 rounded-[4rem] hover:border-indigo-600/30 transition-all cursor-pointer group bg-white/5 relative">
          <input 
            type="file" 
            accept="image/*"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-6 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-black text-white mb-2">Upload Screenshot Denah</h3>
          <p className="text-xs text-slate-500 font-medium px-8 leading-relaxed">Pilih file gambar denah (JPG/PNG). Denah akan otomatis terpasang sebagai latar belakang.</p>
        </div>
      </Modal>
    </div>
  );
};

export default SitePlan;
