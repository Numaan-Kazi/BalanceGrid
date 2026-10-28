import Decimal from 'decimal.js';
import { prisma } from '../db/prisma';
import { getMonthlyWeeks, WeekRange } from '../domain/weeks';
import {
  calculateMonthlySurplus,
  calculateUnallocatedSurplus,
  calculateBudgetUsage,
  toFixedNumber,
} from '../domain/calculations';
import { AppError } from '../middleware/errorHandler';

export interface MonthlyTrackerDetails {
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
    usageThisMonth: number; // Net expenses counted exactly once
    remainingBalance: number; // totalBalanceAdded - usageThisMonth
    netExpenses: number;
    monthlySurplus: number;
    savingsAllocations: number;
    unallocatedSurplus: number;
    overallBudget: number | null;
    remainingBudget: number | null;
    isBudgetOverspent: boolean;
  };
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    budget: number | null;
    totalSpent: number;
    remainingBudget: number | null;
    isOverspent: boolean;
    weeks: Array<{
      weekNumber: number;
      mode: 'SUMMARY' | 'DETAILED';
      status: 'UNREPORTED' | 'ZERO_SPENT' | 'RECORDED';
      summaryAmount: number;
      detailedTotal: number;
      detailedCount: number;
      effectiveSpent: number;
      stateId: string;
    }>;
  }>;
  weeklyTotals: Array<{
    weekNumber: number;
    label: string;
    totalSpent: number;
  }>;
}

export const getOrCreateMonthlyPeriod = async (userId: string, year: number, month: number) => {
  if (month < 1 || month > 12) {
    throw new AppError('Month must be between 1 and 12', 400);
  }

  // Find existing period
  let period = await prisma.monthlyPeriod.findUnique({
    where: {
      userId_year_month: { userId, year, month },
    },
  });

  if (!period) {
    // Upsert safely using transaction to prevent concurrency race conditions
    period = await prisma.monthlyPeriod.upsert({
      where: {
        userId_year_month: { userId, year, month },
      },
      update: {},
      create: {
        userId,
        year,
        month,
      },
    });
  }

  return period;
};

