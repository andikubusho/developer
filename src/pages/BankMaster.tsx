import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowLeft, Edit, Trash2, Landmark, CreditCard, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { BankAccount } from '../types';
import { api } from '../lib/api';

const BankMaster: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);

  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_holder: ''
  });

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const data = await api.get('bank_accounts', 'select=*&order=bank_name.asc');
      setBanks(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_holder: formData.account_holder
      };
      if (selectedBank) {
        await api.update('bank_accounts', selectedBank.id, payload);
      } else {
        await api.insert('bank_accounts', payload);
      }
      await fetchBanks();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving bank account:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data rekening bank ini?')) return;
    try {
      setLoading(true);
      await api.delete('bank_accounts', id);
      await fetchBanks();
    } catch (error: any) {
      console.error('Error deleting bank account:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (b: BankAccount) => {
    setSelectedBank(b);
    setFormData({
      bank_name: b.bank_name,
      account_number: b.account_number,
      account_holder: b.account_holder
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedBank(null);
    setFormData({
      bank_name: '',
      account_number: '',
      account_holder: ''
    });
    setIsModalOpen(true);
  };

  const filteredBanks = banks.filter(b => 
    b.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.account_number.includes(searchTerm) ||
    b.account_holder.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Master Rekening Bank</h1>
            <p className="text-text-secondary">Kelola rekening resmi perusahaan untuk transfer konsumen</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Rekening
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              placeholder="Cari bank, nomor rekening, atau nama..." 
              className="w-full h-10 rounded-xl border border-white/40 pl-10 pr-4 text-sm focus:outline-none bg-white/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table className="min-w-[800px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-6 py-3 font-semibold">Nama Bank</TH>
              <TH className="px-6 py-3 font-semibold">Nomor Rekening</TH>
              <TH className="px-6 py-3 font-semibold">Nama Pemilik</TH>
              <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={4} className="px-6 py-10 text-center text-text-muted">Memuat data...</TD></TR>
            ) : filteredBanks.length === 0 ? (
              <TR><TD colSpan={4} className="px-6 py-10 text-center text-text-secondary">Tidak ada data rekening bank.</TD></TR>
            ) : (
              filteredBanks.map((b) => (
                <TR key={b.id} className="hover:bg-white/30 transition-colors">
                  <TD className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent-lavender/20 text-accent-dark rounded-xl">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-text-primary uppercase tracking-wider">{b.bank_name}</span>
                    </div>
                  </TD>
                  <TD className="px-6 py-4">
                    <div className="flex items-center gap-2 font-mono text-sm text-text-primary">
                      <CreditCard className="w-3 h-3 text-text-muted" />
                      {b.account_number}
                    </div>
                  </TD>
                  <TD className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                      <User className="w-3 h-3 text-text-muted" />
                      {b.account_holder}
                    </div>
                  </TD>
                  <TD className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(b)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(b.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedBank ? "Edit Rekening Bank" : "Tambah Rekening Bank"}>
        <form className="space-y-4" onSubmit={handleSave}>
          <Input label="Nama Bank" placeholder="Contoh: BCA, MANDIRI, BRI" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value.toUpperCase() })} required />
          <Input label="Nomor Rekening" placeholder="Masukkan angka saja" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} required />
          <Input label="Nama Pemilik Rekening" placeholder="Masukkan nama sesuai buku tabungan" value={formData.account_holder} onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })} required />
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan Rekening</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BankMaster;
