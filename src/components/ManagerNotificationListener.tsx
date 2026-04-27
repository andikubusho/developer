import React, { useState, useEffect } from 'react';
import { Bell, X, User, ExternalLink, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface Notification {
  id: string;
  title: string;
  message: string;
  sender_name: string;
  target_divisions: string[];
  read_by: string[];
  created_at: string;
  metadata?: any;
}

const ManagerNotificationListener: React.FC = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Only active if user role is configured to receive notifications
    if (!profile?.role_data?.receive_notifications) return;

    // Fetch initial unread notifications
    const fetchUnread = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .contains('target_divisions', [profile.division])
        .not('read_by', 'cs', `{${profile.id}}`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setNotifications(data);
      }
    };

    fetchUnread();

    // Subscribe to new notifications
    const channel = supabase
      .channel('manager-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          
          // Check if this notification is for this user's division
          if (newNotif.target_divisions.includes(profile.division)) {
            setNotifications(prev => [newNotif, ...prev].slice(0, 3));
            
            // Optional: Play subtle sound
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(() => {});
            } catch (e) {}
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const markAsRead = async (id: string) => {
    if (!profile) return;
    
    try {
      // Use atomic RPC to append user ID to read_by array
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
            "pointer-events-auto bg-white/80 backdrop-blur-2xl border-white/40 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-500",
            index === 0 ? "scale-100 opacity-100" : "scale-95 opacity-80"
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
                    Marketing Update
                  </span>
                </div>
              </div>
              <button 
                onClick={() => markAsRead(notif.id)}
                className="text-text-muted hover:text-text-primary transition-colors p-1"
              >
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
