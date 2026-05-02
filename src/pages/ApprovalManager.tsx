import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowLeft,
  Building2,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  Clock,
  Printer
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

interface PR {
  id: string;
  project_id: string;
  item_name: string;
  status: string;
  items: any[];
  created_at: string;
  // enriched
  projectName?: string;
}

const ApprovalManager: React.FC = () => {
  const navigate = useNavigate();
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPRs = async () => {
    try {
      setLoading(true);
      const [prData, projData, materialData] = await Promise.all([
        api.get('purchase_requests', 'select=*&order=created_at.desc'),
        api.get('projects', 'select=id,name'),
        api.get('materials', 'select=id,name,unit'),
      ]);

      const projMap: Record<string, string> = {};
      (projData || []).forEach((p: any) => { projMap[p.id] = p.name; });

      const matMap: Record<string, any> = {};
      (materialData || []).forEach((m: any) => { matMap[m.id] = m; });

      const enriched = (prData || []).map((pr: any) => ({
        ...pr,
        projectName: pr.project_id ? (projMap[pr.project_id] || 'Unknown') : '-',
        items: (pr.items || []).map((item: any) => {
          const mat = matMap[item.material_id];
          return {
            ...item,
            name: item.name || item.materialName || mat?.name || 'Unknown Material',
            unit: item.unit || mat?.unit || '',
          };
        })
      }));

      setPrs(enriched);
    } catch (error) {
      console.error('Error fetching PRs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPRs();
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    const action = status === 'APPROVED' ? 'menyetujui' : 'menolak';
    if (!confirm(`Apakah Anda yakin ingin ${action} PR ini?`)) return;

    try {
      setLoading(true);
      await api.update('purchase_requests', id, { status });
      alert(`Berhasil ${status === 'APPROVED' ? 'menyetujui' : 'menolak'} PR.`);
      setIsModalOpen(false);
      fetchPRs();
    } catch (error: any) {
      alert(`Gagal memperbarui status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (pr: PR) => {
    const total = pr.items.reduce((sum: number, i: any) => sum + (i.qty || i.quantity || 0) * (i.price || 0), 0);
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PR-${pr.id.substring(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; color: #0f172a; margin: 0; }
            .meta { font-size: 14px; color: #64748b; margin-top: 4px; font-weight: 500; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
            .info-card { background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #f1f5f9; }
            .label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em; margin-bottom: 4px; }
            .value { font-size: 15px; font-weight: 700; color: #334155; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #0f172a; color: white; padding: 12px 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
            td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 500; color: #475569; }
            .total-row { background: #f8fafc; font-weight: 900; }
            .total-row td { border-bottom: none; font-size: 16px; color: #0f172a; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; border: 1px solid #cbd5e1; }
            .footer { margin-top: 60px; display: flex; justify-content: flex-end; }
            .signature { text-align: center; width: 200px; }
            .sig-line { border-top: 1px solid #0f172a; margin-top: 60px; padding-top: 8px; font-size: 11px; font-weight: 700; }
            @media print {
              body { padding: 0; }
              @page { margin: 20mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Purchase Request</h1>
              <div class="meta">ID PR: #${pr.id.substring(0, 8).toUpperCase()} | Tanggal: ${formatDate(pr.created_at)}</div>
            </div>
            <div class="badge">${pr.status}</div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <div class="label">Proyek</div>
              <div class="value">${pr.projectName}</div>
            </div>
            <div class="info-card">
              <div class="label">Nama Permintaan / Keterangan</div>
              <div class="value">${pr.item_name}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nama Material</th>
                <th style="text-align: center;">Jumlah (Qty)</th>
                <th style="text-align: right;">Harga Satuan</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${pr.items.map(item => `
                <tr>
                  <td>${item.name || item.materialName || 'Material'}</td>
                  <td style="text-align: center;">${item.qty || item.quantity || 0} ${item.unit || ''}</td>
                  <td style="text-align: right;">${formatCurrency(item.price || 0)}</td>
                  <td style="text-align: right;">${formatCurrency((item.qty || item.quantity || 0) * (item.price || 0))}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" style="text-align: right; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; color: #64748b;">Total Anggaran PR</td>
                <td style="text-align: right;">${formatCurrency(total)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <div class="signature">
              <div class="label">Mengetahui / Menyetujui</div>
              <div class="sig-line">Manager Operational</div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              // close window after print (optional)
              // window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      alert('Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir.');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch(s) {
      case 'PENDING': 
      case 'SUBMITTED':
        return { label: 'MENUNGGU', color: 'bg-amber-100 text-amber-600 border-amber-200', icon: Clock };
      case 'APPROVED': return { label: 'DISETUJUI', color: 'bg-emerald-100 text-emerald-600 border-emerald-200', icon: CheckCircle2 };
      case 'REJECTED': return { label: 'DITOLAK', color: 'bg-rose-100 text-rose-600 border-rose-200', icon: XCircle };
      default: return { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock };
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Approval Manager</h1>
            <p className="text-text-secondary font-medium">Persetujuan anggaran dan permintaan material proyek</p>
          </div>
        </div>
      </div>

      {/* Pending Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Menunggu Persetujuan</p>
            <p className="text-2xl font-black text-text-primary tracking-tight">
              {prs.filter(p => p.status === 'PENDING').length} Permintaan
            </p>
          </div>
        </Card>
      </div>

      {/* PR Table */}
      <Card className="p-0 border-none shadow-premium bg-white overflow-hidden">
        <div className="p-6 border-b border-white/20 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-accent-dark" />
          <h2 className="font-black text-text-primary uppercase tracking-tight">Daftar Permintaan Pembelian (PR)</h2>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full">
            <THead>
              <TR isHoverable={false}>
                <TH>ID & Tanggal</TH>
                <TH>Proyek</TH>
                <TH>Nama Permintaan</TH>
                <TH className="text-center">Jumlah Item</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading && prs.length === 0 ? (
                <TR isHoverable={false}>
                  <TD colSpan={6} className="py-20 text-center">
                    <RefreshCw className="w-8 h-8 text-accent-dark animate-spin mx-auto mb-4" />
                    <p className="text-text-muted font-bold uppercase text-[10px] tracking-widest">Memuat Permintaan...</p>
                  </TD>
                </TR>
              ) : prs.length === 0 ? (
                <TR isHoverable={false}>
                  <TD colSpan={6} className="py-20 text-center text-text-muted">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-bold uppercase text-[10px] tracking-widest">Tidak ada permintaan pembelian</p>
                  </TD>
                </TR>
              ) : prs.map((pr) => {
                const badge = getStatusBadge(pr.status);
                return (
                  <TR key={pr.id}>
                    <TD className="text-xs font-bold text-text-secondary">
                      #{pr.id.substring(0, 8)}
                      <div className="text-[10px] opacity-60 font-medium">{formatDate(pr.created_at)}</div>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-text-muted" />
                        <span className="font-bold text-text-primary text-sm">{pr.projectName}</span>
                      </div>
                    </TD>
                    <TD className="font-black text-text-primary text-sm">{pr.item_name}</TD>
                    <TD className="text-center font-bold text-text-secondary">{pr.items?.length || 0} Item</TD>
                    <TD>
                      <span className={cn("px-3 py-1 rounded-full text-[9px] font-black border tracking-widest flex items-center w-fit gap-1", badge.color)}>
                        <badge.icon className="w-3 h-3" /> {badge.label}
                      </span>
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-9 w-9 p-0 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                          onClick={() => handlePrint(pr)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-xl bg-accent-lavender/10 text-primary hover:bg-accent-lavender/20 h-9 px-4 font-bold"
                          onClick={() => { setSelectedPR(pr); setIsModalOpen(true); }}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Detail & Review
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Review Purchase Request"
        size="4xl"
      >
        {selectedPR && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 p-4 rounded-2xl bg-glass-deep/30 border border-white/40">
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Detail PR</p>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">{selectedPR.item_name}</h3>
                <p className="text-xs font-bold text-text-secondary mt-1">
                  Proyek: {selectedPR.projectName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Status Saat Ini</p>
                <span className={cn("px-3 py-1 rounded-full text-[10px] font-black border tracking-widest mt-1 inline-block", getStatusBadge(selectedPR.status).color)}>
                  {getStatusBadge(selectedPR.status).label}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/40 shadow-premium">
              <Table>
                <THead>
                  <TR className="bg-white/50">
                    <TH>Nama Material</TH>
                    <TH className="text-center">Jumlah (Qty)</TH>
                    <TH className="text-right">Est. Harga Satuan</TH>
                    <TH className="text-right">Total Est.</TH>
                  </TR>
                </THead>
                <TBody>
                  {selectedPR.items.map((item: any, idx: number) => (
                    <TR key={idx}>
                      <TD className="font-bold text-text-primary">{item.name || item.materialName}</TD>
                      <TD className="text-center font-black text-text-secondary">{item.qty || item.quantity || 0} {item.unit}</TD>
                      <TD className="text-right text-text-muted font-bold">{formatCurrency(item.price || 0)}</TD>
                      <TD className="text-right font-black text-text-primary">{formatCurrency((item.qty || item.quantity || 0) * (item.price || 0))}</TD>
                    </TR>
                  ))}
                  <TR className="bg-glass-deep/10">
                    <TD colSpan={3} className="text-right font-black uppercase text-[10px] tracking-widest">Total Anggaran PR</TD>
                    <TD className="text-right font-black text-xl text-primary">
                      {formatCurrency(selectedPR.items.reduce((sum: number, i: any) => sum + ((i.qty || i.quantity || 0) * (i.price || 0)), 0))}
                    </TD>
                  </TR>
                </TBody>
              </Table>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs font-medium text-amber-800 leading-relaxed">
                Persetujuan PR akan mengunci kuota RAB untuk proyek ini. Pastikan volume permintaan sesuai dengan perencanaan lapangan.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
              <Button 
                variant="ghost" 
                className="h-14 px-6 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-black uppercase tracking-widest"
                onClick={() => handlePrint(selectedPR)}
              >
                <Printer className="w-5 h-5 mr-2" /> Cetak PR
              </Button>

              <div className="flex-1 flex gap-4">
                {['PENDING', 'SUBMITTED'].includes((selectedPR.status || '').toUpperCase()) && (
                  <>
                    <Button 
                      variant="ghost" 
                      className="flex-1 h-14 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-black uppercase tracking-widest"
                      onClick={() => handleStatusUpdate(selectedPR.id, 'REJECTED')}
                      isLoading={loading}
                    >
                      <XCircle className="w-5 h-5 mr-2" /> Tolak / Batalkan
                    </Button>
                    <Button 
                      className="flex-1 h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest shadow-premium"
                      onClick={() => handleStatusUpdate(selectedPR.id, 'APPROVED')}
                      isLoading={loading}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" /> Setujui & Proses
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApprovalManager;
