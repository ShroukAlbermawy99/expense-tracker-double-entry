import { CommonModule, DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Account, AccountCategory, Expense } from '@core/interfaces/account-model';
import { DatabaseService } from '@core/services/database.service';
import { TransactionDataService } from '@core/services/transaction-data.service';
import { UserService } from '@core/services/user.service';
import { isEqual } from 'lodash';
import { ManageExpenseData } from '../../interfaces/manage-expense-data';

@Component({
  selector: 'app-manage-expense',
  templateUrl: './manage-expense.component.html',
  imports: [
    MatDialogModule,
    FormsModule,
    NgIf,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    DatePipe,
    MatButtonModule,
    MatInput,
    CommonModule,
  ],
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./manage-expense.component.scss'],
})
export class ManageExpenseComponent implements OnInit {
  expense!: Expense;
  originalExpense!: Expense;
  account!: Account;
  originalAccount!: Account;
  update = false;
  categories: string[] = [];
  types: string[] = [];
  accountTypes: AccountCategory[] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  isAccountMode = false;

  private dataService = inject(TransactionDataService);

  private dataUpdate = effect(() => {
    this.categories = this.dataService.flatCategoryNames();
    this.types = this.dataService.accountSourcesSignal();
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ManageExpenseData,
    private dialogRef: MatDialogRef<ManageExpenseComponent>,
    private database: DatabaseService,
    private userService: UserService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.isAccountMode = !!this.data.account && !this.data.previewDataMode;

    if (this.isAccountMode && this.data.account) {
      this.account = { ...this.data.account };
      this.originalAccount = { ...this.data.account };
      return;
    }

    const expense = this.data.expense;
    if (!expense) {
      return;
    }
    this.expense = { ...expense, date: new Date(expense.date) };
    this.originalExpense = { ...expense, date: new Date(expense.date) };
    if (this.data.previewDataMode) {
      this.update = true;
      const { category, type } = expense;
      if (!this.categories.includes(category)) {
        this.categories = [...this.categories, category];
      }
      if (!this.types.includes(type)) {
        this.types = [...this.types, type];
      }
    }
  }

  deleteExpense() {
    const userId = this.userService.getUserId();
    if (this.isAccountMode) {
      this.database
        .deleteAccount(userId, this.account.name)
        .then(() => this.successfulDelete('Account Deleted!'))
        .catch((err) => this.failedDeleted(err));
      return;
    }

    this.database
      .deleteExpense(userId, this.expense.id as string)
      .then(() => this.successfulDelete('Expense Deleted!'))
      .catch((err) => this.failedDeleted(err));
  }

  openSnackBar(message: string) {
    this.snackBar.open(message, '', { duration: 3000 });
  }

  successfulDelete(message = 'Deleted!') {
    this.dialogRef.close('Successful');
    this.openSnackBar(message);
  }

  failedDeleted(err: Error) {
    this.openSnackBar(err.message);
  }

  pushUpdate() {
    const userId = this.userService.getUserId();
    if (this.isAccountMode) {
      this.database
        .updateAccount(userId, this.account)
        .then(() => this.successfulUpdate('Account Updated!'))
        .catch((err) => this.failedUpdate(err));
      return;
    }

    const key = this.expense.id;
    const expenseObj = { ...this.expense };
    delete expenseObj.id;
    this.database
      .updateExpense(userId, key as string, expenseObj)
      .then(() => this.successfulUpdate('Expense Updated!'))
      .catch((err) => this.failedUpdate(err));
  }

  successfulUpdate(message = 'Updated!') {
    this.dialogRef.close('Successful');
    this.openSnackBar(message);
  }

  failedUpdate(err: Error) {
    this.openSnackBar(err.message);
  }

  updateExpense(valid: boolean | null) {
    const { previewDataMode } = this.data;
    if (previewDataMode) {
      this.dialogRef.close(this.expense);
      return;
    }
    if (valid) {
      this.pushUpdate();
    }
  }

  formatAmount() {
    if (this.isAccountMode) {
      if (this.account.balance !== null && typeof this.account.balance === 'number') {
        this.account.balance = parseFloat(this.account.balance.toFixed(2));
      }
      return;
    }

    if (this.expense.amount !== null && typeof this.expense.amount !== 'string') {
      this.expense.amount = parseFloat(this.expense.amount.toFixed(2));
    }
  }

  reset() {
    if (this.isAccountMode) {
      this.account = { ...this.originalAccount };
      return;
    }
    this.expense = { ...this.originalExpense };
  }

  isExpenseUntouched(): boolean {
    if (this.isAccountMode) {
      return isEqual(this.account, this.originalAccount);
    }
    return isEqual(this.expense, this.originalExpense);
  }
}
