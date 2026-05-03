import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Plus, ArrowLeft, ChevronLeft, ChevronRight, Printer, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { ConsultantSchedule, PropertyConsultant } from '../types';
import { cn } from '../lib/utils';
import { getMockData, saveMockData } from '../lib/storage';

const ConsultantSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { isMockMode, division, setDivision } = useAuth();
  const [schedules, setSchedules] = useState<ConsultantSchedule[]>([]);
  const [staff, setStaff] = useState<PropertyConsultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingSchedule, setEditingSchedule] = useState<ConsultantSchedule | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    staff_entries: [] as { consultant_id: string, position: string }[]
  });

  useEffect(() => {
    fetchSchedules();
    fetchStaff();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      if (isMockMode) {
        const defaultSchedules: ConsultantSchedule[] = [
          { id: '1', consultant_id: '1', date: new Date().toISOString(), position: 'Kanvas', consultant: { id: '1', name: 'Rina', address: '', phone: '', position: 'Senior Konsultan' } },
          { id: '2', consultant_id: '2', date: new Date().toISOString(), position: 'Stay DV Village', consultant: { id: '2', name: 'Doni', address: '', phone: '', position: 'Junior Konsultan' } }
        ];
        setSchedules(getMockData<ConsultantSchedule>('consultant_schedules', defaultSchedules));
        return;
      }

      const data = await api.get('consultant_schedules', 'select=*,consultant:consultants(id,name)');
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
        const defaultStaff: PropertyConsultant[] = [
          { id: '1', name: 'Rina', address: '', phone: '', position: 'Senior Konsultan' },
          { id: '2', name: 'Doni', address: '', phone: '', position: 'Junior Konsultan' }
        ];
        setStaff(getMockData<PropertyConsultant>('consultants', defaultStaff));
        return;
      }

      const data = await api.get('consultants', 'select=*&order=name.asc');
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
        const currentSchedules = getMockData<ConsultantSchedule>('consultant_schedules', []);
        
        if (editingSchedule) {
          const entry = formData.staff_entries[0];
          const updatedSchedules = currentSchedules.map(s => 
            s.id === editingSchedule.id ? { ...s, position: entry.position } : s
          );
          saveMockData('consultant_schedules', updatedSchedules);
          setSchedules(updatedSchedules);
        } else {
          const newSchedules = formData.staff_entries.map(entry => {
            const selectedStaff = staff.find(s => s.id === entry.consultant_id);
            return {
              id: Math.random().toString(36).substr(2, 9),
              consultant_id: entry.consultant_id,
              date: formData.date,
              position: entry.position,
              consultant: selectedStaff
            };
          });
          const updatedSchedules = [...currentSchedules, ...newSchedules];
          saveMockData('consultant_schedules', updatedSchedules);
          setSchedules(updatedSchedules);
        }
        closeModal();
        return;
      }

      if (editingSchedule) {
        const entry = formData.staff_entries[0];
        await api.update('consultant_schedules', editingSchedule.id, { position: entry.position });
      } else {
        // We cannot batch insert directly via the api helper which uses insert single item. 
        // We must loop and insert sequentially.
        for (const entry of formData.staff_entries) {
          await api.insert('consultant_schedules', {
            consultant_id: entry.consultant_id,
            date: formData.date,
            position: entry.position
          });
        }
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
        const currentSchedules = getMockData<ConsultantSchedule>('consultant_schedules', []);
        const updatedSchedules = currentSchedules.filter(s => s.id !== id);
        saveMockData('consultant_schedules', updatedSchedules);
        setSchedules(updatedSchedules);
        closeModal();
        return;
      }

      await api.delete('consultant_schedules', id);
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

  const openEditModal = (schedule: ConsultantSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      date: schedule.date.split('T')[0],
      staff_entries: [{ consultant_id: schedule.consultant_id, position: schedule.position || '' }]
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

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('calendar-content');
    if (!element) return;

    try {
      setIsExporting(true);
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Jadwal-Konsultan-${monthNames[currentDate.getMonth()]}-${currentDate.getFullYear()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal mengekspor PDF. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  const getStaffColor = (name: string) => {
    if (!name) return 'bg-slate-100 text-slate-700 border-slate-200';
    
    const colors = [
      'bg-accent-lavender/30 text-accent-dark border-accent-lavender/40',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-sky-100 text-sky-700 border-sky-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-lime-100 text-lime-700 border-lime-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    ];

    // Simple hash based on name characters
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: landscape; 
            margin: 0 !important; 
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          header, nav, aside, footer, button, .print-hidden {
            display: none !important;
          }
          #calendar-content {
            border: none !important;
            box-shadow: none !important;
            padding: 5mm !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          .print-compact-row {
            min-height: auto !important;
            height: 32mm !important; 
            padding: 2px !important;
            overflow: hidden !important;
          }
          .print-schedule-item {
            font-size: 7px !important;
            padding: 0px 2px !important;
            margin-bottom: 1px !important;
          }
          h1, h2 {
            margin-bottom: 5px !important;
            margin-top: 0 !important;
          }
        }
      `}} />
      
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold text-text-primary uppercase">Jadwal Konsultan Property Abadi Lestari Mandiri</h1>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="p-1 sm:p-2 h-auto"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-text-primary tracking-tight">Jadwal Konsultan</h1>
            <p className="text-[10px] sm:text-sm text-text-secondary font-medium uppercase tracking-widest">Manajemen Piket</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 print:hidden">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm h-9 px-2 sm:px-3"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 h-4" />
            <span>Cetak</span>
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleExportPDF}
            isLoading={isExporting}
            className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm h-9 px-2 sm:px-3"
          >
            <FileDown className="w-3.5 h-3.5 sm:w-4 h-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      <Card id="calendar-content" className="p-6 border-none shadow-none sm:border sm:shadow-premium print:p-0 print:border-none print:shadow-none">
        <div className="flex items-center justify-between gap-4 mb-4 sm:mb-8 print:mb-4 px-2 sm:px-0">
          <h2 className="text-base sm:text-xl font-black text-text-primary uppercase tracking-wider">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex gap-1 sm:gap-2 print:hidden">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide -mx-2 sm:mx-0">
          <div className="grid grid-cols-7 gap-px bg-white/50 border border-white/40 rounded-xl overflow-hidden min-w-[350px]">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
              <div key={day} className="bg-white/30 p-2 sm:p-3 text-center text-[9px] sm:text-xs font-black text-text-secondary uppercase tracking-widest">
                {day}
              </div>
            ))}
            {blanks.map(i => (
              <div key={`blank-${i}`} className="bg-white p-2 sm:p-4 min-h-[60px] sm:min-h-[120px] print-compact-row"></div>
            ))}
            {days.map(day => {
              const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
              const daySchedules = schedules.filter(s => s.date.startsWith(dateStr));
              
              return (
                <div 
                  key={day} 
                  className="bg-white p-1 sm:p-2 min-h-[60px] sm:min-h-[120px] border-t border-white/40 cursor-pointer hover:bg-white/30 transition-colors print-compact-row"
                  onClick={() => openAddModal(dateStr)}
                >
                  <span className="text-[10px] sm:text-sm font-black text-text-muted">{day}</span>
                  <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1 min-h-[40px] sm:min-h-[90px] print:min-h-0">
                    {daySchedules.map(s => (
                      <div 
                        key={s.id} 
                        className={cn(
                          "text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 sm:py-1 rounded border truncate font-black flex justify-between items-center group cursor-pointer hover:brightness-95 print:py-0.5 print:text-[9px]",
                          getStaffColor(s.consultant?.name || '')
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(s);
                        }}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{s.consultant?.name}</span>
                          {s.position && (
                            <span className="text-[7px] sm:text-[8px] opacity-70 font-medium truncate italic">
                              {s.position}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSchedule ? "Edit Jadwal Konsultan" : "Input Jadwal Konsultan"}
      >
        <div className="space-y-6">
          <div className="p-4 bg-accent-lavender/20 rounded-xl border border-accent-lavender/30">
            <p className="text-xs font-semibold text-accent-dark uppercase tracking-wider mb-1">Tanggal Terpilih</p>
            <p className="text-lg font-bold text-text-primary">
              {new Date(formData.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSave}>
            {!editingSchedule && (
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">Pilih Konsultan (Bisa banyak)</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-white/60 rounded-xl bg-white">
                  {staff.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm p-1 hover:bg-white/30 rounded cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formData.staff_entries.some(entry => entry.consultant_id === s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              staff_entries: [...formData.staff_entries, { consultant_id: s.id, position: '' }]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              staff_entries: formData.staff_entries.filter(entry => entry.consultant_id !== s.id)
                            });
                          }
                        }}
                        className="rounded border-white/60 text-accent-dark focus:ring-accent-lavender/50"
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {editingSchedule && (
               <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">Konsultan</label>
                <p className="text-sm font-bold text-text-primary border border-white/40 p-2.5 rounded-xl bg-white/30">
                  {editingSchedule.consultant?.name}
                </p>
              </div>
            )}

            {formData.staff_entries.length > 0 && (
              <div className="space-y-3 pt-2">
                <label className="text-sm font-medium text-text-primary block">
                  {editingSchedule ? "Edit Posisi / Tugas:" : "Posisi / Tugas per Konsultan:"}
                </label>
                {formData.staff_entries.map(entry => {
                  const s = staff.find(staffItem => staffItem.id === entry.consultant_id);
                  return (
                    <div key={entry.consultant_id} className="flex flex-col gap-1">
                      {!editingSchedule && <span className="text-xs font-semibold text-text-secondary">{s?.name}</span>}
                      <input 
                        type="text"
                        placeholder="Contoh: Kanvas, Stay DV Village..."
                        autoFocus
                        value={entry.position}
                        onChange={(e) => {
                          const updatedEntries = formData.staff_entries.map(item => 
                            item.consultant_id === entry.consultant_id ? { ...item, position: e.target.value } : item
                          );
                          setFormData({ ...formData, staff_entries: updatedEntries });
                        }}
                        className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
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

export default ConsultantSchedulePage;

