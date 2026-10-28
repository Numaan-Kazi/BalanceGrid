import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { formatDate } from '../../lib/formatters';
import { Account, BucketPlan, Expense } from '../../types';
import { api } from '../../lib/api';
import { Plus, Trash2, Tag, Loader2 } from 'lucide-react';

const expenseFormSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  refundAmount: z.coerce.number().min(0, 'Refund cannot be negative').default(0),
  date: z.string().min(1, 'Date is required'),
  accountId: z.string().min(1, 'Account is required'),
  description: z.string().optional(),
  bucketPlanId: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface DetailedExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyPeriodId: string;
  categoryId: string;
  categoryName: string;
  weekNumber: number;
  weekLabel: string;
  startDate: string;
  endDate: string;
  accounts: Account[];
  bucketPlans: BucketPlan[];
  onExpensesChanged: () => void;
}

export const DetailedExpensesModal: React.FC<DetailedExpensesModalProps> = ({
  isOpen,
  onClose,
  monthlyPeriodId,
  categoryId,
  categoryName,
  weekNumber,
  weekLabel,
  startDate,
  endDate,
  accounts,
  bucketPlans,
  onExpensesChanged,
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const activeAccounts = accounts.filter(a => a.isActive);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: 0,
      refundAmount: 0,
      date: startDate,
      accountId: activeAccounts[0]?.id || '',
      description: '',
      bucketPlanId: '',
    },
  });

  const loadExpenses = async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const res = await api.get<{ expenses: Expense[] }>(
        `/expenses/detailed?monthlyPeriodId=${monthlyPeriodId}&categoryId=${categoryId}&weekNumber=${weekNumber}`
      );
      setExpenses(res.expenses || []);
    } catch (err) {
      console.error('Failed to load detailed expenses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadExpenses();
      reset({
        amount: 0,
        refundAmount: 0,
        date: startDate,
        accountId: activeAccounts[0]?.id || '',
        description: '',
        bucketPlanId: '',
      });
      setIsAdding(false);
    }
  }, [isOpen, categoryId, weekNumber]);

  const onAddExpense = async (data: ExpenseFormData) => {
    await api.post('/expenses/detailed', {
      accountId: data.accountId,
      categoryId,
      monthlyPeriodId,
      amount: data.amount,
      refundAmount: data.refundAmount || 0,
      date: data.date,
      description: data.description,
      bucketPlanId: data.bucketPlanId ? data.bucketPlanId : null,
    });
    reset({
      amount: 0,
      refundAmount: 0,
      date: startDate,
      accountId: activeAccounts[0]?.id || '',
      description: '',
      bucketPlanId: '',
    });
    setIsAdding(false);
    await loadExpenses();
    onExpensesChanged();
  };

  const onDeleteExpense = async (id: string) => {
    await api.delete(`/expenses/detailed/${id}`);
    await loadExpenses();
    onExpensesChanged();
  };

  const totalNet = expenses.reduce(
    (acc, e) => acc + (Number(e.amount) - Number(e.refundAmount || 0)),
    0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${categoryName} — Detailed Entries`}
      description={`${weekLabel} (${startDate} to ${endDate})`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Total for this week */}
        <div className="flex items-center justify-between p-3 bg-brand-50 rounded-lg border border-brand-100">
          <div>
            <span className="text-xs font-semibold text-brand-900 block">Category-Week Net Total</span>
            <span className="text-[11px] text-brand-700">Calculated from individual detailed entries</span>
          </div>
          <CurrencyDisplay amount={totalNet} size="xl" className="text-brand-900" />
        </div>

        {/* Existing expenses list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase text-content-secondary tracking-wider">
              Recorded Entries ({expenses.length})
            </h4>
            {!isAdding && (
              <Button size="sm" variant="subtle" onClick={() => setIsAdding(true)}>
                <Plus className="w-3.5 h-3.5" />
                Add Entry
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-4 text-center bg-surface-muted rounded-lg border border-dashed border-surface-border text-xs text-content-secondary">
              No detailed expenses recorded for this week yet.
            </div>
          ) : (
            <div className="divide-y divide-surface-border border border-surface-border rounded-lg max-h-56 overflow-y-auto">
              {expenses.map(e => {
                const net = Number(e.amount) - Number(e.refundAmount || 0);
                return (
                  <div key={e.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-content-primary">
                          {e.description || 'Expense'}
                        </span>
                        {e.bucketPlan && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-sky-50 text-sky-700 border border-sky-200">
                            <Tag className="w-2.5 h-2.5" />
                            {e.bucketPlan.name}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-content-secondary flex items-center gap-2 mt-0.5">
                        <span>{formatDate(e.date)}</span>
                        <span>•</span>
                        <span>{e.account?.name || 'Account'}</span>
                        {Number(e.refundAmount) > 0 && (
                          <span className="text-emerald-600 font-medium">
                            (Refund: ₹{e.refundAmount})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <CurrencyDisplay amount={net} size="sm" />
                      <button
                        onClick={() => onDeleteExpense(e.id)}
                        className="text-content-secondary hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Entry Form */}
        {isAdding && (
          <form onSubmit={handleSubmit(onAddExpense)} className="p-4 bg-surface-muted border border-surface-border rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-surface-border pb-2">
              <span className="text-xs font-semibold text-content-primary">New Detailed Entry</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-content-secondary hover:text-content-primary"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Amount (₹)"
                type="number"
                step="0.01"
                placeholder="0.00"
                error={errors.amount?.message}
                {...register('amount')}
              />

              <Input
                label="Refund (₹)"
                type="number"
                step="0.01"
                placeholder="0.00"
                error={errors.refundAmount?.message}
                {...register('refundAmount')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Date"
                type="date"
                min={startDate}
                max={endDate}
                error={errors.date?.message}
                {...register('date')}
              />

              <Select
                label="Paid from Account"
                error={errors.accountId?.message}
                options={activeAccounts.map(a => ({ value: a.id, label: a.name }))}
                {...register('accountId')}
              />
            </div>

            <Input
              label="Description (Optional)"
              placeholder="e.g. Milk & Eggs, Uber to office"
              error={errors.description?.message}
              {...register('description')}
            />

            {bucketPlans.length > 0 && (
              <Select
                label="Link to Bucket List Plan (Optional)"
                error={errors.bucketPlanId?.message}
                options={[
                  { value: '', label: 'None (Regular Expense)' },
                  ...bucketPlans.map(p => ({ value: p.id, label: p.name })),
                ]}
                {...register('bucketPlanId')}
              />
            )}

            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" isLoading={isSubmitting}>
                Save Entry
              </Button>
            </div>
          </form>
        )}

        <div className="flex justify-end pt-3 border-t border-surface-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};

