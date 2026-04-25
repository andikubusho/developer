import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MessageSquare, Clock, ArrowLeft, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { FollowUp, Lead, LeadStatus } from '../types';
import { cn, formatDateTime } from '../lib/utils';
import { api } from '../lib/api';

const FollowUps: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision, profile } = useAuth();
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
    date_time: new Date().toISOString()
  });

  useEffect(() => {
    fetchFollowUps();
    fetchLeads();
  }, []);

  useEffect(() => {
    if (selectedFollowUp) {
      setFormData({
        lead_id: selectedFollowUp.lead_id,
        description: selectedFollowUp.description,
        status: selectedFollowUp.status,
        date_time: selectedFollowUp.date_time
      });
    } else {
      setFormData({
        lead_id: '',
        description: '',
        status: 'no respon',
        date_time: new Date().toISOString()
      });
    }
  }, [selectedFollowUp, isModalOpen]);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const isMarketingOnly = profile?.role === 'marketing';
      // Use !inner to filter the parent follow_ups based on the joined lead's marketing_id
      const query = isMarketingOnly 
        ? `select=*,lead:leads!inner(name,phone,marketing_id)&lead.marketing_id=eq.${profile.id}&order=date_time.desc`
        : `select=*,lead:leads(name,phone)&order=date_time.desc`;
      
      const data = await api.get('follow_ups', query);
      setFollowUps(data || []);
    } catch (error) {
      console.error('Error fetching follow ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const isMarketingOnly = profile?.role === 'marketing';
      const marketingFilter = isMarketingOnly ? `&marketing_id=eq.${profile.id}` : '';
      const data = await api.get('leads', `select=*&order=name.asc${marketingFilter}`);
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
    try {
      setLoading(true);
      if (selectedFollowUp) {
        await api.update('follow_ups', selectedFollowUp.id, formData);
      } else {
        await api.insert('follow_ups', formData);
      }
      await fetchFollowUps();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving follow up:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      setLoading(true);
      await api.delete('follow_ups', id);
      await fetchFollowUps();
    } catch (error: any) {
      console.error('Error deleting follow up:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'hot': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      case 'no respon': return 'bg-white/40 text-text-primary';
      default: return 'bg-white/40 text-text-primary';
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
            <h1 className="text-2xl font-bold text-text-primary">Follow Up</h1>
            <p className="text-text-secondary">Catat riwayat komunikasi dengan calon konsumen</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Input Follow Up
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
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

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">Tanggal & Jam</TH>
                <TH className="px-6 py-3 font-semibold">Calon Konsumen</TH>
                <TH className="px-6 py-3 font-semibold">Keterangan</TH>
                <TH className="px-6 py-3 font-semibold">Status</TH>
                <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR>
                  <TD colSpan={5} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
                  </TD>
                </TR>
              ) : filteredFollowUps.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="px-6 py-10 text-center text-text-secondary">
                    Tidak ada data follow up.
                  </TD>
                </TR>
              ) : (
                filteredFollowUps.map((f) => (
                  <TR key={f.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 text-sm text-text-secondary">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-text-muted" />
                        {formatDateTime(f.date_time)}
                      </div>
                    </TD>
                    <TD className="px-6 py-4">
                      <div className="font-medium text-text-primary">{f.lead?.name}</div>
                      <div className="text-xs text-text-secondary">{f.lead?.phone}</div>
                    </TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">{f.description}</TD>
                    <TD className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        getStatusColor(f.status)
                      )}>
                        {f.status}
                      </span>
                    </TD>
                    <TD className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(f)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(f.id)}>
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
            className="bg-white/30 cursor-not-allowed"
          />
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Pilih Calon Konsumen</label>
            <select 
              className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
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
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Keterangan</label>
            <textarea 
              className="w-full rounded-xl border border-white/60 px-3 py-2 text-sm focus:outline-none"
              rows={3}
              placeholder="Isi hasil follow up..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {(['no respon', 'low', 'medium', 'hot'] as LeadStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: s })}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize',
                    formData.status === s 
                      ? 'bg-accent-dark border-accent-dark text-white' 
                      : 'bg-white border-white/40 text-text-secondary hover:border-accent-dark'
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
