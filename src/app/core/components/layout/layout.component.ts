import { NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, effect, inject, OnInit, signal, Type } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { WindowService } from '@core/services/window.service';
// import { defaultExpenseCategories, defaultExpenseTypes } from '@shared/constants/expense-constants';
import { ResponsiveService } from '@shared/services/responsive.service';
import firebase from 'firebase/compat/app';
import { filter, switchMap } from 'rxjs';
import { UserDataRecord } from '../../interfaces/user-data-record';
import { UserDetails } from '../../interfaces/user-details';
import { AuthService } from '../../services/auth.service';
import { DatabaseService } from '../../services/database.service';
import { TransactionDataService } from '../../services/transaction-data.service';
import { UserService } from '../../services/user.service';
import { FooterLinksComponent } from '../footer-links/footer-links.component';
import { PageHeaderComponent } from '../page-header/page-header.component';
import { UserDetailsComponent } from '../user-details/user-details.component';
@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    NgTemplateOutlet,
    RouterLinkActive,
    RouterLink,
    PageHeaderComponent,
    MatMenu,
    MatMenuTrigger,
    MatMenuItem,
    FooterLinksComponent,
    NgIf,
  ],
})
export class LayoutComponent implements OnInit {
  readonly dialog = inject(MatDialog);

  userService: UserService = inject(UserService);
  user = this.userService.currentUser;
  name: UserDetails | undefined;
  breakpointObserver = inject(ResponsiveService);
  isHandset = this.breakpointObserver.isHandset;
  fixedContainer = false;
  isCompactMenuEnabled = signal(false);

