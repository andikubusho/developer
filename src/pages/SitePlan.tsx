import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { 
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Upload,
  Maximize2,
  Lock,
  Unlock,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

const SitePlan = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
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
        const gcProj = projData.find((p: Project) => p.name.toLowerCase().includes('golden canyon')) || projData[0];
        setSelectedProjectId(gcProj.id);
        
        // Load saved config
        if (gcProj.settings?.site_plan_config) {
          const config = gcProj.settings.site_plan_config;
          setOffset(config.offset || { x: 0, y: 0 });
          setScale(config.scale || 1);
        }
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

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    const proj = projects.find(p => p.id === projectId);
    if (proj?.settings?.site_plan_config) {
      const config = proj.settings.site_plan_config;
      setOffset(config.offset || { x: 0, y: 0 });
      setScale(config.scale || 1);
    } else {
      setOffset({ x: 0, y: 0 });
      setScale(1);
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

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      const proj = projects.find(p => p.id === selectedProjectId);
      if (!proj) return;

      const updatedSettings = {
        ...(proj.settings || {}),
        site_plan_config: { offset, scale }
      };

      await api.update('projects', selectedProjectId, { settings: updatedSettings });
      
      const updatedProjects = projects.map(p => 
        p.id === selectedProjectId ? { ...p, settings: updatedSettings } : p
      );
      setProjects(updatedProjects);
      setIsLocked(true);
      alert('Posisi site plan berhasil disimpan!');
    } catch (error: any) {
      alert(`Gagal menyimpan posisi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading && projects.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f8fafc]">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 overflow-hidden font-sans">
      {/* Cinematic Minimalist Header */}
      <div className="h-20 w-full bg-slate-900/50 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-10">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Project View</span>
              <div className="flex items-center gap-4">
                <select 
                  value={selectedProjectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="bg-transparent text-white font-black text-xl focus:outline-none cursor-pointer appearance-none min-w-[200px]"
                >
                  {projects.map(p => <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.name}</option>)}
                </select>
                <ImageIcon className="text-indigo-400 w-5 h-5 opacity-50" />
              </div>
           </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10 mr-4">
             <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="p-3 text-white/40 hover:text-white transition-colors"><ZoomOut className="w-5 h-5" /></button>
             <span className="px-4 text-white font-black text-xs min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
             <button onClick={() => setScale(s => Math.min(s + 0.5, 5))} className="p-3 text-white/40 hover:text-white transition-colors"><ZoomIn className="w-5 h-5" /></button>
          </div>

          <Button 
            onClick={() => setIsLocked(!isLocked)}
            className={cn(
              "font-black uppercase text-[10px] tracking-[0.2em] px-6 h-12 rounded-2xl transition-all",
              isLocked 
                ? "bg-white/5 text-white/50 border border-white/10" 
                : "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
            )}
          >
            {isLocked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
            {isLocked ? 'KUNCI' : 'GESER AKTIF'}
          </Button>

          {!isLocked && (
            <Button 
              onClick={handleSaveConfig}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-[0.2em] h-12 px-6 rounded-2xl shadow-xl shadow-emerald-600/20"
            >
              <Save className="w-4 h-4 mr-2" />
              Simpan Posisi
            </Button>
          )}

          <Button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-[0.2em] h-12 px-6 rounded-2xl shadow-xl shadow-indigo-600/20"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Baru
          </Button>
        </div>
      </div>

      {/* Hero Image Canvas */}
      <div 
        className="flex-1 relative overflow-hidden flex items-center justify-center p-12"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[length:40px_40px]" />
        
        {selectedProject?.site_plan_image_url ? (
          <div 
            className={cn(
              "relative transition-all duration-300 flex items-center justify-center",
              !isLocked && (isDragging ? "cursor-grabbing" : "cursor-grab")
            )}
            style={{ 
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
          >
            <img 
              src={selectedProject.site_plan_image_url} 
              alt="Site Plan"
              className="max-w-[90vw] max-h-[80vh] object-contain shadow-[0_0_80px_-15px_rgba(0,0,0,0.5)] rounded-2xl border border-white/10 bg-slate-800"
              draggable={false}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 text-white/20">
             <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 flex items-center justify-center border border-white/5">
                <ImageIcon className="w-10 h-10" />
             </div>
             <p className="font-black text-xs tracking-[0.5em] uppercase">Site plan belum diupload</p>
             <Button onClick={() => setIsUploadModalOpen(true)} variant="outline" className="border-white/10 text-white/50 font-bold uppercase text-[9px] tracking-widest h-10 px-6 rounded-xl">
                Upload Sekarang
             </Button>
          </div>
        )}

        {/* Cinematic Overlays */}
        <div className="absolute bottom-10 left-10 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-md border border-white/5 flex items-center gap-6 pointer-events-none">
           <div className="flex flex-col">
              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Status View</span>
              <span className="text-[10px] font-bold text-white/60 mt-1 flex items-center gap-2">
                 {isLocked ? (
                   <><Lock className="w-3 h-3" /> Tampilan Terkunci</>
                 ) : (
                   <><Unlock className="w-3 h-3 text-amber-400" /> Mode Penyesuaian Aktif</>
                 )}
              </span>
           </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Update Site Plan">
        <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-[3rem] hover:border-indigo-500/50 transition-all cursor-pointer bg-slate-50 relative group overflow-hidden">
          <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-premium mx-auto mb-6 group-hover:scale-110 transition-transform relative z-0">
             <Upload className="w-10 h-10 text-indigo-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Pilih Gambar Site Plan</h3>
          <p className="text-sm text-slate-400 mt-2 font-medium">Klik atau tarik file gambar ke area ini</p>
        </div>
      </Modal>
    </div>
  );
};

export default SitePlan;
