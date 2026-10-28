import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Plus,
  Loader2,
  PiggyBank,
  Edit2,
  Trash2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { AdditionalSavings, SavingsSummary } from '@/types';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { AdditionalSavingsModal, AdditionalSavingsFormData } from '@/components/accounts/AdditionalSavingsModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatDate } from '@/lib/formatters';

export const AccountsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Additional savings state
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [editingSavings, setEditingSavings] = useState<AdditionalSavings | null>(null);
  const [deletingSavingsId, setDeletingSavingsId] = useState<string | null>(null);

  const { data: savingsSummary, isLoading: isLoadingSavings } = useQuery<SavingsSummary>({
    queryKey: ['savingsSummary'],
    queryFn: () => api.get('/accounts/savings-summary'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['savingsSummary'] });
    queryClient.invalidateQueries({ queryKey: ['monthlyTracker'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
  };

  const createSavingsMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounts/additional-savings', data),
    onSuccess: invalidate,
  });

  const updateSavingsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/accounts/additional-savings/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteSavingsMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/additional-savings/${id}`),
    onSuccess: invalidate,
  });

  const additionalSavingsList = savingsSummary?.additionalSavings || [];

  return (
    <div className="space-y-6">
      <Topbar
        title="Accounts & Monthly Savings"
        subtitle="Track your overall savings, finalized surplus, and standalone additional savings"
        // action={
        //   <Button
        //     size="sm"
        //     onClick={() => {
        //       setEditingSavings(null);
        //       setIsSavingsModalOpen(true);
        //     }}
        //     className="text-xs"
        //   >
        //     <Plus className="w-3.5 h-3.5 mr-1" />
        //     Add Additional Savings
        //   </Button>
        // }
      />

      <div className="px-4 sm:px-8 space-y-6 w-full">
        {/* Exactly Two Savings Cards: Overall Savings and Net Additional Savings */}
        <div className="bg-white rounded-lg border border-surface-border p-6 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-surface-border">
          <div>
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Overall Savings
            </span>
            <CurrencyDisplay
              amount={savingsSummary?.overallTotalSavings || 0}
              size="2xl"
              className="mt-1 font-bold text-brand-700"
            />
            <p className="text-[11px] text-content-secondary mt-1">
              Authoritative savings available for goal allocations and financial security
            </p>
          </div>

          <div className="pt-4 sm:pt-0 sm:pl-6">
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider block flex items-center gap-1.5">
              <PiggyBank className="w-3.5 h-3.5 text-indigo-600" /> Net Additional Savings
            </span>
            <CurrencyDisplay
              amount={savingsSummary?.netAdditionalSavings || 0}
              size="2xl"
              className="mt-1 text-indigo-600 font-bold"
            />
            <p className="text-[11px] text-content-secondary mt-1">
              Fixed deposits, windfalls, and standalone asset savings
            </p>
          </div>
        </div>

        {/* Additional Savings Management Section */}
        <div className="bg-white rounded-lg border border-surface-border p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-content-primary flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-brand-600" /> Additional Savings Entries
              </h3>
              <p className="text-xs text-content-secondary">
                Manage standalone fixed deposits, investments, and reserves outside the monthly tracker.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingSavings(null);
                setIsSavingsModalOpen(true);
              }}
              className="text-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Savings Entry
            </Button>
          </div>

          {isLoadingSavings ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-7 h-7 text-brand-600 animate-spin" />
            </div>
          ) : additionalSavingsList.length === 0 ? (
            <div className="text-center py-12 bg-surface-muted/50 rounded-lg border border-dashed border-surface-border">
              <PiggyBank className="w-10 h-10 text-content-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium text-content-primary">No additional savings recorded yet</p>
              <p className="text-xs text-content-secondary mt-1 max-w-sm mx-auto">
                Add fixed deposits, investments, or extra reserves to increase your authoritative Overall Savings.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingSavings(null);
                  setIsSavingsModalOpen(true);
                }}
                className="text-xs mt-3"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add First Savings Entry
              </Button>
            </div>
          ) : (
            <div className="border border-surface-border rounded-lg overflow-hidden divide-y divide-surface-border">
              {additionalSavingsList.map(item => (
                <div
                  key={item.id}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <span className="font-semibold text-content-primary truncate block text-sm">{item.title}</span>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-content-secondary">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-content-muted" /> {formatDate(item.date)}
                      </span>
                      {item.notes && <span>• {item.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CurrencyDisplay amount={item.amount} size="sm" className="font-bold text-indigo-700" />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingSavings(item);
                          setIsSavingsModalOpen(true);
                        }}
                        className="p-1.5 text-content-secondary hover:text-brand-600 rounded hover:bg-slate-100"
                        title="Edit Entry"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingSavingsId(item.id)}
                        className="p-1.5 text-content-secondary hover:text-rose-600 rounded hover:bg-rose-50"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Additional Savings Modal */}
      <AdditionalSavingsModal
        isOpen={isSavingsModalOpen}
        onClose={() => {
          setIsSavingsModalOpen(false);
          setEditingSavings(null);
        }}
        initialData={editingSavings}
        onSubmit={async (data: AdditionalSavingsFormData, id?: string) => {
          if (id) {
            await updateSavingsMutation.mutateAsync({ id, data });
          } else {
            await createSavingsMutation.mutateAsync(data);
          }
        }}
      />

      {/* Delete Additional Savings Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingSavingsId)}
        onClose={() => setDeletingSavingsId(null)}
        title="Delete Additional Savings Entry?"
        message="Are you sure you want to remove this savings entry? Your Overall Savings will be recalculated automatically."
        confirmText="Delete Entry"
        variant="destructive"
        onConfirm={async () => {
          if (deletingSavingsId) {
            await deleteSavingsMutation.mutateAsync(deletingSavingsId);
            setDeletingSavingsId(null);
          }
        }}
      />
    </div>
  );
};
