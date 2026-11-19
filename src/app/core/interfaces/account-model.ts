// import { UUID } from "crypto";
import { EntrySource } from "../enums/entry-types";
export interface Expense {
  id?: string;
  name: string;
  date: Date | string;
  category: string;
  type: string;
  amount: number | string;
  comments?: string;
  importedOn?: Date;
  importedFrom?: string;
};
export interface JournalEntry {
    date: Date | string;
    description: string;
    entries: Entry [];
    source?: EntrySource;
    importedfrom?: string;
    createdBy: Date | string;
    createdAt: Date | string;
};

export interface Entry {
  account: string;
  type: string;
  amount: number;
} 

export interface Transaction {
    date: Date | string;
    description: string;
    debitAccountName: string;
    creditAccountName: string;
    debitAmount: number;
    creditAmount: number;
    importedOn?: Date;
};

interface SourceInfo {
  source: EntrySource;
  createdBy: string;
  createdAt: Date | string;
  importedFrom?: string;
  importedOn: boolean;
}

export interface Account extends SourceInfo {
  id?: string;
  name: string;
  type: AccountCategory;
  balance: number;
  comments?: string;
}
export type AccountCategory = "Asset" | "Expense" | "Revenue"| "Liability" | "Equity";

export type SourceType = 'manual'|'imported' | 'auto' | 'mixed';

export interface QueuedEntry {
  userId: string;
  account: string;
  txId: string;
  data: unknown; // or JournalEntry if you always enqueue journal entries
}

export interface JournalEntryLine {
  account: string;   
  type: 'Debit' | 'Credit';
  amount: number;
}

export interface EntryWithAccounts extends JournalEntry {
  // id: string, // Firestore doc ID
  accountsInvolved: string[];
  transactionId: string; // embedded ID
  createdBy: string;
  createdAt: string;
  balance: number;
}

export interface ExportedAccount {
  Name: string;
  Amount: number;
  Date: string;
  Category: string;
  Type: string;
  Comments: string;
}

export type CategoryItem = Partial<Record<AccountCategory, {value: string, removable: boolean}>>;
