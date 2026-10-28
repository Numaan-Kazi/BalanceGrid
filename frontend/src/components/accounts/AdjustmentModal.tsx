import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Account } from '../../types';

const adjustmentSchema = z.object({
  accountId: z.string().min(1),
  amount: z.coerce.number().refine(val => val !== 0, 'Adjustment amount cannot be zero'),
  date: z.string().min(1, 'Date is required'),
  reason: z.string().min(1, 'Reason is required for audit history'),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AdjustmentFormData) => Promise<void>;
  account: Account | null;
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  account,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      accountId: account?.id || '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      reason: '',
    },
  });

  React.useEffect(() => {
    if (account) {
      reset({
        accountId: account.id,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        reason: '',
      });
    }
  }, [account, reset]);

  if (!account) return null;

  const onFormSubmit = async (data: AdjustmentFormData) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Balance Adjustment — ${account.name}`}
      description="Record an audit adjustment to reconcile bank interest, bank charges, or discrepancy correction."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <input type="hidden" {...register('accountId')} />

        <div className="bg-surface-muted rounded-md p-3 text-xs text-content-secondary space-y-1">
          <p>
            Current Balance: <strong className="text-content-primary">₹{account.currentBalance}</strong>
          </p>
          <p>Use positive values to increase balance (e.g. 150 for interest), or negative to decrease (e.g. -50 for fees).</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Adjustment Amount (₹)"
            type="number"
            step="0.01"
            placeholder="+100 or -50"
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
          label="Reason for Adjustment"
          placeholder="e.g. Quarterly savings account interest credit"
          error={errors.reason?.message}
          {...register('reason')}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Apply Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};