export const getMonthlyTrackerData = async (
  userId: string,
  year: number,
  month: number
): Promise<MonthlyTrackerDetails> => {
  const period = await getOrCreateMonthlyPeriod(userId, year, month);
  const weeks = getMonthlyWeeks(year, month);

  // Fetch all user categories
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });

  // Fetch category budgets for this month
  const categoryBudgets = await prisma.categoryBudget.findMany({
    where: { monthlyPeriodId: period.id },
  });
  const budgetMap = new Map<string, Decimal>();
  categoryBudgets.forEach(b => budgetMap.set(b.categoryId, b.amount));

  // Fetch or initialize weekly category tracking states
  const existingStates = await prisma.weeklyCategoryState.findMany({
    where: { monthlyPeriodId: period.id },
  });

  const stateMap = new Map<string, any>();
  existingStates.forEach(s => {
    stateMap.set(`${s.categoryId}_${s.weekNumber}`, s);
  });

  // Fetch detailed expenses for this monthly period
  const expenses = await prisma.expense.findMany({
    where: { monthlyPeriodId: period.id, userId },
  });

  // Fetch incomes for this monthly period
  const incomes = await prisma.income.findMany({
    where: { monthlyPeriodId: period.id, userId },
  });
  let totalIncome = new Decimal(0);
  incomes.forEach(i => {
    totalIncome = totalIncome.plus(i.amount);
  });

  // Fetch savings allocations for this monthly period
  const allocations = await prisma.savingsAllocation.findMany({
    where: { monthlyPeriodId: period.id, userId },
  });
  let totalAllocations = new Decimal(0);
  allocations.forEach(a => {
    totalAllocations = totalAllocations.plus(a.amount);
  });

  // Build category-week matrix
  const categoryResults: MonthlyTrackerDetails['categories'] = [];
  let monthTotalNetExpenses = new Decimal(0);
  const weekTotalMap = new Map<number, Decimal>();
  weeks.forEach(w => weekTotalMap.set(w.weekNumber, new Decimal(0)));

  for (const cat of categories) {
    let categoryTotalSpent = new Decimal(0);
    const catWeeks: MonthlyTrackerDetails['categories'][0]['weeks'] = [];

    for (const w of weeks) {
      const key = `${cat.id}_${w.weekNumber}`;
      let state = stateMap.get(key);

      if (!state) {
        // Create state on demand
        state = await prisma.weeklyCategoryState.create({
          data: {
            userId,
            monthlyPeriodId: period.id,
            categoryId: cat.id,
            weekNumber: w.weekNumber,
            mode: 'SUMMARY',
            status: 'UNREPORTED',
            summaryAmount: new Decimal(0),
          },
        });
        stateMap.set(key, state);
      }

      // Filter detailed expenses for this category & week
      const detailedForCatWeek = expenses.filter(
        e => e.categoryId === cat.id && e.weekNumber === w.weekNumber
      );
      let detailedSum = new Decimal(0);
      detailedForCatWeek.forEach(e => {
        detailedSum = detailedSum.plus(new Decimal(e.amount).minus(e.refundAmount || 0));
      });

      // Calculate effective spent based on active mode
      let effectiveSpent = new Decimal(0);
      if (state.mode === 'SUMMARY') {
        if (state.status === 'ZERO_SPENT') {
          effectiveSpent = new Decimal(0);
        } else if (state.status === 'RECORDED') {
          effectiveSpent = new Decimal(state.summaryAmount);
        }
      } else {
        // DETAILED mode
        effectiveSpent = detailedSum;
      }

      categoryTotalSpent = categoryTotalSpent.plus(effectiveSpent);
      monthTotalNetExpenses = monthTotalNetExpenses.plus(effectiveSpent);

      const currentWeekTotal = weekTotalMap.get(w.weekNumber) || new Decimal(0);
      weekTotalMap.set(w.weekNumber, currentWeekTotal.plus(effectiveSpent));

      catWeeks.push({
        weekNumber: w.weekNumber,
        mode: state.mode,
        status: state.status,
        summaryAmount: toFixedNumber(state.summaryAmount),
        detailedTotal: toFixedNumber(detailedSum),
        detailedCount: detailedForCatWeek.length,
        effectiveSpent: toFixedNumber(effectiveSpent),
        stateId: state.id,
      });
    }

    const catBudget = budgetMap.get(cat.id);
    const catBudgetNum = catBudget ? toFixedNumber(catBudget) : null;
    const catUsage = catBudget ? calculateBudgetUsage(categoryTotalSpent, catBudget) : null;

    categoryResults.push({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      budget: catBudgetNum,
      totalSpent: toFixedNumber(categoryTotalSpent),
      remainingBudget: catUsage ? toFixedNumber(catUsage.remainingBudget) : null,
      isOverspent: catUsage ? catUsage.isOverspent : false,
      weeks: catWeeks,
    });
  }

  // Monthly summary metrics
  const monthlySurplus = calculateMonthlySurplus(totalIncome, monthTotalNetExpenses);
  const unallocatedSurplus = calculateUnallocatedSurplus(monthlySurplus, totalAllocations);

  const overallBudget = period.overallBudget ? new Decimal(period.overallBudget) : null;
  const overallBudgetUsage = overallBudget
    ? calculateBudgetUsage(monthTotalNetExpenses, overallBudget)
    : null;

  const startingBalance = new Decimal(period.startingBalance || 0);
  const totalBalanceAdded = startingBalance.plus(totalIncome);
  const usageThisMonth = monthTotalNetExpenses;
  const remainingBalance = totalBalanceAdded.minus(usageThisMonth);

  const weeklyTotals = weeks.map(w => ({
    weekNumber: w.weekNumber,
    label: w.label,
    totalSpent: toFixedNumber(weekTotalMap.get(w.weekNumber) || 0),
  }));

  return {
    period: {
      id: period.id,
      year: period.year,
      month: period.month,
      overallBudget: period.overallBudget ? toFixedNumber(period.overallBudget) : null,
      startingBalance: toFixedNumber(startingBalance),
      isClosed: period.isClosed,
      closedAt: period.closedAt ? period.closedAt.toISOString() : null,
      finalizedSavings: period.finalizedSavings ? toFixedNumber(period.finalizedSavings) : null,
      notes: period.notes,
    },
    weeks,
    summary: {
      startingBalance: toFixedNumber(startingBalance),
      actualIncome: toFixedNumber(totalIncome),
      totalBalanceAdded: toFixedNumber(totalBalanceAdded),
      usageThisMonth: toFixedNumber(usageThisMonth),
      remainingBalance: toFixedNumber(remainingBalance),
      netExpenses: toFixedNumber(monthTotalNetExpenses),
      monthlySurplus: toFixedNumber(monthlySurplus),
      savingsAllocations: toFixedNumber(totalAllocations),
      unallocatedSurplus: toFixedNumber(unallocatedSurplus),
      overallBudget: overallBudget ? toFixedNumber(overallBudget) : null,
      remainingBudget: overallBudgetUsage ? toFixedNumber(overallBudgetUsage.remainingBudget) : null,
      isBudgetOverspent: overallBudgetUsage ? overallBudgetUsage.isOverspent : false,
    },
    categories: categoryResults,
    weeklyTotals,
  };
};

