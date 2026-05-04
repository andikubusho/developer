import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Bell, X, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { playNotificationSound } from '../lib/sound';

interface Notification {
  id: string;
  title: string;
  message: string;
  sender_name: string;
  target_divisions: string[];
  read_by: string[] | null;
  created_at: string;
  metadata?: any;
}

const ManagerNotificationListener: React.FC = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [roleData, setRoleData] = useState<any>(null);
  const [roleReady, setRoleReady] = useState(false);

  // Set ID yang sudah dibaca — diisi dari localStorage DAN dari read_by di DB
  const readRef = useRef<Set<string>>(new Set());
  // Set ID yang sudah dibunyikan — agar bunyi tidak berulang saat polling
  const playedRef = useRef<Set<string>>(new Set());

  const isAdmin = profile?.role === 'admin';

  // Muat dari localStorage saat mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('propdev_dismissed_notifs');
      if (stored) JSON.parse(stored).forEach((id: string) => readRef.current.add(id));
    } catch {}
  }, []);

  // Fetch fresh role dari DB
  useEffect(() => {
    if (!profile?.id) return;
    if (isAdmin) { setRoleReady(true); return; }

    setRoleReady(false);
    setRoleData(null);

    const fetchRole = async () => {
      try {
        if (profile.role_id) {
          const d = await api.get('roles', `select=*&id=eq.${profile.role_id}`);
          if (d?.length > 0) { setRoleData(d[0]); return; }
        }
        const divName = profile.role;
        if (divName && divName !== 'admin') {
          const byAuth = await api.get('roles', `select=*&authorized_divisions=cs.["${divName}"]`);
          if (byAuth?.length > 0) {
            const withNotif = byAuth.find((r: any) => r.receive_notifications === true);
            setRoleData(withNotif || byAuth[0]);
            return;
          }
          const byDiv = await api.get('roles', `select=*&division=eq.${divName}&order=created_at.desc&limit=1`);
          if (byDiv?.length > 0) { setRoleData(byDiv[0]); return; }
        }
      } catch (err) {
        console.error('[Notif] role fetch error:', err);
      } finally {
        setRoleReady(true);
      }
    };
    fetchRole();
  }, [profile?.id, profile?.role_id, isAdmin]);

  const userDivisions: string[] = useMemo(() => {
    if (isAdmin) return [];
    const divs = new Set<string>();
    if (Array.isArray(roleData?.authorized_divisions))
      roleData.authorized_divisions.forEach((d: string) => divs.add(d.toLowerCase()));
    if (roleData?.division) divs.add(roleData.division.toLowerCase());
    if (profile?.role && profile.role !== 'admin') divs.add(profile.role.toLowerCase());
    return [...divs].filter(Boolean);
  }, [isAdmin, roleData, profile?.role]);

  const canReceive = useMemo(() => {
    if (isAdmin) return true;
    if (!roleData) return true;
    if (roleData.receive_notifications) return true;
    const s = roleData.notification_settings as Record<string, boolean> | undefined;
    return !!(s && Object.values(s).some(v => v === true));
  }, [isAdmin, roleData]);

  // Ref ke fungsi filter terbaru — agar fetchUnread tidak perlu ikut dep shouldShow
  const filterRef = useRef<(n: Notification) => boolean>(() => false);

  filterRef.current = useCallback((n: Notification): boolean => {
    // Sudah dibaca (DB atau localStorage)
    if (readRef.current.has(n.id)) return false;
    // read_by dari DB sudah mengandung user ID
    if (profile?.id && (n.read_by || []).includes(profile.id)) return false;
    if (isAdmin) return true;
    if (!canReceive) return false;
    const targetDivs = (n.target_divisions || []).map((d: string) => d.toLowerCase());
    if (!targetDivs.some((d: string) => userDivisions.includes(d))) return false;
    if (!roleData?.notification_settings) return true;
    const settings = roleData.notification_settings as Record<string, boolean>;
    return settings[n.metadata?.type || 'system'] !== false;
  }, [isAdmin, canReceive, userDivisions, roleData, profile?.id]);

  // fetchUnread stabil — tidak berubah saat roleData/shouldShow berubah
  // Gunakan merge agar notifikasi yang sedang tampil tidak hilang karena poll
  const fetchUnread = useCallback(async () => {
    if (!profile?.id || !roleReady) return;
    const since = new Date(Date.now() - 86_400_000).toISOString();
    let data: Notification[] = [];
    try {
      data = await api.get('notifications',
        `select=*&created_at=gte.${since}&order=created_at.desc&limit=50`);
    } catch { return; }

    const fresh = data.filter(n => filterRef.current(n));

    // MERGE: jangan timpa state yang ada, hanya tambah yang baru
    let hasNewNotif = false;
    setNotifications(prev => {
      const alreadyRead = readRef.current;
      const stillValid = prev.filter(n => !alreadyRead.has(n.id));
      const shownIds = new Set(stillValid.map(n => n.id));
      const added = fresh.filter(n => !shownIds.has(n.id));
      
      // Bunyikan hanya untuk yang benar-benar baru (belum pernah berbunyi)
      const toPlay = added.filter(n => !playedRef.current.has(n.id));
      if (toPlay.length > 0) {
        toPlay.forEach(n => playedRef.current.add(n.id));
        setTimeout(() => playNotificationSound(), 300);
      }
      
      return [...stillValid, ...added].slice(0, 5);
    });
  }, [profile?.id, roleReady]); // Tidak bergantung pada shouldShow/filterRef

  useEffect(() => {
    if (!profile?.id || !roleReady) return;
    if (!isAdmin && !canReceive) return;
    if (!isAdmin && userDivisions.length === 0) return;

    fetchUnread();
    const poll = setInterval(fetchUnread, 30_000);

    const channel = supabase
      .channel(`notif-${profile.id}-${Date.now()}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as Notification;
          if (!filterRef.current(n)) return;
          setNotifications(prev => {
            if (prev.some(x => x.id === n.id)) return prev;
            
            // Bunyikan jika belum pernah
            if (!playedRef.current.has(n.id)) {
              playedRef.current.add(n.id);
              playNotificationSound();
            }
            
            return [n, ...prev].slice(0, 5);
          });
        }
      )
      .subscribe();

    return () => { clearInterval(poll); supabase.removeChannel(channel); };
  }, [profile?.id, roleReady, isAdmin, canReceive, userDivisions, fetchUnread]);

  const dismiss = async (id: string) => {
    // Hapus dari state dan tandai sebagai sudah dibaca
    setNotifications(prev => prev.filter(n => n.id !== id));
    readRef.current.add(id);

    // Simpan ke localStorage
    try {
      localStorage.setItem('propdev_dismissed_notifs',
        JSON.stringify([...readRef.current].slice(-200)));
    } catch {}

    // Tandai sebagai dibaca di DB lewat read_by — cegah re-appear di session lain
    if (profile?.id) {
      try {
        const rows = await api.get('notifications', `select=read_by&id=eq.${id}`);
        if (rows?.length > 0) {
          const current = rows[0].read_by || [];
          if (!current.includes(profile.id)) {
            await api.update('notifications', id, { read_by: [...current, profile.id] });
          }
        }
      } catch { /* non-critical */ }
    }
  };

  if (notifications.length === 0) return null;

  const current = notifications[0];
  const queueCount = notifications.length - 1;

  const divLabel = (() => {
    const divs: string[] = current.target_divisions || [];
    if (current.metadata?.type === 'follow_ups') return 'Follow Up Update';
    if (divs.includes('teknik')) return 'Logistik Update';
    if (divs.includes('keuangan')) return 'Keuangan Update';
    if (divs.includes('audit')) return 'Audit Update';
    if (divs.includes('hrd')) return 'HRD Update';
    if (divs.includes('accounting')) return 'Accounting Update';
    if (divs.includes('marketing')) return 'Marketing Update';
    return 'System Update';
  })();

  return (
    <div className="fixed top-6 right-6 z-[10000] flex flex-col items-end gap-4 pointer-events-none w-full max-w-md">
      <Card
        key={current.id}
        className="pointer-events-auto w-full bg-white/95 backdrop-blur-2xl border-white/50 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-400"
      >
        <div className="absolute top-0 left-0 w-2 h-full bg-accent-dark" />
        <div className="p-6 pl-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 text-accent-dark">
              <div className="w-12 h-12 rounded-xl bg-accent-dark/10 flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight leading-tight">{current.title}</h3>
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-0.5 block">
                  {divLabel}
                </span>
              </div>
            </div>
            <button onClick={() => dismiss(current.id)} className="text-text-muted hover:text-text-primary transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-text-primary font-bold leading-relaxed mb-4 bg-accent-dark/5 p-4 rounded-xl border border-accent-dark/10 whitespace-pre-line">
            {current.message}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-text-secondary font-bold">
              <User className="w-4 h-4" />
              <span>{current.sender_name}</span>
            </div>
            <div className="flex items-center gap-2">
              {queueCount > 0 && (
                <span className="text-[10px] font-black text-text-muted bg-gray-100 px-2 py-1 rounded-full">
                  +{queueCount}
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest gap-2 text-accent-dark hover:bg-accent-dark/10"
                onClick={() => dismiss(current.id)}
              >
                Selesai
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ManagerNotificationListener;
