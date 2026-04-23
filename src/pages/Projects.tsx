import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, MapPin, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Project } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/Input';
import { formatDate, cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { ProjectForm } from '../components/forms/ProjectForm';
import { useAuth } from '../contexts/AuthContext';
import { getMockData, saveMockData } from '../lib/storage';

const Projects: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      if (isMockMode) {
        const defaultProjects: Project[] = [
          {
            id: '1',
            name: 'Griya Asri Residence',
            location: 'Bandung, Jawa Barat',
            description: 'Perumahan subsidi dengan fasilitas lengkap',
            total_units: 50,
            status: 'ongoing',
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'Grand Emerald City',
            location: 'Jakarta Timur',
            description: 'Apartemen mewah di pusat kota',
            total_units: 200,
            status: 'planned',
            created_at: new Date().toISOString(),
          }
        ];
        setProjects(getMockData<Project>('projects', defaultProjects));
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleAdd = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus proyek ini?')) return;

    if (isMockMode) {
      const updatedProjects = projects.filter(p => p.id !== id);
      setProjects(updatedProjects);
      saveMockData('projects', updatedProjects);
    } else {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <h1 className="text-2xl font-bold text-slate-900">Daftar Proyek</h1>
            <p className="text-slate-500">Kelola semua proyek pengembangan properti</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Proyek Baru
        </Button>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedProject ? 'Edit Proyek' : 'Proyek Baru'}
        size="lg"
      >
        <ProjectForm 
          onSuccess={handleSuccess} 
          onCancel={() => setIsModalOpen(false)} 
          initialData={selectedProject} 
        />
      </Modal>


      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari proyek..." 
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
                <th className="px-6 py-3 font-semibold">Nama Proyek</th>
                <th className="px-6 py-3 font-semibold">Lokasi</th>
                <th className="px-6 py-3 font-semibold">Unit</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Dibuat</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
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
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada proyek ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <Link to={`/projects/${project.id}`} className="font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                        {project.name}
                      </Link>
                      <div className="text-xs text-slate-500 truncate max-w-[200px]">{project.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                        {project.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 font-medium">{project.total_units} Unit</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        project.status === 'ongoing' ? 'bg-indigo-50 text-indigo-700' :
                        project.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-slate-50 text-slate-700'
                      )}>
                        {project.status === 'ongoing' ? 'Berjalan' :
                         project.status === 'completed' ? 'Selesai' : 'Direncanakan'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(project.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(project)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(project.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

export default Projects;



