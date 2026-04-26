import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, UserPlus, Phone, MapPin, ArrowLeft, MoreVertical, Edit, Trash2, UserCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { CustomerForm } from '../components/forms/CustomerForm';
import { useAuth } from '../contexts/AuthContext';
import { Lead, LeadStatus } from '../types';
import { cn, formatDateTime } from '../lib/utils';
import { api } from '../lib/api';
import ConsultantDataFilter from '../components/ConsultantDataFilter';
import { useCanViewAll } from '../hooks/usePermissions';

const Leads: React.FC = () => {
  const navigate = useNavigate();
  const { division, setDivision, profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const canViewAll = useCanViewAll('leads');
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | 'all'>(
    canViewAll ? (localStorage.getItem('filter_consultant_id') || 'all') : (profile?.consultant_id || 'none')
  );

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    source: '',
    status: 'no respon' as LeadStatus,
    description: '',
    consultant_id: ''
  });
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    fetchLeads();
    fetchStaff();
  }, [selectedConsultantId]);

  const fetchStaff = async () => {
    try {
      const data = await api.get('consultants', 'select=id,name&order=name.asc');
      setStaff(data || []);
    } catch (err) {
      console.error('Fetch Staff Failed:', err);
    }
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      description: lead.description,
      consultant_id: (lead as any).consultant_id || ''
    });
    setIsModalOpen(true);
  };

  const handleConvert = (lead: Lead) => {
    if (!confirm(`Data Calon Konsumen "${lead.name}" akan dipindah dan dihapus permanen dari daftar ini. Lanjutkan?`)) {
      return;
    }
    setLeadToConvert(lead);
    setIsConvertModalOpen(true);
  };

  const handleConvertSuccess = async () => {
    if (!leadToConvert) return;
    
    try {
      setLoading(true);
      // Hapus lead hanya SETELAH customer dipastikan tersimpan (onSuccess dipanggil dari CustomerForm)
      await api.delete('leads', leadToConvert.id);
      setIsConvertModalOpen(false);
      setLeadToConvert(null);
      fetchLeads();
      alert('Berhasil: Data telah dipindahkan ke daftar Konsumen.');
    } catch (error: any) {
      console.error('Error deleting lead after conversion:', error);
      alert('Customer tersimpan, tapi gagal menghapus data lead lama.');
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

  useEffect(() => {
    if (!isModalOpen) {
      setSelectedLead(null);
      setFormData({
        name: '',
        phone: '',
        source: '',
        status: 'no respon',
        description: '',
        consultant_id: profile?.consultant_id || ''
      });
    }
  }, [selectedLead, isModalOpen, profile]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const filterParam = selectedConsultantId !== 'all' ? `&consultant_id=eq.${selectedConsultantId}` : '';
      
      const data = await api.get('leads', `select=*,consultant:consultants(name)&order=created_at.desc&limit=50${filterParam}`);
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

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone.includes(searchTerm)
  );

  const handleAdd = () => {
    setSelectedLead(null);
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
        <div className="flex items-center gap-2 sm:gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="p-1 sm:p-2 h-auto"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-text-primary tracking-tight">Calon Konsumen</h1>
            <p className="text-[10px] sm:text-sm text-text-secondary font-medium uppercase tracking-widest">Manajemen Prospek</p>
          </div>
        </div>
        <Button size="sm" className="w-full sm:w-auto rounded-xl text-[10px] sm:text-sm py-3" onClick={handleAdd}>
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          Tambah Data
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <ConsultantDataFilter 
          value={selectedConsultantId}
          menuKey="leads"
          onChange={(id) => {
            setSelectedConsultantId(id);
            if (canViewAll) {
              localStorage.setItem('filter_consultant_id', id);
            }
          }}
        />
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

        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
              <THead>
                <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                  <TH className="px-3 py-3 font-black hidden md:table-cell">Tanggal</TH>
                  <TH className="px-3 py-3 font-black">Konsumen</TH>
                  <TH className="px-3 py-3 font-black hidden sm:table-cell">No. Telp</TH>
                  <TH className="px-3 py-3 font-black hidden md:table-cell">Asal Data</TH>
                  <TH className="px-3 py-3 font-black hidden lg:table-cell">Konsultan</TH>
                  <TH className="px-3 py-3 font-black">Status</TH>
                  <TH className="px-3 py-3 font-black text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR>
                    <TD colSpan={7} className="px-3 py-10 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
                    </TD>
                  </TR>
                ) : filteredLeads.length === 0 ? (
                  <TR>
                    <TD colSpan={7} className="px-3 py-10 text-center text-text-secondary text-sm">
                      Tidak ada data calon konsumen.
                    </TD>
                  </TR>
                ) : (
                  filteredLeads.map((lead) => (
                    <TR key={lead.id} className="hover:bg-white/30 transition-colors">
                      <TD className="px-3 py-4 text-[10px] text-text-secondary hidden md:table-cell whitespace-nowrap">{formatDateTime(lead.date)}</TD>
                      <TD className="px-3 py-4">
                        <div className="font-black text-text-primary text-xs whitespace-nowrap">{lead.name}</div>
                        <div className="text-[10px] text-text-secondary sm:hidden whitespace-nowrap">{lead.phone}</div>
                        <div className="text-[9px] text-accent-dark font-bold lg:hidden whitespace-nowrap">{(lead as any).consultant?.name || '-'}</div>
                      </TD>
                      <TD className="px-3 py-4 text-[10px] text-text-secondary hidden sm:table-cell whitespace-nowrap">{lead.phone}</TD>
                      <TD className="px-3 py-4 text-[10px] text-text-secondary hidden md:table-cell">{lead.source}</TD>
                      <TD className="px-3 py-4 text-[10px] font-black text-accent-dark whitespace-nowrap hidden lg:table-cell">
                        {(lead as any).consultant?.name || '-'}
                      </TD>
                      <TD className="px-3 py-4">
                        <span className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider',
                          getStatusColor(lead.status)
                        )}>
                          {lead.status}
                        </span>
                      </TD>
                      <TD className="px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-emerald-600" 
                            onClick={() => handleConvert(lead)}
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(lead)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(lead.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
        </div>
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
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Konsultan Property <span className="text-red-500">*</span></label>
            <select 
              className="w-full h-10 rounded-xl border border-white/60 px-3 py-2 text-sm focus:outline-none bg-white/50"
              value={formData.consultant_id}
              onChange={(e) => setFormData({ ...formData, consultant_id: e.target.value })}
              required
              disabled={!canViewAll && !!profile?.consultant_id}
            >
              <option value="">-- Pilih Konsultan --</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
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
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Pindahkan ke Data Konsumen"
      >
        {leadToConvert && (
          <CustomerForm 
            onSuccess={handleConvertSuccess}
            onCancel={() => setIsConvertModalOpen(false)}
            initialData={{
              full_name: leadToConvert.name,
              phone: leadToConvert.phone,
              consultant_id: leadToConvert.consultant_id
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default Leads;
