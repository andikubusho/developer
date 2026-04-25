import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, UserPlus, ArrowLeft, Edit, Trash2, Mail, Phone, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Recruitment } from '../types';
import { formatDate, cn } from '../lib/utils';

const RecruitmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMockMode, division, setDivision } = useAuth();
  const [recruitment, setRecruitment] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    candidate_name: '',
    position: '',
    status: 'applied' as const,
    applied_date: new Date().toISOString().split('T')[0],
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchRecruitment();
  }, []);

  const fetchRecruitment = async () => {
    setLoading(true);
    if (isMockMode) {
      const mockRecruitment: Recruitment[] = [
        {
          id: '1',
          candidate_name: 'Budi Santoso',
          position: 'Sales Executive',
          status: 'interview',
          applied_date: '2026-03-20',
          email: 'budi@example.com',
          phone: '08123456789'
        },
        {
          id: '2',
          candidate_name: 'Ani Lestari',
          position: 'Finance Staff',
          status: 'applied',
          applied_date: '2026-03-25',
          email: 'ani@example.com',
          phone: '08123456780'
        },
        {
          id: '3',
          candidate_name: 'Dedi Kurniawan',
          position: 'Site Engineer',
          status: 'rejected',
          applied_date: '2026-03-15',
          email: 'dedi@example.com',
          phone: '08123456781'
        }
      ];
      setRecruitment(mockRecruitment);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (isMockMode) {
      if (editingId) {
        setRecruitment(recruitment.map(r => r.id === editingId ? { ...r, ...formData } : r));
      } else {
        const newRecruitment: Recruitment = {
          id: Math.random().toString(36).substr(2, 9),
          ...formData
        };
        setRecruitment([newRecruitment, ...recruitment]);
      }
      setIsModalOpen(false);
      resetForm();
    }
  };

  const handleEdit = (item: Recruitment) => {
    setEditingId(item.id);
    setFormData({
      candidate_name: item.candidate_name,
      position: item.position,
      status: item.status,
      applied_date: item.applied_date,
      email: item.email,
      phone: item.phone
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data kandidat ini?')) {
      setRecruitment(recruitment.filter(r => r.id !== id));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      candidate_name: '',
      position: '',
      status: 'applied',
      applied_date: new Date().toISOString().split('T')[0],
      email: '',
      phone: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-700';
      case 'interview': return 'bg-amber-100 text-amber-700';
      case 'hired': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredRecruitment = recruitment.filter(item => 
    item.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-slate-900">Rekrutmen</h1>
            <p className="text-slate-500">Manajemen Calon Karyawan dan Proses Seleksi</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Kandidat
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari nama kandidat atau posisi..." 
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
                <th className="px-6 py-3 font-semibold">Tgl Melamar</th>
                <th className="px-6 py-3 font-semibold">Nama Kandidat</th>
                <th className="px-6 py-3 font-semibold">Posisi</th>
                <th className="px-6 py-3 font-semibold">Kontak</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredRecruitment.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data rekrutmen.
                  </td>
                </tr>
              ) : (
                filteredRecruitment.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(item.applied_date)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900">{item.candidate_name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{item.position}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Mail className="w-3 h-3" /> {item.email}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="w-3 h-3" /> {item.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        getStatusColor(item.status)
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500"
                          onClick={() => handleDelete(item.id)}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingId ? "Edit Data Kandidat" : "Tambah Kandidat Baru"}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Nama Lengkap" 
            placeholder="Nama lengkap kandidat" 
            value={formData.candidate_name}
            onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
            required
          />
          <Input 
            label="Posisi yang Dilamar" 
            placeholder="Contoh: Sales, Admin, dll" 
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Email" 
              type="email" 
              placeholder="email@example.com" 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input 
              label="Nomor Telepon" 
              placeholder="0812..." 
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Tanggal Melamar" 
              type="date" 
              value={formData.applied_date}
              onChange={(e) => setFormData({ ...formData, applied_date: e.target.value })}
              required
            />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Status</label>
              <select 
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                required
              >
                <option value="applied">Applied</option>
                <option value="interview">Interview</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Upload CV / Resume</label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
              <p className="text-sm text-slate-500">Klik untuk upload atau drag and drop file</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button type="submit">{editingId ? "Update Kandidat" : "Simpan Kandidat"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RecruitmentPage;



