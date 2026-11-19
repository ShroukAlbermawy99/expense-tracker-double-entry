import { InjectionToken } from '@angular/core';

export const WINDOW = new InjectionToken<Window>('Window object token');

/* Great one 👌 — you’ve defined a **custom Angular injection token** for the global `window` object. Let me break it down so you see why and how it’s useful.

---

# 📝 `WINDOW` Injection Token

```ts
export const WINDOW = new InjectionToken<Window>('Window object token');
```

---

## 🔎 What’s Happening Here?

1. **InjectionToken**

   * A way in Angular to define a custom provider that can be injected with `@Inject()`.
   * Useful for things that **don’t have a class constructor** (like `window` or `document`).

2. **Why not just use `window` directly?**

   * Using `window` directly couples your code to the browser environment.
   * It breaks in **SSR (Server-Side Rendering)** or when running Angular Universal, because `window` doesn’t exist on the server.
   * With `InjectionToken`, you can provide different values in different environments (e.g., `null` for server).

---

## ⚡ Typical Implementation

### Step 1 — Create the token

```ts
export const WINDOW = new InjectionToken<Window>('Window object token');
```

### Step 2 — Provide it in your module

```ts
import { WINDOW } from './window.token';

@NgModule({
  providers: [
    { provide: WINDOW, useValue: window } // real browser window
  ]
})
export class AppModule {}
```

For SSR (Node environment), you might provide something else:

```ts
{ provide: WINDOW, useValue: {} as Window }
```

### Step 3 — Inject it where needed

```ts
import { Inject, Injectable } from '@angular/core';
import { WINDOW } from './window.token';

@Injectable({ providedIn: 'root' })
export class BrowserService {
  constructor(@Inject(WINDOW) private window: Window) {}

  getScreenWidth(): number {
    return this.window.innerWidth;
  }

  redirectTo(url: string) {
    this.window.location.href = url;
  }
}
```

---

## 🧩 Data Flow

```
AppModule providers → { provide: WINDOW, useValue: window }
                     ↓
             Angular DI Container
                     ↓
     Any service/component can @Inject(WINDOW)
```

---

## ✅ Advantages

* Makes code **testable** (you can mock `window` in tests).
* Works with **SSR** (Angular Universal).
* Decouples your app logic from the global `window` object.

---

 */