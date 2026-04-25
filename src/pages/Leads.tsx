import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, UserPlus, Phone, MapPin, ArrowLeft, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Lead, LeadStatus } from '../types';
import { cn, formatDateTime } from '../lib/utils';
import { api } from '../lib/api';

const Leads: React.FC = () => {
  const navigate = useNavigate();
  const { division, setDivision, profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    source: '',
    status: 'no respon' as LeadStatus,
    description: '',
    marketing_id: ''
  });
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    fetchLeads();
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const data = await api.get('marketing_staff', 'select=id,name&order=name.asc');
      setStaff(data || []);
    } catch (err) {
      console.error('Fetch Staff Failed:', err);
    }
  };

  useEffect(() => {
    if (selectedLead) {
      setFormData({
        name: selectedLead.name,
        phone: selectedLead.phone,
        source: selectedLead.source,
        status: selectedLead.status,
        description: selectedLead.description,
        marketing_id: (selectedLead as any).marketing_id || ''
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        source: '',
        status: 'no respon',
        description: '',
        marketing_id: profile?.role === 'marketing' ? profile.id : ''
      });
    }
  }, [selectedLead, isModalOpen, profile]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const isMarketingOnly = profile?.role === 'marketing';
      const marketingFilter = isMarketingOnly ? `&marketing_id=eq.${profile.id}` : '';
      
      const data = await api.get('leads', `select=*,marketing:marketing_staff(name)&order=created_at.desc&limit=50${marketingFilter}`);
      setLeads(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Fetch Leads Failed:', err);
      setError(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (selectedLead) {
        await api.update('leads', selectedLead.id, formData);
      } else {
        await api.insert('leads', { ...formData, date: new Date().toISOString() });
      }
      await fetchLeads();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving lead:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      setLoading(true);
      await api.delete('leads', id);
      await fetchLeads();
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone.includes(searchTerm)
  );

  const handleAdd = () => {
    setSelectedLead(null);
    setIsModalOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
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
            <h1 className="text-2xl font-bold text-text-primary">Calon Konsumen <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-2">Singapore Mode</span></h1>
            <p className="text-text-secondary">Kelola data prospek dan calon pembeli</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Calon Konsumen
        </Button>
      </div>

      <Card className="p-0">
        {error && (
          <div className="m-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            {error}
            <button onClick={() => fetchLeads()} className="ml-auto underline font-medium">Coba Lagi</button>
          </div>
        )}
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari nama atau telepon..." 
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
                <TH className="px-6 py-3 font-semibold">Tanggal</TH>
                <TH className="px-6 py-3 font-semibold">Nama</TH>
                <TH className="px-6 py-3 font-semibold">No. Telp</TH>
                <TH className="px-6 py-3 font-semibold">Asal Data</TH>
                <TH className="px-6 py-3 font-semibold">Marketing</TH>
                <TH className="px-6 py-3 font-semibold">Status</TH>
                <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR>
                  <TD colSpan={6} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
                  </TD>
                </TR>
              ) : filteredLeads.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="px-6 py-10 text-center text-text-secondary">
                    Tidak ada data calon konsumen.
                  </TD>
                </TR>
              ) : (
                filteredLeads.map((lead) => (
                  <TR key={lead.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDateTime(lead.date)}</TD>
                    <TD className="px-6 py-4 font-medium text-text-primary">{lead.name}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">{lead.phone}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">{lead.source}</TD>
                    <TD className="px-6 py-4 text-sm font-medium text-accent-dark">
                      {(lead as any).marketing?.name || '-'}
                    </TD>
                    <TD className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        getStatusColor(lead.status)
                      )}>
                        {lead.status}
                      </span>
                    </TD>
                    <TD className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(lead)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(lead.id)}>
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
        title={selectedLead ? 'Edit Calon Konsumen' : 'Tambah Calon Konsumen'}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Tanggal & Jam" 
            value={selectedLead ? formatDateTime(selectedLead.date) : formatDateTime(new Date())} 
            readOnly 
            className="bg-white/30 cursor-not-allowed"
          />
          <Input 
            label="Nama" 
            placeholder="Nama lengkap" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input 
            label="No. Telp" 
            placeholder="0812..." 
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input 
            label="Asal Data" 
            placeholder="Contoh: Facebook, Instagram, Walk-in" 
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          />
          {profile?.role !== 'marketing' && (
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Pilih Marketing</label>
              <select 
                className="w-full h-10 rounded-xl border border-white/60 px-3 py-2 text-sm focus:outline-none"
                value={formData.marketing_id}
                onChange={(e) => setFormData({ ...formData, marketing_id: e.target.value })}
              >
                <option value="">-- Pilih Marketing --</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
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
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Keterangan</label>
            <textarea 
              className="w-full rounded-xl border border-white/60 px-3 py-2 text-sm focus:outline-none"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Leads;
