import { animate, state, style, transition, trigger } from '@angular/animations';
import { NgIf } from '@angular/common';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatError, MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { UserService } from '@core/services/user.service';
import { ResponsiveService } from '@shared/services/responsive.service';
import firebase from 'firebase/compat/app';
import { SignUpComponent } from './sign-up/sign-up.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    MatButton,
    MatCardModule,
    FormsModule,
    MatFormField,
    MatLabel,
    NgIf,
    MatInput,
    MatProgressSpinner,
    ReactiveFormsModule,
    MatError,
    MatIcon,
    MatPrefix,
    SignUpComponent,
  ],
  animations: [
    trigger('visibilityChanged', [
      state('true', style({ opacity: 1, transform: 'scale(1.0)' })),
      state('false', style({ opacity: 0, transform: 'scale(0.0)' })),
      transition('1 => 0', animate('300ms')),
      transition('0 => 1', animate('900ms')),
    ]),
  ],
})
export class LoginComponent {
  loginForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });
  isLoading = false;
  needsToRegister: WritableSignal<boolean> = signal(false);
  breakpointObserver = inject(ResponsiveService);
  isHandset = this.breakpointObserver.isHandset;

  private router: Router = inject(Router);
  private authService: AuthService = inject(AuthService);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private userService: UserService = inject(UserService);
 
  /* this.snackBar.open(e.message, 'ok', { duration: 4000 }):
     is called action, and it is simply the text label of the action button (like "OK", "Dismiss", "Retry", "Undo" …). */

  login() {
    if (this.loginForm.invalid) return;
    this.startLoading();
    const { email, password } = this.loginForm.value;
    this.authService
      .logIn(email, password)
      .then((data) => {
        this.userService.setUser(data.user as firebase.User);
        this.stopLoading();
        this.snackBar.open('Login Successful!', '', { duration: 2000 });
        this.onSuccessfulLogin();
      })
      .catch((e) => {
        this.stopLoading();
        console.warn('Catches object set:' + e.message);
        this.snackBar.open(e.message, 'ok', { duration: 4000 });
      });
  }

  toggle() {
    this.needsToRegister.set(!this.needsToRegister());
    this.loginForm.reset();
  }

  private onSuccessfulLogin() {
    this.router.navigate(['/dashboard']).then();
  }

  private startLoading() {
    this.isLoading = true;
  }

  private stopLoading() {
    this.isLoading = false;
  }
}
/* Perfect 👍 — let’s treat your **`LoginComponent`** as if we’re fully documenting it. I’ll break it into the main aspects you asked for: **Inputs, Outputs, Process, Detailed Algorithm, Data Flow, Method Flow, and Flow Chart**.

---

# 🔹 1. Component Inputs

* **`needsToRegister: WritableSignal<boolean>`**

  * Boolean signal used to determine whether the `SignUpComponent` or the `LoginComponent` should be displayed.
  * This is also passed down into `<app-sign-up>`.

* **`loginForm: FormGroup` (internal)**

  * Has 2 controls:

    * `email` → `FormControl<string>` (Validators: required, email).
    * `password` → `FormControl<string>` (Validators: required, minLength=6).

* **`isLoading: boolean` (internal)**

  * Tracks whether an authentication request is running.

---

# 🔹 2. Component Outputs

The component does not expose Angular `@Output()` events explicitly, but it **produces side effects**:

1. **Navigation Event**

   * On successful login, navigates to `/dashboard`.

2. **Snackbar Notifications**

   * `Login Successful!` (on success).
   * Error messages from Firebase Auth (on failure).

3. **UI State Changes**

   * Signals toggle between login and sign-up (`needsToRegister`).
   * `isLoading` toggles between showing spinner and enabling buttons.

---

# 🔹 3. Process

The login process can be summarized as:

1. **Initialization**:

   * `loginForm` is created with validation rules.
   * `needsToRegister` starts as `false` → Login form shown by default.

2. **Toggle Flow**:

   * If user clicks **Register here**, toggle `needsToRegister` → switch to `SignUpComponent`.
   * If user clicks **Get Started/Login**, toggle back.

3. **Login Flow**:

   * User enters email + password.
   * Form validates.
   * Click **Login** button:

     * Set `isLoading = true`.
     * Call `authService.logIn(email, password)`.
     * On success:

       * Save user into `UserService`.
       * Snackbar: "Login Successful!".
       * Redirect to `/dashboard`.
     * On failure:

       * Snackbar shows error.
     * Reset `isLoading = false`.

---

# 🔹 4. Detailed Algorithm (Step-by-step)

**Algorithm: LoginComponent Login Flow**

1. Start with `needsToRegister = false`.
2. Display Login form.
3. User fills form:

   * Input email (must be valid format).
   * Input password (min 6 chars).
4. On login button click:

   * If `loginForm.invalid` → block submission.
   * Else:

     1. Call `startLoading()` → `isLoading = true`.
     2. Extract `{ email, password }` from `loginForm.value`.
     3. Call `authService.logIn(email, password)`.
     4. If `Promise` resolves:

        * `userService.setUser(data.user)`.
        * Call `stopLoading()` → `isLoading = false`.
        * Show snackbar `"Login Successful!"`.
        * Navigate `/dashboard`.
     5. If `Promise` rejects:

        * Call `stopLoading()` → `isLoading = false`.
        * Show snackbar with `e.message`.
5. If user clicks **Register here** → `needsToRegister.set(true)` → `SignUpComponent` rendered.

---

# 🔹 5. Data Flow

```
[UI Form Input] → (FormGroup Validation) → [LoginComponent]
    ↓ onSubmit
    → [AuthService.logIn(email, password)]  -- async Firebase call -->
        → (Success) → [UserService.setUser(user)] → [Router.navigate('/dashboard')]
        → (Error)   → [SnackBar.show(error.message)]
```

---

# 🔹 6. Method Flow

**`login()`**

* Input: none (reads `loginForm`).
* Steps:

  1. Validate form.
  2. Call `startLoading()`.
  3. Call `authService.logIn`.
  4. On success → update UserService, show snackbar, navigate.
  5. On error → snackbar with error message.
  6. Call `stopLoading()`.

**`toggle()`**

* Input: none.
* Steps:

  1. Flip `needsToRegister` signal.
  2. Reset `loginForm`.

**`startLoading()`**

* Sets `isLoading = true`.

**`stopLoading()`**

* Sets `isLoading = false`.

---

# 🔹 7. Flow Chart (Text-based)

```
                ┌──────────────────────┐
                │   Component Loads    │
                └─────────┬────────────┘
                          │
                          ▼
               ┌────────────────────────┐
               │ needsToRegister = false│
               │   Show Login Form       │
               └─────────┬──────────────┘
                         │
       ┌─────────────────┴─────────────────┐
       │                                   │
       ▼                                   ▼
 User Clicks "Register"         User Submits Login Form
 needsToRegister.set(true)      (check validity)
 Show SignUpComponent           │
                                ▼
                      Is Form Valid? ──────► No → Show Errors
                                │
                                ▼
                      Call authService.logIn
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
   Success (data.user)                          Failure (error)
   - userService.setUser                         - stopLoading
   - stopLoading                                 - showSnackBar(error)
   - showSnackBar("Success")                     
   - navigate("/dashboard")
```

---

✅ With this, you now have:

* Inputs & Outputs
* Process overview
* Detailed Algorithm
* Data flow
* Method flow
* Flow chart

Would you like me to also do the **same breakdown for your `SignUpComponent`** so you have a complete **login + register flow architecture** documented side by side?
 */