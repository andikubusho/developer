import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { Textarea } from '../ui/Textarea';

const progressSchema = z.object({
  percentage: z.number().min(0).max(100),
  description: z.string().min(5, 'Deskripsi minimal 5 karakter'),
  report_date: z.string(),
  photo_url: z.string().optional(),
});

type ProgressFormValues = z.infer<typeof progressSchema>;

interface ProgressFormProps {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ProgressForm: React.FC<ProgressFormProps> = ({ projectId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<ProgressFormValues>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      report_date: new Date().toISOString().split('T')[0],
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `progress/${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-assets')
        .getPublicUrl(filePath);

      setValue('photo_url', publicUrl);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Gagal mengupload foto.');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: ProgressFormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_progress')
        .insert([{
          ...values,
          project_id: projectId
        }]);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error saving progress:', error);
      alert('Gagal menyimpan progress.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="percentage"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Persentase Selesai (%)"
              value={field.value}
              onValueChange={(values) => field.onChange(values.floatValue || 0)}
              error={errors.percentage?.message}
            />
          )}
        />
        <Input 
          label="Tanggal Laporan" 
          type="date" 
          {...register('report_date')} 
          error={errors.report_date?.message} 
        />
      </div>
      <Textarea 
        label="Deskripsi Progress" 
        {...register('description')} 
        error={errors.description?.message} 
      />
      <div>
        <label className="text-sm font-medium text-text-primary mb-1.5 block">Foto Progress</label>
        <Input 
          type="file" 
          accept="image/*" 
          onChange={handleFileUpload}
          disabled={uploading}
        />
        {uploading && <p className="text-xs text-accent-dark mt-1">Mengupload foto...</p>}
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit" isLoading={loading} disabled={uploading}>Simpan Laporan</Button>
      </div>
    </form>
  );
};
