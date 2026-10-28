import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Landmark,
  PiggyBank,
  MoreHorizontal,
  Compass,
  Receipt,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const BottomNav: React.FC = () => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainNav = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Monthly', to: '/monthly', icon: CalendarCheck },
    { name: 'Accounts', to: '/accounts', icon: Landmark },
    { name: 'Goals', to: '/goals', icon: PiggyBank },
  ];

  const moreNav = [
    { name: 'Bucket List', to: '/bucket-list', icon: Compass },
    { name: 'Recurring Bills', to: '/recurring-bills', icon: Receipt },
    { name: 'Reports', to: '/reports', icon: BarChart3 },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile More Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="fixed bottom-16 inset-x-0 bg-white border-t border-surface-border p-4 rounded-t-xl z-50 shadow-xl space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <span className="text-xs font-bold uppercase text-content-secondary tracking-wider">
                More Destinations
              </span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-md text-content-secondary hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {moreNav.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowMoreMenu(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 p-3 rounded-lg text-sm font-medium border border-surface-border transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-700 border-brand-200'
                          : 'bg-white text-content-primary hover:bg-slate-50'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 text-brand-600" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-surface-border z-30 h-16 flex items-center justify-around px-2 shadow-lg">
        {mainNav.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center w-16 h-12 rounded-md transition-colors',
                  isActive ? 'text-brand-600 font-semibold' : 'text-content-secondary hover:text-content-primary'
                )
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">{item.name}</span>
            </NavLink>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={cn(
            'flex flex-col items-center justify-center w-16 h-12 rounded-md transition-colors',
            showMoreMenu ? 'text-brand-600 font-semibold' : 'text-content-secondary hover:text-content-primary'
          )}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>
    </>
  );
};

