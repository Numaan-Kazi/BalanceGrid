import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MonthlyTrackerPage } from './pages/MonthlyTrackerPage';
import { AccountsPage } from './pages/AccountsPage';
import { SavingsGoalsPage } from './pages/SavingsGoalsPage';
import { BucketListPage } from './pages/BucketListPage';
import { RecurringBillsPage } from './pages/RecurringBillsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes wrapped in Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/monthly" element={<MonthlyTrackerPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/goals" element={<SavingsGoalsPage />} />
        <Route path="/bucket-list" element={<BucketListPage />} />
        <Route path="/recurring-bills" element={<RecurringBillsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;

