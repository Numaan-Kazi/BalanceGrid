import { BucketPlan } from '@/types';

export interface ExecutedBucketPlan {
  planId: string;
  planName: string;
  executedAt: string; // ISO timestamp
  year: number;
  month: number;
  totalSpent: number;
  budget: number;
  destination?: string | null;
  categoryBreakdown?: Array<{
    categoryName: string;
    totalAmount: number;
    percentage: number;
  }>;
  expenses: Array<{
    id: string;
    amount: number;
    netAmount: number;
    date: string;
    description: string | null;
    categoryName: string;
  }>;
}

const STORAGE_KEY = 'balance_grid_executed_bucket_plans';
const CHANGE_EVENT = 'balance_grid_executed_bucket_plans_changed';

export const getExecutedBucketPlans = (): ExecutedBucketPlan[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const isPlanExecuted = (planId: string): boolean => {
  const plans = getExecutedBucketPlans();
  return plans.some(p => p.planId === planId);
};

export const getExecutedPlan = (planId: string): ExecutedBucketPlan | undefined => {
  const plans = getExecutedBucketPlans();
  return plans.find(p => p.planId === planId);
};

export const executeBucketPlan = (plan: BucketPlan): ExecutedBucketPlan => {
  const plans = getExecutedBucketPlans().filter(p => p.planId !== plan.id);
  const now = new Date();
  
  // Use targetYear/targetMonth if set, otherwise current year/month
  const execYear = plan.targetYear || now.getFullYear();
  const execMonth = plan.targetMonth || (now.getMonth() + 1);

  // Total spent amount to deduct from savings (or budget if 0 spent)
  const finalSpentAmount = plan.totalSpent > 0 ? plan.totalSpent : plan.budget;

  const executed: ExecutedBucketPlan = {
    planId: plan.id,
    planName: plan.name,
    executedAt: now.toISOString(),
    year: execYear,
    month: execMonth,
    totalSpent: finalSpentAmount,
    budget: plan.budget,
    destination: plan.destination,
    categoryBreakdown: plan.categoryBreakdown || [],
    expenses: (plan.expenses || []).map(e => ({
      id: e.id,
      amount: e.amount,
      netAmount: e.netAmount,
      date: e.date,
      description: e.description,
      categoryName: e.categoryName,
    })),
  };

  plans.push(executed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return executed;
};

export const unexecuteBucketPlan = (planId: string): void => {
  const plans = getExecutedBucketPlans().filter(p => p.planId !== planId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const getTotalExecutedSavingsDeduction = (): number => {
  const plans = getExecutedBucketPlans();
  return plans.reduce((sum, p) => sum + (p.totalSpent || 0), 0);
};

export const getAdjustedOverallSavings = (rawOverallSavings: number): number => {
  const totalExecuted = getTotalExecutedSavingsDeduction();
  return Math.max(0, rawOverallSavings - totalExecuted);
};

export const getExecutedPlansForPeriod = (year: number, month: number): ExecutedBucketPlan[] => {
  const plans = getExecutedBucketPlans();
  return plans.filter(p => {
    // Matches by year/month or if execution timestamp falls in the period
    const execDate = new Date(p.executedAt);
    const dateMatch = execDate.getFullYear() === year && execDate.getMonth() + 1 === month;
    const planMatch = p.year === year && p.month === month;
    return dateMatch || planMatch;
  });
};

export const getExecutedPlansForYear = (year: number): ExecutedBucketPlan[] => {
  const plans = getExecutedBucketPlans();
  return plans.filter(p => {
    const execDate = new Date(p.executedAt);
    return execDate.getFullYear() === year || p.year === year;
  });
};

export const onExecutedBucketPlansChange = (callback: () => void): (() => void) => {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
};

