import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  ArrowLeft,
  Building2,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { formatDate, formatCurrency, cn } from '../lib/utils';

interface PR {
  id: string;
  projectId: string;
  itemName: string;
  status: string;
  items: any[];
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

const ApprovalManager: React.FC = () => {
  const navigate = useNavigate();
  const [prs, setPrs] = useState<PR[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPRs = async () => {
    try {
      setLoading(true);
      const [resPR, resProj] = await Promise.all([
        fetch('/api/purchase-requests').then(res => res.json()),
        fetch('/api/projects').then(res => res.json())
      ]);
      setPrs(resPR || []);
      setProjects(resProj || []);
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
      const res = await fetch(`/api/purchase-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!res.ok) throw new Error('Gagal memperbarui status');
      
      setIsModalOpen(false);
      fetchPRs();
    } catch (error) {
      alert('Error updating status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'SUBMITTED': return { label: 'MENUNGGU', color: 'bg-amber-100 text-amber-600 border-amber-200', icon: Clock };
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
              {prs.filter(p => p.status === 'SUBMITTED').length} Permintaan
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
                const proj = projects.find(p => p.id === pr.projectId);
                return (
                  <TR key={pr.id}>
                    <TD className="text-xs font-bold text-text-secondary">
                      #{pr.id.substring(0, 8)}
                      <div className="text-[10px] opacity-60 font-medium">{formatDate(pr.createdAt)}</div>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-text-muted" />
                        <span className="font-bold text-text-primary text-sm">{proj?.name || 'Unknown'}</span>
                      </div>
                    </TD>
                    <TD className="font-black text-text-primary text-sm">{pr.itemName}</TD>
                    <TD className="text-center font-bold text-text-secondary">{pr.items?.length || 0} Item</TD>
                    <TD>
                      <span className={cn("px-3 py-1 rounded-full text-[9px] font-black border tracking-widest flex items-center w-fit gap-1", badge.color)}>
                        <badge.icon className="w-3 h-3" /> {badge.label}
                      </span>
                    </TD>
                    <TD className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl bg-accent-lavender/10 text-primary hover:bg-accent-lavender/20"
                        onClick={() => { setSelectedPR(pr); setIsModalOpen(true); }}
                      >
                        <Eye className="w-4 h-4 mr-2" /> Detail & Review
                      </Button>
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
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">{selectedPR.itemName}</h3>
                <p className="text-xs font-bold text-text-secondary mt-1">
                  Proyek: {projects.find(p => p.id === selectedPR.projectId)?.name}
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
                      <TD className="text-center font-black text-text-secondary">{item.qty} {item.unit}</TD>
                      <TD className="text-right text-text-muted font-bold">{formatCurrency(item.price || 0)}</TD>
                      <TD className="text-right font-black text-text-primary">{formatCurrency((item.qty || 0) * (item.price || 0))}</TD>
                    </TR>
                  ))}
                  <TR className="bg-glass-deep/10">
                    <TD colSpan={3} className="text-right font-black uppercase text-[10px] tracking-widest">Total Anggaran PR</TD>
                    <TD className="text-right font-black text-xl text-primary">
                      {formatCurrency(selectedPR.items.reduce((sum: number, i: any) => sum + (i.qty * (i.price || 0)), 0))}
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

            {selectedPR.status === 'SUBMITTED' && (
              <div className="flex gap-4 pt-4">
                <Button 
                  variant="ghost" 
                  className="flex-1 h-14 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-black uppercase tracking-widest"
                  onClick={() => handleStatusUpdate(selectedPR.id, 'REJECTED')}
                  isLoading={loading}
                >
                  <XCircle className="w-5 h-5 mr-2" /> Tolak Permintaan
                </Button>
                <Button 
                  className="flex-1 h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest shadow-glass shadow-glass"
                  onClick={() => handleStatusUpdate(selectedPR.id, 'APPROVED')}
                  isLoading={loading}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Setujui & Proses
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApprovalManager;
