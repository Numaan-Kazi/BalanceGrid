import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { BucketPlan } from '../../types';

const bucketPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  destination: z.string().optional(),
  targetYear: z.coerce.number().min(2020).max(2100).optional(),
  targetMonth: z.coerce.number().min(1).max(12).optional(),
  budget: z.coerce.number().positive('Budget must be positive'),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED']).default('PLANNED'),
  notes: z.string().optional(),
});

type BucketPlanFormData = z.infer<typeof bucketPlanSchema>;

interface BucketPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BucketPlanFormData) => Promise<void>;
  initialData?: BucketPlan | null;
}

export const BucketPlanModal: React.FC<BucketPlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BucketPlanFormData>({
    resolver: zodResolver(bucketPlanSchema),
    defaultValues: {
      name: initialData?.name || '',
      destination: initialData?.destination || '',
      targetYear: initialData?.targetYear || new Date().getFullYear(),
      targetMonth: initialData?.targetMonth || new Date().getMonth() + 1,
      budget: initialData?.budget || 0,
      status: initialData?.status || 'PLANNED',
      notes: initialData?.notes || '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        destination: initialData.destination || '',
        targetYear: initialData.targetYear || new Date().getFullYear(),
        targetMonth: initialData.targetMonth || new Date().getMonth() + 1,
        budget: initialData.budget,
        status: initialData.status,
        notes: initialData.notes || '',
      });
    } else {
      reset({
        name: '',
        destination: '',
        targetYear: new Date().getFullYear(),
        targetMonth: new Date().getMonth() + 1,
        budget: 0,
        status: 'PLANNED',
        notes: '',
      });
    }
  }, [initialData, reset]);

  const onFormSubmit = async (data: BucketPlanFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Bucket List Plan' : 'New Bucket List Plan'}
      description="Plan upcoming trips, purchases, or life milestones with an estimated budget."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <Input
          label="Plan Title"
          placeholder="e.g. Goa Vacation, MacBook Pro M3, New Sofa"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Destination / Location (Optional)"
            placeholder="e.g. North Goa"
            error={errors.destination?.message}
            {...register('destination')}
          />

          <Input
            label="Estimated Budget (₹)"
            type="number"
            step="0.01"
            placeholder="15000.00"
            error={errors.budget?.message}
            {...register('budget')}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Input
            label="Target Year"
            type="number"
            error={errors.targetYear?.message}
            {...register('targetYear')}
          />

          <Select
            label="Target Month"
            error={errors.targetMonth?.message}
            options={[
              { value: '1', label: 'Jan' },
              { value: '2', label: 'Feb' },
              { value: '3', label: 'Mar' },
              { value: '4', label: 'Apr' },
              { value: '5', label: 'May' },
              { value: '6', label: 'Jun' },
              { value: '7', label: 'Jul' },
              { value: '8', label: 'Aug' },
              { value: '9', label: 'Sep' },
              { value: '10', label: 'Oct' },
              { value: '11', label: 'Nov' },
              { value: '12', label: 'Dec' },
            ]}
            {...register('targetMonth')}
          />

          <Select
            label="Status"
            error={errors.status?.message}
            options={[
              { value: 'PLANNED', label: 'Planned' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'COMPLETED', label: 'Completed' },
            ]}
            {...register('status')}
          />
        </div>

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Book resort early for discount"
          error={errors.notes?.message}
          {...register('notes')}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

