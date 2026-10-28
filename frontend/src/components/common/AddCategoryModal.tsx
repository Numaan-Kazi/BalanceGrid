import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { api } from '@/lib/api';
import { Category } from '@/types';
import { AlertCircle, Plus } from 'lucide-react';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: catData } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const categories = catData?.categories || [];

  const createMutation = useMutation({
    mutationFn: (catName: string) => api.post('/categories', { name: catName, icon: 'tag' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyTracker'] });
      setName('');
      setError(null);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create category');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Category name is required');
      return;
    }

    const duplicate = categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setError(`A category named "${trimmed}" already exists.`);
      return;
    }

    await createMutation.mutateAsync(trimmed);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setError(null);
        setName('');
        onClose();
      }}
      title="Add New Category"
      description="Create a custom spending category. It will be available immediately across your trackers and selectors."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Category Name"
          placeholder="e.g. Healthcare, Fitness, Pets"
          value={name}
          onChange={e => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          className="text-xs"
          autoFocus
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={createMutation.isPending}
            disabled={createMutation.isPending || !name.trim()}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Category
          </Button>
        </div>
      </form>
    </Modal>
  );
};

