import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { NumberInput } from '../ui/NumberInput';
import { api } from '../../lib/api';

const projectSchema = z.object({
  name: z.string().min(3, 'Nama proyek minimal 3 karakter'),
  location: z.string().min(3, 'Lokasi minimal 3 karakter'),
  description: z.string().optional(),
  total_units: z.number().min(1, 'Minimal 1 unit'),
  status: z.enum(['planned', 'ongoing', 'completed']),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ onSuccess, onCancel, initialData }) => {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: initialData || {
      status: 'planned',
      total_units: 0,
    },
  });

  const onSubmit = async (values: ProjectFormValues) => {
    setLoading(true);
    try {
      if (initialData?.id) {
        await api.update('projects', initialData.id, values);
      } else {
        await api.insert('projects', values);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving project:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input 
        label="Nama Proyek" 
        {...register('name')} 
        error={errors.name?.message} 
      />
      <Input 
        label="Lokasi" 
        {...register('location')} 
        error={errors.location?.message} 
      />
      <Textarea 
        label="Deskripsi" 
        {...register('description')} 
        error={errors.description?.message} 
      />
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="total_units"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Total Unit"
              value={field.value}
              onValueChange={(values) => field.onChange(values.floatValue || 0)}
              error={errors.total_units?.message}
            />
          )}
        />
        <Select 
          label="Status" 
          options={[
            { label: 'Direncanakan', value: 'planned' },
            { label: 'Berjalan', value: 'ongoing' },
            { label: 'Selesai', value: 'completed' },
          ]}
          {...register('status')}
          error={errors.status?.message}
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" isLoading={loading}>Simpan Proyek</Button>
      </div>
    </form>
  );
};
