import { EntrySource } from '@core/enums/entry-types';
import { Account } from '../../core/interfaces/account-model';
// import categories from 'app/expense-settings/interfaces/chip-option';
// export const defaultExpenseCategories: Record<AccountCategory, string>  = [
//   'Groceries',
//   'Transportation',
//   'Entertainment',
//   'Dining out',
//   'Unassigned',
// ];

export const defaultChartOfAccounts: Account[] = [
  // Assets
  { name: 'Cash', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Accounts Receivable', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Inventory', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Prepaid Expenses', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Short-Term Investments', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Equipment', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Buildings', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Land', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Vehicles', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Patents', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Trademarks', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Goodwill', type: 'Asset', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },

  // Liabilities
  { name: 'Accounts Payable', type: 'Liability', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Salaries Payable', type: 'Liability', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Taxes Payable', type: 'Liability', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Unearned Revenue', type: 'Liability', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Short-Term Loans', type: 'Liability', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Loans Payable', type: 'Liability', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Bonds Payable', type: 'Liability', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Lease Obligations', type: 'Liability', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },

  // Equity
  { name: 'Owner’s Capital', type: 'Equity', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Retained Earnings', type: 'Equity', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Contributed Capital', type: 'Equity', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Dividends', type: 'Equity', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },

  // Revenues
  { name: 'Sales Revenue', type: 'Revenue', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Service Revenue', type: 'Revenue', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Interest Income', type: 'Revenue', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Rental Income', type: 'Revenue', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Other Income', type: 'Revenue', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },

  // Expenses
  { name: 'Rent Expense', type: 'Expense', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Utilities Expense', type: 'Expense', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Salaries Expense', type: 'Expense', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Insurance Expense', type: 'Expense', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Depreciation Expense', type: 'Expense', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Supplies Expense', type: 'Expense', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Repairs Expense', type: 'Expense', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Interest Expense', type: 'Expense', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Taxes Expense', type: 'Expense', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
  { name: 'Loss on Disposal', type: 'Expense', balance: 0, source: EntrySource.AUTO, createdAt: "", createdBy: "", importedOn: false },
];
