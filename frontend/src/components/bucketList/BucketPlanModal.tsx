import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { BucketPlan } from '../../types';

const bucketPlanSchema = z.object({
  name: z.string().trim().min(1, 'Plan title is required'),
  destination: z.string().optional(),
  targetYear: z.coerce.number().min(2020).max(2100).optional(),
  targetMonth: z.coerce.number().min(1).max(12).optional(),
  budget: z.coerce.number().positive('Budget must be positive'),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED']).default('IN_PROGRESS'),
  notes: z.string().optional(),
});

export type BucketPlanFormData = z.infer<typeof bucketPlanSchema>;

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
      name: '',
      destination: '',
      targetYear: new Date().getFullYear(),
      targetMonth: new Date().getMonth() + 1,
      budget: '' as any,
      status: 'IN_PROGRESS',
      notes: '',
    },
  });

  // Reset form whenever modal opens or closes, or when initialData changes
  useEffect(() => {
    if (isOpen) {
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
          budget: '' as any,
          status: 'IN_PROGRESS',
          notes: '',
        });
      }
    } else {
      // Clear out form state when modal closes
      reset({
        name: '',
        destination: '',
        targetYear: new Date().getFullYear(),
        targetMonth: new Date().getMonth() + 1,
        budget: '' as any,
        status: 'IN_PROGRESS',
        notes: '',
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = async (data: BucketPlanFormData) => {
    // Automatically set status to IN_PROGRESS upon creation if not editing
    const finalData: BucketPlanFormData = {
      ...data,
      status: isEditing && initialData ? initialData.status : 'IN_PROGRESS',
    };
    await onSubmit(finalData);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Bucket List Plan' : 'New Bucket List Plan'}
      description="Plan upcoming trips, purchases, or life milestones with an allocated budget pool."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <Input
          label="Plan Title"
          placeholder="e.g. Europe Vacation, MacBook Pro M3, Home Renovation"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Location / Item (Optional)"
            placeholder="e.g. Paris, France or Apple Store"
            error={errors.destination?.message}
            {...register('destination')}
          />

          <Input
            label="Allocated Budget Pool (₹)"
            type="number"
            step="0.01"
            placeholder="15000.00"
            error={errors.budget?.message}
            {...register('budget')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Target Year"
            type="number"
            placeholder={new Date().getFullYear().toString()}
            error={errors.targetYear?.message}
            {...register('targetYear')}
          />

          <Select
            label="Target Month"
            error={errors.targetMonth?.message}
            options={[
              { value: '1', label: 'January' },
              { value: '2', label: 'February' },
              { value: '3', label: 'March' },
              { value: '4', label: 'April' },
              { value: '5', label: 'May' },
              { value: '6', label: 'June' },
              { value: '7', label: 'July' },
              { value: '8', label: 'August' },
              { value: '9', label: 'September' },
              { value: '10', label: 'October' },
              { value: '11', label: 'November' },
              { value: '12', label: 'December' },
            ]}
            {...register('targetMonth')}
          />
        </div>

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Book flights early, check visa requirements"
          error={errors.notes?.message}
          {...register('notes')}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
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
