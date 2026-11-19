import { Account, Expense } from '@core/interfaces/account-model';

export interface ManageExpenseData {
  expense?: Expense;
  account?: Account;
  update?: boolean;
  previewDataMode?: boolean;
}
