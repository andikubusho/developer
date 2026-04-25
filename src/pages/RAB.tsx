import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Calculator, Plus, Search, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

const RAB: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [rabs, setRabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRabs();
  }, []);

  const fetchRabs = async () => {
    try {
      setLoading(true);
      const data = await api.get('rab', 'select=*,project:projects(name)&order=created_at.desc');
      setRabs(data || []);
    } catch (error) {
      console.error('Error fetching RAB:', error);
    } finally {
      setLoading(false);
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
        <Button><Plus className="w-4 h-4 mr-2" /> Buat RAB Baru</Button>
      </div>

      <Card className="p-0">
        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">Proyek</TH>
                <TH className="px-6 py-3 font-semibold">Kategori</TH>
                <TH className="px-6 py-3 font-semibold text-right">Total Anggaran</TH>
                <TH className="px-6 py-3 font-semibold text-right">Terpakai</TH>
                <TH className="px-6 py-3 font-semibold">Tanggal</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={5} className="px-6 py-10 text-center text-text-muted">Memuat data...</TD></TR>
              ) : rabs.length === 0 ? (
                <TR><TD colSpan={5} className="px-6 py-10 text-center text-text-secondary">Belum ada data RAB.</TD></TR>
              ) : (
                rabs.map((r) => (
                  <TR key={r.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 font-medium text-text-primary">{r.project?.name || 'Proyek Umum'}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary capitalize">{r.category}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">{formatCurrency(r.total_budget)}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">{formatCurrency(r.spent_amount || 0)}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(r.created_at)}</TD>
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
