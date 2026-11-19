import { NgIf } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output, signal, Signal, WritableSignal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { AccountCategory } from '@core/interfaces/account-model';
import { CategoryOption, GroupedCategories } from '@core/services/transaction-data.service';
import { cloneDeep, isEqual } from 'lodash';
import { CardSpinnerComponent } from '../../../shared/components/card-spinner/card-spinner.component';

@Component({
  selector: 'app-manage-options',
  imports: [
    MatCardModule,
    CardSpinnerComponent,
    MatChipsModule,
    MatFormField,
    MatButtonModule,
    NgIf,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIcon,
  ],
  templateUrl: './manage-options.component.html',
  styleUrl: './manage-options.component.scss',
})
export class ManageOptionsComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() label = '';
  @Input() placeHolder = '';

  @Input() isLoadingData: Signal<boolean> = signal<boolean>(true);
  @Input() isUpdatingData: Signal<boolean> = signal<boolean>(true);
  @Input() options: WritableSignal<GroupedCategories> = signal({
    Asset: [],
    Liability: [],
    Equity: [],
    Revenue: [],
    Expense: [],
  });
  @Input() originalOptions: WritableSignal<GroupedCategories> = signal({
    Asset: [],
    Liability: [],
    Equity: [],
    Revenue: [],
    Expense: [],
  });

  @Output() saveOptionsEvent = new EventEmitter<void>();

  categoryTypes: AccountCategory[] = ['Asset', 'Expense', 'Revenue', 'Liability', 'Equity'];
  optionsUpdated: Signal<boolean> = computed(() => !isEqual(this.options(), this.originalOptions()));

  getOptionsByType(type: AccountCategory) {
    return computed(() =>
      (this.options()[type] ?? []).map((item) => ({
        type,
        value: item.value,
        removable: item.removable,
      })),
    );
  }

  onOptionRemove(keyword: { type: AccountCategory; value: string; removable: boolean }) {
    if (!keyword.removable) {
      return;
    }
    this.options.update((categories) => ({
      ...categories,
      [keyword.type]: (categories[keyword.type] ?? []).filter((item) => item.value !== keyword.value),
    }));
  }

  onOptionEntered(data: MatChipInputEvent, type: AccountCategory) {
    const valueTrimmed = data.value.trim();
    if (!valueTrimmed) {
      return;
    }

    const exists = (this.options()[type] ?? []).some(
      (item) => item.value.trim().toLowerCase() === valueTrimmed.toLowerCase(),
    );

    if (!exists) {
      const newCategory: CategoryOption = { value: valueTrimmed, removable: true };
      this.options.update((categories) => ({
        ...categories,
        [type]: [...(categories[type] ?? []), newCategory],
      }));
      data.chipInput!.clear();
    }
  }

  resetOptions() {
    this.options.set(cloneDeep(this.originalOptions()));
  }

  saveOptions() {
    this.saveOptionsEvent.emit();
  }
}
