import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SavingsGoal } from '../../types';

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  targetAmount: z.coerce.number().positive('Target amount must be positive'),
  targetDate: z.string().optional(),
  notes: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GoalFormData) => Promise<void>;
  initialData?: SavingsGoal | null;
}

export const GoalModal: React.FC<GoalModalProps> = ({
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
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: initialData?.name || '',
      targetAmount: initialData?.targetAmount || 0,
      targetDate: initialData?.targetDate || '',
      notes: initialData?.notes || '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        targetAmount: initialData.targetAmount,
        targetDate: initialData.targetDate || '',
        notes: initialData.notes || '',
      });
    } else {
      reset({
        name: '',
        targetAmount: 0,
        targetDate: '',
        notes: '',
      });
    }
  }, [initialData, reset]);

  const onFormSubmit = async (data: GoalFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Savings Goal' : 'Create Savings Goal'}
      description="Track emergency funds, vacation funds, or personal savings targets."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <Input
          label="Goal Name"
          placeholder="e.g. 6-Month Emergency Fund, Japan Trip 2027"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Target Amount (₹)"
            type="number"
            step="0.01"
            placeholder="50000.00"
            error={errors.targetAmount?.message}
            {...register('targetAmount')}
          />

          <Input
            label="Target Date (Optional)"
            type="date"
            error={errors.targetDate?.message}
            {...register('targetDate')}
          />
        </div>

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Stored in SBI Fixed Deposit"
          error={errors.notes?.message}
          {...register('notes')}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

