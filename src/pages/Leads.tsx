import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, UserPlus, Phone, MapPin, ArrowLeft, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Lead, LeadStatus } from '../types';
import { cn, formatDateTime } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getMockData, saveMockData } from '../lib/storage';

const Leads: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
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
    description: ''
  });

  useEffect(() => {
    console.log('Leads Page Mounted. Fetching data...');
    setLoading(true);
    fetchLeads();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      setFormData({
        name: selectedLead.name,
        phone: selectedLead.phone,
        source: selectedLead.source,
        status: selectedLead.status,
        description: selectedLead.description
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        source: '',
        status: 'no respon',
        description: ''
      });
    }
  }, [selectedLead, isModalOpen]);

  const fetchLeads = async () => {
    const start = performance.now();
    setError(null);
    console.log('STARTING DIRECT FETCH (Singapore Region)...');
    
    try {
      setLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/leads?select=*&order=date.desc&limit=50`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }

      const fetchedData = await response.json();
      console.log('DIRECT FETCH SUCCESS:', fetchedData.length, 'rows');
      
      setLeads(fetchedData || []);
      localStorage.setItem('cache_leads', JSON.stringify(fetchedData || []));
      setError(null);
    } catch (err: any) {
      console.error('DIRECT FETCH FAILED:', err);
      setError(err.message || 'Gagal memuat data terbaru.');
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

  const handleSave = async () => {
    if (isMockMode) {
      let updatedLeads: Lead[];
      if (selectedLead) {
        // Update
        updatedLeads = leads.map(l => l.id === selectedLead.id ? { ...l, ...formData } : l);
      } else {
        // Create
        const newLead: Lead = {
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          ...formData
        };
        updatedLeads = [newLead, ...leads];
      }
      setLeads(updatedLeads);
      saveMockData('leads', updatedLeads);
    } else {
      try {
        if (selectedLead) {
          const { error } = await supabase
            .from('leads')
            .update(formData)
            .eq('id', selectedLead.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('leads')
            .insert([{ ...formData, date: new Date().toISOString() }]);
          if (error) throw error;
        }
        fetchLeads();
      } catch (error) {
        console.error('Error saving lead:', error);
      }
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    if (isMockMode) {
      const updatedLeads = leads.filter(l => l.id !== id);
      setLeads(updatedLeads);
      saveMockData('leads', updatedLeads);
    } else {
      try {
        const { error } = await supabase
          .from('leads')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchLeads();
      } catch (error) {
        console.error('Error deleting lead:', error);
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
              setDivision(null);
            }}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Calon Konsumen <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-2">Singapore Mode</span></h1>
            <div className="flex items-center gap-2 mt-1 overflow-hidden">
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono truncate max-w-[200px]">URL: {supabase.auth.getSession ? (import.meta.env.VITE_SUPABASE_URL || 'MISSING').substring(0, 30) : 'Error'}</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono">Status: {loading ? 'Connecting...' : 'Ready'}</span>
              {error && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-mono">Error: {error.substring(0, 30)}</span>}
            </div>
            <p className="text-slate-500 mt-1">Kelola data prospek dan calon pembeli</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Calon Konsumen
        </Button>
      </div>

      <Card className="p-0">
        {error && (
          <div className="m-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            {error}
            <button onClick={() => fetchLeads()} className="ml-auto underline font-medium">Coba Lagi</button>
          </div>
        )}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Tanggal</th>
                <th className="px-6 py-3 font-semibold">Nama</th>
                <th className="px-6 py-3 font-semibold">No. Telp</th>
                <th className="px-6 py-3 font-semibold">Asal Data</th>
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
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data calon konsumen.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(lead.date)}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{lead.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{lead.phone}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{lead.source}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        getStatusColor(lead.status)
                      )}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(lead)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(lead.id)}>
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
        title={selectedLead ? 'Edit Calon Konsumen' : 'Tambah Calon Konsumen'}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Tanggal & Jam" 
            value={selectedLead ? formatDateTime(selectedLead.date) : formatDateTime(new Date())} 
            readOnly 
            className="bg-slate-50 cursor-not-allowed"
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
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Keterangan</label>
            <textarea 
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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



