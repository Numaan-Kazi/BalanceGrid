import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { AdditionalSavings } from '../../types';

const additionalSavingsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

export type AdditionalSavingsFormData = z.infer<typeof additionalSavingsSchema>;

interface AdditionalSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AdditionalSavingsFormData, id?: string) => Promise<void>;
  initialData?: AdditionalSavings | null;
}

export const AdditionalSavingsModal: React.FC<AdditionalSavingsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AdditionalSavingsFormData>({
    resolver: zodResolver(additionalSavingsSchema),
    defaultValues: {
      title: initialData?.title || '',
      amount: initialData?.amount || 0,
      date: initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0],
      notes: initialData?.notes || '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      setApiError(null);
      reset({
        title: initialData?.title || '',
        amount: initialData?.amount || 0,
        date: initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: initialData?.notes || '',
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = async (data: AdditionalSavingsFormData) => {
    try {
      setApiError(null);
      await onSubmit(data, initialData?.id);
      reset();
      onClose();
    } catch (err: any) {
      setApiError(err?.response?.data?.message || err.message || 'Failed to save additional savings');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Additional Savings' : 'Add Additional Savings'}
      description="Record external deposits, windfall investments, fixed deposits, or standalone savings outside monthly cycles."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {apiError && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
            {apiError}
          </div>
        )}

        <Input
          label="Title / Description"
          placeholder="e.g. Fixed Deposit, Bonus allocation, Gold investment"
          error={errors.title?.message}
          {...register('title')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            placeholder="10000.00"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <Input
            label="Date"
            type="date"
            error={errors.date?.message}
            {...register('date')}
          />
        </div>

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Maturity date, account details"
          error={errors.notes?.message}
          {...register('notes')}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {initialData ? 'Update Savings' : 'Record Savings'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

