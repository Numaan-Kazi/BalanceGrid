import Decimal from 'decimal.js';
import { prisma } from '../db/prisma';
import { calculateAccountBalance, toFixedNumber } from '../domain/calculations';
import { AppError } from '../middleware/errorHandler';

export interface AccountBalanceDetails {
  id: string;
  name: string;
  type: string;
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

export const getAccountBalances = async (userId: string): Promise<AccountBalanceDetails[]> => {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  const results: AccountBalanceDetails[] = [];

  for (const acc of accounts) {
    // 1. Incoming income directly into this account
    const incomeAgg = await prisma.income.aggregate({
      where: { userId, accountId: acc.id },
      _sum: { amount: true },
    });
    const incomeTotal = incomeAgg._sum.amount || new Decimal(0);

    // 2. Incoming transfers to this account
    const inTransferAgg = await prisma.accountTransfer.aggregate({
      where: { userId, toAccountId: acc.id },
      _sum: { amount: true },
    });
    const inTransferTotal = inTransferAgg._sum.amount || new Decimal(0);

    // 3. Outgoing transfers from this account
    const outTransferAgg = await prisma.accountTransfer.aggregate({
      where: { userId, fromAccountId: acc.id },
      _sum: { amount: true },
    });
    const outTransferTotal = outTransferAgg._sum.amount || new Decimal(0);

    // 4. Detailed expenses paid from this account (amount minus refundAmount)
    const expenses = await prisma.expense.findMany({
      where: { userId, accountId: acc.id },
      select: { amount: true, refundAmount: true },
    });
    let netExpensesTotal = new Decimal(0);
    for (const exp of expenses) {
      netExpensesTotal = netExpensesTotal.plus(new Decimal(exp.amount).minus(exp.refundAmount || 0));
    }

    // 5. Balance adjustments
    const adjustments = await prisma.balanceAdjustment.findMany({
      where: { userId, accountId: acc.id },
      select: { amount: true },
    });
    let posAdj = new Decimal(0);
    let negAdj = new Decimal(0);
    for (const adj of adjustments) {
      const val = new Decimal(adj.amount);
      if (val.isPositive()) {
        posAdj = posAdj.plus(val);
      } else {
        negAdj = negAdj.plus(val.abs());
      }
    }

    // 6. Outgoing savings allocations when money was physically moved from this account
    const savingsAgg = await prisma.savingsAllocation.aggregate({
      where: { userId, fromAccountId: acc.id },
      _sum: { amount: true },
    });
    const savingsTransferTotal = savingsAgg._sum.amount || new Decimal(0);

    // Calculate current balance
    const currentBalance = calculateAccountBalance({
      openingBalance: acc.openingBalance,
      incomingIncome: incomeTotal,
      incomingTransfers: inTransferTotal,
      positiveAdjustments: posAdj,
      expenses: netExpensesTotal,
      outgoingTransfers: outTransferTotal,
      negativeAdjustments: negAdj,
      outgoingSavingsTransfers: savingsTransferTotal,
    });

    results.push({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      openingBalance: toFixedNumber(acc.openingBalance),
      openingBalanceDate: acc.openingBalanceDate.toISOString().split('T')[0],
      isActive: acc.isActive,
      currentBalance: toFixedNumber(currentBalance),
      incomingIncome: toFixedNumber(incomeTotal),
      incomingTransfers: toFixedNumber(inTransferTotal),
      outgoingTransfers: toFixedNumber(outTransferTotal),
      expenses: toFixedNumber(netExpensesTotal),
      positiveAdjustments: toFixedNumber(posAdj),
      negativeAdjustments: toFixedNumber(negAdj),
      outgoingSavingsTransfers: toFixedNumber(savingsTransferTotal),
    });
  }

  return results;
};

export const getSingleAccountBalance = async (userId: string, accountId: string): Promise<Decimal> => {
  const acc = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!acc) {
    throw new AppError('Account not found or access denied', 404);
  }

  const [incomeAgg, inTransferAgg, outTransferAgg, expenses, adjustments, savingsAgg] = await Promise.all([
    prisma.income.aggregate({ where: { userId, accountId: acc.id }, _sum: { amount: true } }),
    prisma.accountTransfer.aggregate({ where: { userId, toAccountId: acc.id }, _sum: { amount: true } }),
    prisma.accountTransfer.aggregate({ where: { userId, fromAccountId: acc.id }, _sum: { amount: true } }),
    prisma.expense.findMany({ where: { userId, accountId: acc.id }, select: { amount: true, refundAmount: true } }),
    prisma.balanceAdjustment.findMany({ where: { userId, accountId: acc.id }, select: { amount: true } }),
    prisma.savingsAllocation.aggregate({ where: { userId, fromAccountId: acc.id }, _sum: { amount: true } }),
  ]);

  const incomeTotal = incomeAgg._sum.amount || new Decimal(0);
  const inTransferTotal = inTransferAgg._sum.amount || new Decimal(0);
  const outTransferTotal = outTransferAgg._sum.amount || new Decimal(0);

  let netExpensesTotal = new Decimal(0);
  for (const exp of expenses) {
    netExpensesTotal = netExpensesTotal.plus(new Decimal(exp.amount).minus(exp.refundAmount || 0));
  }

