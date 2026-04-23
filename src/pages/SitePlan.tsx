import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/src/lib/api';
import { Project, Unit } from '@/src/types';
import { 
  Upload, 
  Map as MapIcon, 
  ChevronDown, 
  Image as ImageIcon,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Info
} from 'lucide-react';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { cn } from '@/src/lib/utils';

const SitePlan = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  
  // New States for v2
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const projData = await api.get('projects');
      setProjects(projData || []);
      
      if (projData && projData.length > 0) {
        const firstProjId = projData[0].id;
        setSelectedProjectId(firstProjId);
        const unitData = await api.get('units', `project_id=eq.${firstProjId}`);
        setUnits(unitData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    setLoading(true);
    try {
      const unitData = await api.get('units', `project_id=eq.${projectId}`);
      setUnits(unitData || []);
      setSelectedUnit(null);
    } catch (error) {
      console.error('Error switching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
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
          const updatedProjects = projects.map(p => 
            p.id === selectedProjectId ? { ...p, site_plan_image_url: base64String } : p
          );
          setProjects(updatedProjects);
          setIsUploadModalOpen(false);
        } catch (error: any) {
          alert(`Gagal menyimpan: ${error.message}`);
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

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sold': return '#ef4444';
      case 'booked': return '#f59e0b';
      default: return '#22c55e';
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0c]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-indigo-400 font-black tracking-widest uppercase text-xs">Initializing v2 Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#0a0a0c] overflow-hidden">
      {/* Top Navigation Panel */}
      <div className="h-20 w-full bg-white/5 backdrop-blur-xl border-b border-white/10 px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Project Explorer</span>
            <div className="relative group">
              <select 
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="appearance-none bg-transparent text-white font-black text-xl pr-8 focus:outline-none cursor-pointer"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#1a1a1e] text-white font-bold">{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-widest px-6 h-12 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/20"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Denah Baru
          </Button>
        </div>
      </div>

      {/* Main Interactive Workspace */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8">
        {/* Background Canvas */}
        <div 
          ref={containerRef}
          className="relative w-full h-full flex items-center justify-center bg-[#111114] rounded-[3rem] border-2 border-white/5 shadow-2xl overflow-auto"
        >
          {selectedProject?.site_plan_image_url ? (
            <div className="relative inline-block transition-transform duration-300 ease-out" style={{ transform: `scale(${scale})` }}>
              <img 
                src={selectedProject.site_plan_image_url} 
                alt="Master Plan" 
                className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-sm"
                onLoad={() => console.log('Image Loaded')}
              />
              
              {/* Unit Markers (v2: Coordinate based) */}
              {units.map((unit) => {
                const isRuko = unit.type === 'Ruko';
                const x = unit.sp_x || 0;
                const y = unit.sp_y || 0;
                
                if (x === 0 && y === 0) return null;

                return (
                  <div 
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit)}
                    className={cn(
                      "absolute w-6 h-9 border border-black/40 cursor-pointer transition-all hover:scale-125 hover:z-50 shadow-lg flex items-center justify-center",
                      isRuko ? "bg-white" : ""
                    )}
                    style={{ 
                      left: `${x}px`, 
                      top: `${y}px`, 
                      transform: `rotate(${unit.sp_rotation || 0}deg)`,
                      backgroundColor: isRuko ? 'white' : getStatusColor(unit.status || 'available')
                    }}
                  >
                    <span className={cn("text-[6px] font-black", isRuko ? "text-black" : "text-white")}>
                      {unit.unit_number.split('/')[1] || unit.unit_number}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8 text-center max-w-md">
              <div className="w-32 h-32 bg-indigo-600/10 rounded-[3rem] flex items-center justify-center border-2 border-indigo-500/20">
                <ImageIcon className="w-16 h-16 text-indigo-500" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Site Plan Belum Tersedia</h2>
                <p className="text-slate-500 font-bold leading-relaxed">
                  Silakan upload denah proyek Anda dalam format JPG atau PNG. Denah akan otomatis disesuaikan dengan layar untuk tampilan maksimal.
                </p>
                <Button 
                  onClick={() => setIsUploadModalOpen(true)}
                  variant="outline" 
                  className="border-white/10 text-white font-black uppercase text-xs tracking-widest h-14 px-8 rounded-2xl hover:bg-white/5"
                >
                  Pilih File Sekarang
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Detail Overlay (If unit selected) */}
        {selectedUnit && (
          <div className="absolute right-12 top-12 bottom-12 w-96 bg-[#1a1a1e]/90 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-4xl font-black text-white tracking-tighter mb-2">{selectedUnit.unit_number}</h3>
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  selectedUnit.status === 'sold' ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"
                )}>
                  Unit {selectedUnit.status || 'Available'}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedUnit(null)}
                className="text-white/40 hover:text-white hover:bg-white/5 rounded-full"
              >
                <ChevronDown className="w-6 h-6 rotate-90" />
              </Button>
            </div>

            <div className="space-y-8">
              <div className="aspect-video bg-white/5 rounded-[2rem] border border-white/5 flex items-center justify-center overflow-hidden">
                <ImageIcon className="w-10 h-10 text-white/10" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Luas Tanah</span>
                  <span className="text-white font-black">72 m²</span>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Luas Bangunan</span>
                  <span className="text-white font-black">36 m²</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Spesifikasi Teknis</h4>
                {[
                  { label: 'Pondasi', value: 'Batu Kali' },
                  { label: 'Dinding', value: 'Bata Ringan / Plester' },
                  { label: 'Lantai', value: 'Granit 60x60' },
                  { label: 'Atap', value: 'Rangka Baja Ringan' }
                ].map((spec, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400 font-bold">{spec.label}</span>
                    <span className="text-xs text-white font-black">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floating Control Toolbar */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-12 h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center px-6 gap-6 shadow-2xl">
          <div className="flex items-center gap-4 border-r border-white/10 pr-6">
            <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="text-white/60 hover:text-indigo-400 transition-colors"><ZoomIn className="w-5 h-5" /></button>
            <span className="text-white font-black text-[10px] w-12 text-center tracking-widest">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="text-white/60 hover:text-indigo-400 transition-colors"><ZoomOut className="w-5 h-5" /></button>
          </div>
          <button onClick={() => setScale(1)} className="text-white/60 hover:text-indigo-400 transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Reset View</span>
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Site Plan">
        <div className="p-12 text-center border-4 border-dashed border-white/10 rounded-[4rem] hover:border-indigo-600/30 transition-all cursor-pointer group bg-white/5 relative">
          <input 
            type="file" 
            accept="image/*"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-6 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-black text-white mb-2">Pilih File Site Plan</h3>
          <p className="text-xs text-slate-500 font-medium px-8 leading-relaxed">
            Format JPG atau PNG. Ukuran gambar akan otomatis disesuaikan secara maksimal di layar.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SitePlan;
