import { toast } from 'sonner';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { SavingsGoal, SavingsSummary } from '../../types';
import { api } from '../../lib/api';
import { AlertCircle, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';

interface AllocateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { savingsGoalId: string; amount: number; date: string; notes?: string }) => Promise<void>;
  goals: SavingsGoal[];
  preselectedGoalId?: string;
}

export const AllocateModal: React.FC<AllocateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  goals,
  preselectedGoalId,
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Fetch authoritative overall savings
  const { data: savingsSummary } = useQuery<SavingsSummary>({
    queryKey: ['savingsSummary'],
    queryFn: () => api.get('/accounts/savings-summary'),
    enabled: isOpen,
  });

  const availableOverallSavings = savingsSummary?.overallTotalSavings ?? 0;

  // Filter goals that are not completed
  const eligibleGoals = goals.filter(g => !g.isCompleted && g.remainingNeeded > 0);

  // Form state
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [allocationDate, setAllocationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setApiError(null);
      setSuccessMessage(null);
      setAmountStr('');
      setNotes('');
      setAllocationDate(new Date().toISOString().split('T')[0]);
      const initialGoalId = preselectedGoalId || eligibleGoals[0]?.id || goals[0]?.id || '';
      setSelectedGoalId(initialGoalId);
    }
  }, [isOpen, preselectedGoalId]);

  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const remainingGoalNeeded = selectedGoal ? Math.max(0, selectedGoal.remainingNeeded) : 0;
  const numAmount = parseFloat(amountStr) || 0;

  // Validation logic
  let validationError: string | null = null;
  if (availableOverallSavings <= 0) {
    validationError = "You don't have any savings available to allocate.";
  } else if (numAmount > availableOverallSavings) {
    validationError = `Insufficient savings. You can allocate up to ₹${availableOverallSavings.toFixed(2)}.`;
  } else if (selectedGoal && numAmount > remainingGoalNeeded) {
    validationError = `Allocation amount cannot exceed remaining goal target of ₹${remainingGoalNeeded.toFixed(2)}.`;
  } else if (selectedGoal?.isCompleted) {
    validationError = 'This savings goal target has already been reached.';
  }

  const handleGoalChange = (newGoalId: string) => {
    setSelectedGoalId(newGoalId);
    setApiError(null);
  };

  const handleMaxClick = () => {
    const maxPossible = Math.min(availableOverallSavings, remainingGoalNeeded);
    if (maxPossible > 0) {
      setAmountStr(maxPossible.toString());
      setApiError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId) {
      setApiError('Please select a savings goal.');
      return;
    }
    if (numAmount <= 0) {
      setApiError('Allocation amount must be greater than zero.');
      return;
    }
    if (!allocationDate) {
      setApiError('Valid allocation date is required.');
      return;
    }
    if (validationError) {
      setApiError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setApiError(null);
      await onSubmit({
        savingsGoalId: selectedGoalId,
        amount: numAmount,
        date: allocationDate,
        notes: notes.trim() || undefined,
      });

      toast.success(`Successfully allocated ₹${numAmount.toFixed(2)} to ${selectedGoal?.name}!`);
      setSuccessMessage(`Successfully allocated ₹${numAmount.toFixed(2)} to ${selectedGoal?.name}!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setApiError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to record allocation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Allocate Savings to Goal"
      description="Deduct savings directly from your authoritative Overall Savings to fund your goal target."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* API Error Alert */}
        {apiError && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>{apiError}</div>
          </div>
        )}

        {/* Authoritative Overall Savings Available */}
        <div className="p-3.5 rounded-lg bg-surface-muted border border-surface-border flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Available Overall Savings
            </span>
            <CurrencyDisplay
              amount={availableOverallSavings}
              size="lg"
              className="mt-0.5 font-bold text-brand-700"
            />
          </div>
          <span className="text-[11px] text-content-secondary text-right max-w-[170px]">
            Deducts atomically from your overall accumulated savings
          </span>
        </div>

        {/* Goal Selector */}
        <Select
          label="Savings Goal"
          value={selectedGoalId}
          onChange={(e) => handleGoalChange(e.target.value)}
          options={goals.map(g => ({
            value: g.id,
            label: `${g.name} (Remaining Target: ₹${Math.max(0, g.remainingNeeded).toFixed(2)})${
              g.isCompleted || g.remainingNeeded <= 0 ? ' — Reached' : ''
            }`,
          }))}
        />

        {/* Amount & Date Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-content-secondary uppercase tracking-wider">
                Amount (₹)
              </label>
              {availableOverallSavings > 0 && remainingGoalNeeded > 0 && (
                <button
                  type="button"
                  onClick={handleMaxClick}
                  className="text-[11px] font-semibold text-brand-600 hover:underline"
                >
                  Max ₹{Math.min(availableOverallSavings, remainingGoalNeeded).toFixed(0)}
                </button>
              )}
            </div>
            <Input
              type="number"
              step="any"
              min="0.01"
              placeholder="e.g. 500.00"
              value={amountStr}
              onChange={(e) => {
                setAmountStr(e.target.value);
                setApiError(null);
              }}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-content-secondary uppercase tracking-wider">
              Allocation Date
            </label>
            <div className="relative">
              <input
                ref={dateInputRef}
                type="date"
                value={allocationDate}
                onChange={(e) => setAllocationDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="flex h-9 w-full rounded-md border border-surface-border bg-white px-3 py-1 text-sm text-content-primary transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => dateInputRef.current?.showPicker?.()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary pointer-events-none"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Inline Validation Warning */}
        {validationError && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>{validationError}</div>
          </div>
        )}

        {/* Notes Input */}
        <Input
          label="Notes (Optional)"
          placeholder="e.g. October surplus allocation"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            disabled={
              Boolean(validationError) ||
              numAmount <= 0 ||
              availableOverallSavings <= 0 ||
              Boolean(successMessage)
            }
          >
            Allocate from Overall Savings
          </Button>
        </div>
      </form>
    </Modal>
  );
};
