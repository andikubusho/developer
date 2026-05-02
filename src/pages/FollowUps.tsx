import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MessageSquare, Clock, ArrowLeft, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { FollowUp, Lead, LeadStatus } from '../types';
import { cn, formatDateTime } from '../lib/utils';
import { api } from '../lib/api';
import ConsultantDataFilter from '../components/ConsultantDataFilter';
import { useCanViewAll } from '../hooks/usePermissions';

const FollowUps: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision, profile } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const canViewAll = useCanViewAll('follow-ups');
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | 'all'>(
    canViewAll ? (localStorage.getItem('filter_consultant_id') || 'all') : (profile?.consultant_id || 'none')
  );

  // Form State
  const [formData, setFormData] = useState({
    lead_id: '',
    description: '',
    status: 'no respon' as LeadStatus,
    date_time: new Date().toISOString(),
    consultant_id: '',
    is_appointment: false,
    appointment_date: '',
    reminder_frequency: 'none' as FollowUp['reminder_frequency'],
    appointment_notes: ''
  });
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    fetchFollowUps();
    fetchStaff();
  }, [selectedConsultantId]);

  const fetchStaff = async () => {
    try {
      const data = await api.get('consultants', 'select=id,name&order=name.asc');
      setStaff(data || []);
    } catch (err) {
      console.error('Fetch Staff Failed:', err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    
    if (isModalOpen && formData.consultant_id) {
      setLeads([]); // Clear while loading
      api.get('leads', `select=*&consultant_id=eq.${formData.consultant_id}&order=name.asc`, { signal: controller.signal })
        .then(data => setLeads(data || []))
        .catch(err => { if (err.name !== 'AbortError') console.error(err); });
    } else {
      setLeads([]);
    }

    return () => controller.abort();
  }, [formData.consultant_id, isModalOpen]);

  useEffect(() => {
    if (selectedFollowUp) {
      setFormData({
        lead_id: selectedFollowUp.lead_id,
        description: selectedFollowUp.description,
        status: selectedFollowUp.status,
        date_time: selectedFollowUp.date_time,
        consultant_id: selectedFollowUp.lead?.consultant_id || '',
        is_appointment: !!selectedFollowUp.is_appointment,
        appointment_date: selectedFollowUp.appointment_date ? new Date(selectedFollowUp.appointment_date).toISOString().slice(0, 16) : '',
        reminder_frequency: selectedFollowUp.reminder_frequency || 'none',
        appointment_notes: selectedFollowUp.appointment_notes || ''
      });
    } else {
      setFormData({
        lead_id: '',
        description: '',
        status: 'no respon',
        date_time: new Date().toISOString(),
        consultant_id: profile?.consultant_id || '',
        is_appointment: false,
        appointment_date: '',
        reminder_frequency: 'none',
        appointment_notes: ''
      });
    }
  }, [selectedFollowUp, isModalOpen, profile]);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);

      const [fuData, leadsData] = await Promise.all([
        api.get('follow_ups', 'select=*&order=date_time.desc'),
        api.get('leads', 'select=id,name,phone,consultant_id'),
      ]);

      const leadsMap: Record<string, { name: string; phone: string; consultant_id: string }> = {};
      (leadsData || []).forEach((l: any) => { leadsMap[l.id] = l; });

      let enriched = (fuData || []).map((f: any) => ({
        ...f,
        lead: f.lead_id ? (leadsMap[f.lead_id] || null) : null,
      }));

      // Filter by consultant client-side
      if (selectedConsultantId !== 'all') {
        enriched = enriched.filter((f: any) => f.lead?.consultant_id === selectedConsultantId);
      }

      setFollowUps(enriched);
    } catch (error) {
      console.error('Error fetching follow ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const filterParam = selectedConsultantId !== 'all' && selectedConsultantId !== 'none' ? `&consultant_id=eq.${selectedConsultantId}` : '';
      const data = await api.get('leads', `select=id,name,phone,consultant_id&order=name.asc${filterParam}`);
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const filteredFollowUps = followUps.filter(f =>
    (f.lead?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setSelectedFollowUp(null);
    setIsModalOpen(true);
  };

  const handleEdit = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const appointmentDate = formData.is_appointment && formData.appointment_date
        ? new Date(formData.appointment_date).toISOString()
        : null;

      // Hanya hitung ulang next_reminder_at jika appointment_date berubah atau record baru
      const prevAppointmentDate = selectedFollowUp?.appointment_date
        ? new Date(selectedFollowUp.appointment_date).toISOString()
        : null;
      const appointmentDateChanged = appointmentDate !== prevAppointmentDate;
      const nextReminderAt = appointmentDate
        ? (selectedFollowUp && !appointmentDateChanged
            ? selectedFollowUp.next_reminder_at  // pertahankan jika tanggal tidak berubah
            : new Date(new Date(appointmentDate).getTime() - 2 * 60 * 60 * 1000).toISOString())
        : null;

      const saveData = {
        lead_id: formData.lead_id,
        description: formData.description,
        status: formData.status,
        date_time: formData.date_time,
        is_appointment: formData.is_appointment,
        appointment_date: appointmentDate,
        reminder_frequency: formData.reminder_frequency,
        appointment_notes: formData.appointment_notes,
        next_reminder_at: nextReminderAt,
        // Pertahankan appointment_status saat edit, jangan reset ke 'pending'
        appointment_status: formData.is_appointment
          ? (selectedFollowUp?.appointment_status || 'pending')
          : null,
      };

      if (selectedFollowUp) {
        await api.update('follow_ups', selectedFollowUp.id, saveData);
      } else {
        await api.insert('follow_ups', saveData);

        // Notify Manager/Supervisor
        try {
          await api.insert('notifications', {
            target_divisions: [profile?.division || 'marketing'],
            title: 'Follow Up Baru',
            message: `${profile?.full_name} melakukan follow up baru.`,
            sender_name: profile?.full_name || 'Staff',
            metadata: { type: 'follow_ups' }
          });
        } catch (notifErr) {
          console.error('Failed to send manager notification:', notifErr);
        }
      }
      await fetchFollowUps();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving follow up:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      setLoading(true);
      await api.delete('follow_ups', id);
      await fetchFollowUps();
    } catch (error: any) {
      console.error('Error deleting follow up:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'hot': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      case 'no respon': return 'bg-white/40 text-text-primary';
      default: return 'bg-white/40 text-text-primary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <h1 className="text-lg sm:text-2xl font-black text-text-primary tracking-tight">Follow Up</h1>
            <p className="text-[10px] sm:text-sm text-text-secondary font-medium uppercase tracking-widest">Riwayat Komunikasi</p>
          </div>
        </div>
        <Button size="sm" className="w-full sm:w-auto rounded-xl text-[10px] sm:text-sm py-3" onClick={handleAdd}>
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          Input Data
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <ConsultantDataFilter 
          value={selectedConsultantId}
          menuKey="follow-ups"
          onChange={(id) => {
            setSelectedConsultantId(id);
            if (canViewAll) {
              localStorage.setItem('filter_consultant_id', id);
            }
          }}
        />
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari nama atau keterangan..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
              <THead>
                <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                  <TH className="px-3 py-3 font-black hidden sm:table-cell">Waktu</TH>
                  <TH className="px-3 py-3 font-black">Konsumen & Ket</TH>
                  <TH className="px-3 py-3 font-black">Status</TH>
                  <TH className="px-3 py-3 font-black text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR>
                    <TD colSpan={5} className="px-3 py-10 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
                    </TD>
                  </TR>
                ) : filteredFollowUps.length === 0 ? (
                  <TR>
                    <TD colSpan={5} className="px-3 py-10 text-center text-text-secondary text-sm">
                      Tidak ada data follow up.
                    </TD>
                  </TR>
                ) : (
                  filteredFollowUps.map((f) => (
                    <TR key={f.id} className="hover:bg-white/30 transition-colors">
                      <TD className="px-3 py-4 text-[10px] text-text-secondary hidden sm:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-text-muted" />
                          {formatDateTime(f.date_time)}
                        </div>
                      </TD>
                      <TD className="px-3 py-4">
                        <div className="font-black text-text-primary text-xs whitespace-nowrap flex items-center gap-2">
                          {f.lead?.name}
                          {f.is_appointment && (
                            <span className={cn(
                              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                              f.appointment_status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-accent-dark/10 text-accent-dark"
                            )}>
                              <Clock className="w-2 h-2" />
                              Janji {f.appointment_status === 'completed' ? '✓' : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-text-secondary sm:hidden mb-1">{formatDateTime(f.date_time)}</div>
                        <div className="text-[10px] text-text-secondary italic line-clamp-2 max-w-[150px] sm:max-w-xs">{f.description}</div>
                      </TD>
                      <TD className="px-3 py-4">
                        <span className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider',
                          getStatusColor(f.status)
                        )}>
                          {f.status}
                        </span>
                      </TD>
                      <TD className="px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(f)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(f.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedFollowUp ? 'Edit Follow Up' : 'Input Follow Up'}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Tanggal & Jam" 
            value={selectedFollowUp ? formatDateTime(selectedFollowUp.date_time) : formatDateTime(new Date())} 
            readOnly 
            className="bg-white/30 cursor-not-allowed"
          />
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Konsultan Property <span className="text-red-500">*</span></label>
            <select 
              className="w-full h-10 rounded-xl border border-white/60 px-3 py-2 text-sm focus:outline-none bg-white/50"
              value={formData.consultant_id}
              onChange={(e) => setFormData({ ...formData, consultant_id: e.target.value, lead_id: '' })}
              required
              disabled={!canViewAll && !!profile?.consultant_id}
            >
              <option value="">-- Pilih Konsultan --</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Pilih Calon Konsumen <span className="text-red-500">*</span></label>
            <select 
              className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
              value={formData.lead_id}
              onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
              required
              disabled={!formData.consultant_id}
            >
              <option value="">{formData.consultant_id ? '-- Pilih Konsumen --' : '-- Pilih konsultan terlebih dahulu --'}</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Keterangan</label>
            <textarea 
              className="w-full rounded-xl border border-white/60 px-3 py-2 text-sm focus:outline-none"
              rows={3}
              placeholder="Isi hasil follow up..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {(['no respon', 'low', 'medium', 'hot'] as LeadStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: s })}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize',
                    formData.status === s 
                      ? 'bg-accent-dark border-accent-dark text-white' 
                      : 'bg-white border-white/40 text-text-secondary hover:border-accent-dark'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Janji Kunjungan Section */}
          <div className="pt-4 border-t border-white/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-dark" />
                <span className="text-sm font-bold text-text-primary">Janji Kunjungan</span>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_appointment: !formData.is_appointment })}
                className={cn(
                  "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none",
                  formData.is_appointment ? "bg-accent-dark" : "bg-white/40 border border-white/60"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                    formData.is_appointment ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {formData.is_appointment && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    type="datetime-local"
                    label="Waktu Janji"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    required
                  />
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-1.5 block">Frekuensi Reminder</label>
                    <select 
                      className="w-full h-10 rounded-xl border border-white/60 px-3 py-2 text-sm focus:outline-none bg-white/50"
                      value={formData.reminder_frequency}
                      onChange={(e) => setFormData({ ...formData, reminder_frequency: e.target.value as any })}
                      required
                    >
                      <option value="none">Hanya Sekali</option>
                      <option value="5min">Tiap 5 Menit</option>
                      <option value="1hour">Tiap Jam</option>
                      <option value="1day">Tiap Hari</option>
                    </select>
                  </div>
                </div>
                <Input 
                  label="Keterangan Janji"
                  placeholder="Contoh: Ketemu di lokasi, bawa brosur..."
                  value={formData.appointment_notes}
                  onChange={(e) => setFormData({ ...formData, appointment_notes: e.target.value })}
                />
                <p className="text-[10px] text-accent-dark font-bold italic bg-accent-dark/5 p-2 rounded-lg border border-accent-dark/10">
                  * Sistem akan mulai memberikan notifikasi pengingat kepada Anda 2 jam sebelum waktu janji yang ditentukan.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan Follow Up</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FollowUps;
