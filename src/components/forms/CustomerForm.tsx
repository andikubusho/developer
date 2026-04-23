import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

const customerSchema = z.object({
  full_name: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Email tidak valid'),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit'),
  address: z.string().min(5, 'Alamat minimal 5 karakter'),
  identity_number: z.string().min(16, 'NIK minimal 16 digit'),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onSuccess, onCancel, initialData }) => {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (values: CustomerFormValues) => {
    setLoading(true);
    try {
      if (initialData?.id) {
        await api.update('customers', initialData.id, values);
      } else {
        await api.insert('customers', values);
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
      <Input 
        label="Nomor Identitas (NIK)" 
        {...register('identity_number')} 
        error={errors.identity_number?.message} 
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
