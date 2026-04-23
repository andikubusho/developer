import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Camera, 
  Calendar, 
  CheckCircle2, 
  Clock,
  LayoutGrid,
  History
} from 'lucide-react';
import { api } from '../lib/api';
import { Project, ConstructionProgress, Unit } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { ProgressForm } from '../components/forms/ProgressForm';
import { formatDate, cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMockMode } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [progress, setProgress] = useState<ConstructionProgress[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProjectData(id);
    }
  }, [id]);

  const fetchProjectData = async (projectId: string) => {
    try {
      setLoading(true);
      
      if (isMockMode) {
        // Mock Project Data
        setProject({
          id: projectId,
          name: 'Griya Asri Residence',
          location: 'Bandung, Jawa Barat',
          description: 'Hunian asri dengan konsep modern minimalis di pusat kota Bandung.',
          total_units: 50,
          status: 'ongoing',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Mock Progress Data
        setProgress([
          {
            id: '1',
            project_id: projectId,
            report_date: new Date().toISOString(),
            percentage: 45,
            description: 'Penyelesaian struktur lantai 2 dan pemasangan bata.',
            photo_url: 'https://picsum.photos/seed/construction1/800/600',
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            project_id: projectId,
            report_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            percentage: 30,
            description: 'Penyelesaian pondasi dan struktur lantai 1.',
            photo_url: 'https://picsum.photos/seed/construction2/800/600',
            created_at: new Date().toISOString(),
          }
        ]);

        // Mock Units Data
        setUnits([
          { id: '1', project_id: projectId, unit_number: 'A-01', type: 'Tipe 36/72', price: 350000000, status: 'available', created_at: '', updated_at: '' },
          { id: '2', project_id: projectId, unit_number: 'A-02', type: 'Tipe 36/72', price: 350000000, status: 'booked', created_at: '', updated_at: '' },
          { id: '3', project_id: projectId, unit_number: 'B-01', type: 'Tipe 45/90', price: 450000000, status: 'sold', created_at: '', updated_at: '' },
          { id: '4', project_id: projectId, unit_number: 'B-02', type: 'Tipe 45/90', price: 450000000, status: 'available', created_at: '', updated_at: '' },
        ]);

        setLoading(false);
        return;
      }

      const [projectData, progressData, unitsData] = await Promise.all([
        api.get('projects', `select=*&id=eq.${projectId}`),
        api.get('project_progress', `select=*&project_id=eq.${projectId}&order=report_date.desc`),
        api.get('units', `select=*&project_id=eq.${projectId}&order=unit_number.asc`)
      ]);

      setProject(projectData?.[0] || null);
      setProgress(progressData || []);
      setUnits(unitsData || []);
    } catch (error) {
      console.error('Error fetching project detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Proyek tidak ditemukan</h2>
        <Button className="mt-4" onClick={() => navigate('/projects')}>Kembali ke Daftar</Button>
      </div>
    );
  }

  const latestProgress = progress[0]?.percentage || 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-slate-500">{project.location}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Progress Overview */}
          <Card title="Progress Pembangunan">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-sm font-medium text-slate-700">Total Progress</span>
                <span className="text-2xl font-bold text-indigo-600">{latestProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-500" 
                  style={{ width: `${latestProgress}%` }}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Riwayat Progress
                </h4>
                <Button size="sm" onClick={() => setIsModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Update Progress
                </Button>
              </div>

              <div className="space-y-4">
                {progress.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Belum ada laporan progress.</p>
                ) : (
                  progress.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="w-24 h-24 rounded-lg bg-slate-200 flex-shrink-0 overflow-hidden">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt="Progress" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1">
                          <span className="font-bold text-slate-900">{item.percentage}% Selesai</span>
                          <span className="text-xs text-slate-500 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(item.report_date)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Units in this project */}
          <Card title="Unit Properti">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {units.map((unit) => (
                <div 
                  key={unit.id} 
                  className={cn(
                    'p-3 rounded-lg border text-center transition-all cursor-pointer hover:shadow-md',
                    unit.status === 'available' ? 'border-emerald-100 bg-emerald-50/30' :
                    unit.status === 'booked' ? 'border-amber-100 bg-amber-50/30' :
                    'border-slate-100 bg-slate-50/30'
                  )}
                >
                  <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">{unit.type}</div>
                  <div className="text-lg font-bold text-slate-900">{unit.unit_number}</div>
                  <div className={cn(
                    'text-[10px] font-bold uppercase mt-2',
                    unit.status === 'available' ? 'text-emerald-600' :
                    unit.status === 'booked' ? 'text-amber-600' : 'text-slate-500'
                  )}>
                    {unit.status === 'available' ? 'Tersedia' :
                     unit.status === 'booked' ? 'Booked' : 'Terjual'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title="Detail Proyek">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Status Proyek</label>
                <div className="flex items-center gap-2 mt-1">
                  {project.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-indigo-500" />
                  )}
                  <span className="font-medium text-slate-900 capitalize">{project.status}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Total Unit</label>
                <p className="font-medium text-slate-900 mt-1">{project.total_units} Unit</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Deskripsi</label>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{project.description || 'Tidak ada deskripsi.'}</p>
              </div>
            </div>
          </Card>

          <Card title="Ringkasan Unit">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">Tersedia</span>
                <span className="font-bold text-emerald-600">{units.filter(u => u.status === 'available').length}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">Booked</span>
                <span className="font-bold text-amber-600">{units.filter(u => u.status === 'booked').length}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">Terjual</span>
                <span className="font-bold text-slate-900">{units.filter(u => u.status === 'sold').length}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-bold">
                <span>Total</span>
                <span>{units.length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Update Progress Pembangunan"
        size="lg"
      >
        <ProgressForm 
          projectId={id!}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchProjectData(id!);
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default ProjectDetail;

