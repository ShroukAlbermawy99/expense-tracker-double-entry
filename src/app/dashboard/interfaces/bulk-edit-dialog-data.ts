import { Account, Expense } from '../../core/interfaces/account-model';

export interface BulkEditDialogData {
  title: string;
  expenses?: Expense[];
  accounts?: Account[];
  confirmButtonText: string;
  cancelButtonText: string;
  editType: 'category' | 'type' | 'delete';
  previewOnly?: boolean;
}

export interface BulkEditDialogResult {
  successful?: number;
  error?: string;
  editForm?: Record<string, string>;
  expenses?: Expense[];
}
