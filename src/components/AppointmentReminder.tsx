import React, { useState, useEffect, useRef } from 'react';
import { BellRing, X, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { FollowUp } from '../types';
import { cn, formatDateTime } from '../lib/utils';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { playNotificationSound } from '../lib/sound';

const POPUP_LOCK_KEY = 'appointment_reminder_lock';
const LOCK_EXPIRY_MS = 70000; // 70 seconds (slightly above polling interval)

const AppointmentReminder: React.FC = () => {
  const { profile } = useAuth();
  const [activeReminder, setActiveReminder] = useState<FollowUp | null>(null);
  const isProcessing = useRef(false);

  useEffect(() => {
    if (!profile?.consultant_id) return;

    const checkReminders = async () => {
      if (isProcessing.current || activeReminder) return;

      try {
        isProcessing.current = true;

        const now = new Date().toISOString();
        const [remindersData, leadsData] = await Promise.all([
          api.get('follow_ups', `select=*&next_reminder_at=lte.${now}&appointment_status=eq.pending`),
          api.get('leads', `select=id,name,phone,consultant_id&consultant_id=eq.${profile.consultant_id}`)
        ]);

        const leadsMap: Record<string, any> = {};
        (leadsData || []).forEach((l: any) => { leadsMap[l.id] = l; });

        const myReminders = (remindersData || [])
          .map((f: any) => ({ ...f, lead: f.lead_id ? (leadsMap[f.lead_id] || null) : null }))
          .filter((f: any) => f.lead !== null);

        if (myReminders.length > 0) {
          const reminder = myReminders[0];
          
          // Multi-tab coordination: check if this specific reminder is already being shown in another tab
          const lockKey = `${POPUP_LOCK_KEY}_${reminder.id}`;
          const existingLock = localStorage.getItem(lockKey);
          const currentTime = Date.now();

          if (existingLock) {
            const { timestamp } = JSON.parse(existingLock);
            if (currentTime - timestamp < LOCK_EXPIRY_MS) {
              isProcessing.current = false;
              return; // Already locked by another tab
            }
          }

          // Acquire lock
          localStorage.setItem(lockKey, JSON.stringify({ timestamp: currentTime }));
          setActiveReminder(reminder);
          playNotificationSound();
        }
      } catch (err) {
        console.error('Reminder Check Failed:', err);
      } finally {
        isProcessing.current = false;
      }
    };

    // Initial check and set interval
    checkReminders();
    const interval = setInterval(checkReminders, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [profile, activeReminder]);

  const handleComplete = async () => {
    if (!activeReminder) return;
    try {
      await api.update('follow_ups', activeReminder.id, {
        appointment_status: 'completed',
        next_reminder_at: null
      });
      localStorage.removeItem(`${POPUP_LOCK_KEY}_${activeReminder.id}`);
      setActiveReminder(null);
    } catch (err) {
      console.error('Complete Appointment Failed:', err);
    }
  };

  const handleSnooze = async () => {
    if (!activeReminder || !activeReminder.reminder_frequency) return;
    
    let nextDate = new Date();
    switch (activeReminder.reminder_frequency) {
      case '5min': nextDate.setMinutes(nextDate.getMinutes() + 5); break;
      case '1hour': nextDate.setHours(nextDate.getHours() + 1); break;
      case '1day': nextDate.setDate(nextDate.getDate() + 1); break;
      default: nextDate.setMinutes(nextDate.getMinutes() + 5);
    }

    try {
      await api.update('follow_ups', activeReminder.id, {
        next_reminder_at: nextDate.toISOString()
      });
      localStorage.removeItem(`${POPUP_LOCK_KEY}_${activeReminder.id}`);
      setActiveReminder(null);
    } catch (err) {
      console.error('Snooze Appointment Failed:', err);
    }
  };

  if (!activeReminder) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md bg-white/20 backdrop-blur-2xl border-white/40 shadow-2xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-dark/10 to-transparent pointer-events-none" />
        
        <div className="p-6 relative">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent-dark flex items-center justify-center shadow-lg shadow-accent-dark/20 animate-pulse">
                <BellRing className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-text-primary tracking-tight">Janji Kunjungan!</h2>
                <p className="text-xs text-text-secondary font-medium uppercase tracking-widest">Pengingat Jadwal</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveReminder(null)}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 mb-8">
            <div className="p-4 rounded-2xl bg-white/40 border border-white/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-text-muted tracking-wider">Konsumen</span>
                <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Penting</span>
              </div>
              <p className="text-lg font-black text-text-primary">{activeReminder.lead?.name}</p>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDateTime(activeReminder.appointment_date || '')}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-text-muted tracking-wider ml-1">Keterangan Janji</span>
              <p className="text-sm text-text-primary font-medium leading-relaxed bg-white/20 p-3 rounded-xl border border-white/30 italic">
                "{activeReminder.appointment_notes || activeReminder.description}"
              </p>
            </div>
          </div>

          <div className={cn("gap-3", activeReminder.reminder_frequency !== 'none' ? "grid grid-cols-2" : "flex")}>
            {activeReminder.reminder_frequency !== 'none' && (
              <Button
                variant="outline"
                className="rounded-xl border-white/60 bg-white/40 hover:bg-white/60"
                onClick={handleSnooze}
              >
                <Clock className="w-4 h-4 mr-2" />
                Nanti Saja
              </Button>
            )}
            <Button
              className="flex-1 rounded-xl shadow-lg shadow-accent-dark/20"
              onClick={handleComplete}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Selesai
            </Button>
          </div>
          
          {activeReminder.reminder_frequency !== 'none' && (
            <p className="text-[9px] text-center mt-4 text-text-muted font-medium italic">
              * Jika memilih 'Nanti Saja', sistem akan mengingatkan kembali dalam {
                activeReminder.reminder_frequency === '5min' ? '5 menit' :
                activeReminder.reminder_frequency === '1hour' ? '1 jam' : '1 hari'
              }.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AppointmentReminder;
