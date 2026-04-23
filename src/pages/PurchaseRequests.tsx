import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ClipboardList, ArrowLeft, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { PurchaseRequest } from '../types';
import { formatDate, cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getMockData, saveMockData } from '../lib/storage';

const PurchaseRequestsPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    request_date: new Date().toISOString().split('T')[0],
    material_id: '',
    quantity: 0,
    description: ''
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      setFormData({
        request_date: selectedRequest.request_date.split('T')[0],
        material_id: selectedRequest.material_id,
        quantity: selectedRequest.quantity,
        description: selectedRequest.description || ''
      });
    } else {
      setFormData({
        request_date: new Date().toISOString().split('T')[0],
        material_id: '',
        quantity: 0,
        description: ''
      });
    }
  }, [selectedRequest, isModalOpen]);

  const fetchRequests = async () => {
    setLoading(true);
    if (isMockMode) {
      const defaultRequests: PurchaseRequest[] = [
        {
          id: '1',
          project_id: '1',
          material_id: '1',
          quantity: 100,
          requested_by: 'Neville Christian',
          status: 'pending',
          request_date: new Date().toISOString(),
          description: 'Kebutuhan untuk pengecoran dak lantai 2.'
        },
        {
          id: '2',
          project_id: '1',
          material_id: '2',
          quantity: 50,
          requested_by: 'Neville Christian',
          status: 'approved',
          request_date: new Date().toISOString(),
          description: 'Pemasangan dinding bata merah.'
        }
      ];
      setRequests(getMockData<PurchaseRequest>('purchase_requests', defaultRequests));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .order('request_date', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (isMockMode) {
      let updatedRequests: PurchaseRequest[];
      if (selectedRequest) {
        updatedRequests = requests.map(item => item.id === selectedRequest.id ? { ...item, ...formData } : item);
      } else {
        const newItem: PurchaseRequest = {
          id: Math.random().toString(36).substr(2, 9),
          project_id: '1',
          ...formData,
          requested_by: 'Neville Christian',
          status: 'pending'
        };
        updatedRequests = [newItem, ...requests];
      }
      setRequests(updatedRequests);
      saveMockData('purchase_requests', updatedRequests);
    } else {
      try {
        if (selectedRequest) {
          const { error } = await supabase
            .from('purchase_requests')
            .update(formData)
            .eq('id', selectedRequest.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('purchase_requests')
            .insert([{ ...formData, project_id: '1', requested_by: 'Neville Christian', status: 'pending' }]);
          if (error) throw error;
        }
        fetchRequests();
      } catch (error) {
        console.error('Error saving request:', error);
      }
    }
    setIsModalOpen(false);
  };

  const handleEdit = (item: PurchaseRequest) => {
    setSelectedRequest(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    if (isMockMode) {
      const updatedRequests = requests.filter(item => item.id !== id);
      setRequests(updatedRequests);
      saveMockData('purchase_requests', updatedRequests);
    } else {
      try {
        const { error } = await supabase
          .from('purchase_requests')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchRequests();
      } catch (error) {
        console.error('Error deleting request:', error);
      }
    }
  };

  const handleStatusChange = async (id: string, status: PurchaseRequest['status']) => {
    if (isMockMode) {
      const updatedRequests = requests.map(item => item.id === id ? { ...item, status } : item);
      setRequests(updatedRequests);
      saveMockData('purchase_requests', updatedRequests);
    } else {
      try {
        const { error } = await supabase
          .from('purchase_requests')
          .update({ status })
          .eq('id', id);
        if (error) throw error;
        fetchRequests();
      } catch (error) {
        console.error('Error changing status:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'ordered': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredRequests = requests.filter(item => 
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.requested_by.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-slate-900">Purchase Request</h1>
            <p className="text-slate-500">Permintaan Pembelian Material Internal</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { setSelectedRequest(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Buat Permintaan
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari pemohon atau keterangan..." 
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
                <th className="px-6 py-3 font-semibold">Pemohon</th>
                <th className="px-6 py-3 font-semibold">Material</th>
                <th className="px-6 py-3 font-semibold text-right">Jumlah</th>
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
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada permintaan pembelian.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(item.request_date)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.requested_by}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">Material #{item.material_id}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right font-bold">{item.quantity}</td>
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
                        {item.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600" onClick={() => handleStatusChange(item.id, 'approved')}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleStatusChange(item.id, 'rejected')}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(item.id)}>
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
        title={selectedRequest ? 'Edit Permintaan Pembelian' : 'Buat Permintaan Pembelian'}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Tanggal Permintaan" 
            type="date" 
            value={formData.request_date}
            onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
            required
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Material</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.material_id}
              onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
              required
            >
              <option value="">-- Pilih Material --</option>
              <option value="1">Semen Tiga Roda (Sack)</option>
              <option value="2">Bata Merah (Pcs)</option>
              <option value="3">Pasir Cor (m3)</option>
            </select>
          </div>
          <Input 
            label="Jumlah yang Dibutuhkan" 
            type="number" 
            placeholder="0" 
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
            required
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Keterangan / Alasan</label>
            <textarea 
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Isi alasan permintaan material..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit">Kirim Permintaan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseRequestsPage;



