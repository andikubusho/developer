import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, ArrowLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const PurchaseRequests: React.FC = () => {
  const { setDivision } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await api.get('purchase_requests', 'select=*,project:projects(name)&order=created_at.desc');
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching PR:', error);
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
            <h1 className="text-2xl font-bold text-slate-900">Purchase Request</h1>
            <p className="text-slate-500">Permintaan pembelian material dan jasa</p>
          </div>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Buat Request Baru</Button>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">No. Request</th>
                <th className="px-6 py-3 font-semibold">Proyek</th>
                <th className="px-6 py-3 font-semibold text-right">Estimasi Biaya</th>
                <th className="px-6 py-3 font-semibold text-center">Status</th>
                <th className="px-6 py-3 font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Memuat data...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">Belum ada data permintaan.</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 uppercase">PR-{r.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{r.project?.name || 'Proyek Umum'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(r.estimated_cost)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center items-center gap-1.5">
                        {r.status === 'approved' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : r.status === 'rejected' ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                        <span className={cn(
                          'text-xs font-medium capitalize',
                          r.status === 'approved' ? 'text-emerald-700' :
                          r.status === 'rejected' ? 'text-red-700' : 'text-amber-700'
                        )}>
                          {r.status}
                        </span>
                      </div>
                    </td>
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

export default PurchaseRequests;
