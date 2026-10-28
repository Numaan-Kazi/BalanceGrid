import Decimal from 'decimal.js';
import { stringify } from 'csv-stringify/sync';
import { prisma } from '../db/prisma';
import { getMonthlyTrackerData } from './monthlyService';
import { toFixedNumber } from '../domain/calculations';

export const getYearlyReport = async (userId: string, year: number) => {
  const monthsData = [];
  let annualIncome = new Decimal(0);
  let annualExpenses = new Decimal(0);
  let annualSavings = new Decimal(0);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  for (let m = 1; m <= 12; m++) {
    // Check if period exists
    const period = await prisma.monthlyPeriod.findUnique({
      where: { userId_year_month: { userId, year, month: m } },
    });

    if (period) {
      const data = await getMonthlyTrackerData(userId, year, m);
      annualIncome = annualIncome.plus(data.summary.actualIncome);
      annualExpenses = annualExpenses.plus(data.summary.netExpenses);
      annualSavings = annualSavings.plus(data.summary.savingsAllocations);

      monthsData.push({
        month: m,
        name: monthNames[m - 1],
        hasData: true,
        income: data.summary.actualIncome,
        expenses: data.summary.netExpenses,
        surplus: data.summary.monthlySurplus,
        savings: data.summary.savingsAllocations,
        unallocated: data.summary.unallocatedSurplus,
      });
    } else {
      monthsData.push({
        month: m,
        name: monthNames[m - 1],
        hasData: false,
        income: 0,
        expenses: 0,
        surplus: 0,
        savings: 0,
        unallocated: 0,
      });
    }
  }

  const annualSurplus = annualIncome.minus(annualExpenses);

  return {
    year,
    summary: {
      totalIncome: toFixedNumber(annualIncome),
      totalExpenses: toFixedNumber(annualExpenses),
      annualSurplus: toFixedNumber(annualSurplus),
      totalSavingsAllocated: toFixedNumber(annualSavings),
      unallocatedSurplus: toFixedNumber(annualSurplus.minus(annualSavings)),
    },
    months: monthsData,
  };
};

export const exportTransactionsCsv = async (
  userId: string,
  year?: number,
  month?: number
): Promise<string> => {
  const whereExpense: any = { userId };
  const whereIncome: any = { userId };

  if (year && month) {
    const period = await prisma.monthlyPeriod.findUnique({
      where: { userId_year_month: { userId, year, month } },
    });
    if (period) {
      whereExpense.monthlyPeriodId = period.id;
      whereIncome.monthlyPeriodId = period.id;
    }
  }

  const expenses = await prisma.expense.findMany({
    where: whereExpense,
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
      bucketPlan: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  });

  const incomes = await prisma.income.findMany({
    where: whereIncome,
    include: {
      account: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  });

  const rows: any[] = [];

  // Add Expenses
  expenses.forEach(e => {
    const net = new Decimal(e.amount).minus(e.refundAmount || 0);
    rows.push({
      Type: 'Expense',
      Date: e.date.toISOString().split('T')[0],
      Account: e.account.name,
      Category: e.category.name,
      GrossAmount: e.amount.toString(),
      RefundAmount: e.refundAmount.toString(),
      NetAmount: net.toFixed(2),
      Description: e.description || '',
      BucketPlan: e.bucketPlan?.name || '',
      WeekNumber: e.weekNumber,
    });
  });

  // Add Incomes
  incomes.forEach(i => {
    rows.push({
      Type: 'Income',
      Date: i.date.toISOString().split('T')[0],
      Account: i.account.name,
      Category: i.source,
      GrossAmount: i.amount.toString(),
      RefundAmount: '0.00',
      NetAmount: i.amount.toString(),
      Description: i.description || '',
      BucketPlan: '',
      WeekNumber: '',
    });
  });

  // Sort chronologically
  rows.sort((a, b) => b.Date.localeCompare(a.Date));

  return stringify(rows, {
    header: true,
    columns: ['Type', 'Date', 'Account', 'Category', 'GrossAmount', 'RefundAmount', 'NetAmount', 'Description', 'BucketPlan', 'WeekNumber'],
  });
};

