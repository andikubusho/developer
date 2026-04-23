import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, History, ArrowLeft, Edit, Trash2, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { JournalEntry } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';

const GeneralJournalPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference_no: '',
    items: [
      { account_code: '', account_name: '', debit: 0, credit: 0 },
      { account_code: '', account_name: '', debit: 0, credit: 0 }
    ]
  });

  useEffect(() => {
    fetchJournal();
  }, []);

  const fetchJournal = async () => {
    setLoading(true);
    if (isMockMode) {
      const mockJournal: JournalEntry[] = [
        {
          id: '1',
          date: '2026-03-27',
          description: 'Penerimaan Booking Fee - Cici Lestari',
          reference_no: 'BF-001',
          items: [
            { account_code: '101', account_name: 'Kas / Bank', debit: 5000000, credit: 0 },
            { account_code: '401', account_name: 'Pendapatan Diterima Dimuka', debit: 0, credit: 5000000 }
          ],
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          date: '2026-03-26',
          description: 'Pembayaran Listrik Kantor',
          reference_no: 'EXP-001',
          items: [
            { account_code: '601', account_name: 'Beban Listrik', debit: 1500000, credit: 0 },
            { account_code: '101', account_name: 'Kas / Bank', debit: 0, credit: 1500000 }
          ],
          created_at: new Date().toISOString()
        }
      ];
      setJournalEntries(mockJournal);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (isMockMode) {
      if (editingId) {
        setJournalEntries(journalEntries.map(j => j.id === editingId ? { ...j, ...formData } : j));
      } else {
        const newEntry: JournalEntry = {
          id: Math.random().toString(36).substr(2, 9),
          ...formData,
          created_at: new Date().toISOString()
        };
        setJournalEntries([newEntry, ...journalEntries]);
      }
      setIsModalOpen(false);
      resetForm();
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setFormData({
      date: entry.date,
      description: entry.description,
      reference_no: entry.reference_no || '',
      items: entry.items.map(item => ({ ...item }))
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus jurnal ini?')) {
      setJournalEntries(journalEntries.filter(j => j.id !== id));
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { account_code: '', account_name: '', debit: 0, credit: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill account name if code is selected
    if (field === 'account_code') {
      const accounts: Record<string, string> = {
        '101': 'Kas / Bank',
        '401': 'Pendapatan Diterima Dimuka',
        '601': 'Beban Listrik'
      };
      newItems[index].account_name = accounts[value] || '';
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference_no: '',
      items: [
        { account_code: '', account_name: '', debit: 0, credit: 0 },
        { account_code: '', account_name: '', debit: 0, credit: 0 }
      ]
    });
  };

  const filteredJournal = journalEntries.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reference_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-slate-900">Jurnal Umum</h1>
            <p className="text-slate-500">Pencatatan Transaksi Akuntansi Harian</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Jurnal Baru
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari deskripsi atau nomor referensi..." 
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

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Tanggal</th>
                <th className="px-6 py-3 font-semibold">Ref / Deskripsi</th>
                <th className="px-6 py-3 font-semibold">Kode Akun</th>
                <th className="px-6 py-3 font-semibold">Nama Akun</th>
                <th className="px-6 py-3 font-semibold text-right">Debit</th>
                <th className="px-6 py-3 font-semibold text-right">Kredit</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredJournal.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data jurnal.
                  </td>
                </tr>
              ) : (
                filteredJournal.map((entry) => (
                  <React.Fragment key={entry.id}>
                    {entry.items.map((item, idx) => (
                      <tr key={`${entry.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {idx === 0 ? formatDate(entry.date) : ''}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {idx === 0 ? (
                            <div>
                              <p className="font-bold text-slate-900">{entry.reference_no}</p>
                              <p className="text-slate-500 text-xs">{entry.description}</p>
                            </div>
                          ) : ''}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{item.account_code}</td>
                        <td className={cn(
                          "px-6 py-4 text-sm text-slate-900",
                          item.credit > 0 ? "pl-12" : ""
                        )}>
                          {item.account_name}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                          {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                          {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {idx === 0 ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleEdit(entry)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-500"
                                onClick={() => handleDelete(entry.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : ''}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
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
        title={editingId ? "Edit Jurnal" : "Buat Jurnal Baru"}
        size="lg"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Tanggal" 
              type="date" 
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Input 
              label="Nomor Referensi" 
              placeholder="Contoh: BF-001" 
              value={formData.reference_no}
              onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
            />
          </div>
          <Input 
            label="Deskripsi Transaksi" 
            placeholder="Isi keterangan transaksi..." 
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
          
          <div className="space-y-2 mt-4">
            <p className="text-sm font-bold text-slate-900">Rincian Akun</p>
            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 uppercase px-2">
              <div className="col-span-4">Akun</div>
              <div className="col-span-3 text-right">Debit</div>
              <div className="col-span-3 text-right">Kredit</div>
              <div className="col-span-2"></div>
            </div>
            {/* Entry Rows */}
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <select 
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={item.account_code}
                    onChange={(e) => handleItemChange(index, 'account_code', e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Akun --</option>
                    <option value="101">101 - Kas / Bank</option>
                    <option value="401">401 - Pendapatan</option>
                    <option value="601">601 - Beban Listrik</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <Input 
                    type="number" 
                    placeholder="0" 
                    className="text-right" 
                    value={item.debit}
                    onChange={(e) => handleItemChange(index, 'debit', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-3">
                  <Input 
                    type="number" 
                    placeholder="0" 
                    className="text-right" 
                    value={item.credit}
                    onChange={(e) => handleItemChange(index, 'credit', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500"
                    onClick={() => handleRemoveItem(index)}
                    disabled={formData.items.length <= 2}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-dashed"
              onClick={handleAddItem}
              type="button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Baris
            </Button>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button type="submit">{editingId ? "Update Jurnal" : "Simpan Jurnal"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GeneralJournalPage;



