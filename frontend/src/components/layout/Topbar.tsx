import React from "react";
import { useAuth } from "../../context/AuthContext";
import { toTitleCase } from "@/hooks/titlecase";

interface TopbarProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle, action }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-8 border-b border-surface-border bg-white/95 backdrop-blur-xs">
      <div>
        <h1 className="text-lg font-bold text-content-primary tracking-tight ">
          {toTitleCase(title)}
        </h1>
        {subtitle && (
          <p className="text-xs text-content-secondary">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {action}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-surface-border">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-7 h-7 rounded-full border border-surface-border object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
          <span className="text-xs font-medium text-content-primary">
            {user?.name}
          </span>
        </div>
      </div>
    </header>
  );
};
