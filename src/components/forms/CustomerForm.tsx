import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import { useCanViewAll } from '../../hooks/usePermissions';

const customerSchema = z.object({
  full_name: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Email tidak valid').optional().nullable().or(z.literal('')),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit'),
  address: z.string().min(5, 'Alamat minimal 5 karakter'),
  identity_number: z.string().min(16, 'NIK minimal 16 digit'),
  job: z.string().optional().nullable(),
  birth_info: z.string().optional().nullable(),
  consultant_id: z.string().optional().nullable(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onSuccess, onCancel, initialData }) => {
  const { profile } = useAuth();
  const canViewAll = useCanViewAll('leads'); // Using leads permission as proxy for marketing
  const [loading, setLoading] = useState(false);
  const [consultants, setConsultants] = useState<{ id: string; name: string }[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData ? {
      ...initialData,
      consultant_id: initialData.consultant_id || '',
    } : undefined,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        consultant_id: initialData.consultant_id || '',
      });
    } else {
      reset({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        identity_number: '',
        job: '',
        birth_info: '',
        consultant_id: '',
      });
    }
  }, [initialData, reset]);

  useEffect(() => {
    const fetchConsultants = async () => {
      try {
        const data = await api.get('consultants', 'select=id,name&order=name.asc');
        setConsultants(data || []);
      } catch (err) {
        console.error('Error fetching consultants:', err);
      }
    };
    fetchConsultants();
  }, []);

  const onSubmit = async (values: CustomerFormValues) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        consultant_id: values.consultant_id || null,
      };
      if (initialData?.id) {
        await api.update('customers', initialData.id, payload);
      } else {
        await api.insert('customers', payload);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Konsultan Property"
        options={consultants.map(c => ({ label: c.name, value: c.id }))}
        {...register('consultant_id')}
        error={errors.consultant_id?.message}
        disabled={!canViewAll && !!profile?.consultant_id}
      />
      <Input 
        label="Nama Lengkap" 
        {...register('full_name')} 
        error={errors.full_name?.message} 
      />
      <div className="grid grid-cols-2 gap-4">
        <Input 
          label="Email" 
          type="email"
          {...register('email')} 
          error={errors.email?.message} 
        />
        <Input 
          label="Telepon" 
          {...register('phone')} 
          error={errors.phone?.message} 
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input 
          label="Nomor Identitas (NIK)" 
          {...register('identity_number')} 
          error={errors.identity_number?.message} 
        />
        <Input 
          label="Pekerjaan" 
          {...register('job')} 
          error={errors.job?.message} 
          placeholder="Misal: Karyawan Swasta"
        />
      </div>
      <Input 
        label="Tempat, Tgl Lahir" 
        {...register('birth_info')} 
        error={errors.birth_info?.message} 
        placeholder="Misal: Jakarta, 01-01-1990"
      />
      <Textarea 
        label="Alamat Lengkap" 
        {...register('address')} 
        error={errors.address?.message} 
      />
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" isLoading={loading}>Simpan Pelanggan</Button>
      </div>
    </form>
  );
};
