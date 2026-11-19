import { AccountCategory, Expense } from './account-model';

export interface UserDataRecord {
  firstName: string;
  lastName: string;
  categories?: Record<AccountCategory, { value: string; removable: boolean }[] | string[] | string> | Record<string, string>;
  types?: Record<string, string>;
  expenses?: Record<string, Expense>;
  filesImported?: Record<string, string>;
}
