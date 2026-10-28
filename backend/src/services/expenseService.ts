import Decimal from 'decimal.js';
import { prisma } from '../db/prisma';
import { getWeekNumberForDate } from '../domain/weeks';
import { getOrCreateMonthlyPeriod } from './monthlyService';
import { AppError } from '../middleware/errorHandler';

export const updateWeeklySummaryAmount = async (
  userId: string,
  data: {
    monthlyPeriodId: string;
    categoryId: string;
    weekNumber: number;
    summaryAmount: number;
    status?: 'RECORDED' | 'ZERO_SPENT' | 'UNREPORTED';
  }
) => {
  // Verify monthlyPeriod ownership
  const period = await prisma.monthlyPeriod.findFirst({
    where: { id: data.monthlyPeriodId, userId },
  });
  if (!period) {
    throw new AppError('Monthly period not found', 404);
  }
  if (period.isClosed) {
    throw new AppError('Cannot modify expenses in a closed/finalized month', 400);
  }

  // Verify category ownership
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const status = data.summaryAmount === 0 && data.status === 'ZERO_SPENT' ? 'ZERO_SPENT' : 'RECORDED';

  return prisma.weeklyCategoryState.upsert({
    where: {
      monthlyPeriodId_categoryId_weekNumber: {
        monthlyPeriodId: data.monthlyPeriodId,
        categoryId: data.categoryId,
        weekNumber: data.weekNumber,
      },
    },
    update: {
      mode: 'SUMMARY',
      status,
      summaryAmount: new Decimal(data.summaryAmount),
    },
    create: {
      userId,
      monthlyPeriodId: data.monthlyPeriodId,
      categoryId: data.categoryId,
      weekNumber: data.weekNumber,
      mode: 'SUMMARY',
      status,
      summaryAmount: new Decimal(data.summaryAmount),
    },
  });
};

export const setWeeklyZeroSpend = async (
  userId: string,
  data: {
    monthlyPeriodId: string;
    categoryId: string;
    weekNumber: number;
  }
) => {
  return updateWeeklySummaryAmount(userId, {
    monthlyPeriodId: data.monthlyPeriodId,
    categoryId: data.categoryId,
    weekNumber: data.weekNumber,
    summaryAmount: 0,
    status: 'ZERO_SPENT',
  });
};

export const switchExpenseMode = async (
  userId: string,
  data: {
    monthlyPeriodId: string;
    categoryId: string;
    weekNumber: number;
    targetMode: 'SUMMARY' | 'DETAILED';
    confirmConsolidate: boolean;
    accountId?: string;
  }
) => {
  return prisma.$transaction(async tx => {
    // Check or find existing state
    const state = await tx.weeklyCategoryState.findUnique({
      where: {
        monthlyPeriodId_categoryId_weekNumber: {
          monthlyPeriodId: data.monthlyPeriodId,
          categoryId: data.categoryId,
          weekNumber: data.weekNumber,
        },
      },
    });

    if (!state) {
      throw new AppError('Weekly state not found to switch mode', 404);
    }

    if (state.mode === data.targetMode) {
      return state; // Already in target mode
    }

    if (data.targetMode === 'SUMMARY') {
      // Switching from DETAILED to SUMMARY
      // Calculate total from detailed expenses
      const detailedExpenses = await tx.expense.findMany({
        where: {
          userId,
          monthlyPeriodId: data.monthlyPeriodId,
          categoryId: data.categoryId,
          weekNumber: data.weekNumber,
        },
      });

      let detailedTotal = new Decimal(0);
      for (const e of detailedExpenses) {
        detailedTotal = detailedTotal.plus(new Decimal(e.amount).minus(e.refundAmount || 0));
      }

      // If user confirmed consolidation and detailed expenses exist,
      // delete existing detailed expenses atomically to prevent double counting,
      // and set summaryAmount to detailedTotal.
      if (detailedExpenses.length > 0) {
        if (!data.confirmConsolidate) {
          throw new AppError(
            `There are ${detailedExpenses.length} detailed expenses totaling ₹${detailedTotal}. You must confirm consolidation into Summary mode.`,
            400
          );
        }
        await tx.expense.deleteMany({
          where: {
            userId,
            monthlyPeriodId: data.monthlyPeriodId,
            categoryId: data.categoryId,
            weekNumber: data.weekNumber,
          },
        });
      }

      return tx.weeklyCategoryState.update({
        where: { id: state.id },
        data: {
          mode: 'SUMMARY',
          summaryAmount: detailedTotal,
          status: detailedTotal.isZero() && state.status === 'ZERO_SPENT' ? 'ZERO_SPENT' : 'RECORDED',
        },
      });
    } else {
      // Switching from SUMMARY to DETAILED
      const currentSummaryAmount = new Decimal(state.summaryAmount);

      if (currentSummaryAmount.greaterThan(0)) {
        if (!data.confirmConsolidate) {
          throw new AppError(
            `There is a summary amount of ₹${currentSummaryAmount}. Confirm conversion to create a detailed expense entry.`,
            400
          );
        }

        // Account is required to associate detailed expense
        let accountId = data.accountId;
        if (!accountId) {
          const defaultAccount = await tx.account.findFirst({
            where: { userId, isActive: true },
            orderBy: { createdAt: 'asc' },
          });
          if (!defaultAccount) {
            throw new AppError('An account is required to convert summary spending to a detailed expense.', 400);
          }
          accountId = defaultAccount.id;
        }

        // Fetch period to get year/month
        const period = await tx.monthlyPeriod.findUniqueOrThrow({
          where: { id: data.monthlyPeriodId },
        });

        // Create detailed expense representing the summary amount
        await tx.expense.create({
          data: {
            userId,
            accountId,
            categoryId: data.categoryId,
            monthlyPeriodId: data.monthlyPeriodId,
            weeklyCategoryStateId: state.id,
            amount: currentSummaryAmount,
            refundAmount: new Decimal(0),
            date: new Date(Date.UTC(period.year, period.month - 1, 1)),
            weekNumber: data.weekNumber,
            description: `Converted from Week ${data.weekNumber} summary`,
          },
        });
      }

      // Reset summary amount to zero and switch mode to DETAILED
      return tx.weeklyCategoryState.update({
        where: { id: state.id },
        data: {
          mode: 'DETAILED',
          summaryAmount: new Decimal(0),
          status: 'RECORDED',
        },
      });
    }
  });
};

