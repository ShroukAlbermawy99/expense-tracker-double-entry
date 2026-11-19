import { DatePipe, NgIf, UpperCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { DatabaseService } from '../../services/database.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-user-details',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    FormsModule,
    MatFormField,
    MatIcon,
    MatInput,
    MatFormFieldModule,
    NgIf,
    ReactiveFormsModule,
    DatePipe,
    UpperCasePipe,
  ],
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.scss',
})
export class UserDetailsComponent {
  readonly userService: UserService = inject(UserService);
  readonly databaseService: DatabaseService = inject(DatabaseService);
  user = this.userService.currentUser();
  fullName = this.userService.fullName();
  abbreviatedDisplay = this.userService.abbreviatedDisplay();
  userNameForm: FormGroup = new FormGroup({
    firstName: new FormControl(this.userService.userDetails()?.firstName, [Validators.required, Validators.minLength(2),]),
    lastName: new FormControl(this.userService.userDetails()?.lastName, [Validators.required, Validators.minLength(1)]),
  });

  readonly dialogRef = inject(MatDialogRef<UserDetailsComponent>);

  updateDetails() {
    if (this.userNameForm.valid) {
      this.databaseService
        .updateUserDetails(this.userService.getUserId(), this.userNameForm.value)
        .then(() => this.dialogRef.close(true));
    }
  }
}
/* Perfect 👍 Let’s break down your `UserDetailsComponent` into **4 levels of explanation**:

---

# 1. **Detailed Algorithm**

### Initialization

1. Inject required services:

   * `UserService` (get user data, email, full name, initials).
   * `DatabaseService` (write changes to database).
   * `MatDialogRef` (control dialog closing).

2. Retrieve user info:

   * `user` ← `userService.currentUser()`.
   * `fullName` ← `userService.fullName()`.
   * `abbreviatedDisplay` ← `userService.abbreviatedDisplay()`.

3. Initialize `FormGroup userNameForm`:

   * `firstName` ← user’s firstName with validators: required, minLength(2).
   * `lastName` ← user’s lastName with validators: required, minLength(1).

---

### UI Rendering

4. Show Angular Material dialog:

   * Title: "Account".
   * Avatar with initials, full name.
   * Metadata: creation date, last login.
   * Form fields:

     * Email (disabled, read-only).
     * First Name (editable).
     * Last Name (editable).
   * Buttons: **Cancel**, **Update**.

---

### User Interaction

5. On Cancel button click:

   * Close dialog (`dialogRef.close()`).

6. On Update button click:

   * Check if `userNameForm` is valid.
   * If invalid → prevent action (Update button is disabled).
   * If valid → execute update process.

---

### Update Process

7. Call `databaseService.updateUserDetails(userId, userNameForm.value)`.

8. If update succeeds:

   * Close dialog and return `true` (`dialogRef.close(true)`).

9. If update fails:

   * (Optionally) handle error (not shown in your code).

---

# 2. **Data Flow**

```
+------------------+         +-----------------+
|   User Service   | ----->  | UserDetailsComp |
| - currentUser()  |         | - userNameForm  |
| - fullName()     |         | - updateDetails |
| - email()        |         +--------+--------+
+------------------+                  |
                                      |
                                      v
                             +------------------+
                             | Database Service |
                             | - updateUserDetails|
                             +------------------+
```

**Explanation:**

* `UserService` supplies **input data** (user object, name, initials).
* `UserDetailsComponent` uses this data to populate the form and UI.
* When user submits updates → `DatabaseService` receives new details.
* Response flows back → component closes dialog.

---

# 3. **Method Flow**

### `constructor/DI`

* Inject services (`UserService`, `DatabaseService`, `MatDialogRef`).

### `ngOnInit` (implicit here)

* Initialize form with `FormGroup`.

### `updateDetails()`

1. Validate `userNameForm`.
2. If valid:

   * Extract values.
   * Call `DatabaseService.updateUserDetails(userId, values)`.
   * On success → close dialog with success flag.
3. If invalid:

   * Do nothing (Update button disabled already).

---

# 4. **Flow Chart (ASCII)**

```
             ┌─────────────────────┐
             │  Start Dialog Open  │
             └─────────┬───────────┘
                       │
                       v
        ┌─────────────────────────────────┐
        │ Load user data from UserService │
        └────────────────┬────────────────┘
                         │
                         v
        ┌─────────────────────────────────┐
        │ Initialize FormGroup with values │
        └────────────────┬────────────────┘
                         │
                         v
        ┌─────────────────────────────────┐
        │ Render dialog (user info + form)│
        └───────┬───────────────┬────────┘
                │                │
                │ Cancel clicked │ Update clicked
                │                │
                v                v
     ┌───────────────────┐    ┌─────────────────────┐
     │ dialogRef.close() │    │ Validate form input │
     └───────────────────┘    └──────────┬──────────┘
                                         │
                                Invalid? │ Yes
                                         v
                                ┌───────────────────┐
                                │ Block submission  │
                                └───────────────────┘
                                         │ No
                                         v
                          ┌──────────────────────────────────┐
                          │ Call DatabaseService.updateUser… │
                          └──────────────────┬───────────────┘
                                             v
                          ┌──────────────────────────────────┐
                          │ On success → dialogRef.close(true)│
                          └──────────────────────────────────┘
```

---

✅ Now you have:

* **Detailed Algorithm** (step-by-step).
* **Data Flow Diagram (DFD)**.
* **Method Flow** (inside component).
* **Flow Chart** (decision-making process).

---
Great question 👍 Let’s break the **`UserDetailsComponent`** into the classical **Input → Processing → Output** model.

---

## **1. Inputs**

* **From `UserService`**

  * `currentUser()` → Firebase user object (with metadata like creation date, last login).
  * `fullName()` → Full user name string.
  * `abbreviatedDisplay()` → Initials for avatar.
  * `userDetails()` → First and last name for form initialization.
  * `email()` → Email for read-only field.
  * `getUserId()` → User ID for database update.

* **From User Interaction**

  * Edited **firstName** and **lastName** in the form.
  * Clicking **Cancel** or **Update** buttons.

---

## **2. Processing**

* **Initialization**

  * Inject `UserService`, `DatabaseService`, `MatDialogRef`.
  * Build `FormGroup userNameForm` with validators (required, minLength).
  * Populate form fields with existing user details.

* **User Interaction**

  * If **Cancel** is clicked → close dialog immediately.
  * If **Update** is clicked:

    1. Validate form.
    2. If invalid → block submission (Update button disabled).
    3. If valid → call `DatabaseService.updateUserDetails(userId, userNameForm.value)`.

* **Database Update**

  * On success → close dialog with success flag (`dialogRef.close(true)`).
  * On failure (not implemented in code) → would normally show error feedback.

---

## **3. Outputs**

* **UI Outputs**

  * Dialog with:

    * User avatar (initials).
    * Full name.
    * Email (read-only).
    * Creation date + Last login date.
    * Editable form fields for first & last name.
    * Buttons (Cancel, Update).
  * Real-time form validation errors (if invalid input).

* **System Outputs**

  * Updated user details persisted in the database (`DatabaseService.updateUserDetails`).
  * Dialog closed with:

    * `false` (Cancel, no update).
    * `true` (Update success).

---

### Summary Table

| Category       | Details                                                                           |
| -------------- | --------------------------------------------------------------------------------- |
| **Inputs**     | UserService data (user info, names, email), user edits, button clicks             |
| **Processing** | Initialize form, validate input, handle Cancel/Update, call DB update             |
| **Outputs**    | Updated user record in DB, dialog closed with success/failure status, UI feedback |

---

 */