import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import { EntrySource } from '@core/enums/entry-types';
import { defaultChartOfAccounts } from '@shared/constants/expense-constants';
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns';
import { Account, AccountCategory } from '../interfaces/account-model';
import { TimeFrameFilter } from '../interfaces/time-frame-filter';

export type CategoryOption = { value: string; removable: boolean };
export type GroupedCategories = Record<AccountCategory, CategoryOption[]>;

const EMPTY_CATEGORIES = (): GroupedCategories => ({
  Asset: [],
  Liability: [],
  Equity: [],
  Revenue: [],
  Expense: [],
});

@Injectable({
  providedIn: 'root',
})
export class TransactionDataService {
  private readonly _showFilters = signal(false);
  private readonly _accountsSignal = signal<Account[]>([]);
  private readonly _sourceTypesSignal = signal<string[]>([]);
  private readonly _categoriesSignal = signal<GroupedCategories>(EMPTY_CATEGORIES());
  private readonly _timeFrameFilter = signal<TimeFrameFilter | undefined>(undefined);
  private readonly _filesImported = signal<string[]>([]);
  private readonly _accountEntryTypeFilter = signal<string | undefined>(undefined);

  private readonly _defaultCategories: GroupedCategories = EMPTY_CATEGORIES();

  constructor() {
    for (const account of defaultChartOfAccounts) {
      this._defaultCategories[account.type].push({ value: account.name, removable: false });
    }
  }

  readonly filteredAccounts = computed(() => {
    const timeFilter = this._timeFrameFilter();
    const entryTypeFilter = this._accountEntryTypeFilter();
    const accounts = this.filterAccountsByEntryType(this._accountsSignal(), entryTypeFilter);

    if (!timeFilter || !accounts.length) {
      return accounts;
    }

    if (timeFilter.customDateRange) {
      return this.filterByCustomDateRange(accounts, timeFilter);
    }

    return this.filterByTimeFrame(accounts, timeFilter);
  });

  readonly flatCategoryNames = computed(() => {
    const grouped = this._categoriesSignal();
    return (Object.keys(grouped) as AccountCategory[]).flatMap((type) => grouped[type].map((item) => item.value));
  });

  private filterAccountsByDateInterval(accounts: Account[], start: Date, end: Date): Account[] {
    const interval = {
      start: startOfDay(start),
      end: endOfDay(end),
    };

    return accounts.filter((account) => {
      const accountDate = this.parseAccountDate(account);
      return isWithinInterval(accountDate, interval);
    });
  }

  private parseAccountDate(account: Account): Date {
    return account.createdAt instanceof Date ? account.createdAt : new Date(account.createdAt);
  }

  private filterAccountsByEntryType(accounts: Account[], entryTypeFilter: string | undefined): Account[] {
    if (!entryTypeFilter) {
      return accounts;
    }

    return accounts.filter((account) => String(account.source) === entryTypeFilter);
  }

  private filterByCustomDateRange(accounts: Account[], timeFilter: TimeFrameFilter): Account[] {
    const { customDateRange } = timeFilter;
    const { start, end } = customDateRange ?? {};

    if (!start || !end) {
      return accounts;
    }

    return this.filterAccountsByDateInterval(accounts, start, end);
  }

  private filterByTimeFrame(accounts: Account[], timeFilter: TimeFrameFilter): Account[] {
    const { start, end } = timeFilter.getDates();

    if (!start || !end) {
      return accounts;
    }

    return this.filterAccountsByDateInterval(accounts, start, end);
  }

  get accountsSignal(): WritableSignal<Account[]> {
    return this._accountsSignal;
  }

  get accountSourcesSignal(): WritableSignal<string[]> {
    return this._sourceTypesSignal;
  }

  /** Alias kept for components still using the old expense naming. */
  get expenseSourcesSignal(): WritableSignal<string[]> {
    return this._sourceTypesSignal;
  }

  get categoriesSignal(): WritableSignal<GroupedCategories> {
    return this._categoriesSignal;
  }

  get timeFrameFilterSignal(): WritableSignal<TimeFrameFilter | undefined> {
    return this._timeFrameFilter;
  }

  get filesImportedSignal(): WritableSignal<string[]> {
    return this._filesImported;
  }

  get accountEntryTypeFilter(): WritableSignal<string | undefined> {
    return this._accountEntryTypeFilter;
  }

  get showFilters(): WritableSignal<boolean> {
    return this._showFilters;
  }

  get defaultCategories(): GroupedCategories {
    return {
      Asset: [...this._defaultCategories.Asset],
      Liability: [...this._defaultCategories.Liability],
      Equity: [...this._defaultCategories.Equity],
      Revenue: [...this._defaultCategories.Revenue],
      Expense: [...this._defaultCategories.Expense],
    };
  }

  setAccountsData(accounts: Account[]) {
    this._accountsSignal.set(accounts);
  }

  setAccountSourcesData(accountSources: string[]) {
    this._sourceTypesSignal.set(accountSources);
  }

  setExpenseSourcesData(sources: string[]) {
    this.setAccountSourcesData(sources);
  }

  setCategoriesSignal(categories: GroupedCategories | Record<AccountCategory, string[]> | CategoryOption[] | unknown) {
    this._categoriesSignal.set(this.normalizeCategories(categories));
  }

  setTimeFrameFilter(timeFrameFilter: TimeFrameFilter | undefined) {
    this._timeFrameFilter.set(timeFrameFilter);
  }

  setFilesImported(files: string[]) {
    this._filesImported.set(files);
  }

  setAccountEntryTypeFilter(type: string | undefined) {
    this._accountEntryTypeFilter.set(type);
  }

  normalizeCategories(categories: unknown): GroupedCategories {
    const result = EMPTY_CATEGORIES();

    if (!categories) {
      return this.defaultCategories;
    }

    if (Array.isArray(categories)) {
      for (const item of categories) {
        if (!item || typeof item !== 'object') continue;
        for (const type of Object.keys(item) as AccountCategory[]) {
          if (!(type in result)) continue;
          const value = (item as Record<string, CategoryOption | string>)[type];
          if (typeof value === 'string') {
            result[type].push({ value, removable: true });
          } else if (value?.value) {
            result[type].push({ value: value.value, removable: value.removable ?? true });
          }
        }
      }
      return result;
    }

    if (typeof categories === 'object') {
      for (const type of Object.keys(result) as AccountCategory[]) {
        const value = (categories as Record<string, unknown>)[type];
        if (!value) continue;
        if (Array.isArray(value)) {
          result[type] = value.map((entry) =>
            typeof entry === 'string'
              ? { value: entry, removable: true }
              : { value: (entry as CategoryOption).value, removable: (entry as CategoryOption).removable ?? true },
          );
        } else if (typeof value === 'string') {
          result[type] = [{ value, removable: true }];
        }
      }
      return result;
    }

    return this.defaultCategories;
  }
}

/** Back-compat alias for imports that still use the old service name. */
export { TransactionDataService as ExpenseDataService };
