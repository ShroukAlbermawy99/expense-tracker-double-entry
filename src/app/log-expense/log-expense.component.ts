import { NgForOf, NgIf } from '@angular/common';
import { Component, effect, inject, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CardSpinnerComponent } from '@shared/components/card-spinner/card-spinner.component';
import { map } from 'rxjs/operators';
import { Account, JournalEntry, Transaction } from '../core/interfaces/account-model';
import { UserDataRecord } from '../core/interfaces/user-data-record';
import { DatabaseService } from '../core/services/database.service';
import { TransactionDataService } from '../core/services/transaction-data.service';
import { UserService } from '../core/services/user.service';
import { EntrySource } from '@core/enums/entry-types';
import { defaultChartOfAccounts } from '../shared/constants/expense-constants';

@Component({
  selector: 'app-log-expense',
  templateUrl: './log-expense.component.html',
  imports: [
    MatIcon,
    FormsModule,
    NgIf,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInput,
    NgForOf,
    CardSpinnerComponent,
  ],
  providers: [provideNativeDateAdapter()],
  styleUrls: ['./log-expense.component.scss'],
})
export class LogExpenseComponent implements OnInit {
  categories: string[] = [];
  types: string[] = [];
  // expenseObj: Expense = {
  //   name: '',
  //   date: '',
  //   category: '',
  //   type: '',
  //   amount: '',
  //   comments: '',
  // };
  transactionObj: Transaction = {
    date: new Date(),
    description: '',
    debitAccountName: '',
    creditAccountName: '',
    debitAmount: 0,
    creditAmount: 0,
  };
  // account: Account = {} as Account;
  account: Account = {} as Account;

  chartOfAccounts: Account[] = [];
  hasBeenInitialised = false;
  // firestoreTransaction: FirestoreTransaction = {} as FirestoreTransaction;

  isLoading = false;
  dateError = false;
  maxDate: Date = new Date();