export const createDetailedExpense = async (
  userId: string,
  data: {
    accountId: string;
    categoryId: string;
    amount: number;
    refundAmount?: number;
    date: string;
    description?: string;
    bucketPlanId?: string | null;
  }
) => {
  // Validate date and resolve weekNumber and month/year
  const { year, month, weekNumber } = getWeekNumberForDate(data.date);
  const period = await getOrCreateMonthlyPeriod(userId, year, month);
  if (period.isClosed) {
    throw new AppError('Cannot add expenses to a closed/finalized month', 400);
  }

  // Validate account ownership
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId },
  });
  if (!account) {
    throw new AppError('Account not found or access denied', 404);
  }

  // Validate category ownership
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) {
    throw new AppError('Category not found or access denied', 404);
  }

  // Validate bucket plan if supplied
  if (data.bucketPlanId) {
    const plan = await prisma.bucketPlan.findFirst({
      where: { id: data.bucketPlanId, userId },
    });
    if (!plan) {
      throw new AppError('Bucket plan not found or access denied', 404);
    }
  }

  // Fetch or create WeeklyCategoryState
  const state = await prisma.weeklyCategoryState.upsert({
    where: {
      monthlyPeriodId_categoryId_weekNumber: {
        monthlyPeriodId: period.id,
        categoryId: data.categoryId,
        weekNumber,
      },
    },
    update: {
      mode: 'DETAILED',
      status: 'RECORDED',
    },
    create: {
      userId,
      monthlyPeriodId: period.id,
      categoryId: data.categoryId,
      weekNumber,
      mode: 'DETAILED',
      status: 'RECORDED',
      summaryAmount: new Decimal(0),
    },
  });

  return prisma.expense.create({
    data: {
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId,
      monthlyPeriodId: period.id,
      weeklyCategoryStateId: state.id,
      amount: new Decimal(data.amount),
      refundAmount: new Decimal(data.refundAmount || 0),
      date: new Date(data.date),
      weekNumber,
      description: data.description,
      bucketPlanId: data.bucketPlanId || null,
    },
    include: {
      category: true,
      account: true,
      bucketPlan: true,
    },
  });
};

export const updateDetailedExpense = async (
  userId: string,
  expenseId: string,
  data: {
    accountId?: string;
    categoryId?: string;
    amount?: number;
    refundAmount?: number;
    date?: string;
    description?: string;
    bucketPlanId?: string | null;
  }
) => {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
    include: { monthlyPeriod: true },
  });
  if (!existing) {
    throw new AppError('Expense not found or access denied', 404);
  }
  if (existing.monthlyPeriod.isClosed) {
    throw new AppError('Cannot modify expenses in a closed/finalized month', 400);
  }

  let weekNumber = existing.weekNumber;
  let monthlyPeriodId = existing.monthlyPeriodId;

  if (data.date && data.date !== existing.date.toISOString().split('T')[0]) {
    const parsed = getWeekNumberForDate(data.date);
    weekNumber = parsed.weekNumber;
    const period = await getOrCreateMonthlyPeriod(userId, parsed.year, parsed.month);
    monthlyPeriodId = period.id;
  }

  if (data.accountId) {
    const acc = await prisma.account.findFirst({ where: { id: data.accountId, userId } });
    if (!acc) throw new AppError('Account not found', 404);
  }

  if (data.categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: data.categoryId, userId } });
    if (!cat) throw new AppError('Category not found', 404);
  }

  if (data.bucketPlanId) {
    const plan = await prisma.bucketPlan.findFirst({ where: { id: data.bucketPlanId, userId } });
    if (!plan) throw new AppError('Bucket plan not found', 404);
  }

  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      accountId: data.accountId ?? existing.accountId,
      categoryId: data.categoryId ?? existing.categoryId,
      monthlyPeriodId,
      weekNumber,
      amount: data.amount !== undefined ? new Decimal(data.amount) : existing.amount,
      refundAmount: data.refundAmount !== undefined ? new Decimal(data.refundAmount) : existing.refundAmount,
      date: data.date ? new Date(data.date) : existing.date,
      description: data.description !== undefined ? data.description : existing.description,
      bucketPlanId: data.bucketPlanId !== undefined ? data.bucketPlanId : existing.bucketPlanId,
    },
  });
};

export const deleteDetailedExpense = async (userId: string, expenseId: string) => {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
    include: { monthlyPeriod: true },
  });
  if (!existing) {
    throw new AppError('Expense not found or access denied', 404);
  }
  if (existing.monthlyPeriod.isClosed) {
    throw new AppError('Cannot modify expenses in a closed/finalized month', 400);
  }

  return prisma.expense.delete({
    where: { id: expenseId },
  });
};

export const getCategoryWeekDetailedExpenses = async (
  userId: string,
  monthlyPeriodId: string,
  categoryId: string,
  weekNumber: number
) => {
  return prisma.expense.findMany({
    where: {
      userId,
      monthlyPeriodId,
      categoryId,
      weekNumber,
    },
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true } },
      bucketPlan: { select: { id: true, name: true } },
    },
    orderBy: { date: 'asc' },
  });
};

