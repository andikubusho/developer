import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Admin bypasses semua pengecekan — selalu terima semua notifikasi
  const isAdmin = (profile as any)?.role === 'admin';

  // Fetch fresh role data saat mount (hindari data stale dari login)
  useEffect(() => {
    if (isAdmin) return; // admin tidak butuh role_data check
    const roleId = (profile as any)?.role_id;
    if (!roleId) return;
    api.get('roles', `select=*&id=eq.${roleId}`).then(data => {
      if (data.length > 0) setRoleData(data[0]);
    });
  }, [profile?.id, isAdmin]);

  const effectiveRole = roleData || (profile?.role_data as any);

  // Kumpulkan semua division user (primary + authorized)
  const userDivisions: string[] = useMemo(() => {
    if (isAdmin) return []; // admin tidak pakai filter division
    const primary: string | undefined = effectiveRole?.division;
    const authorized: string[] = effectiveRole?.authorized_divisions || [];
    const ctx = division as string | null;
    return [...new Set([primary, ...authorized, ctx].filter(Boolean))] as string[];
  }, [isAdmin, effectiveRole, division]);

  const fetchUnread = useCallback(async () => {
    if (!profile?.id) return;

    if (isAdmin) {
      // Admin: ambil semua notifikasi yang belum dibaca tanpa filter division
      const data = await api.get(
        'notifications',
        `select=*&or=(read_by.is.null,read_by.not.cs.{${profile.id}})&order=created_at.desc&limit=5`
      );
      setNotifications(data);
      return;
    }

    if (!effectiveRole?.receive_notifications) return;
    if (userDivisions.length === 0) return;

    // ov = overlaps (&&): cocok jika notifikasi menarget salah satu division user
    // or=(read_by.is.null,...) menangani read_by NULL pada notifikasi baru
    const divParam = userDivisions.join(',');
    const data = await api.get(
      'notifications',
      `select=*&target_divisions=ov.{${divParam}}&or=(read_by.is.null,read_by.not.cs.{${profile.id}})&order=created_at.desc&limit=5`
    );
    setNotifications(data);
  }, [profile?.id, isAdmin, userDivisions, effectiveRole?.receive_notifications]);

  useEffect(() => {
    // Gate untuk non-admin
    if (!isAdmin) {
      if (!effectiveRole?.receive_notifications) return;
      if (userDivisions.length === 0) return;
    }

    if (!profile?.id) return;

    fetchUnread();
    const pollInterval = setInterval(fetchUnread, 30_000);

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Notification;

          // Admin menerima semua, non-admin filter berdasarkan division
          if (!isAdmin && !newNotif.target_divisions.some(d => userDivisions.includes(d))) return;

          const notificationType = newNotif.metadata?.type || 'unknown';
          const settings = effectiveRole?.notification_settings as Record<string, boolean> | undefined;
          // Admin: tampilkan semua. Non-admin: opt-out (tampilkan kecuali dimatikan)
          const isTypeEnabled = isAdmin || !settings || settings[notificationType] !== false;

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
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id: id,
        user_id: profile.id
      });
      if (!error) {
        setNotifications(prev => prev.filter((n: Notification) => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  if (notifications.length === 0) return null;

  // Tampilkan hanya 1 notifikasi terbaru, sisanya antri
  const current = notifications[0];
  const queueCount = notifications.length - 1;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-4">
      <Card
        key={current.id}
        className="pointer-events-auto w-full max-w-lg bg-white/95 backdrop-blur-2xl border-white/50 shadow-2xl overflow-hidden animate-in slide-in-from-top duration-400"
      >
        <div className="absolute top-0 left-0 w-1.5 h-full bg-accent-dark" />
        <div className="p-6 pl-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 text-accent-dark">
              <div className="w-11 h-11 rounded-xl bg-accent-dark/10 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight leading-tight">{current.title}</h3>
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-0.5 block">
                  {current.metadata?.type?.startsWith('teknik') ? 'Logistik Update' :
                   current.metadata?.type?.startsWith('keuangan') ? 'Keuangan Update' : 'Marketing Update'}
                </span>
              </div>
            </div>
            <button onClick={() => markAsRead(current.id)} className="text-text-muted hover:text-text-primary transition-colors p-1.5">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pesan detail */}
          <p className="text-sm text-text-primary font-medium leading-relaxed mb-5 bg-accent-dark/5 p-4 rounded-xl border border-accent-dark/10 whitespace-pre-line">
            {current.message}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-text-secondary font-bold">
              <User className="w-4 h-4" />
              <span>Oleh: {current.sender_name}</span>
            </div>
            <div className="flex items-center gap-2">
              {queueCount > 0 && (
                <span className="text-[10px] font-black text-text-muted bg-gray-100 px-2 py-1 rounded-full">
                  +{queueCount} lainnya
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-9 px-4 text-xs font-black uppercase tracking-widest gap-1.5 text-accent-dark hover:bg-accent-dark/10"
                onClick={() => markAsRead(current.id)}
              >
                <Info className="w-4 h-4" />
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
