import React from 'react';
import { formatINR } from '../../lib/formatters';
import { cn } from '../../lib/utils';

interface CurrencyDisplayProps {
  amount: number | string | null | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  colored?: boolean; // Green if positive, Red if negative
  showSign?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  className,
  size = 'md',
  colored = false,
  showSign = false,
}) => {
  const num = Number(amount || 0);
  const isPositive = num > 0;
  const isNegative = num < 0;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm font-semibold',
    lg: 'text-base font-semibold',
    xl: 'text-lg font-bold',
    '2xl': 'text-2xl font-bold tracking-tight',
  };

  let colorClass = 'text-content-primary';
  if (colored) {
    if (isPositive) colorClass = 'text-emerald-600';
    else if (isNegative) colorClass = 'text-rose-600';
    else colorClass = 'text-content-secondary';
  }

  const formatted = formatINR(num);
  const signPrefix = showSign && isPositive ? '+' : '';

  return (
    <span className={cn('tabular-nums font-mono tracking-tight', sizeClasses[size], colorClass, className)}>
      {signPrefix}{formatted}
    </span>
  );
};

