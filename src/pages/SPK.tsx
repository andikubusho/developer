import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const SPK: React.FC = () => {
  const { setDivision } = useAuth();
  const [spks, setSpks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpks();
  }, []);

  const fetchSpks = async () => {
    try {
      setLoading(true);
      // Query table spks as seen in check_tables.js
      const data = await api.get('spks', 'select=*,project:projects(name)&order=created_at.desc');
      setSpks(data || []);
    } catch (error) {
      console.error('Error fetching SPK:', error);
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
            <h1 className="text-2xl font-bold text-slate-900">SPK Kontraktor</h1>
            <p className="text-slate-500">Surat Perintah Kerja pelaksanaan proyek</p>
          </div>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Buat SPK Baru</Button>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">No. SPK</th>
                <th className="px-6 py-3 font-semibold">Proyek</th>
                <th className="px-6 py-3 font-semibold">Penerima</th>
                <th className="px-6 py-3 font-semibold text-right">Nilai Kontrak</th>
                <th className="px-6 py-3 font-semibold text-center">Status</th>
                <th className="px-6 py-3 font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">Memuat data...</td></tr>
              ) : spks.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">Belum ada data SPK.</td></tr>
              ) : (
                spks.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 uppercase">SPK-{s.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{s.project?.name || 'Proyek Umum'}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">{s.contractor_name || '-'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(s.contract_value)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center items-center gap-1.5">
                        {s.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                        <span className={cn('text-xs font-medium capitalize', s.status === 'completed' ? 'text-emerald-700' : 'text-amber-700')}>{s.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(s.created_at)}</td>
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

export default SPK;
