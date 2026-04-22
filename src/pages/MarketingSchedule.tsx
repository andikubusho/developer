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
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingSchedule, setEditingSchedule] = useState<MarketingSchedule | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    staff_entries: [] as { staff_id: string, position: string }[]
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
          { id: '1', staff_id: '1', date: new Date().toISOString(), position: 'Kanvas', staff: { id: '1', name: 'Rina', address: '', phone: '', position: 'Senior Marketing' } },
          { id: '2', staff_id: '2', date: new Date().toISOString(), position: 'Stay DV Village', staff: { id: '2', name: 'Doni', address: '', phone: '', position: 'Junior Marketing' } }
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
    if (formData.staff_entries.length === 0) return;
    
    setLoading(true);
    try {
      if (isMockMode) {
        const currentSchedules = getMockData<MarketingSchedule>('marketing_schedules', []);
        
        if (editingSchedule) {
          const entry = formData.staff_entries[0];
          const updatedSchedules = currentSchedules.map(s => 
            s.id === editingSchedule.id ? { ...s, position: entry.position } : s
          );
          saveMockData('marketing_schedules', updatedSchedules);
          setSchedules(updatedSchedules);
        } else {
          const newSchedules = formData.staff_entries.map(entry => {
            const selectedStaff = staff.find(s => s.id === entry.staff_id);
            return {
              id: Math.random().toString(36).substr(2, 9),
              staff_id: entry.staff_id,
              date: formData.date,
              position: entry.position,
              staff: selectedStaff
            };
          });
          const updatedSchedules = [...currentSchedules, ...newSchedules];
          saveMockData('marketing_schedules', updatedSchedules);
          setSchedules(updatedSchedules);
        }
        closeModal();
        return;
      }

      if (editingSchedule) {
        const entry = formData.staff_entries[0];
        const { error } = await supabase
          .from('marketing_schedules')
          .update({ position: entry.position })
          .eq('id', editingSchedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('marketing_schedules')
          .insert(formData.staff_entries.map(entry => ({
            staff_id: entry.staff_id,
            date: formData.date,
            position: entry.position
          })));
        if (error) throw error;
      }
      
      fetchSchedules();
      closeModal();
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus jadwal ini?')) return;
    
    try {
      if (isMockMode) {
        const currentSchedules = getMockData<MarketingSchedule>('marketing_schedules', []);
        const updatedSchedules = currentSchedules.filter(s => s.id !== id);
        saveMockData('marketing_schedules', updatedSchedules);
        setSchedules(updatedSchedules);
        closeModal();
        return;
      }

      const { error } = await supabase
        .from('marketing_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSchedules();
      closeModal();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };



  const closeModal = () => {
    setIsModalOpen(false);
    setIsFormEnabled(false);
    setEditingSchedule(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      staff_entries: []
    });
  };

  const openAddModal = (dateStr: string) => {
    setEditingSchedule(null);
    setFormData({
      date: dateStr,
      staff_entries: []
    });
    setIsFormEnabled(true);
    setIsModalOpen(true);
  };

  const openEditModal = (schedule: MarketingSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      date: schedule.date.split('T')[0],
      staff_entries: [{ staff_id: schedule.staff_id, position: schedule.position || '' }]
    });
    setIsFormEnabled(true);
    setIsModalOpen(true);
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
              <div 
                key={day} 
                className="bg-white p-2 min-h-[120px] border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => openAddModal(dateStr)}
              >
                <span className="text-sm font-medium text-slate-400">{day}</span>
                <div className="mt-2 space-y-1">
                  {daySchedules.map(s => (
                    <div 
                      key={s.id} 
                      className={cn(
                        "text-[10px] px-2 py-1 rounded border truncate font-medium flex justify-between items-center group cursor-pointer hover:brightness-95",
                        getStaffColor(s.staff?.name || '')
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(s);
                      }}
                    >
                      <span className="truncate">{s.staff?.name} - {s.position}</span>
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
        onClose={closeModal}
        title={editingSchedule ? "Edit Jadwal Marketing" : "Input Jadwal Marketing"}
      >
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Tanggal Terpilih</p>
            <p className="text-lg font-bold text-slate-900">
              {new Date(formData.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSave}>
            {!editingSchedule && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Marketing (Bisa banyak)</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-slate-300 rounded-lg bg-white">
                  {staff.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm p-1 hover:bg-slate-50 rounded cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formData.staff_entries.some(entry => entry.staff_id === s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              staff_entries: [...formData.staff_entries, { staff_id: s.id, position: '' }]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              staff_entries: formData.staff_entries.filter(entry => entry.staff_id !== s.id)
                            });
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {editingSchedule && (
               <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Marketing</label>
                <p className="text-sm font-bold text-slate-900 border border-slate-200 p-2.5 rounded-lg bg-slate-50">
                  {editingSchedule.staff?.name}
                </p>
              </div>
            )}

            {formData.staff_entries.length > 0 && (
              <div className="space-y-3 pt-2">
                <label className="text-sm font-medium text-slate-700 block">
                  {editingSchedule ? "Edit Posisi / Tugas:" : "Posisi / Tugas per Marketing:"}
                </label>
                {formData.staff_entries.map(entry => {
                  const s = staff.find(staffItem => staffItem.id === entry.staff_id);
                  return (
                    <div key={entry.staff_id} className="flex flex-col gap-1">
                      {!editingSchedule && <span className="text-xs font-semibold text-slate-500">{s?.name}</span>}
                      <input 
                        type="text"
                        placeholder="Contoh: Kanvas, Stay DV Village..."
                        autoFocus
                        value={entry.position}
                        onChange={(e) => {
                          const updatedEntries = formData.staff_entries.map(item => 
                            item.staff_id === entry.staff_id ? { ...item, position: e.target.value } : item
                          );
                          setFormData({ ...formData, staff_entries: updatedEntries });
                        }}
                        className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8">
              <div>
                {editingSchedule && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 w-full sm:w-auto"
                    onClick={() => handleDelete(editingSchedule.id)}
                  >
                    Hapus Jadwal
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={closeModal} className="flex-1 sm:flex-none">Batal</Button>
                <Button type="submit" isLoading={loading} disabled={formData.staff_entries.length === 0} className="flex-1 sm:flex-none">
                  {editingSchedule ? "Simpan Perubahan" : "Simpan Jadwal"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default MarketingSchedulePage;
