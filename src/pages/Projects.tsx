import React, { useEffect, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, MapPin, ArrowLeft } from 'lucide-react';
import { Project } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { formatDate, cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { ProjectForm } from '../components/forms/ProjectForm';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await api.get('projects', 'select=*&order=created_at.desc');
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
    try {
      setLoading(true);
      await api.delete('projects', id);
      await fetchProjects();
    } catch (error: any) {
      console.error('Error deleting project:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Daftar Proyek</h1>
            <p className="text-text-secondary">Kelola semua proyek pengembangan properti</p>
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
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
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

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">Nama Proyek</TH>
                <TH className="px-6 py-3 font-semibold">Lokasi</TH>
                <TH className="px-6 py-3 font-semibold">Unit</TH>
                <TH className="px-6 py-3 font-semibold">Status</TH>
                <TH className="px-6 py-3 font-semibold">Dibuat</TH>
                <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR>
                  <TD colSpan={6} className="px-6 py-10 text-center text-text-muted">Memuat proyek...</TD>
                </TR>
              ) : filteredProjects.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="px-6 py-10 text-center text-text-secondary">
                    Tidak ada proyek ditemukan.
                  </TD>
                </TR>
              ) : (
                filteredProjects.map((project) => (
                  <TR key={project.id} className="hover:bg-white/30 transition-colors group">
                    <TD className="px-6 py-4">
                      <Link to={`/projects/${project.id}`} className="font-medium text-text-primary hover:text-accent-dark transition-colors">
                        {project.name}
                      </Link>
                      <div className="text-xs text-text-secondary truncate max-w-[200px]">{project.description}</div>
                    </TD>
                    <TD className="px-6 py-4">
                      <div className="flex items-center text-sm text-text-secondary">
                        <MapPin className="w-3 h-3 mr-1 text-text-muted" />
                        {project.location}
                      </div>
                    </TD>
                    <TD className="px-6 py-4">
                      <div className="text-sm text-text-primary font-medium">{project.total_units} Unit</div>
                    </TD>
                    <TD className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        project.status === 'ongoing' ? 'bg-accent-lavender/20 text-accent-dark' :
                        project.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-white/30 text-text-primary'
                      )}>
                        {project.status === 'ongoing' ? 'Berjalan' :
                         project.status === 'completed' ? 'Selesai' : 'Direncanakan'}
                      </span>
                    </TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">
                      {formatDate(project.created_at)}
                    </TD>
                    <TD className="px-6 py-4 text-right">
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
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>
    </div>
  );
};

export default Projects;
