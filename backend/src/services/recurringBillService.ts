import Decimal from 'decimal.js';
import { prisma } from '../db/prisma';
import { createDetailedExpense } from './expenseService';
import { getWeekNumberForDate } from '../domain/weeks';
import { getOrCreateMonthlyPeriod, getMonthlyTrackerData } from './monthlyService';
import { toFixedNumber } from '../domain/calculations';
import { AppError } from '../middleware/errorHandler';

function getNextDate(date: Date, frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'): Date {
  const next = new Date(date);
  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

export type BillStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export const determineBillStatus = (bill: {
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  nextDueDate: Date;
  payments: Array<{ dueDate: Date; paidDate: Date | null; status: string }>;
}): { status: BillStatus; canPay: boolean; displayDueDate: string; lastPaidDate: string | null } => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const nextDueStr = bill.nextDueDate.toISOString().split('T')[0];

  const lastPaid = bill.payments.find(p => p.status === 'PAID');
  let isCurrentCyclePaid = false;
  let lastPaidDate: string | null = null;

  if (lastPaid && lastPaid.paidDate) {
    lastPaidDate = lastPaid.paidDate.toISOString().split('T')[0];
    const paidDue = lastPaid.dueDate;

    if (bill.frequency === 'MONTHLY') {
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const paidDueYear = paidDue.getFullYear();
      const paidDueMonth = paidDue.getMonth();
      const nextYear = bill.nextDueDate.getFullYear();
      const nextMonth = bill.nextDueDate.getMonth();

      if (paidDueYear === currentYear && paidDueMonth === currentMonth) {
        isCurrentCyclePaid = true;
      } else if (nextYear > currentYear || (nextYear === currentYear && nextMonth > currentMonth)) {
        isCurrentCyclePaid = true;
      }
    } else if (bill.frequency === 'WEEKLY') {
      const daysSincePaid = (today.getTime() - lastPaid.paidDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePaid < 7 && nextDueStr > todayStr) {
        isCurrentCyclePaid = true;
      }
    } else if (bill.frequency === 'QUARTERLY') {
      const daysSincePaid = (today.getTime() - lastPaid.paidDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePaid < 90 && nextDueStr > todayStr) {
        isCurrentCyclePaid = true;
      }
    } else if (bill.frequency === 'YEARLY') {
      if (paidDue.getFullYear() === today.getFullYear()) {
        isCurrentCyclePaid = true;
      }
    }
  }

  if (isCurrentCyclePaid) {
    return {
      status: 'PAID',
      canPay: false,
      displayDueDate: lastPaid ? lastPaid.dueDate.toISOString().split('T')[0] : nextDueStr,
      lastPaidDate,
    };
  }

  if (nextDueStr < todayStr) {
    return {
      status: 'OVERDUE',
      canPay: true,
      displayDueDate: nextDueStr,
      lastPaidDate,
    };
  }

  return {
    status: 'PENDING',
    canPay: true,
    displayDueDate: nextDueStr,
    lastPaidDate,
  };
};

export const getRecurringBills = async (userId: string) => {
  const bills = await prisma.recurringBill.findMany({
    where: { userId },
    include: {
      category: { select: { id: true, name: true, icon: true } },
      payments: {
        orderBy: { dueDate: 'desc' },
        take: 10,
      },
    },
    orderBy: { nextDueDate: 'asc' },
  });

  return bills.map(b => {
    const { status, canPay, displayDueDate, lastPaidDate } = determineBillStatus(b);
    const hasPaidHistory = b.payments.some(p => p.status === 'PAID');

    return {
      id: b.id,
      name: b.name,
      amount: toFixedNumber(b.amount),
      categoryId: b.categoryId,
      categoryName: b.category.name,
      categoryIcon: b.category.icon,
      frequency: b.frequency,
      nextDueDate: b.nextDueDate.toISOString().split('T')[0],
      displayDueDate,
      status,
      canPay,
      lastPaidDate,
      hasPaidHistory,
      isEditable: !hasPaidHistory,
      isDeletable: !hasPaidHistory,
      notes: b.notes,
      isActive: b.isActive,
      payments: b.payments.map(p => ({
        id: p.id,
        amount: toFixedNumber(p.amount),
        dueDate: p.dueDate.toISOString().split('T')[0],
        paidDate: p.paidDate ? p.paidDate.toISOString().split('T')[0] : null,
        status: p.status,
      })),
    };
  });
};

export const createRecurringBill = async (
  userId: string,
  data: {
    name: string;
    amount: number;
    categoryId: string;
    frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    nextDueDate: string;
    notes?: string;
  }
) => {
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) {
    throw new AppError('Category not found or access denied', 404);
  }

  return prisma.recurringBill.create({
    data: {
      userId,
      name: data.name,
      amount: new Decimal(data.amount),
      categoryId: data.categoryId,
      frequency: data.frequency,
      nextDueDate: new Date(data.nextDueDate),
      notes: data.notes,
    },
  });
};

