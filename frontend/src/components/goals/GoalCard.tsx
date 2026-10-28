import React from 'react';
import { PiggyBank, Plus, CheckCircle2, Trash2, Edit2 } from 'lucide-react';
import { SavingsGoal } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { formatDate } from '../../lib/formatters';

interface GoalCardProps {
  goal: SavingsGoal;
  onAllocate: (goalId: string) => void;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goalId: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onAllocate, onEdit, onDelete }) => {
  const isDone = goal.isCompleted || goal.percentageComplete >= 100 || goal.remainingNeeded <= 0;
  const remainingNeeded = isDone ? 0 : goal.remainingNeeded;

  return (
    <Card className="hover:border-brand-300 transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-content-primary">{goal.name}</h4>
                {isDone && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Completed / Reached
                  </span>
                )}
              </div>
              {goal.targetDate && (
                <span className="text-[11px] text-content-secondary">
                  Target: {formatDate(goal.targetDate)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(goal)}
              className="p-1.5 text-content-secondary hover:text-brand-600 rounded-md hover:bg-slate-100"
              title="Edit Goal"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="p-1.5 text-content-secondary hover:text-rose-600 rounded-md hover:bg-rose-50"
              title="Delete Goal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-content-secondary">Allocated: ₹{goal.totalAllocated.toFixed(2)}</span>
            <span className={`font-semibold ${isDone ? 'text-emerald-600' : 'text-content-primary'}`}>
              {Math.min(goal.percentageComplete, 100)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isDone ? 'bg-emerald-500' : 'bg-brand-600'
              }`}
              style={{ width: `${Math.min(goal.percentageComplete, 100)}%` }}
            />
          </div>
        </div>

        {/* Goal Financial Figures */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-surface-muted border border-surface-border mb-4 text-xs">
          <div>
            <span className="text-content-secondary block text-[11px]">Target Goal</span>
            <CurrencyDisplay amount={goal.targetAmount} size="sm" />
          </div>
          <div>
            <span className="text-content-secondary block text-[11px]">Remaining Needed</span>
            <CurrencyDisplay amount={remainingNeeded} size="sm" colored={false} />
          </div>
        </div>

        {/* Action button */}
        {isDone ? (
          <Button
            size="sm"
            variant="secondary"
            disabled
            className="w-full text-xs font-semibold cursor-not-allowed opacity-75"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Completed / Reached
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs font-semibold"
            onClick={() => onAllocate(goal.id)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Allocate Surplus to this Goal
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
