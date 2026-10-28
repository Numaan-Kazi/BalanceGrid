import { toast } from 'sonner';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Receipt, Plus, CheckCircle, Trash2, Loader2, Calendar, Edit2, AlertCircle, Clock } from 'lucide-react';
import { Category, RecurringBill } from '@/types';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import { RecurringBillModal, BillFormData } from '@/components/bills/RecurringBillModal';
import { PayBillModal } from '@/components/bills/PayBillModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export const RecurringBillsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [payingBill, setPayingBill] = useState<RecurringBill | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);

  const { data: billsData, isLoading } = useQuery<{ bills: RecurringBill[] }>({
    queryKey: ['recurringBills'],
    queryFn: () => api.get('/recurring-bills'),
  });

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['recurringBills'] });
    queryClient.invalidateQueries({ queryKey: ['monthlyTracker'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['savingsSummary'] });
  };

  const createBillMutation = useMutation({
    mutationFn: (newBill: any) => api.post('/recurring-bills', newBill),
    onSuccess: () => {
      invalidate();
      toast.success('Recurring bill created successfully');
    },
  });

  const updateBillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/recurring-bills/${id}`, data),
    onSuccess: () => {
      invalidate();
      toast.success('Recurring bill updated successfully');
    },
  });

  const payBillMutation = useMutation({
    mutationFn: ({ billId, data }: { billId: string; data: any }) =>
      api.post(`/recurring-bills/${billId}/pay`, data),
    onSuccess: () => {
      invalidate();
      toast.success('Bill marked as paid');
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/recurring-bills/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Recurring bill deleted successfully');
    },
  });

  const bills = billsData?.bills || [];
  const monthlyTotal = bills.reduce((sum, b) => {
    if (b.frequency === 'MONTHLY') return sum + b.amount;
    if (b.frequency === 'WEEKLY') return sum + b.amount * 4;
    if (b.frequency === 'QUARTERLY') return sum + b.amount / 3;
    if (b.frequency === 'YEARLY') return sum + b.amount / 12;
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <Topbar
        title="Recurring Bills & Subscriptions"
        subtitle="Manage predictable dues with atomic payment recording into your tracked accounts"
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditingBill(null);
              setIsBillModalOpen(true);
            }}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Recurring Bill
          </Button>
        }
      />

      <div className="px-4 sm:px-8 space-y-6 w-full">
        {/* Monthly Projection Banner */}
        <div className="bg-white rounded-lg border border-surface-border p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider block">
              Estimated Monthly Recurring Cost
            </span>
            <CurrencyDisplay amount={Math.round(monthlyTotal)} size="2xl" className="mt-1" />
            <p className="text-[11px] text-content-secondary mt-0.5">
              Normalized monthly estimate across all active bills
            </p>
          </div>

          <div className="text-xs text-content-secondary bg-surface-muted p-3 rounded-lg border border-surface-border max-w-md">
            Click <strong>Pay Bill</strong> to record the real expense in your monthly tracker and advance the due date. Dues are not double counted.
          </div>
        </div>

        {/* Bills Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : bills.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Recurring Bills Set Up"
            description="Add recurring bills such as rent, broadband, OTT subscriptions, or EMI to track due dates."
            actionText="Add First Bill"
            onAction={() => {
              setEditingBill(null);
              setIsBillModalOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bills.map(b => (
              <Card key={b.id} className="hover:border-brand-300 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-content-primary">{b.name}</h4>
                          {b.status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Paid
                            </span>
                          ) : b.status === 'OVERDUE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600" /> Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" /> Pending
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-content-secondary">
                          {b.categoryName} • {b.frequency}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingBill(b);
                          setIsBillModalOpen(true);
                        }}
                        disabled={b.isEditable === false}
                        className={`p-1.5 rounded-md ${
                          b.isEditable === false
                            ? 'text-content-secondary/30 cursor-not-allowed'
                            : 'text-content-secondary hover:text-brand-600 hover:bg-brand-50'
                        }`}
                        title={b.isEditable === false ? 'Paid bills cannot be edited' : 'Edit Bill'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingBillId(b.id)}
                        disabled={b.isDeletable === false}
                        className={`p-1.5 rounded-md ${
                          b.isDeletable === false
                            ? 'text-content-secondary/30 cursor-not-allowed'
                            : 'text-content-secondary hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title={b.isDeletable === false ? 'Paid bills cannot be deleted to preserve financial records' : 'Delete Bill'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-muted border border-surface-border mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-content-secondary block">Amount Due</span>
                      <CurrencyDisplay amount={b.amount} size="lg" />
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-content-secondary block flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" /> Due Date
                      </span>
                      <span className="text-xs font-semibold text-content-primary">
                        {b.displayDueDate || b.nextDueDate}
                      </span>
                      {b.lastPaidDate && b.status === 'PAID' && (
                        <span className="text-[10px] text-emerald-600 block mt-0.5">
                          Paid: {b.lastPaidDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {b.status === 'PAID' || b.canPay === false ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled
                      className="w-full text-xs font-semibold cursor-not-allowed opacity-80"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Paid for this cycle
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full text-xs font-semibold"
                      onClick={() => setPayingBill(b)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Pay Bill (Record Expense)
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bill Modal (Create / Edit) */}
      <RecurringBillModal
        isOpen={isBillModalOpen}
        onClose={() => {
          setIsBillModalOpen(false);
          setEditingBill(null);
        }}
        bill={editingBill}
        categories={categoriesData?.categories || []}
        onSubmit={async (data: BillFormData, id?: string) => {
          if (id) {
            await updateBillMutation.mutateAsync({ id, data });
          } else {
            await createBillMutation.mutateAsync(data);
          }
        }}
      />

      {/* Pay Bill Modal */}
      <PayBillModal
        isOpen={Boolean(payingBill)}
        onClose={() => setPayingBill(null)}
        bill={payingBill}
        onSubmit={async (billId, data) => {
          await payBillMutation.mutateAsync({ billId, data });
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingBillId)}
        onClose={() => setDeletingBillId(null)}
        title="Delete Recurring Bill?"
        message="Are you sure you want to delete this recurring bill? Unpaid bills will be removed, while all past payments remain intact in your financial history."
        confirmText="Delete Bill"
        variant="destructive"
        onConfirm={async () => {
          if (deletingBillId) {
            await deleteBillMutation.mutateAsync(deletingBillId);
            setDeletingBillId(null);
          }
        }}
      />
    </div>
  );
};

