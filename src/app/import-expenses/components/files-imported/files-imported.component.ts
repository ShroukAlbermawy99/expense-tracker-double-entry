import { Component, Input } from '@angular/core';
import { FileImportStepsComponent } from '../file-import-steps/file-import-steps.component';

@Component({
  selector: 'app-files-imported',
  imports: [FileImportStepsComponent],
  templateUrl: './files-imported.component.html',
  styleUrl: './files-imported.component.scss',
})
export class FilesImportedComponent {
  @Input() files!: File[];
}
/* Great — now we’re looking at the **`FilesImportedComponent`**, which acts as a *container* for multiple `FileImportStepsComponent` children. Let’s analyze it with the same structured breakdown:

---

# 📌 FilesImportedComponent – Full Analysis

## **1. Inputs**

* **@Input() files!: File\[]**

  * An array of uploaded files (each file is a CSV or similar data file).
  * Passed from parent component (likely the file uploader).

---

## **2. Outputs**

* No explicit `@Output()`.
* But indirectly:

  * Each child `FileImportStepsComponent` can emit `fileRemoved`.
  * When that happens, this component removes the file from the `files[]` array using `files.splice(index, 1)`.

---

## **3. Process**

1. **Receive input array of files.**
2. Loop through each file with Angular’s `@for` directive.
3. For each file:

   * Create a `<app-file-import-steps>` child instance.
   * Pass:

     * `file` (the file itself).
     * `firstFile` (true if it’s the first file in the list).
   * Handle `(fileRemoved)` event → remove that file from the array.

---

## **4. Detailed Algorithm**

```
Algorithm FilesImported:

Input: files (array of File objects)
Output: renders multiple FileImportStepsComponent children

Step 1: For each file in files[] with index i:
    first ← (i == 0)

Step 2: Render <app-file-import-steps> with:
    [file] = files[i]
    [firstFile] = first
    (fileRemoved) = remove file from files at index i

Step 3: If child emits fileRemoved:
    Remove file from files[]
    UI re-renders automatically (Angular change detection)

End
```

---

## **5. Data Flow**

```
[Parent Component or Uploader] 
         │
         ▼
   files: File[] (Input)
         │
         ▼
 [FilesImportedComponent]
         │ loops
         ▼
 [FileImportStepsComponent (child)]
         │ emits fileRemoved
         ▼
 files.splice(index,1) → updates parent’s array
```

---

## **6. Method Flow**

* **FilesImportedComponent**

  * Has no explicit lifecycle logic.
  * Just renders children dynamically.

* **Child Flow (FileImportStepsComponent)**

  * Handles parsing, mapping, review, and saving of each file.
  * When user clicks “remove” → emits `fileRemoved`.
  * Parent (`FilesImportedComponent`) removes that file from list.

---

## **7. Flow Chart**

```
┌───────────────────────────┐
│ FilesImportedComponent    │
│ Input: files[]            │
└───────────┬───────────────┘
            │ Loop files
            ▼
 ┌───────────────────────────────┐
 │ For each file:                │
 │  → Render FileImportStepsComp │
 │  → Pass file + firstFile      │
 │  → Bind fileRemoved event     │
 └───────────────────────────────┘
            │
   fileRemoved event?
            ▼
 ┌─────────────────────────────┐
 │ Remove file from files[]    │
 │ Angular re-renders list     │
 └─────────────────────────────┘
```

---

✅ In short:

* `FilesImportedComponent` is a **list manager**.
* It holds the files array, and for each file it spawns a `FileImportStepsComponent`.
* Removal is handled by splicing the array when a child emits `fileRemoved`.

---

Would you like me to also **connect this component’s flow with the full CSV import workflow** (Uploader → FilesImported → FileImportSteps → Mapper + Review → DB)? That would give you the **end-to-end pipeline view**.
 */