import { Component, EventEmitter, inject, Output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ResponsiveService } from '../../../shared/services/responsive.service';
import { DragAndDropDirective } from '../../directives/drag-and-drop.directive';

@Component({
  selector: 'app-upload-file',
  imports: [DragAndDropDirective, MatIcon, MatButton],
  templateUrl: './upload-file.component.html',
  styleUrl: './upload-file.component.scss',
})
export class UploadFileComponent {
  @Output() filesUploaded = new EventEmitter<File[]>();

  breakpointObserver = inject(ResponsiveService);
  isHandset = this.breakpointObserver.isHandset;

  private files: File[] = [];
  private snackBar: MatSnackBar = inject(MatSnackBar);

  onFileDropped(files: FileList) {
    const filesList = Array.from(files);
    if (!filesList.every((file) => file.type === 'text/csv')) {
      this.openSnackBar('Only .csv files can be upload' + 'ed. Please upload a CSV file.');
    } else {
      this.files = [...filesList];
      this.filesUploaded.emit(this.files);
      this.clearFiles();
    }
  }

  fileBrowseHandler(event: Event) {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;
    this.prepareFilesList(fileList);
  }

  prepareFilesList(files: FileList | null) {
    if (files) {
      for (const item of files) {
        this.files.push(item);
      }
      this.filesUploaded.emit(this.files);
      this.clearFiles();
    } else {
      this.openSnackBar('No Files Uploaded.');
    }
  }

  private clearFiles() {
    this.files = [];
  }

  private openSnackBar(message: string) {
    this.snackBar.open(message, '', { duration: 2000 });
  }
}
/* Great, thanks for sharing this `UploadFileComponent`.
Let’s do a **full breakdown** (inputs, outputs, process, detailed algorithm, data flow, method flow, and flow chart).

---

## 1. Inputs, Outputs, Process

### Inputs

* **User interaction inputs:**

  * Drag-and-drop files into the drop zone.
  * File selection via the file input dialog.
* **File constraints:**

  * Accepted file type = `.csv`.

### Outputs

* **@Output() filesUploaded:** Emits an array of uploaded CSV files (`File[]`) to the parent component.
* **Snackbar messages:** Feedback messages to the user (e.g., "Only .csv files allowed", "No Files Uploaded.").

### Process

* Detect file input (drag/drop or file browse).
* Validate file type(s).
* Collect files into array.
* Emit files to parent.
* Clear local buffer.
* Show success/error messages in snackbar.

---

## 2. Detailed Algorithm

### On File Drop (`onFileDropped`)

1. Convert dropped `FileList` into array.
2. Validate each file’s MIME type:

   * If any file is **not CSV** → Show snackbar error message.
   * Else:

     * Store files in `this.files`.
     * Emit `filesUploaded` with files.
     * Clear internal `this.files` list.

---

### On File Browse (`fileBrowseHandler`)

1. Get input element’s `files` property.
2. Call `prepareFilesList(fileList)`.

---

### Prepare Files List (`prepareFilesList`)

1. If `files` is not null:

   * Iterate over files and add to `this.files`.
   * Emit `filesUploaded` with all files.
   * Clear internal list.
2. Else:

   * Show snackbar message "No Files Uploaded."

---

### Clear Files (`clearFiles`)

* Reset `this.files = []`.

---

### Open SnackBar (`openSnackBar`)

* Display message with a 2-second timeout.

---

## 3. Data Flow

```
User Action (Drag/Drop or File Browse)
   ↓
UploadFileComponent
   ↓
1. Validate file type
2. Add to files[]
3. Emit filesUploaded
4. Clear files[]
5. Show Snackbar feedback
   ↓
Parent Component (receives File[])
```

---

## 4. Method Flow

* **onFileDropped(files: FileList):** Handles drag/drop. Validates type and emits files.
* **fileBrowseHandler(event: Event):** Handles `<input type="file">` selection. Passes files to prepare method.
* **prepareFilesList(files: FileList | null):** Adds files, validates, emits, clears.
* **clearFiles():** Empties local buffer.
* **openSnackBar(message: string):** Displays snackbar notification.

---

## 5. Flow Chart (described)

```
[Start]
   |
   v
[User Action]
   |
   +------------------+
   |                  |
[Drag & Drop]     [File Browse]
   |                  |
   v                  v
onFileDropped()   fileBrowseHandler()
   |                  |
   v                  v
Validate file(s)   prepareFilesList()
   |                  |
   v                  v
Valid? ------No-----> Show Snackbar
   |
  Yes
   |
   v
Add file(s) to this.files[]
   |
Emit filesUploaded event
   |
Clear this.files[]
   |
Show Snackbar (optional success)
   |
   v
[End]
```

---

✅ This component is essentially a **file uploader wrapper** with:

* dual input methods (drag/drop + browse),
* validation for CSV-only,
* event-driven communication with the parent,
* user feedback (snackbars).

Would you like me to also **draw a proper visual flowchart diagram (with nodes and arrows)** that you can embed in documentation (SVG/PNG), instead of just the text version?
 */