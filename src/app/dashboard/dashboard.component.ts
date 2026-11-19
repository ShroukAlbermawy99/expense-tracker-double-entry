import { CurrencyPipe, NgForOf, NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFabButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { RouterLink, RouterModule } from '@angular/router';
import firebase from 'firebase/compat/app';
import { Subscription } from 'rxjs';
import { Account, AccountCategory } from '../core/interfaces/account-model';
import { DatabaseService } from '../core/services/database.service';
import { TransactionDataService } from '../core/services/transaction-data.service';
import { UserService } from '../core/services/user.service';
import { CardSpinnerComponent } from '../shared/components/card-spinner/card-spinner.component';
import { ResponsiveService } from '../shared/services/responsive.service';
import { CategorySummaryChartComponent } from './components/category-summary-chart/category-summary-chart.component';
import { ChartSummaryComponent } from './components/chart-summary/chart-summary.component';
import { MonthlySummaryChartComponent } from './components/monthly-summary-chart/monthly-summary-chart.component';
import { NumberCardsComponent } from './components/number-cards/number-cards.component';
import { TableSummaryComponent } from './components/table-summary/table-summary.component';
import { ChartData } from './interfaces/chart-data';
import { AccountSummary } from './interfaces/transaction-summary';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatCardModule,
    NumberCardsComponent,
    MonthlySummaryChartComponent,
    MatIcon,
    RouterLink,
    CardSpinnerComponent,
    TableSummaryComponent,
    CategorySummaryChartComponent,
    MatFormField,
    FormsModule,
    MatDatepickerModule,
    MatInput,
    ChartSummaryComponent,
    MatCardModule,
    MatFormFieldModule,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatFabButton,
    RouterModule,
    NgForOf,
    NgTemplateOutlet,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  providers: [provideNativeDateAdapter()],
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly transactionDataService = inject(TransactionDataService);
  readonly responsiveService = inject(ResponsiveService);
  readonly userService = inject(UserService);
  readonly databaseService = inject(DatabaseService);
  categories: AccountCategory[] = [];
  accounts: Account[] = [];

  accountsDataChart: ChartData[] = [];
  accountsSourceData: ChartData[] = [];
  accountsDataTable: WritableSignal<Account[]> = signal([]);
  metrics: AccountSummary[] = [];
  isLoadingAccounts = true;
  isDataReady = false;
  isFirstLoad = true;
  date = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 3 >= 0 ? new Date().getMonth() - 3 : 0,
    new Date().getDate(),
  );
  categoryDate = new Date();
  types: AccountCategory[] = [];
  categoryMonthlyChartType: 'line' | 'column' = 'line';
  isMobile = this.responsiveService.isHandset;
  private accounts$: Subscription = new Subscription();

  private transactionDataEffect = effect(() => {
    const filteredAccounts = this.transactionDataService.filteredAccounts();
    if (!this.isFirstLoad) {
      this.processAccountsData(filteredAccounts);
    }
  });

  constructor(private database: DatabaseService) {}

  ngOnInit() {
    this.getUserAccounts();
  }

  ngOnDestroy() {
    this.accounts$.unsubscribe();
  }

  private async getUserAccounts() {
    const fallbackId = this.userService.getUserId();
    const email = this.userService.getUser()?.email;

    const startWithUserId = async (userId: string) => {
      this.userService.setUserId(userId);
      this.subscribeToAccountsChange(userId);
      // Seed in the background; subscription should pick up new accounts.
      void this.database.initializeAccounts(userId).catch((err) => {
        console.warn('Account initialization failed; continuing with existing data', err);
      });
    };

    if (!email && !fallbackId) {
      this.isLoadingAccounts = false;
      this.isDataReady = true;
      return;
    }

    // Prefer the auth uid immediately so the dashboard never hangs on email lookup.
    if (fallbackId) {
      await startWithUserId(fallbackId);
    }

    if (!email) {
      return;
    }

    try {
      const snapshot: firebase.database.DataSnapshot = await this.database.getUserDetails(email);
      const obj = snapshot.toJSON() ?? {};
      const key = Object.keys(obj)[0];
      if (key && key !== fallbackId) {
        this.userService.setUserId(key);
        await startWithUserId(key);
      }
    } catch (err) {
      console.error('Failed to load user details for dashboard', err);
      if (!fallbackId) {
        this.isLoadingAccounts = false;
        this.isDataReady = true;
      }
    }
  }

  private subscribeToAccountsChange(userId: string) {
    this.isLoadingAccounts = true;

    // One-shot RTDB load so the spinner cannot hang if the live subscription is delayed.
    void this.database
      .getUserAccountsOnce(userId, 'rtdb')
      .then((accounts) => {
        this.setData(
          accounts.map((account) => ({
            ...account,
            id: account.id ?? account.name,
          })),
        );
      })
      .catch((err) => {
        console.warn('One-shot RTDB account load failed', err);
      });

    // Safety valve: never leave the dashboard spinning forever.
    window.setTimeout(() => {
      if (this.isLoadingAccounts) {
        this.isLoadingAccounts = false;
        this.isDataReady = true;
      }
    }, 4000);

    this.accounts$.add(
      this.database.getRealTimeUserAccounts(userId, 'rtdb').subscribe({
        next: (accounts) => {
          this.setData(
            accounts.map((account) => ({
              ...account,
              id: account.id ?? account.name,
            })),
          );
        },
        error: (err) => {
          console.warn('RTDB accounts subscription failed, falling back to Firestore', err);
          this.accounts$.add(
            this.database.getRealTimeUserAccounts(userId, 'firestore').subscribe({
              next: (accounts) => {
                this.setData(
                  accounts.map((account) => ({
                    ...account,
                    id: account.id ?? account.name,
                  })),
                );
              },
              error: (firestoreErr) => {
                console.error('Failed to load accounts from Firestore', firestoreErr);
                this.isLoadingAccounts = false;
                this.isDataReady = true;
              },
            }),
          );
        },
      }),
    );
  }

  private setData(accounts: Account[]) {
    this.accounts = accounts;
    this.isFirstLoad = false;
    this.transactionDataService.setAccountsData(accounts);
    // Ensure metrics render even if the effect is skipped on first emission.
    this.processAccountsData(this.transactionDataService.filteredAccounts());
  }

  private processAccountsData(accounts: Account[]): void {
    if (accounts.length === 0) {
      this.isLoadingAccounts = false;
      this.isDataReady = true;
      this.metrics = [];
      this.accountsDataChart = [];
      this.accountsSourceData = [];
      this.accountsDataTable.set([]);
      this.types = [];
      this.categories = [];
      return;
    }
    const dates = accounts.map((e) => new Date(e.createdAt));
    const firstDate = dates.reduce((minDate, date) => (date < minDate ? date : minDate), dates[0]);
    const lastDate = dates.reduce((minDate, date) => (date > minDate ? date : minDate), dates[0]);
    const numOfEntries = accounts.length;
    const totalExpenses = this.getTotalByType(accounts, 'Expense');
    const totalAssets = this.getTotalByType(accounts, 'Asset');

    this.metrics = [
      {
        color: undefined,
        value: firstDate.toDateString().slice(3, 15),
        metricTitle: 'First Account Date',
        icon: 'today',
      },
      {
        color: undefined,
        value: lastDate.toDateString().slice(3, 15),
        metricTitle: 'Latest Account Date',
        icon: 'today',
      },
      { color: undefined, value: totalExpenses, metricTitle: 'Total Expenses', icon: 'payments' },
      { color: undefined, value: totalAssets, metricTitle: 'Total Assets', icon: 'account_balance_wallet' },
    ];

    this.types = accounts
      .map((item: Account) => item.type)
      .filter((value, index, self) => self.indexOf(value) === index);
    this.categories = [...this.types];

    const accountSources = Array.from(new Set(accounts.map((account) => String(account.source))));

    this.accountsDataChart = this.getSourceTotal(this.types, accounts, 'type');
    this.accountsSourceData = this.getSourceTotal(accountSources, accounts, 'source');
    this.accountsDataTable.set(accounts);

    this.isDataReady = true;
    this.isLoadingAccounts = false;
  }

  getSourceTotal(sources: string[], data: Account[], property: keyof Account): ChartData[] {
    const sourcePieData = [];

    for (const type of sources) {
      let sourceSum = 0;
      for (const value of data) {
        if (value[property] === type) {
          sourceSum += +value.balance;
        }
      }
      const dataObj = { name: type, y: sourceSum, value: +sourceSum.toFixed(2) };
      sourcePieData.push(dataObj);
    }
    return sourcePieData;
  }

  getTotal(accounts: Account[]): string {
    return this.getTotalByType(accounts);
  }

  getTotalByType(accounts: Account[], type?: Account['type']): string {
    const sum = accounts
      .filter((account) => !type || account.type === type)
      .reduce((total, account) => total + Number(account.balance || 0), 0);
    return new CurrencyPipe('en-US').transform(sum, 'USD') as string;
  }
}
/* This is your **`DashboardComponent`** code — the main orchestrator for your Transaction tracking dashboard. Let me break it down in terms of **inputs, processing, outputs, and lifecycle (init → destroy)** so you can clearly see how it all works:

---

## 🔹 Inputs

1. **User info**

   * Fetched via `UserService.getUser()` → email → used to query Firebase.

2. **Transaction data**

   * Subscribed from Firebase Realtime Database using `DatabaseService.getUserTransactions(userId)`.

3. **UI inputs**

   * Date pickers (`date`, `categoryDate`).
   * Chart type toggle (`categoryMonthlyChartType`).
   * Responsive detection (`responsiveService.isHandset`).

---

## 🔹 Processing

1. **Initialization**

   * `ngOnInit` → `getUserTransactions()`:

     * Gets current user’s Firebase key.
     * Calls `subscribeToTransactionsChange()` to start listening for Transaction updates.

2. **Data pipeline**

   * Firebase snapshots → `setData()`:

     * Calls `parseData()` to convert Firebase snapshot → `Transaction[]`.
     * Sets data in `TransactionDataService`.

   * Angular signal `effect` (`TransactionDataEffect`) reacts whenever `filteredTransactions()` changes.

     * Triggers `processTransactionData(filteredTransactions)`.

3. **Data processing inside `processTransactionData`**

   * **Dates** → Finds first and latest Transaction dates.
   * **Totals** → Calculates total amount (using `getTotal`).
   * **Metrics** → Builds `metrics[]` for `NumberCardsComponent`.
   * **Categories** → Extracts unique categories.
   * **Charts** → Prepares `TransactionDataChart` (by category) and `TransactionSourceData` (by type).
   * **Table data** → Updates `TransactionDataTable` signal with raw Transactions.

---

## 🔹 Outputs

1. **Metrics (cards)**

   * Number of Transactions, first/latest Transaction date, total Transactions.

2. **Charts**

   * Category pie chart.
   * Source pie chart.
   * Monthly summary chart.
   * Category monthly summary chart.

3. **Table**

   * Detailed Transaction table (`TableSummaryComponent`).

4. **UI Feedback**

   * Spinner when loading (`CardSpinnerComponent`).
   * Empty state message when no data.

---

## 🔹 Lifecycle

1. **OnInit (`ngOnInit`)**

   * Start fetching user and subscribing to Firebase Transaction data.

2. **Reactive updates**

   * Signals (`TransactionsSignal`, `filteredTransactions`) trigger effects → recompute charts/metrics automatically.

3. **OnDestroy (`ngOnDestroy`)**

   * `this.Transactions$.unsubscribe()` ensures Firebase subscription is cleaned up.
   * Angular automatically cleans up the signal `effect`.

---

## 🔹 Algorithm (High-Level)

```plaintext
Start Dashboard
↓
OnInit → Get current user ID
↓
Fetch Firebase key → Subscribe to user’s Transaction changes
↓
Whenever Firebase emits:
   - Parse data (snapshots → Transaction[])
   - Set data in TransactionDataService
↓
Effect triggers:
   - Process Transactions
   - Compute metrics, categories, totals
   - Prepare chart + table data
↓
Bind data to dashboard template
↓
OnDestroy → Unsubscribe from Firebase + clean signals
End
```

---

✅ In short:

* **Inputs** = Firebase data + user actions (date, chart toggle).
* **Processing** = Filtering, aggregating, computing totals + categories.
* **Outputs** = Metrics, charts, tables, spinner/empty states.
* **Lifecycle** = Init → subscribe → process → render → cleanup.

---

# Detailed algorithm — `DashboardComponent`

Below is a precise, implementation-ready **detailed algorithm** for your `DashboardComponent`.
It covers initialization, Firebase subscription, parsing, state updates, effects, chart/table preparation, error cases, and cleanup. Use it as pseudocode to implement or verify the component behavior.

---

## Assumptions

* `UserService.getUser()` returns the authenticated Firebase user (or `undefined`).
* `DatabaseService.getUserDetails(email)` returns a `Promise<DataSnapshot>` keyed by Firebase user id.
* `DatabaseService.getUserTransactions(userId)` returns an `Observable<SnapshotAction<Transaction>[]>`.
* `Transaction` objects have at least: `{ id?, date, amount, category, type, name }`.
* `TransactionDataService` exposes signals/computed used elsewhere (`setTransactionsData`, `filteredTransactions()`, etc.).
* Charts expect `ChartData[] = { name: string, y: number, value?: number }`.
* You want the UI flags: `isLoadingTransactions`, `isDataReady`, `isFirstLoad`.

---

## Top-level state (variables)

* `TransactionDataChart: ChartData[] = []`
* `TransactionSourceData: ChartData[] = []`
* `TransactionDataTable: WritableSignal<Transaction[]> = signal([])`
* `metrics: TransactionSummary[] = []`
* `isLoadingTransactions: boolean = true`
* `isDataReady: boolean = false`
* `isFirstLoad: boolean = true`
* `date`, `categoryDate`, `categoryMonthlyChartType`, `categories: string[]`
* `Transactions$` (Subscription container)
* `TransactionDataEffect` (signal `effect` that reacts to `filteredTransactions()`)
* `getUserTransactions()` / `subscribeToTransactionsChange()` / `parseData()` / `setData()` / `processTransactionData()` / `getSourceTotal()` / `getTotal()`

---

## High-level algorithm (sequence)

1. On component creation:
   1.1. Inject dependencies (DatabaseService, UserService, TransactionDataService, ResponsiveService, etc.).
   1.2. Initialize fields and signals (see Top-level state).
   1.3. Register `TransactionDataEffect` to react to `TransactionDataService.filteredTransactions()` — but keep `isFirstLoad` check to avoid running on initial empty state.

2. `ngOnInit`:
   2.1. Call `getUserTransactions()` to start the fetch/subscribe pipeline.

3. `getUserTransactions()`:
   3.1. Obtain current user email via `userService.getUser()?.email`.
   3.2. If no email → set `isLoadingTransactions=false` and exit.
   3.3. `database.getUserDetails(email)` → `then(snapshot)`:
   \- Convert snapshot to object, extract first key as `userId` (Firebase key).
   \- `userService.setUserId(userId)`.
   \- Call `subscribeToTransactionsChange()`.

4. `subscribeToTransactionsChange()`:
   4.1. Set `isLoadingTransactions = true`.
   4.2. If `userId` exists:
   \- Get Observable from `database.getUserTransactions(userId)`.
   \- `this.Transactions$.add(observable.subscribe(snapshots => setData(snapshots)))`.
   4.3. Else set `isLoadingTransactions = false`.

5. `setData(snapshots)`:
   5.1. `parsed = parseData(snapshots)` (see below).
   5.2. Set `isFirstLoad = false`.
   5.3. `TransactionDataService.setTransactionsData(parsed)` — push parsed list into central signal.

6. `TransactionDataEffect` (signal effect watching `TransactionDataService.filteredTransactions()`):
   6.1. On change, compute `filteredTransactions = TransactionDataService.filteredTransactions()`.
   6.2. If `isFirstLoad` → do nothing (skip first run).
   6.3. Else → call `processTransactionData(filteredTransactions)`.

7. `processTransactionData(Transactions[])`:
   7.1. If `Transactions.length === 0`:
   \- Set `isLoadingTransactions=false`, `isDataReady=true`.
   \- Clear outputs: `metrics = []`, `TransactionDataChart = []`, `TransactionSourceData = []`, `TransactionDataTable.set([])`, `categories = []`.
   \- Return.
   7.2. Compute `dates[] = Transactions.map(e => new Date(e.date))`. Validate each date.
   7.3. Compute `firstDate = min(dates)`, `lastDate = max(dates)`.
   7.4. Compute `numOfEntries = Transactions.length`.
   7.5. Compute `totalAmount = getTotal(Transactions)` (returns formatted currency string).
   7.6. Build `metrics[]` array of `TransactionSummary` objects (First date, Last date, Count, Total).
   7.7. Build `categories = unique(Transactions.map(e => e.category))`.
   7.8. `TransactionSources = unique(Transactions.map(e => e.type))`.
   7.9. `TransactionDataChart = getSourceTotal(categories, Transactions, 'category')`.
   7.10. `TransactionSourceData = getSourceTotal(TransactionSources, Transactions, 'type')`.
   7.11. `TransactionDataTable.set(Transactions)` to update table signal.
   7.12. Set `isDataReady = true`, `isLoadingTransactions = false`.

8. `ngOnDestroy`:
   8.1. `this.Transactions$.unsubscribe()` — terminate subscription(s).
   8.2. Any signal `effect`s are automatically disposed by Angular when component is destroyed — no manual `effect.dispose()` required.

---

## Detailed pseudocode for each function

### `ngOnInit()`

```pseudo
function ngOnInit():
  call getUserTransactions()
```

### `getUserTransactions()`

```pseudo
function getUserTransactions():
  email = userService.getUser()?.email
  if !email:
    isLoadingTransactions = false
    return

  database.getUserDetails(email)
    .then(snapshot => {
      obj = snapshot.toJSON() ?? {}
      keys = Object.keys(obj)
      if keys.length === 0:
        isLoadingTransactions = false
        return
      userId = keys[0]
      userService.setUserId(userId)
      subscribeToTransactionsChange()
    })
    .catch(error => {
      // handle error: log, set flags, notify user
      isLoadingTransactions = false
      isDataReady = false
      // optionally show snackbar
    })
```

### `subscribeToTransactionsChange()`

```pseudo
function subscribeToTransactionsChange():
  userId = userService.getUserId()
  isLoadingTransactions = true
  if !userId:
    isLoadingTransactions = false
    return

  observable = database.getUserTransactions(userId) // returns Observable<SnapshotAction[]>
  subscription = observable.subscribe(
    snapshots => setData(snapshots),
    error => {
      // handle error
      isLoadingTransactions = false
      isDataReady = false
    }
  )
  Transactions$.add(subscription)
```

### `parseData(snapshots: SnapshotAction<Transaction>[]) -> Transaction[]`

```pseudo
function parseData(snapshots):
  data = []
  for each snapshot in snapshots:
    Transaction = snapshot.payload.exportVal()
    Transaction.id = snapshot.key
    // optional validation:
    if !Transaction.date or !Transaction.amount:
      // skip or normalize
    data.push(Transaction)
  return data
```

### `setData(snapshots)`

```pseudo
function setData(snapshots):
  parsed = parseData(snapshots)
  isFirstLoad = false
  TransactionDataService.setTransactionsData(parsed)
```

### `TransactionDataEffect` (registered as an effect)

```pseudo
effect TransactionDataEffect:
  filteredTransactions = TransactionDataService.filteredTransactions()
  if isFirstLoad:
    return  // skip initial run
  processTransactionData(filteredTransactions)
```

### `processTransactionData(Transactions)`

```pseudo
function processTransactionData(Transactions):
  if !Array.isArray(Transactions) or Transactions.length === 0:
    isLoadingTransactions = false
    isDataReady = true
    metrics = []
    TransactionDataChart = []
    TransactionSourceData = []
    TransactionDataTable.set([])
    categories = []
    return

  // 1. dates
  dates = []
  for e in Transactions:
    dateObj = new Date(e.date)
    if isNaN(dateObj.valueOf()):
      // skip or coerce; continue
    dates.push(dateObj)

  firstDate = min(dates) // reduce
  lastDate = max(dates)

  // 2. counts & totals
  numOfEntries = Transactions.length
  totalAmount = getTotal(Transactions)  // returns formatted currency string

  // 3. metrics
  metrics = [
    { value: firstDate.toDateString().slice(3,15), metricTitle: 'First Transaction Date', icon: 'today' },
    { value: lastDate.toDateString().slice(3,15), metricTitle: 'Latest Transaction Date', icon: 'today' },
    { value: numOfEntries, metricTitle: 'Number of Transactions', icon: 'receipt' },
    { value: totalAmount, metricTitle: 'Total Transactions Amount', icon: 'payments' }
  ]

  // 4. categories / sources
  categories = unique(Transactions.map(e => e.category))
  TransactionSources = unique(Transactions.map(e => e.type))

  // 5. charts
  TransactionDataChart = getSourceTotal(categories, Transactions, 'category')
  TransactionSourceData = getSourceTotal(TransactionSources, Transactions, 'type')

  // 6. table
  TransactionDataTable.set(Transactions)

  // 7. flags
  isDataReady = true
  isLoadingTransactions = false
```

### `getSourceTotal(sources[], data[], property) -> ChartData[]`

```pseudo
function getSourceTotal(sources, data, property):
  result = []
  for each type in sources:
    sum = 0
    for each record in data:
      if record[property] === type:
        sum += Number(record.amount) // coerce
    // preserve numeric precision
    rounded = Number(sum.toFixed(2))
    result.push({ name: type, y: sum, value: rounded })
  return result
```

### `getTotal(Transactions) -> string`

```pseudo
function getTotal(Transactions):
  sum = 0
  for each e in Transactions:
    sum += Number(e.amount) // coerce
  // format currency e.g., USD
  return CurrencyPipe('en-US').transform(sum, 'USD')
```

### `ngOnDestroy()`

```pseudo
function ngOnDestroy():
  Transactions$.unsubscribe()   // stops Firebase subscriptions
  // signal effects are disposed automatically by Angular on destroy
```

---

## Edge cases and error handling (recommended)

* **No user / not authenticated**: detect earlier and set `isLoadingTransactions=false` with empty state UI.
* **Empty Firebase snapshot**: handle gracefully (`obj` keys length zero).
* **Malformed Transaction (missing date/amount)**: skip or normalize — avoid `NaN` in sums.
* **Network errors**: show user-friendly message (snackbar) and set `isLoadingTransactions=false`.
* **High-frequency updates**: Firebase can emit many snapshots; if heavy processing becomes a problem, debounce updates (e.g., throttle with `debounceTime(200)` before `setData`) or batch processing.
* **Precision**: use `Number(sum.toFixed(2))` for chart `value` but keep raw numeric `y` if necessary.

---

## Performance considerations & optimizations

* Use `signal` and `effect` so only necessary re-computations run.
* Avoid rebuilding arrays unnecessarily: when possible update signals with references to immutable values so `OnPush` components only re-render when needed.
* If `Transactions` is large, consider:

  * Pre-aggregating on the server or with incremental updates instead of recomputing full charts on every snapshot.
  * Use web worker for heavy aggregation (if performance is impacted).
* Use `debounceTime` on the observable pipeline if the DB emits rapid successive snapshots.

---

## Test scenarios (what to verify)

1. **Happy path**: user with several Transactions → charts, metrics and table populate correctly.
2. **No data**: user exists but no Transactions → `no data` UI shows, `isLoadingTransactions=false`.
3. **Malformed data**: Transaction missing amount/date → skipped or handled gracefully.
4. **Rapid updates**: many snapshots in short time → UI remains responsive.
5. **Logout / user change**: unsubscribes and resets state correctly.
6. **Network error**: error message shown and state flags set accordingly.

---

## Implementation checklist (practical)

* [ ] Ensure `getUserTransactions()` is invoked only after user is ready (guard on `userService.getUser()`).
* [ ] Use `.add()` on your `Subscription` container so multiple subscriptions are tracked.
* [ ] Always `unsubscribe()` in `ngOnDestroy`.
* [ ] Validate `snapshot.toJSON()` structure before using `Object.keys(...)`.
* [ ] Safeguard date parsing (`new Date(e.date)`) and numeric parsing for `amount`.
* [ ] Make `TransactionDataEffect` early-return on `isFirstLoad` to avoid double-processing initial population.
* [ ] Use `isLoadingTransactions` to show spinner and `isDataReady` to control dashboard rendering.

---

If you want, I can now:

* Convert this pseudocode into a **ready-to-paste TypeScript implementation** for each helper function, or
* Produce a **sequence ASCII diagram** showing the runtime interactions step-by-step (Firebase → setData → effects → charts).

 */
