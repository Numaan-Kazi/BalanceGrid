import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Account } from '../../types';

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['BANK', 'CASH', 'WALLET', 'OTHER']),
  openingBalance: z.coerce.number().min(0, 'Opening balance cannot be negative'),
  openingBalanceDate: z.string().min(1, 'Date is required'),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
  initialData?: Account | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'BANK',
      openingBalance: initialData?.openingBalance ?? 0,
      openingBalanceDate: initialData?.openingBalanceDate || new Date().toISOString().split('T')[0],
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        type: initialData.type,
        openingBalance: initialData.openingBalance,
        openingBalanceDate: initialData.openingBalanceDate,
      });
    } else {
      reset({
        name: '',
        type: 'BANK',
        openingBalance: 0,
        openingBalanceDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [initialData, reset]);

  const onFormSubmit = async (data: AccountFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Account' : 'Add New Account'}
      description="Track bank accounts, cash, or digital wallets with an opening balance."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <Input
          label="Account Name"
          placeholder="e.g. HDFC Salary, SBI Savings, Cash in Wallet"
          error={errors.name?.message}
          {...register('name')}
        />

        <Select
          label="Account Type"
          error={errors.type?.message}
          options={[
            { value: 'BANK', label: 'Bank Account' },
            { value: 'CASH', label: 'Cash' },
            { value: 'WALLET', label: 'Digital Wallet (e.g. Paytm)' },
            { value: 'OTHER', label: 'Other Manually Tracked' },
          ]}
          {...register('type')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Opening Balance (₹)"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.openingBalance?.message}
            helperText="Starting balance before tracking"
            {...register('openingBalance')}
          />

          <Input
            label="Opening Date"
            type="date"
            error={errors.openingBalanceDate?.message}
            {...register('openingBalanceDate')}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

