import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowLeft, Edit, Trash2, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Promo } from '../types';
import { formatDate, formatCurrency } from '../lib/utils';
import { api } from '../lib/api';

const Promos: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    valid_until: '',
    value: 0,
    description: ''
  });

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const data = await api.get('promos', 'select=*&order=name.asc');
      setPromos(data || []);
    } catch (error) {
      console.error('Error fetching promos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (selectedPromo) {
        await api.update('promos', selectedPromo.id, formData);
      } else {
        await api.insert('promos', formData);
      }
      await fetchPromos();
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving promo:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (promo: Promo) => {
    setSelectedPromo(promo);
    setFormData({
      name: promo.name,
      valid_until: promo.valid_until.split('T')[0],
      value: promo.value,
      description: promo.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus promo ini?')) return;
    try {
      setLoading(true);
      await api.delete('promos', id);
      await fetchPromos();
    } catch (error: any) {
      console.error('Error deleting promo:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPromo(null);
    setFormData({
      name: '',
      valid_until: '',
      value: 0,
      description: ''
    });
  };

  const filteredPromos = promos.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-1 sm:p-2 h-auto">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-text-primary tracking-tight">Master Promo</h1>
            <p className="text-[10px] sm:text-sm text-text-secondary font-medium uppercase tracking-widest">Manajemen Penawaran</p>
          </div>
        </div>
        <Button size="sm" className="w-full sm:w-auto rounded-xl text-[10px] sm:text-sm py-3" onClick={handleAdd}>
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Tambah Promo
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Cari nama promo..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
              <THead>
                <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                  <TH className="px-3 py-3 font-black">Promo</TH>
                  <TH className="px-3 py-3 font-black hidden sm:table-cell">Masa Berlaku</TH>
                  <TH className="px-3 py-3 font-black">Nilai</TH>
                  <TH className="px-3 py-3 font-black text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR><TD colSpan={5} className="px-3 py-10 text-center text-text-muted">Memuat...</TD></TR>
                ) : filteredPromos.length === 0 ? (
                  <TR><TD colSpan={5} className="px-3 py-10 text-center text-text-secondary">Tidak ada data.</TD></TR>
                ) : (
                  filteredPromos.map((p) => (
                    <TR key={p.id} className="hover:bg-white/30 transition-colors">
                      <TD className="px-3 py-4">
                        <div className="font-black text-text-primary text-xs whitespace-nowrap">{p.name}</div>
                        <div className="text-[10px] text-text-secondary sm:hidden italic">{formatDate(p.valid_until)}</div>
                      </TD>
                      <TD className="px-3 py-4 text-[10px] text-text-secondary hidden sm:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-text-muted" />
                          {formatDate(p.valid_until)}
                        </div>
                      </TD>
                      <TD className="px-3 py-4 text-[10px] font-black text-accent-dark whitespace-nowrap">
                        {p.value > 0 ? formatCurrency(p.value) : 'Non-Mon'}
                      </TD>
                      <TD className="px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={selectedPromo ? "Edit Promo" : "Input Promo"}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input label="Nama Promo" placeholder="Contoh: Promo Akhir Tahun" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Masa Berlaku" type="date" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} required />
          <CurrencyInput label="Nilai Promo" placeholder="Rp 0 (Isi 0 jika non-moneter)" value={formData.value} onValueChange={(values) => setFormData({ ...formData, value: values.floatValue || 0 })} />
          <textarea className="w-full rounded-xl border border-white/60 p-2 text-sm" rows={3} placeholder="Detail promo..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan Promo</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Promos;
