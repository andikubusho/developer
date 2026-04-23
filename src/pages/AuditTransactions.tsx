import React, { useState, useEffect } from 'react';
import { Search, Filter, ShieldCheck, ArrowLeft, Eye, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { AuditLog } from '../types';
import { formatDate, cn } from '../lib/utils';

const AuditTransactionsPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    if (isMockMode) {
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          action: 'create',
          module: 'Sales',
          description: 'Membuat pesanan baru untuk unit A-01',
          user_id: '1',
          timestamp: '2026-03-27T10:00:00Z',
          metadata: { unit_id: 'A-01', amount: 500000000 },
          user: { full_name: 'Neville Christian' } as any
        },
        {
          id: '2',
          action: 'update',
          module: 'Keuangan',
          description: 'Mengubah status pembayaran KPR unit B-05',
          user_id: '2',
          timestamp: '2026-03-27T09:30:00Z',
          metadata: { old_status: 'pending', new_status: 'paid' },
          user: { full_name: 'Siti Aminah' } as any
        },
        {
          id: '3',
          action: 'delete',
          module: 'Teknik',
          description: 'Menghapus item RAB Proyek X',
          user_id: '1',
          timestamp: '2026-03-26T15:45:00Z',
          metadata: { item_id: 'RAB-123' },
          user: { full_name: 'Neville Christian' } as any
        }
      ];
      setAuditLogs(mockLogs);
    }
    setLoading(false);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-700';
      case 'update': return 'bg-blue-100 text-blue-700';
      case 'delete': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredLogs = auditLogs.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold text-slate-900">Audit Transaksi</h1>
            <p className="text-slate-500">Log Aktivitas dan Perubahan Data Sistem</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Log
          </Button>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Temuan Anomali
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari aktivitas, modul, atau user..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="w-full sm:w-auto h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">Semua Modul</option>
            <option value="Sales">Sales</option>
            <option value="Keuangan">Keuangan</option>
            <option value="Teknik">Teknik</option>
          </select>
        </div>

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Waktu</th>
                <th className="px-6 py-3 font-semibold">User</th>
                <th className="px-6 py-3 font-semibold">Modul</th>
                <th className="px-6 py-3 font-semibold">Aksi</th>
                <th className="px-6 py-3 font-semibold">Deskripsi</th>
                <th className="px-6 py-3 font-semibold text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada log aktivitas.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(item.timestamp).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.user?.full_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{item.module}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        getActionColor(item.action)
                      )}>
                        {item.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
      </Card>
    </div>
  );
};

export default AuditTransactionsPage;



