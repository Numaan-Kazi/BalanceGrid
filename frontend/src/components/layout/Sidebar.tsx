import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Landmark,
  PiggyBank,
  Compass,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export const navigationItems = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Monthly Tracker', to: '/monthly', icon: CalendarCheck },
  { name: 'Accounts', to: '/accounts', icon: Landmark },
  { name: 'Savings & Goals', to: '/goals', icon: PiggyBank },
  { name: 'Bucket List', to: '/bucket-list', icon: Compass },
  { name: 'Recurring Bills', to: '/recurring-bills', icon: Receipt },
  { name: 'Reports', to: '/reports', icon: BarChart3 },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-surface-border bg-white h-screen sticky top-0 shrink-0">
      {/* Brand header */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-surface-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 text-white font-bold shadow-xs">
          <Wallet className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-content-primary">
            Balance<span className="text-brand-600">Grid</span>
          </span>
          <span className="block text-[10px] text-content-secondary uppercase font-semibold tracking-wider">
            Finance Utility
          </span>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-content-secondary hover:text-content-primary hover:bg-slate-50'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User profile and logout */}
      <div className="p-3 border-t border-surface-border">
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-surface-border object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-content-primary truncate">{user?.name}</p>
              <p className="text-[11px] text-content-secondary truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-content-secondary hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

