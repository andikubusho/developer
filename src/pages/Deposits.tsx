import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ArrowLeft, Edit, Trash2, CheckCircle2, Clock, RotateCcw, Landmark, Wallet } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Deposit, Lead } from '../types';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { api } from '../lib/api';
import ConsultantDataFilter from '../components/ConsultantDataFilter';
import { useCanViewAll } from '../hooks/usePermissions';

const Deposits: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision, profile } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const canViewAll = useCanViewAll('deposits');
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | 'all'>(
    canViewAll ? (localStorage.getItem('filter_consultant_id') || 'all') : (profile?.consultant_id || 'none')
  );

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    phone: '',
    amount: 0,
    payment_type: 'cash' as 'cash' | 'bank',
    bank_account_id: '',
    submission: '',
    description: '',
    consultant_id: ''
  });
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [selectedConsultantId]);

  const fetchData = async () => {
    setLoading(true);
    await fetchStaff();
    await fetchBanks();
    await fetchDeposits();
    setLoading(false);
  };

  const fetchStaff = async () => {
    try {
      const data = await api.get('consultants', 'select=id,name&order=name.asc');
      setStaff(data || []);
    } catch (err) {
      console.error('Fetch Staff Failed:', err);
    }
  };

  const fetchBanks = async () => {
    try {
      const data = await api.get('bank_accounts', 'select=id,bank_name,account_number&order=bank_name.asc');
      setBanks(data || []);
    } catch (err) {
      console.error('Fetch Banks Failed:', err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    
    if (isModalOpen && formData.consultant_id) {
      setLeads([]); 
      api.get('leads', `select=*&consultant_id=eq.${formData.consultant_id}&order=name.asc`, { signal: controller.signal })
        .then(data => setLeads(data || []))
        .catch(err => { if (err.name !== 'AbortError') console.error(err); });
    } else {
      setLeads([]);
    }

    return () => controller.abort();
  }, [formData.consultant_id, isModalOpen]);

  useEffect(() => {
    if (selectedDeposit) {
      setFormData({
        date: selectedDeposit.date.split('T')[0],
        name: selectedDeposit.name,
        phone: selectedDeposit.phone,
        amount: selectedDeposit.amount,
        payment_type: selectedDeposit.payment_type,
        bank_account_id: (selectedDeposit as any).bank_account_id || '',
        submission: selectedDeposit.submission,
        description: selectedDeposit.description || '',
        consultant_id: (selectedDeposit as any).consultant_id || ''
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        name: '',
        phone: '',
        amount: 0,
        payment_type: 'cash',
        bank_account_id: '',
        submission: '',
        description: '',
        consultant_id: profile?.consultant_id || ''
      });
    }
  }, [selectedDeposit, isModalOpen, profile]);

  const fetchDeposits = async () => {
    try {
      const filterParam = selectedConsultantId !== 'all' ? `&consultant_id=eq.${selectedConsultantId}` : '';
      const data = await api.get('deposits', `select=*,consultant:consultants(name),bank:bank_accounts(bank_name,account_number)&order=created_at.desc${filterParam}`);
      setDeposits(data || []);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    }
  };

  const handleEdit = (deposit: Deposit) => {
    setEditingDeposit(deposit);
    setIsModalOpen(true);
  };

  const handleVerify = async (deposit: Deposit) => {
    if (!confirm('Verifikasi titipan ini? Mutasi arus kas akan dicatat.')) return;
    try {
      setLoading(true);
      // 1. Update status
      await api.update('deposits', deposit.id, { status: 'verified' });

      // 2. Insert to Cash Flow
      const cashFlowPayload = {
        date: deposit.date,
        description: `Titipan Konsumen - ${deposit.name} (${deposit.submission})`,
        type: 'in',
        category: 'Titipan Konsumen',
        amount: deposit.amount,
        reference_id: deposit.id,
        bank_account_id: deposit.payment_type === 'bank' ? (deposit as any).bank_account_id : null
      };

      await api.insert('cash_flow', cashFlowPayload);
      await fetchDeposits();
      alert('Titipan berhasil diverifikasi.');
    } catch (error: any) {
      alert(`Gagal verifikasi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnverify = async (deposit: Deposit) => {
    if (!confirm('Batalkan verifikasi? Mutasi arus kas terkait akan dihapus.')) return;
    try {
      setLoading(true);
      // 1. Revert status
      await api.update('deposits', deposit.id, { status: 'pending' });

      // 2. Delete from Cash Flow
      const cfData = await api.get('cash_flow', `reference_id=eq.${deposit.id}`);
      if (cfData && cfData.length > 0) {
        for (const cf of cfData) {
          await api.delete('cash_flow', cf.id);
        }
      }
      await fetchDeposits();
      alert('Verifikasi dibatalkan.');
    } catch (error: any) {
      alert(`Gagal membatalkan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = {
        date: formData.date,
        name: formData.name,
        phone: formData.phone,
        amount: formData.amount,
        payment_type: formData.payment_type,
        bank_account_id: formData.payment_type === 'bank' ? (formData.bank_account_id || null) : null,
        submission: formData.submission,
        consultant_id: formData.consultant_id || null,
        description: formData.description
      };
      if (selectedDeposit) {
        await api.update('deposits', selectedDeposit.id, payload);
      } else {
        await api.insert('deposits', payload);
      }
      await fetchDeposits();
      setIsModalOpen(false);
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data titipan ini? Mutasi kas terkait juga akan dihapus.')) return;
    try {
      setLoading(true);
      const cfData = await api.get('cash_flow', `reference_id=eq.${id}`);
      if (cfData && cfData.length > 0) {
        for (const cf of cfData) {
          await api.delete('cash_flow', cf.id);
        }
      }
      await api.delete('deposits', id);
      await fetchDeposits();
    } catch (error: any) {
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeposits = deposits.filter(d => 
    (d.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (d.phone || '').includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-1 sm:p-2 h-auto">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-text-primary tracking-tight">Titipan</h1>
            <p className="text-[10px] sm:text-sm text-text-secondary font-medium uppercase tracking-widest">Dana Pra-SPK</p>
          </div>
        </div>
        <Button size="sm" className="w-full sm:w-auto rounded-xl text-[10px] sm:text-sm py-3" onClick={() => { setSelectedDeposit(null); setIsModalOpen(true); }}>
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Input Titipan
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <ConsultantDataFilter 
          value={selectedConsultantId}
          menuKey="deposits"
          onChange={(id) => setSelectedConsultantId(id)}
        />
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Cari nama atau telepon..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
              <THead>
                <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                  <TH className="px-3 py-3 font-black hidden sm:table-cell">Tanggal</TH>
                  <TH className="px-3 py-3 font-black">Pelanggan</TH>
                  <TH className="px-3 py-3 font-black text-right">Nilai</TH>
                  <TH className="px-3 py-3 font-black hidden md:table-cell">Metode</TH>
                  <TH className="px-3 py-3 font-black text-center">Status</TH>
                  <TH className="px-3 py-3 font-black text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-muted">Memuat...</TD></TR>
                ) : filteredDeposits.length === 0 ? (
                  <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-secondary text-sm">Tidak ada data.</TD></TR>
                ) : (
                  filteredDeposits.map((d) => (
                    <TR key={d.id} className="hover:bg-white/30 transition-colors">
                      <TD className="px-3 py-4 text-[10px] text-text-secondary hidden sm:table-cell whitespace-nowrap">{formatDate(d.date)}</TD>
                      <TD className="px-3 py-4">
                        <div className="font-black text-text-primary text-xs whitespace-nowrap">{d.name}</div>
                        <div className="text-[10px] text-text-secondary sm:hidden whitespace-nowrap">{formatDate(d.date)}</div>
                        <div className="text-[9px] text-accent-dark font-bold md:hidden">{(d as any).consultant?.name || '-'}</div>
                      </TD>
                      <TD className="px-3 py-4 text-[10px] font-black text-emerald-600 text-right whitespace-nowrap">{formatCurrency(d.amount)}</TD>
                      <TD className="px-3 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          {d.payment_type === 'bank' ? (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[8px] font-black uppercase">
                              <Landmark className="w-2.5 h-2.5" /> {(d as any).bank?.bank_name || 'BANK'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-black uppercase">
                              <Wallet className="w-2.5 h-2.5" /> KAS
                            </span>
                          )}
                        </div>
                      </TD>
                      <TD className="px-3 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {(d as any).status === 'verified' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          ) : (d as any).status === 'used' ? (
                            <CheckCircle2 className="w-3 h-3 text-blue-500" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-500" />
                          )}
                        </div>
                      </TD>
                      <TD className="px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(d as any).status === 'verified' ? (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-600" onClick={() => handleUnverify(d)}>
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(d)}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              <Button variant="outline" size="sm" className="h-7 text-[8px] px-1.5" onClick={() => handleVerify(d)}>Verify</Button>
                            </>
                          )}
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedDeposit ? 'Edit Titipan' : 'Input Titipan'}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
            <CurrencyInput label="Nilai Titipan" value={formData.amount} onValueChange={(values) => setFormData({ ...formData, amount: values.floatValue || 0 })} required />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-4">Konsultan Property <span className="text-red-500">*</span></label>
            <select 
              className="w-full h-11 rounded-pill glass-input px-6 text-sm focus:outline-none bg-white/50 border border-white/40" 
              value={formData.consultant_id}
              onChange={(e) => setFormData({ ...formData, consultant_id: e.target.value })}
              required
              disabled={!canViewAll && !!profile?.consultant_id}
            >
              <option value="">Pilih Konsultan...</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-4">Pilih Calon Konsumen (Opsional)</label>
            <select 
              className="w-full h-11 rounded-pill glass-input px-6 text-sm focus:outline-none bg-white/50 border border-white/40" 
              onChange={(e) => {
                const lead = leads.find(l => l.id === e.target.value);
                if (lead) setFormData({ ...formData, name: lead.name, phone: lead.phone });
              }} 
              value=""
              disabled={!formData.consultant_id}
            >
              <option value="">{formData.consultant_id ? 'Pilih dari Lead...' : 'Pilih konsultan terlebih dahulu'}</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Nama Konsumen" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="No. Telp" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
          </div>

          <div className="space-y-3 p-4 rounded-2xl bg-white/30 border border-white/40">
            <label className="text-xs font-black text-text-secondary uppercase tracking-widest">Metode Pembayaran</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-primary">
                <input type="radio" className="w-4 h-4 accent-accent-dark" checked={formData.payment_type === 'cash'} onChange={() => setFormData({ ...formData, payment_type: 'cash' })} /> 
                <Wallet className="w-4 h-4 text-amber-600" /> Cash
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-primary">
                <input type="radio" className="w-4 h-4 accent-blue-600" checked={formData.payment_type === 'bank'} onChange={() => setFormData({ ...formData, payment_type: 'bank' })} /> 
                <Landmark className="w-4 h-4 text-blue-600" /> Bank Transfer
              </label>
            </div>

            {formData.payment_type === 'bank' && (
              <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <select 
                  className="w-full h-11 rounded-pill glass-input px-6 text-sm focus:outline-none bg-white border-white/60" 
                  value={formData.bank_account_id}
                  onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                  required={formData.payment_type === 'bank'}
                >
                  <option value="">Pilih Rekening Bank...</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <Input label="Pengajuan" value={formData.submission} onChange={(e) => setFormData({ ...formData, submission: e.target.value })} required />
          <textarea 
            className="w-full rounded-2xl border border-white/40 p-4 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-accent-dark/20" 
            placeholder="Catatan tambahan (opsional)..." 
            rows={3}
            value={formData.description} 
            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
          />
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan Data</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Deposits;
