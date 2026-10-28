import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Loader2,
  Wallet,
  ArrowDownRight,
  DollarSign,
  PiggyBank,
  FileSpreadsheet,
  ArrowUpRight,
  Compass,
  Sparkles,
} from "lucide-react";



import { formatDate, MONTH_NAMES } from "@/lib/formatters";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { api } from "@/lib/api";
import { Topbar } from "@/components/layout/Topbar";
import { MonthlyTrackerResponse, SavingsSummary, YearlyReport } from "@/types";
import { getAdjustedOverallSavings, getExecutedPlansForPeriod, getExecutedPlansForYear, onExecutedBucketPlansChange } from "@/lib/bucketExecution";
import { ExcelSheet, exportToExcel } from "@/lib/excelExport";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const { data: monthlyData, isLoading: isLoadingMonthly } =
    useQuery<MonthlyTrackerResponse>({
      queryKey: ["reportMonthly", selectedYear, selectedMonth],
      queryFn: () =>
        api.get(`/reports/monthly?year=${selectedYear}&month=${selectedMonth}`),
      enabled: reportType === "monthly",
    });

  const { data: yearlyData, isLoading: isLoadingYearly } =
    useQuery<YearlyReport>({
      queryKey: ["reportYearly", selectedYear],
      queryFn: () => api.get(`/reports/yearly?year=${selectedYear}`),
      enabled: reportType === "yearly",
    });

  // Query monthly tracker details for all months to get exact monthly balance (same as Dashboard)
  const { data: yearlyMonthlyTrackers, isLoading: isLoadingTrackers } =
    useQuery<Record<number, MonthlyTrackerResponse>>({
      queryKey: ["yearlyMonthlyTrackers", selectedYear],
      queryFn: async () => {
        const entries = await Promise.all(
          Array.from({ length: 12 }, async (_, i) => {
            const m = i + 1;
            try {
              const data = await api.get<MonthlyTrackerResponse>(
                `/monthly?year=${selectedYear}&month=${m}`,
              );
              return [m, data] as const;
            } catch {
              return [m, null] as const;
            }
          }),
        );
        const map: Record<number, MonthlyTrackerResponse> = {};
        entries.forEach(([m, data]) => {
          if (data) map[m] = data;
        });
        return map;
      },
      enabled: reportType === "yearly",
    });

  const { data: savingsSummary } = useQuery<SavingsSummary>({
    queryKey: ["savingsSummary"],
    queryFn: () => api.get("/accounts/savings-summary"),
  });

  const [executedTick, setExecutedTick] = useState(0);

  useEffect(() => {
    return onExecutedBucketPlansChange(() => {
      setExecutedTick((t) => t + 1);
    });
  }, []);

  // Tab 1 Calculations: Exactly matching the Dashboard metric definitions
  const startingBal = monthlyData?.period?.startingBalance ?? 0;
  const actualInc = monthlyData?.summary?.actualIncome ?? 0;
  const totalBalanceAdded =
    monthlyData?.summary?.totalBalanceAdded ?? startingBal + actualInc;
  const usageThisMonth =
    monthlyData?.summary?.usageThisMonth ??
    monthlyData?.summary?.netExpenses ??
    0;
  const remainingBalance =
    monthlyData?.summary?.remainingBalance ??
    totalBalanceAdded - usageThisMonth;
  const overallTotalSavings = getAdjustedOverallSavings(
    savingsSummary?.overallTotalSavings ?? 0
  );

  const monthlyExecutedPlans = useMemo(() => {
    return getExecutedPlansForPeriod(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, executedTick]);

  const yearlyExecutedPlans = useMemo(() => {
    return getExecutedPlansForYear(selectedYear);
  }, [selectedYear, executedTick]);

  // Category breakdown table totals
  const totalBudgetLimit =
    monthlyData?.categories.reduce((sum, c) => sum + (c.budget || 0), 0) ?? 0;
  const totalActualSpent =
    monthlyData?.categories.reduce((sum, c) => sum + c.totalSpent, 0) ?? 0;
  const totalRemainingBudget = totalBudgetLimit - totalActualSpent;

  // Tab 2 Calculations: Historical & Monthly Summary helper
  const getMonthBalanceData = (
    monthNum: number,
    fallbackIncome: number,
    fallbackExpenses: number,
  ) => {
    const tracker = yearlyMonthlyTrackers?.[monthNum];
    const starting = tracker?.period?.startingBalance ?? 0;
    const inc = tracker?.summary?.actualIncome ?? fallbackIncome ?? 0;
    const trackerBal = tracker?.summary?.totalBalanceAdded ?? starting + inc;
    const monthlyAddedBalance =
      trackerBal > 0 ? trackerBal : fallbackIncome || 0;
    const usage =
      tracker?.summary?.usageThisMonth ??
      tracker?.summary?.netExpenses ??
      fallbackExpenses ??
      0;
    const saving = monthlyAddedBalance - usage;
    const hasData = Boolean(tracker && (monthlyAddedBalance > 0 || usage > 0));
    return {
      monthlyAddedBalance,
      usage,
      saving,
      hasData,
      isClosed: Boolean(tracker?.period?.isClosed),
      finalizedSavings: tracker?.period?.finalizedSavings,
    };
  };

  // Memoized Tab 2 monthly rows & overall aggregate totals
  const tab2MonthlyData = useMemo(() => {
    if (!yearlyData?.months) return [];
    return yearlyData.months.map((m) => {
      const data = getMonthBalanceData(m.month, m.income, m.expenses);
      return {
        ...m,
        ...data,
      };
    });
  }, [yearlyData, yearlyMonthlyTrackers]);

  const {
    overallTotalBalanceAdded,
    overallTotalUsage,
    totalAccumulatedSavings,
  } = useMemo(() => {
    let totalBalance = 0;
    let totalUsage = 0;

    for (const item of tab2MonthlyData) {
      totalBalance += item.monthlyAddedBalance;
      totalUsage += item.usage;
    }

    return {
      overallTotalBalanceAdded: totalBalance,
      overallTotalUsage: totalUsage,
      totalAccumulatedSavings: totalBalance - totalUsage,
    };
  }, [tab2MonthlyData]);

  // Excel Export (.xlsx)
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      if (reportType === "monthly" && monthlyData) {
        const monthName = MONTH_NAMES[selectedMonth - 1];
        const sheets: ExcelSheet[] = [
          {
            name: "Monthly Summary",
            headers: ["Metric", "Amount (₹)"],
            rows: [
              ["Total Balance Added This Month", totalBalanceAdded],
              ["Starting Balance", startingBal],
              ["Inflow / Income", actualInc],
              ["Usage This Month", usageThisMonth],
              ["Remaining Balance", remainingBalance],
              ["Overall Total Savings", overallTotalSavings],
            ],
          },
          {
            name: "Category Breakdown",
            headers: [
              "Category",
              "Budget Limit (₹)",
              "Actual Spent (₹)",
              "Remaining Budget (₹)",
              "% of Spending",
            ],
            rows: monthlyData.categories.map((cat) => {
              const totalExp = monthlyData.summary.netExpenses || 1;
              const pct = Math.round((cat.totalSpent / totalExp) * 100);
              return [
                cat.name,
                cat.budget !== null ? cat.budget : 0,
                cat.totalSpent,
                cat.remainingBudget !== null ? cat.remainingBudget : 0,
                cat.totalSpent > 0 ? `${pct}%` : "0%",
              ];
            }),
            footer: [
              `Total (${monthlyData.categories.length} Categories)`,
              totalBudgetLimit,
              totalActualSpent,
              totalRemainingBudget,
              "100%",
            ],
          },
        ];

        if (monthlyExecutedPlans.length > 0) {
          sheets.push({
            name: "Executed Bucket Plans",
            headers: [
              "Plan Name",
              "Destination",
              "Executed Date",
              "Category Breakdown",
              "Deducted from Savings (₹)",
            ],
            rows: monthlyExecutedPlans.map((p) => [
              p.planName,
              p.destination || "—",
              p.executedAt.split("T")[0],
              p.categoryBreakdown
                ?.map((c) => `${c.categoryName}: ₹${c.totalAmount}`)
                .join(", ") || "—",
              p.totalSpent,
            ]),
            footer: [
              "Total Executed Spending",
              "",
              "",
              "",
              monthlyExecutedPlans.reduce((sum, p) => sum + p.totalSpent, 0),
            ],
          });
        }

        exportToExcel(
          `balance_grid_monthly_analysis_${selectedYear}_${selectedMonth}_${monthName}`,
          sheets,
        );
      } else if (reportType === "yearly" && yearlyData) {
        const sheets: ExcelSheet[] = [
          {
            name: `Historical Summary ${selectedYear}`,
            headers: [
              "Month",
              "Monthly Added Balance (₹)",
              "Usage (₹)",
              "Saving (₹)",
              "Savings Remark",
            ],
            rows: yearlyData.months.map((m) => {
              const data = getMonthBalanceData(m.month, m.income, m.expenses);
              let remark = "—";
              if (m.hasData || data.hasData) {
                if (
                  data.isClosed &&
                  data.finalizedSavings !== null &&
                  data.finalizedSavings !== undefined
                ) {
                  remark = `Finalized: ₹${data.finalizedSavings}`;
                } else if (m.savings > 0) {
                  remark = `Saved: ₹${m.savings}`;
                } else if (data.saving > 0) {
                  remark = "Surplus Available";
                } else if (data.saving < 0) {
                  remark = "Deficit";
                } else {
                  remark = "Balanced";
                }
              }
              return [
                `${m.name} ${selectedYear}`,
                data.monthlyAddedBalance,
                data.usage,
                data.saving,
                remark,
              ];
            }),
            footer: [
              `Total Accumulated (${selectedYear})`,
              overallTotalBalanceAdded,
              overallTotalUsage,
              totalAccumulatedSavings,
              `Total Accumulated: ₹${totalAccumulatedSavings.toLocaleString("en-IN")}`,
            ],
          },
        ];

        if (yearlyExecutedPlans.length > 0) {
          sheets.push({
            name: "Executed Plans",
            headers: [
              "Plan Name",
              "Month/Year",
              "Executed Date",
              "Category Breakdown",
              "Deducted from Savings (₹)",
            ],
            rows: yearlyExecutedPlans.map((p) => [
              p.planName,
              `${MONTH_NAMES[p.month - 1]} ${p.year}`,
              p.executedAt.split("T")[0],
              p.categoryBreakdown
                ?.map((c) => `${c.categoryName}: ₹${c.totalAmount}`)
                .join(", ") || "—",
              p.totalSpent,
            ]),
            footer: [
              `Total Executed Plans (${selectedYear})`,
              "",
              "",
              "",
              yearlyExecutedPlans.reduce((sum, p) => sum + p.totalSpent, 0),
            ],
          });
        }

        exportToExcel(
          `balance_grid_historical_summary_${selectedYear}`,
          sheets,
        );
      }
    } catch (err) {
      console.error("Failed to export Excel spreadsheet:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading =
    reportType === "monthly"
      ? isLoadingMonthly
      : isLoadingYearly || isLoadingTrackers;

  return (
    <div className="space-y-6">
      <Topbar
        title="Financial Reports"
        subtitle="Historical financial performance, annual savings trends, and Excel spreadsheet export"
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              disabled={isExporting || isLoading}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-600" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              )}
              Export Excel (.xlsx)
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-8 space-y-6 ">
        {/* Controls Bar: Toggle Monthly/Yearly and Selector */}
        <div className="bg-white rounded-lg border border-surface-border p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="inline-flex p-1 bg-surface-muted border border-surface-border rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setReportType("monthly")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                reportType === "monthly"
                  ? "bg-white text-brand-700 shadow-2xs font-bold"
                  : "text-content-secondary hover:text-content-primary"
              }`}
            >
              Monthly Analysis
            </button>
            <button
              type="button"
              onClick={() => setReportType("yearly")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                reportType === "yearly"
                  ? "bg-white text-brand-700 shadow-2xs font-bold"
                  : "text-content-secondary hover:text-content-primary"
              }`}
            >
              Historical &amp; Monthly Summary
            </button>
          </div>

          <div className="flex items-center gap-2">
            {reportType === "monthly" && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs border border-surface-border rounded-md px-3 py-1.5 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs border border-surface-border rounded-md px-3 py-1.5 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content based on Report Type */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : reportType === "monthly" && monthlyData ? (
          <div className="space-y-6">
            {/* Top Summary Cards: Exactly matching the 4 Dashboard metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Total Balance Added This Month */}
              <Card className="border-l-4 border-l-brand-600 shadow-xs">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider">
                      Total Balance Added This Month
                    </span>
                    <div className="p-2 rounded-md bg-brand-50 text-brand-600">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <CurrencyDisplay
                    amount={totalBalanceAdded}
                    size="2xl"
                    className="font-bold text-brand-700"
                  />
                  <p className="text-[11px] text-content-secondary mt-1">
                    Start (₹{startingBal.toFixed(0)}) + Inflow (₹
                    {actualInc.toFixed(0)})
                  </p>
                </CardContent>
              </Card>

              {/* 2. Usage This Month */}
              <Card className="border-l-4 border-l-amber-500 shadow-xs">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider">
                      Usage This Month
                    </span>
                    <div className="p-2 rounded-md bg-amber-50 text-amber-600">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                  </div>
                  <CurrencyDisplay
                    amount={usageThisMonth}
                    size="2xl"
                    className="font-bold text-amber-700"
                  />
                  <p className="text-[11px] text-content-secondary mt-1">
                    Net expenses recorded this month
                  </p>
                </CardContent>
              </Card>

              {/* 3. Remaining Balance */}
              <Card
                className={`border-l-4 shadow-xs ${
                  remainingBalance < 0
                    ? "border-l-rose-500"
                    : "border-l-emerald-500"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider">
                      Remaining Balance
                    </span>
                    <div
                      className={`p-2 rounded-md ${
                        remainingBalance < 0
                          ? "bg-rose-50 text-rose-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <CurrencyDisplay
                    amount={remainingBalance}
                    size="2xl"
                    colored
                    showSign={false}
                    className="font-bold"
                  />
                  <p className="text-[11px] text-content-secondary mt-1">
                    {remainingBalance < 0
                      ? "Overspent relative to balance"
                      : "Available balance remaining"}
                  </p>
                </CardContent>
              </Card>

              {/* 4. Overall Total Savings */}
              <Card className="border-l-4 border-l-indigo-600 shadow-xs">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider">
                      Overall Total Savings
                    </span>
                    <div className="p-2 rounded-md bg-indigo-50 text-indigo-600">
                      <PiggyBank className="w-4 h-4" />
                    </div>
                  </div>
                  <CurrencyDisplay
                    amount={overallTotalSavings}
                    size="2xl"
                    className="font-bold text-indigo-700"
                  />
                  <p className="text-[11px] text-content-secondary mt-1">
                    Finalized + additional savings
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Category Analysis Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Category Spending vs Budget Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-surface-border bg-surface-muted text-content-secondary font-semibold">
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Budget Limit</th>
                        <th className="p-3 text-right">Actual Spent</th>
                        <th className="p-3 text-right">Remaining Budget</th>
                        <th className="p-3 text-right">% of Spending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {monthlyData.categories.map((cat) => {
                        const totalExp = monthlyData.summary.netExpenses || 1;
                        const pct = Math.round(
                          (cat.totalSpent / totalExp) * 100,
                        );
                        return (
                          <tr key={cat.id} className="hover:bg-slate-50">
                            <td className="p-3 font-medium text-content-primary">
                              {cat.name}
                            </td>
                            <td className="p-3 text-right">
                              {cat.budget !== null ? (
                                <CurrencyDisplay
                                  amount={cat.budget}
                                  size="sm"
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-3 text-right font-semibold">
                              <CurrencyDisplay
                                amount={cat.totalSpent}
                                size="sm"
                              />
                            </td>
                            <td className="p-3 text-right">
                              {cat.remainingBudget !== null ? (
                                <CurrencyDisplay
                                  amount={cat.remainingBudget}
                                  size="sm"
                                  colored
                                  showSign={false}
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-3 text-right text-content-secondary font-mono">
                              {cat.totalSpent > 0 ? `${pct}%` : "0%"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Summary Footer Row */}
                    <tfoot>
                      <tr className="bg-surface-muted/70 border-t-2 border-surface-border font-bold text-xs text-content-primary">
                        <td className="p-3">
                          Total ({monthlyData.categories.length}{" "}
                          {monthlyData.categories.length === 1
                            ? "Category"
                            : "Categories"}
                          )
                        </td>
                        <td className="p-3 text-right">
                          <CurrencyDisplay
                            amount={totalBudgetLimit}
                            size="sm"
                          />
                        </td>
                        <td className="p-3 text-right text-amber-700">
                          <CurrencyDisplay
                            amount={totalActualSpent}
                            size="sm"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <CurrencyDisplay
                            amount={totalRemainingBudget}
                            size="sm"
                            colored
                            showSign={false}
                          />
                        </td>
                        <td className="p-3 text-right text-content-secondary font-mono">
                          100%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Executed Bucket Plans in Tab 1 */}
            {monthlyExecutedPlans.length > 0 && (
              <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/40 via-teal-50/20 to-white shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-emerald-950 flex items-center gap-2">
                          <span>Executed Bucket Plans &amp; Savings Allocation</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            Financed from Overall Savings
                          </span>
                        </CardTitle>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Special life experiences and goals executed during {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-800 font-medium">Total Deducted:</span>
                      <span className="text-sm font-bold text-emerald-800 bg-white px-2.5 py-1 rounded border border-emerald-200">
                        ₹{monthlyExecutedPlans.reduce((sum, p) => sum + p.totalSpent, 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y divide-emerald-100 border border-emerald-200 rounded-lg bg-white overflow-hidden">
                    {monthlyExecutedPlans.map((p) => (
                      <div key={p.planId} className="p-3.5 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              {p.planName}
                              {p.destination && (
                                <span className="text-[11px] text-content-secondary font-normal">
                                  ({p.destination})
                                </span>
                              )}
                            </h5>
                            <span className="text-[10px] text-content-secondary">
                              Executed on {formatDate(p.executedAt)} • Budget: ₹{p.budget.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 shrink-0 self-start sm:self-auto">
                            ₹{p.totalSpent.toLocaleString("en-IN")} from Savings
                          </span>
                        </div>

                        {/* Category breakdown */}
                        {p.categoryBreakdown && p.categoryBreakdown.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-100">
                            <span className="text-[10px] uppercase tracking-wider text-content-secondary font-semibold block mb-1">
                              Category Spending Breakdown:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {p.categoryBreakdown.map((cat) => (
                                <span
                                  key={cat.categoryName}
                                  className="text-[11px] bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1"
                                >
                                  <span>{cat.categoryName}:</span>
                                  <strong className="font-semibold text-slate-900">
                                    ₹{cat.totalAmount.toLocaleString("en-IN")}
                                  </strong>
                                  <span className="text-[10px] text-slate-500">
                                    ({cat.percentage}%)
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : reportType === "yearly" && yearlyData ? (
          <div className="space-y-6">
            {/* Top Metrics Cards: Mirroring Accounts Module 2-Card Style */}
            <div className="bg-white rounded-lg border border-surface-border p-6 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-surface-border">
              {/* Card 1: Overall Total Balance Added */}
              <div>
                <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider  flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-brand-600" /> Overall
                  Total Balance Added
                </span>
                <CurrencyDisplay
                  amount={overallTotalBalanceAdded}
                  size="2xl"
                  className="mt-1 font-bold text-brand-700"
                />
                <p className="text-[11px] text-content-secondary mt-1">
                  Sum of all monthly added balances across recorded months (
                  {selectedYear})
                </p>
              </div>

              {/* Card 2: Overall Total Usage */}
              <div className="pt-4 sm:pt-0 sm:pl-6">
                <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider  flex items-center gap-1.5">
                  <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />{" "}
                  Overall Total Usage
                </span>
                <CurrencyDisplay
                  amount={overallTotalUsage}
                  size="2xl"
                  className="mt-1 text-amber-600 font-bold"
                />
                <p className="text-[11px] text-content-secondary mt-1">
                  Sum of all monthly spending across recorded months (
                  {selectedYear})
                </p>
              </div>
              {/* Card 3: You saved */}
              <div className="pt-4 sm:pt-0 sm:pl-6">
                <span className="text-xs font-semibold uppercase text-green-600 tracking-wider  flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-green-600" /> You
                  saved
                </span>
                <CurrencyDisplay
                  amount={totalAccumulatedSavings}
                  size="2xl"
                  className="mt-1 text-green-600 font-bold"
                />
                <p className="text-[11px] text-content-secondary mt-1">
                  Sum of all monthly savings across recorded months (
                  {selectedYear})
                </p>
              </div>
            </div>

            {/* Historical & Monthly Summary Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Historical &amp; Monthly Summary ({selectedYear})
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Download .xlsx
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-surface-border bg-surface-muted text-content-secondary font-semibold">
                        <th className="p-3">Month</th>
                        <th className="p-3 text-right">
                          Monthly Added Balance
                        </th>
                        <th className="p-3 text-right">Usage</th>
                        <th className="p-3 text-right">Saving</th>
                        <th className="p-3 text-right">Savings Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {tab2MonthlyData.map((m) => {
                        return (
                          <tr key={m.month} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-content-primary">
                              {m.name} {selectedYear}
                            </td>
                            <td className="p-3 text-right font-medium">
                              <CurrencyDisplay
                                amount={m.monthlyAddedBalance}
                                size="sm"
                              />
                            </td>
                            <td className="p-3 text-right font-medium text-amber-700">
                              <CurrencyDisplay amount={m.usage} size="sm" />
                            </td>
                            <td className="p-3 text-right font-semibold">
                              <CurrencyDisplay
                                amount={m.saving}
                                size="sm"
                                colored
                                showSign={false}
                              />
                            </td>
                            <td className="p-3 text-right">
                              {(() => {
                                const monthExecuted = getExecutedPlansForPeriod(
                                  selectedYear,
                                  m.month
                                );
                                const execSum = monthExecuted.reduce(
                                  (sum, p) => sum + p.totalSpent,
                                  0
                                );

                                return (
                                  <div className="flex flex-col items-end gap-1">
                                    {m.hasData ? (
                                      m.isClosed &&
                                      m.finalizedSavings !== null &&
                                      m.finalizedSavings !== undefined ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          Finalized: ₹
                                          {m.finalizedSavings.toLocaleString("en-IN")}
                                        </span>
                                      ) : m.savings > 0 ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          Saved: ₹{m.savings.toLocaleString("en-IN")}
                                        </span>
                                      ) : m.saving > 0 ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-50 text-brand-700 border border-brand-200">
                                          Surplus
                                        </span>
                                      ) : m.saving < 0 ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                          Deficit
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                          Balanced
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-content-muted">—</span>
                                    )}

                                    {monthExecuted.length > 0 && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        title={monthExecuted
                                          .map((p) => `${p.planName} (₹${p.totalSpent})`)
                                          .join(", ")}
                                      >
                                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                        {monthExecuted.length === 1
                                          ? `${monthExecuted[0].planName}: ₹${execSum.toLocaleString("en-IN")}`
                                          : `${monthExecuted.length} Executed: ₹${execSum.toLocaleString("en-IN")}`}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Overall Aggregate Footer */}
                    <tfoot>
                      <tr className="bg-surface-muted/70 border-t-2 border-surface-border font-bold text-xs text-content-primary">
                        <td className="p-3">
                          Total Accumulated ({selectedYear})
                        </td>
                        <td className="p-3 text-right">
                          <CurrencyDisplay
                            amount={overallTotalBalanceAdded}
                            size="sm"
                          />
                        </td>
                        <td className="p-3 text-right text-amber-700">
                          <CurrencyDisplay
                            amount={overallTotalUsage}
                            size="sm"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <CurrencyDisplay
                            amount={totalAccumulatedSavings}
                            size="sm"
                            colored
                            showSign={false}
                          />
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-indigo-700">
                              ₹{totalAccumulatedSavings.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] font-normal text-content-muted">
                              Total Accumulated Savings
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Annual Executed Bucket Plans in Tab 2 */}
            {yearlyExecutedPlans.length > 0 && (
              <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/40 via-teal-50/20 to-white shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-emerald-950 flex items-center gap-2">
                          <span>Annual Executed Bucket Plans ({selectedYear})</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            Financed from Savings
                          </span>
                        </CardTitle>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Summary of special goals and bucket list items executed in {selectedYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-800 font-medium">Total Deducted:</span>
                      <span className="text-sm font-bold text-emerald-800 bg-white px-2.5 py-1 rounded border border-emerald-200">
                        ₹{yearlyExecutedPlans.reduce((sum, p) => sum + p.totalSpent, 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y divide-emerald-100 border border-emerald-200 rounded-lg bg-white overflow-hidden">
                    {yearlyExecutedPlans.map((p) => (
                      <div key={p.planId} className="p-3.5 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              {p.planName}
                              <span className="text-[11px] text-content-secondary font-normal">
                                ({MONTH_NAMES[p.month - 1]} {p.year})
                              </span>
                            </h5>
                            <span className="text-[10px] text-content-secondary">
                              Executed on {formatDate(p.executedAt)} • Budget: ₹{p.budget.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 shrink-0 self-start sm:self-auto">
                            ₹{p.totalSpent.toLocaleString("en-IN")} from Savings
                          </span>
                        </div>

                        {/* Category breakdown */}
                        {p.categoryBreakdown && p.categoryBreakdown.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-100">
                            <span className="text-[10px] uppercase tracking-wider text-content-secondary font-semibold block mb-1">
                              Category Spending Breakdown:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {p.categoryBreakdown.map((cat) => (
                                <span
                                  key={cat.categoryName}
                                  className="text-[11px] bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1"
                                >
                                  <span>{cat.categoryName}:</span>
                                  <strong className="font-semibold text-slate-900">
                                    ₹{cat.totalAmount.toLocaleString("en-IN")}
                                  </strong>
                                  <span className="text-[10px] text-slate-500">
                                    ({cat.percentage}%)
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
