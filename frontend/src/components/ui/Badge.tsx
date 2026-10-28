import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'neutral' | 'success' | 'warning' | 'destructive' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  children,
  ...props
}) => {
  const variants = {
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    destructive: 'bg-rose-50 text-rose-700 border-rose-200',
    outline: 'border border-surface-border text-content-secondary',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

