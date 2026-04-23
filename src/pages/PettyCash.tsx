import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Wallet, ArrowLeft, Edit, Trash2, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';

interface PettyCashItem {
  id: string;
  date: string;
  description: string;
  type: 'in' | 'out';
  amount: number;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
}

const PettyCashPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [pettyCash, setPettyCash] = useState<PettyCashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPettyCash();
  }, []);

  const fetchPettyCash = async () => {
    setLoading(true);
    if (isMockMode) {
      const mockPetty: PettyCashItem[] = [
        {
          id: '1',
          date: '2026-03-27',
          description: 'Pembelian ATK Kantor',
          type: 'out',
          amount: 250000,
          requested_by: 'Siti Aminah',
          status: 'approved'
        },
        {
          id: '2',
          date: '2026-03-26',
          description: 'Top up Petty Cash',
          type: 'in',
          amount: 5000000,
          requested_by: 'Keuangan',
          status: 'approved'
        },
        {
          id: '3',
          date: '2026-03-25',
          description: 'Biaya Konsumsi Rapat',
          type: 'out',
          amount: 150000,
          requested_by: 'Budi Santoso',
          status: 'pending'
        }
      ];
      setPettyCash(mockPetty);
    }
    setLoading(false);
  };

  const currentBalance = pettyCash
    .filter(i => i.status === 'approved')
    .reduce((sum, i) => i.type === 'in' ? sum + i.amount : sum - i.amount, 0);

  const filteredPetty = pettyCash.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            <h1 className="text-2xl font-bold text-slate-900">Petty Cash</h1>
            <p className="text-slate-500">Manajemen Kas Kecil Operasional</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Laporan
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Input Pengeluaran
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-indigo-600 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-indigo-100 text-sm font-medium">Saldo Kas Kecil Saat Ini</p>
            <h3 className="text-3xl font-bold">{formatCurrency(currentBalance)}</h3>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari deskripsi atau pemohon..." 
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
                <th className="px-6 py-3 font-semibold">Deskripsi</th>
                <th className="px-6 py-3 font-semibold text-right">Jumlah</th>
                <th className="px-6 py-3 font-semibold">Tipe</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredPetty.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data kas kecil.
                  </td>
                </tr>
              ) : (
                filteredPetty.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.requested_by}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(item.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        item.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {item.type === 'in' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        item.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        item.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500">
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
        title="Input Pengeluaran Kas Kecil"
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Input label="Tanggal" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
          <Input label="Pemohon" placeholder="Nama pemohon" />
          <Input label="Deskripsi Pengeluaran" placeholder="Contoh: Pembelian ATK" />
          <Input label="Jumlah (Rp)" type="number" placeholder="Rp 0" />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button onClick={() => setIsModalOpen(false)}>Simpan Pengeluaran</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PettyCashPage;



