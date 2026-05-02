import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Calculator, Plus, ArrowLeft, MapPin, Eye, Edit, Trash2, Home, BarChart3, Download, Upload, Printer } from 'lucide-react';
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
        api.get('rab_projects', 'select=id,nama_proyek,lokasi,keterangan,total_anggaran,created_at,unit_id&order=created_at.desc'),
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

        const ROMANS = new Set(['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV']);

        const resolveLevel = (rawLevel: any, rawUraian: any, row: any): number | null => {
          const str = String(rawLevel ?? '').trim().toUpperCase();
          if (str !== '') {
            // Explicit zero → Level 0
            if (str === '0') return 0;
            // Romans MUST be checked before single-letter: "I" matches both /^[A-Z]$/ and Romans
            if (ROMANS.has(str)) return 1;
            // Single letter A-Z → Level 0 (section labels A, B, C)
            if (/^[A-Z]$/.test(str)) return 0;
            // Positive integers (1, 2, 3…) → Level 2 (item numbers under sub-sections)
            if (/^\d+$/.test(str) && parseInt(str) >= 1) return 2;
          }
          // Blank Level: detect Level 3 by dash prefix or numeric data
          const uraian = String(rawUraian || '').trim();
          const hasData = row['Koefisien'] != null || row['Harga Material'] != null || row['Harga Upah'] != null;
          if (uraian !== '' && (uraian.startsWith('-') || hasData)) return 3;
          return null;
        };

        const newTree: any[] = [];
        const lastNodes: Record<number, any> = {};

        data.forEach((row: any) => {
          const level = resolveLevel(row['Level'], row['Uraian'], row);
          if (level === null) return;

          // Helper to round floating point from Excel
          const round = (val: any, dec = 4) => {
            if (val == null || val === '') return null;
            const num = Number(val);
            return Math.round((num + Number.EPSILON) * Math.pow(10, dec)) / Math.pow(10, dec);
          };

          const rawUraian = String(row['Uraian'] || '');
          const uraian = level === 3 ? rawUraian.replace(/^-\s*/, '').trim() : rawUraian;

          const node = {
            id: Math.random().toString(36).substring(2, 9),
            parent_id: level > 0 ? (lastNodes[level - 1]?.id || null) : null,
            level: level,
            uraian,
            volume: round(row['Volume'], 4),
            satuan: row['Satuan'] || '',
            koeff: round(row['Koefisien'], 4) ?? (level === 3 ? 1 : null),
            material_price: Math.round(Number(row['Harga Material']) || 0),
            wage_price: Math.round(Number(row['Harga Upah']) || 0),
            harga_rab: round(row['Harga RAB (Manual)'], 2),
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

  const handleExportRAB = async (rabId: string, projectName: string) => {
    try {
      const items = await api.get('rab_items', `rab_project_id=eq.${rabId}&select=*&order=urutan`);
      if (!items || items.length === 0) {
        alert('RAB tidak memiliki item untuk diekspor.');
        return;
      }

      const buildTree = (parentId: string | null = null): any[] => {
        return items
          .filter(i => i.parent_id === parentId)
          .map(i => ({
            ...i,
            children: buildTree(i.id)
          }));
      };

      const tree = buildTree(null);
      const flatData: any[] = [];
      
      const flatten = (nodes: any[]) => {
        nodes.forEach(node => {
          flatData.push({
            'Level': node.level,
            'Uraian': node.uraian,
            'Volume': node.volume,
            'Satuan': node.satuan,
            'Koefisien': node.koeff,
            'Harga Material': node.material_price,
            'Harga Upah': node.wage_price,
            'Harga RAB (Manual)': node.is_manual ? (node.harga_rab || '') : '',
            'Material ID': node.material_id
          });
          if (node.children && node.children.length > 0) {
            flatten(node.children);
          }
        });
      };
      
      flatten(tree);
      
      const ws = XLSX.utils.json_to_sheet(flatData);
      ws['!cols'] = [
        { wch: 8 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "RAB Data");
      XLSX.writeFile(wb, `RAB_${projectName}.xlsx`);
    } catch (error: any) {
      console.error(error);
      alert(`Gagal mengekspor RAB: ${error.message}`);
    }
  };

  const handlePrintRAB = async (rab: any) => {
    try {
      const items = await api.get('rab_items', `rab_project_id=eq.${rab.id}&select=*&order=urutan`);
      if (!items || items.length === 0) { alert('RAB tidak memiliki item.'); return; }

      const buildTree = (parentId: string | null = null): any[] =>
        items.filter((i: any) => i.parent_id === parentId).map((i: any) => ({ ...i, children: buildTree(i.id) }));

      const injectQty = (nodes: any[], parentVolume: number | null = null) => {
        nodes.forEach((node: any) => {
          node._parentVolume = parentVolume;
          if (node.level === 3 && !node.is_manual) {
            node._qty = (node.volume && node.volume !== 0) ? node.volume : (node.koeff || 0) * (parentVolume || 0);
            node._matTotal = node._qty * (node.material_price || 0);
            node._wageTotal = node._qty * (node.wage_price || 0);
          }
          injectQty(node.children, node.level === 2 ? node.volume : parentVolume);
        });
      };

      const calcMat = (node: any): number => {
        if (node.level === 3 && !node.is_manual) return node._matTotal || 0;
        if (node.level === 3 && node.is_manual) return node.harga_rab || 0;
        return node.children.reduce((s: number, c: any) => s + calcMat(c), 0);
      };
      const calcWage = (node: any): number => {
        if (node.level === 3 && !node.is_manual) return node._wageTotal || 0;
        if (node.level === 3 && node.is_manual) return 0;
        if (node.level === 2 && node.is_manual) return (node.volume || 0) * (node.wage_price || 0);
        return node.children.reduce((s: number, c: any) => s + calcWage(c), 0);
      };

      const tree = buildTree(null);
      injectQty(tree);

      const fmt = (n: number) => n > 0 ? `Rp ${Math.round(n).toLocaleString('id-ID')}` : '-';
      const labels = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];

      let rowsHtml = '';
      const renderRows = (nodes: any[], depth = 0, parentIdx = '') => {
        nodes.forEach((node: any, idx: number) => {
          const label = node.level === 0 ? labels[idx] || String(idx + 1)
            : node.level === 1 ? `${parentIdx}.${idx + 1}`
            : node.level === 2 ? `${parentIdx}.${idx + 1}`
            : '-';

          const sectionMat = calcMat(node);
          const sectionWage = calcWage(node);
          const sectionTotal = sectionMat + sectionWage;

          if (node.level === 0) {
            rowsHtml += `<tr style="background:#1A1A2E;color:white;font-weight:900">
              <td style="padding:8px 12px;text-align:center">${label}</td>
              <td colspan="6" style="padding:8px 12px;text-transform:uppercase;letter-spacing:1px">${node.uraian || ''}</td>
              <td style="padding:8px 12px;text-align:right">${fmt(sectionTotal)}</td>
            </tr>`;
          } else if (node.level === 1) {
            rowsHtml += `<tr style="background:#f0f0f5;font-weight:700">
              <td style="padding:6px 12px;text-align:center">${label}</td>
              <td colspan="6" style="padding:6px 12px;padding-left:${16 + depth * 16}px">${node.uraian || ''}</td>
              <td style="padding:6px 12px;text-align:right">${fmt(sectionTotal)}</td>
            </tr>`;
          } else if (node.level === 2) {
            const matLabel = node.is_manual ? fmt((node.volume||0)*(node.material_price||0)) : '';
            const wageLabel = node.is_manual ? fmt((node.volume||0)*(node.wage_price||0)) : '';
            rowsHtml += `<tr style="background:#fafafa;font-weight:600">
              <td style="padding:5px 12px;text-align:center">${label}</td>
              <td style="padding:5px 12px;padding-left:${20 + depth * 16}px">${node.uraian || ''}</td>
              <td style="padding:5px 12px;text-align:center">${node.volume || ''}</td>
              <td style="padding:5px 12px;text-align:center">${node.satuan || ''}</td>
              <td style="padding:5px 12px;text-align:right">${matLabel}</td>
              <td style="padding:5px 12px;text-align:right">${wageLabel}</td>
              <td style="padding:5px 12px;text-align:right">${fmt(sectionTotal)}</td>
              <td style="padding:5px 12px;text-align:right;font-weight:900">${fmt(sectionTotal)}</td>
            </tr>`;
          } else {
            const qty = node._qty || 0;
            rowsHtml += `<tr style="background:white">
              <td style="padding:4px 12px;text-align:center;color:#888">-</td>
              <td style="padding:4px 12px;padding-left:${24 + depth * 16}px;font-style:italic;color:#444">${node.uraian || ''}</td>
              <td style="padding:4px 12px;text-align:center">${node.is_manual ? '' : (node.koeff ?? '')}${!node.is_manual && node._qty ? ` × ${node._qty}` : ''}</td>
              <td style="padding:4px 12px;text-align:center">${node.satuan || ''}</td>
              <td style="padding:4px 12px;text-align:right;color:#1d4ed8">${node.is_manual ? fmt(node.harga_rab||0) : fmt(node._matTotal||0)}</td>
              <td style="padding:4px 12px;text-align:right;color:#ea580c">${node.is_manual ? '-' : fmt(node._wageTotal||0)}</td>
              <td style="padding:4px 12px;text-align:right">${fmt((node._matTotal||0)+(node._wageTotal||0))}</td>
              <td style="padding:4px 12px;text-align:right;font-weight:700">${fmt((node._matTotal||0)+(node._wageTotal||0))}</td>
            </tr>`;
          }

          if (node.children.length > 0) renderRows(node.children, depth + 1, label);

          if (node.level === 0) {
            rowsHtml += `<tr style="background:#e8e8f0;border-top:2px solid #1A1A2E">
              <td colspan="4" style="padding:6px 12px;text-align:right;font-weight:700;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px">Subtotal ${node.uraian || ''}</td>
              <td style="padding:6px 12px;text-align:right;font-weight:900;color:#1d4ed8">${fmt(sectionMat)}</td>
              <td style="padding:6px 12px;text-align:right;font-weight:900;color:#ea580c">${fmt(sectionWage)}</td>
              <td style="padding:6px 12px;text-align:right;font-weight:900">${fmt(sectionTotal)}</td>
              <td style="padding:6px 12px;text-align:right;font-weight:900">${fmt(sectionTotal)}</td>
            </tr><tr><td colspan="8" style="height:8px;background:#f5f5fa"></td></tr>`;
          }
        });
      };
      renderRows(tree);

      const totalMat = tree.reduce((s: number, n: any) => s + calcMat(n), 0);
      const totalWage = tree.reduce((s: number, n: any) => s + calcWage(n), 0);
      const grandTotal = totalMat + totalWage;

      const unitLabel = rab.unit ? `${rab.unit.unit_number}${rab.unit.type ? ' - ' + rab.unit.type : ''}` : '-';
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>RAB - ${rab.nama_proyek}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 20px; }
          @media print { body { padding: 0; } @page { size: A4 landscape; margin: 12mm; } }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1A1A2E; color: white; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
          td { border-bottom: 1px solid #e5e5e5; }
          .header-box { border: 1px solid #ccc; padding: 16px 20px; margin-bottom: 16px; display: flex; justify-content: space-between; }
          .header-title { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
        </style>
      </head><body>
        <div class="header-box">
          <div>
            <div class="header-title">Rencana Anggaran Biaya (RAB)</div>
            <div style="margin-top:8px;font-size:12px;color:#555">
              <strong>Proyek:</strong> ${rab.nama_proyek} &nbsp;|&nbsp;
              <strong>Unit:</strong> ${unitLabel} &nbsp;|&nbsp;
              <strong>Lokasi:</strong> ${rab.lokasi || '-'} &nbsp;|&nbsp;
              <strong>Tanggal:</strong> ${new Date(rab.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}
            </div>
          </div>
        </div>
        <table>
          <thead><tr>
            <th style="width:50px;text-align:center">No</th>
            <th>Uraian Pekerjaan</th>
            <th style="width:70px;text-align:center">Koeff</th>
            <th style="width:70px;text-align:center">Satuan</th>
            <th style="width:110px;text-align:right">Total Material</th>
            <th style="width:110px;text-align:right">Total Upah</th>
            <th style="width:110px;text-align:right">Sub Total</th>
            <th style="width:120px;text-align:right">Total Biaya</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr style="background:#1A1A2E;color:white">
              <td colspan="4" style="padding:10px 12px;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:1px">REKAPITULASI</td>
              <td style="padding:10px 12px;text-align:right;font-weight:900;color:#93c5fd">${fmt(totalMat)}</td>
              <td style="padding:10px 12px;text-align:right;font-weight:900;color:#fdba74">${fmt(totalWage)}</td>
              <td style="padding:10px 12px;text-align:right;font-weight:900">${fmt(grandTotal)}</td>
              <td style="padding:10px 12px;text-align:right;font-weight:900;font-size:13px">${fmt(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
        <script>window.onload=()=>{window.print();}</script>
      </body></html>`;

      const win = window.open('', '_blank', 'width=1100,height=800');
      if (win) { win.document.write(html); win.document.close(); }
    } catch (error: any) {
      console.error(error);
      alert(`Gagal mencetak RAB: ${error.message}`);
    }
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
              <TH className="px-6 py-3 font-semibold">Keterangan</TH>
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
                  <TD className="px-6 py-4 text-sm text-text-secondary italic">
                    {r.keterangan || '-'}
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
                        className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50"
                        onClick={(e) => { e.stopPropagation(); handleExportRAB(r.id, r.nama_proyek); }}
                        title="Download Excel"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-violet-600 hover:bg-violet-50"
                        onClick={(e) => { e.stopPropagation(); handlePrintRAB(r); }}
                        title="Cetak RAB"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50"
                        onClick={(e) => handleDelete(e, r.id)}
                        title="Hapus"
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
