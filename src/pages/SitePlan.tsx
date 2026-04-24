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
  Unlock,
  Info,
  Maximize2,
  MousePointer2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const VIEWBOX = { w: 1270, h: 800 };

// Hardcoded Mapping Data for Golden Canyon
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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLocked, setIsLocked] = useState(true);

  // Stats calculation
  const stats = {
    total: GOLDEN_CANYON_MAP.length,
    available: dbUnits.filter(u => u.status === 'available').length,
    booked: dbUnits.filter(u => u.status === 'booked').length,
    sold: dbUnits.filter(u => u.status === 'sold').length,
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const projData = await api.get('projects');
      setProjects(projData || []);
      
      if (projData && projData.length > 0) {
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
    setOffset({ x: 0, y: 0 });
    setScale(1);
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

  const handleMouseUp = () => setIsDragging(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await api.update('projects', selectedProjectId, { site_plan_image_url: base64String });
        const updatedProjects = projects.map(p => p.id === selectedProjectId ? { ...p, site_plan_image_url: base64String } : p);
        setProjects(updatedProjects);
        setIsUploadModalOpen(false);
        alert('Site plan berhasil diupload!');
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      alert(`Gagal: ${error.message}`);
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
      <div className="h-screen w-full flex items-center justify-center bg-[#f8fafc]">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#f1f5f9] overflow-hidden font-sans">
      {/* Top Professional Header */}
      <div className="h-20 w-full bg-white border-b border-slate-200 px-8 flex items-center justify-between z-50 shadow-sm">
        <div className="flex items-center gap-8">
           <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Active</span>
              <select 
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="bg-transparent text-slate-900 font-black text-lg focus:outline-none cursor-pointer"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
           </div>
           
           <div className="h-10 w-[1px] bg-slate-200" />
           
           <div className="flex items-center gap-4">
              <StatBadge label="Total" value={stats.total} color="bg-slate-100 text-slate-600" />
              <StatBadge label="Tersedia" value={stats.available} color="bg-emerald-50 text-emerald-600 border border-emerald-100" />
              <StatBadge label="Booking" value={stats.booked} color="bg-amber-50 text-amber-600 border border-amber-100" />
              <StatBadge label="Terjual" value={stats.sold} color="bg-rose-50 text-rose-600 border border-rose-100" />
           </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsLocked(!isLocked)}
            className={cn(
              "font-bold uppercase text-[10px] tracking-widest px-6 h-10 rounded-xl transition-all",
              isLocked ? "bg-slate-100 text-slate-500 border border-slate-200" : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
            )}
          >
            {isLocked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
            {isLocked ? 'Locked' : 'Unlocked'}
          </Button>

          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
             <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><ZoomOut className="w-4 h-4" /></button>
             <span className="px-3 text-slate-900 font-bold text-xs min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
             <button onClick={() => setScale(s => Math.min(s + 0.2, 3))} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><ZoomIn className="w-4 h-4" /></button>
          </div>

          <Button 
            onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} 
            className="border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-widest h-10 px-4 rounded-xl"
            variant="outline"
          >
             Reset
          </Button>

          <Button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-bold uppercase text-[10px] tracking-widest h-10 px-4 rounded-xl"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Area */}
        <div 
          className="flex-1 relative overflow-hidden flex items-center justify-center p-8 select-none"
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
                transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0, 0.2, 1)'
              }}
            >
              <div className="relative shadow-2xl rounded-2xl overflow-hidden bg-white border border-slate-200">
                <svg 
                  viewBox={`0 0 1270 800`} 
                  className="w-full h-auto block"
                  style={{ width: '1270px', maxWidth: 'none' }}
                >
                  <image 
                    href={selectedProject.site_plan_image_url} 
                    width="1270" height="800" 
                    preserveAspectRatio="xMidYMid slice"
                  />

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
                          rx={4}
                          transform={`rotate(${mapUnit.r}, ${mapUnit.x}, ${mapUnit.y})`}
                          fill={color}
                          fillOpacity={isSelected ? 0.4 : 0.15}
                          stroke={isSelected ? "#2563eb" : color}
                          strokeWidth={isSelected ? 3 : 1.5}
                          className="transition-all duration-300 group-hover:fill-opacity-30"
                        />
                        <text 
                          x={mapUnit.x}
                          y={mapUnit.y}
                          transform={`rotate(${mapUnit.r}, ${mapUnit.x}, ${mapUnit.y})`}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[8px] font-black pointer-events-none select-none fill-slate-800 drop-shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {mapUnit.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-slate-400">
               <ImageIcon className="w-16 h-16 opacity-20" />
               <p className="font-bold text-sm tracking-widest uppercase">No site plan uploaded</p>
            </div>
          )}
        </div>

        {/* Sidebar Info - Modern Right Panel */}
        <div className={cn(
          "w-96 bg-white border-l border-slate-200 flex flex-col transition-transform duration-500 shadow-2xl z-40",
          selectedUnit ? "translate-x-0" : "translate-x-full absolute right-0"
        )}>
          {selectedUnit && (
            <>
              <div className="p-8 border-b border-slate-100 flex justify-between items-start">
                 <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{selectedUnit.unit_number}</h2>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block",
                      selectedUnit.status === 'sold' ? "bg-rose-50 text-rose-600" : 
                      selectedUnit.status === 'booked' ? "bg-amber-50 text-amber-600" : 
                      "bg-emerald-50 text-emerald-600"
                    )}>
                      {selectedUnit.status?.toUpperCase() || 'AVAILABLE'}
                    </div>
                 </div>
                 <button onClick={() => setSelectedUnit(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-300 hover:text-slate-900" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                 <section className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pricing</h4>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                       <span className="text-[10px] text-slate-400 block mb-1">Cash Price</span>
                       <span className="text-3xl font-black text-indigo-600">Rp {(selectedUnit.price || 0).toLocaleString('id-ID')}</span>
                    </div>
                 </section>

                 <section className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <span className="text-[10px] text-slate-400 block mb-1">Land Area</span>
                       <span className="text-lg font-black text-slate-900">72 m²</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <span className="text-[10px] text-slate-400 block mb-1">Building</span>
                       <span className="text-lg font-black text-slate-900">36 m²</span>
                    </div>
                 </section>

                 <section className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Specifications</h4>
                    <div className="space-y-3">
                       {[
                         { l: 'Structure', v: 'Reinforced Concrete' },
                         { l: 'Walls', v: 'Red Brick (Plastered)' },
                         { l: 'Roof', v: 'Light Steel Frame' },
                         { l: 'Electricity', v: '1300 Watt' }
                       ].map((item, i) => (
                         <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-xs text-slate-500">{item.l}</span>
                            <span className="text-xs font-bold text-slate-900">{item.v}</span>
                         </div>
                       ))}
                    </div>
                 </section>
              </div>

              <div className="p-8 border-t border-slate-100">
                 <Button className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-slate-900/10">
                    Process Transaction
                 </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Site Plan Image">
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-[2rem] hover:border-indigo-500/50 transition-all cursor-pointer bg-slate-50 relative group">
          <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-4 group-hover:scale-110 transition-transform">
             <Upload className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Select Image File</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">Best resolution: 1270 x 800px or larger</p>
        </div>
      </Modal>
    </div>
  );
};

const StatBadge = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className={cn("px-4 py-2 rounded-xl flex items-center gap-2", color)}>
     <span className="text-xs font-bold">{value}</span>
     <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</span>
  </div>
);

export default SitePlan;
