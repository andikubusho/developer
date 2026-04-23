import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Search, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

const RAB: React.FC = () => {
  const { setDivision } = useAuth();
  const [rabs, setRabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRabs();
  }, []);

  const fetchRabs = async () => {
    try {
      setLoading(true);
      const data = await api.get('rab', 'select=*,project:projects(name)&order=created_at.desc');
      setRabs(data || []);
    } catch (error) {
      console.error('Error fetching RAB:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">RAB Proyek</h1>
            <p className="text-slate-500">Rencana Anggaran Biaya pembangunan</p>
          </div>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Buat RAB Baru</Button>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Proyek</th>
                <th className="px-6 py-3 font-semibold">Kategori</th>
                <th className="px-6 py-3 font-semibold text-right">Total Anggaran</th>
                <th className="px-6 py-3 font-semibold text-right">Terpakai</th>
                <th className="px-6 py-3 font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Memuat data...</td></tr>
              ) : rabs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">Belum ada data RAB.</td></tr>
              ) : (
                rabs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{r.project?.name || 'Proyek Umum'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{r.category}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(r.total_budget)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">{formatCurrency(r.spent_amount || 0)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(r.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RAB;
