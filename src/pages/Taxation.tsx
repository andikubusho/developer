import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Receipt, ArrowLeft, Edit, Trash2, Download, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';

interface TaxRecord {
  id: string;
  date: string;
  type: 'PPN' | 'PPh 21' | 'PPh 23' | 'PPh Final';
  description: string;
  amount: number;
  status: 'unpaid' | 'paid';
  due_date: string;
}

const TaxationPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTaxRecords();
  }, []);

  const fetchTaxRecords = async () => {
    setLoading(true);
    if (isMockMode) {
      const mockTax: TaxRecord[] = [
        {
          id: '1',
          date: '2026-03-27',
          type: 'PPh Final',
          description: 'Pajak Final Penjualan Unit A-01',
          amount: 7500000,
          status: 'paid',
          due_date: '2026-04-10'
        },
        {
          id: '2',
          date: '2026-03-20',
          type: 'PPh 21',
          description: 'Pajak Gaji Karyawan Maret 2026',
          amount: 12500000,
          status: 'unpaid',
          due_date: '2026-04-10'
        },
        {
          id: '3',
          date: '2026-03-15',
          type: 'PPN',
          description: 'PPN Masukan Pembelian Material',
          amount: 1500000,
          status: 'paid',
          due_date: '2026-04-15'
        }
      ];
      setTaxRecords(mockTax);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'unpaid': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredTax = taxRecords.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold text-slate-900">Perpajakan</h1>
            <p className="text-slate-500">Manajemen Kewajiban Pajak Perusahaan</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Laporan Pajak
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Input Data Pajak
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari jenis pajak atau keterangan..." 
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Tanggal</th>
                <th className="px-6 py-3 font-semibold">Jenis Pajak</th>
                <th className="px-6 py-3 font-semibold">Keterangan</th>
                <th className="px-6 py-3 font-semibold text-right">Nilai Pajak</th>
                <th className="px-6 py-3 font-semibold">Jatuh Tempo</th>
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
              ) : filteredTax.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data perpajakan.
                  </td>
                </tr>
              ) : (
                filteredTax.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">{item.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(item.amount)}</td>
                    <td className="px-6 py-4 text-sm text-red-500 font-medium">{formatDate(item.due_date)}</td>
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
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Input Data Pajak"
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal Transaksi" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Jenis Pajak</label>
              <select className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="PPN">PPN (11%)</option>
                <option value="PPh 21">PPh 21 (Gaji)</option>
                <option value="PPh 23">PPh 23 (Jasa)</option>
                <option value="PPh Final">PPh Final (Penjualan)</option>
              </select>
            </div>
          </div>
          <Input label="Keterangan" placeholder="Contoh: Pajak Penjualan Unit A-01" />
          <Input label="Nilai Pajak (Rp)" type="number" placeholder="Rp 0" />
          <Input label="Jatuh Tempo Pembayaran" type="date" />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button onClick={() => setIsModalOpen(false)}>Simpan Data Pajak</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TaxationPage;
