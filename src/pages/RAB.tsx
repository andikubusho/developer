import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Calculator, Plus, ArrowLeft, MapPin, Eye, Edit, Trash2, Home, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

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
