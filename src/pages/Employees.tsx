import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Users, ArrowLeft, Edit, Trash2, Mail, Phone, Briefcase } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Employee } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    division: 'Marketing',
    position: '',
    join_date: new Date().toISOString().split('T')[0],
    salary: 0,
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.get('employees', 'select=*&order=full_name.asc');
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (editingId) {
        await api.update('employees', editingId, formData);
      } else {
        await api.insert('employees', formData);
      }
      await fetchEmployees();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Gagal menyimpan data karyawan');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setFormData({
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      division: employee.division,
      position: employee.position,
      join_date: employee.join_date,
      salary: employee.salary,
      email: employee.email,
      phone: employee.phone
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus karyawan ini?')) return;
    try {
      setLoading(true);
      await api.delete('employees', id);
      await fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Gagal menghapus karyawan');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      employee_id: '',
      full_name: '',
      division: 'Marketing',
      position: '',
      join_date: new Date().toISOString().split('T')[0],
      salary: 0,
      email: '',
      phone: ''
    });
  };

  const filteredEmployees = employees.filter(item => 
    (item.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.division || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Data Karyawan</h1>
            <p className="text-text-secondary">Manajemen Database Karyawan Perusahaan</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Karyawan
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Cari nama, ID, atau divisi..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
        </div>

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">ID Karyawan</TH>
                <TH className="px-6 py-3 font-semibold">Nama Lengkap</TH>
                <TH className="px-6 py-3 font-semibold">Divisi / Jabatan</TH>
                <TH className="px-6 py-3 font-semibold">Kontak</TH>
                <TH className="px-6 py-3 font-semibold">Tgl Bergabung</TH>
                <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={7} className="px-6 py-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div></TD></TR>
              ) : filteredEmployees.length === 0 ? (
                <TR><TD colSpan={7} className="px-6 py-10 text-center text-text-secondary">Tidak ada data karyawan.</TD></TR>
              ) : (
                filteredEmployees.map((item) => (
                  <TR key={item.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 text-sm font-bold text-accent-dark">{item.employee_id}</TD>
                    <TD className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-text-secondary font-bold text-xs">{item.full_name.charAt(0)}</div>
                        <span className="text-sm font-medium text-text-primary">{item.full_name}</span>
                      </div>
                    </TD>
                    <TD className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-text-primary font-medium">{item.division}</span>
                        <span className="text-xs text-text-secondary">{item.position}</span>
                      </div>
                    </TD>
                    <TD className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-xs text-text-secondary"><Mail className="w-3 h-3" /> {item.email}</div>
                        <div className="flex items-center gap-1 text-xs text-text-secondary"><Phone className="w-3 h-3" /> {item.phone}</div>
                      </div>
                    </TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(item.join_date)}</TD>
                    <TD className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(item)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? "Edit Data Karyawan" : "Tambah Karyawan Baru"} size="lg">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="ID Karyawan" placeholder="EMP000" value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} required />
            <Input label="Nama Lengkap" placeholder="Nama lengkap karyawan" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Divisi</label>
              <select className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none" value={formData.division} onChange={(e) => setFormData({ ...formData, division: e.target.value })} required>
                <option value="Marketing">Marketing</option>
                <option value="Teknik">Teknik</option>
                <option value="Keuangan">Keuangan</option>
                <option value="Accounting">Accounting</option>
                <option value="HRD">HRD</option>
                <option value="Audit">Audit</option>
              </select>
            </div>
            <Input label="Jabatan" placeholder="Contoh: Staff, Manager, dll" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" placeholder="email@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            <Input label="Nomor Telepon" placeholder="0812..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal Bergabung" type="date" value={formData.join_date} onChange={(e) => setFormData({ ...formData, join_date: e.target.value })} required />
            <Input label="Gaji Pokok (Rp)" type="number" placeholder="Rp 0" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })} required />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button type="submit" isLoading={loading}>{editingId ? "Update Data Karyawan" : "Simpan Data Karyawan"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
