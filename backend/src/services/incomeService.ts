import Decimal from 'decimal.js';
import { prisma } from '../db/prisma';
import { getOrCreateMonthlyPeriod } from './monthlyService';
import { AppError } from '../middleware/errorHandler';

export const getIncomesForPeriod = async (userId: string, year: number, month: number) => {
  const period = await getOrCreateMonthlyPeriod(userId, year, month);
  return prisma.income.findMany({
    where: { userId, monthlyPeriodId: period.id },
    include: { account: { select: { id: true, name: true, type: true } } },
    orderBy: { date: 'desc' },
  });
};

export const createIncome = async (
  userId: string,
  data: {
    accountId: string;
    amount: number;
    date: string;
    source: string;
    description?: string;
  }
) => {
  const d = new Date(data.date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  // Verify account belongs to user
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId },
  });
  if (!account) {
    throw new AppError('Destination account not found or access denied', 404);
  }

  const period = await getOrCreateMonthlyPeriod(userId, year, month);
  if (period.isClosed) {
    throw new AppError('Cannot add income to a closed/finalized month.', 400);
  }

  return prisma.income.create({
    data: {
      userId,
      accountId: data.accountId,
      monthlyPeriodId: period.id,
      amount: new Decimal(data.amount),
      date: d,
      source: data.source,
      description: data.description,
    },
    include: { account: true },
  });
};

export const updateIncome = async (
  userId: string,
  incomeId: string,
  data: {
    accountId?: string;
    amount?: number;
    date?: string;
    source?: string;
    description?: string;
  }
) => {
  const existing = await prisma.income.findFirst({
    where: { id: incomeId, userId },
    include: { monthlyPeriod: true },
  });
  if (!existing) {
    throw new AppError('Income record not found or access denied', 404);
  }
  if (existing.monthlyPeriod.isClosed) {
    throw new AppError('Cannot modify income from a closed/finalized month.', 400);
  }

  let monthlyPeriodId = existing.monthlyPeriodId;
  let dateObj = existing.date;

  if (data.date) {
    dateObj = new Date(data.date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const period = await getOrCreateMonthlyPeriod(userId, year, month);
  if (period.isClosed) {
    throw new AppError('Cannot add income to a closed/finalized month.', 400);
  }
    monthlyPeriodId = period.id;
  }

  if (data.accountId) {
    const acc = await prisma.account.findFirst({ where: { id: data.accountId, userId } });
    if (!acc) throw new AppError('Account not found', 404);
  }

  return prisma.income.update({
    where: { id: incomeId },
    data: {
      accountId: data.accountId ?? existing.accountId,
      monthlyPeriodId,
      amount: data.amount !== undefined ? new Decimal(data.amount) : existing.amount,
      date: dateObj,
      source: data.source ?? existing.source,
      description: data.description !== undefined ? data.description : existing.description,
    },
    include: { account: true },
  });
};

export const deleteIncome = async (userId: string, incomeId: string) => {
  const existing = await prisma.income.findFirst({
    where: { id: incomeId, userId },
    include: { monthlyPeriod: true },
  });
  if (!existing) {
    throw new AppError('Income record not found or access denied', 404);
  }
  if (existing.monthlyPeriod.isClosed) {
    throw new AppError('Cannot modify income from a closed/finalized month.', 400);
  }

  return prisma.income.delete({
    where: { id: incomeId },
  });
};

