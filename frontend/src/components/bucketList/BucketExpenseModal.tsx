import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Category, BucketPlan } from '../../types';

const bucketExpenseSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  categoryId: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
});

export type BucketExpenseFormData = z.infer<typeof bucketExpenseSchema>;

interface BucketExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: BucketPlan | null;
  categories: Category[];
  initialExpense?: {
    id: string;
    amount: number;
    description: string | null;
    date: string;
    categoryId?: string;
  } | null;
  onSubmit: (data: BucketExpenseFormData, expenseId?: string) => Promise<void>;
}

export const BucketExpenseModal: React.FC<BucketExpenseModalProps> = ({
  isOpen,
  onClose,
  plan,
  categories,
  initialExpense,
  onSubmit,
}) => {
  const [apiError, setApiError] = useState<string | null>(null);

  const activeCategories = categories.filter(c => !c.isArchived || c.id === initialExpense?.categoryId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BucketExpenseFormData>({
    resolver: zodResolver(bucketExpenseSchema),
    defaultValues: {
      description: initialExpense?.description || '',
      amount: initialExpense?.amount || ('' as any),
      date: initialExpense?.date || new Date().toISOString().split('T')[0],
      categoryId: initialExpense?.categoryId || activeCategories[0]?.id || '',
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setApiError(null);
      reset({
        description: initialExpense?.description || '',
        amount: initialExpense?.amount || ('' as any),
        date: initialExpense?.date || new Date().toISOString().split('T')[0],
        categoryId: initialExpense?.categoryId || activeCategories[0]?.id || '',
        notes: '',
      });
    }
  }, [isOpen, initialExpense, reset]);

  if (!plan) return null;

  const onFormSubmit = async (data: BucketExpenseFormData) => {
    try {
      setApiError(null);
      await onSubmit(data, initialExpense?.id);
      reset();
      onClose();
    } catch (err: any) {
      setApiError(err?.response?.data?.error || err?.message || 'Failed to save expense');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialExpense ? 'Edit Plan Expense' : `Add Expense — ${plan.name}`}
      description="Records an expense against this bucket plan. Deducts strictly from this plan's allocated budget pool."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
          <span>
            <strong>Budget Pool Deduction:</strong> Expenses logged here deduct <em>strictly</em> from this plan&apos;s allocated budget pool. External accounts and Overall Savings will not be deducted until you finalize and execute the plan.
          </span>
        </div>

        {apiError && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
            {apiError}
          </div>
        )}

        <Input
          label="Expense Description"
          placeholder="e.g. Flight booking, Hotel reservation, Equipment"
          error={errors.description?.message}
          {...register('description')}
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
            label="Date"
            type="date"
            error={errors.date?.message}
            {...register('date')}
          />
        </div>

        <div>
          <Select
            label="Category"
            error={errors.categoryId?.message}
            options={activeCategories.map(c => ({ value: c.id, label: c.name }))}
            {...register('categoryId')}
          />
        </div>

        <Input
          label="Optional Notes"
          placeholder="e.g. Booking confirmation number, invoice notes"
          error={errors.notes?.message}
          {...register('notes')}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {initialExpense ? 'Update Expense' : 'Add Expense to Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
