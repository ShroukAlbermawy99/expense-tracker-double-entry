import { computed, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { Subject } from 'rxjs';

import firebase from 'firebase/compat/app';
import { UserDetails } from '../interfaces/user-details';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  currentUser: WritableSignal<firebase.User | undefined> = signal(undefined);
  userDetails: WritableSignal<UserDetails | undefined> = signal(undefined);
  fullName: Signal<string> = computed(() => {
    const user = this.userDetails();
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return '';
  });
  abbreviatedDisplay: Signal<string> = computed(() => {
    const user = this.userDetails();
    if (user) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    }
    return '';
  });
  email: Signal<string> = computed(() => {
    const { email } = this.currentUser() as firebase.User;
    return email ?? '';
  });

  private userIdSet = new Subject<string>();
  userIdSetAnnounced$ = this.userIdSet.asObservable();
  private userId = '';

  announceUserIdCreated(message: string) {
    this.userIdSet.next(message);
  }

  setUser(data: firebase.User | undefined) {
    this.currentUser.set(data);
  }

  setUserDetails(data: UserDetails | undefined) {
    this.userDetails.set(data);
  }

  getUser(): firebase.User | undefined {
    return this.currentUser();
  }

  setUserId(key: string) {
    this.userId = key;
  }

  getUserId(): string {
    return this.userId;
  }
}
/* Perfect 👌 — your `UserService` is much simpler than the `DatabaseService`, but it plays a **central role in user state management**.
Let me document it step by step so you can clearly understand what it does.

---

# 📝 `UserService` — Documentation

This service manages the **current logged-in user state** and exposes **signals** and **computed properties** to other parts of the app.
It also provides a way to **announce userId changes** across components using RxJS.

---

## 🔑 Key Concepts Used

1. **Signals & Computed (Angular v16+)**

   * `signal()` → holds a reactive value (like `BehaviorSubject` but built-in).
   * `computed()` → derives values automatically when dependencies change.
   * Example: `fullName` updates automatically if `userDetails` changes.

2. **Subjects**

   * `userIdSet` is a `Subject<string>`.
   * Used for broadcasting **userId creation events** across the app.
   * Components can subscribe to `userIdSetAnnounced$`.

3. **Firebase User vs UserDetails**

   * `firebase.User`: basic info from Firebase Auth (email, UID, etc.).
   * `UserDetails`: your **app-specific profile** (first name, last name, etc.).

---

## 🔄 Data Flow (Step by Step)

### 1. Managing Core User Data

* `currentUser`: holds the Firebase user object.
* `userDetails`: holds app-specific details (firstName, lastName, preferences, etc.).
* `setUser()` and `setUserDetails()` allow updating them.

### 2. Derived Signals

* `fullName`: auto-computes `"First Last"`.
* `abbreviatedDisplay`: auto-computes `"FL"` initials for avatar badges.
* `email`: auto-computes the email from `currentUser`.

### 3. User ID Broadcasting

* `setUserId(key)` stores the Firebase userId internally.
* `announceUserIdCreated(message)` emits it via Subject → all subscribers are notified.
* Example use case: when a new user is created, multiple components (profile, settings, dashboard) can react to the same event.

---

## ⚡ Example Usage

```ts
// In LoginComponent
this.authService.logIn(email, pw).then(userCred => {
  this.userService.setUser(userCred.user);
  this.userService.setUserId(userCred.user?.uid ?? '');
});

// In ProfileComponent (auto-reacts)
fullName = this.userService.fullName; 
abbrev = this.userService.abbreviatedDisplay;
email = this.userService.email;

// In DashboardComponent (listen for ID event)
this.userService.userIdSetAnnounced$.subscribe(userId => {
  console.log('User ID is ready:', userId);
});
```

---

## 🗂 Flow Diagram

```
Firebase Auth → (firebase.User) ───────┐
                                       │
                                       ▼
                              UserService
                                │
 ┌──────────────────────────────┼───────────────────────────────┐
 │                              │                               │
 ▼                              ▼                               ▼
Signals (state)            Computed (derived)            Subject (events)
- currentUser              - fullName                   - userIdSet
- userDetails              - abbreviatedDisplay         - userIdSetAnnounced$
                           - email
```

---

✅ This service gives you a **single source of truth** for user info,
✅ makes it reactive with **signals + computed**, and
✅ enables **cross-component communication** with `Subject`.

---

Would you like me to also **compare this with the `AuthService`** you showed earlier, so you can see clearly how responsibilities are split (AuthService = authentication, UserService = user state)?
 */