import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Account } from '../../types';

const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, 'Source account is required'),
    toAccountId: z.string().min(1, 'Destination account is required'),
    amount: z.coerce.number().positive('Transfer amount must be greater than zero'),
    date: z.string().min(1, 'Date is required'),
    description: z.string().optional(),
  })
  .refine(data => data.fromAccountId !== data.toAccountId, {
    message: 'Source and destination accounts must be different',
    path: ['toAccountId'],
  });

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransferFormData) => Promise<void>;
  accounts: Account[];
}

export const TransferModal: React.FC<TransferModalProps> = ({
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
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccountId: activeAccounts[0]?.id || '',
      toAccountId: activeAccounts[1]?.id || '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
    },
  });

  const onFormSubmit = async (data: TransferFormData) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  const accountOptions = activeAccounts.map(a => ({
    value: a.id,
    label: `${a.name} (Balance: ₹${a.currentBalance})`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Money Between Accounts"
      description="Atomic transfer between your accounts. Transfers do not affect income or expense totals."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <Select
          label="From Account (Source)"
          error={errors.fromAccountId?.message}
          options={accountOptions}
          {...register('fromAccountId')}
        />

        <Select
          label="To Account (Destination)"
          error={errors.toAccountId?.message}
          options={accountOptions}
          {...register('toAccountId')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <Input
            label="Transfer Date"
            type="date"
            error={errors.date?.message}
            {...register('date')}
          />
        </div>

        <Input
          label="Notes / Description (Optional)"
          placeholder="e.g. ATM withdrawal, moving to emergency fund"
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Complete Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
};