  let posAdj = new Decimal(0);
  let negAdj = new Decimal(0);
  for (const adj of adjustments) {
    const val = new Decimal(adj.amount);
    if (val.isPositive()) posAdj = posAdj.plus(val);
    else negAdj = negAdj.plus(val.abs());
  }

  const savingsTransferTotal = savingsAgg._sum.amount || new Decimal(0);

  return calculateAccountBalance({
    openingBalance: acc.openingBalance,
    incomingIncome: incomeTotal,
    incomingTransfers: inTransferTotal,
    positiveAdjustments: posAdj,
    expenses: netExpensesTotal,
    outgoingTransfers: outTransferTotal,
    negativeAdjustments: negAdj,
    outgoingSavingsTransfers: savingsTransferTotal,
  });
};

export const createAccount = async (
  userId: string,
  data: { name: string; type?: any; openingBalance?: number; openingBalanceDate?: string }
) => {
  return prisma.account.create({
    data: {
      userId,
      name: data.name,
      type: data.type || 'BANK',
      openingBalance: new Decimal(data.openingBalance || 0),
      openingBalanceDate: data.openingBalanceDate ? new Date(data.openingBalanceDate) : new Date(),
    },
  });
};

export const updateAccount = async (
  userId: string,
  accountId: string,
  data: { name?: string; type?: any; openingBalance?: number; openingBalanceDate?: string; isActive?: boolean }
) => {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) {
    throw new AppError('Account not found or access denied', 404);
  }

  return prisma.account.update({
    where: { id: accountId },
    data: {
      name: data.name ?? account.name,
      type: data.type ?? account.type,
      openingBalance: data.openingBalance !== undefined ? new Decimal(data.openingBalance) : account.openingBalance,
      openingBalanceDate: data.openingBalanceDate ? new Date(data.openingBalanceDate) : account.openingBalanceDate,
      isActive: data.isActive ?? account.isActive,
    },
  });
};

export const createBalanceAdjustment = async (
  userId: string,
  data: { accountId: string; amount: number; date: string; reason: string }
) => {
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId },
  });
  if (!account) {
    throw new AppError('Account not found or access denied', 404);
  }

  return prisma.balanceAdjustment.create({
    data: {
      userId,
      accountId: data.accountId,
      amount: new Decimal(data.amount),
      date: new Date(data.date),
      reason: data.reason,
    },
  });
};

export const getSavingsSummary = async (userId: string) => {
  // 1. Finalized monthly savings from all closed months
  const closedMonths = await prisma.monthlyPeriod.findMany({
    where: { userId, isClosed: true },
    select: { finalizedSavings: true },
  });
  let finalizedMonthlySavings = new Decimal(0);
  for (const m of closedMonths) {
    if (m.finalizedSavings) {
      finalizedMonthlySavings = finalizedMonthlySavings.plus(m.finalizedSavings);
    }
  }

  // 2. Additional savings entries
  const additionalSavingsList = await prisma.additionalSavings.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });
  let netAdditionalSavings = new Decimal(0);
  for (const item of additionalSavingsList) {
    netAdditionalSavings = netAdditionalSavings.plus(item.amount);
  }

  // 3. Goal allocations deducted from overall savings
  const allocAgg = await prisma.savingsAllocation.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  const totalAllocatedToGoals = allocAgg._sum.amount || new Decimal(0);

  const grossSavings = finalizedMonthlySavings.plus(netAdditionalSavings);
  const availableOverallSavings = Decimal.max(0, grossSavings.minus(totalAllocatedToGoals));

  return {
    overallTotalSavings: toFixedNumber(availableOverallSavings),
    grossSavings: toFixedNumber(grossSavings),
    totalAllocatedToGoals: toFixedNumber(totalAllocatedToGoals),
    finalizedMonthlySavings: toFixedNumber(finalizedMonthlySavings),
    netAdditionalSavings: toFixedNumber(netAdditionalSavings),
    additionalSavings: additionalSavingsList.map(s => ({
      id: s.id,
      title: s.title,
      amount: toFixedNumber(s.amount),
      date: s.date.toISOString().split('T')[0],
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
    })),
  };
};

export const createAdditionalSavings = async (
  userId: string,
  data: { title: string; amount: number; date: string; notes?: string }
) => {
  return prisma.additionalSavings.create({
    data: {
      userId,
      title: data.title.trim(),
      amount: new Decimal(data.amount),
      date: new Date(data.date),
      notes: data.notes,
    },
  });
};

export const updateAdditionalSavings = async (
  userId: string,
  id: string,
  data: { title?: string; amount?: number; date?: string; notes?: string }
) => {
  const existing = await prisma.additionalSavings.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new AppError('Additional savings record not found', 404);

  return prisma.additionalSavings.update({
    where: { id },
    data: {
      title: data.title ? data.title.trim() : existing.title,
      amount: data.amount !== undefined ? new Decimal(data.amount) : existing.amount,
      date: data.date ? new Date(data.date) : existing.date,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    },
  });
};

export const deleteAdditionalSavings = async (userId: string, id: string) => {
  const existing = await prisma.additionalSavings.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new AppError('Additional savings record not found', 404);

  return prisma.additionalSavings.delete({
    where: { id },
  });
};

