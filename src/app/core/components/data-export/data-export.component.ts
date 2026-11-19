import { Component, inject, Input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { WINDOW } from '@core/tokens/window.token';
import { format } from 'date-fns';
import { Papa } from 'ngx-papaparse';
import { Account } from '@core/interfaces/account-model';

/* Papa: allowing you to parse CSV data, unparse arrays into CSV */

@Component({
  selector: 'app-data-export',
  imports: [MatIcon, MatButton],
  templateUrl: './data-export.component.html',
  styleUrl: './data-export.component.scss',
})
export class DataExportComponent {
  @Input() data: Account[] = [];
  @Input() fileName = 'account-export';

  private papa = inject(Papa);
  private readonly window = inject(WINDOW);

  exportData() {
    if (!this.data || this.data.length === 0) {
      return;
    }

    const csv = this.papa.unparse({
      fields: this.getHeaders(),
      data: this.formatDataForExport(this.data),
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    this.downloadFile(blob, `${this.fileName}-${this.getFormattedDate()}.csv`);
  }

  private getHeaders(): string[] {
    return ['Name', 'Amount', 'Date', 'Category', 'Source', 'Comments'];
  }

  private formatDataForExport(data: Account[]): (string | number)[][]  {
    return data.map((account) => ([
        account.name ?? '',
        account.balance ?? 0,
        this.formatDate(account.createdAt),
        account.type ?? '',
        account.source ?? '',
        account.comments ?? '',
    ]));
  }

  private formatDate(date: Date | string): string {
    if (!date) return '';

    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return format(parsedDate, 'MM-dd-yyyy');
      }
      return date;
    }
    return date.toLocaleDateString();
  }

  private getFormattedDate(): string {
    const now = new Date();
    return format(now, 'MM-dd-yyyy HH-mm-ss');
  }

  private downloadFile(blob: Blob, filename: string): void {
    const link = this.window.document.createElement('a');

    const url = this.window.window.URL.createObjectURL(blob);

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      this.window.window.URL.revokeObjectURL(url);
    }, 100);
  }
}
////////////////////////////////////
// Data Flow: 
/* Perfect 👍 Let’s make a **flow diagram** for your `DataExportComponent`.
This shows **data flow + method call flow** clearly:

---

### 🔹 DataExportComponent Flow

```
Parent Component
   │
   ├── passes [data: Expense[]] and [fileName: string] → @Input()|
   │
   ▼
DataExportComponent
   │
   ├── User clicks "Export" button (from template)
   │
   ▼
exportData()
   │
   ├── Validate: if no data → return
   │
   ├── Get headers → getHeaders()
   │
   ├── Format rows → formatDataForExport()
   │         │
   │         └── Calls formatDate() for each expense.date
   │
   ├── Generate CSV string → papa.unparse()
   │
   ├── Create Blob (CSV file data)
   │
   ├── Get formatted timestamp → getFormattedDate()
   │
   └── Trigger file download → downloadFile()
             │
             ├── Create <a> element
             ├── Create URL for blob
             ├── Simulate click → download starts
             └── Cleanup (remove link, revoke URL)
```

---

### 🔹 Key Points

* **Inputs** (`@Input`):

  * `data` (array of expenses).
  * `fileName` (base name for export file).
* **Entry Point**:

  * `exportData()` ← triggered by button in template.
* **Private Helpers**:

  * `getHeaders()` → static list of CSV columns.
  * `formatDataForExport()` → loops data, calls `formatDate()`.
  * `getFormattedDate()` → adds timestamp to filename.
  * `downloadFile()` → DOM manipulation to save file.

---

### 🔹 Flow (Simplified)

```
Inputs → exportData() → format helpers → CSV → Blob → downloadFile() → User gets file
```

---

⚡ So when you analyze *any* Angular component, you can use the same approach:

1. Look at `@Input` / `@Output`.
2. Find public methods.
3. Trace helper calls.
4. See what the template triggers.
5. Draw arrows for flow.

---

How to practice

Pick a component (like the ones you already shared) and write down:

1. Inputs (@Input, form values, injected services, router params).

2. Outputs (@Output, events, router navigation, return values).

3. Methods (public → called from template, private → helpers).

4. Flow (in text or diagram form: what happens step by step when the user interacts).

---
*/
