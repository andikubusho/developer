import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, UserPlus, Mail, Phone, MapPin, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Customer } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CustomerForm } from '../components/forms/CustomerForm';
import { useAuth } from '../contexts/AuthContext';
import { getMockData } from '../lib/storage';

const Customers: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      if (isMockMode) {
        const defaultCustomers: Customer[] = [
          {
            id: '1',
            full_name: 'Budi Santoso',
            email: 'budi@example.com',
            phone: '08123456789',
            identity_number: '3201234567890001',
            address: 'Jl. Merdeka No. 123, Bandung',
          },
          {
            id: '2',
            full_name: 'Siti Aminah',
            email: 'siti@example.com',
            phone: '08987654321',
            identity_number: '3201234567890002',
            address: 'Jl. Sudirman No. 45, Jakarta',
          }
        ];
        setCustomers(getMockData<Customer>('customers', defaultCustomers));
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleAdd = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
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
            onClick={() => {
              localStorage.removeItem('user_division');
              setDivision(null);
            }}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pelanggan</h1>
            <p className="text-slate-500">Kelola data pelanggan dan prospek</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <UserPlus className="w-4 h-4 mr-2" />
          Tambah Pelanggan
        </Button>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
        size="lg"
      >
        <CustomerForm 
          onSuccess={handleSuccess} 
          onCancel={() => setIsModalOpen(false)} 
          initialData={selectedCustomer} 
        />
      </Modal>


      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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

        <div className="overflow-x-auto">
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Nama Lengkap</th>
                <th className="px-6 py-3 font-semibold">Kontak</th>
                <th className="px-6 py-3 font-semibold">Identitas</th>
                <th className="px-6 py-3 font-semibold">Alamat</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada pelanggan ditemukan.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{customer.full_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-xs text-slate-600">
                          <Mail className="w-3 h-3 mr-1.5 text-slate-400" />
                          {customer.email}
                        </div>
                        <div className="flex items-center text-xs text-slate-600">
                          <Phone className="w-3 h-3 mr-1.5 text-slate-400" />
                          {customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.identity_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start text-xs text-slate-600 max-w-[200px]">
                        <MapPin className="w-3 h-3 mr-1.5 mt-0.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>Edit</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
      </Card>
    </div>
  );
};

export default Customers;


