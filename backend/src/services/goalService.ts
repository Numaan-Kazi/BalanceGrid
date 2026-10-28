import Decimal from 'decimal.js';
import { prisma } from '../db/prisma';
import { calculateSavingsNeeded, toFixedNumber } from '../domain/calculations';
import { getSavingsSummary } from './accountService';
import { getOrCreateMonthlyPeriod } from './monthlyService';
import { AppError } from '../middleware/errorHandler';

export interface GoalWithProgress {
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

export const getSavingsGoalsWithProgress = async (userId: string): Promise<GoalWithProgress[]> => {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    include: {
      allocations: {
        orderBy: { date: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return goals.map(g => {
    let allocatedTotal = new Decimal(0);
    g.allocations.forEach(a => {
      allocatedTotal = allocatedTotal.plus(a.amount);
    });

    const targetDecimal = new Decimal(g.targetAmount);
    const progress = calculateSavingsNeeded(targetDecimal, allocatedTotal);

    return {
      id: g.id,
      name: g.name,
      targetAmount: toFixedNumber(targetDecimal),
      targetDate: g.targetDate ? g.targetDate.toISOString().split('T')[0] : null,
      notes: g.notes,
      isCompleted: g.isCompleted || progress.remainingNeeded.lessThanOrEqualTo(0),
      totalAllocated: toFixedNumber(allocatedTotal),
      remainingNeeded: toFixedNumber(Decimal.max(0, progress.remainingNeeded)),
      percentageComplete: Math.round(progress.percentageComplete),
      allocations: g.allocations.map(a => ({
        id: a.id,
        amount: toFixedNumber(a.amount),
        date: a.date.toISOString().split('T')[0],
        monthlyPeriodId: a.monthlyPeriodId,
        fromAccountId: a.fromAccountId,
        notes: a.notes,
      })),
    };
  });
};

export const createSavingsGoal = async (
  userId: string,
  data: {
    name: string;
    targetAmount: number;
    targetDate?: string | null;
    notes?: string;
  }
) => {
  return prisma.savingsGoal.create({
    data: {
      userId,
      name: data.name,
      targetAmount: new Decimal(data.targetAmount),
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      notes: data.notes,
    },
  });
};

export const updateSavingsGoal = async (
  userId: string,
  goalId: string,
  data: {
    name?: string;
    targetAmount?: number;
    targetDate?: string | null;
    notes?: string;
    isCompleted?: boolean;
  }
) => {
  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId },
  });
  if (!goal) {
    throw new AppError('Savings goal not found or access denied', 404);
  }

  return prisma.savingsGoal.update({
    where: { id: goalId },
    data: {
      name: data.name ?? goal.name,
      targetAmount: data.targetAmount !== undefined ? new Decimal(data.targetAmount) : goal.targetAmount,
      targetDate: data.targetDate !== undefined ? (data.targetDate ? new Date(data.targetDate) : null) : goal.targetDate,
      notes: data.notes !== undefined ? data.notes : goal.notes,
      isCompleted: data.isCompleted !== undefined ? data.isCompleted : goal.isCompleted,
    },
  });
};

export const deleteSavingsGoal = async (userId: string, goalId: string) => {
  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId },
  });
  if (!goal) {
    throw new AppError('Savings goal not found or access denied', 404);
  }

  return prisma.savingsGoal.delete({
    where: { id: goalId },
  });
};

