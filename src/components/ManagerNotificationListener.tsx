import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Bell, X, User, Info } from 'lucide-react';
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
  const { profile, division } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [roleData, setRoleData] = useState<any>(null);
  // true setelah role data selesai di-load (mencegah gate tembak terlalu awal)
  const [roleReady, setRoleReady] = useState(false);

  const isAdmin = (profile as any)?.role === 'admin';

  // ID notifikasi yang sudah di-dismiss — disimpan di localStorage agar persisten
  const dismissedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    try {
      const stored = localStorage.getItem('propdev_dismissed_notifs');
      if (stored) JSON.parse(stored).forEach((id: string) => dismissedRef.current.add(id));
    } catch {}
  }, []);

  // Fetch fresh role data saat profile berubah
  useEffect(() => {
    if (!profile?.id) return;

    if (isAdmin) {
      setRoleReady(true);
      return;
    }

    setRoleReady(false);

    // Prioritas 1: role_data dari join AuthContext
    if ((profile as any)?.role_data) {
      setRoleData((profile as any).role_data);
      setRoleReady(true);
      return;
    }

    // Prioritas 2: fetch by role_id (UUID FK)
    const roleId = (profile as any)?.role_id;
    if (roleId) {
      api.get('roles', `select=*&id=eq.${roleId}`)
        .then(data => { if (data?.length > 0) setRoleData(data[0]); })
        .catch(err => console.error('Error fetching role by id:', err))
        .finally(() => setRoleReady(true));
      return;
    }

    // Prioritas 3: fetch by division (profile.role = division string)
    const divisionName = (profile as any)?.role;
    if (divisionName && divisionName !== 'admin') {
      api.get('roles', `select=*&division=eq.${divisionName}&receive_notifications=eq.true&limit=1`)
        .then(data => { if (data?.length > 0) setRoleData(data[0]); })
        .catch(err => console.error('Error fetching role by division:', err))
        .finally(() => setRoleReady(true));
      return;
    }

    setRoleReady(true);
  }, [profile?.id, (profile as any)?.role_id, (profile as any)?.role, isAdmin]);

  // effectiveRole: data role yang aktif (utamakan roleData yang baru di-fetch)
  const effectiveRole = roleData;

  // Kumpulkan semua division user (primary + authorized + dari context)
  const userDivisions: string[] = useMemo(() => {
    if (isAdmin) return [];
    const primary = (effectiveRole?.division || '').toLowerCase();
    const authorized: string[] = Array.isArray(effectiveRole?.authorized_divisions)
      ? effectiveRole.authorized_divisions.map((d: string) => d.toLowerCase())
      : [];
    const ctx = (division as string || '').toLowerCase();
    // Fallback: gunakan profile.role (division string) jika role data belum tersedia
    const profileRole = ((profile as any)?.role || '').toLowerCase();
    return [...new Set([primary, ...authorized, ctx, profileRole].filter(Boolean))];
  }, [isAdmin, effectiveRole, division, profile]);

  const fetchUnread = useCallback(async () => {
    if (!profile?.id || !roleReady) return;

    // Fetch notifikasi 24 jam terakhir
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const data: Notification[] = await api.get(
      'notifications',
      `select=*&created_at=gte.${since}&order=created_at.desc&limit=50`
    );

    const unread = data.filter(n => {
      // 1. Cek dismiss lokal
      if (dismissedRef.current.has(n.id)) return false;
      
      // 2. Admin lihat semua
      if (isAdmin) return true;
      
      // 3. Cek pengaturan role — jika role ditemukan dan receive_notifications=false, skip
      if (effectiveRole && !effectiveRole.receive_notifications) return false;
      
      const targetDivs = (n.target_divisions || []).map(d => d.toLowerCase());
      const hasMatchingDivision = targetDivs.some(d => userDivisions.includes(d));
      
      if (!isAdmin && !hasMatchingDivision) return false;
      
      // 4. Cek filter spesifik per jenis kejadian
      const type = n.metadata?.type || 'unknown';
      const settings = effectiveRole?.notification_settings as Record<string, boolean> | undefined;
      return !settings || settings[type] !== false || type === 'system_test';
    });

    setNotifications(unread.slice(0, 5));
  }, [profile?.id, isAdmin, userDivisions, effectiveRole, roleReady]);

  useEffect(() => {
    if (!profile?.id || !roleReady) return;

    // Gate untuk non-admin:
    // Blokir hanya jika role ditemukan dan receive_notifications=false
    // (jika role null = tidak bisa tentukan, biarkan lewat agar tidak silent fail)
    if (!isAdmin && effectiveRole && !effectiveRole.receive_notifications) return;
    if (!isAdmin && userDivisions.length === 0) return;

    fetchUnread();
    const pollInterval = setInterval(fetchUnread, 30_000);

    const channel = supabase
      .channel(`notifications-${profile.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Notification;
          if (import.meta.env.DEV) console.log('🔔 Received Real-time Notif:', newNotif);
          
          // Filter real-time logic
          if (isAdmin) {
            setNotifications(prev => [newNotif, ...prev].slice(0, 5));
            playNotificationSound();
            return;
          }

          if (effectiveRole && !effectiveRole.receive_notifications) return;
          
          const targetDivs = (newNotif.target_divisions || []).map(d => d.toLowerCase());
          const hasMatchingDivision = targetDivs.some(d => userDivisions.includes(d));
          
          if (!isAdmin && !hasMatchingDivision) {
            if (import.meta.env.DEV) console.log('🚫 Notif rejected: No matching division', { targetDivs, userDivisions });
            return;
          }
          
          const type = newNotif.metadata?.type || 'unknown';
          const settings = effectiveRole?.notification_settings as Record<string, boolean> | undefined;
          if (!settings || settings[type] !== false || type === 'system_test') {
            setNotifications(prev => {
              if (prev.some((n: Notification) => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev].slice(0, 5);
            });
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [isAdmin, effectiveRole, userDivisions, fetchUnread, profile?.id, roleReady]);

  const markAsRead = async (id: string) => {
    // Dismiss secara lokal saja agar tidak menghapus notifikasi untuk user lain
    setNotifications(prev => prev.filter((n: Notification) => n.id !== id));
    dismissedRef.current.add(id);
    try {
      const arr = [...dismissedRef.current].slice(-200);
      localStorage.setItem('propdev_dismissed_notifs', JSON.stringify(arr));
    } catch {}
    // JANGAN delete dari DB karena user lain (manager lain) mungkin belum lihat
  };

  if (notifications.length === 0) return null;

  const current = notifications[0];
  const queueCount = notifications.length - 1;

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
                  {(() => {
                    const divs: string[] = current.target_divisions || [];
                    if (divs.includes('teknik')) return 'Logistik Update';
                    if (divs.includes('keuangan')) return 'Keuangan Update';
                    if (divs.includes('audit')) return 'Audit Update';
                    if (divs.includes('hrd')) return 'HRD Update';
                    if (divs.includes('accounting')) return 'Accounting Update';
                    if (divs.includes('marketing')) return 'Marketing Update';
                    return 'System Update';
                  })()}
                </span>
              </div>
            </div>
            <button onClick={() => markAsRead(current.id)} className="text-text-muted hover:text-text-primary transition-colors p-1">
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
                onClick={() => markAsRead(current.id)}
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
