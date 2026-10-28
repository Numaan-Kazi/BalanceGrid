import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Wallet } from 'lucide-react';

interface StartingBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStartingBalance: number;
  monthName: string;
  year: number;
  onSubmit: (startingBalance: number) => Promise<void>;
}

export const StartingBalanceModal: React.FC<StartingBalanceModalProps> = ({
  isOpen,
  onClose,
  currentStartingBalance,
  monthName,
  year,
  onSubmit,
}) => {
  const [val, setVal] = useState(currentStartingBalance.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setVal(currentStartingBalance.toString());
  }, [currentStartingBalance, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(num);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Initialize Starting Balance — ${monthName} ${year}`}
      description="Set your starting cash or bank balance for this month to track your monthly lifecycle and remaining budget."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Starting Balance (₹)"
          type="number"
          step="0.01"
          placeholder="e.g. 50000.00"
          value={val}
          onChange={e => setVal(e.target.value)}
          className="text-xs"
          autoFocus
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            <Wallet className="w-3.5 h-3.5 mr-1" />
            Save Starting Balance
          </Button>
        </div>
      </form>
    </Modal>
  );
};

