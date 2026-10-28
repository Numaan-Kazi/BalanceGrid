import React from 'react';
import { PiggyBank, ArrowDownRight, Wallet, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { useNavigate } from 'react-router-dom';

interface SummaryCardsProps {
  overallTotalSavings: number;
  totalBalanceThisMonth: number;
  usageThisMonth: number;
  remainingBudgetThisMonth: number;
  startingBalance?: number;
  actualIncome?: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  overallTotalSavings,
  totalBalanceThisMonth,
  usageThisMonth,
  remainingBudgetThisMonth,
  startingBalance = 0,
  actualIncome = 0,
}) => {
  const navigate = useNavigate();

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
    {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> */}
      {/* 1. Overall Total Savings */}
      <Card
        onClick={() => navigate('/accounts')}
        className="cursor-pointer hover:border-brand-400 hover:shadow-sm transition-all border-l-4 border-l-indigo-600"
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider">
              Overall Total Savings
            </span>
            <div className="p-2 rounded-md bg-indigo-50 text-indigo-600">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <CurrencyDisplay amount={overallTotalSavings} size="2xl" className="font-bold text-indigo-700" />
          <p className="text-[11px] text-content-secondary mt-1 flex items-center justify-between">
            <span>Finalized + additional savings</span>
            <span className="text-indigo-600 font-semibold hover:underline">View →</span>
          </p>
        </CardContent>
      </Card>

      {/* 2. Total Balance This Month */}
      <Card
        onClick={() => navigate('/monthly')}
        className="cursor-pointer hover:border-brand-400 hover:shadow-sm transition-all border-l-4 border-l-brand-600"
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider">
              Total Balance This Month
            </span>
            <div className="p-2 rounded-md bg-brand-50 text-brand-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <CurrencyDisplay amount={totalBalanceThisMonth} size="2xl" className="font-bold text-brand-700" />
          <p className="text-[11px] text-content-secondary mt-1">
            Start (₹{startingBalance.toFixed(0)}) + Inflow (₹{actualIncome.toFixed(0)})
          </p>
        </CardContent>
      </Card>

      {/* 3. Usage This Month */}
      <Card
        onClick={() => navigate('/monthly')}
        className="cursor-pointer hover:border-amber-400 hover:shadow-sm transition-all border-l-4 border-l-amber-500"
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider">
              Usage This Month
            </span>
            <div className="p-2 rounded-md bg-amber-50 text-amber-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <CurrencyDisplay amount={usageThisMonth} size="2xl" className="font-bold text-amber-700" />
          <p className="text-[11px] text-content-secondary mt-1">
            Net expenses recorded this month
          </p>
        </CardContent>
      </Card>

      {/* 4. Remaining Budget This Month */}
      <Card
        onClick={() => navigate('/monthly')}
        className={`cursor-pointer hover:shadow-sm transition-all border-l-4 ${
          remainingBudgetThisMonth < 0
            ? 'border-l-rose-500 hover:border-rose-400'
            : 'border-l-emerald-500 hover:border-emerald-400'
        }`}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider">
              Remaining Budget This Month
            </span>
            <div
              className={`p-2 rounded-md ${
                remainingBudgetThisMonth < 0
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <CurrencyDisplay
            amount={remainingBudgetThisMonth}
            size="2xl"
            colored
            showSign={false}
            className="font-bold"
          />
          <p className="text-[11px] text-content-secondary mt-1">
            {remainingBudgetThisMonth < 0 ? 'Overspent relative to balance' : 'Available balance remaining'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
