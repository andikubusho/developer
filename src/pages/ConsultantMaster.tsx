import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowLeft, Edit, Trash2, Phone, MapPin, Briefcase } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { PropertyConsultant } from '../types';
import { api } from '../lib/api';

const ConsultantMaster: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [staff, setStaff] = useState<PropertyConsultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<PropertyConsultant | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await api.get('consultants', 'select=*&order=name.asc');
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching consultants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address
      };
      if (selectedStaff) {
        await api.update('consultants', selectedStaff.id, payload);
      } else {
        await api.insert('consultants', payload);
      }
      await fetchStaff();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving consultant:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data konsultan property ini?')) return;
    try {
      setLoading(true);
      await api.delete('consultants', id);
      await fetchStaff();
    } catch (error: any) {
      console.error('Error deleting consultant:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (s: PropertyConsultant) => {
    setSelectedStaff(s);
    setFormData({
      name: s.name,
      phone: s.phone,
      address: s.address
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedStaff(null);
    setFormData({
      name: '',
      phone: '',
      address: ''
    });
    setIsModalOpen(true);
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-1 sm:p-2 h-auto">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-text-primary tracking-tight">Master Konsultan</h1>
            <p className="text-[10px] sm:text-sm text-text-secondary font-medium uppercase tracking-widest">Staf Property</p>
          </div>
        </div>
        <Button size="sm" className="w-full sm:w-auto rounded-xl text-[10px] sm:text-sm py-3" onClick={handleAdd}>
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Tambah Data
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              placeholder="Cari nama atau telepon..." 
              className="w-full h-10 rounded-xl border border-white/40 pl-10 pr-4 text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
              <THead>
                <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                  <TH className="px-3 py-3 font-black">Nama</TH>
                  <TH className="px-3 py-3 font-black">Kontak</TH>
                  <TH className="px-3 py-3 font-black hidden md:table-cell">Alamat</TH>
                  <TH className="px-3 py-3 font-black text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR><TD colSpan={4} className="px-3 py-10 text-center text-text-muted">Memuat...</TD></TR>
                ) : filteredStaff.length === 0 ? (
                  <TR><TD colSpan={4} className="px-3 py-10 text-center text-text-secondary text-sm">Tidak ada data.</TD></TR>
                ) : (
                  filteredStaff.map((s) => (
                    <TR key={s.id} className="hover:bg-white/30 transition-colors">
                      <TD className="px-3 py-4 font-black text-text-primary text-[11px] whitespace-nowrap">{s.name}</TD>
                      <TD className="px-3 py-4 text-[11px] text-text-secondary whitespace-nowrap">
                        <div className="flex items-center gap-1.5">{s.phone}</div>
                      </TD>
                      <TD className="px-3 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-[11px] text-text-secondary"><MapPin className="w-3 h-3 text-text-muted" />{s.address}</div>
                      </TD>
                      <TD className="px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(s)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedStaff ? "Edit Data Konsultan Property" : "Input Data Konsultan Property"}>
        <form className="space-y-4" onSubmit={handleSave}>
          <Input label="Nama" placeholder="Nama lengkap" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="No. Telp" placeholder="0812..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Alamat</label>
            <textarea className="w-full rounded-xl border border-white/60 p-2 text-sm" rows={3} placeholder="Alamat lengkap..." value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan Data</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ConsultantMaster;
