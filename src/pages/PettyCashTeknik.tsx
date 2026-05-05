import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HardHat, Building2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import { PettyCashView } from '../components/petty-cash/PettyCashView';

const LS_KEY = 'propdev_petty_teknik_project';

interface ProjectOption { id: string; name: string }
interface BalanceMap { [projectId: string]: number }

const PettyCashTeknikPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [balances, setBalances] = useState<BalanceMap>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    () => localStorage.getItem(LS_KEY) || ''
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectsAndBalances();
  }, []);

  useEffect(() => {
    if (selectedProjectId) localStorage.setItem(LS_KEY, selectedProjectId);
  }, [selectedProjectId]);

  const fetchProjectsAndBalances = async () => {
    try {
      setLoading(true);
      const [projData, pettyRows] = await Promise.all([
        api.get('projects', 'select=id,name&order=name.asc'),
        api.get('petty_cash', 'select=project_id,type,amount,status&division=eq.teknik'),
      ]);
      setProjects(projData || []);
      // Hitung saldo per proyek
      const map: BalanceMap = {};
      (pettyRows || []).forEach((r: any) => {
        if (r.status !== 'approved') return;
        const pid = r.project_id;
        if (!pid) return;
        if (!map[pid]) map[pid] = 0;
        map[pid] += r.type === 'in' ? r.amount : -r.amount;
      });
      setBalances(map);

      // Auto-select proyek pertama jika belum ada pilihan
      if (!selectedProjectId && projData && projData.length > 0) {
        setSelectedProjectId(projData[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <HardHat className="w-6 h-6 text-amber-600" />
            <h1 className="text-2xl font-bold text-text-primary">Petty Cash Teknik</h1>
          </div>
          <p className="text-text-secondary">Kas Kecil Operasional Lapangan — Per Proyek</p>
        </div>
      </div>

      {/* Selector Proyek */}
      <div className="flex flex-wrap gap-3">
        {loading ? (
          <div className="text-text-muted text-sm">Memuat proyek...</div>
        ) : projects.length === 0 ? (
          <div className="text-text-muted text-sm bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl">
            Belum ada proyek. Buat proyek di menu Proyek terlebih dahulu.
          </div>
        ) : (
          projects.map(p => {
            const isActive = p.id === selectedProjectId;
            const bal = balances[p.id] || 0;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2",
                  isActive
                    ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20"
                    : "bg-white/50 text-text-secondary border-white/40 hover:bg-white"
                )}
              >
                <Building2 className="w-4 h-4" />
                <span>{p.name}</span>
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full",
                  isActive ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700"
                )}>
                  {formatCurrency(bal)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* View untuk proyek terpilih */}
      {selectedProject ? (
        <PettyCashView
          key={selectedProject.id}                     /* re-mount saat ganti proyek */
          division="teknik"
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          accentColor="amber"
          title={`Petty Cash Teknik — ${selectedProject.name}`}
          subtitle="Kas Kecil Operasional Lapangan untuk proyek ini"
        />
      ) : (
        !loading && projects.length > 0 && (
          <div className="text-center py-12 text-text-muted bg-white/30 rounded-2xl">
            Pilih proyek di atas untuk melihat detail Petty Cash.
          </div>
        )
      )}
    </div>
  );
};

export default PettyCashTeknikPage;
