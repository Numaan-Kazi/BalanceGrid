import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Loader2,
  Check,
  AlertCircle,
  Lock,
  ArrowRight,
  Edit2,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { CategoryTrackerRow } from '@/types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ExecutedBucketPlansSection } from '@/components/monthly/ExecutedBucketPlansSection';

interface QuickMonthlyViewProps {
  categories: CategoryTrackerRow[];
  periodId: string;
  isClosed: boolean;
  year?: number;
  month?: number;
  onSwitchToWeeklyMatrix: () => void;
  onOpenAddCategoryModal: () => void;
}

interface RowState {
  spendingInput: string;
  isSaving: boolean;
  saveSuccess: boolean;
  error: string | null;
}

export const QuickMonthlyView: React.FC<QuickMonthlyViewProps> = ({
  categories,
  periodId,
  isClosed,
  year,
  month,
  onSwitchToWeeklyMatrix,
  onOpenAddCategoryModal,
}) => {
  const queryClient = useQueryClient();

  // Local state for each category row: inputs and saving status
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  // Category Budget Modal State
  const [budgetModalCat, setBudgetModalCat] = useState<{
    id: string;
    name: string;
    currentBudget: number | null;
  } | null>(null);
  const [budgetInputVal, setBudgetInputVal] = useState<string>('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // Helper to get or initialize row state
  const getRowState = (cat: CategoryTrackerRow): RowState => {
    if (rowStates[cat.id]) {
      return rowStates[cat.id];
    }
    return {
      spendingInput: cat.totalSpent.toString(),
      isSaving: false,
      saveSuccess: false,
      error: null,
    };
  };

  const updateRowState = (catId: string, partial: Partial<RowState>) => {
    setRowStates(prev => {
      const current = prev[catId] || {
        spendingInput: categories.find(c => c.id === catId)?.totalSpent.toString() || '0',
        isSaving: false,
        saveSuccess: false,
        error: null,
      };
      return {
        ...prev,
        [catId]: { ...current, ...partial },
      };
    });
  };

  // Check if a category has detailed receipts
  const categoryHasDetailedReceipts = (cat: CategoryTrackerRow): boolean => {
    return cat.weeks.some(w => w.mode === 'DETAILED' || w.detailedCount > 0);
  };

  // Handle saving monthly total spent for a summary-mode category
  const handleSaveSpending = async (cat: CategoryTrackerRow) => {
    if (isClosed) return;
    if (categoryHasDetailedReceipts(cat)) return;

    const state = getRowState(cat);
    const rawVal = state.spendingInput.trim();

    // Validations
    if (rawVal === '') {
      updateRowState(cat.id, { error: 'Please enter an amount (0 or more).' });
      return;
    }

    const numVal = parseFloat(rawVal);
    if (isNaN(numVal)) {
      updateRowState(cat.id, { error: 'Please enter a valid numeric amount.' });
      return;
    }

    if (numVal < 0) {
      updateRowState(cat.id, { error: 'Spending amount cannot be negative.' });
      return;
    }

    // If identical to current totalSpent, just show success
    if (numVal === cat.totalSpent) {
      updateRowState(cat.id, { error: null, saveSuccess: true });
      setTimeout(() => {
        updateRowState(cat.id, { saveSuccess: false });
      }, 2000);
      return;
    }

    updateRowState(cat.id, { isSaving: true, error: null });

    try {
      // Data Integrity:
      // In Summary mode, a category's total monthly spent is the sum of its weekly summary amounts.
      // We set Week 1 to the new total amount.
      // If any subsequent weeks (Week 2, 3, 4, 5) currently have summary amounts > 0,
      // we reset them to 0 so that sum(weeks) = new total, avoiding double-counting.
      const updates: Promise<unknown>[] = [
        api.post('/expenses/weekly-summary', {
          monthlyPeriodId: periodId,
          categoryId: cat.id,
          weekNumber: 1,
          summaryAmount: numVal,
        }),
      ];

      for (const w of cat.weeks) {
        if (w.weekNumber > 1 && w.summaryAmount > 0) {
          updates.push(
            api.post('/expenses/weekly-summary', {
              monthlyPeriodId: periodId,
              categoryId: cat.id,
              weekNumber: w.weekNumber,
              summaryAmount: 0,
            })
          );
        }
      }

      await Promise.all(updates);

      // Invalidate queries so that summary cards, tracker data, and dashboard refresh cleanly
      await queryClient.invalidateQueries({ queryKey: ['monthlyTracker'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });

      updateRowState(cat.id, {
        isSaving: false,
        saveSuccess: true,
        error: null,
      });

      setTimeout(() => {
        updateRowState(cat.id, { saveSuccess: false });
      }, 2500);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Failed to save spending. Please try again.';
      updateRowState(cat.id, {
        isSaving: false,
        error: errMsg,
      });
    }
  };

  // Open modal to set or edit category budget
  const handleOpenBudgetModal = (cat: CategoryTrackerRow) => {
    if (isClosed) return;
    setBudgetModalCat({
      id: cat.id,
      name: cat.name,
      currentBudget: cat.budget,
    });
    setBudgetInputVal(cat.budget !== null ? cat.budget.toString() : '');
    setBudgetError(null);
  };

  // Save category budget
  const handleSaveBudget = async () => {
    if (!budgetModalCat || isClosed) return;

    const trimmed = budgetInputVal.trim();
    let numVal: number;

    if (trimmed === '') {
      numVal = 0;
    } else {
      numVal = parseFloat(trimmed);
      if (isNaN(numVal) || numVal < 0) {
        setBudgetError('Please enter a valid non-negative budget amount.');
        return;
      }
    }

    setIsSavingBudget(true);
    setBudgetError(null);

    try {
      await api.post('/monthly/category-budget', {
        monthlyPeriodId: periodId,
        categoryId: budgetModalCat.id,
        amount: numVal,
      });

      await queryClient.invalidateQueries({ queryKey: ['monthlyTracker'] });
      setBudgetModalCat(null);
    } catch (err: any) {
      setBudgetError(err?.response?.data?.error || 'Failed to update category budget.');
    } finally {
      setIsSavingBudget(false);
    }
  };

  // Calculate table totals
  const totalAllocatedBudget = categories.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalMonthlySpent = categories.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalRemainingBudget = totalAllocatedBudget - totalMonthlySpent;

  if (categories.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <Tag className="w-6 h-6" />
        </div>
        <div className="max-w-md">
          <h4 className="text-base font-semibold text-content-primary">No Categories Found</h4>
          <p className="text-xs text-content-secondary mt-1">
            You don't have any expense categories yet. Add categories to start tracking your monthly budget and expenses.
          </p>
        </div>
        <Button size="sm" onClick={onOpenAddCategoryModal} className="text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add First Category
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Informational Header Notice */}
      <div className="px-4 py-3 bg-slate-50/80 border-b border-surface-border text-xs text-content-secondary flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-brand-600 shrink-0" />
          <span>
            Enter category monthly totals directly. Changes instantly synchronize with the Weekly Matrix and Monthly Summary.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Within Budget
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Over Budget
          </span>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            {/* <tr className="bg-surface-muted border-b border-surface-border text-xs text-content-secondary font-semibold">
              <th className="p-3 w-56 border-r border-surface-border">Category</th>
              <th className="p-3 w-44 border-r border-surface-border">Allocated Budget</th>
              <th className="p-3 w-64 border-r border-surface-border">Total Spent (This Month)</th>
              <th className="p-3 min-w-[100px]">Remaining / Status</th>
            </tr> */}
            <tr className="bg-surface-muted border-b border-surface-border text-xs text-content-secondary font-semibold w-full">
              <th className="p-3 w-1/4 border-r border-surface-border">Category</th>
              <th className="p-3 w-1/4 border-r border-surface-border">Allocated Budget</th>
              <th className="p-3 w-1/4 border-r border-surface-border">Total Spent (This Month)</th>
              <th className="p-3 w-1/4">Remaining / Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-xs">
            {categories.map(cat => {
              const state = getRowState(cat);
              const hasDetailed = categoryHasDetailedReceipts(cat);
              const isPristine = state.spendingInput === cat.totalSpent.toString();
              const hasBudget = cat.budget !== null && cat.budget !== undefined;

              // Remaining calculation: Allocated Budget - Total Spent
              const remaining = hasBudget ? (cat.budget! - cat.totalSpent) : null;
              const isOverspent = hasBudget && remaining! < 0;

              return (
                <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Column 1: Category Name & Icon */}
                  <td className="p-3 border-r border-surface-border align-middle">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-content-primary truncate">
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-content-muted block">
                          {hasDetailed ? 'Detailed Receipts Mode' : 'Summary Mode'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Column 2: Allocated Budget */}
                  <td className="p-3 border-r border-surface-border align-middle">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        {hasBudget ? (
                          <span className="text-sm font-semibold text-content-primary">
                            ₹{cat.budget!.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-xs text-content-muted italic">No budget set</span>
                        )}
                      </div>
                      {!isClosed && (
                        <button
                          type="button"
                          onClick={() => handleOpenBudgetModal(cat)}
                          title="Set or edit category budget"
                          className="p-1 rounded text-content-secondary hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Column 3: Total Spent Input */}
                  <td className="p-3 border-r border-surface-border align-middle">
                    {hasDetailed ? (
                      /* Detailed Mode: Read-only fallback with clear explanation to protect receipts */
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted text-xs font-semibold">
                              ₹
                            </span>
                            <input
                              type="text"
                              disabled
                              value={cat.totalSpent.toLocaleString('en-IN')}
                              className="w-full pl-6 pr-2 py-1.5 text-xs font-medium rounded border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
                            />
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-slate-50 shrink-0">
                            Receipts Active
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-amber-700 bg-amber-50/80 p-1.5 rounded border border-amber-200/60">
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0 text-amber-600" />
                            Detailed receipts active.
                          </span>
                          <button
                            type="button"
                            onClick={onSwitchToWeeklyMatrix}
                            className="font-semibold text-amber-800 hover:underline flex items-center gap-0.5 ml-1"
                          >
                            Weekly Matrix
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Summary Mode: Editable Monthly Total Input */
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted text-xs font-semibold">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              disabled={isClosed || state.isSaving}
                              value={state.spendingInput}
                              onChange={e => {
                                updateRowState(cat.id, {
                                  spendingInput: e.target.value,
                                  error: null,
                                  saveSuccess: false,
                                });
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveSpending(cat);
                                }
                              }}
                              className={cn(
                                'w-full pl-6 pr-2 py-1.5 text-xs font-medium rounded border transition-colors focus:outline-none focus:ring-1',
                                state.error
                                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                                  : 'border-surface-border focus:border-brand-600 focus:ring-brand-500/20 bg-white',
                                isClosed && 'bg-slate-50 cursor-not-allowed opacity-75'
                              )}
                              placeholder="0"
                            />
                          </div>

                          {!isClosed && (
                            <Button
                              size="sm"
                              variant={state.saveSuccess ? 'secondary' : isPristine ? 'outline' : 'primary'}
                              disabled={state.isSaving || isPristine}
                              onClick={() => handleSaveSpending(cat)}
                              className="text-xs h-8 px-2.5 shrink-0"
                            >
                              {state.isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : state.saveSuccess ? (
                                <span className="flex items-center text-emerald-600">
                                  <Check className="w-3.5 h-3.5 mr-1" />
                                  Saved
                                </span>
                              ) : (
                                'Update'
                              )}
                            </Button>
                          )}

                          {isClosed && (
                            <span title="Month is closed">
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </span>
                          )}
                        </div>

                        {state.error && (
                          <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {state.error}
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Column 4: Remaining / Status */}
                  <td className="p-3 align-middle">
                    {hasBudget ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {isOverspent ? (
                            <Badge variant="destructive" className="font-semibold text-xs py-0.5">
                              ₹{Math.abs(remaining!).toLocaleString('en-IN')} over budget
                            </Badge>
                          ) : (
                            <Badge variant="success" className="font-semibold text-xs py-0.5">
                              ₹{remaining!.toLocaleString('en-IN')} remaining
                            </Badge>
                          )}
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              isOverspent
                                ? 'bg-rose-500'
                                : (cat.budget! > 0 && cat.totalSpent / cat.budget! > 0.85)
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            )}
                            style={{
                              width: `${
                                cat.budget! > 0
                                  ? Math.min(100, Math.round((cat.totalSpent / cat.budget!) * 100))
                                  : 0
                              }%`,
                            }}
                          />
                        </div>

                        <div className="text-[10px] text-content-muted flex items-center justify-between">
                          <span>
                            {cat.budget! > 0
                              ? `${Math.round((cat.totalSpent / cat.budget!) * 100)}% of budget`
                              : '0%'}
                          </span>
                          <span>Spent: ₹{cat.totalSpent.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" className="text-xs">
                          No Budget Set
                        </Badge>
                        {!isClosed && (
                          <button
                            type="button"
                            onClick={() => handleOpenBudgetModal(cat)}
                            className="text-[11px] text-brand-600 hover:underline font-medium"
                          >
                            + Set Budget
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer: Totals Summary */}
          <tfoot>
            <tr className="bg-surface-muted/70 border-t-2 border-surface-border font-bold text-xs">
              <td className="p-3 border-r border-surface-border text-content-primary">
                Monthly Total ({categories.length} Categories)
              </td>
              <td className="p-3 border-r border-surface-border text-content-primary">
                <CurrencyDisplay amount={totalAllocatedBudget} size="sm" />
              </td>
              <td className="p-3 border-r border-surface-border text-content-primary">
                <CurrencyDisplay amount={totalMonthlySpent} size="sm" className="text-amber-600" />
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <CurrencyDisplay
                    amount={totalRemainingBudget}
                    size="sm"
                    colored
                    showSign={false}
                  />
                  <span className="text-[11px] font-normal text-content-muted">
                    {totalRemainingBudget >= 0 ? 'budget remaining' : 'total over budget'}
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Dedicated Executed Bucket Plans Section */}
      {year && month && <ExecutedBucketPlansSection year={year} month={month} />}

      {/* Category Budget Modal */}
      <Modal
        isOpen={Boolean(budgetModalCat)}
        onClose={() => setBudgetModalCat(null)}
        title={`Set Budget — ${budgetModalCat?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-content-secondary">
            Set the monthly spending budget for <strong>{budgetModalCat?.name}</strong>. This budget is used to monitor your remaining monthly allowance.
          </p>

          <Input
            label="Monthly Allocated Budget (₹)"
            type="number"
            min="0"
            step="any"
            value={budgetInputVal}
            onChange={e => {
              setBudgetInputVal(e.target.value);
              setBudgetError(null);
            }}
            placeholder="e.g. 5000"
            error={budgetError || undefined}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBudgetModalCat(null)}
              disabled={isSavingBudget}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveBudget}
              disabled={isSavingBudget}
            >
              {isSavingBudget ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Budget'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
