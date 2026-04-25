import React, { useEffect, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { Plus, Search, Filter, UserPlus, Mail, Phone, MapPin, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CustomerForm } from '../components/forms/CustomerForm';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

const Customers: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.get('customers', 'select=*&order=full_name.asc&limit=50');
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleAdd = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
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
          <UserPlus className="w-4 h-4 mr-2" />
          Tambah Konsumen
        </Button>
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

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">Nama Lengkap</TH>
                <TH className="px-6 py-3 font-semibold">Kontak</TH>
                <TH className="px-6 py-3 font-semibold">Identitas</TH>
                <TH className="px-6 py-3 font-semibold">Alamat</TH>
                <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR>
                  <TD colSpan={5} className="px-6 py-10 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark"></div>
                    </div>
                  </TD>
                </TR>
              ) : filteredCustomers.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="px-6 py-10 text-center text-text-secondary">
                    Tidak ada data konsumen.
                  </TD>
                </TR>
              ) : (
                filteredCustomers.map((customer) => (
                  <TR key={customer.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4">
                      <div className="font-medium text-text-primary">{customer.full_name}</div>
                    </TD>
                    <TD className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-xs text-text-secondary">
                          <Mail className="w-3 h-3 mr-1.5 text-text-muted" />
                          {customer.email}
                        </div>
                        <div className="flex items-center text-xs text-text-secondary">
                          <Phone className="w-3 h-3 mr-1.5 text-text-muted" />
                          {customer.phone}
                        </div>
                      </div>
                    </TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">
                      {customer.identity_number}
                    </TD>
                    <TD className="px-6 py-4">
                      <div className="flex items-start text-xs text-text-secondary max-w-[200px]">
                        <MapPin className="w-3 h-3 mr-1.5 mt-0.5 text-text-muted flex-shrink-0" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    </TD>
                    <TD className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>Edit</Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(customer.id, customer.full_name)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>
    </div>
  );
};

export default Customers;