export const setMonthlyStartingBalance = async (
  userId: string,
  periodId: string,
  startingBalance: number
) => {
  const period = await prisma.monthlyPeriod.findFirst({
    where: { id: periodId, userId },
  });
  if (!period) throw new AppError('Monthly period not found', 404);
  if (period.isClosed) {
    throw new AppError('Closed months are read-only and cannot be modified', 400);
  }

  return prisma.monthlyPeriod.update({
    where: { id: periodId },
    data: { startingBalance: new Decimal(startingBalance) },
  });
};

export const closeMonthlyPeriod = async (
  userId: string,
  periodId: string,
  notes?: string
) => {
  const period = await prisma.monthlyPeriod.findFirst({
    where: { id: periodId, userId },
  });
  if (!period) throw new AppError('Monthly period not found', 404);
  if (period.isClosed) throw new AppError('This month is already closed and finalized', 400);

  // Incomes
  const incomeAgg = await prisma.income.aggregate({
    where: { userId, monthlyPeriodId: periodId },
    _sum: { amount: true },
  });
  const totalIncome = incomeAgg._sum.amount || new Decimal(0);

  // Expenses
  const expenses = await prisma.expense.findMany({
    where: { userId, monthlyPeriodId: periodId },
    select: { amount: true, refundAmount: true },
  });
  let netExpenses = new Decimal(0);
  for (const e of expenses) {
    netExpenses = netExpenses.plus(new Decimal(e.amount).minus(e.refundAmount || 0));
  }

  // Summary mode expenses
  const summaryStates = await prisma.weeklyCategoryState.findMany({
    where: { monthlyPeriodId: periodId, mode: 'SUMMARY', status: 'RECORDED' },
    select: { summaryAmount: true },
  });
  for (const s of summaryStates) {
    netExpenses = netExpenses.plus(s.summaryAmount || 0);
  }

  // Allocations
  const allocAgg = await prisma.savingsAllocation.aggregate({
    where: { userId, monthlyPeriodId: periodId },
    _sum: { amount: true },
  });
  const totalAllocations = allocAgg._sum.amount || new Decimal(0);

  const startingBal = new Decimal(period.startingBalance || 0);
  const remainingBal = startingBal.plus(totalIncome).minus(netExpenses);
  const finalizedSavings = Decimal.max(0, remainingBal);

  return prisma.monthlyPeriod.update({
    where: { id: periodId },
    data: {
      isClosed: true,
      closedAt: new Date(),
      finalizedSavings,
      notes: notes !== undefined ? notes : period.notes,
    },
  });
};

export const updateMonthlyBudgetAndNotes = async (
  userId: string,
  monthlyPeriodId: string,
  data: { overallBudget?: number | null; notes?: string | null }
) => {
  const period = await prisma.monthlyPeriod.findFirst({
    where: { id: monthlyPeriodId, userId },
  });
  if (!period) {
    throw new AppError('Monthly period not found', 404);
  }
  if (period.isClosed) {
    throw new AppError('Closed months are read-only and cannot be modified', 400);
  }

  return prisma.monthlyPeriod.update({
    where: { id: monthlyPeriodId },
    data: {
      overallBudget: data.overallBudget !== undefined ? (data.overallBudget !== null ? new Decimal(data.overallBudget) : null) : period.overallBudget,
      notes: data.notes !== undefined ? data.notes : period.notes,
    },
  });
};

export const setCategoryBudget = async (
  userId: string,
  data: { monthlyPeriodId: string; categoryId: string; amount: number }
) => {
  // Verify period ownership
  const period = await prisma.monthlyPeriod.findFirst({
    where: { id: data.monthlyPeriodId, userId },
  });
  if (!period) {
    throw new AppError('Monthly period not found', 404);
  }
  if (period.isClosed) {
    throw new AppError('Closed months are read-only and cannot be modified', 400);
  }

  // Verify category ownership
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return prisma.categoryBudget.upsert({
    where: {
      monthlyPeriodId_categoryId: {
        monthlyPeriodId: data.monthlyPeriodId,
        categoryId: data.categoryId,
      },
    },
    update: {
      amount: new Decimal(data.amount),
    },
    create: {
      userId,
      monthlyPeriodId: data.monthlyPeriodId,
      categoryId: data.categoryId,
      amount: new Decimal(data.amount),
    },
  });
};

