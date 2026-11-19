import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipListbox, MatChipOption, MatChipSelectionChange } from '@angular/material/chips';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { DataExportComponent } from '@core/components/data-export/data-export.component';
import { EntrySource } from '@core/enums/entry-types';
import { TimeFrameFilter } from '@core/interfaces/time-frame-filter';
import { TransactionDataService } from '@core/services/transaction-data.service';
import { Subscription } from 'rxjs';

/* Subscribtion: This allows multiple subscriptions to be grouped together so that a single call to unsubscribe() on the parent subscription can unsubscribe all nested subscriptions.  */

/* 
MatChipListbox:
This is a component that acts as a container for a group of selectable chips. It manages the selection state of its child MatChipOption components, allowing for single or multiple selection, similar to a radio button group or a checkbox group.
MatChipOption:
This is an extension of the basic MatChip component that specifically supports selection. MatChipOption components are typically placed inside a MatChipListbox to enable selectable chip functionality.
MatChipSelectionChange:
This is an interface representing the event object emitted when the selection state of a MatChipOption within a MatChipListbox changes. This event object provides information about the source MatChipOption and its new selected state.
*/

/*
touchUi property:
When set to true (as in touchUi), this property modifies the appearance and behavior of the date range picker. Instead of opening as a small pop-up below the input field, it opens as a larger, more prominent dialog, making it easier to interact with on touch-enabled devices like smartphones and tablets
*/

