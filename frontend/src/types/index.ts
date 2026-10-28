export type AccountType = 'BANK' | 'CASH' | 'WALLET' | 'OTHER';
export type ExpenseMode = 'SUMMARY' | 'DETAILED';
export type WeeklyStatus = 'UNREPORTED' | 'ZERO_SPENT' | 'RECORDED';
export type PlanStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
export type BillFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  openingBalanceDate: string;
  isActive: boolean;
  currentBalance: number;
  incomingIncome: number;
  incomingTransfers: number;
  outgoingTransfers: number;
  expenses: number;
  positiveAdjustments: number;
  negativeAdjustments: number;
  outgoingSavingsTransfers: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  isDefault: boolean;
  isArchived?: boolean;
}

export interface WeekRange {
  weekNumber: number;
  startDate: string;
  endDate: string;
  startDay: number;
  endDay: number;
  label: string;
}

export interface CategoryWeekState {
  weekNumber: number;
  mode: ExpenseMode;
  status: WeeklyStatus;
  summaryAmount: number;
  detailedTotal: number;
  detailedCount: number;
  effectiveSpent: number;
  stateId: string;
}

export interface CategoryTrackerRow {
  id: string;
  name: string;
  icon: string;
  budget: number | null;
  totalSpent: number;
  remainingBudget: number | null;
  isOverspent: boolean;
  weeks: CategoryWeekState[];
}

export interface MonthlyTrackerResponse {
  period: {
    id: string;
    year: number;
    month: number;
    overallBudget: number | null;
    startingBalance: number;
    isClosed: boolean;
    closedAt: string | null;
    finalizedSavings: number | null;
    notes: string | null;
  };
  weeks: WeekRange[];
  summary: {
    startingBalance: number;
    actualIncome: number;
    totalBalanceAdded: number; // Starting balance + income added this month
    usageThisMonth: number; // Actual expenses counted once
    remainingBalance: number; // totalBalanceAdded - usageThisMonth
    netExpenses: number;
    monthlySurplus: number;
    savingsAllocations: number;
    unallocatedSurplus: number;
    overallBudget: number | null;
    remainingBudget: number | null;
    isBudgetOverspent: boolean;
  };
  categories: CategoryTrackerRow[];
  weeklyTotals: Array<{
    weekNumber: number;
    label: string;
    totalSpent: number;
  }>;
}

export interface Expense {
  id: string;
  accountId: string;
  categoryId: string;
  monthlyPeriodId: string;
  weeklyCategoryStateId?: string | null;
  amount: number;
  refundAmount: number;
  date: string;
  weekNumber: number;
  description?: string | null;
  bucketPlanId?: string | null;
  category?: { id: string; name: string; icon?: string };
  account?: { id: string; name: string };
  bucketPlan?: { id: string; name: string } | null;
}

export interface Income {
  id: string;
  accountId: string;
  monthlyPeriodId: string;
  amount: number;
  date: string;
  source: string;
  description?: string | null;
  account?: { id: string; name: string; type: AccountType };
}

export interface AccountTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string | null;
  fromAccount: { id: string; name: string; type: AccountType };
  toAccount: { id: string; name: string; type: AccountType };
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  notes: string | null;
  isCompleted: boolean;
  totalAllocated: number;
  remainingNeeded: number;
  percentageComplete: number;
  allocations: Array<{
    id: string;
    amount: number;
    date: string;
    monthlyPeriodId: string;
    fromAccountId: string | null;
    notes: string | null;
  }>;
}

export interface BucketPlan {
  id: string;
  name: string;
  destination: string | null;
  targetYear: number | null;
  targetMonth: number | null;
  budget: number;
  status: PlanStatus;
  notes: string | null;
  totalSpent: number;
  remainingBudget: number;
  percentageSpent: number;
  isOverBudget?: boolean;
  excessAmount?: number;
  categoryBreakdown?: Array<{
    categoryName: string;
    totalAmount: number;
    percentage: number;
  }>;
  expenses: Array<{
    id: string;
    amount: number;
    refundAmount: number;
    netAmount: number;
    date: string;
    description: string | null;
    categoryId?: string;
    categoryName: string;
    accountId?: string;
    accountName: string;
  }>;
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  frequency: BillFrequency;
  nextDueDate: string;
  displayDueDate?: string;
  status?: 'PENDING' | 'PAID' | 'OVERDUE';
  canPay?: boolean;
  lastPaidDate?: string | null;
  hasPaidHistory?: boolean;
  isEditable?: boolean;
  isDeletable?: boolean;
  notes: string | null;
  isActive: boolean;
  payments: Array<{
    id: string;
    amount: number;
    dueDate: string;
    paidDate: string | null;
    status: 'PENDING' | 'PAID' | 'SKIPPED';
  }>;
}

export interface AdditionalSavings {
  id: string;
  title: string;
  amount: number;
  date: string;
  notes?: string | null;
  createdAt: string;
}

export interface SavingsSummary {
  overallTotalSavings: number;
  finalizedMonthlySavings: number;
  netAdditionalSavings: number;
  additionalSavings: AdditionalSavings[];
}

export interface YearlyReport {
  year: number;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    annualSurplus: number;
    totalSavingsAllocated: number;
    unallocatedSurplus: number;
  };
  months: Array<{
    month: number;
    name: string;
    hasData: boolean;
    income: number;
    expenses: number;
    surplus: number;
    savings: number;
    unallocated: number;
  }>;
}

