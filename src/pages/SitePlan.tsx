import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Project, Unit } from '@/types';
import { 
  ChevronDown, 
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  X,
  Upload,
  Lock,
  Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

// Hardcoded Mapping Data for Golden Canyon
// This follows the 762x600 coordinate system requested by the user
// Hardcoded Mapping Data for Golden Canyon
// This follows the 1270x800 high-fidelity coordinate system
const GOLDEN_CANYON_MAP = [
  // Blok N — diagonal kiri atas (N-01 s/d N-10)
  { id: 'N-01', x: 168, y: 560, w: 54, h: 34, r: -22 },
  { id: 'N-02', x: 214, y: 536, w: 54, h: 34, r: -22 },
  { id: 'N-03', x: 260, y: 511, w: 54, h: 34, r: -22 },
  { id: 'N-04', x: 306, y: 486, w: 54, h: 34, r: -22 },
  { id: 'N-05', x: 352, y: 461, w: 54, h: 34, r: -22 },
  { id: 'N-06', x: 398, y: 436, w: 54, h: 34, r: -22 },
  { id: 'N-07', x: 444, y: 411, w: 54, h: 34, r: -22 },
  { id: 'N-08', x: 490, y: 386, w: 54, h: 34, r: -22 },
  { id: 'N-09', x: 536, y: 361, w: 54, h: 34, r: -22 },
  { id: 'N-10', x: 582, y: 336, w: 54, h: 34, r: -22 },
  // Blok N — diagonal kiri bawah (N-11 s/d N-20)
  { id: 'N-11', x: 138, y: 608, w: 54, h: 34, r: -28 },
  { id: 'N-12', x: 185, y: 636, w: 54, h: 34, r: -28 },
  { id: 'N-13', x: 232, y: 660, w: 54, h: 34, r: -26 },
  { id: 'N-14', x: 280, y: 680, w: 54, h: 34, r: -24 },
  { id: 'N-15', x: 330, y: 695, w: 54, h: 34, r: -22 },
  { id: 'N-16', x: 380, y: 708, w: 54, h: 34, r: -20 },
  { id: 'N-17', x: 432, y: 716, w: 54, h: 34, r: -17 },
  { id: 'N-18', x: 484, y: 720, w: 54, h: 34, r: -14 },
  { id: 'N-19', x: 536, y: 720, w: 54, h: 34, r: -11 },
  { id: 'N-20', x: 588, y: 716, w: 54, h: 34, r: -8 },
  // Blok E — vertikal kanan atas
  { id: 'E-01', x: 698, y: 178, w: 52, h: 36, r: 0 },
  { id: 'E-02', x: 698, y: 218, w: 52, h: 36, r: 0 },
  { id: 'E-03', x: 698, y: 258, w: 52, h: 36, r: 0 },
  { id: 'E-04', x: 698, y: 298, w: 52, h: 36, r: 0 },
  { id: 'E-05', x: 754, y: 178, w: 52, h: 36, r: 0 },
  { id: 'E-06', x: 754, y: 218, w: 52, h: 36, r: 0 },
  { id: 'E-07', x: 754, y: 258, w: 52, h: 36, r: 0 },
  { id: 'E-08', x: 754, y: 298, w: 52, h: 36, r: 0 },
  // Blok E — vertikal kanan tengah
  { id: 'E-09', x: 698, y: 368, w: 52, h: 36, r: 0 },
  { id: 'E-10', x: 698, y: 408, w: 52, h: 36, r: 0 },
  { id: 'E-11', x: 698, y: 448, w: 52, h: 36, r: 0 },
  { id: 'E-12', x: 698, y: 488, w: 52, h: 36, r: 0 },
  { id: 'E-13', x: 754, y: 368, w: 52, h: 36, r: 0 },
  { id: 'E-14', x: 754, y: 408, w: 52, h: 36, r: 0 },
  { id: 'E-15', x: 754, y: 448, w: 52, h: 36, r: 0 },
  { id: 'E-16', x: 754, y: 488, w: 52, h: 36, r: 0 },
  // Blok GC — horizontal tengah
  { id: 'GC-01', x: 356, y: 480, w: 46, h: 32, r: 0 },
  { id: 'GC-02', x: 406, y: 480, w: 46, h: 32, r: 0 },
  { id: 'GC-03', x: 456, y: 480, w: 46, h: 32, r: 0 },
  { id: 'GC-04', x: 506, y: 480, w: 46, h: 32, r: 0 },
  { id: 'GC-05', x: 556, y: 480, w: 46, h: 32, r: 0 },
  { id: 'GC-06', x: 606, y: 480, w: 46, h: 32, r: 0 },
  { id: 'GC-07', x: 656, y: 480, w: 46, h: 32, r: 0 },
  { id: 'GC-08', x: 356, y: 516, w: 46, h: 32, r: 0 },
  { id: 'GC-09', x: 406, y: 516, w: 46, h: 32, r: 0 },
  { id: 'GC-10', x: 456, y: 516, w: 46, h: 32, r: 0 },
  { id: 'GC-11', x: 506, y: 516, w: 46, h: 32, r: 0 },
  { id: 'GC-12', x: 556, y: 516, w: 46, h: 32, r: 0 },
  { id: 'GC-13', x: 606, y: 516, w: 46, h: 32, r: 0 },
  { id: 'GC-14', x: 656, y: 516, w: 46, h: 32, r: 0 },
];

const SitePlan = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [dbUnits, setDbUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [scale, setScale] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [imgDims, setImgDims] = useState({ w: 1270, h: 800 });
  
  // Panning & Locking States
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLocked, setIsLocked] = useState(true);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const projData = await api.get('projects');
      setProjects(projData || []);
      
      if (projData && projData.length > 0) {
        // Find Golden Canyon or default to first
        const gcProj = projData.find((p: Project) => p.name.toLowerCase().includes('golden canyon')) || projData[0];
        setSelectedProjectId(gcProj.id);
        const unitData = await api.get('units', `project_id=eq.${gcProj.id}`);
        setDbUnits(unitData || []);
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
    setOffset({ x: 0, y: 0 }); // Reset position on project change
    try {
      const unitData = await api.get('units', `project_id=eq.${projectId}`);
      setDbUnits(unitData || []);
      setSelectedUnit(null);
    } catch (error) {
      console.error('Error switching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isLocked) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
          alert('Site plan berhasil diupload!');
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

  useEffect(() => {
    if (selectedProject?.site_plan_image_url) {
      const img = new Image();
      img.onload = () => {
        setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = selectedProject.site_plan_image_url;
    }
  }, [selectedProject?.site_plan_image_url]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sold': return '#ef4444'; // Red
      case 'booked': return '#f59e0b'; // Yellow
      default: return '#22c55e'; // Green
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0c]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-indigo-400 font-black tracking-widest uppercase text-xs">Loading SVG Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#0a0a0c] overflow-hidden">
      {/* Top Header Panel */}
      <div className="h-20 w-full bg-[#111114]/80 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Active Project</span>
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
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setIsLocked(!isLocked)}
            className={cn(
              "font-black uppercase text-[10px] tracking-widest px-6 h-11 rounded-2xl transition-all",
              isLocked ? "bg-slate-800 text-slate-400 border border-white/5" : "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
            )}
          >
            {isLocked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
            {isLocked ? 'Locked' : 'Unlocked (Draggable)'}
          </Button>
          
          <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/5">
             <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="p-2 text-white/40 hover:text-white transition-colors"><ZoomOut className="w-5 h-5" /></button>
             <span className="px-4 text-white font-black text-xs min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
             <button onClick={() => setScale(s => Math.min(s + 0.2, 3))} className="p-2 text-white/40 hover:text-white transition-colors"><ZoomIn className="w-5 h-5" /></button>
          </div>
          
          <Button 
            onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} 
            className="border-white/10 text-white font-black uppercase text-[10px] tracking-widest h-11 px-4 rounded-2xl"
            variant="outline"
          >
             Reset View
          </Button>
          
          <Button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-2xl shadow-lg shadow-indigo-600/20"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Denah
          </Button>
        </div>
      </div>

      {/* Main Map Area */}
      <div 
        className="flex-1 relative overflow-hidden bg-[#0a0a0c] flex items-center justify-center p-4 select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {selectedProject?.site_plan_image_url ? (
          <div 
            key={selectedProject.site_plan_image_url}
            className={cn(
              "relative transition-transform duration-300 w-full h-full flex items-center justify-center",
              !isLocked && (isDragging ? "cursor-grabbing" : "cursor-grab")
            )}
            style={{ 
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
          >
            <svg 
              viewBox={`0 0 1270 800`} 
              className="max-w-full max-h-full shadow-2xl rounded-xl overflow-hidden bg-[#111114]"
              preserveAspectRatio="xMidYMid meet"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              {/* Background Image Tracing Reference */}
              <image 
                href={selectedProject.site_plan_image_url} 
                xlinkHref={selectedProject.site_plan_image_url}
                width="1270" 
                height="800" 
                className="opacity-100"
                preserveAspectRatio="xMidYMid slice"
              />

              {/* Hardcoded Unit Shapes */}
              {GOLDEN_CANYON_MAP.map((mapUnit) => {
                const dbUnit = dbUnits.find(u => u.unit_number === mapUnit.id);
                const status = dbUnit?.status || 'available';
                const color = getStatusColor(status);
                const isSelected = selectedUnit?.unit_number === mapUnit.id;

                return (
                  <g 
                    key={mapUnit.id} 
                    className="cursor-pointer group"
                    onClick={() => dbUnit && setSelectedUnit(dbUnit)}
                  >
                    <rect 
                      x={mapUnit.x - mapUnit.w / 2}
                      y={mapUnit.y - mapUnit.h / 2}
                      width={mapUnit.w}
                      height={mapUnit.h}
                      transform={`rotate(${mapUnit.r}, ${mapUnit.x}, ${mapUnit.y})`}
                      fill={color}
                      fillOpacity={isSelected ? 0.3 : 0.15}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 1}
                      className="transition-all duration-300 group-hover:fill-opacity-40"
                    />
                    <text 
                      x={mapUnit.x}
                      y={mapUnit.y}
                      transform={`rotate(${mapUnit.r}, ${mapUnit.x}, ${mapUnit.y})`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[6px] font-black pointer-events-none select-none fill-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {mapUnit.id.split('-')[1] || mapUnit.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 text-center">
             <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10">
                <ImageIcon className="w-10 h-10 text-white/20" />
             </div>
             <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Denah belum tersedia</p>
             <Button 
                onClick={() => setIsUploadModalOpen(true)}
                variant="outline"
                className="border-white/10 text-white font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-2xl"
             >
                Upload Sekarang
             </Button>
          </div>
        )}

        {/* Info Sidebar Overlay (Keep as is) */}
        {selectedUnit && (
          // ... (existing sidebar code)
          <div className="absolute right-8 top-8 bottom-8 w-[400px] bg-[#111114]/90 backdrop-blur-2xl border border-white/5 rounded-[3rem] shadow-3xl p-10 flex flex-col animate-in slide-in-from-right duration-500 z-50">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-5xl font-black text-white tracking-tighter mb-3">{selectedUnit.unit_number}</h3>
                <div className={cn(
                  "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] inline-block",
                  selectedUnit.status === 'sold' ? "bg-red-500/20 text-red-500" : 
                  selectedUnit.status === 'booked' ? "bg-amber-500/20 text-amber-500" : 
                  "bg-green-500/20 text-green-500"
                )}>
                  {selectedUnit.status || 'Available'}
                </div>
              </div>
              <button 
                onClick={() => setSelectedUnit(null)}
                className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 space-y-10 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-4">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Price & Details</span>
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                   <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Base Price</span>
                      <span className="text-3xl font-black text-white tracking-tight">Rp {(selectedUnit.price || 0).toLocaleString('id-ID')}</span>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex flex-col gap-1">
                   <span className="text-[10px] font-black text-slate-500 uppercase">Luas Tanah</span>
                   <span className="text-xl font-black text-white">72 m²</span>
                </div>
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex flex-col gap-1">
                   <span className="text-[10px] font-black text-slate-500 uppercase">Luas Bangunan</span>
                   <span className="text-xl font-black text-white">36 m²</span>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Specifications</h4>
                <div className="space-y-4">
                   {[
                     { l: 'Pondasi', v: 'Batu Kali' },
                     { l: 'Dinding', v: 'Bata Ringan' },
                     { l: 'Lantai', v: 'Granit 60x60' },
                     { l: 'Plafon', v: 'Gypsum' }
                   ].map((s, i) => (
                     <div key={i} className="flex justify-between items-center py-3 border-b border-white/5">
                        <span className="text-xs text-slate-400 font-bold">{s.l}</span>
                        <span className="text-xs text-white font-black">{s.v}</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="mt-10">
               <Button className="w-full h-16 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20">
                  Contact Sales Agent
               </Button>
            </div>
          </div>
        )}
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
            Format JPG atau PNG. Gambar akan otomatis menjadi background denah.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SitePlan;
