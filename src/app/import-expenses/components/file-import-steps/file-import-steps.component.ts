import {
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStep, MatStepLabel, MatStepper } from '@angular/material/stepper';
import { Expense } from '@core/interfaces/account-model';
import { DatabaseService } from '@core/services/database.service';
import { TransactionDataService } from '@core/services/transaction-data.service';
import { UserService } from '@core/services/user.service';
import { CardSpinnerComponent } from '@shared/components/card-spinner/card-spinner.component';
import { Papa, ParseResult } from 'ngx-papaparse';
import { catchError, from, timeout, TimeoutError } from 'rxjs';
import { CsvRow, ReviewedExpenses } from '../../interfaces/import-interfaces';
import { FileImportMapperComponent } from '../file-import-mapper/file-import-mapper.component';
import { FileImportReviewComponent } from '../file-import-review/file-import-review.component';

@Component({
  selector: 'app-file-import-steps',
  imports: [
    CardSpinnerComponent,
    FileImportReviewComponent,
    MatButton,
    MatCardModule,
    MatStep,
    FileImportMapperComponent,
    MatStepper,
    MatStepLabel,
    MatDivider,
    MatIcon,
    MatIconButton,
    MatProgressSpinner,
  ],
  templateUrl: './file-import-steps.component.html',
  styleUrl: './file-import-steps.component.scss',
})
export class FileImportStepsComponent implements OnInit {
  @Input() file!: File;
  @Output() fileRemoved = new EventEmitter<void>();
  @Input() firstFile = false;

  private stepper = viewChild<MatStepper>('stepper');

  csvData: CsvRow[] = [];
  csvHeaders: string[] = [];

  isLoading = false;
  parseError: string | null = null;
  importSummary = signal<string[]>([]);
  isFormValid = signal(false);
  previewData = signal<Expense[]>([]);
  reviewedExpensesToSave = signal<ReviewedExpenses>({
    debits: [],
    credits: [],
  });
  hasReviewedExpenses = computed(() => {
    const { debits, credits } = this.reviewedExpensesToSave();
    return debits.length > 0 || credits.length > 0;
  });
  expensesImported = signal(false);
  importInProgress = signal(false);

  private papa: Papa = inject(Papa);
  private elementRef: ElementRef = inject(ElementRef);
  private transactionDataService = inject(TransactionDataService);
  private userService = inject(UserService);
  private databaseService = inject(DatabaseService);
  private matSnackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.parseCSVFile();
    if (this.firstFile) {
      this.elementRef.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }

  saveExpenses() {
    this.importInProgress.set(true);
    const { debits, credits } = this.reviewedExpensesToSave();
    const allExpenses = [
      ...debits.map((expense) => ({ ...expense, amount: Math.abs(Number(expense.amount)) })),
      ...credits.map((expense) => ({ ...expense, amount: -Math.abs(Number(expense.amount)) })),
    ];
    const userId = this.userService.getUserId();
    const existingCategories = this.transactionDataService.flatCategoryNames();
    const existingSources = this.transactionDataService.accountSourcesSignal();
    const filesImported = [...this.transactionDataService.filesImportedSignal()];
    const newCategories = new Set<string>();
    const newTypes = new Set<string>();

    allExpenses.forEach((expense) => {
      if (!existingCategories.includes(expense.category)) {
        newCategories.add(expense.category);
      }
      if (!existingSources.includes(expense.type) && expense.type.toLowerCase() !== 'credit' && expense.type.toLowerCase() !== 'debit') {
        newTypes.add(expense.type);
      }
    });

    const saveWork = async () => {
      await this.databaseService.importExpensesAsTransactions(allExpenses, userId);

      if (newCategories.size > 0) {
        const categories = this.transactionDataService.categoriesSignal();
        const updated = { ...categories, Expense: [...categories.Expense] };
        for (const name of newCategories) {
          if (!updated.Expense.some((item) => item.value === name)) {
            updated.Expense.push({ value: name, removable: true });
          }
        }
        await this.databaseService.saveNewCategories(updated, userId);
        this.transactionDataService.setCategoriesSignal(updated);
      }

      if (newTypes.size > 0) {
        const types = [...existingSources, ...newTypes];
        await this.databaseService.saveNewExpenseSourceTypes(types, userId);
        this.transactionDataService.setAccountSourcesData(types);
      }

      if (!filesImported.includes(this.file.name)) {
        filesImported.push(this.file.name);
        await this.databaseService.saveNewImportedFiles(filesImported, userId);
        this.transactionDataService.setFilesImported(filesImported);
      }

      return {
        importedCount: allExpenses.length,
        categoriesAdded: newCategories.size,
        typesAdded: newTypes.size,
      };
    };

    from(saveWork())
      .pipe(
        timeout(60000),
        catchError((error) => {
          if (error instanceof TimeoutError) {
            this.matSnackBar.open('Operation timed out', 'OK', { duration: 2000 });
          }
          throw error;
        }),
      )
      .subscribe({
        next: ({ importedCount, categoriesAdded, typesAdded }) => {
          const summaryUpdates = [`Transactions imported: ${importedCount}`];
          if (categoriesAdded) {
            summaryUpdates.push(`New categories added: ${categoriesAdded}`);
          }
          if (typesAdded) {
            summaryUpdates.push(`New payment sources added: ${typesAdded}`);
          }
          this.importSummary.set(summaryUpdates);
          this.importInProgress.set(false);
          this.expensesImported.set(true);
          setTimeout(() => {
            this.stepper()?.next();
          });
        },
        error: (error) => {
          console.error('Error importing expenses:', error);
          this.importInProgress.set(false);
          this.matSnackBar.open('Error importing expenses', 'OK', { duration: 2000 });
        },
        complete: () => {
          this.importInProgress.set(false);
        },
      });
  }

  private parseCSVFile(): void {
    this.isLoading = true;
    this.parseError = null;

    const options = {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult) => {
        this.isLoading = false;
        this.csvHeaders = results.meta.fields || [];
        this.csvData = results.data;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (error: any) => {
        this.isLoading = false;
        this.parseError = error.message;
      },
    };

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const result = event?.target?.result as string | Blob;
        this.papa.parse(result, options);
      } catch (err) {
        this.isLoading = false;
        this.parseError = 'Error parsing CSV file - ' + err;
      }
    };
    reader.onerror = () => {
      this.isLoading = false;
      this.parseError = 'Error reading file';
    };
    reader.readAsText(this.file);
  }
}
