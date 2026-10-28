import Decimal from 'decimal.js';
import { prisma } from '../db/prisma';
import { AppError } from '../middleware/errorHandler';

export const getTransfers = async (userId: string) => {
  return prisma.accountTransfer.findMany({
    where: { userId },
    include: {
      fromAccount: { select: { id: true, name: true, type: true } },
      toAccount: { select: { id: true, name: true, type: true } },
    },
    orderBy: { date: 'desc' },
  });
};

export const createTransfer = async (
  userId: string,
  data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description?: string;
  }
) => {
  if (data.fromAccountId === data.toAccountId) {
    throw new AppError('Source and destination accounts cannot be identical', 400);
  }

  // Verify ownership of both accounts
  const fromAcc = await prisma.account.findFirst({
    where: { id: data.fromAccountId, userId },
  });
  if (!fromAcc) {
    throw new AppError('Source account not found or access denied', 404);
  }

  const toAcc = await prisma.account.findFirst({
    where: { id: data.toAccountId, userId },
  });
  if (!toAcc) {
    throw new AppError('Destination account not found or access denied', 404);
  }

  return prisma.accountTransfer.create({
    data: {
      userId,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      amount: new Decimal(data.amount),
      date: new Date(data.date),
      description: data.description,
    },
    include: {
      fromAccount: true,
      toAccount: true,
    },
  });
};

export const deleteTransfer = async (userId: string, transferId: string) => {
  const existing = await prisma.accountTransfer.findFirst({
    where: { id: transferId, userId },
  });
  if (!existing) {
    throw new AppError('Transfer record not found or access denied', 404);
  }

  return prisma.accountTransfer.delete({
    where: { id: transferId },
  });
};

