import React, { useState, useEffect, useRef } from 'react'; // v2.1.0 (Flexible Arrangement)
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
  Info,
  Lock,
  Unlock,
  Save,
  RotateCcw,
  X
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
  
  // States for Arrangement Engine
  const [scale, setScale] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedUnits, setEditedUnits] = useState<Record<string, { sp_x: number; sp_y: number; sp_rotation: number; sp_width: number; sp_height: number }>>({});
  const [draggedUnitId, setDraggedUnitId] = useState<string | null>(null);
  const [resizingUnitId, setResizingUnitId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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
    setIsEditMode(false);
    setEditedUnits({});
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

  const calculateCoords = (clientX: number, clientY: number) => {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    
    // Calculate percentage relative to the image
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;

    // Clamping 0-100%
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    return { x, y };
  };

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent, unitId: string) => {
    if (!isEditMode || resizingUnitId) return;
    e.stopPropagation();
    setDraggedUnitId(unitId);
  };

  const handleStartResize = (e: React.MouseEvent | React.TouchEvent, unitId: string) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setResizingUnitId(unitId);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditMode) return;
    if (!draggedUnitId && !resizingUnitId) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const coords = calculateCoords(clientX, clientY);
    if (!coords) return;

    if (draggedUnitId) {
      const currentUnit = units.find(u => u.id === draggedUnitId);
      const currentEdit = editedUnits[draggedUnitId] || { 
        sp_x: currentUnit?.sp_x || 0, 
        sp_y: currentUnit?.sp_y || 0,
        sp_rotation: currentUnit?.sp_rotation || 0,
        sp_width: currentUnit?.sp_width || 2,
        sp_height: currentUnit?.sp_height || 3
      };

      setEditedUnits({
        ...editedUnits,
        [draggedUnitId]: { ...currentEdit, sp_x: coords.x, sp_y: coords.y }
      });
    } else if (resizingUnitId) {
      const currentUnit = units.find(u => u.id === resizingUnitId);
      const currentEdit = editedUnits[resizingUnitId] || { 
        sp_x: currentUnit?.sp_x || 0, 
        sp_y: currentUnit?.sp_y || 0,
        sp_rotation: currentUnit?.sp_rotation || 0,
        sp_width: currentUnit?.sp_width || 2,
        sp_height: currentUnit?.sp_height || 3
      };

      // Width and Height are calculated as distance from current X,Y
      const newWidth = Math.max(0.5, Math.abs(coords.x - currentEdit.sp_x) * 2);
      const newHeight = Math.max(0.5, Math.abs(coords.y - currentEdit.sp_y) * 2);

      setEditedUnits({
        ...editedUnits,
        [resizingUnitId]: { ...currentEdit, sp_width: newWidth, sp_height: newHeight }
      });
    }
  };

  const handleEndAction = () => {
    setDraggedUnitId(null);
    setResizingUnitId(null);
  };

  const handleRotate = (unitId: string) => {
    if (!isEditMode) return;
    const currentUnit = units.find(u => u.id === unitId);
    const currentEdit = editedUnits[unitId] || { 
      sp_x: currentUnit?.sp_x || 0, 
      sp_y: currentUnit?.sp_y || 0,
      sp_rotation: currentUnit?.sp_rotation || 0,
      sp_width: currentUnit?.sp_width || 2,
      sp_height: currentUnit?.sp_height || 3
    };

    setEditedUnits({
      ...editedUnits,
      [unitId]: {
        ...currentEdit,
        sp_rotation: (currentEdit.sp_rotation + 45) % 360
      }
    });
  };

  const handleSaveLayout = async () => {
    try {
      setLoading(true);
      const promises = Object.entries(editedUnits).map(([id, data]) => 
        api.update('units', id, data)
      );
      
      await Promise.all(promises);
      
      // Update local state
      const updatedUnits = units.map(u => 
        editedUnits[u.id] ? { ...u, ...editedUnits[u.id] } : u
      );
      setUnits(updatedUnits);
      setEditedUnits({});
      setIsEditMode(false);
      alert('Layout berhasil disimpan!');
    } catch (error: any) {
      alert(`Gagal menyimpan layout: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const getStatusColor = (status: string, isEdit: boolean = false) => {
    const opacity = isEdit ? '66' : 'FF'; // 40% opacity in hex is approx 66
    switch (status) {
      case 'sold': return `#ef4444${opacity}`;
      case 'booked': return `#f59e0b${opacity}`;
      default: return `#22c55e${opacity}`;
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
    <div 
      className="h-screen w-full flex flex-col bg-[#0a0a0c] overflow-hidden"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseUp={handleEndAction}
      onTouchEnd={handleEndAction}
      onMouseLeave={handleEndAction}
    >
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
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "font-black uppercase text-xs tracking-widest px-6 h-12 rounded-2xl transition-all",
              isEditMode ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20" : "bg-slate-700 hover:bg-slate-600"
            )}
          >
            {isEditMode ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
            {isEditMode ? 'Mode Edit Aktif' : 'Atur Posisi Unit'}
          </Button>
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
          className={cn(
            "relative w-full h-full flex items-center justify-center bg-[#111114] rounded-[3rem] border-2 border-white/5 shadow-2xl overflow-auto",
            isEditMode && "cursor-crosshair"
          )}
        >
          {selectedProject?.site_plan_image_url ? (
            <div className="relative inline-block transition-transform duration-300 ease-out" style={{ transform: `scale(${scale})` }}>
              <img 
                ref={imageRef}
                src={selectedProject.site_plan_image_url} 
                alt="Master Plan" 
                className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-sm pointer-events-none select-none"
              />
              
              {/* Unit Markers */}
              {units.map((unit) => {
                const isRuko = unit.type === 'Ruko';
                const edit = editedUnits[unit.id];
                
                const x = edit ? edit.sp_x : (unit.sp_x || 0);
                const y = edit ? edit.sp_y : (unit.sp_y || 0);
                const width = edit ? edit.sp_width : (unit.sp_width || 2);
                const height = edit ? edit.sp_height : (unit.sp_height || 3);
                const rotation = edit ? edit.sp_rotation : (unit.sp_rotation || 0);
                
                if (x === 0 && y === 0 && !isEditMode) return null;

                const isDragged = draggedUnitId === unit.id;
                const isResizing = resizingUnitId === unit.id;

                return (
                  <div 
                    key={unit.id}
                    onMouseDown={(e) => handleStartDrag(e, unit.id)}
                    onTouchStart={(e) => handleStartDrag(e, unit.id)}
                    onClick={() => !isEditMode && setSelectedUnit(unit)}
                    className={cn(
                      "absolute border border-black/40 cursor-pointer transition-all shadow-lg flex items-center justify-center group",
                      isRuko ? "bg-white" : "",
                      isEditMode && "hover:border-white hover:z-[100] border-2",
                      (isDragged || isResizing) && "opacity-50 z-[100] border-white border-dashed",
                      !isEditMode && "hover:scale-110 hover:z-50"
                    )}
                    style={{ 
                      left: `${x}%`, 
                      top: `${y}%`, 
                      width: `${width}%`,
                      height: `${height}%`,
                      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                      backgroundColor: isRuko ? 'white' : getStatusColor(unit.status || 'available', isEditMode),
                      touchAction: 'none'
                    }}
                  >
                    <span className={cn("text-[6px] font-black pointer-events-none select-none", isRuko ? "text-black" : "text-white")}>
                      {unit.unit_number.split('/')[1] || unit.unit_number}
                    </span>

                    {isEditMode && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRotate(unit.id); }}
                          className="absolute -top-4 -right-4 bg-indigo-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-[110] shadow-xl"
                        >
                          <RotateCcw className="w-3 h-3 text-white" />
                        </button>
                        <div 
                          onMouseDown={(e) => handleStartResize(e, unit.id)}
                          onTouchStart={(e) => handleStartResize(e, unit.id)}
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full cursor-se-resize border-2 border-indigo-600 opacity-0 group-hover:opacity-100 z-[110]"
                        />
                      </>
                    )}
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
                  Silakan upload denah proyek Anda dalam format JPG atau PNG.
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

        {/* Floating Detail Overlay */}
        {selectedUnit && !isEditMode && (
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
                <X className="w-6 h-6" />
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
        <div className="absolute left-1/2 -translate-x-1/2 bottom-12 h-16 bg-[#1a1a1e]/90 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center px-6 gap-6 shadow-2xl">
          {isEditMode ? (
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleSaveLayout}
                disabled={Object.keys(editedUnits).length === 0}
                className="bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs tracking-widest h-10 px-6 rounded-xl"
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan Layout ({Object.keys(editedUnits).length})
              </Button>
              <Button 
                onClick={() => { setIsEditMode(false); setEditedUnits({}); }}
                variant="ghost"
                className="text-white/60 hover:text-red-400 font-black uppercase text-xs tracking-widest h-10 px-4 rounded-xl"
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 border-r border-white/10 pr-6">
                <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="text-white/60 hover:text-indigo-400 transition-colors"><ZoomIn className="w-5 h-5" /></button>
                <span className="text-white font-black text-[10px] w-12 text-center tracking-widest">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="text-white/60 hover:text-indigo-400 transition-colors"><ZoomOut className="w-5 h-5" /></button>
              </div>
              <button onClick={() => setScale(1)} className="text-white/60 hover:text-indigo-400 transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Reset View</span>
              </button>
            </>
          )}
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