export const createSavingsAllocation = async (
  userId: string,
  data: {
    savingsGoalId: string;
    amount: number;
    date: string;
    monthlyPeriodId?: string;
    fromAccountId?: string;
    notes?: string;
  }
) => {
  // Validate goal ownership
  const goal = await prisma.savingsGoal.findFirst({
    where: { id: data.savingsGoalId, userId },
  });
  if (!goal) {
    throw new AppError('Savings goal not found or access denied', 404);
  }

  if (goal.isCompleted) {
    throw new AppError('This savings goal is already reached/completed. No further allocations can be added.', 400);
  }

  // Resolve monthly period (either provided or resolved from allocation date)
  let periodId = data.monthlyPeriodId;
  if (!periodId) {
    const d = new Date(data.date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const resolvedPeriod = await getOrCreateMonthlyPeriod(userId, year, month);
    periodId = resolvedPeriod.id;
  }

  const period = await prisma.monthlyPeriod.findFirst({
    where: { id: periodId, userId },
  });
  if (!period) {
    throw new AppError('Monthly period not found or access denied', 404);
  }
  if (period.isClosed) {
    throw new AppError('Cannot allocate savings in a closed/finalized month', 400);
  }

  // Calculate current total allocated to this goal
  const allocAgg = await prisma.savingsAllocation.aggregate({
    where: { savingsGoalId: goal.id, userId },
    _sum: { amount: true },
  });
  const currentTotal = allocAgg._sum.amount || new Decimal(0);
  const remainingNeeded = Decimal.max(0, new Decimal(goal.targetAmount).minus(currentTotal));

  if (remainingNeeded.lessThanOrEqualTo(0)) {
    await prisma.savingsGoal.update({
      where: { id: goal.id },
      data: { isCompleted: true },
    });
    throw new AppError('This savings goal target has already been reached.', 400);
  }

  const requestedAmount = new Decimal(data.amount);
  if (requestedAmount.greaterThan(remainingNeeded)) {
    throw new AppError(
      `Allocation amount (₹${requestedAmount.toFixed(2)}) cannot exceed remaining goal target of ₹${remainingNeeded.toFixed(2)}`,
      400
    );
  }

  // Validate authoritative Overall Savings balance (deducts from Overall Savings)
  const savingsSummary = await getSavingsSummary(userId);
  const availableOverallSavings = new Decimal(savingsSummary.overallTotalSavings);

  if (availableOverallSavings.lessThanOrEqualTo(0)) {
    throw new AppError("You don't have any savings available to allocate.", 400);
  }
  if (requestedAmount.greaterThan(availableOverallSavings)) {
    throw new AppError(
      `Insufficient savings. You can allocate up to ₹${availableOverallSavings.toFixed(2)}.`,
      400
    );
  }

  return prisma.$transaction(async tx => {
    const allocation = await tx.savingsAllocation.create({
      data: {
        userId,
        savingsGoalId: data.savingsGoalId,
        monthlyPeriodId: periodId!,
        amount: requestedAmount,
        date: new Date(data.date),
        fromAccountId: data.fromAccountId || null,
        notes: data.notes,
      },
    });

    const newTotal = currentTotal.plus(requestedAmount);
    if (newTotal.greaterThanOrEqualTo(goal.targetAmount)) {
      await tx.savingsGoal.update({
        where: { id: goal.id },
        data: { isCompleted: true },
      });
    }

    return allocation;
  });
};

export const deleteSavingsAllocation = async (userId: string, allocationId: string) => {
  const allocation = await prisma.savingsAllocation.findFirst({
    where: { id: allocationId, userId },
    include: { monthlyPeriod: true, savingsGoal: true },
  });
  if (!allocation) {
    throw new AppError('Allocation record not found or access denied', 404);
  }
  if (allocation.monthlyPeriod.isClosed) {
    throw new AppError('Cannot delete allocations from a closed/finalized month', 400);
  }

  return prisma.$transaction(async tx => {
    await tx.savingsAllocation.delete({
      where: { id: allocationId },
    });

    // Recheck goal status
    const remainingAllocs = await tx.savingsAllocation.aggregate({
      where: { savingsGoalId: allocation.savingsGoalId, userId },
      _sum: { amount: true },
    });
    const totalRemaining = remainingAllocs._sum.amount || new Decimal(0);
    if (totalRemaining.lessThan(allocation.savingsGoal.targetAmount) && allocation.savingsGoal.isCompleted) {
      await tx.savingsGoal.update({
        where: { id: allocation.savingsGoalId },
        data: { isCompleted: false },
      });
    }
  });
};

