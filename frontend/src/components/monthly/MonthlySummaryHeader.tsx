import React from 'react';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { Card, CardContent } from '../ui/Card';
import { MonthlyTrackerResponse } from '../../types';
import { Wallet, ArrowDownRight, Scale } from 'lucide-react';

interface MonthlySummaryHeaderProps {
  summary: MonthlyTrackerResponse['summary'];
  onOpenBudgetModal?: () => void;
}

export const MonthlySummaryHeader: React.FC<MonthlySummaryHeaderProps> = ({
  summary,
}) => {
  const totalBalanceAdded = summary.totalBalanceAdded ?? (summary.startingBalance + summary.actualIncome);
  const usageThisMonth = summary.usageThisMonth ?? summary.netExpenses;
  const remainingBalance = summary.remainingBalance ?? (totalBalanceAdded - usageThisMonth);

  return (
    <Card className="border border-surface-border bg-white shadow-xs">
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-surface-border">
          {/* 1. Total Balance Added This Month */}
          <div className="flex flex-col justify-between pt-2 sm:pt-0 sm:pr-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary uppercase tracking-wider mb-1">
              <Wallet className="w-3.5 h-3.5 text-brand-600" />
              <span>Total Balance Added This Month</span>
            </div>
            <CurrencyDisplay amount={totalBalanceAdded} size="xl" />
            <span className="text-[11px] text-content-muted mt-1">
              Starting balance (₹{summary.startingBalance}) + Income (₹{summary.actualIncome})
            </span>
          </div>

          {/* 2. Usage This Month */}
          <div className="flex flex-col justify-between pt-3 sm:pt-0 sm:px-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary uppercase tracking-wider mb-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
              <span>Usage This Month</span>
            </div>
            <CurrencyDisplay amount={usageThisMonth} size="xl" className="text-amber-600" />
            <span className="text-[11px] text-content-muted mt-1">
              Actual expenses counted once (net after refunds)
            </span>
          </div>

          {/* 3. Remaining Balance */}
          <div className="flex flex-col justify-between pt-3 sm:pt-0 sm:pl-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary uppercase tracking-wider mb-1">
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              <span>Remaining Balance</span>
            </div>
            <CurrencyDisplay
              amount={remainingBalance}
              size="xl"
              colored
              showSign={false}
            />
            <span className="text-[11px] text-content-muted mt-1">
              Total balance added − Usage this month
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
