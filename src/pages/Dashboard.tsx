import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Home, 
  CreditCard, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ArrowLeft,
  UserPlus,
  Wallet,
  Tag,
  Calendar,
  UserCog,
  FileText,
  Map,
  Layout,
  ShoppingCart,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Sale, Installment, Payment } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { formatDate, formatCurrency, formatNumber, cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { profile, isMockMode, division, setDivision } = useAuth();
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalSales: 0,
    totalUnits: 0,
    overdueAmount: 0,
    soldUnits: 0,
    availableUnits: 35,
    totalLeads: 124,
    pendingFollowUps: 18,
    totalDeposits: 45000000,
    activePromos: 3,
    marketingStaff: 8,
    todaySchedules: 2,
  });
  const [loading, setLoading] = useState(true);

  const [overdueInstallments, setOverdueInstallments] = useState<any[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);

  useEffect(() => {
    if (division === 'marketing') {
      fetchDashboardData();
      fetchOverdueInstallments();
      fetchMarketingSpecifics();
    } else {
      setLoading(false);
    }
  }, [division]);

  const fetchMarketingSpecifics = async () => {
    if (isMockMode) {
      setRecentLeads([
        { id: '1', name: 'Ahmad Hidayat', phone: '08123456789', status: 'hot', date: '2026-03-27' },
        { id: '2', name: 'Linda Wati', phone: '08123456780', status: 'medium', date: '2026-03-27' },
        { id: '3', name: 'Rizky Pratama', phone: '08123456781', status: 'low', date: '2026-03-26' },
      ]);
      setTodaySchedules([
        { id: '1', staff: 'Andi', time: '10:00', activity: 'Pameran Mall' },
        { id: '2', staff: 'Budi', time: '13:00', activity: 'Canvassing Area A' },
      ]);
      return;
    }
  };

  const fetchOverdueInstallments = async () => {
    if (isMockMode) {
      const mockOverdue = [
        {
          id: '1',
          amount: 5000000,
          due_date: '2026-03-20T00:00:00Z',
          status: 'overdue',
          sales: {
            customers: {
              name: 'Budi Santoso',
              phone: '08123456789'
            }
          }
        },
        {
          id: '2',
          amount: 7500000,
          due_date: '2026-03-15T00:00:00Z',
          status: 'overdue',
          sales: {
            customers: {
              name: 'Siti Aminah',
              phone: '08987654321'
            }
          }
        }
      ];
      setOverdueInstallments(mockOverdue);
      return;
    }

    const { data } = await supabase
      .from('installments')
      .select('*, sales(customer_id, customers(name))')
      .eq('status', 'overdue')
      .limit(5);
    
    setOverdueInstallments(data || []);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (isMockMode) {
        setStats({
          totalIncome: 1250000000,
          totalSales: 15,
          totalUnits: 50,
          overdueAmount: 12500000,
          soldUnits: 12,
          availableUnits: 35,
          totalLeads: 124,
          pendingFollowUps: 18,
          totalDeposits: 45000000,
          activePromos: 3,
          marketingStaff: 8,
          todaySchedules: 2,
        });
        setLoading(false);
        return;
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'verified');
      
      const totalIncome = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      const { count: salesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true });

      const { data: units } = await supabase
        .from('units')
        .select('status');
      
      const totalUnits = units?.length || 0;
      const soldUnits = units?.filter(u => u.status === 'sold').length || 0;
      const availableUnits = units?.filter(u => u.status === 'available').length || 0;

      const { data: overdue } = await supabase
        .from('installments')
        .select('amount')
        .eq('status', 'overdue');
      
      const overdueAmount = overdue?.reduce((sum, i) => sum + i.amount, 0) || 0;

      setStats({
        ...stats,
        totalIncome,
        totalSales: salesCount || 0,
        totalUnits,
        overdueAmount,
        soldUnits,
        availableUnits,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Calon Konsumen', 
      value: formatNumber(stats.totalLeads), 
      icon: UserPlus, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50/50',
      trend: '+15',
      isUp: true,
      path: '/leads'
    },
    { 
      title: 'Follow Up Pending', 
      value: formatNumber(stats.pendingFollowUps), 
      icon: MessageSquare, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50/50',
      trend: 'Hari ini',
      isUp: true,
      path: '/follow-ups'
    },
    { 
      title: 'Total Titipan', 
      value: formatCurrency(stats.totalDeposits), 
      icon: Wallet, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50/50',
      trend: 'Bulan ini',
      isUp: true,
      path: '/deposits'
    },
    { 
      title: 'Total Penjualan', 
      value: formatNumber(stats.totalSales), 
      icon: ShoppingCart, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50/50',
      trend: '+3 unit',
      isUp: true,
      path: '/sales'
    },
  ];

  const pieData = [
    { name: 'Terjual', value: stats.soldUnits },
    { name: 'Tersedia', value: stats.availableUnits },
    { name: 'Booked', value: stats.totalUnits - stats.soldUnits - stats.availableUnits },
  ];

  const COLORS = ['#6366f1', '#10b981', '#f59e0b'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ringkasan Bisnis</h1>
          <p className="text-slate-500 font-medium">Informasi terkini performa perusahaan Anda.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="md" 
            onClick={() => {
              localStorage.removeItem('user_division');
              setDivision(null);
            }}
            className="rounded-2xl border-slate-200/60"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ganti Divisi
          </Button>
          <Button variant="primary" size="md" className="rounded-2xl">
            Laporan Detail
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {statCards.map((card, idx) => (
          <Card key={idx} className="group p-1 bg-gradient-to-br from-white to-slate-50 border-none shadow-premium hover:shadow-2xl hover:shadow-indigo-200/20 transition-all duration-500">
            <div className="p-8" onClick={() => card.path && (window.location.href = card.path)}>
              <div className="flex items-center justify-between mb-6">
                <div className={cn('p-4 rounded-2xl shadow-sm transition-transform group-hover:scale-110 duration-300', card.bg)}>
                  <card.icon className={cn('w-7 h-7', card.color)} />
                </div>
                <div className={cn(
                  'flex items-center text-xs font-black px-3 py-1.5 rounded-xl',
                  card.isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                )}>
                  {card.isUp ? <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-1" />}
                  {card.trend}
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{card.title}</h3>
              <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{card.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card title="Calon Konsumen Terbaru" subtitle="Peluang penjualan yang masuk hari ini">
            <Table>
              <THead>
                <TR isHoverable={false}>
                  <TH>Nama Konsumen</TH>
                  <TH>Status</TH>
                  <TH>Tanggal</TH>
                  <TH className="text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {recentLeads.map((lead) => (
                  <TR key={lead.id}>
                    <TD>
                      <p className="font-black text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-400 font-bold">{lead.phone}</p>
                    </TD>
                    <TD>
                      <span className={cn(
                        'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                        lead.status === 'hot' ? 'bg-rose-100/50 text-rose-600' :
                        lead.status === 'medium' ? 'bg-amber-100/50 text-amber-600' :
                        'bg-indigo-100/50 text-indigo-600'
                      )}>
                        {lead.status}
                      </span>
                    </TD>
                    <TD className="text-slate-400 font-bold">{formatDate(lead.date)}</TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="mt-6">
              <Button variant="outline" size="sm" className="w-full text-primary border-slate-100 rounded-xl font-black uppercase tracking-widest text-[10px] h-12">
                Lihat Seluruh Lead
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card title="Dokumen Proyek" subtitle="Akses cepat materi pemasaran">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Price List', path: '/price-list', icon: FileText, color: 'text-primary', bg: 'bg-indigo-50/50' },
                  { label: 'Siteplan', path: '/site-plan', icon: Map, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
                  { label: 'Denah Unit', path: '/floor-plan', icon: Layout, color: 'text-amber-500', bg: 'bg-amber-50/50' },
                  { label: 'Promo Unit', path: '/promos', icon: Tag, color: 'text-rose-500', bg: 'bg-rose-50/50' },
                ].map((btn) => (
                  <button 
                    key={btn.label}
                    onClick={() => window.location.href = btn.path}
                    className="group p-6 flex flex-col items-center gap-3 rounded-2xl bg-white border border-slate-100 transition-all hover:bg-slate-50 hover:shadow-premium hover:-translate-y-1"
                  >
                    <div className={cn('p-3 rounded-xl transition-transform group-hover:scale-110', btn.bg)}>
                      <btn.icon className={cn('w-6 h-6', btn.color)} />
                    </div>
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{btn.label}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Jadwal Hari Ini" subtitle="Kegiatan tim di lapangan">
              <div className="space-y-4">
                {todaySchedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50 group hover:bg-indigo-50/30 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary font-black text-[10px] shadow-sm tracking-tighter">
                      {schedule.time}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{schedule.activity}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">PIC: {schedule.staff}</p>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-primary border-slate-100 rounded-xl font-black uppercase tracking-widest text-[10px] h-12 mt-2">
                  Lihat Kalender Kerja
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-8">
          <Card title="Efektivitas Unit" subtitle="Distribusi stok properti">
            <div className="h-[300px] w-full flex flex-col items-center justify-center pt-4">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-6 mt-8">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{entry.name}</span>
                    <span className="text-xs font-black text-slate-900">{formatNumber(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Peringatan Tunggakan" subtitle="Tindakan segera diperlukan">
            <div className="space-y-4">
              {overdueInstallments.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-40" />
                  </div>
                  <p className="font-bold text-slate-400">Semua cicilan aman.</p>
                </div>
              ) : (
                overdueInstallments.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 border border-rose-100/50 group hover:shadow-premium transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-sm transition-transform group-hover:rotate-12">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-black text-slate-900 truncate">{(item as any).sales?.customers?.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap mt-0.5">Jatuh tempo: {formatDate(item.due_date)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-4 pl-2">
                      <div className="hidden sm:block">
                        <p className="text-[13px] font-black text-rose-600 tracking-tight">{formatCurrency(item.amount)}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-0 h-10 w-10 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/50 rounded-xl"
                        onClick={() => {
                          const phone = (item as any).sales?.customers?.phone || '';
                          const name = (item as any).sales?.customers?.name || '';
                          const amount = formatCurrency(item.amount);
                          const message = `Halo Bapak/Ibu ${name}, ini pengingat untuk pembayaran cicilan properti Anda sebesar ${amount} yang telah jatuh tempo pada ${formatDate(item.due_date)}. Mohon segera melakukan pembayaran. Terima kasih.`;
                          window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <Button variant="ghost" size="sm" className="w-full text-primary border-slate-100 rounded-xl font-black uppercase tracking-widest text-[10px] h-12 mt-2" onClick={() => window.location.href = '/payments'}>
                Buka Data Pembayaran
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
