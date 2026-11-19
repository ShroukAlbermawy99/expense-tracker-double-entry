import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  effect,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { Expense } from '@core/interfaces/account-model';
import { BulkEditDialogResult } from '../../../dashboard/interfaces/bulk-edit-dialog-data';
import { BulkEditModalComponent } from '@shared/components/bulk-edit-modal/bulk-edit-modal.component';
import { ManageExpenseComponent } from '@shared/components/manage-expense/manage-expense.component';

@Component({
  selector: 'app-import-review-table',
  imports: [
    CurrencyPipe,
    CommonModule,
    MatTableModule,
    MatTabsModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatCheckbox,
  ],
  templateUrl: './import-review-table.component.html',
  styleUrl: './import-review-table.component.scss',
})
export class ImportReviewTableComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator; // { static: true } → tells Angular when to resolve the reference: true → resolved before ngOnInit (useful when you need it early, e.g., for initial table setup), false → resolved after view init (available in ngAfterViewInit).
  @ViewChild('expensesSort', { static: true }) sort!: MatSort;

  @Input() expenses = signal<Expense[]>([]);
  @Output() expensesChange = new EventEmitter<Expense[]>();

  expensesDataSource = new MatTableDataSource<Expense>();
  displayedColumns = ['select', 'date', 'name', 'amount', 'category', 'type', 'comments', 'actions'];
  selection = new SelectionModel<Expense>(true, []);
  isAllSelected = false;

  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  constructor() {
    effect(() => {
      console.table(this.expenses());
      this.expensesDataSource.data = this.expenses();
      this.expensesDataSource.paginator = this.paginator;
      this.expensesDataSource.sort = this.sort;
      this.expensesChange.emit([...this.expenses()]);
      this.selection.clear();
    });
  }

  ngOnInit() {
    this.sort.active = 'date';
    this.sort.direction = 'asc';
  }

  ngAfterViewInit() {
    this.expensesDataSource.paginator = this.paginator;
    this.expensesDataSource.sort = this.sort;
  }

  deleteRow(expense: Expense) {
    const title = 'Delete Expense';
    const confirmButtonText = 'Delete Expense';
    const dialogRef = this.dialog.open(BulkEditModalComponent, {
      width: '500px',
      data: {
        title,
        confirmButtonText,
        editType: 'delete',
        expenses: [expense],
        cancelButtonText: 'Cancel',
        previewOnly: true,
      },
    });

    dialogRef.afterClosed().subscribe(({ editForm }: BulkEditDialogResult) => {
      if (!editForm) {
        this.snackBar.open('Expense successfully deleted.', 'Close', {
          duration: 3000,
        });
        const { id } = expense;
        this.expensesDataSource.data = this.expensesDataSource.data.filter((expense) => id !== expense.id);
        this.expensesChange.emit(this.expensesDataSource.data);
      }
    });
  }

  toggleHeaderCheckbox() {
    if (this.isAllSelected) {
      this.selection.clear();
    } else {
      this.expensesDataSource.data.forEach((row: Expense) => this.selection.select(row));
    }
    this.isAllSelected = this.areAllChecked();
  }

  areAllChecked() {
    const numSelected = this.selection.selected.length;
    const numRows = this.expensesDataSource.data.length;
    return numSelected === numRows;
  }

  toggleSelection(row: Expense) {
    this.selection.toggle(row);
    this.isAllSelected = this.areAllChecked();
  }

  editRow(expense: Expense) {
    const dialogRef = this.dialog.open(ManageExpenseComponent, {
      // ManageExpenseComponent: updates all expense keys, BulkEditModalComponent: updates category and type only.
      data: { expense, previewDataMode: true },
      hasBackdrop: true,
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe((expense) => {
      if (expense) {
        this.expensesDataSource.data = this.expensesDataSource.data.map((e) => (e.id === expense.id ? expense : e));
        this.expensesChange.emit(this.expensesDataSource.data);
        this.snackBar.open('Expense successfully updated.', 'Close', {
          duration: 3000,
        });
      }
    });
  }

  openBulkEditDialog(editType: 'category' | 'type' | 'delete'): void {
    const title =
      editType === 'category' ? 'Update Category' : editType === 'type' ? 'Update Payment Type' : 'Delete Expenses';
    const confirmButtonText = editType === 'delete' ? 'Delete Expenses' : 'Save Changes';
    const dialogRef = this.dialog.open(BulkEditModalComponent, {
      width: '500px',
      data: {
        title,
        confirmButtonText,
        editType,
        expenses: [...this.selection.selected],
        cancelButtonText: 'Cancel',
        previewOnly: true,
      },
    });

    dialogRef.afterClosed().subscribe((result: BulkEditDialogResult) => {
      if (!result) {
        return;
      }
      const { editForm } = result;
      if (!editForm && editType === 'delete') {
        this.snackBar.open('Expenses successfully deleted.', 'Close', {
          duration: 3000,
        });
        const idsToDelete = this.selection.selected.map((expense) => expense.id);
        this.expensesDataSource.data = this.expensesDataSource.data.filter(
          (expense) => !idsToDelete.includes(expense.id),
        );
        this.expensesChange.emit(this.expensesDataSource.data);
        this.selection.clear();
      } else if (editForm && editType !== 'delete') {
        this.expensesDataSource.data = this.expensesDataSource.data.map((expense) => {
          const expenseToUpdate = this.selection.selected.find((e) => e.id === expense.id);
          return expenseToUpdate ? { ...expenseToUpdate, ...editForm } : expense; // when you use the spread syntax (...) to merge two objects and they both contain the same key, the value from the second object will be preserved.
        });
        this.expensesChange.emit(this.expensesDataSource.data);
        this.snackBar.open('Expenses successfully updated.', 'Close', {
          duration: 3000,
        });
        this.selection.clear();
      }
    });
  }
}
/* Perfect — let’s go step by step and expand the **ImportReviewTableComponent** analysis with much more detailing. I’ll give you:

1. **Inputs, Outputs, and Process**
2. **Detailed Algorithm**
3. **Data Flow**
4. **Method Flow**
5. **Flowchart (described in words, step-by-step nodes)**

---

## 1. Inputs, Outputs, Process

### Inputs

* **@Input expenses (signal\<Expense\[]>):** Initial array of expenses, passed from parent.
* **User interactions:**

  * Selecting/unselecting rows (checkboxes).
  * Bulk action menu clicks (Edit Category, Edit Type, Delete).
  * Action buttons (edit row, delete row).
  * Sorting and pagination events.

### Outputs

* **@Output expensesChange (EventEmitter\<Expense\[]>):** Emits updated expense list after any change (edit, delete, bulk actions).
* **Snackbar notifications:** For user feedback (success messages).
* **Dialog results:** Results from ManageExpenseComponent or BulkEditModalComponent.

### Process

* Display expenses in a Material table with selection, sorting, and pagination.
* Allow row-based actions (edit, delete).
* Allow multi-row actions (bulk edit, bulk delete).
* Sync table data with `expenses` signal and propagate changes via `expensesChange`.

---

## 2. Detailed Algorithm

### Initialization

1. Initialize `expensesDataSource` with empty array.

2. On construction → set up **effect()** to listen to changes in `expenses()` signal:

   * Update dataSource data.
   * Attach paginator & sort.
   * Emit new expenses list.
   * Clear selection.

3. In `ngOnInit()`:

   * Configure sort default: active = "date", direction = "asc".

4. In `ngAfterViewInit()`:

   * Attach paginator & sort to dataSource.

---

### Row Deletion (`deleteRow`)

1. Open confirmation dialog (BulkEditModalComponent with delete mode).
2. If user cancels → do nothing.
3. If user confirms →

   * Show snackbar: "Expense successfully deleted."
   * Filter out deleted row by `id`.
   * Update `expensesDataSource.data`.
   * Emit `expensesChange`.

---

### Toggle Header Checkbox (`toggleHeaderCheckbox`)

1. If `isAllSelected` is true → clear selection.
2. Else → select all rows in `expensesDataSource`.
3. Update `isAllSelected = areAllChecked()`.

---

### Toggle Row Selection (`toggleSelection`)

1. If row is selected → unselect.
2. Else → select row.
3. Update `isAllSelected = areAllChecked()`.

---

### Edit Row (`editRow`)

1. Open `ManageExpenseComponent` dialog with row data.
2. If dialog result contains updated expense →

   * Replace old expense in `expensesDataSource` by matching `id`.
   * Emit `expensesChange`.
   * Show snackbar: "Expense successfully updated."

---

### Bulk Edit (`openBulkEditDialog`)

1. Determine title & button text based on `editType`.
2. Open `BulkEditModalComponent` dialog with selected expenses.
3. After close:

   * If result is null → do nothing.
   * If `editType = delete` and result.editForm is null →

     * Show snackbar.
     * Remove all selected expenses by IDs.
     * Update dataSource + emit change.
     * Clear selection.
   * If `editType = category` or `type` and editForm exists →

     * For each selected expense → merge `editForm` changes into the object.
     * Update dataSource + emit change.
     * Show snackbar.
     * Clear selection.

---

## 3. Data Flow

```
Parent Component → [expenses (signal)] → ImportReviewTableComponent
    ↓
  effect() → MatTableDataSource.data = expenses
    ↓
  User Interaction:
    - Checkbox select → SelectionModel updates
    - Bulk edit/delete → Dialog → Update DataSource
    - Edit row → Dialog → Update DataSource
    - Delete row → Dialog → Update DataSource
    ↓
  expensesChange.emit(updatedExpenses)
    ↓
Parent Component receives updated list
```

---

## 4. Method Flow

* **constructor()** → setup reactive effect binding `expenses` → dataSource.
* **ngOnInit()** → configure sorting defaults.
* **ngAfterViewInit()** → attach paginator & sort.
* **deleteRow()** → confirm → remove row → update data.
* **toggleHeaderCheckbox()** → select/deselect all rows.
* **areAllChecked()** → check if all rows are selected.
* **toggleSelection()** → toggle row selection → update `isAllSelected`.
* **editRow()** → open dialog → replace expense if edited.
* **openBulkEditDialog()** → open bulk modal → update or delete multiple rows.

---

## 5. Flowchart (text description of diagram)

```
[Start]
   |
   v
[Load expenses signal] 
   |
   v
[Update DataSource + Reset selection]
   |
   v
+-----------------------------+
| User Interactions           |
+-----------------------------+
   |         |          |
   v         v          v
[Select]  [Edit Row] [Delete Row]
   |         |          |
   v         v          v
Update Selection   Open Edit Dialog   Open Delete Dialog
   |         |          |
   v         v          v
Bulk Actions?----------Yes-----------+
   |                                 |
   No                                v
   |                          Update DataSource
   v                                 |
[Continue pagination/sorting]        v
   |                          Emit expensesChange
   v                                 |
[Emit expensesChange] <--------------
   |
   v
[End]
```

---

✅ This is a **detailed breakdown** of `ImportReviewTableComponent`.
Would you like me to also **draw a real flowchart diagram (with nodes and arrows)** that you can embed in your docs, instead of just the text version?
 */
