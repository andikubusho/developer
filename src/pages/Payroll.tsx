import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Banknote, ArrowLeft, Edit, Trash2, Printer, Download, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Payroll } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';
import { getMockData, saveMockData } from '../lib/storage';

const PayrollPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    period: 'Maret 2026',
    basic_salary: 0,
    allowances: 0,
    deductions: 0,
    status: 'pending' as const,
    payment_date: ''
  });

  useEffect(() => {
    fetchPayroll();
  }, []);

  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchPayroll();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await api.get('employees', 'select=*&order=full_name.asc');
      setEmployees(data || []);
    } catch (err) {
      console.error('Fetch Employees Failed:', err);
    }
  };

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const data = await api.get('payroll', 'select=*,employee:employees(*)&order=id.desc');
      setPayroll(data || []);
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const net_salary = formData.basic_salary + formData.allowances - formData.deductions;
    try {
      setLoading(true);
      const payload = { ...formData, net_salary };
      if (editingId) {
        await api.update('payroll', editingId, payload);
      } else {
        await api.insert('payroll', payload);
      }
      await fetchPayroll();
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving payroll:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Payroll) => {
    setEditingId(item.id);
    setFormData({
      employee_id: item.employee_id,
      period: item.period,
      basic_salary: item.basic_salary,
      allowances: item.allowances,
      deductions: item.deductions,
      status: item.status,
      payment_date: item.payment_date || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data payroll ini?')) return;
    try {
      setLoading(true);
      await api.delete('payroll', id);
      await fetchPayroll();
    } catch (error: any) {
      console.error('Error deleting payroll:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      employee_id: '',
      period: 'Maret 2026',
      basic_salary: 0,
      allowances: 0,
      deductions: 0,
      status: 'pending',
      payment_date: ''
    });
  };

  const filteredPayroll = payroll.filter(item => 
    (item.employee?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.employee?.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setDivision(null);
              setDivision(null);
            }}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
            <p className="text-slate-500">Manajemen Penggajian Karyawan</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Cetak Slip Gaji
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Generate Payroll
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari nama karyawan atau ID..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="w-full sm:w-auto h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="Maret 2026">Maret 2026</option>
            <option value="Februari 2026">Februari 2026</option>
            <option value="Januari 2026">Januari 2026</option>
          </select>
        </div>

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Periode</th>
                <th className="px-6 py-3 font-semibold">Karyawan</th>
                <th className="px-6 py-3 font-semibold text-right">Gaji Pokok</th>
                <th className="px-6 py-3 font-semibold text-right">Tunjangan</th>
                <th className="px-6 py-3 font-semibold text-right">Potongan</th>
                <th className="px-6 py-3 font-semibold text-right">Gaji Bersih</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data payroll.
                  </td>
                </tr>
              ) : (
                filteredPayroll.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{item.period}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">{item.employee?.full_name}</span>
                        <span className="text-xs text-slate-500">{item.employee?.employee_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">{formatCurrency(item.basic_salary)}</td>
                    <td className="px-6 py-4 text-sm text-green-600 text-right">+{formatCurrency(item.allowances)}</td>
                    <td className="px-6 py-4 text-sm text-red-600 text-right">-{formatCurrency(item.deductions)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(item.net_salary)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        item.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500"
                          onClick={() => handleDelete(item.id)}
                        >
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
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingId ? "Edit Payroll" : "Generate Payroll Karyawan"}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Periode</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              required
            >
              <option value="Maret 2026">Maret 2026</option>
              <option value="April 2026">April 2026</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Karyawan</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.employee_id}
              onChange={(e) => {
                const emp = employees.find(emp => emp.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  employee_id: e.target.value,
                  basic_salary: emp ? Number(emp.salary) : 0 
                });
              }}
              required
            >
              <option value="">Pilih Karyawan</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Gaji Pokok (Rp)" 
              type="number" 
              placeholder="Rp 0" 
              value={formData.basic_salary}
              onChange={(e) => setFormData({ ...formData, basic_salary: Number(e.target.value) })}
              required
            />
            <Input 
              label="Tunjangan (Rp)" 
              type="number" 
              placeholder="Rp 0" 
              value={formData.allowances}
              onChange={(e) => setFormData({ ...formData, allowances: Number(e.target.value) })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Potongan (Rp)" 
              type="number" 
              placeholder="Rp 0" 
              value={formData.deductions}
              onChange={(e) => setFormData({ ...formData, deductions: Number(e.target.value) })}
              required
            />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Status</label>
              <select 
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                required
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          {formData.status === 'paid' && (
            <Input 
              label="Tanggal Pembayaran" 
              type="date" 
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
            />
          )}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button type="submit">{editingId ? "Update Slip" : "Generate Slip"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PayrollPage;



