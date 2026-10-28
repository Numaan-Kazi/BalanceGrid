import { toast } from 'sonner';
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { PiggyBank, Plus, Loader2 } from "lucide-react";
import { SavingsGoal } from "@/types";
import { api } from "@/lib/api";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/Button";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { EmptyState } from "@/components/common/EmptyState";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalModal } from "@/components/goals/GoalModal";
import { AllocateModal } from "@/components/goals/AllocateModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

export const SavingsGoalsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [selectedGoalIdForAllocation, setSelectedGoalIdForAllocation] =
    useState<string | undefined>(undefined);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  const { data: goalsData, isLoading } = useQuery<{ goals: SavingsGoal[] }>({
    queryKey: ["goals"],
    queryFn: () => api.get("/goals"),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    queryClient.invalidateQueries({ queryKey: ["savingsSummary"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["monthlyTracker"] });
  };

  const createGoalMutation = useMutation({
    mutationFn: (newGoal: any) => api.post("/goals", newGoal),
    onSuccess: () => {
      invalidate();
      toast.success("Savings goal created successfully.");
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/goals/${id}`, data),
    onSuccess: () => {
      invalidate();
      toast.success("Savings goal updated successfully.");
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Savings goal deleted successfully.");
    },
  });

  const allocateMutation = useMutation({
    mutationFn: (data: any) =>
      api.post("/goals/allocate", data),
    onSuccess: () => {
      invalidate();
      toast.success("Savings allocated to goal successfully.");
    },
  });

  const goals = goalsData?.goals || [];
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalAllocated = goals.reduce((sum, g) => sum + g.totalAllocated, 0);
  const totalRemainingNeeded = goals.reduce(
    (sum, g) => sum + g.remainingNeeded,
    0,
  );

  return (
    <div className="space-y-6">
      <Topbar
        title="Savings & Goals"
        subtitle="Earmark surplus toward financial milestones and track allocation history"
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setEditingGoal(null);
                setIsGoalModalOpen(true);
              }}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Goal
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-8 space-y-6 w-full">
        {/* Top Summary Banner */}
        <div className="bg-white rounded-lg border border-surface-border p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-surface-border">
          <div>
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider block">
              Total Goals Target
            </span>
            <CurrencyDisplay amount={totalTarget} size="xl" className="mt-1" />
            <p className="text-[11px] text-content-secondary mt-0.5">
              Across {goals.length} target goals
            </p>
          </div>

          <div className="pt-3 sm:pt-0 sm:px-4">
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider block">
              Total Earmarked
            </span>
            <CurrencyDisplay
              amount={totalAllocated}
              size="xl"
              className="mt-1 text-brand-700"
            />
            <p className="text-[11px] text-content-secondary mt-0.5">
              Allocated from monthly surplus
            </p>
          </div>

          <div className="pt-3 sm:pt-0 sm:pl-4">
            <span className="text-xs font-semibold uppercase text-content-secondary tracking-wider block">
              Remaining Needed
            </span>
            <CurrencyDisplay
              amount={totalRemainingNeeded}
              size="xl"
              className="mt-1"
            />
            <p className="text-[11px] text-content-secondary mt-0.5">
              Needed to achieve all targets
            </p>
          </div>
        </div>

        {/* Goals Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="No Savings Goals Configured"
            description="Create goals like an Emergency Fund, Travel Fund, or Major Purchase to earmark your monthly surplus."
            actionText="Create First Goal"
            onAction={() => {
              setEditingGoal(null);
              setIsGoalModalOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onAllocate={(goalId) => {
                  setSelectedGoalIdForAllocation(goalId);
                  setIsAllocateModalOpen(true);
                }}
                onEdit={(goal) => {
                  setEditingGoal(goal);
                  setIsGoalModalOpen(true);
                }}
                onDelete={(goalId) => setDeletingGoalId(goalId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Goal Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        initialData={editingGoal}
        onSubmit={async (data) => {
          if (editingGoal) {
            await updateGoalMutation.mutateAsync({ id: editingGoal.id, data });
          } else {
            await createGoalMutation.mutateAsync(data);
          }
        }}
      />

      {/* Allocate Modal */}
      <AllocateModal
        isOpen={isAllocateModalOpen}
        onClose={() => {
          setIsAllocateModalOpen(false);
          setSelectedGoalIdForAllocation(undefined);
        }}
        goals={goals}
        preselectedGoalId={selectedGoalIdForAllocation}
        onSubmit={async (data) => {
          await allocateMutation.mutateAsync(data);
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingGoalId)}
        onClose={() => setDeletingGoalId(null)}
        title="Delete Savings Goal?"
        message="Are you sure you want to delete this savings goal? Its allocation records will be removed, but your underlying financial transactions will not be altered."
        confirmText="Delete Goal"
        variant="destructive"
        onConfirm={async () => {
          if (deletingGoalId) {
            await deleteGoalMutation.mutateAsync(deletingGoalId);
            setDeletingGoalId(null);
          }
        }}
      />
    </div>
  );
};
