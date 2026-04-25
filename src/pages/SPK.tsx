import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const SPK: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [spks, setSpks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpks();
  }, []);

  const fetchSpks = async () => {
    try {
      setLoading(true);
      // Query table spks as seen in check_tables.js
      const data = await api.get('spks', 'select=*,project:projects(name)&order=created_at.desc');
      setSpks(data || []);
    } catch (error) {
      console.error('Error fetching SPK:', error);
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
            <h1 className="text-2xl font-bold text-text-primary">SPK Kontraktor</h1>
            <p className="text-text-secondary">Surat Perintah Kerja pelaksanaan proyek</p>
          </div>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Buat SPK Baru</Button>
      </div>

      <Card className="p-0">
        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">No. SPK</TH>
                <TH className="px-6 py-3 font-semibold">Proyek</TH>
                <TH className="px-6 py-3 font-semibold">Penerima</TH>
                <TH className="px-6 py-3 font-semibold text-right">Nilai Kontrak</TH>
                <TH className="px-6 py-3 font-semibold text-center">Status</TH>
                <TH className="px-6 py-3 font-semibold">Tanggal</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-muted">Memuat data...</TD></TR>
              ) : spks.length === 0 ? (
                <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-secondary">Belum ada data SPK.</TD></TR>
              ) : (
                spks.map((s) => (
                  <TR key={s.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 font-bold text-text-primary uppercase">SPK-{s.id.substring(0, 8)}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">{s.project?.name || 'Proyek Umum'}</TD>
                    <TD className="px-6 py-4 text-sm text-text-primary font-medium">{s.contractor_name || '-'}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">{formatCurrency(s.contract_value)}</TD>
                    <TD className="px-6 py-4">
                      <div className="flex justify-center items-center gap-1.5">
                        {s.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                        <span className={cn('text-xs font-medium capitalize', s.status === 'completed' ? 'text-emerald-700' : 'text-amber-700')}>{s.status}</span>
                      </div>
                    </TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(s.created_at)}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>
    </div>
  );
};

export default SPK;
