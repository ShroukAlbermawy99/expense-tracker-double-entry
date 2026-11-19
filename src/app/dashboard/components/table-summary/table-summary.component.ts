import { SelectionModel } from '@angular/cdk/collections';
import { CurrencyPipe, DatePipe, NgClass, NgForOf } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Input,
  OnInit,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatChip, MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDivider } from '@angular/material/divider';
import { MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Account } from '@core/interfaces/account-model';
import { BulkEditModalComponent } from '@shared/components/bulk-edit-modal/bulk-edit-modal.component';
import { ManageExpenseComponent } from '@shared/components/manage-expense/manage-expense.component';
import { startWith } from 'rxjs';
import { BulkEditDialogResult } from '../../interfaces/bulk-edit-dialog-data';

@Component({
  selector: 'app-table-summary',
  templateUrl: 'table-summary.component.html',
  imports: [
    MatTableModule,
    NgClass,
    MatButton,
    MatIcon,
    MatCheckbox,
    MatChip,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    FormsModule,
    DatePipe,
    MatSortModule,
    MatPaginatorModule,
    CurrencyPipe,
    MatChipListbox,
    MatChipOption,
    NgForOf,
    ReactiveFormsModule,
    MatLabel,
    MatDivider,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['table-summary.component.scss'],
})
export class TableSummaryComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild('sorter', { static: true }) sort!: MatSort;
  @Input() data: WritableSignal<Account[]> = signal([]);
  @Input() displayColumns: string[] = ['select', 'name', 'amount', 'date', 'category', 'type', 'details'];

  accountsData = new MatTableDataSource<Account>();
  selection = new SelectionModel<Account>(true, []);
  isAllSelected = false;
  showFilters = signal(false);
  selectedFilters = new FormControl<string[]>([]);
  selectedSourceFilters = new FormControl<string[]>([]);
  filterCategories = computed(() => {
    const categories = this.data().map((account) => account.type);
    return [...new Set(categories)];
  });
  filterSources = computed(() => {
    const sources = this.data().map((account) => String(account.source));
    return [...new Set(sources)];
  });
  readonly categoryFilterValues = toSignal(
    this.selectedFilters.valueChanges.pipe(startWith(this.selectedFilters.value || [])),
    { initialValue: [] as string[] },
  );
  readonly sourceFilterValues = toSignal(
    this.selectedSourceFilters.valueChanges.pipe(startWith(this.selectedSourceFilters.value || [])),
    { initialValue: [] as string[] },
  );
  filteredData = computed(() => {
    const data = this.data();
    const categoryFilters = this.categoryFilterValues();
    const sourceFilters = this.sourceFilterValues();

    if (!categoryFilters?.length && !sourceFilters?.length) {
      return data;
    }

    return data.filter((account) => {
      const matchesCategory = !categoryFilters?.length || categoryFilters.includes(account.type);
      const matchesSource = !sourceFilters?.length || sourceFilters.includes(String(account.source));
      return matchesCategory && matchesSource;
    });
  });

  private snackBar = inject(MatSnackBar);
  private init = false;
  private dataEffect = effect(() => {
    if (!this.init) return;
    this.resetFilters();
    this.updateTableData(this.data());
  });
  private filterEffect = effect(() => {
    this.updateTableData(this.filteredData());
  });

  private dialog = inject(MatDialog);

  ngOnInit() {
    this.updateTableData(this.data());
    this.init = true;
  }

  toggleHeaderCheckbox() {
    if (this.isAllSelected) {
      this.selection.clear();
    } else {
      this.accountsData.data.forEach((row) => this.selection.select(row));
    }
    this.isAllSelected = this.areAllChecked();
  }

  areAllChecked() {
    const numSelected = this.selection.selected.length;
    const numRows = this.accountsData.data.length;
    return numSelected === numRows && numRows > 0;
  }

  toggleSelection(row: Account) {
    this.selection.toggle(row);
    this.isAllSelected = this.areAllChecked();
  }

  ngAfterViewInit() {
    this.accountsData.paginator = this.paginator;
    this.accountsData.sort = this.sort;
  }

  editData(account: Account) {
    const dialogRef = this.dialog.open(ManageExpenseComponent, {
      width: '600px',
      data: { account },
      hasBackdrop: true,
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe();
  }

  openBulkEditDialog(editType: 'category' | 'type' | 'delete'): void {
    const title =
      editType === 'category' ? 'Update Account Type' : editType === 'type' ? 'Update Source' : 'Delete Accounts';
    const confirmButtonText = editType === 'delete' ? 'Delete Accounts' : 'Save Changes';
    const dialogRef = this.dialog.open(BulkEditModalComponent, {
      width: '500px',
      data: {
        title,
        confirmButtonText,
        editType,
        accounts: [...this.selection.selected],
        expenses: [],
        cancelButtonText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((result?: BulkEditDialogResult) => {
      if (!result) {
        return;
      }
      const { successful, error } = result;
      if (successful) {
        this.snackBar.open(
          editType === 'delete' ? 'Accounts successfully deleted.' : 'Accounts successfully updated.',
          'Close',
          { duration: 3000 },
        );
        this.selection.clear();
      } else if (error) {
        this.snackBar.open('Error: ' + error, 'Close', { duration: 3000 });
      }
    });
  }

  toggleFilters() {
    this.showFilters.update((value) => !value);
  }

  private updateTableData(data: Account[]) {
    this.accountsData = new MatTableDataSource<Account>(data);
    this.sort.active = 'date';
    this.sort.direction = 'asc';
    this.accountsData.paginator = this.paginator;
    this.accountsData.sort = this.sort;
    this.accountsData.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'amount':
          return item.balance;
        case 'date':
          return new Date(item.createdAt).getTime();
        case 'category':
          return item.type;
        case 'type':
          return String(item.source);
        default:
          return (item as unknown as Record<string, string | number>)[property] ?? '';
      }
    };
    this.selection.clear();
  }

  private resetFilters() {
    this.selectedFilters.reset();
    this.selectedSourceFilters.reset();
  }
}
