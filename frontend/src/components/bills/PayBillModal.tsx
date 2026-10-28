import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { RecurringBill, MonthlyTrackerResponse } from '../../types';
import { api } from '../../lib/api';
import { AlertCircle, Calendar } from 'lucide-react';

interface PayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (billId: string, data: { paidDate: string; amount: number }) => Promise<void>;
  bill: RecurringBill | null;
}

export const PayBillModal: React.FC<PayBillModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  bill,
}) => {
  const [paidDate, setPaidDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amountStr, setAmountStr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Derive target month and year from selected paid date
  const parsedDate = new Date(paidDate);
  const targetYear = isNaN(parsedDate.getTime()) ? new Date().getFullYear() : parsedDate.getFullYear();
  const targetMonth = isNaN(parsedDate.getTime()) ? new Date().getMonth() + 1 : parsedDate.getMonth() + 1;

  // Query monthly tracker balance for the target month
  const { data: trackerData } = useQuery<MonthlyTrackerResponse>({
    queryKey: ['monthlyTracker', targetYear, targetMonth],
    queryFn: () => api.get(`/monthly?year=${targetYear}&month=${targetMonth}`),
    enabled: isOpen,
  });

  const availableMonthlyBalance = trackerData?.summary.remainingBalance ?? 0;
  const numAmount = parseFloat(amountStr) || 0;

  useEffect(() => {
    if (bill && isOpen) {
      setApiError(null);
      setPaidDate(new Date().toISOString().split('T')[0]);
      setAmountStr(bill.amount.toString());
    }
  }, [bill, isOpen]);

  if (!bill) return null;

  const isInsufficient = numAmount > availableMonthlyBalance;
  const availFormatted = availableMonthlyBalance.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
  const reqFormatted = numAmount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });

  const insufficientMessage = `Insufficient monthly balance. Your available balance is ₹${availFormatted}, but this bill requires ₹${reqFormatted}.`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidDate) {
      setApiError('Valid payment date is required.');
      return;
    }
    if (numAmount <= 0) {
      setApiError('Bill amount must be positive.');
      return;
    }
    if (isInsufficient) {
      setApiError(insufficientMessage);
      return;
    }

    try {
      setIsSubmitting(true);
      setApiError(null);
      await onSubmit(bill.id, {
        paidDate,
        amount: numAmount,
      });
      onClose();
    } catch (err: any) {
      setApiError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mark Bill Paid — ${bill.name}`}
      description="Deducts this bill payment directly from your selected month's available balance and advances the bill's next due date."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>{apiError}</div>
          </div>
        )}

        {/* Monthly Available Balance Banner */}
        <div className="p-3.5 rounded-lg bg-surface-muted border border-surface-border flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider block">
              Available Monthly Balance ({targetMonth}/{targetYear})
            </span>
            <CurrencyDisplay
              amount={availableMonthlyBalance}
              size="lg"
              colored
              showSign={false}
              className="mt-0.5"
            />
          </div>
          <span className="text-[11px] text-content-secondary text-right max-w-[180px]">
            Deducts directly from month&apos;s available budget
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount Paid (₹)"
            type="number"
            step="any"
            min="0.01"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="1200.00"
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-content-secondary uppercase tracking-wider">
              Payment Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="flex h-9 w-full rounded-md border border-surface-border bg-white px-3 py-1 text-sm text-content-primary transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  input?.showPicker?.();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary pointer-events-none"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {isInsufficient && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>{insufficientMessage}</div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            disabled={isInsufficient || numAmount <= 0}
          >
            Confirm Payment & Deduct from Month
          </Button>
        </div>
      </form>
    </Modal>
  );
};
