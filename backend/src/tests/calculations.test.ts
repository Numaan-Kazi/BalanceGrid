import Decimal from 'decimal.js';
import {
  calculateNetExpense,
  calculateTotalNetExpenses,
  calculateMonthlySurplus,
  calculateUnallocatedSurplus,
  calculateAccountBalance,
  calculateRemainingPlanBudget,
  calculateSavingsNeeded,
  calculateBudgetUsage,
  toFixedNumber,
} from '../domain/calculations';

describe('Financial Domain Calculations', () => {
  describe('Expense and Refund Calculations', () => {
    it('calculates net expense with refund correctly', () => {
      const net = calculateNetExpense(1500, 200);
      expect(net.toNumber()).toBe(1300);
    });

    it('calculates net expense when refund is zero or omitted', () => {
      const net = calculateNetExpense(2500);
      expect(net.toNumber()).toBe(2500);
    });

    it('calculates total net expenses across multiple items with partial refunds', () => {
      const items = [
        { amount: 1000, refundAmount: 150 }, // net 850
        { amount: 2500, refundAmount: 0 },   // net 2500
        { amount: 450.5, refundAmount: 50.25 }, // net 400.25
      ];
      const total = calculateTotalNetExpenses(items);
      expect(toFixedNumber(total)).toBe(3750.25);
    });
  });

  describe('Monthly Surplus and Unallocated Surplus', () => {
    it('calculates monthly surplus = actual income - net expenses', () => {
      const income = 125000;
      const expenses = 45000;
      const surplus = calculateMonthlySurplus(income, expenses);
      expect(surplus.toNumber()).toBe(80000);
    });

    it('handles negative monthly surplus when overspending occurs', () => {
      const income = 30000;
      const expenses = 42500;
      const surplus = calculateMonthlySurplus(income, expenses);
      expect(surplus.toNumber()).toBe(-12500);
    });

    it('calculates unallocated surplus = monthly surplus - savings allocations', () => {
      const surplus = 80000;
      const allocations = 35000; // emergency fund + travel
      const unallocated = calculateUnallocatedSurplus(surplus, allocations);
      expect(unallocated.toNumber()).toBe(45000);
    });

    it('handles unallocated surplus when allocations exceed surplus', () => {
      const surplus = 20000;
      const allocations = 30000;
      const unallocated = calculateUnallocatedSurplus(surplus, allocations);
      expect(unallocated.toNumber()).toBe(-10000);
    });
  });

  describe('Account Balance Formula', () => {
    it('accurately computes balance including transfers, adjustments, and savings movements', () => {
      // Opening: 50,000
      // + Income: 75,000
      // + In transfers: 10,000
      // + Pos adj: 500
      // - Expenses: 22,000
      // - Out transfers: 5,000
      // - Neg adj: 200
      // - Out savings transfer: 15,000
      // Expected = 50000 + 75000 + 10000 + 500 - 22000 - 5000 - 200 - 15000 = 93,300
      const balance = calculateAccountBalance({
        openingBalance: 50000,
        incomingIncome: 75000,
        incomingTransfers: 10000,
        positiveAdjustments: 500,
        expenses: 22000,
        outgoingTransfers: 5000,
        negativeAdjustments: 200,
        outgoingSavingsTransfers: 15000,
      });

      expect(balance.toNumber()).toBe(93300);
    });

    it('does not subtract savings allocation from account unless money is physically transferred', () => {
      // Earmarking surplus does NOT alter physical bank account balance
      const balance = calculateAccountBalance({
        openingBalance: 10000,
        incomingIncome: 0,
        incomingTransfers: 0,
        positiveAdjustments: 0,
        expenses: 0,
        outgoingTransfers: 0,
        negativeAdjustments: 0,
        outgoingSavingsTransfers: 0, // only physical transfer changes it
      });

      expect(balance.toNumber()).toBe(10000);
    });
  });

  describe('Bucket List Remaining Budget', () => {
    it('calculates remaining budget = plan budget - linked actual expenses', () => {
      const planBudget = 15000;
      const linkedActualExpenses = 2000;
      const remaining = calculateRemainingPlanBudget(planBudget, linkedActualExpenses);
      expect(remaining.toNumber()).toBe(13000);
    });

    it('reflects overbudget plans as negative without clamping to zero', () => {
      const planBudget = 10000;
      const linkedActualExpenses = 12500;
      const remaining = calculateRemainingPlanBudget(planBudget, linkedActualExpenses);
      expect(remaining.toNumber()).toBe(-2500);
    });
  });

  describe('Goal Savings Needed', () => {
    it('calculates savings needed and percentage complete', () => {
      const target = 100000;
      const allocated = 40000;
      const res = calculateSavingsNeeded(target, allocated);

      expect(res.remainingNeeded.toNumber()).toBe(60000);
      expect(res.percentageComplete).toBe(40);
    });

    it('handles goals that are 100% reached or exceeded', () => {
      const target = 50000;
      const allocated = 55000;
      const res = calculateSavingsNeeded(target, allocated);

      expect(res.remainingNeeded.toNumber()).toBe(-5000);
      expect(res.percentageComplete).toBe(100);
    });
  });

  describe('Budget Usage', () => {
    it('identifies within budget spending', () => {
      const res = calculateBudgetUsage(8000, 10000);
      expect(res.isOverspent).toBe(false);
      expect(res.remainingBudget.toNumber()).toBe(2000);
      expect(res.percentageUsed).toBe(80);
    });

    it('identifies overspent budget correctly', () => {
      const res = calculateBudgetUsage(12000, 10000);
      expect(res.isOverspent).toBe(true);
      expect(res.remainingBudget.toNumber()).toBe(-2000);
      expect(res.percentageUsed).toBe(120);
    });
  });
});

