import { NgIf } from '@angular/common';
import { Component, Input, WritableSignal } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import { User } from '../../core/interfaces/user-model';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { EntrySource } from '../../core/enums/entry-types';
import { AccountCategory } from '../../core/interfaces/account-model';
import { defaultChartOfAccounts } from '../../shared/constants/expense-constants';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  imports: [NgIf, FormsModule, MatFormFieldModule, MatButton, MatProgressSpinner, MatError, MatInput, MatIcon],
  styleUrls: ['./sign-up.component.scss'],
})
export class SignUpComponent {
  @Input({ required: true }) needsToRegister!: WritableSignal<boolean>;
  currentUser: User = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  };
  isLoading = false;
  user: firebase.database.Reference | undefined;
  defaultCategories = this.buildDefaultCategories();

  constructor(
    public authService: AuthService,
    public snackBar: MatSnackBar,
    private router: Router,
    public db: AngularFireDatabase,
    private userService: UserService,
  ) {}

  checkForm(valid: boolean | null) {
    if (valid) {
      this.signUp();
    }
  }

  signUp() {
    this.isLoading = true;
    this.authService
      .signUp(this.currentUser.email ?? '', this.currentUser.password ?? '')
      .then((data) => {
        this.isLoading = false;
        if (data.user) {
          this.userService.setUser(data.user);
          this.userService.setUserId(data.user.uid);
          this.setUserInformation(data.user.uid);
          this.openSnackBarSuccess();
          this.onSuccessfulSignUp();
        }
      })
      .catch((e) => {
        this.isLoading = false;
        this.openSnackBarError(e.message);
      });
  }

  private openSnackBarSuccess() {
    this.snackBar.open('Successful Registration!', '', { duration: 2000 });
  }

  private openSnackBarError(message: string) {
    this.snackBar.open(message, 'ok', { duration: 4000 });
  }

  private onSuccessfulSignUp() {
    this.router.navigate(['/dashboard']).then();
  }

  private setUserInformation(userId: string) {
    this.user = this.db.database.ref(`users/${userId}`);
    this.user
      .set({
        firstName: this.currentUser.firstName,
        lastName: this.currentUser.lastName,
        email: this.currentUser.email,
        categories: this.defaultCategories,
        types: {},
        filesImported: {},
      })
      .then(() => {
        const accountsRef = this.db.database.ref(`users/${userId}/accounts`);
        const updates: Record<string, unknown> = {};
        for (const account of defaultChartOfAccounts) {
          updates[account.name] = {
            ...account,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            source: EntrySource.AUTO,
            importedOn: false,
          };
        }
        return accountsRef.update(updates);
      })
      .catch((error) => this.openSnackBarError(error.message));
  }

  private buildDefaultCategories(): Record<AccountCategory, { value: string; removable: boolean }[]> {
    const grouped: Record<AccountCategory, { value: string; removable: boolean }[]> = {
      Asset: [],
      Liability: [],
      Equity: [],
      Revenue: [],
      Expense: [],
    };
    for (const account of defaultChartOfAccounts) {
      grouped[account.type].push({ value: account.name, removable: false });
    }
    return grouped;
  }
}
/* Great 👌 Thanks for pasting the full `SignUpComponent`. Let’s analyze it **just like we did for your other Angular components** — but now even more detailed with **Inputs, Outputs, Process, Detailed Algorithm, Data Flow, Method Flow, and Flow Chart**.

---

# 🔹 **Component Analysis: `SignUpComponent`**

---

## **Inputs**

1. **From Template / Form:**

   * `firstName`: string, required, min length 2.
   * `lastName`: string, required, min length 1.
   * `email`: string, required, valid email format.
   * `password`: string, required, min length 6.

2. **From Parent Component (via `@Input`):**

   * `needsToRegister: WritableSignal<boolean>` → indicates whether to show **Register** or **Login** screen.

3. **Constants / Defaults:**

   * `defaultExpenseCategories` → preloaded categories for new users.

---

## **Outputs**

1. **Firebase Authentication Account** (`authService.signUp()` → `data.user`).
2. **User record in Firebase Realtime Database** (set via `setUserInformation`).
3. **Navigation** → On success, redirect to `/dashboard`.
4. **UI Notifications (SnackBars):**

   * Success: "Successful Registration!"
   * Error: Firebase error message.
5. **UI State:**

   * Loading spinner while `isLoading = true`.

---

## **Process**

1. User fills in the registration form.
2. Angular validates form fields (`required`, `minlength`, `email`).
3. On submit:

   * If valid → call `signUp()`.
   * If invalid → show validation errors.
4. In `signUp()`:

   * Call Firebase Authentication (`authService.signUp`).
   * On success:

     * Store user info in `UserService`.
     * Save user data to Firebase DB (`setUserInformation`).
     * Show success snackbar.
     * Navigate to dashboard.
   * On error:

     * Show error snackbar.
5. After registration, user can log in or continue to dashboard.

---

## **Detailed Algorithm**

**Algorithm: User Registration**

**Step 1: Initialization**

* `currentUser` = empty User object.
* `isLoading = false`.

**Step 2: User Input**

* Fill form: `firstName`, `lastName`, `email`, `password`.

**Step 3: Validation**

* If `firstName.length < 2` → invalid.
* If `lastName.length < 1` → invalid.
* If `email` not valid format → invalid.
* If `password.length < 6` → invalid.
* If valid → go to Step 4.

**Step 4: Sign Up**

* Set `isLoading = true`.
* Call `authService.signUp(email, password)`.

**Step 5: Handle Auth Response**

* If success:

  * `userService.setUser(user)`.
  * `userService.setUserId(user.uid)`.
  * Call `setUserInformation(user.uid)`:

    * Save `{firstName, lastName, email, categories, expenses: []}` to DB.
  * Show success snackbar.
  * Navigate to `/dashboard`.
* If failure:

  * Show error snackbar with `e.message`.

**Step 6: Finalize**

* Reset `isLoading = false`.

---

## **Data Flow**

```plaintext
[Form Input: firstName, lastName, email, password]
        ↓
[SignUpComponent.currentUser]
        ↓ (validation)
[AuthService.signUp(email, password)]
        ↓
Firebase Authentication
        ↓ success / fail
   ┌───────────────┴─────────────────┐
   │                                 │
 Success                          Failure
   │                                 │
[UserService.setUser()]         [SnackBar: error message]
[DatabaseService.setUserInfo()] 
[SnackBar: Success]              
[Router.navigate('/dashboard')] 
```

---

## **Method Flow**

* **checkForm(valid)**
  → if valid → call `signUp()`.

* **signUp()**
  → `isLoading = true`
  → call `authService.signUp()`
  → `.then(data)`

  * Save user to `UserService`.
  * Call `setUserInformation(userId)`.
  * Call `openSnackBarSuccess()`.
  * Call `onSuccessfulSignUp()`.
    → `.catch(e)`
  * Call `openSnackBarError(e.message)`.

* **setUserInformation(userId)**
  → write user details & defaults into Firebase DB.
  → catch DB errors → `openSnackBarError`.

* **openSnackBarSuccess()** → show "Successful Registration!".

* **openSnackBarError(message)** → show error snackbar.

* **onSuccessfulSignUp()** → navigate to `/dashboard`.

---

## **Flow Chart**

```plaintext
              ┌───────────────┐
              │ User Fills Form│
              └───────┬───────┘
                      │
              ┌───────▼──────────┐
              │ Validate Form     │
              └───────┬──────────┘
          valid?  No ─┤Yes        │
            │         │           │
Show Validation Errors│           │
                      │
              ┌───────▼──────────┐
              │ Call signUp()     │
              │ isLoading = true  │
              └───────┬──────────┘
                      │
          ┌───────────▼────────────┐
          │ Firebase Authentication│
          └───────┬────────────────┘
      success? Yes │ No             │
                   │                │
      ┌────────────▼───┐   ┌────────▼────────┐
      │ Save to UserSvc │   │ Snackbar Error │
      │ Save to DB      │   │ isLoading=false│
      │ Snackbar Success│   └────────────────┘
      │ Navigate Dashboard │
      └───────────┬────────┘
                  │
                ┌─▼─┐
                │End│
                └───┘
```

---

✅ Now you have a **clear breakdown** of `SignUpComponent` with:

* **Inputs & Outputs**
* **Step-by-step Algorithm**
* **Data Flow**
* **Method Flow**
* **Flow Chart**

---

Would you like me to also **expand this into a tabular specification** (Inputs table, Outputs table, Error handling table) so you can reuse it across your app’s documentation?
 */