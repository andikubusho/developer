import React, { useState, useEffect } from 'react';
import { Search, Filter, Package, ArrowLeft, Eye, Download, AlertTriangle, CheckCircle, RefreshCcw, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { AuditStockItem } from '../types';
import { supabase } from '../lib/supabase';
import { getMockData, saveMockData } from '../lib/storage';

const AuditStockPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [stockItems, setStockItems] = useState<AuditStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    material_name: '',
    system_stock: 0,
    physical_stock: 0,
    unit: 'Sack',
    last_audit: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchStockAudit();
  }, []);

  const fetchStockAudit = async () => {
    setLoading(true);
    if (isMockMode) {
      const defaultStock: AuditStockItem[] = [
        {
          id: '1',
          material_name: 'Semen Tiga Roda',
          system_stock: 500,
          physical_stock: 495,
          difference: -5,
          unit: 'Sack',
          last_audit: '2026-03-27',
          status: 'mismatch'
        },
        {
          id: '2',
          material_name: 'Besi Beton 10mm',
          system_stock: 200,
          physical_stock: 200,
          difference: 0,
          unit: 'Batang',
          last_audit: '2026-03-27',
          status: 'match'
        },
        {
          id: '3',
          material_name: 'Pasir Cor',
          system_stock: 50,
          physical_stock: 48,
          difference: -2,
          unit: 'm3',
          last_audit: '2026-03-26',
          status: 'mismatch'
        }
      ];
      setStockItems(getMockData<AuditStockItem>('audit_stock', defaultStock));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audit_stock')
        .select('*')
        .order('last_audit', { ascending: false });
      if (error) throw error;
      setStockItems(data || []);
    } catch (error) {
      console.error('Error fetching stock audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const difference = formData.physical_stock - formData.system_stock;
    const status = difference === 0 ? 'match' : 'mismatch';
    const auditData = { ...formData, difference, status };

    if (isMockMode) {
      const newItem: AuditStockItem = {
        id: Math.random().toString(36).substr(2, 9),
        ...auditData
      };
      const updatedStock = [newItem, ...stockItems];
      setStockItems(updatedStock);
      saveMockData('audit_stock', updatedStock);
    } else {
      try {
        const { error } = await supabase
          .from('audit_stock')
          .insert([auditData]);
        if (error) throw error;
        fetchStockAudit();
      } catch (error) {
        console.error('Error saving stock audit:', error);
      }
    }
    setIsModalOpen(false);
    setFormData({
      material_name: '',
      system_stock: 0,
      physical_stock: 0,
      unit: 'Sack',
      last_audit: new Date().toISOString().split('T')[0]
    });
  };

  const filteredStock = stockItems.filter(item => 
    item.material_name.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold text-slate-900">Audit Stok</h1>
            <p className="text-slate-500">Verifikasi Fisik Stok Material Proyek</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Sinkronisasi Stok
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Mulai Audit Baru
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-indigo-600">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Item Diaudit</p>
              <h3 className="text-2xl font-bold text-slate-900">750 Item</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-green-600">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Stok Sesuai</p>
              <h3 className="text-2xl font-bold text-slate-900">712 Item</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-red-600">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Stok Selisih</p>
              <h3 className="text-2xl font-bold text-slate-900">38 Item</h3>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari nama material..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter Selisih
          </Button>
        </div>

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Material</th>
                <th className="px-6 py-3 font-semibold text-right">Stok Sistem</th>
                <th className="px-6 py-3 font-semibold text-right">Stok Fisik</th>
                <th className="px-6 py-3 font-semibold text-right">Selisih</th>
                <th className="px-6 py-3 font-semibold">Satuan</th>
                <th className="px-6 py-3 font-semibold">Tgl Audit</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data audit stok.
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.material_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">{item.system_stock}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">{item.physical_stock}</td>
                    <td className={cn(
                      "px-6 py-4 text-sm font-bold text-right",
                      item.difference < 0 ? "text-red-600" : item.difference > 0 ? "text-green-600" : "text-slate-900"
                    )}>
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.unit}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(item.last_audit)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        item.status === 'match' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {item.status === 'match' ? 'Sesuai' : 'Selisih'}
                      </span>
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
        title="Input Audit Stok Material"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Nama Material" 
            placeholder="Contoh: Semen Tiga Roda" 
            value={formData.material_name}
            onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Stok Sistem" 
              type="number" 
              value={formData.system_stock}
              onChange={(e) => setFormData({ ...formData, system_stock: Number(e.target.value) })}
              required
            />
            <Input 
              label="Stok Fisik" 
              type="number" 
              value={formData.physical_stock}
              onChange={(e) => setFormData({ ...formData, physical_stock: Number(e.target.value) })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Satuan" 
              placeholder="Sack, Batang, m3, dll" 
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
            />
            <Input 
              label="Tanggal Audit" 
              type="date" 
              value={formData.last_audit}
              onChange={(e) => setFormData({ ...formData, last_audit: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan Hasil Audit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AuditStockPage;



