import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  RefreshCw,
  ArrowLeft,
  Info,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

interface MasterMaterialData {
  id: string;
  name: string;
  unit: string;
  code?: string;
  kategori?: string;
  spesifikasi?: string;
  harga_satuan?: number;
  min_stok?: number;
  created_at?: string;
}

const MasterMaterial: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState<MasterMaterialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MasterMaterialData | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    unit: '',
    kategori: '',
    spesifikasi: '',
    harga_satuan: 0,
    min_stok: 0
  });
  const [error, setError] = useState('');

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await api.get('materials', 'select=*&order=name.asc');
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching master materials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const validateCode = (code: string) => {
    // Biarkan bebas jika pakai tabel lama
    return code.length > 0;
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Kode Material': 'SMN001',
        'Nama Material': 'Semen Portland',
        'Kategori': 'semen',
        'Spesifikasi': '-',
        'Satuan': 'Sak',
        'Harga Satuan': 65000,
        'Min Stok': 10
      },
      {
        'Kode Material': 'BSI001',
        'Nama Material': 'Besi Beton 10mm',
        'Kategori': 'besi',
        'Spesifikasi': '-',
        'Satuan': 'Batang',
        'Harga Satuan': 85000,
        'Min Stok': 5
      },
      {
        'Kode Material': 'PSR001',
        'Nama Material': 'Pasir Pasang',
        'Kategori': 'pasir',
        'Spesifikasi': '-',
        'Satuan': 'm3',
        'Harga Satuan': 250000,
        'Min Stok': 2
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Material");
    XLSX.writeFile(wb, "Template_Master_Material.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          alert('Excel kosong!');
          return;
        }

        const validMaterials: any[] = [];
        const errors: string[] = [];

        for (let i = 0; i < data.length; i++) {
          // Normalize column names by trimming whitespace
          const rawRow = data[i];
          const row: any = {};
          for (const key of Object.keys(rawRow)) {
            row[key.trim()] = rawRow[key];
          }
          const kode = String(row['Kode Material'] || row['Kode'] || '').trim().toUpperCase();
          const nama = String(row['Nama Material'] || '').trim();
          const satuan = String(row['Satuan'] || '').trim();
          const kategori = String(row['Kategori'] || '').trim();
          const spesifikasi = String(row['Spesifikasi'] || '').trim();
          const harga_satuan = Number(String(row['Harga Satuan'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const min_stok = Number(String(row['Min Stok'] || '0').replace(/\./g, '').replace(',', '.')) || 0;

          if (!kode || !nama || !satuan) {
            errors.push(`Baris ${i + 2}: Data tidak lengkap`);
            continue;
          }

          validMaterials.push({ code: kode, name: nama, unit: satuan, kategori, spesifikasi, harga_satuan, min_stok });
        }

        if (errors.length > 0) {
          alert(`Ditemukan kesalahan:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
          if (validMaterials.length === 0) {
            setLoading(false);
            return;
          }
          if (!confirm(`Lanjutkan impor ${validMaterials.length} data yang valid?`)) {
            setLoading(false);
            return;
          }
        }

        // Fetch existing materials to decide insert vs update
        const existing = await api.get('materials', 'select=id,code');
        const codeToId: Record<string, string> = {};
        for (const m of existing) {
          if (m.code) codeToId[String(m.code).toUpperCase()] = m.id;
        }

        let inserted = 0;
        let updated = 0;
        for (const mat of validMaterials) {
          const existingId = codeToId[mat.code];
          if (existingId) {
            await api.update('materials', existingId, { name: mat.name, unit: mat.unit, kategori: mat.kategori, spesifikasi: mat.spesifikasi, harga_satuan: mat.harga_satuan, min_stok: mat.min_stok });
            updated++;
          } else {
            await api.insert('materials', mat);
            inserted++;
          }
        }

        alert(`Berhasil mengimpor: ${inserted} data baru ditambahkan, ${updated} data diperbarui.`);
        fetchMaterials();
      } catch (err) {
        console.error('Error importing excel:', err);
        alert('Gagal mengimpor file Excel.');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.code && !validateCode(form.code)) {
      setError('Kode Material minimal 1 karakter.');
      return;
    }

    try {
      setLoading(true);
      if (editingMaterial) {
        await api.update('materials', editingMaterial.id, form);
      } else {
        await api.insert('materials', form);
      }
      setIsModalOpen(false);
      setEditingMaterial(null);
      setForm({ code: '', name: '', unit: '' });
      fetchMaterials();
    } catch (error: any) {
      console.error('Error saving material:', error);
      setError(error.message || 'Gagal menyimpan data material');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus Material ini? Pastikan tidak ada Variant yang terkait.')) return;
    try {
      setLoading(true);
      await api.delete('materials', id);
      fetchMaterials();
    } catch (error: any) {
      console.error('Error deleting material:', error);
      alert('Gagal menghapus: Kemungkinan masih ada Variant yang terhubung.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter(m => 
    (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.code || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Master Material</h1>
            <p className="text-text-secondary font-medium">Definisi standar material konstruksi (Tanpa Merk)</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            className="hidden" 
            accept=".xlsx, .xls"
          />
          <Button variant="outline" onClick={handleDownloadTemplate} className="rounded-xl h-12 bg-white">
            <Download className="w-5 h-5 mr-2 text-primary" /> Template
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-12 bg-white">
            <Upload className="w-5 h-5 mr-2 text-emerald-600" /> Import
          </Button>
          <Button onClick={() => { setEditingMaterial(null); setForm({ code: '', name: '', unit: '' }); setError(''); setIsModalOpen(true); }} className="rounded-xl h-12 px-8 shadow-premium">
            <Plus className="w-5 h-5 mr-2" /> Tambah Master
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-accent-lavender/20 flex items-center justify-center text-primary">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Total Jenis</p>
            <p className="text-2xl font-black text-text-primary tracking-tight">{materials.length} Master</p>
          </div>
        </Card>
        <Card className="p-6 md:col-span-2 bg-blue-50 border-none shadow-premium flex items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Info className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">Aturan Kode</p>
            <p className="text-sm font-bold text-blue-800 tracking-tight">Gunakan format 3 Huruf + 3 Angka (Contoh: SMN001 untuk Semen, BSI010 untuk Besi)</p>
          </div>
        </Card>
      </div>

      <Card className="p-0 border-none shadow-premium overflow-hidden bg-white">
        <div className="p-6 border-b border-white/20">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari master material..." 
              className="pl-12 h-12 glass-input border-none rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full">
            <THead>
              <TR isHoverable={false}>
                <TH className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Kode</TH>
                <TH className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Nama Material</TH>
                <TH className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Kategori</TH>
                <TH className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Satuan</TH>
                <TH className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Harga Satuan</TH>
                <TH className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest">Min Stok</TH>
                <TH className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading && materials.length === 0 ? (
                <TR isHoverable={false}>
                  <TD colSpan={7} className="text-center py-20">
                    <RefreshCw className="w-8 h-8 text-accent-dark animate-spin mx-auto mb-4" />
                    <p className="text-text-muted font-bold uppercase text-[10px] tracking-widest">Memuat Data Master...</p>
                  </TD>
                </TR>
              ) : filteredMaterials.map((m) => (
                <TR key={m.id}>
                  <TD className="px-6 py-4">
                    <span className="px-3 py-1.5 rounded-lg bg-accent-lavender/20 text-accent-dark font-black text-sm tracking-widest">
                      {m.code || '-'}
                    </span>
                  </TD>
                  <TD className="px-6 py-4 font-black text-text-primary text-base">{m.name}</TD>
                  <TD className="px-6 py-4">
                    {m.kategori ? (
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest">
                        {m.kategori}
                      </span>
                    ) : <span className="text-text-muted text-xs">-</span>}
                  </TD>
                  <TD className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                      {m.unit}
                    </span>
                  </TD>
                  <TD className="px-6 py-4 text-right font-bold text-text-primary">
                    {m.harga_satuan != null && m.harga_satuan > 0 ? `Rp ${m.harga_satuan.toLocaleString('id-ID')}` : '-'}
                  </TD>
                  <TD className="px-6 py-4 text-center font-bold text-text-primary">
                    {m.min_stok ?? '-'}
                  </TD>
                  <TD className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingMaterial(m); setForm({ code: m.code || '', name: m.name, unit: m.unit, kategori: m.kategori || '', spesifikasi: m.spesifikasi || '', harga_satuan: m.harga_satuan || 0, min_stok: m.min_stok || 0 }); setIsModalOpen(true); }} className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100">
                        <Pencil className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="h-9 w-9 p-0 rounded-xl hover:bg-rose-50">
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMaterial ? "Edit Master Material" : "Tambah Master Baru"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-600" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Kode Material</label>
            <Input 
              placeholder="Contoh: SMN001"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="h-14 text-lg font-black tracking-widest rounded-xl border-white/40 focus:border-primary shadow-glass"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Nama Material</label>
            <Input 
              placeholder="Contoh: Semen, Pasir Pasang, Besi Beton"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Satuan Standar</label>
            <Input
              placeholder="Contoh: Sak, m3, Batang, kg"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Kategori</label>
            <Input
              placeholder="Contoh: semen, besi, kayu"
              value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Spesifikasi</label>
            <Input
              placeholder="Contoh: diameter 10mm, kelas III"
              value={form.spesifikasi}
              onChange={(e) => setForm({ ...form, spesifikasi: e.target.value })}
              className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Harga Satuan (Rp)</label>
              <Input
                type="number"
                placeholder="0"
                value={form.harga_satuan || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, harga_satuan: Number(e.target.value) })}
                className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block ml-1">Min Stok</label>
              <Input
                type="number"
                placeholder="0"
                value={form.min_stok || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, min_stok: Number(e.target.value) })}
                className="h-14 text-base font-bold rounded-xl border-white/40 focus:border-primary shadow-glass"
              />
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <Button type="button" variant="ghost" className="flex-1 h-12 rounded-xl" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1 h-12 rounded-xl text-base font-extrabold shadow-glass" isLoading={loading}>
              {editingMaterial ? "Simpan Perubahan" : "Tambahkan Master"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MasterMaterial;
