import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Category, RecurringBill } from '../../types';

const billSchema = z.object({
  name: z.string().min(1, 'Bill name is required').transform(s => s.trim()),
  amount: z.coerce.number().positive('Bill amount must be positive'),
  categoryId: z.string().min(1, 'Category is required'),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  nextDueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
});

export type BillFormData = z.infer<typeof billSchema>;

interface RecurringBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BillFormData, id?: string) => Promise<void>;
  categories: Category[];
  bill?: RecurringBill | null;
}

export const RecurringBillModal: React.FC<RecurringBillModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  bill,
}) => {
  const [apiError, setApiError] = useState<string | null>(null);

  const activeCategories = categories.filter(c => !c.isArchived || c.id === bill?.categoryId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      name: bill?.name || '',
      amount: bill?.amount || 0,
      categoryId: bill?.categoryId || activeCategories[0]?.id || '',
      frequency: bill?.frequency || 'MONTHLY',
      nextDueDate: bill?.nextDueDate || new Date().toISOString().split('T')[0],
      notes: bill?.notes || '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      setApiError(null);
      reset({
        name: bill?.name || '',
        amount: bill?.amount || 0,
        categoryId: bill?.categoryId || activeCategories[0]?.id || '',
        frequency: bill?.frequency || 'MONTHLY',
        nextDueDate: bill?.nextDueDate || new Date().toISOString().split('T')[0],
        notes: bill?.notes || '',
      });
    }
  }, [isOpen, bill, reset]);

  const onFormSubmit = async (data: BillFormData) => {
    try {
      setApiError(null);
      await onSubmit(data, bill?.id);
      reset();
      onClose();
    } catch (err: any) {
      setApiError(err?.response?.data?.message || err.message || 'Failed to save recurring bill');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bill ? 'Edit Recurring Bill' : 'Create Recurring Bill'}
      description="Track predictable recurring bills (rent, WiFi, subscriptions, EMI). Generates reminders without creating duplicate expenses."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {apiError && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
            {apiError}
          </div>
        )}

        <Input
          label="Bill / Subscription Name"
          placeholder="e.g. Apartment Rent, Netflix, ACT Broadband"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            placeholder="1500.00"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <Select
            label="Category"
            error={errors.categoryId?.message}
            options={activeCategories.map(c => ({ value: c.id, label: c.name }))}
            {...register('categoryId')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Billing Frequency"
            error={errors.frequency?.message}
            options={[
              { value: 'MONTHLY', label: 'Monthly' },
              { value: 'QUARTERLY', label: 'Quarterly (Every 3 months)' },
              { value: 'YEARLY', label: 'Yearly' },
              { value: 'WEEKLY', label: 'Weekly' },
            ]}
            {...register('frequency')}
          />

          <Input
            label="Next Due Date"
            type="date"
            error={errors.nextDueDate?.message}
            {...register('nextDueDate')}
          />
        </div>

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Due by 5th of each month"
          error={errors.notes?.message}
          {...register('notes')}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {bill ? 'Save Changes' : 'Save Bill'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

