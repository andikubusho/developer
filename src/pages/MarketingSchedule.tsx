import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { MarketingSchedule, MarketingStaff } from '../types';
import { cn } from '../lib/utils';
import { getMockData, saveMockData } from '../lib/storage';

const MarketingSchedulePage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [schedules, setSchedules] = useState<MarketingSchedule[]>([]);
  const [staff, setStaff] = useState<MarketingStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [formData, setFormData] = useState({
    staff_id: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchSchedules();
    fetchStaff();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      if (isMockMode) {
        const defaultSchedules: MarketingSchedule[] = [
          { id: '1', staff_id: '1', date: new Date().toISOString(), staff: { id: '1', name: 'Rina', address: '', phone: '', position: '' } },
          { id: '2', staff_id: '2', date: new Date().toISOString(), staff: { id: '2', name: 'Doni', address: '', phone: '', position: '' } }
        ];
        setSchedules(getMockData<MarketingSchedule>('marketing_schedules', defaultSchedules));
        return;
      }

      const { data, error } = await supabase
        .from('marketing_schedules')
        .select('*, staff:marketing_staff(*)');

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      if (isMockMode) {
        const defaultStaff: MarketingStaff[] = [
          { id: '1', name: 'Rina', address: '', phone: '', position: 'Senior Marketing' },
          { id: '2', name: 'Doni', address: '', phone: '', position: 'Junior Marketing' }
        ];
        setStaff(getMockData<MarketingStaff>('marketing_staff', defaultStaff));
        return;
      }

      const { data, error } = await supabase
        .from('marketing_staff')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isMockMode) {
        const currentSchedules = getMockData<MarketingSchedule>('marketing_schedules', []);
        const selectedStaff = staff.find(s => s.id === formData.staff_id);
        
        const newSchedule = {
          id: Math.random().toString(36).substr(2, 9),
          staff_id: formData.staff_id,
          date: formData.date,
          staff: selectedStaff
        };
        
        const updatedSchedules = [...currentSchedules, newSchedule];
        saveMockData('marketing_schedules', updatedSchedules);
        setSchedules(updatedSchedules);
        setIsModalOpen(false);
        return;
      }

      const { error } = await supabase
        .from('marketing_schedules')
        .insert([formData]);
      
      if (error) throw error;
      fetchSchedules();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getStaffColor = (name: string) => {
    const colors = [
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-sky-100 text-sky-700 border-sky-200',
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              localStorage.removeItem('user_division');
              setDivision(null);
            }}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Jadwal Marketing</h1>
            <p className="text-slate-500">Atur jadwal piket dan kunjungan marketing</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Input Jadwal
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-slate-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
            <div key={day} className="bg-slate-50 p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
          {blanks.map(i => (
            <div key={`blank-${i}`} className="bg-white p-4 min-h-[120px]"></div>
          ))}
          {days.map(day => {
            const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
            const daySchedules = schedules.filter(s => s.date.startsWith(dateStr));
            
            return (
              <div key={day} className="bg-white p-2 min-h-[120px] border-t border-slate-100">
                <span className="text-sm font-medium text-slate-400">{day}</span>
                <div className="mt-2 space-y-1">
                  {daySchedules.map(s => (
                    <div 
                      key={s.id} 
                      className={cn(
                        "text-[10px] px-2 py-1 rounded border truncate font-medium",
                        getStaffColor(s.staff?.name || '')
                      )}
                    >
                      {s.staff?.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Input Jadwal Marketing"
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Marketing</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.staff_id}
              onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
              required
            >
              <option value="">-- Pilih Marketing --</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tanggal</label>
            <input 
              type="date" 
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan Jadwal</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MarketingSchedulePage;
