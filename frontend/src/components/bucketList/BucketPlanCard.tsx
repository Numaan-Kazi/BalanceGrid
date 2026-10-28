import React from 'react';
import {
  Compass,
  Edit2,
  Trash2,
  Unlink,
  Plus,
  AlertTriangle,
  PieChart,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { BucketPlan } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MONTH_NAMES_SHORT, formatDate } from '../../lib/formatters';

interface BucketPlanCardProps {
  plan: BucketPlan;
  isExecuted?: boolean;
  onEdit: (plan: BucketPlan) => void;
  onDelete: (planId: string) => void;
  onAddExpense: (plan: BucketPlan) => void;
  onEditExpense: (plan: BucketPlan, expense: BucketPlan['expenses'][0]) => void;
  onDeleteExpense: (expenseId: string) => void;
  onUnlinkExpense: (expenseId: string) => void;
  onExecute: (plan: BucketPlan) => void;
}

export const BucketPlanCard: React.FC<BucketPlanCardProps> = ({
  plan,
  isExecuted = false,
  onEdit,
  onDelete,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onUnlinkExpense,
  onExecute,
}) => {
  const isCompleted = plan.status === 'COMPLETED' || isExecuted;
  const isOverBudget = !isCompleted && (plan.isOverBudget ?? plan.remainingBudget < 0);
  const excessAmount = plan.excessAmount ?? (isOverBudget ? Math.abs(plan.remainingBudget) : 0);
  const executionAmount = plan.totalSpent > 0 ? plan.totalSpent : plan.budget;

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Completed
        </span>
      );
    }
    return <Badge variant="brand">In Progress</Badge>;
  };

  return (
    <Card
      className={`transition-all ${
        isCompleted
          ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/20 via-white to-white shadow-2xs'
          : isOverBudget
          ? 'border-rose-300 hover:border-rose-400'
          : 'hover:border-brand-300'
      }`}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-700'
                  : isOverBudget
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-sky-50 text-sky-600'
              }`}
            >
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-content-primary">{plan.name}</h4>
                {getStatusBadge()}
              </div>
              <span className="text-[11px] text-content-secondary">
                {plan.destination && `${plan.destination} • `}
                {plan.targetMonth && plan.targetYear
                  ? `${MONTH_NAMES_SHORT[plan.targetMonth - 1]} ${plan.targetYear}`
                  : 'Flexible timeline'}
              </span>
            </div>
          </div>

          {/* Action buttons (Disabled & hidden once completed/locked down) */}
          {!isCompleted && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(plan)}
                className="p-1.5 text-content-secondary hover:text-brand-600 rounded-md hover:bg-slate-100 transition-colors"
                title="Edit Plan"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(plan.id)}
                className="p-1.5 text-content-secondary hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                title="Delete Plan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Over Budget Explicit Alert Card (active only before execution) */}
        {isOverBudget && (
          <div className="p-3 rounded-lg bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Your plan is out of budget!</span>
            </div>
            <p className="text-[11px] text-rose-800 font-medium">
              Total spending has exceeded your allocated budget by{' '}
              <span className="font-extrabold text-rose-900 bg-rose-100 px-1.5 py-0.5 rounded">
                ₹{excessAmount.toFixed(2)}
              </span>
            </p>
          </div>
        )}

        {/* Financial Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-content-secondary">Spent: ₹{plan.totalSpent.toFixed(2)}</span>
            <span
              className={`font-semibold ${
                isCompleted ? 'text-emerald-700' : isOverBudget ? 'text-rose-600' : 'text-content-primary'
              }`}
            >
              {plan.percentageSpent}% utilized
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCompleted ? 'bg-emerald-600' : isOverBudget ? 'bg-rose-500' : 'bg-brand-600'
              }`}
              style={{ width: `${Math.min(plan.percentageSpent, 100)}%` }}
            />
          </div>
        </div>

        {/* Budget Figures */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-surface-muted border border-surface-border text-xs">
          <div>
            <span className="text-content-secondary block text-[11px]">Allocated Budget</span>
            <CurrencyDisplay amount={plan.budget} size="sm" />
          </div>
          <div>
            <span className="text-content-secondary block text-[11px]">Remaining in Budget Pool</span>
            <CurrencyDisplay
              amount={plan.remainingBudget}
              size="sm"
              colored
              showSign={false}
            />
          </div>
        </div>

        {/* Category Breakdown (Dynamic) */}
        {plan.categoryBreakdown && plan.categoryBreakdown.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-surface-border">
            <div className="flex items-center justify-between text-[11px] font-semibold text-content-secondary uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <PieChart className="w-3 h-3" /> Category Insights
              </span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {plan.categoryBreakdown.map(cat => (
                <div key={cat.categoryName} className="flex items-center justify-between text-xs">
                  <span className="text-content-primary truncate max-w-[140px]">{cat.categoryName}</span>
                  <span className="text-content-secondary font-medium">
                    ₹{cat.totalAmount.toFixed(2)} ({cat.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan Execution State / Action Button */}
        {isCompleted ? (
          <div className="p-3 rounded-lg bg-emerald-50/90 border border-emerald-300 text-emerald-950 flex items-center justify-between text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-200 text-emerald-800 rounded-md shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <span className="font-bold text-emerald-950 block">Plan Finalized &amp; Executed</span>
                <span className="text-[11px] text-emerald-700">
                  ₹{executionAmount.toLocaleString()} permanently deducted from Overall Savings
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-200/60 text-emerald-800 font-semibold shrink-0">
              <Lock className="w-2.5 h-2.5" /> Locked
            </span>
          </div>
        ) : (
          <Button
            size="sm"
            type="button"
            className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-all"
            onClick={() => onExecute(plan)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Execute Plan (Deduct ₹{executionAmount.toLocaleString()} from Savings)
          </Button>
        )}

        {/* Add Expense Action Button (Hidden once completed/locked down) */}
        {!isCompleted && (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs font-medium"
            onClick={() => onAddExpense(plan)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Expense to Plan
          </Button>
        )}

        {/* Linked actual expenses */}
        <div className="space-y-2 pt-2 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-content-secondary">
              Linked Expenses ({plan.expenses.length})
            </span>
            <span className="text-[10px] text-content-muted">
              Deducts from plan budget pool only
            </span>
          </div>

          {plan.expenses.length === 0 ? (
            <p className="text-[11px] text-content-muted italic">
              No transactions recorded yet. Click &quot;Add Expense to Plan&quot; to log expenses against this plan&apos;s budget.
            </p>
          ) : (
            <div className="divide-y divide-surface-border max-h-36 overflow-y-auto border border-surface-border rounded-md">
              {plan.expenses.map(e => (
                <div
                  key={e.id}
                  className="p-2 flex items-center justify-between text-xs hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-medium text-content-primary truncate">
                      {e.description || e.categoryName}
                    </p>
                    <span className="text-[10px] text-content-muted">
                      {formatDate(e.date)} • {e.categoryName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CurrencyDisplay amount={e.netAmount} size="sm" />
                    {!isCompleted && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditExpense(plan, e)}
                          className="p-1 text-content-muted hover:text-brand-600 rounded hover:bg-brand-50"
                          title="Edit expense"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUnlinkExpense(e.id)}
                          className="p-1 text-content-muted hover:text-amber-600 rounded hover:bg-amber-50"
                          title="Unlink from plan"
                        >
                          <Unlink className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(e.id)}
                          className="p-1 text-content-muted hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Delete expense"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
