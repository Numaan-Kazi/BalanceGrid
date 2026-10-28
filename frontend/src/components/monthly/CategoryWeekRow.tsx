import React, { useState } from 'react';
import { CategoryTrackerRow, WeekRange, ExpenseMode, CategoryWeekState } from '../../types';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { Check, Edit3, ArrowRightLeft, ListPlus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CategoryWeekRowProps {
  category: CategoryTrackerRow;
  weeks: WeekRange[];
  isClosed?: boolean;
  onUpdateSummary: (categoryId: string, weekNumber: number, amount: number) => Promise<void>;
  onSetZeroSpend: (categoryId: string, weekNumber: number) => Promise<void>;
  onRequestModeSwitch: (
    categoryId: string,
    categoryName: string,
    weekNumber: number,
    weekLabel: string,
    currentMode: ExpenseMode,
    targetMode: ExpenseMode,
    summaryAmount: number,
    detailedTotal: number,
    detailedCount: number
  ) => void;
  onOpenDetailedModal: (
    categoryId: string,
    categoryName: string,
    weekNumber: number,
    weekLabel: string,
    startDate: string,
    endDate: string
  ) => void;
}

export const CategoryWeekRow: React.FC<CategoryWeekRowProps> = ({
  category,
  weeks,
  isClosed = false,
  onUpdateSummary,
  onSetZeroSpend,
  onRequestModeSwitch,
  onOpenDetailedModal,
}) => {
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [summaryInputVal, setSummaryInputVal] = useState<string>('');

  const startEditSummary = (week: CategoryWeekState) => {
    setEditingWeek(week.weekNumber);
    setSummaryInputVal(week.summaryAmount.toString());
  };

  const handleSaveSummary = async (weekNumber: number) => {
    const val = parseFloat(summaryInputVal);
    if (!isNaN(val) && val >= 0) {
      await onUpdateSummary(category.id, weekNumber, val);
    }
    setEditingWeek(null);
  };

  return (
    <tr className="hover:bg-slate-50/70 border-b border-surface-border text-xs transition-colors">
      {/* Category Name & Budget */}
      <td className="p-3 font-medium text-content-primary sticky left-0 bg-white z-10 border-r border-surface-border">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{category.name}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-content-secondary mt-0.5">
          <span>Spent: ₹{category.totalSpent}</span>
          {category.budget !== null && (
            <span className={category.isOverspent ? 'text-rose-600 font-semibold' : ''}>
              • Budget: ₹{category.budget}
            </span>
          )}
        </div>
      </td>

      {/* Week Columns */}
      {weeks.map(w => {
        const weekState = category.weeks.find(cw => cw.weekNumber === w.weekNumber) || {
          weekNumber: w.weekNumber,
          mode: 'SUMMARY' as ExpenseMode,
          status: 'UNREPORTED' as const,
          summaryAmount: 0,
          detailedTotal: 0,
          detailedCount: 0,
          effectiveSpent: 0,
          stateId: '',
        };

        const isSummary = weekState.mode === 'SUMMARY';
        const isEditingThis = editingWeek === w.weekNumber;

        return (
          <td
            key={w.weekNumber}
            className="p-2 border-r border-surface-border min-w-[130px] align-top"
          >
            <div className="flex flex-col h-full justify-between space-y-1.5">
              {/* Header inside cell: Mode badge & mode toggle button */}
              <div className="flex items-center justify-between text-[10px]">
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded font-mono font-medium border',
                    isSummary
                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-brand-50 text-brand-700 border-brand-200'
                  )}
                >
                  {weekState.mode}
                </span>

                {!isClosed && (
                  <button
                    onClick={() =>
                      onRequestModeSwitch(
                        category.id,
                        category.name,
                        w.weekNumber,
                        w.label,
                        weekState.mode,
                        isSummary ? 'DETAILED' : 'SUMMARY',
                        weekState.summaryAmount,
                        weekState.detailedTotal,
                        weekState.detailedCount
                      )
                    }
                    title={`Switch to ${isSummary ? 'Detailed' : 'Summary'} mode`}
                    className="text-content-secondary hover:text-brand-600 p-0.5 rounded hover:bg-slate-100"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Amount display / Editor */}
              {isSummary ? (
                isEditingThis ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full text-xs px-2 py-1 border border-brand-600 rounded focus:outline-none"
                      value={summaryInputVal}
                      onChange={e => setSummaryInputVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveSummary(w.weekNumber);
                        if (e.key === 'Escape') setEditingWeek(null);
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveSummary(w.weekNumber)}
                      className="p-1 bg-brand-600 text-white rounded hover:bg-brand-700"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <div>
                      {weekState.status === 'UNREPORTED' ? (
                        <span className="text-content-muted font-mono italic">Unreported</span>
                      ) : weekState.status === 'ZERO_SPENT' ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                          ₹0 (Confirmed)
                        </span>
                      ) : (
                        <CurrencyDisplay amount={weekState.summaryAmount} size="sm" />
                      )}
                    </div>
                    {!isClosed && (
                      <button
                        onClick={() => startEditSummary(weekState)}
                        className="text-content-secondary hover:text-brand-600 opacity-60 group-hover:opacity-100 p-0.5"
                        title="Edit Summary Amount"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )
              ) : (
                /* DETAILED MODE */
                <div className="flex items-center justify-between">
                  <div>
                    <CurrencyDisplay amount={weekState.detailedTotal} size="sm" />
                    <span className="block text-[10px] text-content-muted">
                      {weekState.detailedCount} {weekState.detailedCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      onOpenDetailedModal(
                        category.id,
                        category.name,
                        w.weekNumber,
                        w.label,
                        w.startDate,
                        w.endDate
                      )
                    }
                    className="p-1 text-brand-600 hover:bg-brand-50 rounded text-[11px] font-semibold flex items-center gap-0.5"
                    title={isClosed ? 'View Detailed Expenses' : 'View & Add Detailed Expenses'}
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Quick Zero Spend button if not yet zero and in summary mode */}
              {isSummary && weekState.status !== 'ZERO_SPENT' && !isClosed && (
                <div className="pt-1">
                  <button
                    onClick={() => onSetZeroSpend(category.id, w.weekNumber)}
                    className="text-[10px] text-content-muted hover:text-emerald-700 hover:underline block"
                  >
                    Mark ₹0 spent
                  </button>
                </div>
              )}
            </div>
          </td>
        );
      })}

      {/* Row Total */}
      <td className="p-3 font-semibold text-right align-top bg-surface-muted/30">
        <CurrencyDisplay amount={category.totalSpent} size="sm" />
      </td>
    </tr>
  );
};

