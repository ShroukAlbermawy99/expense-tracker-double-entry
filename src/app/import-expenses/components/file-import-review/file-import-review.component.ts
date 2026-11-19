import { CommonModule } from '@angular/common';
import { Component, effect, Input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { Expense } from '../../../core/interfaces/account-model';
import { ReviewedExpenses } from '../../interfaces/import-interfaces';
import { ImportReviewTableComponent } from '../import-review-table/import-review-table.component';

@Component({
  selector: 'app-file-import-review',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatTabsModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ImportReviewTableComponent,
  ],
  templateUrl: './file-import-review.component.html',
  styleUrl: './file-import-review.component.scss',
})
export class FileImportReviewComponent {
  @Input() expenses = signal<Expense[]>([]);
  @Input() reviewedExpensesToSave = signal<ReviewedExpenses>({
    debits: [],
    credits: [],
  });

  debitExpenses = signal<Expense[]>([]);
  creditExpenses = signal<Expense[]>([]);
  private expensesUpdated = effect(() => this.filterExpensesBySource(this.expenses()));

  updateReviewedExpensesToSave(source: 'debits' | 'credits', expenses: Expense[]): void {
    this.reviewedExpensesToSave.update((prev) => ({ ...prev, [source]: expenses }));
  }

  private filterExpensesBySource(expenses: Expense[]) {
    const debits: Expense[] = [];
    const credits: Expense[] = [];
    expenses.forEach((expense: Expense, index: number) => {
      if ((expense.amount as number) < 0) {
        credits.push({ ...expense, id: `${index + 1}-credit` }); // refund.
      } else {
        debits.push({ ...expense, id: `${index + 1}-debit` });
      }
    });
    this.debitExpenses.set(debits);
    this.creditExpenses.set(credits);
  }
}
/* Perfect 👍 Let’s go deeper and rewrite the **FileImportReviewComponent** analysis but with a **more detailed step-by-step algorithm**.

---

# 🔹 1. Inputs, Outputs, Process

### **Inputs**

* **`expenses: Signal<Expense[]>`**

  * Full list of imported expenses from the parent.

* **`reviewedExpensesToSave: Signal<ReviewedExpenses>`**

  * Object `{ debits: [], credits: [] }` shared with the parent.

---

### **Outputs**

* **`debitExpenses: Signal<Expense[]>`**

  * Subset of expenses with positive or zero amounts.

* **`creditExpenses: Signal<Expense[]>`**

  * Subset of expenses with negative amounts.

* **Updated `reviewedExpensesToSave`**

  * Keeps parent synchronized with reviewed results.

---

### **Process**

1. On initialization, register an **effect** to monitor `expenses`.
2. Whenever `expenses` changes:

   * Call `filterExpensesBySource(expenses)`.
   * Split into **credits** and **debits**.
   * Assign new IDs for each item (`index-credit` / `index-debit`).
   * Store them into local signals.
3. Render UI with two tabs:

   * **Debits Tab** → table if data exists.
   * **Credits Tab** → table if data exists, otherwise show fallback message.
4. On child event (`expensesChange`), call `updateReviewedExpensesToSave()` to sync the reviewed items with parent state.

---

# 🔹 2. Detailed Algorithm

**Algorithm: Classify and Manage Imported Expenses**

1. **Initialize Component**
   1.1 Define local signals:

   * `debitExpenses = []`
   * `creditExpenses = []`
     1.2 Attach **effect** → whenever `expenses` changes, call `filterExpensesBySource(expenses)`.

2. **Filter Expenses (filterExpensesBySource)**
   Input: `expenses: Expense[]`
   Output: `debitExpenses[]`, `creditExpenses[]`
   Steps:

   * Initialize two empty arrays: `debits = []`, `credits = []`.
   * For each expense in `expenses` with index `i`:

     * If `expense.amount < 0`:

       * Copy the expense object.
       * Assign new id → `id = (i+1)-credit`.
       * Push into `credits`.
     * Else (`expense.amount ≥ 0`):

       * Copy the expense object.
       * Assign new id → `id = (i+1)-debit`.
       * Push into `debits`.
   * Update signals:

     * `debitExpenses.set(debits)`
     * `creditExpenses.set(credits)`

3. **Render UI**

   * Show a **MatTabGroup** with two tabs.
   * Tab 1 = *Debits*: if `debitExpenses.length > 0` → render `<app-import-review-table>` with data.
   * Tab 2 = *Credits*: if `creditExpenses.length > 0` → render table; else show `"No credits to display."`.

4. **Handle Updates from Child Table**

   * When child emits `(expensesChange)` with modified expenses:

     * Call `updateReviewedExpensesToSave(source, expenses)`
     * Inside this function:

       * Update parent’s reviewed data using `reviewedExpensesToSave.update()`.
       * Example:

         ```ts
         reviewedExpensesToSave.update(prev => ({
           ...prev,
           [source]: expenses
         }));
         ```

5. **Component Destruction**

   * Angular automatically disposes of the `effect` and signals when the component is destroyed.

---

# 🔹 3. Data Flow

```
Parent Component
   | (provides expenses[], reviewedExpensesToSave)
   v
FileImportReviewComponent
   |--- effect() observes expenses
   |--- filterExpensesBySource(expenses)
   |       +--> debitExpenses[]
   |       +--> creditExpenses[]
   v
Render Tabs (Debits / Credits)
   |
   |--- user edits tables (child emits expensesChange)
   v
updateReviewedExpensesToSave()
   |
   v
reviewedExpensesToSave updated (parent stays in sync)
```

---

# 🔹 4. Method Flow

```
[Start]
   ↓
Receive Inputs (expenses, reviewedExpensesToSave)
   ↓
Register effect() on expenses
   ↓
expenses updated?
   └─Yes→ filterExpensesBySource(expenses)
          | Split into debits/credits
          | Assign IDs
          | Update debitExpenses, creditExpenses
   ↓
Render MatTabs
   ↓
User interacts with child tables
   ↓
Child emits expensesChange
   ↓
updateReviewedExpensesToSave(source, expenses)
   ↓
Propagate to reviewedExpensesToSave (parent sync)
   ↓
[End]
```

---

# 🔹 5. Flow Chart (ASCII Style)

```
                ┌───────────────────────────┐
                │ Parent passes inputs       │
                │  - expenses[]              │
                │  - reviewedExpensesToSave  │
                └─────────────┬─────────────┘
                              ↓
                    ┌─────────────────────┐
                    │ effect() monitors    │
                    │ changes in expenses  │
                    └─────────────┬───────┘
                                  ↓
                      ┌─────────────────────┐
                      │ filterExpensesBySrc │
                      │  if amount < 0 → credit
                      │  else → debit       │
                      └─────────────┬───────┘
                                    ↓
             ┌──────────────────────────────┐
             │ Update Signals:               │
             │ debitExpenses[], credits[]    │
             └─────────────┬────────────────┘
                           ↓
           ┌───────────────────────────────────┐
           │ Render Tabs:                       │
           │   Debits → table if available      │
           │   Credits → table / fallback msg   │
           └─────────────┬─────────────────────┘
                         ↓
           ┌────────────────────────────────┐
           │ User edits tables (child emits) │
           └─────────────┬──────────────────┘
                         ↓
       ┌────────────────────────────────────────┐
       │ updateReviewedExpensesToSave(source,x) │
       │  - merge changes into parent signal    │
       └────────────────────────────────────────┘
```

---

✅ This version gives you a **step-by-step detailed algorithm**, along with inputs/outputs, process, data flow, method flow, and ASCII flow chart.

Do you want me to now **expand the algorithm for updateReviewedExpensesToSave() separately** (like a mini-algorithm just for that method), so your documentation shows sub-flow granularity?
 */
