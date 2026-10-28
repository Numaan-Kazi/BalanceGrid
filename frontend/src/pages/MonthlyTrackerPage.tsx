import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  DollarSign,
  Plus,
  Lock,
  Unlock,
  Wallet,
  CheckCircle2,
  Calendar,
  Zap,
} from "lucide-react";
import {
  Account,
  BucketPlan,
  ExpenseMode,
  MonthlyTrackerResponse,
} from "@/types";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  isMonthEffectivelyClosed,
  isMonthPastCalendar,
  isMonthManuallyUnlocked,
  unlockMonth,
  relockMonth,
  onMonthLockChange,
} from "@/lib/monthLock";
import { ExecutedBucketPlansSection } from "@/components/monthly/ExecutedBucketPlansSection";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/Button";
import { MonthYearPicker } from "@/components/common/MonthYearPicker";
import { MonthlySummaryHeader } from "@/components/monthly/MonthlySummaryHeader";
import { CategoryWeekRow } from "@/components/monthly/CategoryWeekRow";
import { QuickMonthlyView } from "@/components/monthly/QuickMonthlyView";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { ModeSwitchModal } from "@/components/monthly/ModeSwitchModal";
import { DetailedExpensesModal } from "@/components/monthly/DetailedExpensesModal";
import { IncomeModal } from "@/components/income/IncomeModal";
import { AddCategoryModal } from "@/components/common/AddCategoryModal";
import { StartingBalanceModal } from "@/components/monthly/StartingBalanceModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { MONTH_NAMES } from "@/lib/formatters";

