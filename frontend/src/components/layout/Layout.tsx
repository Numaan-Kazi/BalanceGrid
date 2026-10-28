import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-xs font-medium text-content-secondary">Loading BalanceGrid...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-surface-muted text-content-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

