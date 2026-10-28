import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Compass, Plus, Loader2 } from 'lucide-react';
import { BucketPlan, Category, Account } from '@/types';
import { api } from '@/lib/api';
import {
  isPlanExecuted,
  executeBucketPlan,
  unexecuteBucketPlan,
  onExecutedBucketPlansChange,
} from '@/lib/bucketExecution';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { EmptyState } from '@/components/common/EmptyState';
import { BucketPlanCard } from '@/components/bucketList/BucketPlanCard';
import { BucketPlanModal } from '@/components/bucketList/BucketPlanModal';
import { BucketExpenseModal, BucketExpenseFormData } from '@/components/bucketList/BucketExpenseModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export const BucketListPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BucketPlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  // Expense modal states
  const [expensePlan, setExpensePlan] = useState<BucketPlan | null>(null);
  const [editingExpense, setEditingExpense] = useState<{
    id: string;
    amount: number;
    description: string | null;
    date: string;
    categoryId?: string;
    accountId?: string;
  } | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [executingPlan, setExecutingPlan] = useState<BucketPlan | null>(null);
  const [, setExecutedUpdateTick] = useState(0);

  useEffect(() => {
    return onExecutedBucketPlansChange(() => {
      setExecutedUpdateTick(t => t + 1);
    });
  }, []);

  const { data, isLoading } = useQuery<{ plans: BucketPlan[] }>({
    queryKey: ['bucketPlans'],
    queryFn: () => api.get('/bucket-plans'),
  });

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const { data: accountsData } = useQuery<{ accounts: Account[] }>({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['bucketPlans'] });
    queryClient.invalidateQueries({ queryKey: ['monthlyTracker'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['savingsSummary'] });
    queryClient.invalidateQueries({ queryKey: ['reportMonthly'] });
    queryClient.invalidateQueries({ queryKey: ['reportYearly'] });
  };

  const createPlanMutation = useMutation({
    mutationFn: (newPlan: any) => api.post('/bucket-plans', newPlan),
    onSuccess: invalidate,
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/bucket-plans/${id}`, data),
    onSuccess: invalidate,
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bucket-plans/${id}`),
    onSuccess: invalidate,
  });

  const unlinkExpenseMutation = useMutation({
    mutationFn: (expenseId: string) =>
      api.post('/bucket-plans/link-expense', { expenseId, bucketPlanId: null }),
    onSuccess: invalidate,
  });

  const addExpenseMutation = useMutation({
    mutationFn: (data: any) => api.post('/bucket-plans/expense', data),
    onSuccess: invalidate,
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/expenses/detailed/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => api.delete(`/expenses/detailed/${expenseId}`),
    onSuccess: invalidate,
  });

  const plans = data?.plans || [];
  const totalBudget = plans.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = plans.reduce((sum, p) => sum + p.totalSpent, 0);
  const totalRemaining = plans.reduce((sum, p) => sum + p.remainingBudget, 0);
  const overBudgetPlans = plans.filter(p => p.isOverBudget || p.remainingBudget < 0);

  return (
    <div className="space-y-6">
      <Topbar
        title="Bucket List & Plans"
        subtitle="Organize trips, life experiences, and major purchases with linked actual spending"
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditingPlan(null);
              setIsPlanModalOpen(true);
            }}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Bucket Plan
          </Button>
        }
      />

      <div className="px-4 sm:px-8 space-y-6 w-full">
        {/* Summary Card */}
        <div className="bg-white rounded-lg border border-surface-border p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-surface-border">
          <div>
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider block">
              Total Plans Budget
            </span>
            <CurrencyDisplay amount={totalBudget} size="xl" className="mt-1" />
            <p className="text-[11px] text-content-secondary mt-0.5">Across {plans.length} bucket items</p>
          </div>

          <div className="pt-3 sm:pt-0 sm:px-4">
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider block">
              Actual Spending Linked
            </span>
            <CurrencyDisplay amount={totalSpent} size="xl" className="mt-1 text-amber-600" />
            <p className="text-[11px] text-content-secondary mt-0.5">
              {overBudgetPlans.length > 0
                ? `${overBudgetPlans.length} plan(s) over budget`
                : 'Real expenses linked to plans'}
            </p>
          </div>

          <div className="pt-3 sm:pt-0 sm:pl-4">
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider block">
              Remaining Budget
            </span>
            <CurrencyDisplay amount={totalRemaining} size="xl" className="mt-1" colored showSign={false} />
            <p className="text-[11px] text-content-secondary mt-0.5">Remaining estimated budget</p>
          </div>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No Bucket List Plans Yet"
            description="Create future destinations or projects with estimated budgets. Real expenses can be linked as you spend."
            actionText="Create First Plan"
            onAction={() => {
              setEditingPlan(null);
              setIsPlanModalOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(p => (
              <BucketPlanCard
                key={p.id}
                plan={p}
                isExecuted={isPlanExecuted(p.id)}
                onEdit={plan => {
                  setEditingPlan(plan);
                  setIsPlanModalOpen(true);
                }}
                onDelete={planId => setDeletingPlanId(planId)}
                onAddExpense={plan => {
                  setEditingExpense(null);
                  setExpensePlan(plan);
                }}
                onEditExpense={(plan, expense) => {
                  setExpensePlan(plan);
                  setEditingExpense(expense);
                }}
                onDeleteExpense={expenseId => setDeletingExpenseId(expenseId)}
                onUnlinkExpense={async expenseId => {
                  await unlinkExpenseMutation.mutateAsync(expenseId);
                }}
                onExecute={plan => setExecutingPlan(plan)}
                onUnexecute={planId => {
                  unexecuteBucketPlan(planId);
                  invalidate();
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Plan Modal */}
      <BucketPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setEditingPlan(null);
        }}
        initialData={editingPlan}
        onSubmit={async data => {
          if (editingPlan) {
            await updatePlanMutation.mutateAsync({ id: editingPlan.id, data });
          } else {
            await createPlanMutation.mutateAsync(data);
          }
        }}
      />

      {/* Direct Expense Modal for Bucket Plan */}
      <BucketExpenseModal
        isOpen={Boolean(expensePlan)}
        onClose={() => {
          setExpensePlan(null);
          setEditingExpense(null);
        }}
        plan={expensePlan}
        accounts={accountsData?.accounts || []}
        categories={categoriesData?.categories || []}
        initialExpense={editingExpense}
        onSubmit={async (data: BucketExpenseFormData, expenseId?: string) => {
          if (expenseId) {
            await updateExpenseMutation.mutateAsync({
              id: expenseId,
              data: {
                description: data.description,
                amount: data.amount,
                date: data.date,
                categoryId: data.categoryId,
                accountId: data.accountId,
              },
            });
          } else if (expensePlan) {
            await addExpenseMutation.mutateAsync({
              bucketPlanId: expensePlan.id,
              ...data,
            });
          }
        }}
      />

      {/* Delete Plan Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingPlanId)}
        onClose={() => setDeletingPlanId(null)}
        title="Delete Bucket List Plan?"
        message="Deleting this plan will safely unlink all linked expenses without deleting them from your financial transaction history."
        confirmText="Delete Plan"
        variant="destructive"
        onConfirm={async () => {
          if (deletingPlanId) {
            await deletePlanMutation.mutateAsync(deletingPlanId);
            setDeletingPlanId(null);
          }
        }}
      />

      {/* Execute Plan Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(executingPlan)}
        onClose={() => setExecutingPlan(null)}
        title={`Finalize & Execute Plan — ${executingPlan?.name}?`}
        message={`Do you want to finalize this plan and deduct ₹${(
          executingPlan
            ? (executingPlan.totalSpent > 0 ? executingPlan.totalSpent : executingPlan.budget)
            : 0
        ).toLocaleString()} from your Overall Savings? This transaction will also be recorded in your Monthly Tracker and Reports.`}
        confirmText="Confirm & Deduct from Savings"
        variant="primary"
        onConfirm={async () => {
          if (executingPlan) {
            executeBucketPlan(executingPlan);
            try {
              await updatePlanMutation.mutateAsync({
                id: executingPlan.id,
                data: { status: 'COMPLETED' },
              });
            } catch (err) {
              console.error('Failed to update status on server:', err);
            }
            invalidate();
            setExecutingPlan(null);
          }
        }}
      />

      {/* Delete Expense Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingExpenseId)}
        onClose={() => setDeletingExpenseId(null)}
        title="Delete Expense Transaction?"
        message="This will permanently delete the expense transaction, restoring the deducted amount to your account balance and monthly tracker."
        confirmText="Delete Expense"
        variant="destructive"
        onConfirm={async () => {
          if (deletingExpenseId) {
            await deleteExpenseMutation.mutateAsync(deletingExpenseId);
            setDeletingExpenseId(null);
          }
        }}
      />
    </div>
  );
};

