import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, CheckCircle2, XCircle, Clock, Landmark, Wallet, RotateCcw, Home, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

type CfStatus = 'pending' | 'verified';

interface CashFlowItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'in' | 'out';
  category: string;
  bank_account_id: string | null;
  status: CfStatus;
  reference_id: string;
  reference_type: 'deposit' | 'payment';
  isOrphan?: boolean;
  // joined
  bank?: { bank_name: string; account_number: string } | null;
  payment?: {
    id: string;
    payment_method: string;
    installment_id: string | null;
    sale?: {
      id: string;
      customer?: { full_name: string };
      unit?: { unit_number: string };
    };
  } | null;
  deposit?: { name: string; phone: string } | null;
}

type TabType = 'pending' | 'verified';

const VerificationQueue: React.FC = () => {
  const navigate = useNavigate();
  const { profile, division } = useAuth();
  const [items, setItems] = useState<CashFlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  const isKeuangan = profile?.role === 'admin' || division === 'keuangan' || division === 'audit';

  useEffect(() => {
    if (!isKeuangan && !loading) {
      navigate('/', { replace: true });
    }
    fetchData();
  }, [division, profile]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cfData, bankData, allPendingPayments] = await Promise.all([
        api.get('cash_flow', `status=eq.${activeTab}&order=date.desc`),
        api.get('bank_accounts', 'select=id,bank_name,account_number'),
        activeTab === 'pending' ? api.get('payments', 'select=*&status=eq.pending&order=payment_date.desc') : Promise.resolve([]),
      ]);
      const rawItems: CashFlowItem[] = cfData || [];

      // Batch fetch — avoid N+1 queries per item
      const paymentIds = rawItems.filter(i => i.reference_type === 'payment' && i.reference_id).map(i => i.reference_id);
      const depositIds = rawItems.filter(i => i.reference_type === 'deposit' && i.reference_id).map(i => i.reference_id);

      const [paymentsRaw, depositsRaw, salesRaw, customersRaw, unitsRaw] = await Promise.all([
        paymentIds.length > 0 ? api.get('payments', `select=id,payment_method,installment_id,sale_id&id=in.(${paymentIds.join(',')})`) : Promise.resolve([]),
        depositIds.length > 0 ? api.get('deposits', `select=id,name,phone&id=in.(${depositIds.join(',')})`) : Promise.resolve([]),
        api.get('sales', 'select=id,customer_id,unit_id'),
        api.get('customers', 'select=id,full_name'),
        api.get('units', 'select=id,unit_number'),
      ]);

      const customerMap: Record<string, any> = {};
      (customersRaw || []).forEach((c: any) => { customerMap[c.id] = c; });
      const unitMap: Record<string, any> = {};
      (unitsRaw || []).forEach((u: any) => { unitMap[u.id] = u; });
      const saleMap: Record<string, any> = {};
      (salesRaw || []).forEach((s: any) => {
        saleMap[s.id] = { ...s, customer: customerMap[s.customer_id] || null, unit: unitMap[s.unit_id] || null };
      });
      const paymentMap: Record<string, any> = {};
      (paymentsRaw || []).forEach((p: any) => {
        paymentMap[p.id] = { ...p, sale: p.sale_id ? (saleMap[p.sale_id] || null) : null };
      });
      const depositMap: Record<string, any> = {};
      (depositsRaw || []).forEach((d: any) => { depositMap[d.id] = d; });

      const enriched = rawItems.map((item: any) => {
        const bank = item.bank_account_id ? (bankData || []).find((b: any) => b.id === item.bank_account_id) || null : null;
        const payment = item.reference_type === 'payment' ? (paymentMap[item.reference_id] || null) : null;
        const deposit = item.reference_type === 'deposit' ? (depositMap[item.reference_id] || null) : null;
        return { ...item, bank, payment, deposit };
      });

      // Deduplicate by reference_id — keep only first occurrence per payment/deposit
      const seen = new Set<string>();
      const unique = enriched.filter((item) => {
        if (seen.has(item.reference_id)) return false;
        seen.add(item.reference_id);
        return true;
      });

      // Orphaned payments: pending payments with no cash_flow entry (checked against ALL cash_flow records)
      const allCfRefRes = await api.get('cash_flow', 'select=reference_id');
      const cfReferenceIds = new Set((allCfRefRes || []).map((i: any) => i.reference_id));

      // Deduplicate orphans: same sale_id + amount + payment_date → keep latest created_at
      const dedupedOrphans = Object.values(
        (allPendingPayments || [])
          .filter((p: any) => !cfReferenceIds.has(p.id))
          .reduce((acc: Record<string, any>, p: any) => {
            const key = `${p.sale_id}|${p.amount}|${p.payment_date}`;
            if (!acc[key] || (p.created_at || '') > (acc[key].created_at || '')) {
              acc[key] = p;
            }
            return acc;
          }, {})
      );

      const orphanItems: CashFlowItem[] = dedupedOrphans.map((p: any) => {
          const sale = p.sale_id ? (saleMap[p.sale_id] || null) : null;
          const bank = p.bank_account_id ? (bankData || []).find((b: any) => b.id === p.bank_account_id) || null : null;
          return {
            id: p.id,
            date: p.payment_date,
            description: 'Pembayaran konsumen (belum ada entri kas)',
            amount: p.amount,
            type: 'in' as const,
            category: 'Pembayaran Unit',
            bank_account_id: p.bank_account_id,
            status: 'pending' as CfStatus,
            reference_id: p.id,
            reference_type: 'payment' as const,
            isOrphan: true,
            bank,
            payment: { 
              id: p.id, 
              payment_method: p.payment_method, 
              installment_id: p.installment_id || null, 
              sale 
            },
            deposit: null,
          };
        });

      setItems([...unique, ...orphanItems]);
    } catch (error) {
      console.error('Error fetching verification queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (item: CashFlowItem) => {
    if (!isKeuangan) { alert('Hanya Admin atau Keuangan yang dapat melakukan verifikasi.'); return; }
    if (!confirm('Verifikasi transaksi ini? Data akan masuk ke laporan Arus Kas.')) return;
    try {
      setLoading(true);

      if (item.isOrphan) {
        // Orphaned payment — create cash_flow entry then mark verified
        const duplicates = await api.get('payments', 
          `sale_id=eq.${item.payment?.sale?.id}&amount=eq.${item.amount}&payment_date=eq.${item.date}&status=eq.pending`
        );
        
        if (duplicates && duplicates.length > 0) {
          await Promise.all(duplicates.map((p: any) => 
            api.update('payments', p.id, { status: 'verified' })
          ));
        } else {
          await api.update('payments', item.reference_id, { status: 'verified' });
        }

        // --- OVERPAYMENT LOGIC START ---
        let currentExcess = item.amount;
        const saleId = item.payment?.sale?.id;
        let auditNote = "";
        const customerName = item.payment?.sale?.customer?.full_name || 'Konsumen';
        const unitNumber = item.payment?.sale?.unit?.unit_number || '-';

        if (saleId) {
          const distributionLog: string[] = [];
          // Fetch all unpaid installments for this sale to apply payment (FIFO)
          const installments = await api.get('installments', `sale_id=eq.${saleId}&status=eq.unpaid&order=due_date.asc`);
          
          if (installments && installments.length > 0) {
            for (const inst of installments) {
              if (currentExcess <= 0) break;

              if (currentExcess >= Number(inst.amount)) {
                await api.update('installments', inst.id, { 
                  status: 'paid', 
                  paid_at: new Date().toISOString(),
                });
                distributionLog.push(`Lunas Inst ${formatDate(inst.due_date)}`);
                currentExcess -= Number(inst.amount);
              } else {
                const newAmount = Number(inst.amount) - currentExcess;
                await api.update('installments', inst.id, { 
                  amount: newAmount 
                });
                distributionLog.push(`Potong Inst ${formatDate(inst.due_date)} senilai ${formatCurrency(currentExcess)} (Sisa ${formatCurrency(newAmount)})`);
                currentExcess = 0;
              }
            }
          }

          if (distributionLog.length > 0) {
            auditNote = ` [Distribusi FIFO: ${distributionLog.join(', ')}]`;
            
            // Send Notification if overpayment happened (multiple items in log or remaining excess)
            if (distributionLog.length > 1) {
              try {
                await api.insert('notifications', {
                  target_divisions: ['marketing', 'keuangan'],
                  title: 'Kelebihan Bayar (Manual)',
                  message: `${customerName} (${unitNumber}) - Bayar ${formatCurrency(item.amount)} otomatis memotong beberapa cicilan.`,
                  sender_name: profile?.full_name || 'System',
                  metadata: { type: 'overpayment_manual', sale_id: saleId }
                });
              } catch (nErr) { console.error("Notification failed", nErr); }
            }
          }
        }
        // --- OVERPAYMENT LOGIC END ---

        const checkExisting = await api.get('cash_flow', `reference_id=eq.${item.reference_id}&reference_type=eq.payment`);
        if (!checkExisting || checkExisting.length === 0) {
          await api.insert('cash_flow', {
            date: item.date,
            description: item.description + auditNote,
            amount: item.amount,
            type: 'in',
            category: item.category,
            status: 'verified',
            reference_id: item.reference_id,
            reference_type: 'payment',
            bank_account_id: item.bank_account_id,
          });
        }
      } else {
        // Normal cash_flow item
        const table = item.reference_type === 'deposit' ? 'deposits' : 'payments';
        
        if (item.reference_type === 'payment') {
           const duplicates = await api.get('payments', 
            `sale_id=eq.${item.payment?.sale?.id}&amount=eq.${item.amount}&payment_date=eq.${item.date}&status=eq.pending`
          );
          if (duplicates && duplicates.length > 0) {
            await Promise.all(duplicates.map((p: any) => 
              api.update('payments', p.id, { status: 'verified' })
            ));
          }
        }

        await api.update(table, item.reference_id, { status: 'verified' });

        const relatedCf = await api.get('cash_flow', `reference_id=eq.${item.reference_id}&status=eq.pending`);
        
        // Audit Trail for Description
        let auditNote = "";
        const customerName = item.payment?.sale?.customer?.full_name || 'Konsumen';
        const unitNumber = item.payment?.sale?.unit?.unit_number || '-';

        if (item.reference_type === 'payment' && item.payment?.sale?.id) {
          const saleId = item.payment.sale.id;
          let currentExcess = item.amount;
          const distributionLog: string[] = [];

          // 1. Handle the linked installment first if exists
          if (item.payment.installment_id) {
            const linkedInst = await api.get('installments', `id=eq.${item.payment.installment_id}`);
            if (linkedInst && linkedInst[0]) {
              const instAmount = Number(linkedInst[0].amount);
              if (currentExcess >= instAmount) {
                await api.update('installments', item.payment.installment_id, {
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                });
                distributionLog.push(`Lunas Inst ${formatDate(linkedInst[0].due_date)}`);
                currentExcess -= instAmount;
              } else {
                await api.update('installments', item.payment.installment_id, {
                  amount: instAmount - currentExcess,
                });
                distributionLog.push(`Sebagian Inst ${formatDate(linkedInst[0].due_date)} (Sisa ${formatCurrency(instAmount - currentExcess)})`);
                currentExcess = 0;
              }
            }
          }

          // 2. If there is still excess, apply to NEXT unpaid installments
          if (currentExcess > 0) {
            const nextInstallments = await api.get('installments', 
              `sale_id=eq.${saleId}&status=eq.unpaid${item.payment.installment_id ? `&id=neq.${item.payment.installment_id}` : ''}&order=due_date.asc`
            );
            
            if (nextInstallments && nextInstallments.length > 0) {
              for (const inst of nextInstallments) {
                if (currentExcess <= 0) break;
                
                const instAmount = Number(inst.amount);
                if (currentExcess >= instAmount) {
                  await api.update('installments', inst.id, {
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                  });
                  distributionLog.push(`Lunas Inst ${formatDate(inst.due_date)} (dari excess)`);
                  currentExcess -= instAmount;
                } else {
                  await api.update('installments', inst.id, {
                    amount: instAmount - currentExcess,
                  });
                  distributionLog.push(`Potong Inst ${formatDate(inst.due_date)} senilai ${formatCurrency(currentExcess)}`);
                  currentExcess = 0;
                }
              }
            }
            
            // Send Notification for Overpayment
            try {
              await api.insert('notifications', {
                target_divisions: ['marketing', 'keuangan'],
                title: 'Kelebihan Pembayaran Konsumen',
                message: `${customerName} (${unitNumber}) membayar ${formatCurrency(item.amount)}. Sisa kelebihan dialokasikan ke cicilan berikutnya.`,
                sender_name: profile?.full_name || 'System',
                metadata: { type: 'overpayment', sale_id: saleId, amount: item.amount }
              });
            } catch (nErr) { console.error("Notification failed", nErr); }
          }
          
          if (distributionLog.length > 0) {
            auditNote = ` [Distribusi: ${distributionLog.join(', ')}]`;
          }
        }

        if (relatedCf && relatedCf.length > 0) {
          await Promise.all(relatedCf.map((cf: any) => 
            api.update('cash_flow', cf.id, { 
              status: 'verified',
              description: cf.description + auditNote
            })
          ));
        } else {
          await api.update('cash_flow', item.id, { 
            status: 'verified',
            description: item.description + auditNote
          });
        }
      }

      await fetchData();
    } catch (error: any) {
      if (error.message?.includes('409') || error.message?.includes('23505')) {
        // Already exists / race condition, just refresh silently
        await fetchData();
        return;
      }
      alert(`Gagal verifikasi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (item: CashFlowItem) => {
    if (!isKeuangan) { alert('Hanya Admin atau Keuangan yang dapat menolak transaksi.'); return; }
    if (!confirm('Tolak & hapus transaksi ini? Status di modul asal akan kembali ke pending.')) return;
    try {
      setLoading(true);

      if (item.isOrphan) {
        // No cash_flow entry exists — just delete the payment record
        await api.delete('payments', item.reference_id);
      } else {
        const table = item.reference_type === 'deposit' ? 'deposits' : 'payments';
        await api.update(table, item.reference_id, { status: 'pending' });

        const relatedCf = await api.get('cash_flow', `reference_id=eq.${item.reference_id}`);
        if (relatedCf && relatedCf.length > 0) {
          await Promise.all(relatedCf.map((cf: any) => api.delete('cash_flow', cf.id)));
        } else {
          await api.delete('cash_flow', item.id);
        }
      }

      await fetchData();
    } catch (error: any) {
      alert(`Gagal menolak: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnverify = async (item: CashFlowItem) => {
    if (!isKeuangan) { alert('Hanya Admin atau Keuangan yang dapat membatalkan verifikasi.'); return; }
    if (!confirm('Batalkan verifikasi ini? Mutasi arus kas akan dihapus dan status kembali ke pending.')) return;
    try {
      setLoading(true);
      // Revert source
      const table = item.reference_type === 'deposit' ? 'deposits' : 'payments';
      await api.update(table, item.reference_id, { status: 'pending' });

      // If payment had installment, revert it
      if (item.reference_type === 'payment' && item.payment?.installment_id) {
        await api.update('installments', item.payment.installment_id, {
          status: 'unpaid',
          paid_at: null,
        });
      }

      // Revert cash_flow to pending (don't delete — keep audit trail)
      await api.update('cash_flow', item.id, { status: 'pending' });
      await fetchData();
    } catch (error: any) {
      alert(`Gagal batalkan verifikasi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSubject = (item: CashFlowItem) => {
    if (item.reference_type === 'payment') {
      return {
        name: item.payment?.sale?.customer?.full_name || '-',
        unit: item.payment?.sale?.unit?.unit_number || '-',
        method: item.payment?.payment_method || '-',
      };
    }
    return {
      name: item.deposit?.name || '-',
      unit: '-',
      method: 'Titipan / Deposit',
    };
  };

  const filtered = items.filter((item: CashFlowItem) => {
    const subj = getSubject(item);
    const q = searchTerm.toLowerCase();
    return (
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      subj.name.toLowerCase().includes(q) ||
      subj.unit.toLowerCase().includes(q)
    );
  });

  const pendingCount = activeTab === 'pending' ? filtered.length : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Verifikasi Transaksi</h1>
            <p className="text-text-secondary">Antrean transaksi pembayaran — hanya Keuangan / Admin</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={cn(
            'px-5 py-2 rounded-xl text-sm font-black transition-all',
            activeTab === 'pending'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-white/40 text-text-secondary hover:bg-white/60'
          )}
        >
          <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Menunggu Verifikasi
          {pendingCount !== null && pendingCount > 0 && (
            <span className="ml-2 bg-white/30 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('verified')}
          className={cn(
            'px-5 py-2 rounded-xl text-sm font-black transition-all',
            activeTab === 'verified'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'bg-white/40 text-text-secondary hover:bg-white/60'
          )}
        >
          <CheckCircle2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Sudah Diverifikasi
        </button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              placeholder="Cari nama, unit, deskripsi..."
              className="w-full h-10 rounded-xl border border-white/40 pl-10 pr-4 text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-4 py-3 font-semibold">Tgl</TH>
                <TH className="px-4 py-3 font-semibold">Konsumen / Sumber</TH>
                <TH className="px-4 py-3 font-semibold">Unit</TH>
                <TH className="px-4 py-3 font-semibold">Metode</TH>
                <TH className="px-4 py-3 font-semibold">Rekening</TH>
                <TH className="px-4 py-3 font-semibold">Kategori</TH>
                <TH className="px-4 py-3 font-semibold text-right">Jumlah</TH>
                <TH className="px-4 py-3 font-semibold text-center">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={8} className="px-4 py-10 text-center text-text-muted">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-dark mx-auto" />
                </TD></TR>
              ) : filtered.length === 0 ? (
                <TR><TD colSpan={8} className="px-4 py-10 text-center text-text-secondary text-sm">
                  {activeTab === 'pending' ? 'Tidak ada transaksi yang menunggu verifikasi.' : 'Belum ada transaksi terverifikasi.'}
                </TD></TR>
              ) : (
                filtered.map((item: CashFlowItem) => {
                  const subj = getSubject(item);
                  return (
                    <TR
                      key={item.id}
                      className={cn(
                        'hover:bg-white/30 transition-colors border-l-4',
                        activeTab === 'pending' ? 'border-amber-400' : 'border-emerald-400'
                      )}
                    >
                      <TD className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                        {formatDate(item.date)}
                      </TD>
                      <TD className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span className="text-xs font-black text-text-primary">{subj.name}</span>
                        </div>
                      </TD>
                      <TD className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span className="text-xs font-bold text-text-secondary">{subj.unit}</span>
                        </div>
                      </TD>
                      <TD className="px-4 py-3">
                        <span className={cn(
                          'inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase',
                          subj.method === 'Tunai' || subj.method === 'Tunai / Cash'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-blue-700'
                        )}>
                          {subj.method}
                        </span>
                      </TD>
                      <TD className="px-4 py-3">
                        {item.bank ? (
                          <div className="flex items-center gap-1.5">
                            <Landmark className="w-3.5 h-3.5 text-accent-dark shrink-0" />
                            <div>
                              <p className="text-[10px] font-black text-text-primary">{item.bank.bank_name}</p>
                              <p className="text-[9px] text-text-secondary">{item.bank.account_number}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-[10px] font-black text-emerald-700">Kas Tunai</span>
                          </div>
                        )}
                      </TD>
                      <TD className="px-4 py-3">
                        <p className="text-[10px] font-black text-text-primary uppercase tracking-tight">{item.category}</p>
                        <p className="text-[10px] text-text-secondary truncate max-w-[140px]">{item.description}</p>
                      </TD>
                      <TD className="px-4 py-3 text-sm font-black text-text-primary text-right whitespace-nowrap">
                        {formatCurrency(item.amount)}
                      </TD>
                      <TD className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {activeTab === 'pending' ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-[10px] font-black border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleVerify(item)}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Terima
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-3 text-[10px] font-black text-red-500 hover:bg-red-50"
                                onClick={() => handleReject(item)}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Tolak
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-3 text-[10px] font-black text-amber-600 hover:bg-amber-50"
                              onClick={() => handleUnverify(item)}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Batalkan
                            </Button>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default VerificationQueue;
