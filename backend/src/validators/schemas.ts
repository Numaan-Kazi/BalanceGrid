import { z } from 'zod';

export const AccountTypeEnum = z.enum(['BANK', 'CASH', 'WALLET', 'OTHER']);
export const ExpenseModeEnum = z.enum(['SUMMARY', 'DETAILED']);
export const WeeklyStatusEnum = z.enum(['UNREPORTED', 'ZERO_SPENT', 'RECORDED']);
export const PlanStatusEnum = z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED']);
export const BillFrequencyEnum = z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);
export const PaymentStatusEnum = z.enum(['PENDING', 'PAID', 'SKIPPED']);

// Account schemas
export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: AccountTypeEnum.default('BANK'),
  openingBalance: z.number().default(0),
  openingBalanceDate: z.string().optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: AccountTypeEnum.optional(),
  openingBalance: z.number().optional(),
  openingBalanceDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Category schema
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(50),
  icon: z.string().default('tag'),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  icon: z.string().optional(),
  isArchived: z.boolean().optional(),
});

// Monthly period
export const getOrCreateMonthlyPeriodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const updateMonthlyPeriodBudgetSchema = z.object({
  overallBudget: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Income schemas
export const createIncomeSchema = z.object({
  accountId: z.string().uuid('Valid account ID is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid date string is required (YYYY-MM-DD)'),
  source: z.string().min(1, 'Income source is required').max(100),
  description: z.string().max(255).optional(),
});

export const updateIncomeSchema = createIncomeSchema.partial();

// Detailed Expense schemas
export const createDetailedExpenseSchema = z.object({
  accountId: z.string().uuid('Valid account ID is required'),
  categoryId: z.string().uuid('Valid category ID is required'),
  monthlyPeriodId: z.string().uuid('Valid monthly period ID is required'),
  amount: z.number().positive('Expense amount must be greater than zero'),
  refundAmount: z.number().min(0, 'Refund amount cannot be negative').default(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid date is required (YYYY-MM-DD)'),
  description: z.string().max(255).optional(),
  bucketPlanId: z.string().uuid().nullable().optional(),
});

export const updateDetailedExpenseSchema = createDetailedExpenseSchema.partial();

// Weekly Category State schemas
export const updateWeeklySummarySchema = z.object({
  monthlyPeriodId: z.string().uuid(),
  categoryId: z.string().uuid(),
  weekNumber: z.number().int().min(1).max(6),
  summaryAmount: z.number().min(0, 'Summary amount cannot be negative'),
  status: WeeklyStatusEnum.default('RECORDED'),
  accountId: z.string().uuid().optional(), // Default account to debit summary expense if entered
});

export const setWeeklyZeroSpendSchema = z.object({
  monthlyPeriodId: z.string().uuid(),
  categoryId: z.string().uuid(),
  weekNumber: z.number().int().min(1).max(6),
});

export const switchExpenseModeSchema = z.object({
  monthlyPeriodId: z.string().uuid(),
  categoryId: z.string().uuid(),
  weekNumber: z.number().int().min(1).max(6),
  targetMode: ExpenseModeEnum,
  confirmConsolidate: z.boolean().default(false),
  accountId: z.string().uuid().optional(),
});

// Transfer schemas
export const createTransferSchema = z.object({
  fromAccountId: z.string().uuid('Source account is required'),
  toAccountId: z.string().uuid('Destination account is required'),
  amount: z.number().positive('Transfer amount must be positive'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid date is required'),
  description: z.string().max(255).optional(),
}).refine(data => data.fromAccountId !== data.toAccountId, {
  message: 'Source and destination accounts must be different',
  path: ['toAccountId'],
});

// Balance Adjustment schemas
export const createAdjustmentSchema = z.object({
  accountId: z.string().uuid('Valid account ID is required'),
  amount: z.number().refine(val => val !== 0, 'Adjustment amount cannot be zero'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid date is required'),
  reason: z.string().min(1, 'Adjustment reason is required').max(255),
});

// Savings Goal schemas
export const createGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.string().nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});

export const createAllocationSchema = z.object({
  savingsGoalId: z.string().uuid('Valid savings goal is required'),
  monthlyPeriodId: z.string().uuid().optional(),
  amount: z.number().positive('Allocation amount must be positive'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid date is required'),
  fromAccountId: z.string().uuid().optional(),
  notes: z.string().max(255).optional(),
});

// Bucket Plan schemas
export const createBucketPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  destination: z.string().max(100).optional(),
  targetYear: z.number().int().min(2000).max(2100).optional(),
  targetMonth: z.number().int().min(1).max(12).optional(),
  budget: z.number().positive('Plan budget must be positive'),
  status: PlanStatusEnum.default('PLANNED'),
  notes: z.string().max(500).optional(),
});

export const updateBucketPlanSchema = createBucketPlanSchema.partial();

export const linkExpenseToPlanSchema = z.object({
  expenseId: z.string().uuid(),
  bucketPlanId: z.string().uuid().nullable(),
});

export const createBucketExpenseSchema = z.object({
  bucketPlanId: z.string().uuid('Bucket plan ID is required'),
  accountId: z.string().uuid('Payment account is required'),
  categoryId: z.string().uuid('Category is required'),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid date is required (YYYY-MM-DD)'),
  description: z.string().trim().min(1, 'Description is required').max(255),
  notes: z.string().max(255).optional(),
});

// Category Budget schemas
export const setCategoryBudgetSchema = z.object({
  monthlyPeriodId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number().min(0, 'Budget amount must be non-negative'),
});

// Recurring Bill schemas
export const createRecurringBillSchema = z.object({
  name: z.string().min(1, 'Bill name is required').max(100),
  amount: z.number().positive('Bill amount must be positive'),
  categoryId: z.string().uuid('Valid category is required'),
  frequency: BillFrequencyEnum.default('MONTHLY'),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid due date is required'),
  notes: z.string().max(255).optional(),
});

export const updateRecurringBillSchema = z.object({
  name: z.string().min(1, 'Bill name is required').max(100).optional(),
  amount: z.number().positive('Bill amount must be positive').optional(),
  categoryId: z.string().uuid('Valid category is required').optional(),
  frequency: BillFrequencyEnum.optional(),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid due date is required').optional(),
  notes: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
});

export const markBillPaidSchema = z.object({
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid paid date is required'),
  amount: z.number().positive('Paid amount must be positive'),
  accountId: z.string().uuid().optional(),
});

// Monthly lifecycle schemas
export const setStartingBalanceSchema = z.object({
  startingBalance: z.number().min(0, 'Starting balance cannot be negative'),
});

export const closeMonthSchema = z.object({
  notes: z.string().optional(),
});

// Additional Savings schemas
export const createAdditionalSavingsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid date is required'),
  notes: z.string().max(255).optional(),
});

export const updateAdditionalSavingsSchema = createAdditionalSavingsSchema.partial();

// Authentication schemas
export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Full name is required').max(100),
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain alphanumeric characters, underscores, and hyphens'),
    email: z.string().trim().email('Valid email address is required').toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});