  private authService: AuthService = inject(AuthService);
  private databaseService: DatabaseService = inject(DatabaseService);
  private dataService: TransactionDataService = inject(TransactionDataService);
  // Registers an "effect" that will be scheduled & executed whenever the signals that it reads changes.
  private userEffect = effect(() => {
    if (this.userService.getUser()) {
      this.getAllUserDetails();
    }
  });
  private router: Router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private destroyRef: DestroyRef = inject(DestroyRef);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private isFirstRun = true;
  private readonly windowService = inject(WindowService);
  private iconsOnlyEffect = effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isIconsOnly = this.isCompactMenuEnabled();
    if (this.isFirstRun) {
      this.isFirstRun = false;
      return;
    }
    setTimeout(() => {
      this.windowService.dispatchResizeEvent();
    }, 100);
  });
  /* this.route.data.fixedContainer allows a component to access static, pre-defined information related to its activated route, 
  which can be used for various purposes such as conditional rendering, layout adjustments, or passing configuration values. */
  ngOnInit(): void {
    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((event) => event instanceof NavigationEnd),
        switchMap(() => (this.route.firstChild ? this.route.firstChild.data : this.route.data)),
      )
      .subscribe((data: Record<string, string | Type<unknown>>) => {
        this.fixedContainer = Boolean(data['fixedContainer']);
      });
  }

  logout() {
    this.authService.signOut().then(() => {
      this.userService.setUser(undefined);
      this.dataService.setAccountsData([]);
      this.dataService.setTimeFrameFilter(undefined);
      this.dataService.setFilesImported([]);
      this.dataService.setCategoriesSignal(this.dataService.defaultCategories);
      this.dataService.setAccountSourcesData([]);
    });
  }

  menuClick(drawer: MatSidenav) {
    if (this.isHandset()) {
      drawer.toggle();
    }
  }

  toggleIconsOnly() {
    this.isCompactMenuEnabled.set(!this.isCompactMenuEnabled());
  }

  openUserDetails() {
    const dialogRef = this.dialog.open(UserDetailsComponent);

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.getAllUserDetails();
        this.snackBar.open('Profile update saved successfully!', '', { duration: 2000 });
      }
    });
  }
  private getAllUserDetails() {
    this.databaseService
      .getUserDetails(this.userService.getUser()?.email ?? '')
      .then((jsonData: firebase.database.DataSnapshot) => {
        const data = (jsonData.toJSON() ?? {}) as Record<string, UserDataRecord>;
        const userId = Object.keys(data)[0];
        this.userService.setUserId(userId);
        this.userService.setUserDetails({ firstName: data[userId]['firstName'], lastName: data[userId]['lastName'] });
        // const categories = data[userId]['categories'] ?? {};
        // const sourceTypes = data[userId]['types'] ?? {};
        const importFiles = data[userId]['filesImported'] ?? {};
        const rawCategories = data[userId]['categories'] ?? {};
        const sourceTypes = data[userId]['types'] ?? {};
        const sourceTypesList = Object.keys(sourceTypes).map((key) => sourceTypes[key]);
        const filesImported = Object.keys(importFiles).map((key) => importFiles[key]);

        this.dataService.setCategoriesSignal(
          Object.keys(rawCategories).length ? rawCategories : this.dataService.defaultCategories,
        );
        this.dataService.setAccountSourcesData(sourceTypesList);
        this.dataService.setFilesImported(filesImported ?? []);

        this.databaseService.initializeAccounts(userId).catch((err) => {
          console.warn('Failed to initialize chart of accounts', err);
        });
      });
  }
}
/* Perfect 👍 Thanks for sharing the full component — now I can give you the **algorithm, ASCII flow chart, data flow, and method flow** for this `LayoutComponent`.

---

# 🔹 **Algorithm (Step by Step)**

1. **Initialization**

   * Inject required Angular services (`Router`, `ActivatedRoute`, `AuthService`, `DatabaseService`, etc.).
   * Define signals and reactive states (`user`, `isCompactMenuEnabled`, `fixedContainer`).
   * Register effects (`userEffect`, `iconsOnlyEffect`).

2. **On Component Init**

   * Subscribe to `this.router.events`.
   * Filter only `NavigationEnd` events.
   * Determine whether current `ActivatedRoute` has a `firstChild`.
   * Extract `data` from `firstChild.data` or `route.data`.
   * Update `this.fixedContainer` if `data.fixedContainer` exists.

3. **Menu Handling**

   * `menuClick(drawer)`: Close sidenav if on handset.
   * `toggleIconsOnly()`: Toggle compact menu and trigger resize event.

4. **User Handling**

   * `logout()`: Clear user/session data and reset default states.
   * `openUserDetails()`: Open profile dialog → after close, reload user details and show snackbar.

5. **Data Fetch**

   * `getAllUserDetails()`: Query Firebase for user details and update `UserService` + `ExpenseDataService`.

---
Perfect 👍 Let’s now turn each method flow into a **more detailed algorithm** (step-by-step instructions, like pseudocode). This way you can use it in technical documentation or even transform into actual test cases.

---

# 🔹 **Detailed Algorithms for `LayoutComponent`**

---

### 1. **Algorithm: `ngOnInit()`**

```
1. On component initialization:
2.   Subscribe to router.events stream.
3.   For each emitted event:
4.     IF event is NOT an instance of NavigationEnd:
5.         Ignore and continue.
6.     ELSE:
7.         IF route.firstChild exists:
8.             Return route.firstChild.data (Observable).
9.         ELSE:
10.            Return route.data (Observable).
11.    Subscribe to the returned data.
12.    Extract value of key 'fixedContainer'.
13.    Convert it to Boolean.
14.    Assign Boolean result to this.fixedContainer.
15.    Trigger Angular change detection to re-render layout.
16. END
```

---

### 2. **Algorithm: `logout()`**

```
1. User clicks "Logout".
2. Call authService.signOut().
3. Wait for Promise resolution.
4. On success:
5.   Reset User state:
     5.1 userService.setUser(undefined).
6.   Reset Expense state:
     6.1 dataService.setExpensesData([]).
     6.2 dataService.setTimeFrameFilter(undefined).
     6.3 dataService.setFilesImported([]).
     6.4 dataService.setCategoriesSignal(defaultExpenseCategories).
     6.5 dataService.setExpenseSourcesData(defaultExpenseTypes).
7. Ensure UI reflects logged-out state.
8. END
```

---

### 3. **Algorithm: `menuClick(drawer: MatSidenav)`**

```
1. User clicks a navigation menu item.
2. Check device type:
   IF isHandset() returns TRUE:
       2.1 Call drawer.toggle() to open/close sidenav.
   ELSE:
       2.2 Do nothing.
3. END
```

---

### 4. **Algorithm: `toggleIconsOnly()`**

```
1. User clicks "toggle icons-only" button.
2. Negate the current value of isCompactMenuEnabled signal.
3. Store updated value in signal.
4. Trigger iconsOnlyEffect:
   4.1 IF first run:
         Mark first run as completed. Exit.
   4.2 ELSE:
         Start 100ms timeout.
         On timeout expiration:
             Call windowService.dispatchResizeEvent().
5. UI re-renders menu with icons-only state.
6. END
```

---

### 5. **Algorithm: `openUserDetails()`**

```
1. User selects "View Profile" from menu.
2. Open UserDetailsComponent in a dialog.
3. After dialog is closed:
   IF result exists:
       3.1 Call getAllUserDetails().
       3.2 Show snackbar: "Profile update saved successfully!"
   ELSE:
       3.3 Do nothing.
4. END
```

---

### 6. **Algorithm: `getAllUserDetails()`**

```
1. Retrieve current user email from userService.getUser().
2. Call databaseService.getUserDetails(email).
3. Wait for Promise resolution.
4. Convert DataSnapshot into JSON object.
5. Extract:
   5.1 userId = first key of JSON object.
   5.2 categories = data[userId].categories OR empty object.
   5.3 sourceTypes = data[userId].types OR empty object.
   5.4 importFiles = data[userId].filesImported OR empty object.
6. Update userService:
   6.1 setUserId(userId).
   6.2 setUserDetails({ firstName, lastName }).
7. Transform categories, sourceTypes, importFiles into lists:
   7.1 categoriesList = Object.values(categories).
   7.2 sourceTypesList = Object.values(sourceTypes).
   7.3 filesImported = Object.values(importFiles).
8. Update dataService:
   8.1 setCategoriesSignal(categoriesList OR defaultExpenseCategories).
   8.2 setExpenseSourcesData(sourceTypesList OR defaultExpenseTypes).
   8.3 setFilesImported(filesImported OR []).
9. END
```

---

# 🔹 **Flow Chart (ASCII)**

```
            ┌───────────────────────┐
            │  Component Init       │
            └─────────┬─────────────┘
                      │
                      ▼
       ┌───────────────────────────┐
       │ Subscribe to Router.events│
       └─────────┬─────────────────┘
                 │
         ┌───────▼─────────┐
         │ Filter:          │
         │ NavigationEnd?   │
         └───────┬─────────┘
                 │Yes
                 ▼
      ┌───────────────────────────────┐
      │ Check route.firstChild exists │
      └───────┬───────────────────────┘
              │Yes                     │No
              ▼                        ▼
┌────────────────────────────┐  ┌────────────────────────┐
│ Use firstChild.data        │  │ Use this.route.data    │
└───────────┬────────────────┘  └───────────┬───────────┘
            ▼                                ▼
     ┌───────────────────────────────┐
     │ Update this.fixedContainer    │
     └───────────────────────────────┘
```

---

# 🔹 **Data Flow (ASCII DFD)**

```
 [Router Events] ---> [LayoutComponent] ---> [ActivatedRoute Data]
                                 │
                                 ▼
                        [fixedContainer state]
                                 │
                                 ▼
                       [Template adjusts layout]
```

* **Input Data:** Router navigation events, route metadata (`data.fixedContainer`, etc.).
* **Processing:** Filter + switchMap extracts relevant data.
* **Output:** Updates `fixedContainer` → affects template layout (narrow/full container).

---

# 🔹 **Method Flow**

### `ngOnInit`

* Subscribes to router events
* Updates `fixedContainer` based on route data

### `logout`

* Calls `authService.signOut`
* Clears user/session state via `userService` + `dataService`

### `menuClick(drawer)`

* If handset → toggle sidenav

### `toggleIconsOnly`

* Toggles signal `isCompactMenuEnabled`
* Dispatches resize event (with debounce)

### `openUserDetails`

* Opens dialog (`UserDetailsComponent`)
* On close → reloads user details and shows snackbar

### `getAllUserDetails`

* Fetches from Firebase
* Updates `userService` + `dataService` with latest user data

---

✅ So in summary:

* **Algorithm** = event-driven subscription + state management.
* **Flow Chart** = navigation triggers → extract route data → update layout.
* **Data Flow** = Router → ActivatedRoute → Component state → Template.
* **Method Flow** = clearly separated concerns (auth, menu, UI, data).

---

👉 Do you want me to also **draw a second flow chart just for `logout()` and `getAllUserDetails()`**, since they involve Firebase and multiple services?
 */
