import { Component, Inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { WINDOW } from '@core/tokens/window.token';

@Component({
  selector: 'app-footer-links',
  imports: [MatIcon, MatIconButton],
  templateUrl: './footer-links.component.html',
  styleUrl: './footer-links.component.scss',
})
export class FooterLinksComponent {
  constructor(@Inject(WINDOW) private readonly window: Window) {}

  navigateToCorrectLink(type: 'linkedin' | 'github' | 'sourceCode'): void {
    const urls = {
      linkedin: 'https://www.linkedin.com/in/erick-boyzo-258023a1/',
      github: 'https://github.com/erickboyzo',
      sourceCode: 'https://github.com/erickboyzo/expense-tracker',
    };

    this.window.open(urls[type], '_blank');
  }
}
/*
---

## 1. **Algorithm (Step-by-step execution)**

### FooterLinksComponent

1. Render three buttons in the footer.
2. When user clicks a button → call `navigateToCorrectLink(type)` with `'linkedin' | 'github' | 'sourceCode'`.
3. Inside the method:

   * Select the correct URL from the dictionary.
   * Open the link in a new browser tab with `window.open(url, '_blank')`.

---

### WindowService

 When created:

   * Injects `WINDOW`, `PLATFORM_ID`, and `NgZone`.
   * Defines `isBrowser` → checks if Angular is running in browser.


---

## 2. **Flow Chart (High level)**

```
         ┌───────────────────────┐
         │   User clicks button  │
         └──────────┬────────────┘
                    │
       ┌────────────▼──────────────┐
       │ navigateToCorrectLink(type)│
       └────────────┬──────────────┘
                    │
          ┌─────────▼─────────┐
          │ Get URL from dict │
          └─────────┬─────────┘
                    │
          ┌─────────▼──────────┐
          │ Open in new tab    │
          └────────────────────┘
```

For **WindowService**:

```
┌───────────────┐
│ Component/Code│
│ calls service │
└───────┬───────┘
        │
        ▼
 ┌───────────────┐
 │ Check isBrowser│
 └───────┬───────┘
         │ Yes
         ▼
   ┌───────────────┐
   │ Run outside    │
   │ Angular Zone   │
   └───────┬───────┘
           │
    ┌──────▼───────┐
    │ Execute win- │
    │ dow method   │
    └──────────────┘
```

---

## 3. **Data Flow**

* **Inputs:**

  * From user → button clicks (`'linkedin' | 'github' | 'sourceCode'`).
  * From code → calls to `dispatchResizeEvent()`, `scrollTo()`, or `getViewportSize()`.

* **Processing:**

  * `FooterLinksComponent` maps type → URL.
  * `WindowService` runs window operations **outside Angular change detection**.

* **Outputs:**

  * Navigation → Opens a new browser tab.
  * Service → Either scrolls, resizes, or returns `{ width, height }`.

---

## 4. **Method Flow**

### FooterLinksComponent

* **navigateToCorrectLink(type)**

  * Input: `"linkedin" | "github" | "sourceCode"`.
  * Action: Fetch URL → Open in new tab.
  * Output: Browser opens the link.

---

👉 Do you want me to **draw the flow chart and data flow diagram visually** (with boxes/arrows) so you can use them in your documentation, or just keep them in text form?


*/