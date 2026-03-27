import React, { useState, useEffect } from 'react';
import { Search, Filter, DollarSign, ArrowLeft, Eye, Download, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { AuditCostItem } from '../types';
import { supabase } from '../lib/supabase';
import { getMockData, saveMockData } from '../lib/storage';

const AuditCostsPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [costItems, setCostItems] = useState<AuditCostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    project_name: 'Grand Residence Phase 1',
    category: '',
    budget: 0,
    actual: 0
  });

  useEffect(() => {
    fetchCostAudit();
  }, []);

  const fetchCostAudit = async () => {
    setLoading(true);
    if (isMockMode) {
      const defaultCosts: AuditCostItem[] = [
        {
          id: '1',
          project_name: 'Grand Residence Phase 1',
          category: 'Pekerjaan Tanah',
          budget: 500000000,
          actual: 525000000,
          variance: -25000000,
          variance_percent: -5,
          status: 'warning'
        },
        {
          id: '2',
          project_name: 'Grand Residence Phase 1',
          category: 'Pekerjaan Struktur',
          budget: 1200000000,
          actual: 1150000000,
          variance: 50000000,
          variance_percent: 4.1,
          status: 'safe'
        },
        {
          id: '3',
          project_name: 'Grand Residence Phase 1',
          category: 'Pekerjaan Finishing',
          budget: 800000000,
          actual: 950000000,
          variance: -150000000,
          variance_percent: -18.75,
          status: 'danger'
        }
      ];
      setCostItems(getMockData<AuditCostItem>('audit_costs', defaultCosts));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audit_costs')
        .select('*')
        .order('project_name', { ascending: true });
      if (error) throw error;
      setCostItems(data || []);
    } catch (error) {
      console.error('Error fetching cost audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const variance = formData.budget - formData.actual;
    const variance_percent = Number(((variance / formData.budget) * 100).toFixed(2));
    let status: 'safe' | 'warning' | 'danger' = 'safe';
    
    if (variance_percent < -10) status = 'danger';
    else if (variance_percent < 0) status = 'warning';

    const auditData = { ...formData, variance, variance_percent, status };

    if (isMockMode) {
      const newItem: AuditCostItem = {
        id: Math.random().toString(36).substr(2, 9),
        ...auditData
      };
      const updatedCosts = [newItem, ...costItems];
      setCostItems(updatedCosts);
      saveMockData('audit_costs', updatedCosts);
    } else {
      try {
        const { error } = await supabase
          .from('audit_costs')
          .insert([auditData]);
        if (error) throw error;
        fetchCostAudit();
      } catch (error) {
        console.error('Error saving cost audit:', error);
      }
    }
    setIsModalOpen(false);
    setFormData({
      project_name: 'Grand Residence Phase 1',
      category: '',
      budget: 0,
      actual: 0
    });
  };

  const filteredCosts = costItems.filter(item => 
    item.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold text-slate-900">Audit Biaya</h1>
            <p className="text-slate-500">Analisis Varian Budget vs Realisasi Proyek</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Temuan
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Laporan Varian
          </Button>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Temuan Overbudget
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-indigo-600">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Budget</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(2500000000)}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-green-600">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Realisasi</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(2625000000)}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-red-600">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Varian</p>
              <h3 className="text-2xl font-bold text-slate-900 text-red-600">-{formatCurrency(125000000)}</h3>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari proyek atau kategori..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter Proyek
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Proyek / Kategori</th>
                <th className="px-6 py-3 font-semibold text-right">Budget</th>
                <th className="px-6 py-3 font-semibold text-right">Realisasi</th>
                <th className="px-6 py-3 font-semibold text-right">Varian (Rp)</th>
                <th className="px-6 py-3 font-semibold text-right">Varian (%)</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredCosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data audit biaya.
                  </td>
                </tr>
              ) : (
                filteredCosts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">{item.project_name}</span>
                        <span className="text-xs text-slate-500">{item.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right font-medium">{formatCurrency(item.budget)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right font-medium">{formatCurrency(item.actual)}</td>
                    <td className={cn(
                      "px-6 py-4 text-sm font-bold text-right",
                      item.variance < 0 ? "text-red-600" : "text-green-600"
                    )}>
                      {item.variance < 0 ? `-${formatCurrency(Math.abs(item.variance))}` : `+${formatCurrency(item.variance)}`}
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-sm font-bold text-right",
                      item.variance_percent < 0 ? "text-red-600" : "text-green-600"
                    )}>
                      {item.variance_percent > 0 ? `+${item.variance_percent}%` : `${item.variance_percent}%`}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        item.status === 'safe' ? 'bg-green-100 text-green-700' : 
                        item.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      )}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Input Audit Biaya Proyek"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Proyek</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              required
            >
              <option value="Grand Residence Phase 1">Grand Residence Phase 1</option>
              <option value="Grand Residence Phase 2">Grand Residence Phase 2</option>
            </select>
          </div>
          <Input 
            label="Kategori Pekerjaan" 
            placeholder="Contoh: Pekerjaan Atap" 
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Budget (Rp)" 
              type="number" 
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
              required
            />
            <Input 
              label="Realisasi (Rp)" 
              type="number" 
              value={formData.actual}
              onChange={(e) => setFormData({ ...formData, actual: Number(e.target.value) })}
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

export default AuditCostsPage;
