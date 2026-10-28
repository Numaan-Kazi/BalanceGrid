import Decimal from 'decimal.js';
import { prisma } from '../db/prisma';
import { calculateRemainingPlanBudget, toFixedNumber } from '../domain/calculations';
import { createDetailedExpense } from './expenseService';
import { AppError } from '../middleware/errorHandler';

export interface BucketPlanWithExpenses {
  id: string;
  name: string;
  destination: string | null;
  targetYear: number | null;
  targetMonth: number | null;
  budget: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  notes: string | null;
  totalSpent: number;
  remainingBudget: number;
  percentageSpent: number;
  isOverBudget: boolean;
  excessAmount: number;
  categoryBreakdown: Array<{
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
    categoryId: string;
    categoryName: string;
    accountId: string;
    accountName: string;
  }>;
}

export const getBucketPlansWithStats = async (userId: string): Promise<BucketPlanWithExpenses[]> => {
  const plans = await prisma.bucketPlan.findMany({
    where: { userId },
    include: {
      expenses: {
        include: {
          category: { select: { id: true, name: true } },
          account: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return plans.map(p => {
    let spentTotal = new Decimal(0);
    const catMap = new Map<string, Decimal>();

    const expenseList = p.expenses.map(e => {
      const net = new Decimal(e.amount).minus(e.refundAmount || 0);
      spentTotal = spentTotal.plus(net);

      const catCurrent = catMap.get(e.category.name) || new Decimal(0);
      catMap.set(e.category.name, catCurrent.plus(net));

      return {
        id: e.id,
        amount: toFixedNumber(e.amount),
        refundAmount: toFixedNumber(e.refundAmount),
        netAmount: toFixedNumber(net),
        date: e.date.toISOString().split('T')[0],
        description: e.description,
        categoryId: e.category.id,
        categoryName: e.category.name,
        accountId: e.account.id,
        accountName: e.account.name,
      };
    });

    const budgetDecimal = new Decimal(p.budget);
    const remaining = calculateRemainingPlanBudget(budgetDecimal, spentTotal);
    let pct = 0;
    if (budgetDecimal.greaterThan(0)) {
      pct = spentTotal.dividedBy(budgetDecimal).times(100).toNumber();
    }

    const isOverBudget = remaining.isNegative();
    const excessAmount = isOverBudget ? toFixedNumber(remaining.abs()) : 0;

    const categoryBreakdown = Array.from(catMap.entries()).map(([categoryName, amount]) => ({
      categoryName,
      totalAmount: toFixedNumber(amount),
      percentage: spentTotal.greaterThan(0)
        ? Math.round(amount.dividedBy(spentTotal).times(100).toNumber())
        : 0,
    }));

    return {
      id: p.id,
      name: p.name,
      destination: p.destination,
      targetYear: p.targetYear,
      targetMonth: p.targetMonth,
      budget: toFixedNumber(budgetDecimal),
      status: p.status,
      notes: p.notes,
      totalSpent: toFixedNumber(spentTotal),
      remainingBudget: toFixedNumber(remaining),
      percentageSpent: Math.round(pct),
      isOverBudget,
      excessAmount,
      categoryBreakdown,
      expenses: expenseList,
    };
  });
};

export const createBucketPlan = async (
  userId: string,
  data: {
    name: string;
    destination?: string;
    targetYear?: number;
    targetMonth?: number;
    budget: number;
    status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
    notes?: string;
  }
) => {
  return prisma.bucketPlan.create({
    data: {
      userId,
      name: data.name,
      destination: data.destination,
      targetYear: data.targetYear,
      targetMonth: data.targetMonth,
      budget: new Decimal(data.budget),
      status: data.status || 'PLANNED',
      notes: data.notes,
    },
  });
};

export const updateBucketPlan = async (
  userId: string,
  planId: string,
  data: {
    name?: string;
    destination?: string;
    targetYear?: number;
    targetMonth?: number;
    budget?: number;
    status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
    notes?: string;
  }
) => {
  const plan = await prisma.bucketPlan.findFirst({
    where: { id: planId, userId },
  });
  if (!plan) {
    throw new AppError('Bucket plan not found or access denied', 404);
  }

  return prisma.bucketPlan.update({
    where: { id: planId },
    data: {
      name: data.name ?? plan.name,
      destination: data.destination !== undefined ? data.destination : plan.destination,
      targetYear: data.targetYear !== undefined ? data.targetYear : plan.targetYear,
      targetMonth: data.targetMonth !== undefined ? data.targetMonth : plan.targetMonth,
      budget: data.budget !== undefined ? new Decimal(data.budget) : plan.budget,
      status: data.status ?? plan.status,
      notes: data.notes !== undefined ? data.notes : plan.notes,
    },
  });
};

export const deleteBucketPlan = async (userId: string, planId: string) => {
  const plan = await prisma.bucketPlan.findFirst({
    where: { id: planId, userId },
  });
  if (!plan) {
    throw new AppError('Bucket plan not found or access denied', 404);
  }

  // Transactionally unlink expenses first so original financial history is NEVER deleted
  return prisma.$transaction(async tx => {
    await tx.expense.updateMany({
      where: { bucketPlanId: planId, userId },
      data: { bucketPlanId: null },
    });

    return tx.bucketPlan.delete({
      where: { id: planId },
    });
  });
};

export const linkExpenseToPlan = async (
  userId: string,
  data: { expenseId: string; bucketPlanId: string | null }
) => {
  // Verify expense ownership
  const expense = await prisma.expense.findFirst({
    where: { id: data.expenseId, userId },
  });
  if (!expense) {
    throw new AppError('Expense not found or access denied', 404);
  }

  if (data.bucketPlanId) {
    const plan = await prisma.bucketPlan.findFirst({
      where: { id: data.bucketPlanId, userId },
    });
    if (!plan) {
      throw new AppError('Bucket plan not found or access denied', 404);
    }
  }

  return prisma.expense.update({
    where: { id: data.expenseId },
    data: { bucketPlanId: data.bucketPlanId },
  });
};

export const addExpenseToBucketPlan = async (
  userId: string,
  data: {
    bucketPlanId: string;
    accountId: string;
    categoryId: string;
    amount: number;
    date: string;
    description: string;
    notes?: string;
  }
) => {
  const plan = await prisma.bucketPlan.findFirst({
    where: { id: data.bucketPlanId, userId },
  });
  if (!plan) {
    throw new AppError('Bucket plan not found or access denied', 404);
  }

  return createDetailedExpense(userId, {
    accountId: data.accountId,
    categoryId: data.categoryId,
    amount: data.amount,
    date: data.date,
    description: data.description,
    bucketPlanId: data.bucketPlanId,
  });
};

