import React, { useState, useEffect } from 'react';
import { Compass, Sparkles, Calendar, Layers, Tag } from 'lucide-react';
import { getExecutedPlansForPeriod, onExecutedBucketPlansChange, ExecutedBucketPlan } from '@/lib/bucketExecution';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/formatters';

interface ExecutedBucketPlansSectionProps {
  year: number;
  month: number;
}

export const ExecutedBucketPlansSection: React.FC<ExecutedBucketPlansSectionProps> = ({
  year,
  month,
}) => {
  const [executedPlans, setExecutedPlans] = useState<ExecutedBucketPlan[]>(() =>
    getExecutedPlansForPeriod(year, month)
  );

  useEffect(() => {
    const update = () => {
      setExecutedPlans(getExecutedPlansForPeriod(year, month));
    };
    update();
    return onExecutedBucketPlansChange(update);
  }, [year, month]);

  if (executedPlans.length === 0) {
    return null;
  }

  const totalDeducted = executedPlans.reduce((sum, p) => sum + p.totalSpent, 0);

  return (
    <div className="p-4 border-t border-surface-border bg-slate-50/40">
      <div className="bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-white rounded-lg border border-emerald-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <span>Executed Bucket Plan Transactions</span>
              <Badge variant="success" className="text-[10px] py-0 px-1.5 font-normal">
                {executedPlans.length} {executedPlans.length === 1 ? 'Plan' : 'Plans'} Executed
              </Badge>
            </h4>
            <p className="text-[11px] text-emerald-700">
              Deducted directly from your Overall Savings to fund special goals and bucket list items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-medium text-emerald-800">Total Savings Spent:</span>
          <span className="font-bold text-sm text-emerald-700 bg-white px-2.5 py-1 rounded-md border border-emerald-200 shadow-xs">
            <CurrencyDisplay amount={totalDeducted} size="sm" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {executedPlans.map(plan => (
          <div
            key={plan.planId}
            className="bg-white rounded-lg border border-emerald-200/80 p-3.5 shadow-2xs space-y-2.5 hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-800 truncate">{plan.planName}</h5>
                  {plan.destination && (
                    <span className="text-[10px] text-content-secondary truncate block">
                      {plan.destination}
                    </span>
                  )}
                </div>
              </div>

              <Badge variant="brand" className="text-[10px] font-mono shrink-0">
                ₹{plan.totalSpent.toLocaleString()} from Savings
              </Badge>
            </div>

            <div className="flex items-center justify-between text-[11px] text-content-secondary bg-slate-50 px-2 py-1 rounded border border-slate-100">
              <span className="flex items-center gap-1 text-slate-600">
                <Calendar className="w-3 h-3 text-slate-400" />
                Executed: {formatDate(plan.executedAt)}
              </span>
              <span className="font-medium text-slate-700">
                Budget: ₹{plan.budget.toLocaleString()}
              </span>
            </div>

            {/* Category breakdown if present */}
            {plan.categoryBreakdown && plan.categoryBreakdown.length > 0 && (
              <div className="pt-1.5 border-t border-slate-100 space-y-1">
                <div className="text-[10px] font-semibold text-content-secondary uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Spending Breakdown
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {plan.categoryBreakdown.map(cat => (
                    <span
                      key={cat.categoryName}
                      className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
                    >
                      <Tag className="w-2.5 h-2.5 text-slate-400" />
                      <span>{cat.categoryName}:</span>
                      <strong className="font-semibold text-slate-900">
                        ₹{cat.totalAmount.toLocaleString()}
                      </strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
  );
};
