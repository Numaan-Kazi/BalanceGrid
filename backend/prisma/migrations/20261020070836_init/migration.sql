-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BANK', 'CASH', 'WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseMode" AS ENUM ('SUMMARY', 'DETAILED');

-- CreateEnum
CREATE TYPE "WeeklyStatus" AS ENUM ('UNREPORTED', 'ZERO_SPENT', 'RECORDED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BillFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'SKIPPED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "googleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'BANK',
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "openingBalanceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'tag',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_periods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "overallBudget" DECIMAL(14,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_budgets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyPeriodId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_category_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyPeriodId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "mode" "ExpenseMode" NOT NULL DEFAULT 'SUMMARY',
    "status" "WeeklyStatus" NOT NULL DEFAULT 'UNREPORTED',
    "summaryAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_category_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "monthlyPeriodId" TEXT NOT NULL,
    "weeklyCategoryStateId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "refundAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "date" TIMESTAMP(3) NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "description" TEXT,
    "bucketPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incomes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "monthlyPeriodId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_transfers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_adjustments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(14,2) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "notes" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_allocations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savingsGoalId" TEXT NOT NULL,
    "monthlyPeriodId" TEXT NOT NULL,
    "fromAccountId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bucket_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destination" TEXT,
    "targetYear" INTEGER,
    "targetMonth" INTEGER,
    "budget" DECIMAL(14,2) NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bucket_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_bills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "frequency" "BillFrequency" NOT NULL DEFAULT 'MONTHLY',
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_bill_payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recurringBillId" TEXT NOT NULL,
    "expenseId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_bill_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "categories_userId_idx" ON "categories"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_name_key" ON "categories"("userId", "name");

-- CreateIndex
CREATE INDEX "monthly_periods_userId_year_month_idx" ON "monthly_periods"("userId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_periods_userId_year_month_key" ON "monthly_periods"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "category_budgets_userId_idx" ON "category_budgets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "category_budgets_monthlyPeriodId_categoryId_key" ON "category_budgets"("monthlyPeriodId", "categoryId");

-- CreateIndex
CREATE INDEX "weekly_category_states_userId_idx" ON "weekly_category_states"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_category_states_monthlyPeriodId_categoryId_weekNumbe_key" ON "weekly_category_states"("monthlyPeriodId", "categoryId", "weekNumber");

-- CreateIndex
CREATE INDEX "expenses_userId_monthlyPeriodId_idx" ON "expenses"("userId", "monthlyPeriodId");

-- CreateIndex
CREATE INDEX "expenses_userId_date_idx" ON "expenses"("userId", "date");

-- CreateIndex
CREATE INDEX "expenses_bucketPlanId_idx" ON "expenses"("bucketPlanId");

-- CreateIndex
CREATE INDEX "incomes_userId_monthlyPeriodId_idx" ON "incomes"("userId", "monthlyPeriodId");

-- CreateIndex
CREATE INDEX "incomes_userId_date_idx" ON "incomes"("userId", "date");

-- CreateIndex
CREATE INDEX "account_transfers_userId_fromAccountId_idx" ON "account_transfers"("userId", "fromAccountId");

-- CreateIndex
CREATE INDEX "account_transfers_userId_toAccountId_idx" ON "account_transfers"("userId", "toAccountId");

-- CreateIndex
CREATE INDEX "balance_adjustments_userId_accountId_idx" ON "balance_adjustments"("userId", "accountId");

-- CreateIndex
CREATE INDEX "savings_goals_userId_idx" ON "savings_goals"("userId");

-- CreateIndex
CREATE INDEX "savings_allocations_userId_savingsGoalId_idx" ON "savings_allocations"("userId", "savingsGoalId");

-- CreateIndex
CREATE INDEX "savings_allocations_userId_monthlyPeriodId_idx" ON "savings_allocations"("userId", "monthlyPeriodId");

-- CreateIndex
CREATE INDEX "bucket_plans_userId_idx" ON "bucket_plans"("userId");

-- CreateIndex
CREATE INDEX "recurring_bills_userId_idx" ON "recurring_bills"("userId");

-- CreateIndex
CREATE INDEX "recurring_bill_payments_userId_recurringBillId_idx" ON "recurring_bill_payments"("userId", "recurringBillId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_periods" ADD CONSTRAINT "monthly_periods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_monthlyPeriodId_fkey" FOREIGN KEY ("monthlyPeriodId") REFERENCES "monthly_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_category_states" ADD CONSTRAINT "weekly_category_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_category_states" ADD CONSTRAINT "weekly_category_states_monthlyPeriodId_fkey" FOREIGN KEY ("monthlyPeriodId") REFERENCES "monthly_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_category_states" ADD CONSTRAINT "weekly_category_states_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_monthlyPeriodId_fkey" FOREIGN KEY ("monthlyPeriodId") REFERENCES "monthly_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_weeklyCategoryStateId_fkey" FOREIGN KEY ("weeklyCategoryStateId") REFERENCES "weekly_category_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_bucketPlanId_fkey" FOREIGN KEY ("bucketPlanId") REFERENCES "bucket_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_monthlyPeriodId_fkey" FOREIGN KEY ("monthlyPeriodId") REFERENCES "monthly_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_allocations" ADD CONSTRAINT "savings_allocations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_allocations" ADD CONSTRAINT "savings_allocations_savingsGoalId_fkey" FOREIGN KEY ("savingsGoalId") REFERENCES "savings_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_allocations" ADD CONSTRAINT "savings_allocations_monthlyPeriodId_fkey" FOREIGN KEY ("monthlyPeriodId") REFERENCES "monthly_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_allocations" ADD CONSTRAINT "savings_allocations_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bucket_plans" ADD CONSTRAINT "bucket_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_bill_payments" ADD CONSTRAINT "recurring_bill_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_bill_payments" ADD CONSTRAINT "recurring_bill_payments_recurringBillId_fkey" FOREIGN KEY ("recurringBillId") REFERENCES "recurring_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_bill_payments" ADD CONSTRAINT "recurring_bill_payments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