export const MonthlyTrackerPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [activeTab, setActiveTab] = useState<"matrix" | "quick">("matrix");

  // Modals state
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [isStartingBalModalOpen, setIsStartingBalModalOpen] = useState(false);
  const [isCloseMonthConfirmOpen, setIsCloseMonthConfirmOpen] = useState(false);
  const [overallBudgetInput, setOverallBudgetInput] = useState<string>("");

  // Mode Switch State
  const [modeSwitchState, setModeSwitchState] = useState<{
    isOpen: boolean;
    categoryId: string;
    categoryName: string;
    weekNumber: number;
    weekLabel: string;
    currentMode: ExpenseMode;
    targetMode: ExpenseMode;
    summaryAmount: number;
    detailedTotal: number;
    detailedCount: number;
  }>({
    isOpen: false,
    categoryId: "",
    categoryName: "",
    weekNumber: 1,
    weekLabel: "",
    currentMode: "SUMMARY",
    targetMode: "DETAILED",
    summaryAmount: 0,
    detailedTotal: 0,
    detailedCount: 0,
  });

  // Detailed Expenses Modal State
  const [detailedModalState, setDetailedModalState] = useState<{
    isOpen: boolean;
    categoryId: string;
    categoryName: string;
    weekNumber: number;
    weekLabel: string;
    startDate: string;
    endDate: string;
  }>({
    isOpen: false,
    categoryId: "",
    categoryName: "",
    weekNumber: 1,
    weekLabel: "",
    startDate: "",
    endDate: "",
  });

  // Queries
  const { data: trackerData, isLoading } = useQuery<MonthlyTrackerResponse>({
    queryKey: ["monthlyTracker", selectedYear, selectedMonth],
    queryFn: () =>
      api.get(`/monthly?year=${selectedYear}&month=${selectedMonth}`),
  });

  const { data: accountsData } = useQuery<{ accounts: Account[] }>({
    queryKey: ["accounts"],
    queryFn: () => api.get("/accounts"),
  });

  const { data: bucketData } = useQuery<{ plans: BucketPlan[] }>({
    queryKey: ["bucketPlans"],
    queryFn: () => api.get("/bucket-plans"),
  });

  const invalidateTracker = () => {
    queryClient.invalidateQueries({ queryKey: ["monthlyTracker"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  // Mutations
  const summaryMutation = useMutation({
    mutationFn: (data: {
      categoryId: string;
      weekNumber: number;
      summaryAmount: number;
    }) =>
      api.post("/expenses/weekly-summary", {
        monthlyPeriodId: trackerData!.period.id,
        ...data,
      }),
    onSuccess: invalidateTracker,
  });

  const zeroSpendMutation = useMutation({
    mutationFn: (data: { categoryId: string; weekNumber: number }) =>
      api.post("/expenses/weekly-zero", {
        monthlyPeriodId: trackerData!.period.id,
        ...data,
      }),
    onSuccess: invalidateTracker,
  });

  const modeSwitchMutation = useMutation({
    mutationFn: (data: {
      categoryId: string;
      weekNumber: number;
      targetMode: ExpenseMode;
      confirmConsolidate: boolean;
      accountId?: string;
    }) =>
      api.post("/expenses/switch-mode", {
        monthlyPeriodId: trackerData!.period.id,
        ...data,
      }),
    onSuccess: invalidateTracker,
  });

  const budgetMutation = useMutation({
    mutationFn: (budgetVal: number | null) =>
      api.patch(`/monthly/budget/${trackerData!.period.id}`, {
        overallBudget: budgetVal,
      }),
    onSuccess: () => {
      invalidateTracker();
      setIsBudgetModalOpen(false);
    },
  });

  const startingBalanceMutation = useMutation({
    mutationFn: (startingBalance: number) =>
      api.put(`/monthly/starting-balance/${trackerData!.period.id}`, {
        startingBalance,
      }),
    onSuccess: invalidateTracker,
  });

  const closeMonthMutation = useMutation({
    mutationFn: () => api.post(`/monthly/close/${trackerData!.period.id}`, {}),
    onSuccess: invalidateTracker,
  });

  const incomeMutation = useMutation({
    mutationFn: (data: any) => api.post("/incomes", data),
    onSuccess: invalidateTracker,
  });

  const handleUpdateSummary = async (
    categoryId: string,
    weekNumber: number,
    amount: number,
  ) => {
    if (trackerData?.period.isClosed) return;
    await summaryMutation.mutateAsync({
      categoryId,
      weekNumber,
      summaryAmount: amount,
    });
  };

  const handleSetZeroSpend = async (categoryId: string, weekNumber: number) => {
    if (trackerData?.period.isClosed) return;
    await zeroSpendMutation.mutateAsync({ categoryId, weekNumber });
  };

  const handleSaveBudget = async () => {
    const num = overallBudgetInput ? parseFloat(overallBudgetInput) : null;
    await budgetMutation.mutateAsync(num);
  };

  const [, setLockUpdateTick] = useState(0);

  React.useEffect(() => {
    return onMonthLockChange(() => {
      setLockUpdateTick((t) => t + 1);
    });
  }, []);

  const isPastMonth = isMonthPastCalendar(selectedYear, selectedMonth);
  const isBackendClosed = Boolean(trackerData?.period.isClosed);
  const isUnlocked = isMonthManuallyUnlocked(selectedYear, selectedMonth);
  const isMonthClosed = isMonthEffectivelyClosed(
    selectedYear,
    selectedMonth,
    isBackendClosed,
  );
  const monthName = MONTH_NAMES[selectedMonth - 1];

  return (
    <div className="space-y-6">
      <Topbar
        title="Monthly Expense Tracker"
        subtitle="Monday–Sunday weekly budgeting with Summary and Detailed tracking modes"
        action={
          <div className="flex items-center gap-2">
            <MonthYearPicker
              year={selectedYear}
              month={selectedMonth}
              onChange={(y, m) => {
                setSelectedYear(y);
                setSelectedMonth(m);
              }}
            />
          </div>
        }
      />

      <div className="px-4 sm:px-8 space-y-6 w-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : trackerData ? (
          <>
            {/* Closed Month Banner */}
            {isMonthClosed && (
              <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <span>
                        {monthName} {selectedYear} Finalized and Closed
                      </span>
                      <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                        Read-Only
                      </span>
                      {isPastMonth && !isBackendClosed && (
                        <span className="text-[10px] bg-slate-800 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                          Auto-Closed (Past Month)
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {isBackendClosed
                        ? `Finalized savings of ₹${trackerData.period.finalizedSavings ?? 0} saved to Overall Total Savings.`
                        : `This calendar month has passed. All editing controls are disabled to protect historical data.`}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unlockMonth(selectedYear, selectedMonth)}
                  className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 text-xs shrink-0 self-start sm:self-auto"
                >
                  <Unlock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  Unlock Month
                </Button>
              </div>
            )}

            {/* Manually Unlocked Notice */}
            {!isMonthClosed && isUnlocked && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-md">
                    <Unlock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold flex items-center gap-2">
                      <span>
                        {monthName} {selectedYear} Unlocked for Editing
                      </span>
                      <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.2 rounded-full font-medium">
                        Editing Enabled
                      </span>
                    </h5>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      You have manually unlocked this month. When you are done
                      making corrections, you can re-lock it.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => relockMonth(selectedYear, selectedMonth)}
                  className="bg-white hover:bg-amber-100 text-amber-900 border-amber-300 text-xs shrink-0 self-start sm:self-auto"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-700" />
                  Re-lock Month
                </Button>
              </div>
            )}

            {/* Monthly Summary Cards Header */}
            <MonthlySummaryHeader
              summary={trackerData.summary}
              onOpenBudgetModal={() => {
                if (isMonthClosed) return;
                setOverallBudgetInput(
                  trackerData.period.overallBudget?.toString() || "",
                );
                setIsBudgetModalOpen(true);
              }}
            />

            <div className="flex w-full items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("matrix")}
                aria-pressed={activeTab === "matrix"}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3",
                  activeTab === "matrix"
                    ? "bg-white font-semibold text-brand-700 shadow-xs"
                    : "text-content-secondary hover:text-content-primary",
                )}
              >
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>Weekly Matrix</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("quick")}
                aria-pressed={activeTab === "quick"}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3",
                  activeTab === "quick"
                    ? "bg-white font-semibold text-brand-700 shadow-xs"
                    : "text-content-secondary hover:text-content-primary",
                )}
              >
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>Quick Monthly View</span>
              </button>
            </div>
            {/* Tracker Matrix / Quick View Container */}
            <div className="bg-white rounded-lg border border-surface-border shadow-xs overflow-hidden">
              <div className="p-4 border-b border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Tab Navigation: Weekly Matrix vs Quick Monthly View */}

                  <div>
                    <h3 className="text-sm font-semibold text-content-primary">
                      {activeTab === "matrix"
                        ? "Category-Week Expense Matrix"
                        : "Quick Monthly View"}
                    </h3>
                    <p className="text-xs text-content-secondary mt-0.5">
                      {activeTab === "matrix"
                        ? "Enter one summary total per week, or switch to Detailed mode for itemized receipts."
                        : "Track and update category-level monthly totals and compare against allocated budgets."}
                    </p>
                  </div>
                </div>

                {/* Action buttons (Add Category, Initialize Starting Balance, Close Month) */}
                <div className="flex items-center flex-wrap gap-2">
                  {!isMonthClosed && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddCatModalOpen(true)}
                        className="text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1 text-brand-600" />
                        Add Category
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsStartingBalModalOpen(true)}
                        className="text-xs"
                      >
                        <Wallet className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                        Starting Balance (₹{trackerData.period.startingBalance})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsCloseMonthConfirmOpen(true)}
                        className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Close Month
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* View Content based on active tab */}
              {activeTab === "matrix" ? (
                <>
                  {/* Responsive Scrollable Table (Weekly Matrix) */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-surface-muted border-b border-surface-border text-xs text-content-secondary font-semibold">
                          <th className="p-3 sticky left-0 bg-surface-muted z-10 w-48 border-r border-surface-border">
                            Category & Budget
                          </th>
                          {trackerData.weeks.map((w) => (
                            <th
                              key={w.weekNumber}
                              className="p-3 min-w-[130px] border-r border-surface-border"
                            >
                              <div>
                                <span className="text-content-primary font-bold">
                                  Week {w.weekNumber}
                                </span>
                                <span className="block text-[10px] text-content-muted font-normal">
                                  {w.startDate.substring(5)} to{" "}
                                  {w.endDate.substring(5)}
                                </span>
                              </div>
                            </th>
                          ))}
                          <th className="p-3 text-right w-28 bg-surface-muted">
                            Total Spent
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {trackerData.categories.map((cat) => (
                          <CategoryWeekRow
                            key={cat.id}
                            category={cat}
                            weeks={trackerData.weeks}
                            isClosed={isMonthClosed}
                            onUpdateSummary={handleUpdateSummary}
                            onSetZeroSpend={handleSetZeroSpend}
                            onRequestModeSwitch={(
                              catId,
                              catName,
                              wNum,
                              wLabel,
                              curMode,
                              tgtMode,
                              sumAmt,
                              detTot,
                              detCnt,
                            ) => {
                              if (isMonthClosed) return;
                              setModeSwitchState({
                                isOpen: true,
                                categoryId: catId,
                                categoryName: catName,
                                weekNumber: wNum,
                                weekLabel: wLabel,
                                currentMode: curMode,
                                targetMode: tgtMode,
                                summaryAmount: sumAmt,
                                detailedTotal: detTot,
                                detailedCount: detCnt,
                              });
                            }}
                            onOpenDetailedModal={(
                              catId,
                              catName,
                              wNum,
                              wLabel,
                              startD,
                              endD,
                            ) => {
                              setDetailedModalState({
                                isOpen: true,
                                categoryId: catId,
                                categoryName: catName,
                                weekNumber: wNum,
                                weekLabel: wLabel,
                                startDate: startD,
                                endDate: endD,
                              });
                            }}
                          />
                        ))}
                      </tbody>
                      {/* Footer Totals */}
                      <tfoot>
                        <tr className="bg-surface-muted/60 border-t-2 border-surface-border font-bold text-xs">
                          <td className="p-3 sticky left-0 bg-surface-muted z-10 border-r border-surface-border">
                            Weekly Total Usage
                          </td>
                          {trackerData.weeklyTotals.map((wt) => (
                            <td
                              key={wt.weekNumber}
                              className="p-3 border-r border-surface-border align-middle"
                            >
                              <CurrencyDisplay
                                amount={wt.totalSpent}
                                size="sm"
                              />
                            </td>
                          ))}
                          <td className="p-3 text-right">
                            <CurrencyDisplay
                              amount={trackerData.summary.netExpenses}
                              size="md"
                            />
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Dedicated Executed Bucket Plans Section in Weekly Matrix */}
                  <ExecutedBucketPlansSection
                    year={selectedYear}
                    month={selectedMonth}
                  />
                </>
              ) : (
                /* Quick Monthly View */
                <QuickMonthlyView
                  categories={trackerData.categories}
                  periodId={trackerData.period.id}
                  isClosed={isMonthClosed}
                  year={selectedYear}
                  month={selectedMonth}
                  onSwitchToWeeklyMatrix={() => setActiveTab("matrix")}
                  onOpenAddCategoryModal={() => setIsAddCatModalOpen(true)}
                />
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isAddCatModalOpen}
        onClose={() => setIsAddCatModalOpen(false)}
        onSuccess={invalidateTracker}
      />

      {/* Starting Balance Modal */}
      <StartingBalanceModal
        isOpen={isStartingBalModalOpen}
        onClose={() => setIsStartingBalModalOpen(false)}
        currentStartingBalance={trackerData?.period.startingBalance || 0}
        monthName={monthName}
        year={selectedYear}
        onSubmit={async (balance) => {
          await startingBalanceMutation.mutateAsync(balance);
        }}
      />

      {/* Close Month Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCloseMonthConfirmOpen}
        onClose={() => setIsCloseMonthConfirmOpen(false)}
        title={`Finalize & Close Month — ${monthName} ${selectedYear}?`}
        message={`Closing this month will calculate and finalize your savings (Projected: ₹${
          trackerData?.summary.remainingBalance ?? 0
        }) and save it permanently into your Overall Total Savings. After closing, this month will become read-only to preserve financial history.`}
        confirmText="Finalize and Close Month"
        variant="primary"
        onConfirm={async () => {
          await closeMonthMutation.mutateAsync();
          setIsCloseMonthConfirmOpen(false);
        }}
      />

      {/* Mode Switch Confirmation Modal */}
      <ModeSwitchModal
        isOpen={modeSwitchState.isOpen}
        onClose={() =>
          setModeSwitchState((prev) => ({ ...prev, isOpen: false }))
        }
        categoryName={modeSwitchState.categoryName}
        weekLabel={modeSwitchState.weekLabel}
        currentMode={modeSwitchState.currentMode}
        targetMode={modeSwitchState.targetMode}
        summaryAmount={modeSwitchState.summaryAmount}
        detailedTotal={modeSwitchState.detailedTotal}
        detailedCount={modeSwitchState.detailedCount}
        accounts={accountsData?.accounts || []}
        onConfirm={async (confirmConsolidate, accountId) => {
          await modeSwitchMutation.mutateAsync({
            categoryId: modeSwitchState.categoryId,
            weekNumber: modeSwitchState.weekNumber,
            targetMode: modeSwitchState.targetMode,
            confirmConsolidate,
            accountId,
          });
        }}
      />

      {/* Detailed Expenses Modal */}
      <DetailedExpensesModal
        isOpen={detailedModalState.isOpen}
        onClose={() =>
          setDetailedModalState((prev) => ({ ...prev, isOpen: false }))
        }
        monthlyPeriodId={trackerData?.period.id || ""}
        categoryId={detailedModalState.categoryId}
        categoryName={detailedModalState.categoryName}
        weekNumber={detailedModalState.weekNumber}
        weekLabel={detailedModalState.weekLabel}
        startDate={detailedModalState.startDate}
        endDate={detailedModalState.endDate}
        accounts={accountsData?.accounts || []}
        bucketPlans={bucketData?.plans || []}
        onExpensesChanged={invalidateTracker}
      />

      {/* Income Modal Shortcut */}
      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSubmit={async (data) => {
          await incomeMutation.mutateAsync(data);
        }}
        accounts={accountsData?.accounts || []}
      />

      {/* Overall Budget Setting Modal */}
      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        title="Set Overall Monthly Budget"
        description="Optional spending limit for this month. Used for progress and overspending tracking."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Overall Monthly Budget (₹)"
            type="number"
            step="0.01"
            placeholder="e.g. 50000.00 (leave blank to remove)"
            value={overallBudgetInput}
            onChange={(e) => setOverallBudgetInput(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBudgetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveBudget}
              isLoading={budgetMutation.isPending}
            >
              Save Budget
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
