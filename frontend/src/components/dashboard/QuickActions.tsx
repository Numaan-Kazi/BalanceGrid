import React from 'react';
import { Compass, ReceiptText } from 'lucide-react';
import { Button } from '../ui/Button';

interface QuickActionsProps {
  onAddExpense: () => void;
  onAddBucketPlan: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddExpense,
  onAddBucketPlan,
}) => {
  return (
    <div className="bg-white rounded-lg border border-surface-border p-4 shadow-xs">
      <h3 className="text-xs font-bold uppercase text-content-secondary tracking-wider mb-3">
        Quick Financial Actions
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddExpense}
          className="flex items-center justify-center gap-2 py-3 px-4 hover:border-amber-300 hover:bg-amber-50/50"
        >
          <ReceiptText className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-medium">Record Expense in Tracker</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onAddBucketPlan}
          className="flex items-center justify-center gap-2 py-3 px-4 hover:border-sky-300 hover:bg-sky-50/50"
        >
          <Compass className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="text-xs font-medium">New Bucket Plan</span>
        </Button>
      </div>
    </div>
  );
};
