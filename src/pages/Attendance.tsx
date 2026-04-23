import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Clock, ArrowLeft, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Attendance } from '../types';
import { formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';

const AttendancePage: React.FC = () => {
  const { setDivision } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '',
    check_out: '',
    status: 'present' as const
  });

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await api.get('employees', 'select=*');
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const data = await api.get('attendance', 'select=*,employee:employees(*)&order=created_at.desc');
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (editingId) {
        await api.update('attendance', editingId, formData);
      } else {
        await api.insert('attendance', formData);
      }
      await fetchAttendance();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Gagal menyimpan absensi');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Attendance) => {
    setEditingId(item.id);
    setFormData({
      employee_id: item.employee_id,
      date: item.date,
      check_in: item.check_in || '',
      check_out: item.check_out || '',
      status: item.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data absensi ini?')) return;
    try {
      setLoading(true);
      await api.delete('attendance', id);
      await fetchAttendance();
    } catch (error) {
      console.error('Error deleting attendance:', error);
      alert('Gagal menghapus absensi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      check_in: '',
      check_out: '',
      status: 'present'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700';
      case 'absent': return 'bg-red-100 text-red-700';
      case 'leave': return 'bg-blue-100 text-blue-700';
      case 'sick': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredAttendance = attendance.filter(item => 
    (item.employee?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.employee?.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Absensi & Cuti</h1>
            <p className="text-slate-500">Monitoring Kehadiran dan Pengajuan Cuti</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Clock className="w-4 h-4 mr-2" /> Rekap Bulanan</Button>
          <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Input Absensi</Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari nama karyawan atau ID..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Input type="date" className="w-full sm:w-auto" defaultValue={new Date().toISOString().split('T')[0]} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Tanggal</th>
                <th className="px-6 py-3 font-semibold">ID Karyawan</th>
                <th className="px-6 py-3 font-semibold">Nama Karyawan</th>
                <th className="px-6 py-3 font-semibold">Jam Masuk</th>
                <th className="px-6 py-3 font-semibold">Jam Pulang</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div></td></tr>
              ) : filteredAttendance.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500">Tidak ada data absensi.</td></tr>
              ) : (
                filteredAttendance.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">{item.employee?.employee_id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.employee?.full_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.check_in || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.check_out || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', getStatusColor(item.status))}>{item.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(item)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? "Edit Absensi Karyawan" : "Input Absensi Karyawan"}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input label="Tanggal" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Karyawan</label>
            <select className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} required>
              <option value="">-- Pilih Karyawan --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Jam Masuk" type="time" value={formData.check_in} onChange={(e) => setFormData({ ...formData, check_in: e.target.value })} />
            <Input label="Jam Pulang" type="time" value={formData.check_out} onChange={(e) => setFormData({ ...formData, check_out: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Status Kehadiran</label>
            <select className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} required>
              <option value="present">Hadir</option>
              <option value="absent">Alpa</option>
              <option value="leave">Cuti</option>
              <option value="sick">Sakit</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button type="submit" isLoading={loading}>{editingId ? "Update Absensi" : "Simpan Absensi"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendancePage;