  private accountDataService: TransactionDataService = inject(TransactionDataService);
  private expenseDataUpdate = effect(() => {
    this.categories = this.accountDataService.flatCategoryNames();
    this.types = this.accountDataService.accountSourcesSignal();
    if (!this.types.length) {
      this.types = this.chartOfAccounts.map((account) => account.name);
    }
  });

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    private database: DatabaseService,
  ) {}

  ngOnInit(): void {
    this.chartOfAccounts = [...defaultChartOfAccounts];
    this.getAllUserDetails();
    if (!this.hasBeenInitialised) {
      this.database.initializeAccounts(this.userService.getUserId()).catch((err) => {
        console.warn('Failed to initialize accounts on log expense', err);
      });
      this.hasBeenInitialised = true;
    }
    this.loadChartOfAccounts();
  }

  private getAllUserDetails() {
    if (this.userService.getUser()) {
      this.database.getUserDetailsById(this.userService.getUserId()).then((jsonData) => {
        const obj: UserDataRecord = (jsonData.toJSON() ?? {}) as UserDataRecord;
        const categories = obj.categories ?? {};
        const types = obj.types ?? {};

        const normalized = this.accountDataService.normalizeCategories(categories);
        const categoriesList = Object.values(normalized).flatMap((items) => items.map((item) => item.value));
        const sourceTypesList: string[] = Object.keys(types).map((key) => types[key]);

        this.categories = categoriesList.length
          ? categoriesList
          : [...defaultChartOfAccounts.map((account) => account.name)];
        this.types = sourceTypesList.length ? sourceTypesList : [...defaultChartOfAccounts.map((account) => account.name)];
      });
    }
  }
  private loadChartOfAccounts() {
    this.database
      .getRealTimeUserAccounts(this.userService.getUserId(), 'rtdb')
      .pipe(map((accounts) => (accounts.length ? accounts : [...defaultChartOfAccounts])))
      .subscribe({
        next: (accounts) => {
          this.chartOfAccounts = accounts;
        },
        error: () => {
          this.chartOfAccounts = [...defaultChartOfAccounts];
        },
      });
  }
  checkAccounts(): boolean {
    const knownAccounts =
      this.chartOfAccounts?.length > 0 ? this.chartOfAccounts : [...defaultChartOfAccounts];
    const debitExists = knownAccounts.some((a) => a.name === this.transactionObj.debitAccountName);
    const creditExists = knownAccounts.some((a) => a.name === this.transactionObj.creditAccountName);

    if (!debitExists || !creditExists) {
      this.snackBar.open('Invalid account selected.', '', { duration: 2000 });
      return false;
    }

    return true;
  }

  // --- Helpers ---
  getAccount(name: string): Account {
    const acc = this.chartOfAccounts.find((a) => a.name === name);
    if (!acc) {
      throw new Error(`Account not found: ${name}`);
    }
    return acc;
  }

  // saveExpenseEntry(expenseForm: NgForm) {
  //   this.isLoading = true;
  //   if (typeof this.expenseObj.date !== 'string') {
  //     this.expenseObj.date = this.expenseObj.date.toISOString();
  //   }
  //   this.database
  //     .saveNewExpense(this.expenseObj, this.userService.getUserId())
  //     .then(() => {
  //       this.isLoading = false;
  //       expenseForm.resetForm();
  //       this.resetExpenseObj();
  //       this.showSnackBar();
  //       this.announceExpenseChange();
  //     })
  //     .catch((e) => {
  //       this.snackBar.open(e?.message ?? 'Something went wrong. Please try again.', '', { duration: 2000 });
  //       this.isLoading = false;
  //     });
  // }

  // validateTransaction( transactionForm: NgForm ) {
  //   if (this.transactionObj.creditAmount === this.transactionObj.debitAmount && this.transactionObj.creditAmount > 0 && this.transactionObj.debitAmount > 0 && this.transactionObj.creditAccountName !== this.transactionObj.debitAccountName && this.transactionObj.date !== "" && this.transactionObj.description.length >= 4 && this.userService.getUserId() !== "") {
  //     this.saveTransactionEntry(transactionForm);
  //   }
  // }

  /** Used by the template — must stay free of snackbars/side effects. */
  get canSaveTransaction(): boolean {
    const debitAmount = Number(this.transactionObj.debitAmount);
    const creditAmount = Number(this.transactionObj.creditAmount);

    return (
      !Number.isNaN(debitAmount) &&
      !Number.isNaN(creditAmount) &&
      debitAmount === creditAmount &&
      debitAmount > 0 &&
      !!this.transactionObj.debitAccountName &&
      !!this.transactionObj.creditAccountName &&
      this.transactionObj.debitAccountName !== this.transactionObj.creditAccountName &&
      (this.transactionObj.description?.trim().length ?? 0) >= 4 &&
      this.transactionObj.date != null &&
      this.userService.getUserId() !== ''
    );
  }

  isTransactionValid(): boolean {
    this.transactionObj.debitAmount = Number(this.transactionObj.debitAmount);
    this.transactionObj.creditAmount = Number(this.transactionObj.creditAmount);
    return this.canSaveTransaction && this.checkAccounts();
  }

  validateTransaction(transactionForm: NgForm) {
    if (this.isTransactionValid()) {
      this.saveTransactionEntry(transactionForm);
    } else {
      this.snackBar.open('Validation failed. Please check your inputs.', '', { duration: 2000 });
    }
  }

  buildJournalEntry(): JournalEntry {
    return {
      date: this.transactionObj.date,
      description: this.transactionObj.description.trim(),
      entries: [
        {
          account: this.transactionObj.debitAccountName,
          type: 'Debit',
          amount: Number(this.transactionObj.debitAmount),
        },
        {
          account: this.transactionObj.creditAccountName,
          type: 'Credit',
          amount: Number(this.transactionObj.creditAmount),
        },
      ],
      source: EntrySource.MANUAL,
      createdBy: this.userService.getUserId(),
      createdAt: new Date().toISOString(),
    };
  }

  async saveTransactionEntry(transactionForm: NgForm) {
    const userId = this.userService.getUserId();
    const journalEntry = this.buildJournalEntry();
    this.isLoading = true;
    if (typeof journalEntry.date !== 'string') {
      journalEntry.date = journalEntry.date.toISOString();
    }
    journalEntry.createdBy = userId;
    journalEntry.createdAt = new Date().toISOString();

    try {
      await this.database.initializeAccounts(userId);
      await this.database.saveNewTransaction(journalEntry, userId);
      this.isLoading = false;
      transactionForm.resetForm();
      this.resetTransactionObj();
      this.showSnackBar();
      this.announceTransactionChange();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      this.snackBar.open(message, '', { duration: 4000 });
      this.isLoading = false;
    }
  }

  announceExpenseChange() {
    this.database.announceExpenseCreated('new expense');
  }

  announceTransactionChange() {
    this.database.announceTransacionCreated('new transaction');
  }

  resetTransactionObj() {
    this.transactionObj = {
      date: '',
      description: '',
      debitAccountName: '',
      creditAccountName: '',
      debitAmount: 0,
      creditAmount: 0,
    };
  }

  showSnackBar() {
    this.snackBar.open('Transaction saved!', '', { duration: 2000 });
  }

  // saveExpense(valid: boolean | null, form: NgForm) {
  //   if (valid) {
  //     this.saveExpenseEntry(form);
  //   }
  // }

  saveTransaction(valid: boolean | null, form: NgForm) {
    if (valid) {
      this.validateTransaction(form);
    }
  }

  checkDate() {
    this.dateError = this.transactionObj.date == null;
  }

  clearForm(transactionForm: NgForm) {
    this.dateError = false;
    transactionForm.resetForm();
    this.resetTransactionObj();
  }

  formatAmount() {
    if (this.transactionObj.debitAmount) {
      this.transactionObj.debitAmount = parseFloat(this.transactionObj.debitAmount.toFixed(2));
      this.transactionObj.creditAmount = this.transactionObj.debitAmount;
    } else if (this.transactionObj.creditAmount) {
      this.transactionObj.creditAmount = parseFloat(this.transactionObj.creditAmount.toFixed(2));
      this.transactionObj.debitAmount = this.transactionObj.creditAmount;
    }
  }
}
// toFixed() is a method of the Number object. Its purpose is to format a number into a string, rounding it to a specified number of decimal places.
// parseFloat() is used to parse a string and convert it into a floating-point number.
/* Perfect 👌 Thanks for sharing the full `LogExpenseComponent`. Let’s carefully break it down **in the same structured way you like** (Inputs, Outputs, Process, Algorithm, Data Flow, Method Flow, Flow Chart).

---

# 🔹 **Component Analysis: `LogExpenseComponent`**

---

## **Inputs**

1. **Form Inputs (from user via template):**

   * `name`: Expense name (string, required, min length 4).
   * `amount`: Expense amount (number, required, > 0, max 2 decimals).
   * `date`: Expense date (Date, required, <= `maxDate`).
   * `category`: Expense category (string, required, from user categories or defaults).
   * `type`: Payment source/type (string, required, from user types or defaults).
   * `comments`: Optional text.

2. **Services / Data Sources:**

   * `UserService.getUserId()` → retrieves the current user’s ID.
   * `DatabaseService.getUserDetailsById(id)` → fetches user-specific categories and types.
   * `ExpenseDataService.categoriesSignal()` / `expenseSourcesSignal()` → signals for expense categories/types.

---

## **Outputs**

1. **Saved Expense Record** stored in DB (`DatabaseService.saveNewExpense()`).
2. **SnackBar Notifications:**

   * Success: "Expense saved!"
   * Failure: "Something went wrong. Please try again."
3. **UI Effects:**

   * Reset form fields after save or reset button.
   * Display validation errors in form (`mat-error`).
   * Show/Hide loader (`isLoading`).
4. **Broadcast Event:**
   `database.announceExpenseCreated("new expense")`.

---

## **Process**

1. Load user categories and types (from DB or defaults).
2. User fills the expense form.
3. Validate form inputs (Angular validation + custom checks).
4. Format `amount` and ensure `date` is valid.
5. On save:

   * Send `expenseObj` to DB.
   * If success → reset form, show snackbar, broadcast event.
   * If error → show snackbar with error message.
6. Reset or clear form if requested.

---

## **Detailed Algorithm**

**Algorithm: LogExpense**

**Step 1: Initialization**

* Set `maxDate = today`.
* Initialize `expenseObj` with empty fields.
* Fetch user categories/types:

  * If found in DB → assign.
  * Else → use `defaultExpenseCategories`, `defaultExpenseTypes`.

**Step 2: User Input**

* User enters values into form fields:

  * `name`, `amount`, `date`, `category`, `type`, `comments`.

**Step 3: Validation**

* If `name` is empty or < 4 chars → invalid.
* If `amount <= 0` → invalid.
* If `date` > `maxDate` or null → invalid.
* If `category` or `type` not selected → invalid.

**Step 4: Preprocess Data**

* If `amount` numeric → round to 2 decimals.
* If `date` is Date object → convert to string.

**Step 5: Save Operation**

* Set `isLoading = true`.
* Call `database.saveNewExpense(expenseObj, userId)`.
* On success:

  * Reset form.
  * Reset `expenseObj`.
  * Show success snackbar.
  * Call `announceExpenseCreated("new expense")`.
* On error:

  * Show error snackbar.
  * Set `isLoading = false`.

**Step 6: Reset / Clear**

* If Reset clicked:

  * Clear all form fields.
  * Reset `expenseObj`.
  * Reset `dateError`.

---

## **Data Flow**

```
[User Input Form]
   ↓
[LogExpenseComponent.expenseObj]
   ↓ (Validation + Formatting)
[DatabaseService.saveNewExpense()]
   ↓
[Firebase / Backend Storage]
   ↓
   ├─► Success → Reset form + Snackbar("Expense saved!") + announceChange
   └─► Error → Snackbar("Something went wrong...")
```

---

## **Method Flow**

* **ngOnInit()** → `getAllUserDetails()` → fetch categories & types.
* **getAllUserDetails()** → query DB → set categories/types arrays.
* **save(valid, form)** → if `valid == true` → `saveExpenseEntry(form)`.
* **saveExpenseEntry(form)**
  → format date
  → `database.saveNewExpense()`
  → on success: reset form, reset object, show snackbar, announce event.
  → on failure: show error snackbar.
* **formatAmount()** → round `amount` to 2 decimals.
* **checkDate()** → validate date presence.
* **clearForm()** → reset form + `expenseObj`.

---

## **Flow Chart**

```plaintext
                ┌───────────────┐
                │ Start Component│
                └───────┬───────┘
                        │
                ┌───────▼────────┐
                │ Load User Data  │
                │ (categories,types)│
                └───────┬────────┘
                        │
                ┌───────▼────────┐
                │ User Fills Form │
                └───────┬────────┘
                        │
                ┌───────▼─────────┐
                │ Validate Inputs  │
                └───────┬─────────┘
                valid? ──┤Yes   No ├──► Show Validation Errors
                        │
                ┌───────▼─────────┐
                │ Format Data      │
                │ (amount,date)    │
                └───────┬─────────┘
                        │
                ┌───────▼─────────┐
                │ Save to Database │
                └───────┬─────────┘
                success?│Yes   No │
                        │         │
         ┌──────────────▼───┐  ┌──▼──────────────┐
         │ Reset Form & Obj │  │ Show Error Msg   │
         │ Snackbar Success │  │ Snackbar Failure │
         └───────┬─────────┘  └─────────┬────────┘
                 │                      │
                 └──────────►───────────┘
                           End
```

---

✅ Now the **inputs/outputs/process are crystal clear**,
✅ You have a **step-by-step algorithm**,
✅ Both **data flow & method flow**,
✅ Plus a **flow chart** for visualization.

---

Do you want me to also **expand this into a full SRS-like documentation** (like Inputs table, Outputs table, validation rules, error handling, etc.) for this `LogExpenseComponent` so you can reuse the format across your Angular components?*/
