import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, X, User, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
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
  // Fresh role data fetched at mount to avoid stale auth context
  const [roleData, setRoleData] = useState<any>(null);

  useEffect(() => {
    const roleId = (profile as any)?.role_id;
    if (!roleId) return;
    api.get('roles', `select=*&id=eq.${roleId}`).then(data => {
      if (data.length > 0) setRoleData(data[0]);
    });
  }, [profile?.id]);

  const effectiveRole = roleData || (profile?.role_data as any);

  // Collect all divisions (primary + authorized) to handle multi-division roles
  const userDivisions: string[] = useMemo(() => {
    const primary: string | undefined = effectiveRole?.division;
    const authorized: string[] = effectiveRole?.authorized_divisions || [];
    const ctx = division as string | null;
    return [...new Set([primary, ...authorized, ctx].filter(Boolean))] as string[];
  }, [effectiveRole, division]);

  const fetchUnread = useCallback(async () => {
    if (!profile?.id || userDivisions.length === 0) return;
    if (!effectiveRole?.receive_notifications) return;

    // ov = overlaps (&&): notification targets ANY of user's divisions
    // or=(read_by.is.null,...) handles NULL default on new rows (Bug 1 fix)
    const divParam = userDivisions.join(',');
    const data = await api.get(
      'notifications',
      `select=*&target_divisions=ov.{${divParam}}&or=(read_by.is.null,read_by.not.cs.{${profile.id}})&order=created_at.desc&limit=5`
    );
    setNotifications(data);
  }, [profile?.id, userDivisions, effectiveRole?.receive_notifications]);

  useEffect(() => {
    if (!effectiveRole?.receive_notifications) return;
    if (userDivisions.length === 0) return;

    fetchUnread();
    const pollInterval = setInterval(fetchUnread, 30_000);

    const channel = supabase
      .channel(`notifications-${profile!.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Notification;

          // Must target at least one of user's divisions
          if (!newNotif.target_divisions.some(d => userDivisions.includes(d))) return;

          const notificationType = newNotif.metadata?.type || 'unknown';
          const settings = effectiveRole?.notification_settings as Record<string, boolean> | undefined;
          const isTypeEnabled = !settings || settings[notificationType] !== false;

          if (isTypeEnabled) {
            setNotifications(prev => {
              if (prev.some(n => n.id === newNotif.id)) return prev;
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
  }, [effectiveRole, userDivisions, fetchUnread, profile?.id]);

  const markAsRead = async (id: string) => {
    if (!profile) return;
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id: id,
        user_id: profile.id
      });
      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[10000] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {notifications.map((notif, index) => (
        <Card
          key={notif.id}
          className={cn(
            'pointer-events-auto bg-white/80 backdrop-blur-2xl border-white/40 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-500',
            index === 0 ? 'scale-100 opacity-100' : 'scale-95 opacity-80'
          )}
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-accent-dark" />
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-accent-dark">
                <div className="w-8 h-8 rounded-lg bg-accent-dark/10 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight leading-none">{notif.title}</h3>
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                    {notif.metadata?.type?.startsWith('teknik') ? 'Logistik Update' :
                     notif.metadata?.type?.startsWith('keuangan') ? 'Keuangan Update' : 'Marketing Update'}
                  </span>
                </div>
              </div>
              <button onClick={() => markAsRead(notif.id)} className="text-text-muted hover:text-text-primary transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-primary font-medium leading-relaxed mb-4 bg-accent-dark/5 p-3 rounded-xl border border-accent-dark/5">
              {notif.message}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-bold">
                <User className="w-3 h-3" />
                <span>Oleh: {notif.sender_name}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] font-black uppercase tracking-widest gap-1 text-accent-dark hover:bg-accent-dark/10"
                onClick={() => markAsRead(notif.id)}
              >
                <Info className="w-3 h-3" />
                Selesai
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ManagerNotificationListener;
