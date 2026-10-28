import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { Account, ExpenseMode } from '../../types';

interface ModeSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  weekLabel: string;
  currentMode: ExpenseMode;
  targetMode: ExpenseMode;
  summaryAmount: number;
  detailedTotal: number;
  detailedCount: number;
  accounts: Account[];
  onConfirm: (confirmConsolidate: boolean, accountId?: string) => Promise<void>;
}

export const ModeSwitchModal: React.FC<ModeSwitchModalProps> = ({
  isOpen,
  onClose,
  categoryName,
  weekLabel,
  currentMode,
  targetMode,
  summaryAmount,
  detailedTotal,
  detailedCount,
  accounts,
  onConfirm,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.filter(a => a.isActive)[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchingToSummary = targetMode === 'SUMMARY';

  const handleSwitch = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(true, selectedAccountId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Switch Expense Tracking Mode"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Context header */}
        <div className="p-3 bg-brand-50 rounded-md border border-brand-100 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-brand-900">{categoryName}</span>
            <span className="text-brand-700 ml-1">({weekLabel})</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono font-semibold text-brand-800">
            <span>{currentMode}</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-brand-600">{targetMode}</span>
          </div>
        </div>

        {/* Warning & Data Safeguard Explanation */}
        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-md border border-amber-200 text-amber-900 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Preventing Double Counting</p>
            {switchingToSummary ? (
              <p>
                You have <strong>{detailedCount}</strong> detailed transaction(s) totaling{' '}
                <strong>₹{detailedTotal}</strong>. Converting to Summary mode will consolidate them into a
                single weekly summary of <strong>₹{detailedTotal}</strong> and remove individual detailed entries
                so spending is never counted twice.
              </p>
            ) : (
              <p>
                You currently have a summary spending of <strong>₹{summaryAmount}</strong>. Converting to Detailed
                mode will create an initial detailed expense entry of <strong>₹{summaryAmount}</strong> and reset the
                summary amount so spending is preserved accurately.
              </p>
            )}
          </div>
        </div>

        {/* If converting summary -> detailed, require account selection */}
        {!switchingToSummary && summaryAmount > 0 && (
          <div className="space-y-1.5">
            <Select
              label="Account for converted detailed expense"
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              options={accounts
                .filter(a => a.isActive)
                .map(a => ({
                  value: a.id,
                  label: `${a.name} (₹${a.currentBalance})`,
                }))}
            />
            <p className="text-[11px] text-content-secondary">
              Select which account paid this converted spending.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSwitch} isLoading={isSubmitting}>
            Confirm Mode Conversion
          </Button>
        </div>
      </div>
    </Modal>
  );
};

