import React, { useEffect, useState, useCallback } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { Plus, Search, Filter, ShoppingBag, FileText, ArrowLeft, TrendingUp, Users, CheckCircle2, MoreVertical, Download, X, Edit, Trash2, Eye, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sale } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';
import { Modal } from '../components/ui/Modal';
import { SaleForm } from '../components/forms/SaleForm';
import { SaleDetail } from '../components/details/SaleDetail';
import { useAuth } from '../contexts/AuthContext';
import { Pagination } from '../components/ui/Pagination';
import { generateWordDocument } from '../lib/documentGenerator';
import ConsultantDataFilter from '../components/ConsultantDataFilter';
import { useCanViewAll } from '../hooks/usePermissions';

interface Template {
  id: string;
  name: string;
  content: string; // base64
}

const Sales: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision, profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const canViewAll = useCanViewAll('sales');
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | 'all'>(
    canViewAll ? (localStorage.getItem('filter_consultant_id') || 'all') : (profile?.consultant_id || 'none')
  );
  
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
      const filterParam = selectedConsultantId !== 'all' ? `&consultant_id=eq.${selectedConsultantId}` : '';
      
      let queryParams = `select=*,unit:units(id,unit_number,price,project_id,project:projects(id,name)),customer:customers(id,full_name),consultant:consultants(id,name)&order=sale_date.desc&offset=${from}&limit=${pageSize}${filterParam}`;
      
      if (activeTab !== 'all') queryParams += `&status=eq.${activeTab}`;
      if (debouncedSearch) queryParams += `&or=(status.ilike.*${debouncedSearch}*,payment_method.ilike.*${debouncedSearch}*)`;

      const data = await api.get('sales', queryParams);
      setSales(data || []);
      
      let countQuery = `select=id${filterParam}`;
      if (activeTab !== 'all') countQuery += `&status=eq.${activeTab}`;
      if (debouncedSearch) countQuery += `&or=(status.ilike.*${debouncedSearch}*,payment_method.ilike.*${debouncedSearch}*)`;
      const countData = await api.get('sales', countQuery);
      setTotalCount(countData?.length || 0);
      
      const allSalesParams = `select=final_price,status${filterParam}`;
      const allSales = await api.get('sales', allSalesParams);
      if (allSales) {
        setStats({
          totalOmzet: allSales.reduce((acc: number, curr: any) => acc + (curr.status !== 'cancelled' ? curr.final_price : 0), 0),
          totalUnits: allSales.filter((s: any) => s.status !== 'cancelled').length,
          activeLeads: allSales.filter((s: any) => s.status === 'active').length
        });
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [currentPage, debouncedSearch, pageSize, activeTab, selectedConsultantId]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const handlePrintClick = async (sale: Sale) => {
    setSelectedSale(sale);
    setIsPrintModalOpen(true);
    try {
      setFetchingTemplates(true);
      const fullData = await api.get('sales', `select=*,unit:units(*,project:projects(*)),customer:customers(*),consultant:consultants(*),installments:installments(*),payments:payments(*,bank:bank_accounts(bank_name))&id=eq.${sale.id}`);
      if (fullData && fullData.length > 0) setSelectedSale(fullData[0]);
      const data = await api.get('document_templates', 'select=id,name,content');
      setTemplates(data || []);
    } catch (error) { console.error('Print Fetch Error:', error); } finally { setFetchingTemplates(false); }
  };

  const handleEditClick = (sale: Sale) => {
    setEditingSale(sale);
    setIsModalOpen(true);
  };

  const handleViewClick = async (sale: Sale) => {
    try {
      setLoading(true);
      const fullData = await api.get('sales', `select=*,unit:units(*,project:projects(*)),customer:customers(*),consultant:consultants(*),promo:promos(*),installments:installments(*),payments:payments(*,bank:bank_accounts(bank_name))&id=eq.${sale.id}`);
      if (fullData?.[0]) {
        setViewingSale(fullData[0]);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      alert('Gagal memuat detail transaksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (id: string, unitId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini? Unit akan kembali berstatus available, dan Titipan (jika ada) akan kembali menjadi aktif.')) return;
    try {
      setLoading(true);

      // 0. Check for linked deposit
      const saleData = await api.get('sales', `select=deposit_id&id=eq.${id}`);
      const linkedDepositId = saleData?.[0]?.deposit_id;

      // 1. Delete ALL related records
      await api.apiRequest(`payments?sale_id=eq.${id}`, { method: 'DELETE' });
      await api.apiRequest(`installments?sale_id=eq.${id}`, { method: 'DELETE' });
      await api.apiRequest(`kpr_disbursement?sale_id=eq.${id}`, { method: 'DELETE' });
      
      // 2. Delete the sale itself
      await api.delete('sales', id);
      
      // 3. Revert unit status
      if (unitId) await api.update('units', unitId, { status: 'available' });

      // 4. Revert Deposit Status (ROLLBACK)
      if (linkedDepositId) {
        await api.update('deposits', linkedDepositId, { status: 'verified', sale_id: null });
      }
      
      await fetchSales();
      alert('Transaksi berhasil dihapus');
    } catch (error: any) {
      alert(`Gagal menghapus transaksi: ${error.message || 'Error tidak diketahui'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async (template: Template) => {
    if (!selectedSale) return;
    try {
      const cleanBase64 = template.content.replace(/^data:.*,/, '').replace(/\s/g, '');
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      await generateWordDocument(selectedSale, blob, `${template.name}_${selectedSale.customer?.full_name}`);
      setIsPrintModalOpen(false);
    } catch (error: any) {
      alert(`Gagal membuat dokumen: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto hover:bg-white/40 rounded-xl"><ArrowLeft className="w-6 h-6 text-text-secondary" /></Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Penjualan Properti</h1>
            <p className="text-text-secondary font-medium text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Monitoring Transaksi Real-time</p>
          </div>
        </div>
        <Button className="bg-accent-dark hover:bg-accent-dark/80 text-white shadow-glass rounded-xl h-12 px-6 font-bold transition-all hover:scale-[1.02]" onClick={() => setIsModalOpen(true)}><Plus className="w-5 h-5 mr-2" />Transaksi Baru</Button>
      </div>

      <div className="flex items-center gap-4 px-2">
        <ConsultantDataFilter value={selectedConsultantId} menuKey="sales" onChange={(id) => setSelectedConsultantId(id)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6 border-none shadow-premium rounded-xl bg-gradient-to-br from-accent-dark to-accent-dark/80 text-white">
          <div className="flex justify-between items-start mb-4"><div className="p-2 bg-white/20 rounded-xl"><TrendingUp className="w-5 h-5" /></div><span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-1 rounded-xl">Total Omzet</span></div>
          <div className="text-2xl font-black">{formatCurrency(stats.totalOmzet)}</div>
        </Card>
        <Card className="p-6 border-none shadow-premium rounded-xl bg-white">
          <div className="flex justify-between items-start mb-4"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><ShoppingBag className="w-5 h-5" /></div><span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Unit Terjual</span></div>
          <div className="text-2xl font-black text-text-primary">{stats.totalUnits} <span className="text-sm font-medium text-text-muted">Unit</span></div>
        </Card>
        <Card className="p-6 border-none shadow-premium rounded-xl bg-white">
          <div className="flex justify-between items-start mb-4"><div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Users className="w-5 h-5" /></div><span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Proses Aktif</span></div>
          <div className="text-2xl font-black text-text-primary">{stats.activeLeads} <span className="text-sm font-medium text-text-muted">Konsumen</span></div>
        </Card>
      </div>

      <div className="bg-white p-2 rounded-[2rem] shadow-premium flex flex-col md:flex-row gap-2 items-center">
        <div className="flex p-1 bg-white/40 rounded-xl w-full md:w-auto">
          {['all', 'active', 'completed', 'cancelled'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("flex-1 px-6 py-2 rounded-xl text-xs font-bold transition-all", activeTab === tab ? "bg-white text-text-primary shadow-glass" : "text-text-secondary hover:text-text-primary")}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
          ))}
        </div>
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-accent-dark" />
          <input placeholder="Cari transaksi, unit, atau pelanggan..." className="w-full glass-input border-none rounded-xl py-3 pl-12 pr-4 text-sm font-medium outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <Card className="p-0 border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
              <THead>
                <TR className="bg-white/20 text-[9px] text-text-muted uppercase tracking-wider font-black">
                  <TH className="px-3 py-4">Konsumen & Unit</TH>
                  <TH className="px-3 py-4 hidden md:table-cell">Tanggal</TH>
                  <TH className="px-3 py-4 text-center">Status</TH>
                  <TH className="px-3 py-4 text-right hidden sm:table-cell">Titipan</TH>
                  <TH className="px-3 py-4 text-right">Total Akhir</TH>
                  <TH className="px-3 py-4 text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-muted font-bold uppercase tracking-widest text-[10px]">Sinkronisasi...</TD></TR>
                ) : sales.map((sale) => (
                  <TR key={sale.id} className="hover:bg-white/20 transition-all group">
                    <TD className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-accent-lavender/20 flex items-center justify-center text-accent-dark font-black text-[10px] shrink-0">{sale.customer?.full_name?.substring(0, 2).toUpperCase()}</div>
                        <div className="min-w-0">
                          <div className="font-black text-text-primary text-[11px] truncate">{sale.customer?.full_name}</div>
                          <div className="text-[9px] font-bold text-accent-dark uppercase tracking-wider truncate">{sale.unit?.unit_number} • {sale.unit?.project?.name}</div>
                        </div>
                      </div>
                    </TD>
                    <TD className="px-3 py-4 hidden md:table-cell">
                      <div className="text-[10px] font-bold text-text-secondary">{formatDate(sale.sale_date)}</div>
                    </TD>
                    <TD className="px-3 py-4 text-center">
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider", sale.status === 'active' ? "bg-amber-50 text-amber-600 border border-amber-100" : sale.status === 'completed' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-white/40 text-text-muted border border-white/40")}>{sale.status}</span>
                    </TD>
                    <TD className="px-3 py-4 text-right hidden sm:table-cell">
                      {sale.deposit_amount ? (
                        <div className="text-blue-600 font-bold text-[10px]">
                          {formatCurrency(sale.deposit_amount)}
                        </div>
                      ) : (
                        <span className="text-[10px] text-text-muted">-</span>
                      )}
                    </TD>
                    <TD className="px-3 py-4 text-right">
                      <div className="font-black text-text-primary text-[11px]">{formatCurrency(sale.final_price)}</div>
                      {sale.deposit_amount ? <div className="text-[8px] text-blue-600 font-bold sm:hidden">-{formatCurrency(sale.deposit_amount)}</div> : null}
                    </TD>
                    <TD className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewClick(sale)} className="h-7 w-7 p-0 rounded-lg hover:text-accent-dark"><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" title="Cetak Dokumen" onClick={() => handlePrintClick(sale)} className="h-7 w-7 p-0 rounded-lg hover:text-accent-dark"><FileText className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(sale)} className="h-7 w-7 p-0 rounded-lg hover:text-emerald-600"><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSale(sale.id, sale.unit_id)} className="h-7 w-7 p-0 rounded-lg hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
        </div>
      </Card>

      <Pagination currentPage={currentPage} totalCount={totalCount} pageSize={pageSize} onPageChange={setCurrentPage} />

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSale(null); }} title={editingSale ? "Edit Transaksi Penjualan" : "Transaksi Penjualan Baru"} size="5xl">
        <SaleForm initialData={editingSale} onSuccess={() => { setIsModalOpen(false); setEditingSale(null); fetchSales(); }} onCancel={() => { setIsModalOpen(false); setEditingSale(null); }} />
      </Modal>
      
      <Modal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setViewingSale(null); }} title="Detail Transaksi Penjualan" size="5xl">
        <SaleDetail sale={viewingSale} onClose={() => { setIsViewModalOpen(false); setViewingSale(null); }} />
      </Modal>

      <Modal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} title="Cetak Dokumen Otomatis">
        <div className="space-y-4 p-2">
          {fetchingTemplates ? (
            <div className="py-10 text-center animate-pulse text-text-muted font-bold">Mencari Template...</div>
          ) : templates.length === 0 ? (
            <div className="py-10 text-center text-text-muted">Belum ada template.</div>
          ) : templates.map(template => (
            <button key={template.id} onClick={() => handleDownloadTemplate(template)} className="flex items-center justify-between w-full p-4 glass-card border border-white/40 rounded-xl hover:border-accent-dark transition-all text-left group">
              <div className="flex items-center gap-4">
                <FileText className="w-5 h-5 text-accent-dark" />
                <div className="font-bold text-text-primary">{template.name}</div>
              </div>
              <Download className="w-4 h-4" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default Sales;
