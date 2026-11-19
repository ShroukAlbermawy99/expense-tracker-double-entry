import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { RouterLink } from '@angular/router';
import { GroupedCategories, TransactionDataService } from '@core/services/transaction-data.service';
import { cloneDeep } from 'lodash';
import { UserDataRecord } from '../core/interfaces/user-data-record';
import { DatabaseService } from '../core/services/database.service';
import { UserService } from '../core/services/user.service';
import { ManageOptionsComponent } from './components/manage-options/manage-options.component';

@Component({
  selector: 'app-expense-settings',
  imports: [
    MatCardModule,
    MatStepperModule,
    MatIcon,
    RouterLink,
    MatChipsModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    ManageOptionsComponent,
  ],
  templateUrl: './expense-settings.component.html',
  styleUrl: './expense-settings.component.scss',
})
export class ExpenseSettingsComponent implements OnInit {
  readonly transactionDataService = inject(TransactionDataService);
  readonly categoriesSignal = signal<GroupedCategories>(this.transactionDataService.defaultCategories);
  readonly copyCategoriesSignal = signal<GroupedCategories>(this.transactionDataService.defaultCategories);

  isLoadingUserInformation = signal(false);
  isLoadingUserCategories = signal(false);
  isUpdatingCategories = signal(false);

  constructor(
    private userService: UserService,
    private database: DatabaseService,
    private snackBar: MatSnackBar,
  ) {
    userService.userIdSetAnnounced$.subscribe(() => {
      this.getAllUserDetails();
    });
  }

  ngOnInit() {
    this.getAllUserDetails();
  }

  saveCategories() {
    this.isUpdatingCategories.set(true);
    const currentUser = this.userService.getUserId();
    this.database
      .saveNewCategories(this.categoriesSignal(), currentUser)
      .then(() => {
        this.transactionDataService.setCategoriesSignal(this.categoriesSignal());
        this.copyCategoriesSignal.set(cloneDeep(this.categoriesSignal()));
        this.openSnackBar('Categories saved!');
        this.onUpdateToCategories();
        this.isUpdatingCategories.set(false);
      })
      .catch((e) => {
        this.openSnackBar(e.message);
        this.isUpdatingCategories.set(false);
      });
  }

  private async getAllUserDetails() {
    if (!this.userService.getUser()) {
      return;
    }

    this.isLoadingUserInformation.set(true);
    this.isLoadingUserCategories.set(true);
    try {
      const jsonData = await this.database.getUserDetails(this.userService.getUser()?.email ?? '');
      const obj: Record<string, UserDataRecord> = (jsonData.toJSON() ?? {}) as Record<string, UserDataRecord>;
      const key = Object.keys(obj)[0] as string;
      this.userService.setUserId(key);

      const categories = obj[key]?.['categories'];
      if (!categories || !Object.keys(categories).length) {
        await this.database.initializeCategories(key);
      }

      const categoriesFromDb = await this.database.getCategories(key);
      this.setCategoriesOptions(this.transactionDataService.normalizeCategories(categoriesFromDb));
      this.isLoadingUserInformation.set(false);
      this.isLoadingUserCategories.set(false);
    } catch (e: unknown) {
      this.isLoadingUserInformation.set(false);
      this.isLoadingUserCategories.set(false);
      let message = 'Unknown error';
      if (e instanceof Error) {
        message = e.message;
      } else if (typeof e === 'string') {
        message = e;
      }
      this.openSnackBar(`Error! ${message}.`);
    }
  }

  private setCategoriesOptions(categoriesArr: GroupedCategories) {
    this.categoriesSignal.set(cloneDeep(categoriesArr));
    this.copyCategoriesSignal.set(cloneDeep(categoriesArr));
    this.transactionDataService.setCategoriesSignal(categoriesArr);
    this.onUpdateToCategories();
  }

  private onUpdateToCategories() {
    this.database.announceCategoriesAdded('Categories Added');
  }

  private openSnackBar(message: string) {
    this.snackBar.open(message, '', { duration: 2000 });
  }
}
