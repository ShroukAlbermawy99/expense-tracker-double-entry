import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WINDOW } from '@core/tokens/window.token';

@Injectable({
  providedIn: 'root',
})
export class WindowService {
  private readonly window = inject(WINDOW);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
  /* Great question — this is the heart of Angular 🧠.
Let’s unpack it carefully.

---

## 🔍 What Angular’s Change Detection Does

When Angular runs **change detection**, it:

1. **Walks through the component tree** from root to leaves.
2. For each component:

   * Re-evaluates all **bindings** (`{{ }}`, `[input]`, `@Input()`, etc.).
   * Compares the *current value* with the *previous value* (the one from the last check).
   * If the value has changed:

     * Updates the DOM (for template bindings).
     * Triggers lifecycle hooks (`ngOnChanges`, `ngDoCheck`, etc.).

---

## 🎯 What Counts as a "Change"?

Angular doesn’t “diff the DOM” like React — it re-runs the **expressions in your templates**.
Examples:

```html
<p>{{ counter }}</p>
<img [src]="profileImageUrl" />
<button [disabled]="isSaving">Save</button>
<child-comp [data]="user"></child-comp>
```

During change detection:

* `counter`, `profileImageUrl`, `isSaving`, `user` are all **re-read from component state**.
* Angular compares:

  * last rendered value vs new value.
* If different → update DOM or notify child component.

---

## ⚡ What Triggers Change Detection?

By default, **any async task inside NgZone**:

* Browser events (`click`, `scroll`, `resize`, `input`, etc.)
* Timers (`setTimeout`, `setInterval`)
* Promises (`then`, `catch`, `finally`)
* Observables (`subscribe` emissions, if scheduled inside zone)
* XHR / Fetch responses

Each of these tells Angular: “Something might have changed, better check the whole tree.”

---

## 🔧 Example

```ts
@Component({
  selector: 'app-counter',
  template: `
    <p>{{ counter }}</p>
    <button (click)="increment()">+</button>
  `
})
export class CounterComponent {
  counter = 0;

  increment() {
    this.counter++;
  }
}
```

Flow:

1. User clicks `+`.
2. Angular intercepts the event (inside NgZone).
3. Runs `increment()` → `counter` becomes `1`.
4. Angular runs **change detection**:

   * Sees `counter` changed from `0 → 1`.
   * Updates the DOM `<p>1</p>`.

---

## 🚫 When to Skip It

Events like:

* `mousemove` (fires *many times per second*)
* `scroll` (also high frequency)
* `resize`

These usually don’t change Angular component state directly, so running full change detection every time is wasteful.

👉 That’s why we use **`runOutsideAngular`** for those:

* Still handle the event (e.g., custom animation, scroll position tracking).
* But **skip change detection** unless you explicitly bring Angular back in with `ngZone.run()`.

---

✅ **So to summarize:**
Angular detects **changes in template-bound expressions** during its cycle.
Change detection is triggered by **any async activity inside Angular’s zone**, unless you tell Angular to ignore it (`runOutsideAngular`).

---

Would you like me to give you a **side-by-side code demo**:
🔹 one with `mousemove` inside Angular (laggy)
🔹 one with `mousemove` outside Angular (smooth)
to see the difference?
 */
  dispatchResizeEvent(): void {
    if (this.isBrowser) {
      // Run outside NgZone to avoid triggering unnecessary change detection
      this.ngZone.runOutsideAngular(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }
  }

  getViewportSize(): { width: number; height: number } {
    if (!this.isBrowser) {
      return { width: 0, height: 0 };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  scrollTo(options: ScrollToOptions): void {
    if (this.isBrowser) {
      this.ngZone.runOutsideAngular(() => {
        window.scrollTo(options);
      });
    }
  }
}
/* Nice 👍 — this `WindowService` is a solid example of wrapping the raw `window` object in Angular best practices. Let me break down what’s happening so you can **document it or extend it** later:

---

## 🔎 How `WindowService` Works

### 1. **Dependency Injection (DI) Setup**

* `WINDOW` → custom injection token that represents the global `window`.
* `PLATFORM_ID` → Angular token telling you whether you’re running in the **browser** or **server**.
* `NgZone` → Angular’s zone for controlling change detection.

So instead of using `window` directly, you inject a **safe wrapper**.

---

### 2. **Browser-Safe Guard**

```ts
private get isBrowser(): boolean {
  return isPlatformBrowser(this.platformId);
}
```

* On **server-side rendering (SSR)** → this returns `false`.
* On **browser** → returns `true`.

This prevents runtime errors in environments where `window` doesn’t exist.

---

### 3. **Methods Provided**

1. **dispatchResizeEvent()**

   * Forces a resize event on the `window`.
   * Uses `runOutsideAngular` to avoid unnecessary Angular change detection cycles.

2. **getViewportSize()**

   * Returns `{ width, height }` of the browser window.
   * If not in browser, returns `{ 0, 0 }`.

3. **scrollTo(options)**

   * Wrapper for `window.scrollTo(options)`.
   * Also runs outside Angular’s zone for performance.

---

## 🔄 Flow Diagram

```
Component/Service → inject(WindowService)
        │
        ▼
  WindowService
   ┌─────────────────────────────────┐
   │ Injects: WINDOW, PLATFORM_ID,   │
   │           NgZone                │
   └─────────────────────────────────┘
        │
        ▼
 isBrowser ? window API : safe fallback
        │
        ├─► dispatchResizeEvent()
        ├─► getViewportSize()
        └─► scrollTo()
```

---

✅ **Why this is good practice:**

* SSR-safe (no `ReferenceError: window is not defined`).
* Testable (you can mock `WINDOW` in Angular tests).
* Performance-aware (avoids unnecessary change detection).

---

Would you like me to **extend this service** with more utility methods (e.g., `getScrollPosition()`, `onResize$` observable, `onScroll$` stream), so you don’t have to repeat boilerplate in components?
 */