export const updateRecurringBill = async (
  userId: string,
  billId: string,
  data: {
    name?: string;
    amount?: number;
    categoryId?: string;
    frequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    nextDueDate?: string;
    notes?: string;
    isActive?: boolean;
  }
) => {
  const bill = await prisma.recurringBill.findFirst({
    where: { id: billId, userId },
    include: { payments: true },
  });
  if (!bill) throw new AppError('Recurring bill not found', 404);

  const hasPaid = bill.payments.some(p => p.status === 'PAID');
  if (hasPaid && (data.amount !== undefined || data.frequency !== undefined || data.categoryId !== undefined)) {
    throw new AppError('Paid occurrences and history cannot be edited.', 400);
  }

  return prisma.recurringBill.update({
    where: { id: billId },
    data: {
      name: data.name ?? bill.name,
      amount: data.amount !== undefined ? new Decimal(data.amount) : bill.amount,
      categoryId: data.categoryId ?? bill.categoryId,
      frequency: data.frequency ?? bill.frequency,
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : bill.nextDueDate,
      notes: data.notes !== undefined ? data.notes : bill.notes,
      isActive: data.isActive !== undefined ? data.isActive : bill.isActive,
    },
  });
};

export const deleteRecurringBill = async (userId: string, billId: string) => {
  const bill = await prisma.recurringBill.findFirst({
    where: { id: billId, userId },
    include: { payments: true },
  });
  if (!bill) throw new AppError('Recurring bill not found', 404);

  const hasPaid = bill.payments.some(p => p.status === 'PAID');
  if (hasPaid) {
    throw new AppError(
      'Cannot delete recurring bill with paid payment history. Paid occurrences must be preserved in your financial records.',
      400
    );
  }

  return prisma.recurringBill.delete({
    where: { id: billId },
  });
};

export const markRecurringBillPaid = async (
  userId: string,
  billId: string,
  data: {
    paidDate: string;
    amount: number;
    accountId?: string;
  }
) => {
  const bill = await prisma.recurringBill.findFirst({
    where: { id: billId, userId },
    include: { payments: { orderBy: { dueDate: 'desc' } } },
  });
  if (!bill) {
    throw new AppError('Recurring bill not found or access denied', 404);
  }

  const { status } = determineBillStatus(bill);
  if (status === 'PAID') {
    throw new AppError('This bill occurrence has already been paid for this cycle.', 400);
  }

  // 1. Resolve target monthly period and check closed status
  const { year, month } = getWeekNumberForDate(data.paidDate);
  const period = await getOrCreateMonthlyPeriod(userId, year, month);
  if (period.isClosed) {
    throw new AppError('Cannot pay bills in a closed/finalized month', 400);
  }

  // 2. Validate available monthly balance for the selected month
  const trackerData = await getMonthlyTrackerData(userId, year, month);
  const availableBalance = new Decimal(trackerData.summary.remainingBalance);

  if (new Decimal(data.amount).greaterThan(availableBalance)) {
    const availFormatted = availableBalance.toNumber().toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });
    const reqFormatted = new Decimal(data.amount).toNumber().toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });
    throw new AppError(
      `Insufficient monthly balance. Your available balance is ₹${availFormatted}, but this bill requires ₹${reqFormatted}.`,
      400
    );
  }

  // 3. Resolve user account for foreign key relation
  let accountId = data.accountId;
  if (!accountId) {
    const existingAccount = await prisma.account.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (existingAccount) {
      accountId = existingAccount.id;
    } else {
      const createdAccount = await prisma.account.create({
        data: {
          userId,
          name: 'Primary Balance',
          type: 'BANK',
          openingBalance: 0,
        },
      });
      accountId = createdAccount.id;
    }
  }

  // Atomically create the actual detailed expense and mark the bill payment
  return prisma.$transaction(async () => {
    // 1. Create the real financial expense
    const expense = await createDetailedExpense(userId, {
      accountId: accountId!,
      categoryId: bill.categoryId,
      amount: data.amount,
      date: data.paidDate,
      description: `Bill Payment: ${bill.name}`,
    });

    // 2. Record payment
    const payment = await prisma.recurringBillPayment.create({
      data: {
        userId,
        recurringBillId: bill.id,
        expenseId: expense.id,
        dueDate: bill.nextDueDate,
        paidDate: new Date(data.paidDate),
        amount: new Decimal(data.amount),
        status: 'PAID',
      },
    });

    // 3. Advance next due date
    const nextDate = getNextDate(bill.nextDueDate, bill.frequency);
    await prisma.recurringBill.update({
      where: { id: bill.id },
      data: { nextDueDate: nextDate },
    });

    return { payment, expense, nextDueDate: nextDate.toISOString().split('T')[0] };
  });
};


