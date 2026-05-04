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
  const dismissedRef = useRef<Set<string>>(new Set());

  const isAdmin = profile?.role === 'admin';

  // Muat dismissed IDs dari localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('propdev_dismissed_notifs');
      if (stored) JSON.parse(stored).forEach((id: string) => dismissedRef.current.add(id));
    } catch {}
  }, []);

  // Fetch fresh role dari DB setiap kali profile berubah
  useEffect(() => {
    if (!profile?.id) return;

    if (isAdmin) {
      setRoleReady(true);
      return;
    }

    setRoleReady(false);
    setRoleData(null);

    const fetchRole = async () => {
      try {
        // Prioritas 1: by role_id (UUID FK — paling akurat)
        if (profile.role_id) {
          const data = await api.get('roles', `select=*&id=eq.${profile.role_id}`);
          if (data?.length > 0) { setRoleData(data[0]); return; }
        }
        // Prioritas 2: by authorized_divisions contains profile.role
        // Fetch semua roles dan filter yang punya divisi ini
        const divisionName = profile.role; // UserRole = division string
        if (divisionName && divisionName !== 'admin') {
          // Coba cocokkan lewat authorized_divisions array (cs = contains string)
          const byAuth = await api.get('roles', `select=*&authorized_divisions=cs.["${divisionName}"]`);
          if (byAuth?.length > 0) {
            // Pilih yang receive_notifications=true dulu, kalau tidak ada ambil yang pertama
            const withNotif = byAuth.find((r: any) => r.receive_notifications === true);
            setRoleData(withNotif || byAuth[0]);
            return;
          }
          // Prioritas 3: by division field
          const byDiv = await api.get('roles', `select=*&division=eq.${divisionName}&order=created_at.desc&limit=1`);
          if (byDiv?.length > 0) { setRoleData(byDiv[0]); return; }
        }
      } catch (err) {
        console.error('[Notif] Error fetching role:', err);
      } finally {
        setRoleReady(true);
      }
    };

    fetchRole();
  }, [profile?.id, profile?.role_id, isAdmin]);

  // Divisi user: gabungan authorized_divisions + division role + profile.role sebagai fallback
  const userDivisions: string[] = useMemo(() => {
    if (isAdmin) return [];
    const divs = new Set<string>();
    if (Array.isArray(roleData?.authorized_divisions)) {
      roleData.authorized_divisions.forEach((d: string) => divs.add(d.toLowerCase()));
    }
    if (roleData?.division) divs.add(roleData.division.toLowerCase());
    // Selalu sertakan profile.role sebagai fallback — ini yang paling reliable
    if (profile?.role && profile.role !== 'admin') divs.add(profile.role.toLowerCase());
    return [...divs].filter(Boolean);
  }, [isAdmin, roleData, profile?.role]);

  // Apakah role ini boleh menerima notifikasi?
  // true jika: tidak ada role data (izinkan by default), atau receive_notifications=true,
  // atau minimal satu tipe notifikasi dicentang
  const canReceive = useMemo(() => {
    if (isAdmin) return true;
    if (!roleData) return true; // tidak ada role data = jangan blokir (silent fail buruk)
    if (roleData.receive_notifications) return true;
    const settings = roleData.notification_settings as Record<string, boolean> | undefined;
    if (settings && Object.values(settings).some(v => v === true)) return true;
    return false;
  }, [isAdmin, roleData]);

  // Apakah tipe notifikasi ini diizinkan untuk role ini?
  const isTypeAllowed = useCallback((type: string): boolean => {
    if (isAdmin) return true;
    if (!roleData?.notification_settings) return true; // tidak ada setting = izinkan semua
    const settings = roleData.notification_settings as Record<string, boolean>;
    // undefined = tipe tidak dikenal → izinkan; false = dimatikan → blokir
    return settings[type] !== false;
  }, [isAdmin, roleData]);

  // Filter satu notifikasi untuk user ini
  const shouldShow = useCallback((n: Notification): boolean => {
    if (dismissedRef.current.has(n.id)) return false;
    if (isAdmin) return true;
    if (!canReceive) return false;
    const targetDivs = (n.target_divisions || []).map((d: string) => d.toLowerCase());
    if (!targetDivs.some((d: string) => userDivisions.includes(d))) return false;
    return isTypeAllowed(n.metadata?.type || 'system');
  }, [isAdmin, canReceive, userDivisions, isTypeAllowed]);

  const fetchUnread = useCallback(async () => {
    if (!profile?.id || !roleReady) return;

    const since = new Date(Date.now() - 86_400_000).toISOString();
    let data: Notification[] = [];
    try {
      data = await api.get('notifications',
        `select=*&created_at=gte.${since}&order=created_at.desc&limit=50`);
    } catch (err) {
      console.error('[Notif] fetchUnread error:', err);
      return;
    }

    const unread = data.filter(shouldShow);
    setNotifications(unread.slice(0, 5));
  }, [profile?.id, roleReady, shouldShow]);

  // Subscribe realtime + polling
  useEffect(() => {
    if (!profile?.id || !roleReady) return;
    if (!isAdmin && !canReceive) return;
    if (!isAdmin && userDivisions.length === 0) return;

    fetchUnread();
    const pollInterval = setInterval(fetchUnread, 30_000);

    const channel = supabase
      .channel(`notif-${profile.id}-${Date.now()}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as Notification;
          if (!shouldShow(n)) return;
          setNotifications(prev => {
            if (prev.some(x => x.id === n.id)) return prev;
            return [n, ...prev].slice(0, 5);
          });
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [profile?.id, roleReady, isAdmin, canReceive, userDivisions, fetchUnread, shouldShow]);

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    dismissedRef.current.add(id);
    try {
      localStorage.setItem('propdev_dismissed_notifs',
        JSON.stringify([...dismissedRef.current].slice(-200)));
    } catch {}
  };

  if (notifications.length === 0) return null;

  const current = notifications[0];
  const queueCount = notifications.length - 1;

  const divLabel = (() => {
    const divs: string[] = current.target_divisions || [];
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
