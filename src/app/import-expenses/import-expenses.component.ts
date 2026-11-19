import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { FilesImportedComponent } from './components/files-imported/files-imported.component';
import { UploadFileComponent } from './components/upload-file/upload-file.component';

@Component({
  selector: 'app-import-expenses',
  imports: [MatCardModule, MatIcon, UploadFileComponent, CommonModule, FilesImportedComponent],
  templateUrl: './import-expenses.component.html',
  styleUrl: './import-expenses.component.scss',
})
export class ImportExpensesComponent {
  files: File[] = [];
}
/* Perfect — thanks for sharing the **`ImportExpensesComponent`**.
This one acts as the **container/parent** that ties together your **UploadFileComponent** and **FilesImportedComponent**.
Let me break it down thoroughly, same as before.

---

## 1. Inputs, Outputs, Process

### Inputs

* **User action:** uploading CSV files via `UploadFileComponent`.

### Outputs

* **UI updates:**

  * If files exist → Show `FilesImportedComponent` (list of uploaded files).
  * If no files → Show “No Files Uploaded” message with an icon.

### Process

1. Initialize `files: File[] = []`.
2. Wait for `(filesUploaded)` event from `UploadFileComponent`.
3. Assign emitted files to `this.files`.
4. Angular template checks:

   * If `files.length > 0` → show `FilesImportedComponent`.
   * Else → show placeholder (no files uploaded).

---

## 2. Detailed Algorithm

**Algorithm: ImportExpensesComponent**

1. Initialize `files` as empty array (`[]`).
2. Render template:

   * Render `UploadFileComponent` with `(filesUploaded)` event binding.
   * Render placeholder UI.
3. On `filesUploaded`:

   * Capture emitted files (`File[]`).
   * Assign to local state → `this.files = $event`.
4. Angular detects change and re-renders:

   * If `files.length > 0`:

     * Show `FilesImportedComponent` with `[files]="files"`.
   * Else:

     * Show "No Files Uploaded." message.

---

## 3. Data Flow

```
User Upload Action
    ↓
UploadFileComponent
    ↓ emits
(filesUploaded: File[])
    ↓
ImportExpensesComponent
    ↓
Update local files[]
    ↓
Angular template re-renders
    ↓
+---------------------------+
| files.length > 0 ?        |
+---------------------------+
     | Yes                           | No
     ↓                               ↓
FilesImportedComponent        Show "No Files Uploaded"
```

---

## 4. Method Flow

* **UploadFileComponent → filesUploaded**: Event emitter triggers.
* **ImportExpensesComponent**:

  * Updates `files` property.
  * Angular runs change detection.
* **Template conditional**:

  * Shows either `FilesImportedComponent` (with files list) OR placeholder.

---

## 5. Flow Chart (textual)

```
[Start]
   |
   v
[User selects/drag-drops file in UploadFileComponent]
   |
   v
(filesUploaded) EventEmitter
   |
   v
ImportExpensesComponent.files = uploadedFiles
   |
   v
Check condition: files.length > 0 ?
   | Yes
   v
Render FilesImportedComponent with [files]
   |
   +--- No ---+
   |          |
   v          v
Show "No Files Uploaded" placeholder
   |
  [End]
```

---

✅ **Summary:**

* This component acts as the **parent coordinator**.
* It does **not process files directly**, only stores them.
* It decides UI state: **uploaded files view** vs **empty state**.
* Data flow is simple: **child → parent → conditional render → child**.

---

Do you want me to also write the **inputs, outputs, process, and detailed algorithm** for the **FilesImportedComponent** here in context, so you see the **entire pipeline end-to-end** (Upload → ImportExpenses → FilesImported)?
 */