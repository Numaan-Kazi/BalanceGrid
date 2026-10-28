import React from 'react';
import { LucideIcon, FolderOpen } from 'lucide-react';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderOpen,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-dashed border-surface-border rounded-lg">
      <div className="p-3 bg-brand-50 text-brand-600 rounded-full mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-content-primary mb-1">{title}</h3>
      <p className="text-xs text-content-secondary max-w-sm mb-4">{description}</p>
      {actionText && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

