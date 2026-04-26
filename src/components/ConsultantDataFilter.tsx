import React, { useState, useEffect } from 'react';
import { Users, Filter, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useCanViewAll } from '../hooks/usePermissions';
import { cn } from '../lib/utils';

interface ConsultantDataFilterProps {
  value: string | 'all';
  onChange: (id: string | 'all') => void;
  menuKey: string;
  className?: string;
}

const ConsultantDataFilter: React.FC<ConsultantDataFilterProps> = ({ value, onChange, menuKey, className }) => {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const canViewAll = useCanViewAll(menuKey);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchStaff();
    }
  }, [isAdmin]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await api.get('consultants', 'select=id,name&order=name.asc');
      setStaff(data || []);
    } catch (err) {
      console.error('Failed to fetch property consultants:', err);
    } finally {
      setLoading(false);
    }
  };

  // If user doesn't have viewAll permission, they are locked to their own data.
  // We don't show the filter dropdown to them to avoid confusion.
  if (!canViewAll) return null;

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/40 backdrop-blur-sm rounded-pill border border-white/60 shadow-sm">
        <Users className="w-4 h-4 text-accent-dark" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as any)}
          disabled={loading}
          className="bg-transparent text-sm font-bold text-text-primary focus:outline-none appearance-none pr-6 cursor-pointer disabled:opacity-50"
        >
          <option value="all">Semua Konsultan</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-3 pointer-events-none" />
      </div>
    </div>
  );
};

export default ConsultantDataFilter;
