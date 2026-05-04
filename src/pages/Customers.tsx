import React, { useEffect, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { Plus, Search, Filter, UserPlus, Mail, Phone, MapPin, ArrowLeft, Trash2, Undo2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CustomerForm } from '../components/forms/CustomerForm';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import { supabase } from '../lib/supabase';
import ConsultantDataFilter from '../components/ConsultantDataFilter';
import { useCanViewAll } from '../hooks/usePermissions';

const Customers: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { profile } = useAuth();
  const canViewAll = useCanViewAll('leads'); // We use 'leads' permission as a proxy for marketing scope
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | 'all'>(
    canViewAll ? (localStorage.getItem('filter_consultant_id') || 'all') : (profile?.consultant_id || 'none')
  );

  useEffect(() => {
    fetchCustomers();
  }, [selectedConsultantId]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const filterParam = selectedConsultantId !== 'all' ? `&consultant_id=eq.${selectedConsultantId}` : '';
      const [customerData, consultantData] = await Promise.all([
        api.get('customers', `select=*&order=full_name.asc&limit=50${filterParam}`),
        api.get('consultants', 'select=id,name'),
      ]);
      const consultantMap: Record<string, any> = {};
      (consultantData || []).forEach((c: any) => { consultantMap[c.id] = c; });
      setCustomers((customerData || []).map((c: any) => ({
        ...c,
        consultant: c.consultant_id ? (consultantMap[c.consultant_id] || null) : null,
      })));
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    (c.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm)
  );

  const handleAdd = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleReverseConvert = async (customer: Customer) => {
    // 1. Validasi Transaksi Aktif (Pencegahan Integritas Data)
    try {
      setLoading(true);
      
      // Cek Penjualan aktif
      const activeSales = await api.get('sales', `customer_id=eq.${customer.id}&status=eq.active`);
      if (activeSales && activeSales.length > 0) {
        alert('Gagal: Konsumen ini sudah memiliki transaksi PENJUALAN aktif. Data tidak dapat dikembalikan ke Calon Konsumen.');
        return;
      }

      // Cek Titipan (UTJ) aktif - Menggunakan kombinasi Nama & Telp untuk akurasi
      const activeDeposits = await api.get('deposits', `name=eq.${encodeURIComponent(customer.full_name)}&phone=eq.${customer.phone}`);
      if (activeDeposits && activeDeposits.length > 0) {
        alert('Gagal: Konsumen memiliki riwayat TITIPAN (UTJ) aktif. Harap batalkan titipan terlebih dahulu jika ingin memindahkan data.');
        return;
      }

      // 2. Konfirmasi User & Peringatan Data Loss
      if (!confirm(`Pindahkan "${customer.full_name}" kembali ke Calon Konsumen?\n\nPERHATIAN:\n- Data NIK, Alamat, dan Pekerjaan akan DIHAPUS PERMANEN.\n- Data di daftar Konsumen ini akan hilang.`)) {
        return;
      }

      // 3. Eksekusi Move dengan Rollback Logic
      // Step A: Buat Lead Baru
      const newLeadRes = await api.insert('leads', {
        name: customer.full_name,
        phone: customer.phone,
        consultant_id: customer.consultant_id,
        status: 'hot',
        source: 'Dibatalkan dari Konsumen',
        description: `Dikonversi balik dari data Konsumen pada ${formatDateTime(new Date())}`,
        date: new Date().toISOString()
      });

      if (!newLeadRes || !newLeadRes[0]?.id) {
        throw new Error('Gagal membuat data Calon Konsumen baru.');
      }

      const newLeadId = newLeadRes[0].id;

      try {
        // Step B: Hapus data Customer
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', customer.id);

        if (error) throw error;

        alert('Berhasil: Data dikembalikan ke daftar Calon Konsumen.');
        fetchCustomers();
      } catch (deleteError: any) {
        // ROLLBACK: Jika hapus customer gagal, hapus kembali lead yang baru dibuat agar tidak duplikat
        console.error('Delete Customer failed, rolling back Lead creation:', deleteError);
        await api.delete('leads', newLeadId);
        throw new Error(`Gagal menghapus data Konsumen: ${deleteError.message}. Proses dibatalkan (Rollback).`);
      }

    } catch (error: any) {
      console.error('Error reverse converting customer:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus konsumen "${name}"? Data ini mungkin terkait dengan transaksi penjualan.`)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      alert('Konsumen berhasil dihapus.');
      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      alert(`Gagal menghapus konsumen: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchCustomers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Data Konsumen</h1>
            <p className="text-text-secondary">Kelola data pembeli resmi dan resmi terdaftar</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Konsumen
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <ConsultantDataFilter 
          value={selectedConsultantId}
          menuKey="leads"
          onChange={(id) => {
            setSelectedConsultantId(id);
            if (canViewAll) {
              localStorage.setItem('filter_consultant_id', id);
            }
          }}
        />
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedCustomer ? 'Edit Konsumen' : 'Tambah Konsumen'}
        size="lg"
      >
        <CustomerForm 
          onSuccess={handleSuccess} 
          onCancel={() => setIsModalOpen(false)} 
          initialData={selectedCustomer} 
        />
      </Modal>


      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari nama, email, atau telepon..." 
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

        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
              <THead>
                <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                  <TH className="px-3 py-3 font-semibold">Nama Lengkap</TH>
                  <TH className="px-3 py-3 font-semibold hidden sm:table-cell">Kontak</TH>
                  <TH className="px-3 py-3 font-semibold hidden md:table-cell">Identitas</TH>
                  <TH className="px-3 py-3 font-semibold hidden lg:table-cell">Konsultan</TH>
                  <TH className="px-3 py-3 font-semibold text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR><TD colSpan={6} className="px-3 py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-dark mx-auto"></div></TD></TR>
                ) : filteredCustomers.length === 0 ? (
                  <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-secondary">Tidak ada data.</TD></TR>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TR key={customer.id} className="hover:bg-white/30 transition-colors">
                      <TD className="px-3 py-4">
                        <div className="font-black text-text-primary text-[11px] truncate max-w-[150px]">{customer.full_name}</div>
                        <div className="sm:hidden text-[10px] text-text-secondary">{customer.phone}</div>
                        <div className="lg:hidden text-[9px] text-accent-dark font-bold">{(customer as any).consultant?.name || '-'}</div>
                      </TD>
                      <TD className="px-3 py-4 hidden sm:table-cell">
                        <div className="text-[10px] text-text-secondary">{customer.email}</div>
                        <div className="text-[10px] text-text-secondary font-bold">{customer.phone}</div>
                      </TD>
                      <TD className="px-3 py-4 text-[10px] text-text-secondary hidden md:table-cell">{customer.identity_number}</TD>
                      <TD className="px-3 py-4 text-[10px] font-black text-accent-dark hidden lg:table-cell">
                        {(customer as any).consultant?.name || '-'}
                      </TD>
                      <TD className="px-3 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-600" onClick={() => handleReverseConvert(customer)}><Undo2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(customer)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(customer.id, customer.full_name)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
        </div>
      </Card>
    </div>
  );
};

export default Customers;
