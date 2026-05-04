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

  const isAdmin = (profile as any)?.role === 'admin';

  // ID notifikasi yang sudah di-dismiss — disimpan di localStorage agar persisten
  const dismissedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    try {
      const stored = localStorage.getItem('propdev_dismissed_notifs');
      if (stored) JSON.parse(stored).forEach((id: string) => dismissedRef.current.add(id));
    } catch {}
  }, []);

  // Fetch fresh role data by role name (profile.role = nama role, bukan UUID)
  useEffect(() => {
    if (isAdmin) return;
    const roleName = (profile as any)?.role;
    if (!roleName) return;
    api.get('roles', `select=*&name=eq.${encodeURIComponent(roleName)}`).then(data => {
      if (data.length > 0) setRoleData(data[0]);
    });
  }, [profile?.id, isAdmin]);

  // effectiveRole: prioritaskan data segar dari DB, fallback ke data join dari auth
  const effectiveRole = roleData || (profile?.role_data as any);

  // Kumpulkan semua division user (primary + authorized + dari context)
  const userDivisions: string[] = useMemo(() => {
    if (isAdmin) return [];
    const primary: string | undefined = effectiveRole?.division;
    const authorized: string[] = effectiveRole?.authorized_divisions || [];
    const ctx = division as string | null;
    return [...new Set([primary, ...authorized, ctx].filter(Boolean))] as string[];
  }, [isAdmin, effectiveRole, division]);

  const fetchUnread = useCallback(async () => {
    if (!profile?.id) return;

    // Fetch notifikasi 24 jam terakhir, filter di JS (hindari query PostgREST kompleks)
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const data: Notification[] = await api.get(
      'notifications',
      `select=*&created_at=gte.${since}&order=created_at.desc&limit=50`
    );

    const unread = data.filter(n => {
      // Skip yang sudah di-dismiss (localStorage guard)
      if (dismissedRef.current.has(n.id)) return false;
      // Skip yang sudah dibaca oleh user ini (DB guard)
      const readBy: string[] = n.read_by || [];
      if (readBy.includes(profile.id)) return false;

      // Admin: terima semua
      if (isAdmin) return true;

      // Non-admin: cek receive_notifications
      if (!effectiveRole?.receive_notifications) return false;

      // Cek apakah notifikasi menarget salah satu division user
      if (!n.target_divisions.some(d => userDivisions.includes(d))) return false;

      // Cek per-tipe notification_settings (opt-out: tampil kecuali dimatikan)
      const type = n.metadata?.type || 'unknown';
      const settings = effectiveRole?.notification_settings as Record<string, boolean> | undefined;
      return !settings || settings[type] !== false;
    });

    setNotifications(unread.slice(0, 5));
  }, [profile?.id, isAdmin, userDivisions, effectiveRole]);

  useEffect(() => {
    if (!profile?.id) return;
    // Non-admin: tunggu effectiveRole terisi dan receive_notifications aktif
    if (!isAdmin && !effectiveRole?.receive_notifications) return;
    if (!isAdmin && userDivisions.length === 0) return;

    fetchUnread();
    const pollInterval = setInterval(fetchUnread, 30_000);

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Notification;

          if (!isAdmin && !newNotif.target_divisions.some(d => userDivisions.includes(d))) return;

          const type = newNotif.metadata?.type || 'unknown';
          const settings = effectiveRole?.notification_settings as Record<string, boolean> | undefined;
          const isTypeEnabled = isAdmin || !settings || settings[type] !== false;

          if (isTypeEnabled) {
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
  }, [isAdmin, effectiveRole, userDivisions, fetchUnread, profile?.id]);

  const markAsRead = async (id: string) => {
    if (!profile) return;

    // 1. Langsung hapus dari state & simpan ke dismissed (tidak menunggu DB)
    setNotifications(prev => prev.filter((n: Notification) => n.id !== id));
    dismissedRef.current.add(id);
    try {
      const arr = [...dismissedRef.current].slice(-200);
      localStorage.setItem('propdev_dismissed_notifs', JSON.stringify(arr));
    } catch {}

    // 2. Update DB via RPC (best-effort, gagal pun tidak masalah karena sudah di-guard)
    try {
      await api.rpc('mark_notification_read', { notification_id: id, user_id: profile.id });
    } catch {}
  };

  if (notifications.length === 0) return null;

  const current = notifications[0];
  const queueCount = notifications.length - 1;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-6">
      <Card
        key={current.id}
        className="pointer-events-auto w-full max-w-4xl bg-white/95 backdrop-blur-2xl border-white/50 shadow-2xl overflow-hidden animate-in slide-in-from-top duration-400"
      >
        <div className="absolute top-0 left-0 w-4 h-full bg-accent-dark" />
        <div className="p-10 pl-16">
          {/* Header */}
          <div className="flex items-start justify-between mb-7">
            <div className="flex items-center gap-5 text-accent-dark">
              <div className="w-20 h-20 rounded-2xl bg-accent-dark/10 flex items-center justify-center">
                <Bell className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tight leading-tight">{current.title}</h3>
                <span className="text-sm font-black text-text-muted uppercase tracking-widest mt-1 block">
                  {current.metadata?.type?.startsWith('teknik') ? 'Logistik Update' :
                   current.metadata?.type?.startsWith('keuangan') ? 'Keuangan Update' : 'Marketing Update'}
                </span>
              </div>
            </div>
            <button onClick={() => markAsRead(current.id)} className="text-text-muted hover:text-text-primary transition-colors p-2">
              <X className="w-8 h-8" />
            </button>
          </div>

          {/* Pesan detail */}
          <p className="text-xl text-text-primary font-medium leading-relaxed mb-8 bg-accent-dark/5 p-6 rounded-2xl border border-accent-dark/10 whitespace-pre-line">
            {current.message}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-base text-text-secondary font-bold">
              <User className="w-6 h-6" />
              <span>Oleh: {current.sender_name}</span>
            </div>
            <div className="flex items-center gap-3">
              {queueCount > 0 && (
                <span className="text-sm font-black text-text-muted bg-gray-100 px-4 py-2 rounded-full">
                  +{queueCount} lainnya
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-12 px-6 text-base font-black uppercase tracking-widest gap-2 text-accent-dark hover:bg-accent-dark/10"
                onClick={() => markAsRead(current.id)}
              >
                <Info className="w-5 h-5" />
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
