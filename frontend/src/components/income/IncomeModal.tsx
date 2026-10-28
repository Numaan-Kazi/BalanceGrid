import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Account } from '../../types';

const incomeSchema = z.object({
  accountId: z.string().min(1, 'Destination account is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  source: z.string().min(1, 'Income source is required'),
  description: z.string().optional(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IncomeFormData) => Promise<void>;
  accounts: Account[];
}

export const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accounts,
}) => {
  const activeAccounts = accounts.filter(a => a.isActive);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      accountId: activeAccounts[0]?.id || '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      source: 'Salary',
      description: '',
    },
  });

  const onFormSubmit = async (data: IncomeFormData) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Received Income"
      description="Record actual earnings received. Only received income contributes to your earnings and account balance."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <Select
          label="Deposit Into Account"
          error={errors.accountId?.message}
          options={activeAccounts.map(a => ({
            value: a.id,
            label: `${a.name} (Current: ₹${a.currentBalance})`,
          }))}
          {...register('accountId')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            placeholder="50000.00"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <Input
            label="Received Date"
            type="date"
            error={errors.date?.message}
            {...register('date')}
          />
        </div>

        <Input
          label="Income Source"
          placeholder="e.g. Salary, Freelance project, Dividend, Gift"
          error={errors.source?.message}
          {...register('source')}
        />

        <Input
          label="Description (Optional)"
          placeholder="e.g. Monthly salary from employer"
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Record Income
          </Button>
        </div>
      </form>
    </Modal>
  );
};

