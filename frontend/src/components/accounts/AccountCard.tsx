import React from 'react';
import { Landmark, Wallet, Coins, Edit2, SlidersHorizontal } from 'lucide-react';
import { Account } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { formatDate } from '../../lib/formatters';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onAdjust: (account: Account) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, onEdit, onAdjust }) => {
  const getIcon = () => {
    switch (account.type) {
      case 'BANK':
        return <Landmark className="w-5 h-5 text-brand-600" />;
      case 'WALLET':
        return <Wallet className="w-5 h-5 text-indigo-600" />;
      case 'CASH':
        return <Coins className="w-5 h-5 text-amber-600" />;
      default:
        return <Landmark className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <Card className="hover:border-brand-300 transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-surface-muted border border-surface-border">
              {getIcon()}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-content-primary">{account.name}</h4>
              <span className="text-[11px] font-medium text-content-secondary uppercase">
                {account.type}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onAdjust(account)}
              title="Adjust Balance"
              className="p-1.5 text-content-secondary hover:text-brand-600 rounded-md hover:bg-slate-100 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(account)}
              title="Edit Account"
              className="p-1.5 text-content-secondary hover:text-brand-600 rounded-md hover:bg-slate-100 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Balance */}
        <div className="mb-4">
          <span className="text-[11px] font-medium text-content-secondary uppercase">Current Balance</span>
          <div>
            <CurrencyDisplay amount={account.currentBalance} size="xl" colored={false} />
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="pt-3 border-t border-surface-border grid grid-cols-2 gap-2 text-[11px] text-content-secondary">
          <div>
            <span className="block text-content-muted">Opening Balance</span>
            <CurrencyDisplay amount={account.openingBalance} size="sm" />
            <span className="text-[10px] text-content-muted block">{formatDate(account.openingBalanceDate)}</span>
          </div>

          <div>
            <span className="block text-content-muted">Net Income Received</span>
            <CurrencyDisplay amount={account.incomingIncome} size="sm" />
          </div>

          <div>
            <span className="block text-content-muted">Net Expenses Paid</span>
            <CurrencyDisplay amount={account.expenses} size="sm" />
          </div>

          <div>
            <span className="block text-content-muted">Transfers (In / Out)</span>
            <span>
              +{account.incomingTransfers} / -{account.outgoingTransfers}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

