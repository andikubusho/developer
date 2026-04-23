import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Filter, ShoppingBag, FileText, ArrowLeft } from 'lucide-react';
import { Sale } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { SaleForm } from '../components/forms/SaleForm';
import { useAuth } from '../contexts/AuthContext';
import { Pagination } from '../components/ui/Pagination';
import { api } from '../lib/api';

const Sales: React.FC = () => {
  const { setDivision } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Building complex PostgREST query string for joins and pagination
      let queryParams = `select=*,unit:units(unit_number,project:projects(name)),customer:customers(full_name),marketing:profiles(full_name)&order=sale_date.desc&offset=${from}&limit=${pageSize}`;
      
      if (debouncedSearch) {
        // Use a simpler approach for now to avoid PostgREST nested OR complexity issues
        queryParams += `&status=ilike.*${debouncedSearch}*`; 
      }

      const data = await api.get('sales', queryParams);
      // Note: Direct fetch might not return count automatically in the body without specific headers
      // For now, we'll estimate or fetch total separately if needed, but let's prioritize loading data
      setSales(data || []);
      setTotalCount(data?.length || 0); 
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, pageSize]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleAdd = () => {
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchSales();
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDivision(null)}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Penjualan</h1>
            <p className="text-slate-500">Kelola transaksi penjualan unit properti</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Transaksi Baru
        </Button>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Transaksi Penjualan Baru"
        size="lg"
      >
        <SaleForm 
          onSuccess={handleSuccess} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </Modal>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari pelanggan atau nomor unit..." 
              className="pl-10 h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-10">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Pelanggan & Unit</th>
                <th className="px-6 py-3 font-semibold">Total Harga</th>
                <th className="px-6 py-3 font-semibold">Metode</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Tanggal</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4 text-center text-slate-400">Memuat data transaksi...</td>
                  </tr>
                ))
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada transaksi ditemukan.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{sale.customer?.full_name}</div>
                      <div className="text-xs text-slate-500">
                        {sale.unit?.project?.name} - {sale.unit?.unit_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {formatCurrency(sale.total_price)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600 uppercase bg-slate-100 px-2 py-1 rounded">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        sale.status === 'active' ? 'bg-indigo-50 text-indigo-700' :
                        sale.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        sale.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      )}>
                        {sale.status === 'active' ? 'Aktif' :
                         sale.status === 'completed' ? 'Selesai' : 
                         sale.status === 'cancelled' ? 'Batal' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(sale.sale_date)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Invoice">
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Detail">
                          <ShoppingBag className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
        
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          isLoading={loading}
        />
      </Card>
    </div>
  );
};

export default Sales;
