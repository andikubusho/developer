import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MessageSquare, Clock, ArrowLeft, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { FollowUp, Lead, LeadStatus } from '../types';
import { cn, formatDateTime } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getMockData, saveMockData } from '../lib/storage';

const FollowUps: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    lead_id: '',
    description: '',
    status: 'no respon' as LeadStatus,
    date_time: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    if (division === 'marketing') {
      fetchFollowUps();
      fetchLeads();
    } else {
      setLoading(false);
    }
  }, [division]);

  useEffect(() => {
    if (selectedFollowUp) {
      setFormData({
        lead_id: selectedFollowUp.lead_id,
        description: selectedFollowUp.description,
        status: selectedFollowUp.status,
        date_time: new Date(selectedFollowUp.date_time).toISOString().slice(0, 16)
      });
    } else {
      setFormData({
        lead_id: '',
        description: '',
        status: 'no respon',
        date_time: new Date().toISOString().slice(0, 16)
      });
    }
  }, [selectedFollowUp, isModalOpen]);

  const fetchFollowUps = async () => {
    setLoading(true);
    if (isMockMode) {
      const defaultFollowUps: FollowUp[] = [
        {
          id: '1',
          lead_id: '1',
          date_time: new Date().toISOString(),
          description: 'Sudah dihubungi via WA, masih pikir-pikir',
          status: 'medium',
          lead: { id: '1', name: 'Andi Wijaya', phone: '081234567890', date: '', source: '', status: 'hot', description: '' }
        }
      ];
      const data = getMockData<FollowUp>('followups', defaultFollowUps);
      setFollowUps(data);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*, lead:leads(*)')
        .order('date_time', { ascending: false });

      if (error) throw error;
      setFollowUps(data || []);
    } catch (error) {
      console.error('Error fetching follow ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    if (isMockMode) {
      const defaultLeads: Lead[] = [
        { id: '1', name: 'Andi Wijaya', phone: '081234567890', date: '', source: '', status: 'hot', description: '' },
        { id: '2', name: 'Budi Santoso', phone: '089876543210', date: '', source: '', status: 'medium', description: '' }
      ];
      setLeads(getMockData<Lead>('leads', defaultLeads));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('name');
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const filteredFollowUps = followUps.filter(f => 
    f.lead?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setSelectedFollowUp(null);
    setIsModalOpen(true);
  };

  const handleEdit = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (isMockMode) {
      const lead = leads.find(l => l.id === formData.lead_id);
      let updatedFollowUps: FollowUp[];
      if (selectedFollowUp) {
        // Update
        updatedFollowUps = followUps.map(f => f.id === selectedFollowUp.id ? { ...f, ...formData, lead } : f);
      } else {
        // Create
        const newFollowUp: FollowUp = {
          id: Math.random().toString(36).substr(2, 9),
          ...formData,
          lead
        };
        updatedFollowUps = [newFollowUp, ...followUps];
      }
      setFollowUps(updatedFollowUps);
      saveMockData('followups', updatedFollowUps);
    } else {
      try {
        if (selectedFollowUp) {
          const { error } = await supabase
            .from('follow_ups')
            .update(formData)
            .eq('id', selectedFollowUp.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('follow_ups')
            .insert([formData]);
          if (error) throw error;
        }
        fetchFollowUps();
      } catch (error) {
        console.error('Error saving follow up:', error);
      }
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    if (isMockMode) {
      const updatedFollowUps = followUps.filter(item => item.id !== id);
      setFollowUps(updatedFollowUps);
      saveMockData('followups', updatedFollowUps);
    } else {
      try {
        const { error } = await supabase
          .from('follow_ups')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchFollowUps();
      } catch (error) {
        console.error('Error deleting follow up:', error);
      }
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'hot': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      case 'no respon': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
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
            <h1 className="text-2xl font-bold text-slate-900">Follow Up</h1>
            <p className="text-slate-500">Catat riwayat komunikasi dengan calon konsumen</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Input Follow Up
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari nama atau keterangan..." 
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
                <th className="px-6 py-3 font-semibold">Tanggal & Jam</th>
                <th className="px-6 py-3 font-semibold">Calon Konsumen</th>
                <th className="px-6 py-3 font-semibold">Keterangan</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredFollowUps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data follow up.
                  </td>
                </tr>
              ) : (
                filteredFollowUps.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDateTime(f.date_time)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{f.lead?.name}</div>
                      <div className="text-xs text-slate-500">{f.lead?.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{f.description}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        getStatusColor(f.status)
                      )}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(f)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(f.id)}>
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
        onClose={() => setIsModalOpen(false)}
        title={selectedFollowUp ? 'Edit Follow Up' : 'Input Follow Up'}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Tanggal & Jam" 
            value={selectedFollowUp ? formatDateTime(selectedFollowUp.date_time) : formatDateTime(new Date())} 
            readOnly 
            className="bg-slate-50 cursor-not-allowed"
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Calon Konsumen</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.lead_id}
              onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
              required
            >
              <option value="">-- Pilih Konsumen --</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Keterangan</label>
            <textarea 
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Isi hasil follow up..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {(['no respon', 'low', 'medium', 'hot'] as LeadStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: s })}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize',
                    formData.status === s 
                      ? 'bg-indigo-600 border-indigo-600 text-white' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-600'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan Follow Up</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FollowUps;



