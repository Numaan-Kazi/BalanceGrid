import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ArrowRight, Receipt, Loader2, PieChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BucketPlan,
  MonthlyTrackerResponse,
  RecurringBill,
  SavingsSummary,
} from "@/types";
import { api } from "@/lib/api";
import { Topbar } from "@/components/layout/Topbar";
import { MonthYearPicker } from "@/components/common/MonthYearPicker";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { BucketPlanModal } from "@/components/bucketList/BucketPlanModal";
import { useAuth } from "@/context/AuthContext";

export const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  console.log("User Dashboard:", user);
  

  // Consistent active month/year state
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  );

  // Modals state
  const [isBucketModalOpen, setIsBucketModalOpen] = useState(false);

  // Queries
  const { data: trackerData, isLoading: isLoadingTracker } =
    useQuery<MonthlyTrackerResponse>({
      queryKey: ["monthlyTracker", selectedYear, selectedMonth],
      queryFn: () =>
        api.get(`/monthly?year=${selectedYear}&month=${selectedMonth}`),
    });

  const { data: savingsSummary } = useQuery<SavingsSummary>({
    queryKey: ["savingsSummary"],
    queryFn: () => api.get("/accounts/savings-summary"),
  });

  const { data: billsData } = useQuery<{ bills: RecurringBill[] }>({
    queryKey: ["recurringBills"],
    queryFn: () => api.get("/recurring-bills"),
  });

  useQuery<{ plans: BucketPlan[] }>({
    queryKey: ["bucketPlans"],
    queryFn: () => api.get("/bucket-plans"),
  });

  // Invalidate queries after action mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["monthlyTracker"] });
    queryClient.invalidateQueries({ queryKey: ["savingsSummary"] });
    queryClient.invalidateQueries({ queryKey: ["bucketPlans"] });
    queryClient.invalidateQueries({ queryKey: ["recurringBills"] });
  };

  const bucketMutation = useMutation({
    mutationFn: (data: any) => api.post("/bucket-plans", data),
    onSuccess: invalidateAll,
  });

  // Top spending categories for compact breakdown
  const sortedCategories = [...(trackerData?.categories || [])]
    .filter((c) => c.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  const startingBal = trackerData?.period?.startingBalance ?? 0;
  const actualInc = trackerData?.summary?.actualIncome ?? 0;
  const totalBalanceThisMonth =
    trackerData?.summary?.totalBalanceAdded ?? startingBal + actualInc;
  const usageThisMonth =
    trackerData?.summary?.usageThisMonth ??
    trackerData?.summary?.netExpenses ??
    0;
  const remainingBudgetThisMonth =
    trackerData?.summary?.remainingBalance ??
    totalBalanceThisMonth - usageThisMonth;

  return (
    <div className="space-y-6">
      <Topbar
        title={`welcome back, ${user?.name  || "User"} 👋`}
        subtitle="Real-time balance, earnings, and monthly financial metrics"
        action={
          <MonthYearPicker
            year={selectedYear}
            month={selectedMonth}
            onChange={(y, m) => {
              setSelectedYear(y);
              setSelectedMonth(m);
            }}
          />
        }
      />

      <div className="px-4 sm:px-8 space-y-6 ">
        {isLoadingTracker ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : trackerData ? (
          <>
          {/* <h1>Hii Welcome to our app {user?.name}</h1> */}
            {/* Primary Metrics: Exactly 4 Cards */}
            <SummaryCards
              overallTotalSavings={savingsSummary?.overallTotalSavings ?? 0}
              totalBalanceThisMonth={totalBalanceThisMonth}
              usageThisMonth={usageThisMonth}
              remainingBudgetThisMonth={remainingBudgetThisMonth}
              startingBalance={startingBal}
              actualIncome={actualInc}
            />

            {/* Quick Actions (Without Add Income & Allocate Savings) */}
            <QuickActions
              onAddExpense={() => navigate("/monthly")}
              onAddBucketPlan={() => setIsBucketModalOpen(true)}
            />

            {/* Two-Column Auxiliary Cards: Category Breakdown & Upcoming Bills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Breakdown */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-brand-600" />
                    <CardTitle className="text-sm font-semibold">
                      Top Spending Categories
                    </CardTitle>
                  </div>
                  <button
                    onClick={() => navigate("/monthly")}
                    className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    View tracker <ArrowRight className="w-3 h-3" />
                  </button>
                </CardHeader>
                <CardContent className="pt-2">
                  {sortedCategories.length === 0 ? (
                    <p className="text-xs text-content-muted py-6 text-center">
                      No expenses recorded for this month yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sortedCategories.map((cat) => {
                        const totalExpense =
                          trackerData.summary.netExpenses || 1;
                        const pct = Math.round(
                          (cat.totalSpent / totalExpense) * 100,
                        );
                        return (
                          <div key={cat.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-content-primary">
                                {cat.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <CurrencyDisplay
                                  amount={cat.totalSpent}
                                  size="sm"
                                />
                                <span className="text-[11px] text-content-secondary">
                                  ({pct}%)
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-brand-600 rounded-full"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Recurring Bills */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-brand-600" />
                    <CardTitle className="text-sm font-semibold">
                      Upcoming Recurring Bills
                    </CardTitle>
                  </div>
                  <button
                    onClick={() => navigate("/recurring-bills")}
                    className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    All bills <ArrowRight className="w-3 h-3" />
                  </button>
                </CardHeader>
                <CardContent className="pt-2">
                  {!billsData?.bills || billsData.bills.length === 0 ? (
                    <p className="text-xs text-content-muted py-6 text-center">
                      No recurring bills configured.
                    </p>
                  ) : (
                    <div className="divide-y divide-surface-border">
                      {billsData.bills.slice(0, 4).map((bill) => (
                        <div
                          key={bill.id}
                          className="py-2.5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-content-primary block">
                              {bill.name}
                            </span>
                            <span className="text-[11px] text-content-secondary">
                              Due: {bill.displayDueDate || bill.nextDueDate} • {bill.frequency}
                            </span>
                          </div>
                          <CurrencyDisplay amount={bill.amount} size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>

      {/* Bucket Plan Modal */}
      <BucketPlanModal
        isOpen={isBucketModalOpen}
        onClose={() => setIsBucketModalOpen(false)}
        onSubmit={async (data) => {
          await bucketMutation.mutateAsync(data);
        }}
      />
    </div>
  );
};
