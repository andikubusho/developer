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
  ShoppingCart
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
    availableUnits: 0,
    totalLeads: 0,
    pendingFollowUps: 0,
    totalDeposits: 0,
    activePromos: 0,
    marketingStaff: 0,
    todaySchedules: 0,
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
    // Real Supabase fetching would go here
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

      // 1. Total Income (Verified Payments)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'verified');
      
      const totalIncome = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // 2. Total Sales Count
      const { count: salesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true });

      // 3. Unit Stats
      const { data: units } = await supabase
        .from('units')
        .select('status');
      
      const totalUnits = units?.length || 0;
      const soldUnits = units?.filter(u => u.status === 'sold').length || 0;
      const availableUnits = units?.filter(u => u.status === 'available').length || 0;

      // 4. Overdue Installments
      const { data: overdue } = await supabase
        .from('installments')
        .select('amount')
        .eq('status', 'overdue');
      
      const overdueAmount = overdue?.reduce((sum, i) => sum + i.amount, 0) || 0;

      setStats({
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
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      trend: '+15',
      isUp: true,
      path: '/leads'
    },
    { 
      title: 'Follow Up Pending', 
      value: formatNumber(stats.pendingFollowUps), 
      icon: MessageSquare, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50',
      trend: 'Hari ini',
      isUp: true,
      path: '/follow-ups'
    },
    { 
      title: 'Total Titipan', 
      value: formatCurrency(stats.totalDeposits), 
      icon: Wallet, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      trend: 'Bulan ini',
      isUp: true,
      path: '/deposits'
    },
    { 
      title: 'Total Penjualan', 
      value: formatNumber(stats.totalSales), 
      icon: ShoppingCart, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50',
      trend: '+3 unit',
      isUp: true,
      path: '/sales'
    },
    { 
      title: 'Promo Aktif', 
      value: formatNumber(stats.activePromos), 
      icon: Tag, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50',
      trend: 'Berjalan',
      isUp: true,
      path: '/promos'
    },
    { 
      title: 'Unit Tersedia', 
      value: `${formatNumber(stats.availableUnits)}/${formatNumber(stats.totalUnits)}`, 
      icon: Home, 
      color: 'text-slate-600', 
      bg: 'bg-slate-50',
      trend: 'Ready',
      isUp: true,
      path: '/units'
    },
    { 
      title: 'Jadwal Hari Ini', 
      value: formatNumber(stats.todaySchedules), 
      icon: Calendar, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50',
      trend: 'Kegiatan',
      isUp: true,
      path: '/marketing-schedule'
    },
    { 
      title: 'Tim Marketing', 
      value: formatNumber(stats.marketingStaff), 
      icon: UserCog, 
      color: 'text-cyan-600', 
      bg: 'bg-cyan-50',
      trend: 'Personil',
      isUp: true,
      path: '/marketing-master'
    },
  ];

  const chartData = [
    { name: 'Jan', income: 450000000 },
    { name: 'Feb', income: 520000000 },
    { name: 'Mar', income: 480000000 },
    { name: 'Apr', income: 610000000 },
    { name: 'May', income: 550000000 },
    { name: 'Jun', income: 670000000 },
  ];

  const pieData = [
    { name: 'Terjual', value: stats.soldUnits },
    { name: 'Tersedia', value: stats.availableUnits },
    { name: 'Booked', value: stats.totalUnits - stats.soldUnits - stats.availableUnits },
  ];

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Selamat datang kembali, {profile?.full_name}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            localStorage.removeItem('user_division');
            setDivision(null);
          }}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Ganti Divisi
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <Card key={idx} className="p-0 cursor-pointer hover:shadow-md transition-shadow">
            <div className="p-6" onClick={() => card.path && (window.location.href = card.path)}>
              <div className="flex items-center justify-between mb-4">
                <div className={cn('p-2 rounded-lg', card.bg)}>
                  <card.icon className={cn('w-6 h-6', card.color)} />
                </div>
                <div className={cn(
                  'flex items-center text-xs font-medium px-2 py-1 rounded-full',
                  card.isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                )}>
                  {card.isUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {card.trend}
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-500">{card.title}</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Calon Konsumen Terbaru">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-900">{lead.name}</p>
                        <p className="text-xs text-slate-500">{lead.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          lead.status === 'hot' ? 'bg-red-100 text-red-700' :
                          lead.status === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        )}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(lead.date)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-indigo-600 mt-4">
              Lihat Semua Calon Konsumen
            </Button>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Akses Cepat Dokumen">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => window.location.href = '/price-list'}>
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs">Price List</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => window.location.href = '/site-plan'}>
                  <Map className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs">Siteplan</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => window.location.href = '/floor-plan'}>
                  <Layout className="w-5 h-5 text-amber-600" />
                  <span className="text-xs">Denah</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => window.location.href = '/promos'}>
                  <Tag className="w-5 h-5 text-rose-600" />
                  <span className="text-xs">Promo</span>
                </Button>
              </div>
            </Card>

            <Card title="Jadwal Hari Ini">
              <div className="space-y-3">
                {todaySchedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      {schedule.time}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{schedule.activity}</p>
                      <p className="text-xs text-slate-500">Oleh: {schedule.staff}</p>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-indigo-600 mt-2">
                  Lihat Jadwal Lengkap
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Status Unit Properti">
            <div className="h-[250px] w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                    <span className="text-xs text-slate-600">{entry.name}: {formatNumber(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Cicilan Menunggak" subtitle="5 Teratas">
            <div className="space-y-4">
              {overdueInstallments.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-20" />
                  Tidak ada tunggakan.
                </div>
              ) : (
                overdueInstallments.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 truncate">{(item as any).sales?.customers?.name}</p>
                        <p className="text-[10px] text-slate-500">Jatuh tempo: {formatDate(item.due_date)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      <div>
                        <p className="text-sm font-bold text-rose-600">{formatCurrency(item.amount)}</p>
                        <p className="text-[10px] font-bold text-rose-400 uppercase">Overdue</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-1 h-auto text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
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
              <Button variant="ghost" size="sm" className="w-full text-indigo-600 mt-2" onClick={() => window.location.href = '/payments'}>
                Lihat Semua
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
