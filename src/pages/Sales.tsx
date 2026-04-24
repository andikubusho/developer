import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Filter, ShoppingBag, FileText, ArrowLeft, TrendingUp, Users, CheckCircle2, MoreVertical, Download, X, Edit, Trash2 } from 'lucide-react';
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
import { generateWordDocument } from '../lib/documentGenerator';

interface Template {
  id: string;
  name: string;
  content: string; // base64
}

const Sales: React.FC = () => {
  const { setDivision } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  
  // Document Printing State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const [stats, setStats] = useState({
    totalOmzet: 0,
    totalUnits: 0,
    activeLeads: 0
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const from = (currentPage - 1) * pageSize;
      let queryParams = `select=*,unit:units(unit_number,price,project:projects(name)),customer:customers(full_name),marketing:marketing_staff(name)&order=sale_date.desc&offset=${from}&limit=${pageSize}`;
      
      if (activeTab !== 'all') queryParams += `&status=eq.${activeTab}`;
      if (debouncedSearch) queryParams += `&or=(status.ilike.*${debouncedSearch}*,payment_method.ilike.*${debouncedSearch}*)`;

      const data = await api.get('sales', queryParams);
      setSales(data || []);
      
      const allSales = await api.get('sales', 'select=final_price,status');
      if (allSales) {
        setStats({
          totalOmzet: allSales.reduce((acc: number, curr: any) => acc + (curr.status !== 'cancelled' ? curr.final_price : 0), 0),
          totalUnits: allSales.filter((s: any) => s.status !== 'cancelled').length,
          activeLeads: allSales.filter((s: any) => s.status === 'active').length
        });
      }
      setTotalCount(data?.length || 0); 
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [currentPage, debouncedSearch, pageSize, activeTab]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const handlePrintClick = async (sale: Sale) => {
    setSelectedSale(sale);
    setIsPrintModalOpen(true);
    try {
      setFetchingTemplates(true);
      // Fetch full details including installments for printing
      const fullData = await api.get('sales', `select=*,unit:units(*,project:projects(*)),customer:customers(*),marketing:marketing_staff(*),installments:installments(*)&id=eq.${sale.id}`);
      if (fullData && fullData.length > 0) {
        setSelectedSale(fullData[0]);
      }
      const data = await api.get('document_templates', 'select=id,name,content');
      setTemplates(data || []);
    } catch (error) { console.error('Print Fetch Error:', error); } finally { setFetchingTemplates(false); }
  };

  const handleEditClick = (sale: Sale) => {
    setEditingSale(sale);
    setIsModalOpen(true);
  };

  const handleDeleteSale = async (id: string, unitId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini? Unit akan kembali berstatus available.')) return;
    try {
      setLoading(true);
      // 1. Delete installments related to this sale
      await api.delete('installments', `sale_id=eq.${id}`);
      // 2. Delete the sale itself
      await api.delete('sales', id);
      // 3. Revert unit status to available
      await api.update('units', unitId, { status: 'available' });
      
      await fetchSales();
    } catch (error) {
      console.error('Delete Sale Error:', error);
      alert('Gagal menghapus transaksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async (template: Template) => {
    if (!selectedSale) return;
    try {
      // Convert base64 to Blob safely
      const cleanBase64 = template.content.replace(/^data:.*,/, '').replace(/\s/g, '');
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      await generateWordDocument(selectedSale, blob, `${template.name}_${selectedSale.customer?.full_name}`);
      setIsPrintModalOpen(false);
    } catch (error) {
      console.error('Document generation error:', error);
      alert('Gagal membuat dokumen. Periksa konsol untuk detailnya.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto hover:bg-slate-100 rounded-xl"><ArrowLeft className="w-6 h-6 text-slate-600" /></Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Penjualan Properti</h1>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Monitoring Transaksi Real-time</p>
          </div>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 rounded-2xl h-12 px-6 font-bold transition-all hover:scale-[1.02]" onClick={() => setIsModalOpen(true)}><Plus className="w-5 h-5 mr-2" />Transaksi Baru</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6 border-none shadow-premium rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
          <div className="flex justify-between items-start mb-4"><div className="p-2 bg-white/20 rounded-xl"><TrendingUp className="w-5 h-5" /></div><span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg">Total Omzet</span></div>
          <div className="text-2xl font-black">{formatCurrency(stats.totalOmzet)}</div>
          <div className="text-[10px] mt-1 text-indigo-100">Akumulasi seluruh unit terjual</div>
        </Card>
        <Card className="p-6 border-none shadow-premium rounded-3xl bg-white group hover:bg-slate-50 transition-colors">
          <div className="flex justify-between items-start mb-4"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors"><ShoppingBag className="w-5 h-5" /></div><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Unit Terjual</span></div>
          <div className="text-2xl font-black text-slate-900">{stats.totalUnits} <span className="text-sm font-medium text-slate-400">Unit</span></div>
        </Card>
        <Card className="p-6 border-none shadow-premium rounded-3xl bg-white group hover:bg-slate-50 transition-colors">
          <div className="flex justify-between items-start mb-4"><div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors"><Users className="w-5 h-5" /></div><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Proses Aktif</span></div>
          <div className="text-2xl font-black text-slate-900">{stats.activeLeads} <span className="text-sm font-medium text-slate-400">Konsumen</span></div>
        </Card>
      </div>

      <div className="bg-white p-2 rounded-[2rem] shadow-premium flex flex-col md:flex-row gap-2 items-center">
        <div className="flex p-1 bg-slate-100 rounded-2xl w-full md:w-auto">
          {['all', 'active', 'completed', 'cancelled'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("flex-1 px-6 py-2 rounded-xl text-xs font-bold transition-all", activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
          ))}
        </div>
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <input placeholder="Cari transaksi, unit, atau pelanggan..." className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <Card className="p-0 border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black"><th className="px-8 py-6">Konsumen & Unit</th><th className="px-6 py-6">Status</th><th className="px-6 py-6">Total Transaksi</th><th className="px-6 py-6">Marketing</th><th className="px-8 py-6 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (<tr key={i} className="animate-pulse"><td colSpan={5} className="px-8 py-10 text-center text-slate-300 font-bold uppercase tracking-widest">Sinkronisasi...</td></tr>))
              ) : sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs shadow-sm">{sale.customer?.full_name?.substring(0, 2).toUpperCase()}</div>
                      <div><div className="font-black text-slate-900 text-sm">{sale.customer?.full_name}</div><div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{sale.unit?.unit_number} • {sale.unit?.project?.name}</div></div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider", sale.status === 'active' ? "bg-amber-50 text-amber-600 border border-amber-100" : sale.status === 'completed' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200")}>{sale.status}</span>
                  </td>
                  <td className="px-6 py-6"><div className="font-black text-slate-900 text-sm">{formatCurrency(sale.final_price)}</div></td>
                  <td className="px-6 py-6"><div className="text-xs font-bold text-slate-600">{sale.marketing?.name || 'Internal'}</div></td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handlePrintClick(sale)} className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all text-slate-400 hover:text-indigo-600" title="Cetak Dokumen Word"><Download className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(sale)} className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all text-slate-400 hover:text-emerald-600" title="Edit Transaksi"><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSale(sale.id, sale.unit_id)} className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all text-slate-400 hover:text-red-600" title="Hapus Transaksi"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingSale(null); }} 
        title={editingSale ? "Edit Transaksi Penjualan" : "Transaksi Penjualan Baru"} 
        size="lg"
      >
        <SaleForm 
          initialData={editingSale}
          onSuccess={() => { setIsModalOpen(false); setEditingSale(null); fetchSales(); }} 
          onCancel={() => { setIsModalOpen(false); setEditingSale(null); }} 
        />
      </Modal>

      {/* PRINT MODAL (Template Selection) */}
      <Modal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} title="Cetak Dokumen Otomatis">
        <div className="space-y-4 p-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pilih Template Dokumen untuk {selectedSale?.customer?.full_name}</p>
          <div className="grid grid-cols-1 gap-3">
            {fetchingTemplates ? (
              <div className="py-10 text-center animate-pulse text-slate-300 font-bold">Mencari Template...</div>
            ) : templates.length === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">Belum ada template. Silakan unggah di menu Template Dokumen.</div>
            ) : templates.map(template => (
              <button key={template.id} onClick={() => handleDownloadTemplate(template)} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-600 hover:shadow-lg transition-all text-left group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors"><FileText className="w-5 h-5" /></div>
                  <div className="font-bold text-slate-900">{template.name}</div>
                </div>
                <Download className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Sales;
