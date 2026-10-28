import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Tags,
  Plus,
  Database,
  LogOut,
  Download,
  CheckCircle,
  HelpCircle,
  Trash2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Category } from '@/types';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [newCatName, setNewCatName] = useState('');
  const [catError, setCatError] = useState<string | null>(null);
  const [catSuccess, setCatSuccess] = useState<string | null>(null);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

  const { data: catData } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories?includeArchived=true'),
  });

  const allCategories = catData?.categories || [];
  const activeCategories = allCategories.filter(c => !c.isArchived);
  const archivedCategories = allCategories.filter(c => c.isArchived);

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; icon: string }) => api.post('/categories', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyTracker'] });
      setNewCatName('');
      setCatError(null);
      setCatSuccess(data.message || 'Category added successfully!');
      setTimeout(() => setCatSuccess(null), 4000);
    },
    onError: (err: any) => {
      setCatError(err.message || 'Failed to add category');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ message: string; archived: boolean }>(`/categories/${id}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyTracker'] });
      setDeletingCat(null);
      setCatSuccess(data.message);
      setTimeout(() => setCatSuccess(null), 5000);
    },
    onError: (err: any) => {
      setCatError(err.message || 'Failed to delete category');
    },
  });

  const restoreCategoryMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/categories/${id}`, { isArchived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyTracker'] });
      setCatSuccess('Category restored to active spending categories!');
      setTimeout(() => setCatSuccess(null), 4000);
    },
  });

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    setCatSuccess(null);

    const trimmed = newCatName.trim();
    if (!trimmed) {
      setCatError('Category name is required');
      return;
    }

    // Check duplicate locally
    const duplicate = activeCategories.find(
      c => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setCatError(`A category named "${trimmed}" already exists.`);
      return;
    }

    await createCategoryMutation.mutateAsync({ name: trimmed, icon: 'tag' });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleExportAllCsv = async () => {
    try {
      const csvString = await api.get<string>('/reports/export-csv');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'balance_grid_all_transactions.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  return (
    <div className="space-y-6">
      <Topbar
        title="Settings & Data Safety"
        subtitle="User profile, category configuration, data safety, and backup guides"
      />

      <div className="px-4 sm:px-8 space-y-6 max-w-4xl mx-auto">
        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              <CardTitle className="text-sm font-semibold">User Profile & Session</CardTitle>
            </div>
            <CardDescription>
              Authenticated account with strict database-level data isolation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted border border-surface-border">
              <div className="flex items-center gap-3">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-10 h-10 rounded-full border border-surface-border object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-content-primary">
                    {user?.name} {user?.username && <span className="text-xs text-content-muted font-normal">(@{user.username})</span>}
                  </h4>
                  <p className="text-xs text-content-secondary">{user?.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-rose-600 hover:text-rose-700">
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Sign Out
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-md border border-emerald-200">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                Your financial records are strictly isolated to your internal user ID in PostgreSQL.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Categories Management Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tags className="w-4 h-4 text-brand-600" />
              <CardTitle className="text-sm font-semibold">Expense & Budget Categories</CardTitle>
            </div>
            <CardDescription>
              Manage your spending categories. Categories used in historical expenses are safely archived to protect past records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Feedback messages */}
            {catSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{catSuccess}</span>
              </div>
            )}
            {catError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{catError}</span>
              </div>
            )}

            {/* Add Custom Category Form */}
            <form onSubmit={handleCreateCategory} className="flex gap-2">
              <Input
                placeholder="New Category Name (e.g. Pets, Fitness, Subscription)"
                value={newCatName}
                onChange={e => {
                  setNewCatName(e.target.value);
                  if (catError) setCatError(null);
                }}
                className="text-xs"
              />
              <Button
                type="submit"
                size="sm"
                isLoading={createCategoryMutation.isPending}
                disabled={createCategoryMutation.isPending || !newCatName.trim()}
                className="shrink-0 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Category
              </Button>
            </form>

            {/* List of active categories */}
            <div className="space-y-1 pt-1">
              <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider block">
                Active Categories ({activeCategories.length})
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {activeCategories.map(cat => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-surface-muted border border-surface-border text-content-primary font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                    <span>{cat.name}</span>
                    {cat.isDefault && (
                      <span className="text-[10px] text-content-muted font-normal">(Default)</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeletingCat(cat)}
                      className="text-content-muted hover:text-rose-600 p-0.5 rounded transition-colors ml-1"
                      title="Delete / Archive Category"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Archived Categories if any */}
            {archivedCategories.length > 0 && (
              <div className="space-y-1 pt-3 border-t border-surface-border">
                <span className="text-xs font-semibold text-content-muted uppercase tracking-wider block">
                  Archived Categories ({archivedCategories.length})
                </span>
                <p className="text-[11px] text-content-muted">
                  These categories are preserved for historical records but hidden from new transactions.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {archivedCategories.map(cat => (
                    <span
                      key={cat.id}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs bg-slate-100 border border-dashed border-slate-300 text-content-muted"
                    >
                      <span>{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => restoreCategoryMutation.mutate(cat.id)}
                        className="text-brand-600 hover:text-brand-700 flex items-center gap-1 text-[11px] font-semibold"
                        title="Restore Category"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Export & Backup Instructions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-600" />
              <CardTitle className="text-sm font-semibold">Data Backup & Recovery</CardTitle>
            </div>
            <CardDescription>
              Export your data or run PostgreSQL pg_dump for complete disaster recovery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-content-secondary leading-relaxed">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted border border-surface-border">
              <div>
                <span className="font-semibold text-content-primary block">
                  Export All Financial Records (CSV)
                </span>
                <span className="text-[11px] text-content-secondary">
                  Download a complete spreadsheet of all expenses, incomes, and dates.
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportAllCsv} className="shrink-0">
                <Download className="w-3.5 h-3.5 mr-1" />
                Export All CSV
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-surface-border space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-content-primary">
                <HelpCircle className="w-4 h-4 text-brand-600" />
                <span>PostgreSQL Backup Command (pg_dump)</span>
              </div>
              <p>To take a complete database backup, run in your terminal:</p>
              <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto">
                pg_dump -U postgres -d balancegrid -F c -b -v -f balance_grid_backup.dump
              </pre>
              <p>To restore from backup:</p>
              <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto">
                pg_restore -U postgres -d balancegrid -v balance_grid_backup.dump
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete / Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingCat)}
        onClose={() => setDeletingCat(null)}
        title={`Delete Category "${deletingCat?.name}"?`}
        message={`If this category has existing financial history (expenses, budgets, or recurring bills), it will be safely archived to preserve your transaction records. Otherwise it will be permanently deleted.`}
        confirmText="Confirm Delete / Archive"
        variant="destructive"
        onConfirm={async () => {
          if (deletingCat) {
            await deleteCategoryMutation.mutateAsync(deletingCat.id);
          }
        }}
      />
    </div>
  );
};
