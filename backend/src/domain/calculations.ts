import Decimal from 'decimal.js';

// Configure Decimal precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface ExpenseItem {
  amount: number | string | Decimal;
  refundAmount?: number | string | Decimal;
}

export interface AccountBalanceInputs {
  openingBalance: number | string | Decimal;
  incomingIncome: number | string | Decimal;
  incomingTransfers: number | string | Decimal;
  positiveAdjustments: number | string | Decimal;
  expenses: number | string | Decimal;
  outgoingTransfers: number | string | Decimal;
  negativeAdjustments: number | string | Decimal;
  outgoingSavingsTransfers: number | string | Decimal;
}

/**
 * Calculates net expense for a single expense record: amount - refundAmount.
 * Ensures result is never negative if refund cannot exceed amount, but supports whatever net difference.
 */
export function calculateNetExpense(amount: number | string | Decimal, refundAmount: number | string | Decimal = 0): Decimal {
  const a = new Decimal(amount || 0);
  const r = new Decimal(refundAmount || 0);
  return a.minus(r);
}

/**
 * Calculates total net expenses across a list of expense items:
 * sum(expense.amount - (expense.refundAmount || 0))
 */
export function calculateTotalNetExpenses(expenses: ExpenseItem[]): Decimal {
  return expenses.reduce((acc, curr) => {
    return acc.plus(calculateNetExpense(curr.amount, curr.refundAmount || 0));
  }, new Decimal(0));
}

/**
 * Monthly Surplus = Actual Income Received - Net Expenses
 */
export function calculateMonthlySurplus(
  actualIncome: number | string | Decimal,
  netExpenses: number | string | Decimal
): Decimal {
  const inc = new Decimal(actualIncome || 0);
  const exp = new Decimal(netExpenses || 0);
  return inc.minus(exp);
}

/**
 * Unallocated Surplus = Monthly Surplus - Net New Savings Allocations
 * Note: Savings allocations are NOT counted as an expense; they are earmarked surplus.
 */
export function calculateUnallocatedSurplus(
  monthlySurplus: number | string | Decimal,
  savingsAllocations: number | string | Decimal
): Decimal {
  const surplus = new Decimal(monthlySurplus || 0);
  const alloc = new Decimal(savingsAllocations || 0);
  return surplus.minus(alloc);
}

/**
 * Account Balance Formula:
 * Opening balance
 * + incoming income
 * + incoming transfers
 * + positive balance adjustments
 * - expenses
 * - outgoing transfers
 * - negative balance adjustments
 * - outgoing savings movements when money is actually transferred
 */
export function calculateAccountBalance(inputs: AccountBalanceInputs): Decimal {
  const opening = new Decimal(inputs.openingBalance || 0);
  const income = new Decimal(inputs.incomingIncome || 0);
  const inTransfers = new Decimal(inputs.incomingTransfers || 0);
  const posAdj = new Decimal(inputs.positiveAdjustments || 0);

  const expenses = new Decimal(inputs.expenses || 0);
  const outTransfers = new Decimal(inputs.outgoingTransfers || 0);
  const negAdj = new Decimal(inputs.negativeAdjustments || 0);
  const savingsTransfers = new Decimal(inputs.outgoingSavingsTransfers || 0);

  return opening
    .plus(income)
    .plus(inTransfers)
    .plus(posAdj)
    .minus(expenses)
    .minus(outTransfers)
    .minus(negAdj)
    .minus(savingsTransfers);
}

/**
 * Bucket List remaining plan budget = plan budget - linked actual plan expenses
 */
export function calculateRemainingPlanBudget(
  planBudget: number | string | Decimal,
  linkedActualPlanExpenses: number | string | Decimal
): Decimal {
  const budget = new Decimal(planBudget || 0);
  const spent = new Decimal(linkedActualPlanExpenses || 0);
  return budget.minus(spent);
}

/**
 * Savings needed for a goal = target amount - total allocated amount
 * If already reached or exceeded, remaining needed is 0 (or negative if over-allocated).
 */
export function calculateSavingsNeeded(
  targetAmount: number | string | Decimal,
  totalAllocated: number | string | Decimal
): { remainingNeeded: Decimal; percentageComplete: number } {
  const target = new Decimal(targetAmount || 0);
  const allocated = new Decimal(totalAllocated || 0);

  const remaining = target.minus(allocated);
  let percentage = 0;
  if (target.greaterThan(0)) {
    percentage = allocated.dividedBy(target).times(100).toNumber();
  } else if (allocated.greaterThanOrEqualTo(0)) {
    percentage = 100;
  }

  return {
    remainingNeeded: remaining,
    percentageComplete: Math.min(Math.max(percentage, 0), 100),
  };
}

/**
 * Budget usage summary
 */
export function calculateBudgetUsage(
  spent: number | string | Decimal,
  budgetLimit: number | string | Decimal
): {
  remainingBudget: Decimal;
  isOverspent: boolean;
  percentageUsed: number;
} {
  const s = new Decimal(spent || 0);
  const limit = new Decimal(budgetLimit || 0);
  const remaining = limit.minus(s);
  const isOverspent = s.greaterThan(limit);

  let percentageUsed = 0;
  if (limit.greaterThan(0)) {
    percentageUsed = s.dividedBy(limit).times(100).toNumber();
  }

  return {
    remainingBudget: remaining,
    isOverspent,
    percentageUsed,
  };
}

/**
 * Standard monetary formatting string (e.g. 12500.50)
 */
export function toDecimalString(val: number | string | Decimal): string {
  return new Decimal(val || 0).toFixed(2);
}

/**
 * Convert to JavaScript number safely rounded to 2 decimals
 */
export function toFixedNumber(val: number | string | Decimal): number {
  return new Decimal(val || 0).toDecimalPlaces(2).toNumber();
}