@Component({
  selector: 'app-expense-filter-controls',
  imports: [
    MatDatepickerModule,
    ReactiveFormsModule,
    FormsModule,
    MatButton,
    MatIcon,
    DatePipe,
    MatCardModule,
    MatChipListbox,
    MatChipOption,
    MatLabel,
    DataExportComponent,
  ],
  templateUrl: './expense-filter-controls.component.html',
  styleUrl: './expense-filter-controls.component.scss',
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

/* 
this.today.getFullYear(), 0, 1)
0:
This represents the month. In JavaScript, months are zero-indexed, so 0 corresponds to January.
1:
This represents the day of the month, which is the first day..  
*/
export class ExpenseFilterControlsComponent implements OnDestroy, OnInit {
  today = new Date();
  dateRangeEnabled = false;
  range = new FormGroup({
    start: new FormControl<Date | null>(new Date(this.today.getFullYear(), 0, 1)),
    end: new FormControl<Date | null>(this.today),
  });

  timeFrameFilters: TimeFrameFilter[] = [
    {
      label: 'Current Month',
      value: 'currentMonth',
      getDates: () => ({
        start: new Date(this.today.getFullYear(), this.today.getMonth(), 1),
        end: this.today,
      }),
    },
    {
      label: 'Last 3 Months',
      value: '3months',
      getDates: () => {
        const start = new Date(this.today);
        start.setMonth(start.getMonth() - 2, 1);
        return {
          start,
          end: this.today,
        };
      },
    },
    {
      label: 'Last 6 Months',
      value: '6months',
      getDates: () => {
        const start = new Date(this.today);
        start.setMonth(start.getMonth() - 5, 1);
        return {
          start,
          end: this.today,
        };
      },
    },
    {
      label: 'Custom Date Range',
      value: 'custom range',
      getDates: () => {
        return {
          start: new Date(this.today.getFullYear(), 0, 1),
          end: this.today,
        };
      },
    },
  ];
  accountEntryTypes = [
    {
      label: 'Manual Entry',
      value: EntrySource.MANUAL,
    },
    {
      label: 'Imported',
      value: EntrySource.IMPORTED,
    },
    {
      label: 'Mixed Entry',
      value: EntrySource.MIXED,
    },
    {
      label: 'Auto Generated',
      value: EntrySource.AUTO,
    },
  ];

  private dataService: TransactionDataService = inject(TransactionDataService);
  accounts = this.dataService.accountsSignal;
  showFilters = this.dataService.showFilters;
  filter = this.dataService.timeFrameFilterSignal;
  filesImported = this.dataService.filesImportedSignal;
  filteredAccounts = this.dataService.filteredAccounts;
  selectedTimeFrame: string | null = this.dataService.timeFrameFilterSignal()?.value ?? null;
  accountEntryType = new FormControl<string | undefined>(this.dataService.accountEntryTypeFilter());

  private subscription = new Subscription();

  ngOnInit(): void {
    this.subscription.add(
      this.range.valueChanges.subscribe((value) => {
        const { start, end } = value;
        const timeFrameFilter: TimeFrameFilter = {
          ...(this.dataService.timeFrameFilterSignal() as TimeFrameFilter),
          customDateRange: { start: start as Date, end: end as Date },
        };
        this.dataService.setTimeFrameFilter(timeFrameFilter);
      }),
    );

    this.subscription.add(
      this.accountEntryType.valueChanges.subscribe((value) =>
        this.dataService.setAccountEntryTypeFilter(value as string | undefined),
      ),
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  toggleFilters() {
    this.showFilters.update((value) => !value);
  }

  onTimeFrameChange(event: MatChipSelectionChange, filter: TimeFrameFilter) {
    if (event.selected) {
      const { start, end } = filter.getDates();
      this.range.patchValue({ start, end });
      this.dateRangeEnabled = filter.value === 'custom range';
      this.dataService.setTimeFrameFilter(filter);
    } else {
      this.dateRangeEnabled = false;
      this.range.patchValue({ start: null, end: null });
      this.dataService.setTimeFrameFilter(undefined);
    }
  }
}
////////////////////////////////////
// Data Flow:
/*
Got it 👍
You’ve shared the full Angular component (`ExpenseFilterControlsComponent`). Let me break it down into **data flow** and **method flow** for clarity.

---

## 🔹 Data Flow

1. **Inputs & UI State**

   * **Reactive Forms**:

     * `range` → `FormGroup` with `start` and `end` dates.
     * `expenseEntryType` → `FormControl` for selecting entry type (manual/imported).
   * **Signals from `TransactionDataService`**:

     * `expenses` → all expense records.
     * `filteredExpenses` → expenses after filters are applied.
     * `filesImported` → indicates imported files exist.
     * `showFilters` → whether filter panel is shown.
     * `filter` (`timeFrameFilterSignal`) → active timeframe filter.

2. **Filter Definitions**

   * **`timeFrameFilters`**: list of predefined timeframes (current month, last 3 months, last 6 months, custom).
   * **`expenseEntryTypes`**: manual or imported entries.

3. **UI Template → Data Binding**

   * `mat-chip-listbox` binds `selectedTimeFrame` (via `[(ngModel)]`).
   * Date range picker (`mat-date-range-input`) binds to `range` form group.
   * `mat-chip-listbox` for entry type binds to `expenseEntryType`.

---

## 🔹 Method Flow

1. **`ngOnInit()`**

   * Subscribes to `range.valueChanges`:

     * Updates `dataService.timeFrameFilterSignal` with custom start & end dates.
   * Subscribes to `expenseEntryType.valueChanges`:

     * Updates `dataService.expenseEntryTypeFilter`.

2. **`ngOnDestroy()`**

   * Cleans up all subscriptions with `this.subscription.unsubscribe()`.

3. **`toggleFilters()`**

   * Toggles `showFilters` signal (show/hide filter panel).

4. **`onTimeFrameChange(event, filter)`**

   * If **selected**:

     * Extracts `start`/`end` from filter’s `getDates()`.
     * Updates form group `range`.
     * Enables custom date picker if "custom range" selected.
     * Sets `timeFrameFilter` in `dataService`.
   * If **deselected**:

     * Clears range (`start=null, end=null`).
     * Disables custom date range.
     * Clears filter in `dataService`.

---

## 🔹 Summary

* **Data comes from**: signals in `TransactionDataService` + reactive forms (`range`, `expenseEntryType`).
* **Data flows into UI**: via bindings (`[(ngModel)]`, `[formControl]`, signals).
* **Methods handle updates**:

  * Form → Service (`ngOnInit()` subscriptions).
  * User interactions → `toggleFilters()` and `onTimeFrameChange()`.
* **Service updates signals** → recalc filtered expenses → UI updates.

---

👉 Do you want me to **draw a flow diagram** (like arrows between form controls → service → signals → template), or keep it textual like this?
*/

/////////////////////
/*
# 📘 Algorithm for `ExpenseFilterControlsComponent`

---

### **Step 1: Initialization**

1. Get today’s date (`today`).
2. Create a flag `dateRangeEnabled = false`.
3. Initialize a `dateRange` object with:

   * `start = January 1st of current year`
   * `end = today`.
4. Define a list of `timeFrameFilters`:

   * Current Month → from 1st day of current month to today.
   * Last 3 Months → from 1st day of month 2 months ago to today.
   * Last 6 Months → from 1st day of month 5 months ago to today.
   * Custom Date Range → from January 1st of current year to today.
5. Define a list of `expenseEntryTypes`:

   * Manual Entry.
   * Imported.

---

### **Step 2: Connect to Data Service**

1. Access signals from the data service:

   * All expenses.
   * Filtered expenses.
   * Imported files.
   * filter signal.
   * Show/hide filters state.
2. Store the current selected time frame from the service.
3. Store the current selected entry type from the service.

---

### **Step 3: Subscriptions (Reactive Updates)**

1. When the **date range changes**:

   * Extract `start` and `end` from the form.
   * Update the service’s **time frame filter** with these values.
2. When the **entry type changes**:

   * Update the service’s **entry type filter** with the new value.

---

### **Step 4: User Actions**

1. **Toggle Filters Panel**

   * When the toggle button is clicked → invert the `showFilters` flag in the service.

2. **Time Frame Selection**

   * If a time frame chip is **selected**:

     * Get the start and end dates from the filter definition.
     * Update the date range form with these values.
     * If the filter is "Custom Range":
       * Enable the `dateRangeEnabled` flag (show date picker).
     * Update the service with the selected filter.
     
   * If a time frame chip is **deselected**:

     * Clear the date range (`start = null`, `end = null`).
     * Disable `dateRangeEnabled`.
     * Remove the filter from the service.

3. **Custom Date Picker**

   * If "Custom Range" is active:

     * Open date picker when button is clicked.
     * Close date picker when it loses focus.

---

### **Step 5: Data Export**

* If expenses exist, allow exporting the filtered expenses using the export component.

---

### **Step 6: Cleanup**

* On component destroy → unsubscribe from all subscriptions.

---

# ✅ Algorithm Summary

1. Initialize today’s date, filters, and entry types.
2. Connect component state to data service signals.
3. Set up subscriptions so UI changes update the service.
4. Handle user actions:

   * Toggle filters.
   * Select/deselect time frame.
   * Change entry type.
   * Use custom date picker.
5. Show filtered results and enable export.
6. Cleanup subscriptions when component is destroyed.

---

Would you like me to now **turn this algorithm into pseudocode** (structured like code but language-agnostic), so you can implement it in any framework or language — not just Angular?
 */
///////////////
/* Flow Diagram: 
🔄 Walkthrough ① → ⑥
A. Timeframe Selection (chips or custom date range)

① User Interface

User clicks a timeframe chip (e.g., “Last 3 Months”) or opens the date picker.

②a Reactive Form (FormGroup: range)

The selected chip sets range.start and range.end.

Example: "Last 3 Months" → start = July 1, end = Today (if today is Sept).

③ Subscriptions (range.valueChanges)

range.valueChanges triggers.

Subscription creates a new TimeFrameFilter object { start, end }.

④ TransactionDataService

setTimeFrameFilter() is called with { start, end }.

Service updates its timeFrameFilter signal.

Service recomputes filteredExpenses from all expenses.

⑤ Signals

Signals updated:

timeFrameFilterSignal = "Last 3 Months"

filteredExpenses = only last 3 months expenses

⑥ Template Binding

UI updates automatically:

Expense list shows only recent expenses.

"Filters On" button updates.

Chip stays selected.

Loop back to ①

User sees results → can select another timeframe → cycle repeats.

B. Expense Entry Type Selection (chips)

① User Interface

User selects “Manual Entry” or “Imported” chip.

②b Reactive Form (FormControl: expenseEntryType)

The selected chip sets the value of the FormControl.

Example: expenseEntryType = "IMPORTED".

③ Subscriptions (expenseEntryType.valueChanges)

Subscription fires on chip selection which Calls setExpenseEntryTypeFilter(value) with "IMPORTED".

④ TransactionDataService

Updates its entryTypeFilter signal.

Recomputes filteredExpenses considering both timeframe + entry type.

⑤ Signals

Signals updated:

if entryTypeFilter = "IMPORTED"

filteredExpenses = only imported expenses within selected timeframe

⑥ Template Binding

UI updates automatically:

Expense list shows only imported expenses.

Export button data updates.

Chip stays highlighted.

Loop back to ①

User sees results → can switch between “Manual” or “Imported” → cycle repeats.

✅ Both flows are parallel and independent but combine in the service (filteredExpenses depends on both timeframe + entry type).
 */
