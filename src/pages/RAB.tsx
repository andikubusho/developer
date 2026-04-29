import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Calculator, Plus, ArrowLeft, MapPin, Eye, Edit, Trash2, Home, BarChart3, Download, Upload } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import * as XLSX from 'xlsx';

const RAB: React.FC = () => {
  const navigate = useNavigate();
  const [rabs, setRabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRabs();
  }, []);

  const fetchRabs = async () => {
    try {
      setLoading(true);
      const [rabData, unitsData] = await Promise.all([
        api.get('rab_projects', 'select=id,nama_proyek,lokasi,total_anggaran,created_at,unit_id&order=created_at.desc'),
        api.get('units', 'select=id,unit_number,type'),
      ]);

      const unitsMap: Record<string, { unit_number: string; type: string }> = {};
      (unitsData || []).forEach((u: any) => { unitsMap[u.id] = u; });

      const enriched = (rabData || []).map((r: any) => ({
        ...r,
        unit: r.unit_id ? (unitsMap[r.unit_id] || null) : null,
      }));

      setRabs(enriched);
    } catch (error) {
      console.error('Error fetching RAB:', error);
      setRabs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Hapus RAB ini? Semua item di dalamnya juga akan dihapus.')) return;
    try {
      // rab_items akan terhapus otomatis via ON DELETE CASCADE
      await api.delete('rab_projects', id);
      setRabs((prev: any[]) => prev.filter((r: any) => r.id !== id));
    } catch (error: any) {
      alert(`Gagal menghapus: ${error.message}`);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Level': 0,
        'Uraian': 'PEKERJAAN PERSIAPAN',
        'Volume': '',
        'Satuan': '',
        'Koefisien': '',
        'Harga Material': '',
        'Harga Upah': '',
        'Harga RAB (Manual)': '',
        'Material ID': ''
      },
      {
        'Level': 1,
        'Uraian': 'Pembersihan Lahan',
        'Volume': '',
        'Satuan': '',
        'Koefisien': '',
        'Harga Material': '',
        'Harga Upah': '',
        'Harga RAB (Manual)': '',
        'Material ID': ''
      },
      {
        'Level': 2,
        'Uraian': 'Pembersihan dan Perataan',
        'Volume': 100,
        'Satuan': 'm2',
        'Koefisien': '',
        'Harga Material': '',
        'Harga Upah': '',
        'Harga RAB (Manual)': '',
        'Material ID': ''
      },
      {
        'Level': 3,
        'Uraian': 'Pekerja',
        'Volume': 1,
        'Satuan': 'OH',
        'Koefisien': 0.1,
        'Harga Material': 0,
        'Harga Upah': 120000,
        'Harga RAB (Manual)': '',
        'Material ID': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 8 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template RAB");
    XLSX.writeFile(wb, "Template_RAB.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          alert('Excel kosong!');
          return;
        }

        const newTree: any[] = [];
        const lastNodes: Record<number, any> = {};

        data.forEach((row: any) => {
          const level = parseInt(row['Level']);
          if (isNaN(level) || level < 0 || level > 3) return;

          const node = {
            id: Math.random().toString(36).substring(2, 9),
            parent_id: level > 0 ? (lastNodes[level - 1]?.id || null) : null,
            level: level,
            uraian: row['Uraian'] || '',
            volume: row['Volume'] != null && row['Volume'] !== '' ? Number(row['Volume']) : null,
            satuan: row['Satuan'] || '',
            koeff: row['Koefisien'] != null && row['Koefisien'] !== '' ? Number(row['Koefisien']) : null,
            material_price: row['Harga Material'] != null && row['Harga Material'] !== '' ? Number(row['Harga Material']) : 0,
            wage_price: row['Harga Upah'] != null && row['Harga Upah'] !== '' ? Number(row['Harga Upah']) : 0,
            harga_rab: row['Harga RAB (Manual)'] != null && row['Harga RAB (Manual)'] !== '' ? Number(row['Harga RAB (Manual)']) : null,
            is_manual: row['Harga RAB (Manual)'] != null && row['Harga RAB (Manual)'] !== '',
            material_id: row['Material ID'] || null,
            urutan: 0,
            isExpanded: true,
            children: []
          };

          lastNodes[level] = node;
          if (level === 0) {
            newTree.push(node);
          } else {
            const parent = lastNodes[level - 1];
            if (parent) parent.children.push(node);
            else newTree.push(node);
          }
        });

        navigate('/rab/create', { state: { importedTree: newTree } });
      } catch (err) {
        console.error(err);
        alert('Gagal mengimport Excel.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">RAB Proyek</h1>
            <p className="text-text-secondary">Rencana Anggaran Biaya pembangunan</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleDownloadTemplate}
            className="bg-white border-white/40 shadow-glass font-bold text-text-primary"
          >
            <Download className="w-4 h-4 mr-2 text-accent-dark" /> Template Excel
          </Button>
          <label className="cursor-pointer">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleImportExcel}
            />
            <div className="h-10 px-4 rounded-lg bg-white border border-white/40 shadow-glass font-bold text-text-primary flex items-center hover:bg-white/50 transition-all text-sm">
              <Upload className="w-4 h-4 mr-2 text-emerald-600" /> Upload RAB
            </div>
          </label>
          <Button variant="outline" onClick={() => navigate('/rab/recap')} className="bg-white">
            <BarChart3 className="w-4 h-4 mr-2" /> Rekap Material
          </Button>
          <Button onClick={() => navigate('/rab/create')}>
            <Plus className="w-4 h-4 mr-2" /> Buat RAB Baru
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <Table className="min-w-[800px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-6 py-3 font-semibold">Nama Proyek</TH>
              <TH className="px-6 py-3 font-semibold">Unit</TH>
              <TH className="px-6 py-3 font-semibold">Lokasi</TH>
              <TH className="px-6 py-3 font-semibold text-right">Total Anggaran</TH>
              <TH className="px-6 py-3 font-semibold">Tanggal Buat</TH>
              <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-muted">Memuat data...</TD></TR>
            ) : rabs.length === 0 ? (
              <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-secondary">
                <Calculator className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p>Belum ada data RAB. Klik <strong>Buat RAB Baru</strong> untuk memulai.</p>
              </TD></TR>
            ) : (
              rabs.map((r: any) => (
                <TR
                  key={r.id}
                  className="hover:bg-white/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/rab/create?id=${r.id}`)}
                >
                  <TD className="px-6 py-4 font-bold text-text-primary">{r.nama_proyek}</TD>
                  <TD className="px-6 py-4 text-sm text-text-secondary">
                    {r.unit ? (
                      <span className="flex items-center gap-1">
                        <Home className="w-3 h-3 shrink-0" />
                        {r.unit.unit_number}{r.unit.type ? ` - ${r.unit.type}` : ''}
                      </span>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </TD>
                  <TD className="px-6 py-4 text-sm text-text-secondary">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.lokasi || '-'}</span>
                  </TD>
                  <TD className="px-6 py-4 text-sm font-black text-accent-dark text-right">
                    {formatCurrency(Number(r.total_anggaran) || 0)}
                  </TD>
                  <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(r.created_at)}</TD>
                  <TD className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-accent-dark"
                        onClick={(e) => { e.stopPropagation(); navigate(`/rab/create?id=${r.id}`); }}
                        title="Lihat / Edit"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-amber-600"
                        onClick={(e) => { e.stopPropagation(); navigate(`/rab/create?id=${r.id}`); }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50"
                        onClick={(e) => handleDelete(e, r.id)}
                        title="Hapus RAB"
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

export default RAB;
